package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/crypter"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrEmailAlreadyTaken = errors.New("email already in use")
)

type Repo struct {
	db      *pgxpool.Pool
	crypter *crypter.Crypter // optional; nil = MFA secrets stored plaintext
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// WithCrypter wires envelope encryption for at-rest secrets (currently TOTP
// seeds). Returns the same *Repo for fluent chaining.
func (r *Repo) WithCrypter(c *crypter.Crypter) *Repo { r.crypter = c; return r }

func (r *Repo) CreateUser(ctx context.Context, email, passwordHash string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id, email, password_hash, status, role, email_verified_at,
		          failed_login_count, locked_until, last_login_at, tokens_invalid_after, created_at, updated_at
	`, email, passwordHash).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Status, &u.Role, &u.EmailVerifiedAt,
		&u.FailedLoginCount, &u.LockedUntil, &u.LastLoginAt, &u.TokensInvalidAfter, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		// 23505 unique_violation
		if isUniqueViolation(err) {
			return nil, ErrEmailAlreadyTaken
		}
		return nil, err
	}
	return u, nil
}

func (r *Repo) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, status, role, email_verified_at,
		       failed_login_count, locked_until, last_login_at, tokens_invalid_after, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Status, &u.Role, &u.EmailVerifiedAt,
		&u.FailedLoginCount, &u.LockedUntil, &u.LastLoginAt, &u.TokensInvalidAfter, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	return u, err
}

func (r *Repo) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, status, role, email_verified_at,
		       failed_login_count, locked_until, last_login_at, tokens_invalid_after, created_at, updated_at
		FROM users WHERE id = $1
	`, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Status, &u.Role, &u.EmailVerifiedAt,
		&u.FailedLoginCount, &u.LockedUntil, &u.LastLoginAt, &u.TokensInvalidAfter, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	return u, err
}

func (r *Repo) UpdatePassword(ctx context.Context, id uuid.UUID, hash string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, hash, id)
	return err
}

func (r *Repo) SetTokensInvalidAfter(ctx context.Context, id uuid.UUID, t time.Time) error {
	tag, err := r.db.Exec(ctx, `UPDATE users SET tokens_invalid_after = $1, updated_at = now() WHERE id = $2`, t, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// AlertEmailFor returns (email, true) when the user has opted in to alert
// emails. Used by the alerts engine to gate sends. Empty/false on missing
// row or opt-out.
func (r *Repo) AlertEmailFor(ctx context.Context, id uuid.UUID) (string, bool, error) {
	var email string
	var enabled bool
	err := r.db.QueryRow(ctx,
		`SELECT email, email_alerts FROM users WHERE id = $1`, id,
	).Scan(&email, &enabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}
	return email, enabled, err
}

func (r *Repo) SetEmailAlerts(ctx context.Context, id uuid.UUID, on bool) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE users SET email_alerts = $1, updated_at = now() WHERE id = $2`, on, id,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *Repo) GetTokensInvalidAfter(ctx context.Context, id uuid.UUID) (*time.Time, error) {
	var t *time.Time
	err := r.db.QueryRow(ctx, `SELECT tokens_invalid_after FROM users WHERE id = $1`, id).Scan(&t)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	return t, err
}

func (r *Repo) MarkEmailVerified(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1`, id)
	return err
}

func (r *Repo) RecordSuccessfulLogin(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users
		SET last_login_at = now(), failed_login_count = 0, locked_until = NULL, updated_at = now()
		WHERE id = $1
	`, id)
	return err
}

func (r *Repo) RecordFailedLogin(ctx context.Context, id uuid.UUID, lockMax int, lockFor time.Duration) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users
		SET failed_login_count = failed_login_count + 1,
		    locked_until = CASE
		        WHEN failed_login_count + 1 >= $2 THEN now() + $3::interval
		        ELSE locked_until
		    END,
		    updated_at = now()
		WHERE id = $1
	`, id, lockMax, lockFor.String())
	return err
}

func isUniqueViolation(err error) bool {
	var pgErr interface{ SQLState() string }
	if errors.As(err, &pgErr) {
		return pgErr.SQLState() == "23505"
	}
	return false
}
