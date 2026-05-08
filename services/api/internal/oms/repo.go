package oms

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

var (
	ErrOrderNotFound  = errors.New("order not found")
	ErrAccountMissing = errors.New("account missing")
)

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// All numeric columns are read via `::text` cast and decoded by
// decimal.NewFromString — pgx v5 has no built-in NUMERIC↔decimal.Decimal
// scanner, and going through float8 would defeat the point of moving off
// floats. The text path round-trips NUMERIC(24,8) losslessly.
const orderColumns = `
	id, user_id, client_order_id, symbol, side, type,
	limit_price::text, stop_price::text,
	trail_percent::text, watermark::text,
	qty::text, filled_qty::text, avg_fill_price::text,
	reserved_cost::text, oco_group_id, oco_locks_qty,
	status, reject_reason, created_at, updated_at
`

func parseDec(s *string) (decimal.Decimal, error) {
	if s == nil || *s == "" {
		return decimal.Zero, nil
	}
	return decimal.NewFromString(*s)
}

func parseDecPtr(s *string) (*decimal.Decimal, error) {
	if s == nil || *s == "" {
		return nil, nil
	}
	d, err := decimal.NewFromString(*s)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func scanOrder(row pgx.Row) (*Order, error) {
	var o Order
	var coid, reject *string
	var limit, stop, trail, water, qty, filled, avg, reserved *string
	if err := row.Scan(
		&o.ID, &o.UserID, &coid, &o.Symbol, &o.Side, &o.Type,
		&limit, &stop, &trail, &water,
		&qty, &filled, &avg, &reserved,
		&o.OCOGroupID, &o.OCOLocksQty,
		&o.Status, &reject, &o.CreatedAt, &o.UpdatedAt,
	); err != nil {
		return nil, err
	}
	o.ClientOrderID = coid
	o.RejectReason = reject
	var err error
	if o.LimitPrice, err = parseDecPtr(limit); err != nil {
		return nil, err
	}
	if o.StopPrice, err = parseDecPtr(stop); err != nil {
		return nil, err
	}
	if o.TrailPercent, err = parseDecPtr(trail); err != nil {
		return nil, err
	}
	if o.Watermark, err = parseDecPtr(water); err != nil {
		return nil, err
	}
	if o.Qty, err = parseDec(qty); err != nil {
		return nil, err
	}
	if o.FilledQty, err = parseDec(filled); err != nil {
		return nil, err
	}
	if o.AvgFillPrice, err = parseDecPtr(avg); err != nil {
		return nil, err
	}
	if o.ReservedCost, err = parseDec(reserved); err != nil {
		return nil, err
	}
	return &o, nil
}

type InsertParams struct {
	UserID        uuid.UUID
	ClientOrderID *string
	Symbol        string
	Side          Side
	Type          Type
	LimitPrice    *decimal.Decimal
	StopPrice     *decimal.Decimal
	TrailPercent  *decimal.Decimal
	Watermark     *decimal.Decimal
	Qty           decimal.Decimal
	ReservedCost  decimal.Decimal
	Status        Status
	OCOGroupID    *uuid.UUID
	OCOLocksQty   bool
}

// InsertOrderTx writes an orders row inside an existing transaction (callers
// that also need to atomically lock balance use this). Decimals are passed
// as their canonical string form; postgres parses into NUMERIC.
func (r *Repo) InsertOrderTx(ctx context.Context, tx pgx.Tx, p InsertParams) (*Order, error) {
	// Default oco_locks_qty=true matches schema default for non-OCO orders.
	ocoLocks := p.OCOLocksQty
	if p.OCOGroupID == nil {
		ocoLocks = true
	}
	row := tx.QueryRow(ctx, `
		INSERT INTO orders (user_id, client_order_id, symbol, side, type,
		                    limit_price, stop_price, trail_percent, watermark,
		                    qty, reserved_cost, status,
		                    oco_group_id, oco_locks_qty)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING `+orderColumns,
		p.UserID, p.ClientOrderID, p.Symbol, p.Side, p.Type,
		decPtrStr(p.LimitPrice), decPtrStr(p.StopPrice),
		decPtrStr(p.TrailPercent), decPtrStr(p.Watermark),
		p.Qty.String(), p.ReservedCost.String(), p.Status,
		p.OCOGroupID, ocoLocks,
	)
	return scanOrder(row)
}

func decPtrStr(d *decimal.Decimal) any {
	if d == nil {
		return nil
	}
	return d.String()
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
		       price::text, qty::text, fee::text, created_at
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
		var price, qty, fee string
		if err := rows.Scan(&f.ID, &f.OrderID, &f.UserID, &f.Symbol, &f.Side, &price, &qty, &fee, &f.CreatedAt); err != nil {
			return nil, err
		}
		if f.Price, err = decimal.NewFromString(price); err != nil {
			return nil, err
		}
		if f.Qty, err = decimal.NewFromString(qty); err != nil {
			return nil, err
		}
		if f.Fee, err = decimal.NewFromString(fee); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r *Repo) ListPositions(ctx context.Context, userID uuid.UUID) ([]Position, error) {
	rows, err := r.db.Query(ctx, `
		SELECT user_id, symbol,
		       qty::text, locked_qty::text, avg_cost::text, realized_pnl::text,
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
		var qty, locked, avg, realized string
		if err := rows.Scan(&p.UserID, &p.Symbol, &qty, &locked, &avg, &realized, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if p.Qty, err = decimal.NewFromString(qty); err != nil {
			return nil, err
		}
		if p.LockedQty, err = decimal.NewFromString(locked); err != nil {
			return nil, err
		}
		if p.AvgCost, err = decimal.NewFromString(avg); err != nil {
			return nil, err
		}
		if p.RealizedPnL, err = decimal.NewFromString(realized); err != nil {
			return nil, err
		}
		p.Available = p.Qty.Sub(p.LockedQty)
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repo) GetAccount(ctx context.Context, userID uuid.UUID) (*Account, error) {
	a := &Account{UserID: userID}
	var bal, lck string
	err := r.db.QueryRow(ctx, `
		SELECT user_id, balance::text, locked::text, quote_currency, updated_at
		FROM accounts WHERE user_id = $1
	`, userID).Scan(&a.UserID, &bal, &lck, &a.QuoteCurrency, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAccountMissing
	}
	if err != nil {
		return nil, err
	}
	if a.Balance, err = decimal.NewFromString(bal); err != nil {
		return nil, err
	}
	if a.Locked, err = decimal.NewFromString(lck); err != nil {
		return nil, err
	}
	a.Available = a.Balance.Sub(a.Locked)
	return a, nil
}

// RealizedPnLToday sums fee-adjusted realized PnL from sells closed in the
// current UTC day. Buys don't realize PnL; sells produce (price-avg)*qty - fee
// at fill time. We approximate same-day total as Σ(sell.proceeds - sell.qty *
// position.avg_cost_at_fill) — but we don't snapshot avg_cost per fill, so
// instead we recover the contribution by walking fills and approximating
// avg_cost from the position-side trace. Cheaper for paper trading: use the
// running realized_pnl on positions but only count *today's delta* via a
// fills-side aggregate (price - first-fill-avg) * qty. Good enough for the
// dashboard line; full attribution lives in the journal export.
func (r *Repo) RealizedPnLToday(ctx context.Context, userID uuid.UUID) (decimal.Decimal, error) {
	var s string
	// Futures contracts apply instrument multiplier to the price-delta term;
	// fees are already in account-currency units and are not multiplied.
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(
			CASE WHEN f.side = 'sell'
				THEN (f.price - COALESCE(p.avg_cost, f.price)) * f.qty * COALESCE(i.multiplier, 1) - f.fee
				ELSE 0 END
		), 0)::text
		FROM fills f
		LEFT JOIN positions  p ON p.user_id = f.user_id AND p.symbol = f.symbol
		LEFT JOIN instruments i ON i.symbol = f.symbol
		WHERE f.user_id = $1
		  AND f.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
	`, userID).Scan(&s)
	if err != nil {
		return decimal.Zero, err
	}
	return decimal.NewFromString(s)
}

// MultiplierFor returns the instrument multiplier for a symbol. Defaults to 1
// when the symbol isn't registered (legacy spot symbols).
func (r *Repo) MultiplierFor(ctx context.Context, symbol string) (decimal.Decimal, error) {
	var s string
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(multiplier, 1)::text FROM instruments WHERE symbol = $1`,
		symbol).Scan(&s)
	if errors.Is(err, pgx.ErrNoRows) {
		return decimal.NewFromInt(1), nil
	}
	if err != nil {
		return decimal.NewFromInt(1), err
	}
	return decimal.NewFromString(s)
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
