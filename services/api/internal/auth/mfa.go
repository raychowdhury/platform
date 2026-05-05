package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base32"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/pquerna/otp/totp"
)

const (
	mfaIssuer        = "Platform"
	recoveryCodeQty  = 10
	recoveryRawBytes = 5 // 8 base32 chars after encoding
)

var (
	ErrMFANotPending     = errors.New("no pending MFA setup")
	ErrMFAAlreadyEnabled = errors.New("MFA already enabled")
	ErrMFANotEnabled     = errors.New("MFA not enabled")
	ErrMFABadCode        = errors.New("invalid code")
)

type MFAStatus struct {
	Enabled bool `json:"enabled"`
	Pending bool `json:"pending"`
}

type MFASetup struct {
	Secret         string   `json:"secret"`           // base32, for manual entry
	OTPAuthURL     string   `json:"otpauth_url"`      // for QR code
	RecoveryCodes  []string `json:"recovery_codes"`   // shown once
}

func (r *Repo) GetMFAStatus(ctx context.Context, userID uuid.UUID) (*MFAStatus, error) {
	var enabledAt *string
	err := r.db.QueryRow(ctx, `SELECT to_char(enabled_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') FROM user_mfa WHERE user_id = $1`, userID).Scan(&enabledAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return &MFAStatus{}, nil
	}
	if err != nil {
		return nil, err
	}
	return &MFAStatus{Enabled: enabledAt != nil, Pending: enabledAt == nil}, nil
}

func (r *Repo) GetMFASecret(ctx context.Context, userID uuid.UUID) (string, bool, error) {
	var secret string
	var enabled bool
	err := r.db.QueryRow(ctx, `
		SELECT totp_secret, enabled_at IS NOT NULL FROM user_mfa WHERE user_id = $1
	`, userID).Scan(&secret, &enabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	plain, derr := r.crypter.Decrypt(secret)
	if derr != nil {
		return "", false, derr
	}
	return plain, enabled, nil
}

func (r *Repo) UpsertPendingMFA(ctx context.Context, userID uuid.UUID, secret string) error {
	stored, err := r.crypter.Encrypt(secret)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `
		INSERT INTO user_mfa (user_id, totp_secret, enabled_at)
		VALUES ($1, $2, NULL)
		ON CONFLICT (user_id) DO UPDATE SET
			totp_secret = EXCLUDED.totp_secret,
			enabled_at  = NULL,
			updated_at  = now()
		WHERE user_mfa.enabled_at IS NULL
	`, userID, stored)
	return err
}

func (r *Repo) EnableMFA(ctx context.Context, userID uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE user_mfa SET enabled_at = now(), updated_at = now()
		WHERE user_id = $1 AND enabled_at IS NULL
	`, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrMFANotPending
	}
	return nil
}

func (r *Repo) DeleteMFA(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM user_mfa WHERE user_id = $1`, userID)
	return err
}

func (r *Repo) ReplaceRecoveryCodes(ctx context.Context, userID uuid.UUID, hashes []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM mfa_recovery_codes WHERE user_id = $1`, userID); err != nil {
		return err
	}
	for _, h := range hashes {
		if _, err := tx.Exec(ctx, `
			INSERT INTO mfa_recovery_codes (user_id, code_hash) VALUES ($1, $2)
		`, userID, h); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// ConsumeRecoveryCode marks a code used iff it exists and is unused. Returns true on success.
func (r *Repo) ConsumeRecoveryCode(ctx context.Context, userID uuid.UUID, hash string) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE mfa_recovery_codes
		SET used_at = now()
		WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
	`, userID, hash)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// ---------- service-level helpers ----------

