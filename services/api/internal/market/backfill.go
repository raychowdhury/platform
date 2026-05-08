package market

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	dbn "github.com/NimbleMarkets/dbn-go"
	dbn_hist "github.com/NimbleMarkets/dbn-go/hist"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/platform/api/internal/httputil"
)

// BackfillHandlers serves admin-only historical backfill of OHLCV-1m data
// from Databento. Each minute bar is exploded into 4 synthetic ticks
// (open/high/low/close at :00/:15/:30/:45) so the existing TimescaleDB
// continuous aggregates pick the bars up without a separate codepath.
type BackfillHandlers struct {
	db        *pgxpool.Pool
	apiKey    string
	dataset   string
}

func NewBackfillHandlers(db *pgxpool.Pool, apiKey, dataset string) *BackfillHandlers {
	if dataset == "" {
		dataset = "GLBX.MDP3"
	}
	return &BackfillHandlers{db: db, apiKey: apiKey, dataset: dataset}
}

type backfillReq struct {
	Days int `json:"days"`
}

type backfillResp struct {
	Symbol     string    `json:"symbol"`
	Bars       int       `json:"bars"`
	TicksWrote int       `json:"ticks_wrote"`
	From       time.Time `json:"from"`
	To         time.Time `json:"to"`
}

func (h *BackfillHandlers) Run(w http.ResponseWriter, r *http.Request) {
	if h.apiKey == "" {
		httputil.WriteError(w, http.StatusServiceUnavailable, "DATABENTO_API_KEY not set")
		return
	}
	symbol := chi.URLParam(r, "symbol")
	if symbol == "" {
		httputil.WriteError(w, http.StatusBadRequest, "symbol required")
		return
	}

	var req backfillReq
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid json")
			return
		}
	}
	days := req.Days
	if days <= 0 || days > 30 {
		days = 5
	}

	// Databento historical trails live by ~5–10 min; pad end back to stay
	// inside the available range and avoid 422 data_end_after_available_end.
	end := time.Now().UTC().Add(-15 * time.Minute).Truncate(time.Minute)
	start := end.Add(-time.Duration(days) * 24 * time.Hour)

	bars, err := fetchOhlcv1m(h.apiKey, h.dataset, symbol, start, end)
	if err != nil {
		httputil.WriteError(w, http.StatusBadGateway, "databento: "+err.Error())
		return
	}

	written, err := writeSyntheticTicks(r.Context(), h.db, symbol, bars)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "insert: "+err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, backfillResp{
		Symbol:     symbol,
		Bars:       len(bars),
		TicksWrote: written,
		From:       start,
		To:         end,
	})
}

type ohlcvBar struct {
	Time   time.Time
	Open   float64
	High   float64
	Low    float64
	Close  float64
	Volume uint64
}

func fetchOhlcv1m(apiKey, dataset, symbol string, start, end time.Time) ([]ohlcvBar, error) {
	params := dbn_hist.SubmitJobParams{
		Dataset: dataset,
		Symbols: symbol,
		Schema:  dbn.Schema_Ohlcv1M,
		DateRange: dbn_hist.DateRange{
			Start: start,
			End:   end,
		},
		Encoding:    dbn.Encoding_Dbn,
		Compression: dbn.Compress_None,
		StypeIn:     dbn.SType_RawSymbol,
	}
	raw, err := dbn_hist.GetRange(apiKey, params)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return nil, nil
	}
	scanner := dbn.NewDbnScanner(bytes.NewReader(raw))
	if _, err := scanner.Metadata(); err != nil {
		return nil, fmt.Errorf("metadata: %w", err)
	}
	var out []ohlcvBar
	for scanner.Next() {
		hdr, err := scanner.GetLastHeader()
		if err != nil {
			continue
		}
		if !hdr.RType.IsCandle() {
			continue
		}
		rec, err := dbn.DbnScannerDecode[dbn.OhlcvMsg](scanner)
		if err != nil {
			continue
		}
		out = append(out, ohlcvBar{
			Time:   time.Unix(0, int64(rec.Header.TsEvent)).UTC(),
			Open:   dbn.Fixed9ToFloat64(rec.Open),
			High:   dbn.Fixed9ToFloat64(rec.High),
			Low:    dbn.Fixed9ToFloat64(rec.Low),
			Close:  dbn.Fixed9ToFloat64(rec.Close),
			Volume: rec.Volume,
		})
	}
	if err := scanner.Error(); err != nil && !errors.Is(err, context.Canceled) && !errors.Is(err, io.EOF) {
		return out, fmt.Errorf("scan: %w", err)
	}
	return out, nil
}

// writeSyntheticTicks explodes each OHLCV bar into 4 ticks (open/high/low/close
// at :00/:15/:30/:45 of the minute) with full bar volume on the close. The
// continuous aggregate then reconstructs the bar from those points.
func writeSyntheticTicks(ctx context.Context, db *pgxpool.Pool, symbol string, bars []ohlcvBar) (int, error) {
	if len(bars) == 0 {
		return 0, nil
	}
	rows := make([][]any, 0, len(bars)*4)
	for i, b := range bars {
		baseID := int64(b.Time.Unix()) * 4
		rows = append(rows,
			[]any{b.Time.Add(0 * time.Second), symbol, baseID + 0, b.Open, 0.0, false},
			[]any{b.Time.Add(15 * time.Second), symbol, baseID + 1, b.High, 0.0, false},
			[]any{b.Time.Add(30 * time.Second), symbol, baseID + 2, b.Low, 0.0, false},
			[]any{b.Time.Add(45 * time.Second), symbol, baseID + 3, b.Close, float64(b.Volume), false},
		)
		_ = i
	}
	n, err := db.CopyFrom(ctx,
		pgx.Identifier{"ticks"},
		[]string{"time", "symbol", "trade_id", "price", "qty", "is_buyer_maker"},
		pgx.CopyFromRows(rows),
	)
	return int(n), err
}
