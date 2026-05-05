package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrEmailAlreadyTaken = errors.New("email already in use")
)

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

func (r *Repo) CreateUser(ctx context.Context, email, passwordHash string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id, email, password_hash, status, role, email_verified_at,
		          failed_login_count, locked_until, last_login_at, created_at, updated_at
	`, email, passwordHash).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Status, &u.Role, &u.EmailVerifiedAt,
		&u.FailedLoginCount, &u.LockedUntil, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
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
		       failed_login_count, locked_until, last_login_at, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Status, &u.Role, &u.EmailVerifiedAt,
		&u.FailedLoginCount, &u.LockedUntil, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
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
		       failed_login_count, locked_until, last_login_at, created_at, updated_at
		FROM users WHERE id = $1
	`, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Status, &u.Role, &u.EmailVerifiedAt,
		&u.FailedLoginCount, &u.LockedUntil, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
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
