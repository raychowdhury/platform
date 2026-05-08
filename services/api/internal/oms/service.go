package oms

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

var (
	ErrInvalidSide        = errors.New("invalid side")
	ErrInvalidType        = errors.New("invalid type")
	ErrLimitPriceMissing  = errors.New("limit_price required for limit orders")
	ErrLimitPriceUnused   = errors.New("limit_price not allowed for market orders")
	ErrStopPriceMissing   = errors.New("stop_price required for stop orders")
	ErrTrailPctMissing    = errors.New("trail_percent (0..100) required for trailing_stop")
	ErrInvalidQty         = errors.New("qty must be > 0")
	ErrSymbolRequired     = errors.New("symbol required")
	ErrNoMarkPrice        = errors.New("no recent price available — try again in a moment")
	ErrInsufficientFunds  = errors.New("insufficient available balance")
	ErrInsufficientQty    = errors.New("insufficient available position qty")
	ErrOCOSellOnly        = errors.New("OCO bracket currently sell-only")
	ErrOCOPriceLogic      = errors.New("OCO sell needs limit_price > stop_price (TP above SL)")
)

// marketSlippageBuffer over-reserves market-buy orders to absorb price moves
// between place and fill. Any unspent reservation is refunded at fill time.
var marketSlippageBuffer = decimal.NewFromFloat(1.01)

type Service struct {
	repo   *Repo
	engine *Engine
}

func NewService(repo *Repo, engine *Engine) *Service {
	return &Service{repo: repo, engine: engine}
}

type PlaceParams struct {
	UserID        uuid.UUID
	Symbol        string
	Side          Side
	Type          Type
	LimitPrice    *decimal.Decimal
	StopPrice     *decimal.Decimal
	TrailPercent  *decimal.Decimal
	Qty           decimal.Decimal
	ClientOrderID *string
}

