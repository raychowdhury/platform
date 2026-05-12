"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFootprint } from "@/lib/useMarketStreams";
import { useOrderBook } from "@/lib/useOrderBook";

interface Props {
  symbol: string;
  tf?: string;     // bucket size for time axis
  limit?: number;  // bars to show
  tick?: number;   // price increment
  showRail?: boolean; // hide internal SVP rail when paired with external DOM panel
}

// BookmapHeatmapChart renders a Bookmap-style time × price heatmap of
// **executed flow** (volume per price-bucket per time-bucket). Real
// resting-order heatmap requires mbp-10 (Databento plan upgrade) and is
// stubbed out for now — the canvas pipeline + right-side ladder are
// reusable for that future feed.
//
// Layout:
//   [ time × price heatmap ............ ][ price | SVP | T&S ]
//   [ volume histogram bottom strip                          ]
export default function BookmapHeatmapChart({
  symbol,
  tf = "1m",
  limit = 120,
  tick = 0.25,
  showRail = true,
}: Props) {
  const fp = useFootprint(symbol, tf, limit);
  const ob = useOrderBook(symbol, 1440);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const sizeRef      = useRef({ w: 1000, h: 600 });

  // Pan/zoom state — viewport indices into the bars array. Wheel = vertical
  // zoom (price), shift+wheel = horizontal zoom (time), drag = pan.
  const viewRef = useRef({
    barStart: 0, barEnd: 0,        // x-axis window into bars
    priceLow: 0, priceHigh: 0,     // y-axis window in price units
    init: false,
  });
  const dragRef = useRef<{ x0: number; y0: number; b0: number; b1: number; pl: number; ph: number } | null>(null);

  // Resize observer keeps the canvas pixel buffer aligned with the parent.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      if (!e) return;
      sizeRef.current = { w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) };
      requestAnimationFrame(() => draw());
    });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggregate all FP bars into a (time × price) volume grid. When the price
  // range is wide we bin to a coarser price step so cells stay readable
  // (target ~80 rows max — denser than that and individual cells become
  // 1-2px and the heatmap turns into hash).
  const grid = useMemo(() => {
    const bars = fp.data ?? [];
    if (bars.length === 0) return null;
    let pMin = Infinity, pMax = -Infinity;
    for (const b of bars) {
      for (const lv of b.levels) {
        if (lv.price < pMin) pMin = lv.price;
        if (lv.price > pMax) pMax = lv.price;
      }
    }
    const range = Math.max(tick, pMax - pMin);
    const targetRows = 80;
    const binsForTick = Math.ceil(range / tick / targetRows);
    const binStep = tick * binsForTick; // effective price-bin size

    let vMax = 0;
    const byPrice = new Map<number, number>();
    const cells: Map<number, { p: number; v: number }>[] = bars.map(() => new Map());
    bars.forEach((b, ci) => {
      for (const lv of b.levels) {
        const p = Math.round(lv.price / binStep) * binStep;
        const v = lv.buy_volume + lv.sell_volume;
        if (v <= 0) continue;
        const c = cells[ci].get(p);
        if (c) c.v += v; else cells[ci].set(p, { p, v });
        byPrice.set(p, (byPrice.get(p) ?? 0) + v);
        if (v > vMax) vMax = v;
      }
    });
    // After binning, recompute total max per cell (post-aggregation).
    let cellMax = 0;
    cells.forEach(m => m.forEach(c => { if (c.v > cellMax) cellMax = c.v; }));

    const nRows = Math.max(1, Math.round((pMax - pMin) / binStep) + 1);
    return { bars, cells, pMin, pMax, cellMax, vMax, nRows, byPrice, binStep };
  }, [fp.data, tick]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const RAIL_W   = showRail ? 220 : 0;
    const VOL_H    = 56;
    const plotW    = w - RAIL_W;
    const plotH    = h - VOL_H;
    const { bars, cells, pMin, pMax, cellMax, byPrice, binStep, nRows } = grid;

    // Initialise viewport on first paint or when bars length changes.
    const v = viewRef.current;
    if (!v.init || v.barEnd >= bars.length) {
      v.barStart = 0;
      v.barEnd = bars.length;
      v.priceLow = pMin;
      v.priceHigh = pMax;
      v.init = true;
    }
    const bStart = Math.max(0, Math.min(v.barStart, bars.length - 1));
    const bEnd   = Math.max(bStart + 1, Math.min(v.barEnd, bars.length));
    const pLow   = v.priceLow;
    const pHigh  = Math.max(pLow + binStep, v.priceHigh);
    const visBars = bars.slice(bStart, bEnd);

    const cellW = plotW / Math.max(visBars.length, 1);
    const visRows = Math.max(1, Math.round((pHigh - pLow) / binStep) + 1);
    const cellH = plotH / visRows;
    const pToY  = (p: number) => plotH - ((p - pLow) / Math.max(binStep, pHigh - pLow)) * plotH;

    // Background
    ctx.fillStyle = "#070710";
    ctx.fillRect(0, 0, w, h);

    // Heatmap cells — log-scaled volume per (bar × binned price), only for
    // visible viewport.
    const lvMax = Math.log1p(cellMax);
    visBars.forEach((_b, ci) => {
      const m = cells[bStart + ci];
      const x = ci * cellW;
      m.forEach(({ p, v }) => {
        if (p < pLow - binStep / 2 || p > pHigh + binStep / 2) return;
        const intensity = Math.log1p(v) / lvMax;
        const y = pToY(p) - cellH / 2;
        ctx.fillStyle = heatColor(intensity);
        ctx.fillRect(x, y, Math.max(cellW + 0.5, 1), Math.max(cellH + 0.5, 1));
      });
    });

    // Price line (close per bar) within viewport
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    visBars.forEach((b, ci) => {
      const x = ci * cellW + cellW / 2;
      const y = pToY(b.close);
      if (ci === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Trade-print bubbles
    if (cellW > 4) {
      const bubbleCap = Math.min(7, cellW * 0.45);
      visBars.forEach((b, ci) => {
        let dom = b.levels[0];
        for (const lv of b.levels) if (lv.buy_volume + lv.sell_volume > dom.buy_volume + dom.sell_volume) dom = lv;
        if (!dom) return;
        const v = dom.buy_volume + dom.sell_volume;
        if (v <= 0) return;
        const r = Math.max(1.5, Math.min(bubbleCap, Math.sqrt(v) * 0.18));
        const x = ci * cellW + cellW / 2;
        const y = pToY(Math.round(dom.price / binStep) * binStep);
        const buyDom = dom.buy_volume >= dom.sell_volume;
        ctx.fillStyle = buyDom ? "rgba(38,200,150,0.55)" : "rgba(239,80,80,0.55)";
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });
    }

    // Bottom strip — bar delta histogram (visible bars only)
    const stripY = plotH;
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, stripY, plotW, VOL_H);
    const dMax = Math.max(1, ...visBars.map(b => Math.abs(b.delta)));
    const mid  = stripY + VOL_H / 2;
    visBars.forEach((b, ci) => {
      const x = ci * cellW + 1;
      const bw = Math.max(1, cellW - 2);
      const dh = (Math.abs(b.delta) / dMax) * (VOL_H / 2 - 2);
      ctx.fillStyle = b.delta >= 0 ? "rgba(38,200,150,0.7)" : "rgba(239,80,80,0.7)";
      if (b.delta >= 0) ctx.fillRect(x, mid - dh, bw, dh);
      else              ctx.fillRect(x, mid,       bw, dh);
    });
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(plotW, mid); ctx.stroke();

    // Right rail (only when not paired with external DOM panel).
    if (showRail) {
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(plotW, 0, RAIL_W, h);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.moveTo(plotW, 0); ctx.lineTo(plotW, h); ctx.stroke();

      const railPrices: number[] = [];
      for (let p = pHigh; p >= pLow - binStep / 2; p -= binStep) {
        railPrices.push(Math.round(p / binStep) * binStep);
      }
      const rowH = plotH / Math.max(railPrices.length, 1);
      const svpMax = Math.max(1, ...Array.from(byPrice.values()));
      const fontPx = Math.max(9, Math.min(13, rowH - 2));
      ctx.font = `${fontPx}px 'JetBrains Mono', monospace`;
      railPrices.forEach((p, ri) => {
        const y = ri * rowH;
        const v = byPrice.get(p) ?? 0;
        const bw = (v / svpMax) * 140;
        ctx.fillStyle = "rgba(120,180,255,0.45)";
        ctx.fillRect(plotW + 70, y + 1, bw, Math.max(1, rowH - 1));
        ctx.fillStyle = "#aaa";
        ctx.textAlign = "right";
        ctx.fillText(p.toFixed(2), plotW + 64, y + rowH * 0.72);
        if (v > 0 && rowH > 10) {
          ctx.fillStyle = "#fff";
          ctx.textAlign = "left";
          ctx.fillText(Math.round(v).toLocaleString(), plotW + 74, y + rowH * 0.72);
        }
      });
    }

    // Header strip with imb / volume %
    const sig = ob.signal;
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, plotW, 22);
    ctx.fillStyle = "#888";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    const obImb = sig ? `${(sig.book_imb_l1 * 100).toFixed(0)}%` : "—";
    const sweep = sig ? `${(sig.sweep_5m_pct * 100).toFixed(0)}%` : "—";
    ctx.fillText(`Order Book: ${obImb}   Volume: ${sweep}   |   ${symbol} · ${tf}`, 8, 14);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(plotW, 22); ctx.stroke();
  }, [grid, ob.signal, symbol, tf, tick, showRail]);

  useEffect(() => { draw(); }, [draw]);

  // Reset viewport whenever the underlying bars set changes (symbol/tf swap).
  useEffect(() => { viewRef.current.init = false; draw(); }, [grid, draw]);

  // Wheel: vertical scroll = zoom price (Y), shift+scroll or horizontal
  // delta = zoom time (X). Drag = pan both axes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!grid) return;
      e.preventDefault();
      const v = viewRef.current;
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // time zoom
        const span = v.barEnd - v.barStart;
        const newSpan = Math.max(4, Math.min(grid.bars.length, span * factor));
        const center = (v.barStart + v.barEnd) / 2;
        v.barStart = Math.max(0, Math.round(center - newSpan / 2));
        v.barEnd   = Math.min(grid.bars.length, Math.round(center + newSpan / 2));
      } else {
        // price zoom
        const span = v.priceHigh - v.priceLow;
        const newSpan = Math.max(grid.binStep * 4, span * factor);
        const center = (v.priceLow + v.priceHigh) / 2;
        v.priceLow  = center - newSpan / 2;
        v.priceHigh = center + newSpan / 2;
      }
      draw();
    };
    const onDown = (e: MouseEvent) => {
      if (!grid) return;
      const v = viewRef.current;
      dragRef.current = { x0: e.clientX, y0: e.clientY, b0: v.barStart, b1: v.barEnd, pl: v.priceLow, ph: v.priceHigh };
    };
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !grid) return;
      const { w, h } = sizeRef.current;
      const RAIL_W = showRail ? 220 : 0;
      const VOL_H  = 56;
      const plotW  = w - RAIL_W;
      const plotH  = h - VOL_H;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      const span = d.b1 - d.b0;
      const dBars = -(dx / Math.max(1, plotW)) * span;
      const v = viewRef.current;
      v.barStart = Math.max(0, Math.min(grid.bars.length - 4, Math.round(d.b0 + dBars)));
      v.barEnd   = Math.max(v.barStart + 4, Math.min(grid.bars.length, Math.round(d.b1 + dBars)));
      const pSpan = d.ph - d.pl;
      const dPrice = (dy / Math.max(1, plotH)) * pSpan;
      v.priceLow  = d.pl + dPrice;
      v.priceHigh = d.ph + dPrice;
      draw();
    };
    const onUp = () => { dragRef.current = null; };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [grid, draw, showRail]);

  if (!fp.data && fp.loading) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
        loading heatmap…
      </div>
    );
  }
  if (!grid) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
        no footprint data
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

// heatColor: 0..1 → cool blue → cyan → yellow → red. Mimics Bookmap's
// Bookmap-blue palette so traders recognise the layout.
function heatColor(t: number): string {
  const a = Math.max(0, Math.min(1, t));
  if (a < 0.25) {
    const k = a / 0.25;
    return `rgba(${10 + 20 * k}, ${20 + 60 * k}, ${80 + 100 * k}, 0.85)`; // dark blue → mid blue
  }
  if (a < 0.55) {
    const k = (a - 0.25) / 0.30;
    return `rgba(${30}, ${80 + 130 * k}, ${180}, 0.9)`; // mid blue → cyan
  }
  if (a < 0.8) {
    const k = (a - 0.55) / 0.25;
    return `rgba(${30 + 200 * k}, ${210}, ${180 - 180 * k}, 0.9)`; // cyan → yellow
  }
  const k = (a - 0.8) / 0.20;
  return `rgba(${230}, ${210 - 100 * k}, ${0}, 0.95)`; // yellow → orange/red
}

function roundTick(p: number, tick: number) {
  return Math.round(p / tick) * tick;
}
