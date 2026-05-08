// Package signals computes order-book + tape derived signals from live
// Databento mbp-10 book snapshots and trade prints. The latest snapshot per
// symbol is published to Redis under `signals:<symbol>` so the API can serve
// it without itself maintaining state.
package signals

import (
	"context"
	"encoding/json"
	"log/slog"
	"sort"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/platform/ingest/internal/exchange"
)

const (
	tradeWindow   = 5 * time.Minute
	publishPeriod = time.Second
	cacheTTL      = 10 * time.Second
	defaultTick   = 0.25 // ES E-mini; if multi-symbol later, look up per instrument
)

type tradeEvent struct {
	Time         time.Time
	Price        float64
	Qty          float64
	IsBuyerMaker bool // true => sell aggressor
}

type symbolState struct {
	mu     sync.RWMutex
	book   exchange.BookSnapshot
	trades []tradeEvent
}

type Engine struct {
	rdb    *redis.Client
	log    *slog.Logger
	mu     sync.RWMutex
	states map[string]*symbolState
}

func NewEngine(rdb *redis.Client, log *slog.Logger) *Engine {
	return &Engine{
		rdb:    rdb,
		log:    log,
		states: map[string]*symbolState{},
	}
}

func (e *Engine) state(sym string) *symbolState {
	e.mu.RLock()
	st := e.states[sym]
	e.mu.RUnlock()
	if st != nil {
		return st
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if st = e.states[sym]; st != nil {
		return st
	}
	st = &symbolState{}
	e.states[sym] = st
	return st
}

func (e *Engine) OnBook(snap exchange.BookSnapshot) {
	st := e.state(snap.Symbol)
	st.mu.Lock()
	st.book = snap
	st.mu.Unlock()
}

func (e *Engine) OnTrade(t exchange.Tick) {
	st := e.state(t.Symbol)
	st.mu.Lock()
	st.trades = append(st.trades, tradeEvent{
		Time:         t.Time,
		Price:        t.Price,
		Qty:          t.Qty,
		IsBuyerMaker: t.IsBuyerMaker,
	})
	cutoff := time.Now().Add(-tradeWindow)
	for i, ev := range st.trades {
		if ev.Time.After(cutoff) {
			st.trades = st.trades[i:]
			break
		}
	}
	st.mu.Unlock()
}

// Run computes + publishes signals for every tracked symbol every publishPeriod.
func (e *Engine) Run(ctx context.Context) {
	t := time.NewTicker(publishPeriod)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			e.publishAll(ctx)
		}
	}
}

func (e *Engine) publishAll(ctx context.Context) {
	e.mu.RLock()
	syms := make([]string, 0, len(e.states))
	for s := range e.states {
		syms = append(syms, s)
	}
	e.mu.RUnlock()
	for _, sym := range syms {
		sig := e.compute(sym)
		if sig == nil {
			continue
		}
		buf, err := json.Marshal(sig)
		if err != nil {
			continue
		}
		if err := e.rdb.Set(ctx, "signals:"+sym, buf, cacheTTL).Err(); err != nil {
			e.log.Warn("signals publish", "sym", sym, "err", err)
		}
	}
}

// Snapshot is the JSON shape emitted to Redis (and onward to the FE).
// Numbers are kept as numbers (not strings) so the chart panel can render
// without parsing.
type Snapshot struct {
	Symbol      string    `json:"symbol"`
	Time        time.Time `json:"time"`
	BestBid     float64   `json:"best_bid"`
	BestAsk     float64   `json:"best_ask"`
	BestBidSz   uint32    `json:"best_bid_sz"`
	BestAskSz   uint32    `json:"best_ask_sz"`
	SpreadTicks float64   `json:"spread_ticks"`
	Microprice  float64   `json:"microprice"`
	BookImbL1   float64   `json:"book_imb_l1"`  // (bid-ask)/(bid+ask) at top
	BookImbL5   float64   `json:"book_imb_l5"`  // top 5 levels each side
	Sweep5m     float64   `json:"sweep_5m"`     // signed buy-sell qty over 5m
	Sweep5mPct  float64   `json:"sweep_5m_pct"` // sweep / total volume
	Support     float64   `json:"support"`
	Resistance  float64   `json:"resistance"`
	StopLong    float64   `json:"stop_long"`
	StopShort   float64   `json:"stop_short"`
	Liquidity   string    `json:"liquidity"`     // good | wide | thin
	BestFillSide string   `json:"best_fill_side"` // bid | ask | either
	MicroLean   float64   `json:"micro_lean"`     // microprice - mid
	Conviction  string    `json:"conviction"`     // long | short | none | split
	ConvictionScore int   `json:"conviction_score"`
}

