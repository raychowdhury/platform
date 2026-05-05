package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountLocked      = errors.New("account locked")
	ErrAccountInactive    = errors.New("account inactive")
	ErrTokenNotFound      = errors.New("token not found or expired")
)

type Auditor interface {
	Record(ctx context.Context, userID *uuid.UUID, event, ip, ua string, metadata map[string]any)
}

type Service struct {
	repo     *Repo
	rdb      *redis.Client
	issuer   *TokenIssuer
	auditor  Auditor
	lockMax  int
	lockFor  time.Duration
	verifyTL time.Duration
	resetTTL time.Duration
}

func NewService(repo *Repo, rdb *redis.Client, issuer *TokenIssuer, auditor Auditor, lockMax int, lockFor time.Duration) *Service {
	return &Service{
		repo:     repo,
		rdb:      rdb,
		issuer:   issuer,
		auditor:  auditor,
		lockMax:  lockMax,
		lockFor:  lockFor,
		verifyTL: 24 * time.Hour,
		resetTTL: 1 * time.Hour,
	}
}

// ---------- signup ----------

type SignupResult struct {
	User              *User
	VerificationToken string // Sprint 1: returned in response. Sprint 5: emailed instead.
}

func (s *Service) Signup(ctx context.Context, email, password, ip, ua string) (*SignupResult, error) {
	email = normalizeEmail(email)
	if err := validateEmail(email); err != nil {
		return nil, err
	}
	if err := validatePassword(password); err != nil {
		return nil, err
	}
	hash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}
	u, err := s.repo.CreateUser(ctx, email, hash)
	if err != nil {
		return nil, err
	}
	token, err := s.issueOpaqueToken(ctx, "verify", u.ID, s.verifyTL)
	if err != nil {
		return nil, err
	}
	s.auditor.Record(ctx, &u.ID, "auth.signup", ip, ua, nil)
	return &SignupResult{User: u, VerificationToken: token}, nil
}

func (s *Service) VerifyEmail(ctx context.Context, token, ip, ua string) error {
	id, err := s.consumeOpaqueToken(ctx, "verify", token)
	if err != nil {
		return err
	}
	if err := s.repo.MarkEmailVerified(ctx, id); err != nil {
		return err
	}
	s.auditor.Record(ctx, &id, "auth.email_verified", ip, ua, nil)
	return nil
}

// ---------- login / refresh / logout ----------

func (s *Service) Login(ctx context.Context, email, password, ip, ua string) (*TokenPair, *User, error) {
	email = normalizeEmail(email)
	u, err := s.repo.GetUserByEmail(ctx, email)
	if errors.Is(err, ErrUserNotFound) {
		s.auditor.Record(ctx, nil, "auth.login.fail", ip, ua, map[string]any{"reason": "no_user", "email": email})
		return nil, nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, nil, err
	}
	if u.Status != "active" {
		s.auditor.Record(ctx, &u.ID, "auth.login.fail", ip, ua, map[string]any{"reason": "inactive"})
		return nil, nil, ErrAccountInactive
	}
	if u.LockedUntil != nil && u.LockedUntil.After(time.Now()) {
		s.auditor.Record(ctx, &u.ID, "auth.login.fail", ip, ua, map[string]any{"reason": "locked"})
		return nil, nil, ErrAccountLocked
	}
	ok, err := VerifyPassword(password, u.PasswordHash)
	if err != nil {
		return nil, nil, err
	}
	if !ok {
		_ = s.repo.RecordFailedLogin(ctx, u.ID, s.lockMax, s.lockFor)
		s.auditor.Record(ctx, &u.ID, "auth.login.fail", ip, ua, map[string]any{"reason": "bad_password"})
		return nil, nil, ErrInvalidCredentials
	}
	if err := s.repo.RecordSuccessfulLogin(ctx, u.ID); err != nil {
		return nil, nil, err
	}
	pair, err := s.issuePair(ctx, u.ID)
	if err != nil {
		return nil, nil, err
	}
	s.auditor.Record(ctx, &u.ID, "auth.login.ok", ip, ua, nil)
	return pair, u, nil
}

func (s *Service) Refresh(ctx context.Context, refreshToken, ip, ua string) (*TokenPair, error) {
	uid, err := s.consumeRefresh(ctx, refreshToken)
	if err != nil {
		return nil, err
	}
	pair, err := s.issuePair(ctx, uid)
	if err != nil {
		return nil, err
	}
	s.auditor.Record(ctx, &uid, "auth.refresh", ip, ua, nil)
	return pair, nil
}

func (s *Service) Logout(ctx context.Context, refreshToken, ip, ua string, uid uuid.UUID) error {
	if refreshToken != "" {
		_ = s.rdb.Del(ctx, refreshKey(refreshToken)).Err()
	}
	s.auditor.Record(ctx, &uid, "auth.logout", ip, ua, nil)
	return nil
}

