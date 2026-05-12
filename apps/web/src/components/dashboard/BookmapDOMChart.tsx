"use client";
import { useEffect, useMemo, useRef } from "react";
import { useOrderBook } from "@/lib/useOrderBook";

interface Props {
  symbol: string;
  tick?: number;
}

interface Row {
  price: number;
  volume: number;
  trades: number;
  buy: number;
  sell: number;
  bidSize: number;
  askSize: number;
}

// BookmapDOMChart — vertical price ladder matching the user's reference:
//   Header: Order Book imb % + Volume sweep % + mini bipolar bars
//   Columns per row:
//     Price | +/- delta | COB (L1 depth bar) | SVP (volume + buy/sell split) | CQC (count)
//   Current-price row highlighted, mid-price row marked
export default function BookmapDOMChart({ symbol, tick = 0.25 }: Props) {
  const ob = useOrderBook(symbol, 1440);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userScrolledRef = useRef(false);

  const ladder = useMemo<Row[]>(() => {
    const rows = ob.ladder?.rows ?? [];
    if (rows.length === 0) return [];
    let pMin = Infinity, pMax = -Infinity;
    for (const r of rows) {
      if (r.price < pMin) pMin = r.price;
      if (r.price > pMax) pMax = r.price;
    }
    if (ob.ladder?.best_bid && ob.ladder.best_bid < pMin) pMin = ob.ladder.best_bid;
    if (ob.ladder?.best_ask && ob.ladder.best_ask > pMax) pMax = ob.ladder.best_ask;

    // Bin price range to ~140 rows so the panel stays scannable; use a
    // multiple of the instrument tick.
    const range = Math.max(tick, pMax - pMin);
    const targetRows = 140;
    const binStep = tick * Math.max(1, Math.ceil(range / tick / targetRows));

    const byPrice = new Map<number, Row>();
    for (const r of rows) {
      const k = Math.round(r.price / binStep) * binStep;
      const ex = byPrice.get(k);
      if (ex) {
        ex.volume += r.volume;
        ex.trades += r.trades;
        ex.buy    += r.buy_volume;
        ex.sell   += r.sell_volume;
      } else {
        byPrice.set(k, {
          price: k,
          volume: r.volume,
          trades: r.trades,
          buy: r.buy_volume,
          sell: r.sell_volume,
          bidSize: 0,
          askSize: 0,
        });
      }
    }
    // Overlay L1 bid/ask sizes onto the matching bin row.
    if (ob.signal?.best_bid) {
      const k = Math.round(ob.signal.best_bid / binStep) * binStep;
      const ex = byPrice.get(k) ?? { price: k, volume: 0, trades: 0, buy: 0, sell: 0, bidSize: 0, askSize: 0 };
      ex.bidSize = ob.signal.best_bid_sz;
      byPrice.set(k, ex);
    }
    if (ob.signal?.best_ask) {
      const k = Math.round(ob.signal.best_ask / binStep) * binStep;
      const ex = byPrice.get(k) ?? { price: k, volume: 0, trades: 0, buy: 0, sell: 0, bidSize: 0, askSize: 0 };
      ex.askSize = ob.signal.best_ask_sz;
      byPrice.set(k, ex);
    }

    const out: Row[] = [];
    for (let p = Math.round(pMax / binStep) * binStep; p >= Math.round(pMin / binStep) * binStep - binStep / 2; p -= binStep) {
      const k = Math.round(p / binStep) * binStep;
      const r = byPrice.get(k);
      out.push(r ?? { price: k, volume: 0, trades: 0, buy: 0, sell: 0, bidSize: 0, askSize: 0 });
    }
    return out;
  }, [ob.ladder, ob.signal, tick]);

  const bestBid = ob.signal?.best_bid ?? ob.ladder?.best_bid ?? 0;
  const bestAsk = ob.signal?.best_ask ?? ob.ladder?.best_ask ?? 0;
  // Fall back to POC when L1 unavailable so mid still places sensibly.
  const fallbackMid = useMemo(() => {
    if (ladder.length === 0) return 0;
    let bestP = ladder[0].price, bestV = -1;
    for (const r of ladder) if (r.volume > bestV) { bestV = r.volume; bestP = r.price; }
    return bestP;
  }, [ladder]);
  const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : fallbackMid;

  const maxSvp   = useMemo(() => Math.max(...ladder.map(r => r.volume), 1), [ladder]);
  const maxCqc   = useMemo(() => Math.max(...ladder.map(r => r.trades), 1), [ladder]);
  const maxDelta = useMemo(() => Math.max(1, ...ladder.map(r => Math.abs(r.buy - r.sell))), [ladder]);
  const maxCob   = useMemo(() => Math.max(1, ob.signal?.best_bid_sz ?? 0, ob.signal?.best_ask_sz ?? 0), [ob.signal]);

  // Center scroll on mid first time data lands or symbol changes.
  useEffect(() => { userScrolledRef.current = false; }, [symbol]);
  useEffect(() => {
    if (userScrolledRef.current || ladder.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const idx = ladder.findIndex(r => Math.abs(r.price - mid) < tick);
    if (idx < 0) return;
    const rowH = 22;
    el.scrollTop = Math.max(0, idx * rowH - el.clientHeight / 2);
  }, [ladder, mid, tick]);

  if (ob.loading && ladder.length === 0) {
    return <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">loading book…</div>;
  }
  if (ladder.length === 0) {
    return <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">no ladder data — market closed</div>;
  }

  const obImb   = ob.signal ? Math.round(ob.signal.book_imb_l1 * 100) : null;
  const sweep   = ob.signal ? Math.round(ob.signal.sweep_5m_pct * 100) : null;

  return (
    <div className="h-full flex flex-col bg-[#0a0a10] text-foreground font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b hairline shrink-0 text-[12px]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col leading-tight">
            <span className="text-muted-foreground">Order Book: <PctChip value={obImb} /></span>
            <span className="text-muted-foreground">Volume: <PctChip value={sweep} /></span>
          </div>
          <SegBar value={obImb ?? 0} />
          <SegBar value={sweep ?? 0} />
        </div>
        <div className="flex items-center gap-2 text-[12px] tracking-[0.25em] font-semibold">
          <span className="inline-block w-1 h-3 bg-bull" />
          <span className="inline-block w-1 h-3 bg-bull/60" />
          <span className="inline-block w-1 h-3 bg-bear" />
          BOOKMAP
        </div>
      </div>

      {/* Column headers */}
      <div className="grid px-4 py-2 border-b hairline text-[11px] text-muted-foreground uppercase tracking-wider shrink-0"
           style={{ gridTemplateColumns: "70px 60px 110px 1fr 80px" }}>
        <span>Price</span>
        <span className="text-right">+/−</span>
        <span className="text-center">COB</span>
        <span className="text-right">SVP</span>
        <span className="text-right">CQC</span>
      </div>

      {/* Ladder */}
      <div ref={containerRef} className="flex-1 overflow-y-auto" onScroll={() => { userScrolledRef.current = true; }}>
        {ladder.map((r, idx) => {
          const isBid    = bestBid > 0 && Math.abs(r.price - bestBid) < tick;
          const isAsk    = bestAsk > 0 && Math.abs(r.price - bestAsk) < tick;
          const aboveMid = mid > 0 && r.price > mid;
          const belowMid = mid > 0 && r.price < mid;
          const delta    = r.buy - r.sell;
          const svpW     = (r.volume / maxSvp) * 100;
          const cqcW     = (r.trades / maxCqc) * 100;
          const deltaPct = (Math.abs(delta) / maxDelta) * 100;
          const cobSize  = isBid ? r.bidSize : isAsk ? r.askSize : 0;
          const cobPct   = (cobSize / maxCob) * 100;

          // Buy/sell share for SVP horizontal split
          const buyShare = r.volume > 0 ? r.buy / r.volume : 0.5;

          const rowBg = isBid ? "bg-bull/15" : isAsk ? "bg-bear/15" : "";
          const priceColor = isBid ? "text-bull font-semibold" : isAsk ? "text-bear font-semibold" : aboveMid ? "text-bear/70" : belowMid ? "text-bull/70" : "text-foreground";

          return (
            <div
              key={`${r.price}-${idx}`}
              className={`grid px-4 items-center ${rowBg} border-b border-white/[0.02]`}
              style={{ gridTemplateColumns: "70px 60px 110px 1fr 80px", height: 22 }}
            >
              {/* Price */}
              <span className={`tabular-nums text-[13px] ${priceColor}`}>{r.price.toFixed(2)}</span>

              {/* +/- delta — bipolar bar around vertical centerline */}
              <span className="relative h-[18px] flex items-center justify-end pr-1">
                <span className="absolute inset-y-0 right-1/2"
                  style={{ width: delta < 0 ? `${deltaPct / 2}%` : 0, background: "rgba(239,83,80,0.55)" }} />
                <span className="absolute inset-y-0 left-1/2"
                  style={{ width: delta > 0 ? `${deltaPct / 2}%` : 0, background: "rgba(38,166,154,0.55)" }} />
                <span className="relative tabular-nums z-10 text-[12px]">
                  {delta !== 0 ? (delta > 0 ? "+" : "") + Math.round(delta) : ""}
                </span>
              </span>

              {/* COB — horizontal bar from center: ask above, bid below.
                  Only top-of-book row populated until mbp-10 unlocks L2. */}
              <span className="relative h-[18px] mx-2 bg-white/[0.03]">
                {cobSize > 0 && (
                  <span
                    className={isAsk ? "absolute inset-y-0 left-1/2 bg-bear/75" : "absolute inset-y-0 right-1/2 bg-bull/75"}
                    style={{ width: `${cobPct / 2}%` }}
                  />
                )}
                {cobSize > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center font-semibold text-[12px]">
                    {cobSize.toLocaleString()}
                  </span>
                )}
              </span>

              {/* SVP — full width with buy(left,green)/sell(right,red) split + value */}
              <span className="relative h-[18px] flex items-center justify-end pr-1">
                <span className="absolute inset-y-0 left-0 bg-bull/45" style={{ width: `${svpW * buyShare}%` }} />
                <span className="absolute left-0 inset-y-0 bg-bear/45"
                  style={{ left: `${svpW * buyShare}%`, width: `${svpW * (1 - buyShare)}%` }} />
                <span className="relative tabular-nums z-10 text-[12px]">
                  {r.volume > 0 ? Math.round(r.volume).toLocaleString() : ""}
                </span>
              </span>

              {/* CQC — accent bar + count */}
              <span className="relative h-[18px] flex items-center justify-end pr-1">
                <span className="absolute inset-y-0 right-0 bg-accent/20" style={{ width: `${cqcW}%` }} />
                <span className="relative tabular-nums z-10 text-[12px] text-muted-foreground">
                  {r.trades > 0 ? r.trades : ""}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PctChip({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const cls = value >= 0 ? "text-bull" : "text-bear";
  return <span className={`${cls} font-semibold`}>{value > 0 ? "+" : ""}{String(value).padStart(2, "0")}%</span>;
}

function SegBar({ value }: { value: number }) {
  // 4-segment Bookmap-style header bar: positive = green segments fill from
  // left, negative = red segments fill from right.
  const segs = 4;
  const filled = Math.min(segs, Math.round((Math.abs(value) / 50) * segs));
  const isUp = value >= 0;
  return (
    <div className="flex gap-px h-3">
      {Array.from({ length: segs }).map((_, i) => {
        const idxFromOuter = isUp ? i : segs - 1 - i;
        const on = idxFromOuter < filled;
        return (
          <span
            key={i}
            className="block w-3"
            style={{ background: on ? (isUp ? "var(--bull)" : "var(--bear)") : "rgba(255,255,255,0.06)" }}
          />
        );
      })}
    </div>
  );
}