func (e *Engine) compute(sym string) *Snapshot {
	st := e.state(sym)
	st.mu.RLock()
	book := st.book
	tradesCopy := make([]tradeEvent, len(st.trades))
	copy(tradesCopy, st.trades)
	st.mu.RUnlock()

	if len(book.Bids) == 0 || len(book.Asks) == 0 {
		return nil
	}

	bestBid := book.Bids[0]
	bestAsk := book.Asks[0]
	mid := (bestBid.Price + bestAsk.Price) / 2

	out := &Snapshot{
		Symbol:    sym,
		Time:      book.Time,
		BestBid:   bestBid.Price,
		BestAsk:   bestAsk.Price,
		BestBidSz: bestBid.Size,
		BestAskSz: bestAsk.Size,
	}
	tick := defaultTick
	out.SpreadTicks = (bestAsk.Price - bestBid.Price) / tick

	// Microprice: weighted mid where the heavier side pulls less (you fill
	// against the lighter side, so price drifts toward it).
	if bestBid.Size+bestAsk.Size > 0 {
		denom := float64(bestBid.Size + bestAsk.Size)
		out.Microprice = (bestBid.Price*float64(bestAsk.Size) + bestAsk.Price*float64(bestBid.Size)) / denom
	} else {
		out.Microprice = mid
	}
	out.MicroLean = out.Microprice - mid

	// Book imbalance, top 1 and top 5.
	out.BookImbL1 = imb(bestBid.Size, bestAsk.Size)
	out.BookImbL5 = imb(sumSize(book.Bids, 5), sumSize(book.Asks, 5))

	// Sweep over the last 5 minutes (buy aggressors positive).
	var buyVol, sellVol float64
	for _, t := range tradesCopy {
		if t.IsBuyerMaker {
			sellVol += t.Qty
		} else {
			buyVol += t.Qty
		}
	}
	out.Sweep5m = buyVol - sellVol
	if total := buyVol + sellVol; total > 0 {
		out.Sweep5mPct = out.Sweep5m / total
	}

	// Volume profile POC over 5m → support/resistance proxies.
	if poc, ok := volumePOC(tradesCopy); ok {
		out.Support = poc - tick // first defended level below POC
		out.Resistance = poc + tick
		out.StopLong = out.Support - tick
		out.StopShort = out.Resistance + tick
	}

	// Liquidity quality.
	switch {
	case out.SpreadTicks > 1.5:
		out.Liquidity = "wide"
	case bestBid.Size+bestAsk.Size < 4:
		out.Liquidity = "thin"
	default:
		out.Liquidity = "good"
	}

	// Best fill side: lean of microprice tells which side fills first.
	switch {
	case out.MicroLean > 0.05:
		out.BestFillSide = "ask"
	case out.MicroLean < -0.05:
		out.BestFillSide = "bid"
	default:
		out.BestFillSide = "either"
	}

	// Conviction (matches user spec):
	//   long  scores: imb>+20%, sweep>+10%
	//   short scores: imb<-20%, sweep<-10%
	// Iceberg pressure left out for v1 (depth refill detection deferred).
	sLong, sShort := 0, 0
	if out.BookImbL5 > 0.20 {
		sLong++
	}
	if out.BookImbL5 < -0.20 {
		sShort++
	}
	if out.Sweep5mPct > 0.10 {
		sLong++
	}
	if out.Sweep5mPct < -0.10 {
		sShort++
	}
	switch {
	case sLong >= 2 && sLong > sShort:
		out.Conviction = "long"
		out.ConvictionScore = sLong
	case sShort >= 2 && sShort > sLong:
		out.Conviction = "short"
		out.ConvictionScore = sShort
	case sLong == 0 && sShort == 0:
		out.Conviction = "none"
	default:
		out.Conviction = "split"
	}
	return out
}

func imb(bid, ask uint32) float64 {
	total := float64(bid + ask)
	if total == 0 {
		return 0
	}
	return (float64(bid) - float64(ask)) / total
}

func sumSize(levels []exchange.BookLevel, n int) uint32 {
	if n > len(levels) {
		n = len(levels)
	}
	var s uint32
	for i := 0; i < n; i++ {
		s += levels[i].Size
	}
	return s
}

// volumePOC returns the price with the most traded volume in the trade window.
func volumePOC(trades []tradeEvent) (float64, bool) {
	if len(trades) == 0 {
		return 0, false
	}
	byPrice := map[float64]float64{}
	for _, t := range trades {
		byPrice[t.Price] += t.Qty
	}
	type pair struct {
		price float64
		vol   float64
	}
	pairs := make([]pair, 0, len(byPrice))
	for p, v := range byPrice {
		pairs = append(pairs, pair{p, v})
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].vol > pairs[j].vol })
	return pairs[0].price, true
}