func (s *Service) Place(ctx context.Context, p PlaceParams) (*Order, error) {
	p.Symbol = strings.ToUpper(strings.TrimSpace(p.Symbol))
	if p.Symbol == "" {
		return nil, ErrSymbolRequired
	}
	if p.Side != Buy && p.Side != Sell {
		return nil, ErrInvalidSide
	}
	switch p.Type {
	case Limit:
		if p.LimitPrice == nil || !p.LimitPrice.IsPositive() {
			return nil, ErrLimitPriceMissing
		}
		p.StopPrice = nil
		p.TrailPercent = nil
	case Market:
		p.LimitPrice = nil
		p.StopPrice = nil
		p.TrailPercent = nil
	case StopMarket:
		if p.StopPrice == nil || !p.StopPrice.IsPositive() {
			return nil, ErrStopPriceMissing
		}
		p.LimitPrice = nil
		p.TrailPercent = nil
	case TrailingStop:
		if p.TrailPercent == nil || !p.TrailPercent.IsPositive() ||
			p.TrailPercent.GreaterThan(decimal.NewFromInt(100)) {
			return nil, ErrTrailPctMissing
		}
		p.LimitPrice = nil
		p.StopPrice = nil
	default:
		return nil, ErrInvalidType
	}
	if !p.Qty.IsPositive() {
		return nil, ErrInvalidQty
	}

	// Reservation strategy:
	//   buy + limit         → qty * limit_price (exact upper bound on cost)
	//   buy + market        → qty * mark * 1.01 (slippage buffer)
	//   buy + stop_market   → qty * stop * 1.01 (stop is the trigger floor for buy)
	//   sell                → no balance reservation (qty check at fill, against live position)
	reserved := decimal.Zero
	if p.Side == Buy {
		ref, err := s.priceForReservation(p)
		if err != nil {
			return nil, err
		}
		reserved = p.Qty.Mul(ref)
		if p.Type == Market || p.Type == StopMarket || p.Type == TrailingStop {
			reserved = reserved.Mul(marketSlippageBuffer)
		}
	}

	// Initial status:
	//   stop_market / trailing_stop start as 'pending' — flips to 'open'
	//   when the stop (computed from watermark for trailing) crosses.
	//   Everything else starts 'open'.
	status := StatusOpen
	if p.Type == StopMarket || p.Type == TrailingStop {
		status = StatusPending
	}

	tx, err := s.repo.PoolDB().BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if reserved.IsPositive() {
		var availStr string
		if err := tx.QueryRow(ctx, `
			SELECT (balance - locked)::text FROM accounts WHERE user_id = $1 FOR UPDATE
		`, p.UserID).Scan(&availStr); err != nil {
			return nil, err
		}
		avail, err := decimal.NewFromString(availStr)
		if err != nil {
			return nil, err
		}
		if avail.LessThan(reserved) {
			return nil, fmt.Errorf("%w: need %s, available %s", ErrInsufficientFunds, reserved.StringFixed(2), avail.StringFixed(2))
		}
		if _, err := tx.Exec(ctx, `
			UPDATE accounts SET locked = locked + $1::numeric, updated_at = now() WHERE user_id = $2
		`, reserved.String(), p.UserID); err != nil {
			return nil, err
		}
	}

	if p.Side == Sell {
		// Lock qty out of the position so concurrent open sells can't oversell.
		var posStr, lockedStr string
		err := tx.QueryRow(ctx, `
			SELECT qty::text, locked_qty::text
			FROM positions WHERE user_id = $1 AND symbol = $2 FOR UPDATE
		`, p.UserID, p.Symbol).Scan(&posStr, &lockedStr)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w: need %s, available 0", ErrInsufficientQty, p.Qty.String())
		}
		if err != nil {
			return nil, err
		}
		posQty, err := decimal.NewFromString(posStr)
		if err != nil {
			return nil, err
		}
		lockedQty, err := decimal.NewFromString(lockedStr)
		if err != nil {
			return nil, err
		}
		avail := posQty.Sub(lockedQty)
		if avail.LessThan(p.Qty) {
			return nil, fmt.Errorf("%w: need %s, available %s", ErrInsufficientQty, p.Qty.String(), avail.String())
		}
		if _, err := tx.Exec(ctx, `
			UPDATE positions SET locked_qty = locked_qty + $1::numeric, updated_at = now()
			WHERE user_id = $2 AND symbol = $3
		`, p.Qty.String(), p.UserID, p.Symbol); err != nil {
			return nil, err
		}
	}

	// For trailing stops: prime watermark with the current mark so the first
	// tick can already produce a sensible stop. If no mark is available yet
	// the engine will set it on first tick.
	var initialWatermark *decimal.Decimal
	if p.Type == TrailingStop && s.engine != nil {
		if v, ok := s.engine.LastPrice(p.Symbol); ok {
			d := decimal.NewFromFloat(v)
			initialWatermark = &d
		}
	}

	o, err := s.repo.InsertOrderTx(ctx, tx, InsertParams{
		UserID:        p.UserID,
		ClientOrderID: p.ClientOrderID,
		Symbol:        p.Symbol,
		Side:          p.Side,
		Type:          p.Type,
		LimitPrice:    p.LimitPrice,
		StopPrice:     p.StopPrice,
		TrailPercent:  p.TrailPercent,
		Watermark:     initialWatermark,
		Qty:           p.Qty,
		ReservedCost:  reserved,
		Status:        status,
	})
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	if s.engine != nil {
		s.engine.MarkActive(o.Symbol)
	}
	return o, nil
}

// priceForReservation returns a sensible reference price for sizing the
// upfront balance lock on a buy order.
//
// For stop_market buys the order executes at market when triggered, so the
// reservation must cover the higher of stop_price and current mark — a stop
// placed below the current price triggers immediately and fills at mark.
func (s *Service) priceForReservation(p PlaceParams) (decimal.Decimal, error) {
	mark := decimal.Zero
	if s.engine != nil {
		if v, ok := s.engine.LastPrice(p.Symbol); ok {
			mark = decimal.NewFromFloat(v)
		}
	}
	switch p.Type {
	case Limit:
		return *p.LimitPrice, nil
	case StopMarket:
		ref := *p.StopPrice
		if mark.GreaterThan(ref) {
			ref = mark
		}
		return ref, nil
	case Market, TrailingStop:
		if mark.IsPositive() {
			return mark, nil
		}
		return decimal.Zero, ErrNoMarkPrice
	}
	return decimal.Zero, ErrInvalidType
}

