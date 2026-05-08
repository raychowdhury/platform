// Package databento adapts Databento Live (CME Globex via GLBX.MDP3) to the
// generic exchange.Streamer interface. Schema = "trades" so each emitted
// record is an executed print, mapped into our Tick. Auth by API key from env.
package databento

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	dbn "github.com/NimbleMarkets/dbn-go"
	dbn_live "github.com/NimbleMarkets/dbn-go/live"

	"github.com/platform/ingest/internal/exchange"
)

type Streamer struct {
	APIKey  string
	Dataset string
	StypeIn dbn.SType
	// BookOut, when non-nil, requests an additional mbp-10 subscription on
	// the same LiveClient session. Single Databento connection covers both
	// schemas, so cost stays at one stream per symbol.
	BookOut chan<- exchange.BookSnapshot
}

func (s *Streamer) Name() string { return "databento" }

func (s *Streamer) Stream(ctx context.Context, symbols []string, log *slog.Logger, out chan<- exchange.Tick) error {
	if s.APIKey == "" {
		return errors.New("databento: empty api key")
	}
	if len(symbols) == 0 {
		return errors.New("databento: no symbols")
	}
	dataset := s.Dataset
	if dataset == "" {
		dataset = "GLBX.MDP3"
	}
	stype := s.StypeIn
	if stype == 0 {
		stype = dbn.SType_RawSymbol
	}

	backoff := time.Second
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		err := s.runOnce(ctx, dataset, stype, symbols, log, out)
		if errors.Is(err, context.Canceled) {
			return err
		}
		// Any other exit (incl. clean EOF from gateway rotation) is a
		// disconnect — sleep with backoff and reconnect; do not fall out
		// of the loop, the supervisor expects perpetual streaming.
		if err == nil {
			err = errors.New("stream ended")
		}
		log.Warn("databento disconnected", "err", err, "backoff", backoff)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
		}
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

func (s *Streamer) runOnce(ctx context.Context, dataset string, stype dbn.SType, symbols []string, log *slog.Logger, out chan<- exchange.Tick) error {
	cfg := dbn_live.LiveConfig{
		Logger:               log,
		ApiKey:               s.APIKey,
		Dataset:              dataset,
		Encoding:             dbn.Encoding_Dbn,
		VersionUpgradePolicy: dbn.VersionUpgradePolicy_AsIs,
		Verbose:              false,
	}
	client, err := dbn_live.NewLiveClient(cfg)
	if err != nil {
		return fmt.Errorf("new client: %w", err)
	}
	defer func() { _ = client.Stop() }()

	if _, err := client.Authenticate(s.APIKey); err != nil {
		return fmt.Errorf("auth: %w", err)
	}

	if err := client.Subscribe(dbn_live.SubscriptionRequestMsg{
		Schema:  "trades",
		StypeIn: stype,
		Symbols: symbols,
	}); err != nil {
		return fmt.Errorf("subscribe trades: %w", err)
	}
	if s.BookOut != nil {
		// mbp-1 = L1 top-of-book updates. mbp-10 (10 levels) is a paid
		// schema and may not be enabled on this Databento account; mbp-1
		// is included on most tiers. Signals derived: book_imb_l1,
		// microprice, spread, liquidity. L5 imbalance fades to L1 echo.
		if err := client.Subscribe(dbn_live.SubscriptionRequestMsg{
			Schema:  "mbp-1",
			StypeIn: stype,
			Symbols: symbols,
		}); err != nil {
			return fmt.Errorf("subscribe mbp-1: %w", err)
		}
	}
	if err := client.Start(); err != nil {
		return fmt.Errorf("start: %w", err)
	}
	log.Info("databento connected", "dataset", dataset, "symbols", symbols, "book", s.BookOut != nil)

	scanner := client.GetDbnScanner()
	if scanner == nil {
		return errors.New("nil dbn scanner")
	}

	// Track instrument_id → raw symbol via Databento's symbol map records.
	symbolMap := dbn.NewPitSymbolMap()

	for scanner.Next() {
		if err := ctx.Err(); err != nil {
			return err
		}
		hdr, err := scanner.GetLastHeader()
		if err != nil {
			continue
		}
		switch hdr.RType {
		case dbn.RType_Error:
			if rec, derr := scanner.DecodeErrorMsg(); derr == nil && rec != nil {
				msg := string(rec.Error[:])
				log.Error("databento error frame", "msg", msg, "code", rec.Code)
				return fmt.Errorf("databento error: %s", msg)
			}
			return errors.New("databento error frame (undecodable)")
		case dbn.RType_System:
			log.Info("databento system frame")
		case dbn.RType_SymbolMapping:
			rec, err := dbn.DbnScannerDecode[dbn.SymbolMappingMsg](scanner)
			if err == nil {
				_ = symbolMap.OnSymbolMappingMsg(rec)
			}
		case dbn.RType_Mbp0:
			rec, err := dbn.DbnScannerDecode[dbn.Mbp0Msg](scanner)
			if err != nil {
				continue
			}
			if rec.Action != 'T' {
				continue
			}
			sym := symbolMap.Get(rec.Header.InstrumentID)
			if sym == "" {
				sym = symbols[0]
			}
			select {
			case <-ctx.Done():
				return ctx.Err()
			case out <- exchange.Tick{
				Symbol:       sym,
				TradeID:      int64(rec.Sequence),
				Price:        dbn.Fixed9ToFloat64(rec.Price),
				Qty:          float64(rec.Size),
				Time:         time.Unix(0, int64(rec.TsRecv)).UTC(),
				IsBuyerMaker: rec.Side == 'A',
			}:
			}
		case dbn.RType_Mbp1:
			if s.BookOut == nil {
				continue
			}
			rec, err := dbn.DbnScannerDecode[dbn.Mbp1Msg](scanner)
			if err != nil {
				continue
			}
			sym := symbolMap.Get(rec.Header.InstrumentID)
			if sym == "" {
				sym = symbols[0]
			}
			snap := exchange.BookSnapshot{
				Symbol: sym,
				Time:   time.Unix(0, int64(rec.TsRecv)).UTC(),
			}
			lv := rec.Level
			if lv.BidSz > 0 {
				snap.Bids = []exchange.BookLevel{{
					Price: dbn.Fixed9ToFloat64(lv.BidPx),
					Size:  lv.BidSz,
					Count: lv.BidCt,
				}}
			}
			if lv.AskSz > 0 {
				snap.Asks = []exchange.BookLevel{{
					Price: dbn.Fixed9ToFloat64(lv.AskPx),
					Size:  lv.AskSz,
					Count: lv.AskCt,
				}}
			}
			if len(snap.Bids) == 0 && len(snap.Asks) == 0 {
				continue
			}
			// Drop snapshot when downstream is slow rather than block ticks.
			select {
			case <-ctx.Done():
				return ctx.Err()
			case s.BookOut <- snap:
			default:
			}
		}
	}
	if err := scanner.Error(); err != nil {
		return fmt.Errorf("scanner: %w", err)
	}
	return nil
}
