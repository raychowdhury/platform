package alerts

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrAlertNotFound = errors.New("alert not found")

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const cols = `
	id, user_id, symbol, condition, threshold::float8, status, note,
	triggered_at, COALESCE(triggered_price, 0)::float8, created_at, updated_at
`

func scan(row pgx.Row) (*Alert, error) {
	var a Alert
	var note *string
	var trigPrice float64
	if err := row.Scan(
		&a.ID, &a.UserID, &a.Symbol, &a.Condition, &a.Threshold, &a.Status, &note,
		&a.TriggeredAt, &trigPrice, &a.CreatedAt, &a.UpdatedAt,
	); err != nil {
		return nil, err
	}
	a.Note = note
	if trigPrice != 0 {
		v := trigPrice
		a.TriggeredPrice = &v
	}
	return &a, nil
}

func (r *Repo) Create(ctx context.Context, userID uuid.UUID, symbol string, cond Condition, threshold float64, note *string) (*Alert, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO alerts (user_id, symbol, condition, threshold, note)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+cols,
		userID, symbol, cond, threshold, note,
	)
	return scan(row)
}

func (r *Repo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM alerts WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrAlertNotFound
	}
	return nil
}

func (r *Repo) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]Alert, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := r.db.Query(ctx, `SELECT `+cols+` FROM alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Alert
	for rows.Next() {
		a, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

func (r *Repo) CountActive(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND status = 'active'`, userID).Scan(&n)
	return n, err
}

// activeRow is the engine-side view of a candidate alert.
type activeRow struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Symbol    string
	Condition Condition
	Threshold float64
}

// MarkTriggered atomically flips an alert to 'triggered' iff it is still 'active'.
// Returns (true, alert) if the caller won the race; (false, nil) otherwise.
func (r *Repo) MarkTriggered(ctx context.Context, id uuid.UUID, atPrice float64) (*Alert, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE alerts
		SET status = 'triggered', triggered_at = now(), triggered_price = $2, updated_at = now()
		WHERE id = $1 AND status = 'active'
		RETURNING `+cols,
		id, atPrice,
	)
	a, err := scan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return a, err
}

// CandidatesForSymbol returns all currently-active alerts for a symbol.
func (r *Repo) CandidatesForSymbol(ctx context.Context, symbol string) ([]activeRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, symbol, condition, threshold::float8
		FROM alerts WHERE symbol = $1 AND status = 'active'
	`, symbol)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []activeRow
	for rows.Next() {
		var a activeRow
		if err := rows.Scan(&a.ID, &a.UserID, &a.Symbol, &a.Condition, &a.Threshold); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *Repo) ActiveSymbols(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, `SELECT DISTINCT symbol FROM alerts WHERE status = 'active'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