func (s *Service) Cancel(ctx context.Context, userID, orderID uuid.UUID) (*Order, error) {
	tx, err := s.repo.PoolDB().BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	o, err := s.repo.CancelOpenOrderTx(ctx, tx, userID, orderID)
	if err != nil {
		return nil, err
	}
	if o.Side == Buy && o.ReservedCost.IsPositive() {
		if _, err := tx.Exec(ctx, `
			UPDATE accounts SET locked = locked - $1::numeric, updated_at = now() WHERE user_id = $2
		`, o.ReservedCost.String(), userID); err != nil {
			return nil, err
		}
	}
	if o.Side == Sell && o.OCOLocksQty {
		// Release the unfilled portion of the qty back to position.locked_qty.
		// Skip release for OCO legs that don't hold the bracket lock.
		remaining := o.Qty.Sub(o.FilledQty)
		if remaining.IsPositive() {
			if _, err := tx.Exec(ctx, `
				UPDATE positions SET locked_qty = locked_qty - $1::numeric, updated_at = now()
				WHERE user_id = $2 AND symbol = $3
			`, remaining.String(), userID, o.Symbol); err != nil {
				return nil, err
			}
		}
	}
	// User-cancel of one leg cancels its OCO sibling(s) too — same semantics
	// as a fill cascade.
	if o.OCOGroupID != nil {
		if err := cancelOCOSiblings(ctx, tx, *o.OCOGroupID, o.ID); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return o, nil
}

func (s *Service) ListOrders(ctx context.Context, userID uuid.UUID, status string, limit int) ([]Order, error) {
	return s.repo.ListOrders(ctx, userID, status, limit)
}

func (s *Service) ListFills(ctx context.Context, userID uuid.UUID, limit int) ([]Fill, error) {
	return s.repo.ListFills(ctx, userID, limit)
}

func (s *Service) ListPositions(ctx context.Context, userID uuid.UUID) ([]Position, error) {
	return s.repo.ListPositions(ctx, userID)
}

func (s *Service) GetAccount(ctx context.Context, userID uuid.UUID) (*Account, error) {
	return s.repo.GetAccount(ctx, userID)
}

// OCOPlaceParams describes a sell-side bracket: a take-profit limit at
// LimitPrice and a stop-loss stop_market at StopPrice covering the same Qty.
// Both legs share an oco_group_id; the limit leg holds the position lock
// (oco_locks_qty=true), the stop leg does not. On either leg's fill the
// engine cancels the sibling.
type OCOPlaceParams struct {
	UserID     uuid.UUID
	Symbol     string
	Qty        decimal.Decimal
	LimitPrice decimal.Decimal
	StopPrice  decimal.Decimal
}

// OCOPlaceResult returns both leg orders so the FE can render the bracket
// pair atomically.
type OCOPlaceResult struct {
	Limit *Order `json:"limit"`
	Stop  *Order `json:"stop"`
}

// PlaceOCO creates a sell bracket atomically: take-profit limit + stop-loss
// stop_market sharing one oco_group_id. Position.locked_qty rises by Qty
// once (via the limit leg's normal reservation path); the stop leg's
// oco_locks_qty=false flag tells the engine not to double-lock.
func (s *Service) PlaceOCO(ctx context.Context, p OCOPlaceParams) (*OCOPlaceResult, error) {
	p.Symbol = strings.ToUpper(strings.TrimSpace(p.Symbol))
	if p.Symbol == "" {
		return nil, ErrSymbolRequired
	}
	if !p.Qty.IsPositive() {
		return nil, ErrInvalidQty
	}
	if !p.LimitPrice.IsPositive() || !p.StopPrice.IsPositive() {
		return nil, ErrLimitPriceMissing
	}
	if !p.LimitPrice.GreaterThan(p.StopPrice) {
		return nil, ErrOCOPriceLogic
	}

	tx, err := s.repo.PoolDB().BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Lock the position qty once for the whole bracket via the limit leg.
	var posStr, lockedStr string
	err = tx.QueryRow(ctx, `
		SELECT qty::text, locked_qty::text
		FROM positions WHERE user_id = $1 AND symbol = $2 FOR UPDATE
	`, p.UserID, p.Symbol).Scan(&posStr, &lockedStr)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("%w: need %s, available 0", ErrInsufficientQty, p.Qty.String())
	}
	if err != nil {
		return nil, err
	}
	posQty, err := decimal.NewFromString(posStr)
	if err != nil {
		return nil, err
	}
	lockedQty, err := decimal.NewFromString(lockedStr)
	if err != nil {
		return nil, err
	}
	if avail := posQty.Sub(lockedQty); avail.LessThan(p.Qty) {
		return nil, fmt.Errorf("%w: need %s, available %s", ErrInsufficientQty, p.Qty.String(), avail.String())
	}
	if _, err := tx.Exec(ctx, `
		UPDATE positions SET locked_qty = locked_qty + $1::numeric, updated_at = now()
		WHERE user_id = $2 AND symbol = $3
	`, p.Qty.String(), p.UserID, p.Symbol); err != nil {
		return nil, err
	}

	groupID := uuid.New()

	// Limit (take-profit) leg holds the lock semantically. Inserted as 'open'.
	tp, err := s.repo.InsertOrderTx(ctx, tx, InsertParams{
		UserID:      p.UserID,
		Symbol:      p.Symbol,
		Side:        Sell,
		Type:        Limit,
		LimitPrice:  &p.LimitPrice,
		Qty:         p.Qty,
		Status:      StatusOpen,
		OCOGroupID:  &groupID,
		OCOLocksQty: true,
	})
	if err != nil {
		return nil, err
	}

	// Stop (stop-loss) leg does NOT lock; pending until trigger.
	sl, err := s.repo.InsertOrderTx(ctx, tx, InsertParams{
		UserID:      p.UserID,
		Symbol:      p.Symbol,
		Side:        Sell,
		Type:        StopMarket,
		StopPrice:   &p.StopPrice,
		Qty:         p.Qty,
		Status:      StatusPending,
		OCOGroupID:  &groupID,
		OCOLocksQty: false,
	})
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	if s.engine != nil {
		s.engine.MarkActive(p.Symbol)
	}
	return &OCOPlaceResult{Limit: tp, Stop: sl}, nil
}

