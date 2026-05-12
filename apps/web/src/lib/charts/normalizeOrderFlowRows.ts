import type { ApiLadder, ApiLadderRow, ApiSignal } from "@/lib/api";
import type { OrderFlowLadderData, OrderFlowLadderRow } from "@/types/orderFlow";

interface NormalizeArgs {
  symbol: string;
  tf?: string | null;
  ladder?: ApiLadder | null;
  signal?: ApiSignal | null;
  tick?: number;        // instrument tick size (defaults to 0.25 for ES)
  maxRows?: number;     // cap rendered rows for perf
}

// normalizeOrderFlowRows is the single adapter that maps backend ladder +
// signal payloads into the row shape the OrderFlowLadderPanel renders.
// Missing fields stay null (panel shows "--" rather than fabricating values).
//
// Source mapping:
//   price       ← ladder row's price (binned to ~targetRows so dense ranges
//                 don't render 500 1-px rows)
//   svp         ← row.volume (session volume traded at price over window)
//   cqc         ← row.trades (trade count at price)
//   delta       ← row.buy_volume − row.sell_volume
//   cob         ← signal.best_bid_sz at best_bid row, best_ask_sz at
//                 best_ask row; null elsewhere (mbp-1 = L1 only)
//   buy/sell/total volume ← row.buy_volume / sell_volume / volume
export function normalizeOrderFlowRows({
  symbol,
  tf,
  ladder,
  signal,
  tick = 0.25,
  maxRows = 140,
}: NormalizeArgs): OrderFlowLadderData {
  const rawRows: ApiLadderRow[] = ladder?.rows ?? [];
  const bestBid = signal?.best_bid ?? ladder?.best_bid ?? null;
  const bestAsk = signal?.best_ask ?? ladder?.best_ask ?? null;

  // Empty-state shortcut.
  if (rawRows.length === 0 && !bestBid && !bestAsk) {
    return {
      symbol,
      tf: tf ?? null,
      rows: [],
      bestBid: null,
      bestAsk: null,
      midPrice: null,
      orderBookImbPct: signal ? Math.round(signal.book_imb_l1 * 100) : null,
      volumeSweepPct: signal ? Math.round(signal.sweep_5m_pct * 100) : null,
      isLive: !!signal,
    };
  }

  // Derive price range and bin step.
  let pMin = Infinity, pMax = -Infinity;
  for (const r of rawRows) {
    if (r.price < pMin) pMin = r.price;
    if (r.price > pMax) pMax = r.price;
  }
  if (bestBid != null && bestBid > 0 && bestBid < pMin) pMin = bestBid;
  if (bestAsk != null && bestAsk > 0 && bestAsk > pMax) pMax = bestAsk;
  if (!isFinite(pMin) || !isFinite(pMax)) { pMin = 0; pMax = 0; }

  const range = Math.max(tick, pMax - pMin);
  const binStep = tick * Math.max(1, Math.ceil(range / tick / maxRows));

  // Aggregate raw rows into bin keys.
  const byPrice = new Map<number, OrderFlowLadderRow>();
  for (const r of rawRows) {
    const k = Math.round(r.price / binStep) * binStep;
    const ex = byPrice.get(k);
    if (ex) {
      ex.svp        = (ex.svp ?? 0) + r.volume;
      ex.cqc        = (ex.cqc ?? 0) + r.trades;
      ex.buyVolume  = (ex.buyVolume ?? 0) + r.buy_volume;
      ex.sellVolume = (ex.sellVolume ?? 0) + r.sell_volume;
      ex.totalVolume = (ex.totalVolume ?? 0) + r.volume;
      ex.delta      = (ex.buyVolume ?? 0) - (ex.sellVolume ?? 0);
    } else {
      byPrice.set(k, {
        price: k,
        cob: null,
        svp: r.volume,
        cqc: r.trades,
        delta: r.buy_volume - r.sell_volume,
        buyVolume: r.buy_volume,
        sellVolume: r.sell_volume,
        totalVolume: r.volume,
        isCurrentPrice: false,
      });
    }
  }

  // Overlay L1 sizes on best bid/ask bins (only place we have COB depth).
  if (bestBid != null && bestBid > 0 && signal?.best_bid_sz != null) {
    const k = Math.round(bestBid / binStep) * binStep;
    const ex = byPrice.get(k) ?? blankRow(k);
    ex.cob = signal.best_bid_sz;
    byPrice.set(k, ex);
  }
  if (bestAsk != null && bestAsk > 0 && signal?.best_ask_sz != null) {
    const k = Math.round(bestAsk / binStep) * binStep;
    const ex = byPrice.get(k) ?? blankRow(k);
    ex.cob = signal.best_ask_sz;
    byPrice.set(k, ex);
  }

  // Build a contiguous ladder (high → low) so empty bins render too.
  const out: OrderFlowLadderRow[] = [];
  for (
    let p = Math.round(pMax / binStep) * binStep;
    p >= Math.round(pMin / binStep) * binStep - binStep / 2;
    p -= binStep
  ) {
    const k = Math.round(p / binStep) * binStep;
    const r = byPrice.get(k) ?? blankRow(k);
    out.push(r);
  }

  // Mark the row that is the current/last traded price. Prefer L1 best-bid
  // (real "last touched" proxy when live), else the highest-volume row (POC).
  const markPrice = bestBid ?? pocPrice(out);
  if (markPrice != null) {
    const k = Math.round(markPrice / binStep) * binStep;
    const target = out.find((r) => Math.abs(r.price - k) < binStep / 2);
    if (target) target.isCurrentPrice = true;
  }

  const mid = bestBid != null && bestAsk != null && bestBid > 0 && bestAsk > 0
    ? (bestBid + bestAsk) / 2
    : null;

  return {
    symbol,
    tf: tf ?? null,
    rows: out,
    bestBid,
    bestAsk,
    midPrice: mid,
    orderBookImbPct: signal ? Math.round(signal.book_imb_l1 * 100) : null,
    volumeSweepPct: signal ? Math.round(signal.sweep_5m_pct * 100) : null,
    isLive: !!signal,
  };
}

function blankRow(price: number): OrderFlowLadderRow {
  return {
    price,
    cob: null, svp: null, cqc: null, delta: null,
    buyVolume: null, sellVolume: null, totalVolume: null,
    isCurrentPrice: false,
  };
}

function pocPrice(rows: OrderFlowLadderRow[]): number | null {
  let best: OrderFlowLadderRow | null = null;
  for (const r of rows) {
    if ((r.svp ?? 0) > (best?.svp ?? -1)) best = r;
  }
  return best?.price ?? null;
}