// ---------- password ----------

func (s *Service) ChangePassword(ctx context.Context, uid uuid.UUID, oldPw, newPw, ip, ua string) error {
	u, err := s.repo.GetUserByID(ctx, uid)
	if err != nil {
		return err
	}
	ok, err := VerifyPassword(oldPw, u.PasswordHash)
	if err != nil {
		return err
	}
	if !ok {
		return ErrInvalidCredentials
	}
	if err := validatePassword(newPw); err != nil {
		return err
	}
	hash, err := HashPassword(newPw)
	if err != nil {
		return err
	}
	if err := s.repo.UpdatePassword(ctx, uid, hash); err != nil {
		return err
	}
	s.auditor.Record(ctx, &uid, "auth.password_changed", ip, ua, nil)
	return nil
}

func (s *Service) RequestPasswordReset(ctx context.Context, email, ip, ua string) (string, error) {
	email = normalizeEmail(email)
	u, err := s.repo.GetUserByEmail(ctx, email)
	if errors.Is(err, ErrUserNotFound) {
		// Do not leak existence: return empty token, no error.
		s.auditor.Record(ctx, nil, "auth.reset_requested", ip, ua, map[string]any{"email": email, "exists": false})
		return "", nil
	}
	if err != nil {
		return "", err
	}
	token, err := s.issueOpaqueToken(ctx, "reset", u.ID, s.resetTTL)
	if err != nil {
		return "", err
	}
	s.auditor.Record(ctx, &u.ID, "auth.reset_requested", ip, ua, nil)
	return token, nil
}

func (s *Service) ConfirmPasswordReset(ctx context.Context, token, newPw, ip, ua string) error {
	id, err := s.consumeOpaqueToken(ctx, "reset", token)
	if err != nil {
		return err
	}
	if err := validatePassword(newPw); err != nil {
		return err
	}
	hash, err := HashPassword(newPw)
	if err != nil {
		return err
	}
	if err := s.repo.UpdatePassword(ctx, id, hash); err != nil {
		return err
	}
	s.auditor.Record(ctx, &id, "auth.password_reset", ip, ua, nil)
	return nil
}

// ---------- internal: token helpers ----------

func (s *Service) issuePair(ctx context.Context, uid uuid.UUID) (*TokenPair, error) {
	access, accessExp, err := s.issuer.IssueAccess(uid)
	if err != nil {
		return nil, err
	}
	refresh, refreshExp, err := s.issuer.IssueRefresh()
	if err != nil {
		return nil, err
	}
	if err := s.rdb.Set(ctx, refreshKey(refresh), uid.String(), s.issuer.RefreshTTL()).Err(); err != nil {
		return nil, err
	}
	return &TokenPair{
		AccessToken:      access,
		AccessExpiresAt:  accessExp,
		RefreshToken:     refresh,
		RefreshExpiresAt: refreshExp,
		TokenType:        "Bearer",
	}, nil
}

func (s *Service) consumeRefresh(ctx context.Context, token string) (uuid.UUID, error) {
	key := refreshKey(token)
	val, err := s.rdb.GetDel(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return uuid.Nil, ErrTokenNotFound
	}
	if err != nil {
		return uuid.Nil, err
	}
	return uuid.Parse(val)
}

func (s *Service) issueOpaqueToken(ctx context.Context, kind string, uid uuid.UUID, ttl time.Duration) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	tok := base64.RawURLEncoding.EncodeToString(b)
	if err := s.rdb.Set(ctx, kindKey(kind, tok), uid.String(), ttl).Err(); err != nil {
		return "", err
	}
	return tok, nil
}

func (s *Service) consumeOpaqueToken(ctx context.Context, kind, token string) (uuid.UUID, error) {
	val, err := s.rdb.GetDel(ctx, kindKey(kind, token)).Result()
	if errors.Is(err, redis.Nil) {
		return uuid.Nil, ErrTokenNotFound
	}
	if err != nil {
		return uuid.Nil, err
	}
	return uuid.Parse(val)
}

func refreshKey(t string) string         { return "rt:" + t }
func kindKey(kind, t string) string      { return kind + ":" + t }

// ---------- validation ----------

func normalizeEmail(s string) string { return strings.TrimSpace(strings.ToLower(s)) }

func validateEmail(s string) error {
	if len(s) < 3 || len(s) > 254 || !strings.Contains(s, "@") || strings.ContainsAny(s, " \t\n") {
		return errors.New("invalid email")
	}
	return nil
}

func validatePassword(p string) error {
	if len(p) < 12 {
		return errors.New("password must be at least 12 characters")
	}
	if len(p) > 256 {
		return errors.New("password too long")
	}
	return nil
}