// PnLSummary aggregates realized+unrealized PnL plus equity. Unrealized is
// computed against the engine's last-tick mark per symbol; missing marks
// fall back to avg_cost (i.e. zero-PnL contribution). Realized today is the
// sum of fee-adjusted realized PnL whose fill timestamp is in the current
// UTC day — cheap to compute from the fills table without a separate journal.
type PnLSummary struct {
	Balance         decimal.Decimal     `json:"balance"`
	Available       decimal.Decimal     `json:"available"`
	Equity          decimal.Decimal     `json:"equity"`
	RealizedTotal   decimal.Decimal     `json:"realized_total"`
	RealizedToday   decimal.Decimal     `json:"realized_today"`
	UnrealizedTotal decimal.Decimal     `json:"unrealized_total"`
	Positions       []PnLPositionDetail `json:"positions"`
}

type PnLPositionDetail struct {
	Symbol     string          `json:"symbol"`
	Qty        decimal.Decimal `json:"qty"`
	AvgCost    decimal.Decimal `json:"avg_cost"`
	Mark       decimal.Decimal `json:"mark"`
	Unrealized decimal.Decimal `json:"unrealized"`
}

func (s *Service) PnL(ctx context.Context, userID uuid.UUID) (*PnLSummary, error) {
	acc, err := s.repo.GetAccount(ctx, userID)
	if err != nil {
		return nil, err
	}
	positions, err := s.repo.ListPositions(ctx, userID)
	if err != nil {
		return nil, err
	}
	realizedToday, err := s.repo.RealizedPnLToday(ctx, userID)
	if err != nil {
		return nil, err
	}

	out := &PnLSummary{
		Balance:   acc.Balance,
		Available: acc.Available,
	}
	out.RealizedTotal = decimal.Zero
	out.UnrealizedTotal = decimal.Zero
	out.RealizedToday = realizedToday
	mtm := decimal.Zero
	for _, p := range positions {
		mult, err := s.repo.MultiplierFor(ctx, p.Symbol)
		if err != nil {
			return nil, err
		}
		// Realized stored on positions is in price units; apply contract
		// multiplier to surface dollar P&L for futures (1 for spot).
		out.RealizedTotal = out.RealizedTotal.Add(p.RealizedPnL.Mul(mult))
		mark := p.AvgCost
		if s.engine != nil {
			if v, ok := s.engine.LastPrice(p.Symbol); ok {
				mark = decimal.NewFromFloat(v)
			}
		}
		unr := mark.Sub(p.AvgCost).Mul(p.Qty).Mul(mult)
		out.UnrealizedTotal = out.UnrealizedTotal.Add(unr)
		mtm = mtm.Add(mark.Mul(p.Qty))
		out.Positions = append(out.Positions, PnLPositionDetail{
			Symbol: p.Symbol, Qty: p.Qty, AvgCost: p.AvgCost,
			Mark: mark, Unrealized: unr,
		})
	}
	out.Equity = acc.Balance.Add(mtm)
	return out, nil
}
