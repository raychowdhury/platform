package oms

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrOrderNotFound  = errors.New("order not found")
	ErrAccountMissing = errors.New("account missing")
)

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const orderColumns = `
	id, user_id, client_order_id, symbol, side, type,
	COALESCE(limit_price, 0)::float8, COALESCE(stop_price, 0)::float8,
	qty::float8, filled_qty::float8, COALESCE(avg_fill_price, 0)::float8,
	reserved_cost::float8, status, reject_reason, created_at, updated_at
`

func scanOrder(row pgx.Row) (*Order, error) {
	var o Order
	var limit, stop, avg float64
	var coid, reject *string
	if err := row.Scan(
		&o.ID, &o.UserID, &coid, &o.Symbol, &o.Side, &o.Type,
		&limit, &stop, &o.Qty, &o.FilledQty, &avg, &o.ReservedCost,
		&o.Status, &reject, &o.CreatedAt, &o.UpdatedAt,
	); err != nil {
		return nil, err
	}
	o.ClientOrderID = coid
	o.RejectReason = reject
	if limit != 0 {
		l := limit
		o.LimitPrice = &l
	}
	if stop != 0 {
		s := stop
		o.StopPrice = &s
	}
	if avg != 0 {
		a := avg
		o.AvgFillPrice = &a
	}
	return &o, nil
}

type InsertParams struct {
	UserID        uuid.UUID
	ClientOrderID *string
	Symbol        string
	Side          Side
	Type          Type
	LimitPrice    *float64
	StopPrice     *float64
	Qty           float64
	ReservedCost  float64
	Status        Status
}

// InsertOrderTx writes an orders row inside an existing transaction (callers
// that also need to atomically lock balance use this).
func (r *Repo) InsertOrderTx(ctx context.Context, tx pgx.Tx, p InsertParams) (*Order, error) {
	row := tx.QueryRow(ctx, `
		INSERT INTO orders (user_id, client_order_id, symbol, side, type,
		                    limit_price, stop_price, qty, reserved_cost, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING `+orderColumns,
		p.UserID, p.ClientOrderID, p.Symbol, p.Side, p.Type,
		p.LimitPrice, p.StopPrice, p.Qty, p.ReservedCost, p.Status,
	)
	return scanOrder(row)
}

// PoolDB exposes the pool for service-level transactions.
func (r *Repo) PoolDB() *pgxpool.Pool { return r.db }

func (r *Repo) GetOrder(ctx context.Context, id uuid.UUID) (*Order, error) {
	row := r.db.QueryRow(ctx, `SELECT `+orderColumns+` FROM orders WHERE id = $1`, id)
	o, err := scanOrder(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrOrderNotFound
	}
	return o, err
}

func (r *Repo) ListOrders(ctx context.Context, userID uuid.UUID, status string, limit int) ([]Order, error) {
	if limit <= 0 || limit > 1000 {
		limit = 100
	}
	q := `SELECT ` + orderColumns + ` FROM orders WHERE user_id = $1`
	args := []any{userID}
	if status != "" {
		q += ` AND status = $2`
		args = append(args, status)
	}
	q += ` ORDER BY created_at DESC LIMIT ` + itoa(limit)
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Order
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *o)
	}
	return out, rows.Err()
}

// CancelOpenOrderTx cancels an order (open or pending) and returns the prior row
// so the caller can refund any reserved balance in the same transaction.
func (r *Repo) CancelOpenOrderTx(ctx context.Context, tx pgx.Tx, userID, id uuid.UUID) (*Order, error) {
	row := tx.QueryRow(ctx, `
		UPDATE orders
		SET status = 'cancelled', updated_at = now()
		WHERE id = $1 AND user_id = $2 AND status IN ('open','pending')
		RETURNING `+orderColumns,
		id, userID,
	)
	o, err := scanOrder(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrOrderNotFound
	}
	return o, err
}

func (r *Repo) ListFills(ctx context.Context, userID uuid.UUID, limit int) ([]Fill, error) {
	if limit <= 0 || limit > 1000 {
		limit = 100
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, order_id, user_id, symbol, side,
		       price::float8, qty::float8, fee::float8, created_at
		FROM fills WHERE user_id = $1
		ORDER BY created_at DESC LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Fill
	for rows.Next() {
		var f Fill
		if err := rows.Scan(&f.ID, &f.OrderID, &f.UserID, &f.Symbol, &f.Side, &f.Price, &f.Qty, &f.Fee, &f.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r *Repo) ListPositions(ctx context.Context, userID uuid.UUID) ([]Position, error) {
	rows, err := r.db.Query(ctx, `
		SELECT user_id, symbol,
		       qty::float8, locked_qty::float8, avg_cost::float8, realized_pnl::float8,
		       updated_at
		FROM positions WHERE user_id = $1 AND (qty <> 0 OR locked_qty <> 0)
		ORDER BY symbol
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Position
	for rows.Next() {
		var p Position
		if err := rows.Scan(&p.UserID, &p.Symbol, &p.Qty, &p.LockedQty, &p.AvgCost, &p.RealizedPnL, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.Available = p.Qty - p.LockedQty
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repo) GetAccount(ctx context.Context, userID uuid.UUID) (*Account, error) {
	a := &Account{UserID: userID}
	err := r.db.QueryRow(ctx, `
		SELECT user_id, balance::float8, locked::float8, quote_currency, updated_at
		FROM accounts WHERE user_id = $1
	`, userID).Scan(&a.UserID, &a.Balance, &a.Locked, &a.QuoteCurrency, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAccountMissing
	}
	a.Available = a.Balance - a.Locked
	return a, err
}

func (r *Repo) ActiveSymbols(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, `SELECT DISTINCT symbol FROM orders WHERE status = 'open'`)
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

// itoa avoids strconv just for query building. Keep small.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	buf := [20]byte{}
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