func generateRecoveryCodes(n int) (codes, hashes []string, err error) {
	enc := base32.StdEncoding.WithPadding(base32.NoPadding)
	codes = make([]string, n)
	hashes = make([]string, n)
	for i := 0; i < n; i++ {
		buf := make([]byte, recoveryRawBytes)
		if _, err = rand.Read(buf); err != nil {
			return nil, nil, err
		}
		codes[i] = strings.ToLower(enc.EncodeToString(buf))
		hashes[i] = hashRecoveryCode(codes[i])
	}
	return codes, hashes, nil
}

func hashRecoveryCode(code string) string {
	h := sha256.Sum256([]byte("platform-recovery:" + strings.ToLower(strings.TrimSpace(code))))
	return hex.EncodeToString(h[:])
}

// SetupMFA generates a fresh secret + recovery codes and stores them in the
// pending state. Returns secret, otpauth URL, plaintext recovery codes (shown
// once). EnableMFA must be called with a valid TOTP code to activate.
func (s *Service) SetupMFA(ctx context.Context, userID uuid.UUID, accountLabel string) (*MFASetup, error) {
	_, enabled, err := s.repo.GetMFASecret(ctx, userID)
	if err != nil {
		return nil, err
	}
	if enabled {
		return nil, ErrMFAAlreadyEnabled
	}
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      mfaIssuer,
		AccountName: accountLabel,
	})
	if err != nil {
		return nil, fmt.Errorf("generate totp: %w", err)
	}
	if err := s.repo.UpsertPendingMFA(ctx, userID, key.Secret()); err != nil {
		return nil, err
	}
	codes, hashes, err := generateRecoveryCodes(recoveryCodeQty)
	if err != nil {
		return nil, err
	}
	if err := s.repo.ReplaceRecoveryCodes(ctx, userID, hashes); err != nil {
		return nil, err
	}
	return &MFASetup{
		Secret:        key.Secret(),
		OTPAuthURL:    key.URL(),
		RecoveryCodes: codes,
	}, nil
}

func (s *Service) EnableMFA(ctx context.Context, userID uuid.UUID, code, ip, ua string) error {
	secret, enabled, err := s.repo.GetMFASecret(ctx, userID)
	if err != nil {
		return err
	}
	if enabled {
		return ErrMFAAlreadyEnabled
	}
	if secret == "" {
		return ErrMFANotPending
	}
	if !totp.Validate(code, secret) {
		return ErrMFABadCode
	}
	if err := s.repo.EnableMFA(ctx, userID); err != nil {
		return err
	}
	s.auditor.Record(ctx, &userID, "auth.mfa_enabled", ip, ua, nil)
	return nil
}

// DisableMFA requires the user to prove possession (TOTP code OR recovery code).
// Caller has already verified password via session/auth middleware.
func (s *Service) DisableMFA(ctx context.Context, userID uuid.UUID, code, ip, ua string) error {
	secret, enabled, err := s.repo.GetMFASecret(ctx, userID)
	if err != nil {
		return err
	}
	if !enabled {
		return ErrMFANotEnabled
	}
	if !s.verifyMFACode(ctx, userID, secret, code) {
		return ErrMFABadCode
	}
	if err := s.repo.DeleteMFA(ctx, userID); err != nil {
		return err
	}
	s.auditor.Record(ctx, &userID, "auth.mfa_disabled", ip, ua, nil)
	return nil
}

// verifyMFACode accepts either a TOTP code or a recovery code (case-insensitive,
// alphanumeric only — strips whitespace and dashes).
func (s *Service) verifyMFACode(ctx context.Context, userID uuid.UUID, secret, code string) bool {
	clean := strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(code), " ", ""), "-", "")
	if totp.Validate(clean, secret) {
		return true
	}
	used, err := s.repo.ConsumeRecoveryCode(ctx, userID, hashRecoveryCode(clean))
	if err == nil && used {
		return true
	}
	return false
}

// MFAStatusFor returns the public-facing MFA state for a user.
func (s *Service) MFAStatusFor(ctx context.Context, userID uuid.UUID) (*MFAStatus, error) {
	return s.repo.GetMFAStatus(ctx, userID)
}
