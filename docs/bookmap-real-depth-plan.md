# Bookmap Real-Depth Plan (mbp-10 / L2)

## Current state

The Bookmap chart on `/dashboard/charts` runs in **fallback** mode.

- Heatmap intensity is synthesised from `/v1/market/footprint` (per-bar
  per-price buy/sell volume) + SVP nodes + round levels + deterministic
  synthetic walls. See `apps/web/src/lib/charts/buildLiquidityMap.ts`.
- Trade prints overlaid on the chart are derived from the dominant
  footprint level per bar (one per bar). See
  `apps/web/src/lib/charts/normalizeTradePrints.ts`.
- The right BOOK ladder shows real per-price volume, trade count, delta
  and (when CME open) L1 best-bid/ask sizes. Mid-book COB rows show `--`.
- A header badge labels the chart "FALLBACK · footprint+svp".

## What's missing for real Bookmap

True Bookmap requires per-time **L2 book snapshots** (resting bid/ask
sizes at each price level over time). Source must include:

1. Historical depth snapshots (≥ 10 levels each side)
2. Trade prints with aggressor side
3. Snapshots time-aligned with trades

## Databento status

Verified live (Sat 2026-05-10):

```
Schema mbp-1 → ✅ subscribed (top of book, 1 level each side)
Schema mbp-10 → ❌ "Not authorized for mbp-10 schema"
```

To unlock real depth: add `GLBX.MDP3 / mbp-10` to the Databento plan via
<https://databento.com/portal/subscriptions>. Cost is materially higher
than mbp-1 (10× depth payload).

## Wire-in steps once mbp-10 is authorised

### Backend

1. **Ingest** — change subscribed schema in
   [services/ingest/internal/exchange/databento/databento.go:106](services/ingest/internal/exchange/databento/databento.go#L106)
   from `"mbp-1"` to `"mbp-10"`. Decoder switches from `Mbp1Msg` to
   `Mbp10Msg` (10 `BidAskPair` per record).
2. **Persistence** — new TimescaleDB hypertable `book_snapshots`
   (`time, symbol, level_idx, bid_px, bid_sz, ask_px, ask_sz`) plus
   continuous aggregates per timeframe.
3. **API** — new endpoint
   `GET /v1/market/depth/{symbol}?tf=1m&from=...&to=...&limit=120`
   returning `DepthSnapshot[]` (see `apps/web/src/lib/charts/bookmapTypes.ts`).
4. **Cache hot path** — emit the latest snapshot to Redis
   `book:<symbol>` so a low-latency endpoint can stream the live frame.

### Frontend

1. Add `useDepthSnapshots(symbol, tf, limit)` next to `useFootprint`.
2. Implement the body of `buildRealDepthMap()` in
   `apps/web/src/lib/charts/buildRealDepthMap.ts`. Map each
   `DepthSnapshot` to one `BookmapFrame` with
   `bidLiquidityByPrice` / `askLiquidityByPrice` populated.
3. `buildBookmapPayload()` already prefers real depth when it exists —
   no change needed.
4. Renderer + ladder need no changes.

### Mode badge

Header badge in `BookmapHeatmapChart.tsx` flips automatically once
`buildBookmapPayload` returns `mode: "real-depth"`. Update label text
from "FALLBACK · footprint+svp" → "REAL L2 · mbp-10" + flip palette to
green.

## Hard rule

The fallback liquidity map is **visualisation only**. It must never feed:
- trading signals
- R1 / R2 / R7 thresholds
- model decisions
- backend strategy logic
- alert triggering

Enforced by file location: `apps/web/src/lib/charts/*` is imported only
by chart components, never by trading/signal modules. The dev-note block
at the top of `buildLiquidityMap.ts` repeats this rule for any future
maintainer.
