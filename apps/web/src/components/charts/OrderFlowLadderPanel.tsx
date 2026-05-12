"use client";
import { useEffect, useMemo, useRef } from "react";
import { useOrderBook } from "@/lib/useOrderBook";
import { normalizeOrderFlowRows } from "@/lib/charts/normalizeOrderFlowRows";
import OrderFlowLadderRow from "./OrderFlowLadderRow";

interface Props {
  symbol: string;
  tf?: string;
  tick?: number;
  /** Optional last/current price override (e.g. from chart header). When
   *  omitted the panel uses the highest-volume row (POC) as the marker. */
  lastPrice?: number | null;
}

// OrderFlowLadderPanel is the right-side replacement for the previous BOOK
// aside. Uses the existing /v1/market/{ladder,signals} feed via the
// useOrderBook hook — no new endpoints, no signal/threshold changes.
//
// Columns: Price | COB | SVP | Δ | CQC
// Bars sit behind values; current price row is highlighted.
// Empty / closed-market state shows a clean placeholder.
export default function OrderFlowLadderPanel({
  symbol,
  tf,
  tick = 0.25,
  lastPrice,
}: Props) {
  const ob = useOrderBook(symbol, 1440);

  const data = useMemo(
    () => normalizeOrderFlowRows({
      symbol,
      tf,
      ladder: ob.ladder,
      signal: ob.signal,
      tick,
      maxRows: 140,
    }),
    [symbol, tf, ob.ladder, ob.signal, tick],
  );

  // Optionally override which row gets the LAST highlight when caller
  // passes a chart-header price (more authoritative than POC heuristic).
  const rowsWithMark = useMemo(() => {
    if (lastPrice == null || data.rows.length === 0) return data.rows;
    let nearestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < data.rows.length; i++) {
      const d = Math.abs(data.rows[i].price - lastPrice);
      if (d < bestDist) { bestDist = d; nearestIdx = i; }
    }
    return data.rows.map((r, i) => ({ ...r, isCurrentPrice: i === nearestIdx }));
  }, [data.rows, lastPrice]);

  // Per-column max for bar scaling.
  const cobMax   = useMemo(() => maxBy(rowsWithMark, (r) => r.cob   ?? 0), [rowsWithMark]);
  const svpMax   = useMemo(() => maxBy(rowsWithMark, (r) => r.svp   ?? 0), [rowsWithMark]);
  const cqcMax   = useMemo(() => maxBy(rowsWithMark, (r) => r.cqc   ?? 0), [rowsWithMark]);
  const deltaMax = useMemo(() => maxBy(rowsWithMark, (r) => Math.abs(r.delta ?? 0)), [rowsWithMark]);

  const mid = data.midPrice ?? lastPrice ?? null;

  // Auto-center scroll on current row first time data lands or symbol/tf
  // changes. Stops following once the user scrolls.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const userScrolledRef = useRef(false);
  useEffect(() => { userScrolledRef.current = false; }, [symbol, tf]);
  useEffect(() => {
    if (userScrolledRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const idx = rowsWithMark.findIndex((r) => r.isCurrentPrice);
    if (idx < 0) return;
    const rowH = 22;
    el.scrollTop = Math.max(0, idx * rowH - el.clientHeight / 2);
  }, [rowsWithMark]);

  const obPctText = formatPct(data.orderBookImbPct);
  const volPctText = formatPct(data.volumeSweepPct);

  return (
    <section
      className="flex flex-col h-full w-full min-w-0 bg-[#0a0a10] border-l border-white/[0.06] overflow-hidden"
      aria-label="Order flow ladder"
    >
      {/* Header */}
      <header className="px-3 py-2 border-b border-white/[0.06] shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col leading-tight text-[11px] font-mono">
            <span className="text-muted-foreground">
              Order Book: <PctChip value={data.orderBookImbPct} />
            </span>
            <span className="text-muted-foreground">
              Volume: <PctChip value={data.volumeSweepPct} />
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${data.isLive ? "bg-bull animate-pulse" : "bg-muted-foreground/40"}`} />
            <span className="text-foreground/80 font-mono">{symbol}</span>
            {tf && <span>· {tf}</span>}
          </div>
        </div>
        {/* Visual segmented bars (decorative) — derived from same metrics */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <SegBar value={data.orderBookImbPct ?? 0} title={`OB ${obPctText}`} />
          <SegBar value={data.volumeSweepPct ?? 0} title={`Vol ${volPctText}`} />
        </div>
      </header>

      {/* Column headers */}
      <div
        className="grid px-2 py-1.5 border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-muted-foreground shrink-0"
        style={{ gridTemplateColumns: "76px 1fr 1fr 1fr 1fr" }}
      >
        <span>Price</span>
        <span className="text-right pr-2">COB</span>
        <span className="text-right pr-2">SVP</span>
        <span className="text-right pr-2">Δ</span>
        <span className="text-right pr-2">CQC</span>
      </div>

      {/* Rows */}
      {rowsWithMark.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          onScroll={() => { userScrolledRef.current = true; }}
        >
          {rowsWithMark.map((r, i) => (
            <OrderFlowLadderRow
              key={`${r.price.toFixed(4)}-${i}`}
              row={r}
              cobMax={cobMax}
              svpMax={svpMax}
              deltaMax={deltaMax}
              cqcMax={cqcMax}
              aboveMid={mid != null && r.price > mid && !r.isCurrentPrice}
              belowMid={mid != null && r.price < mid && !r.isCurrentPrice}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PctChip({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground/70">-</span>;
  const cls = value > 0 ? "text-bull" : value < 0 ? "text-bear" : "text-muted-foreground";
  return (
    <span className={`${cls} font-semibold`}>
      {value > 0 ? "+" : ""}{String(value).padStart(2, "0")}%
    </span>
  );
}

function SegBar({ value, title }: { value: number; title?: string }) {
  const segs = 5;
  const filled = Math.min(segs, Math.round((Math.abs(value) / 50) * segs));
  const isUp = value >= 0;
  return (
    <div className="flex gap-px h-2" title={title} aria-label={title}>
      {Array.from({ length: segs }).map((_, i) => {
        const idxFromOuter = isUp ? i : segs - 1 - i;
        const on = value !== 0 && idxFromOuter < filled;
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

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1 px-4 text-center">
      <p className="text-[11px] text-muted-foreground">No order-flow ladder data available</p>
      <p className="text-[10px] text-muted-foreground/60">Waiting for book/depth feed…</p>
    </div>
  );
}

function maxBy<T>(arr: T[], f: (x: T) => number): number {
  let m = 0;
  for (const x of arr) {
    const v = f(x);
    if (v > m) m = v;
  }
  return m || 1;
}

function formatPct(v: number | null | undefined) {
  if (v == null) return "-";
  return `${v > 0 ? "+" : ""}${v}%`;
}
