"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { rand } from "@/lib/chart-data";
import type { ApiFPBar } from "@/lib/api";
import { useCanvasPanZoom } from "./useCanvasPanZoom";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OFCandle {
  o: number; h: number; l: number; c: number;
  ts: number;
  vol: number;
  delta: number;
  buyVol: number;
  sellVol: number;
}

interface LargeTrade {
  ts: number;   // candle index
  price: number;
  size: number; // contract count
  side: "buy" | "sell";
}

interface HLevel {
  price: number;
  type: "major" | "minor" | "dashed";
  label?: string;
}

interface DOMRow {
  price: number;
  bidSz: number;
  askSz: number;
  ps: number; // position/size net
}

interface VolProfileBar { price: number; vol: number }

// ── Data generation ───────────────────────────────────────────────────────────
const TICK = 0.25;
const rt = (v: number) => Math.round(v / TICK) * TICK;

function genOFCandles(n = 80, base = 5710, seed = 1): OFCandle[] {
  const out: OFCandle[] = [];
  let p = base;
  for (let i = 0; i < n; i++) {
    const o = rt(p);
    const trend = Math.sin(i / 12) * 0.3; // slow sine drift
    const c = rt(o + (rand(seed + i * 3) - 0.5 + trend) * 2);
    const h = rt(Math.max(o, c) + rand(seed + i * 7) * 1.2);
    const l = rt(Math.min(o, c) - rand(seed + i * 11) * 1.2);
    const vol = Math.round(80 + rand(seed + i * 17) * 800);
    const buyVol = Math.round(vol * (0.35 + rand(seed + i * 23) * 0.3));
    const sellVol = vol - buyVol;
    out.push({ o, h, l, c, ts: i, vol, delta: buyVol - sellVol, buyVol, sellVol });
    p = c;
  }
  return out;
}

function genLargeTrades(candles: OFCandle[], seed: number): LargeTrade[] {
  const trades: LargeTrade[] = [];
  candles.forEach((c, ci) => {
    // 1-3 large trades per cluster, sparse
    if (rand(seed + ci * 7) > 0.25) return;
    const count = 1 + Math.floor(rand(seed + ci * 13) * 2);
    for (let t = 0; t < count; t++) {
      const price = rt(c.l + rand(seed + ci * 100 + t) * (c.h - c.l));
      const size  = Math.round(100 + rand(seed + ci * 50 + t) * 900);
      const side  = rand(seed + ci * 200 + t) > 0.45 ? "sell" : "buy";
      trades.push({ ts: ci, price, size, side });
    }
  });
  return trades;
}

function genHLevels(priceMin: number, priceMax: number, seed: number): HLevel[] {
  const levels: HLevel[] = [];
  const range = priceMax - priceMin;
  // major levels at round numbers
  for (let p = Math.ceil(priceMin / 2) * 2; p <= priceMax; p += 2) {
    levels.push({ price: rt(p), type: "major" });
  }
  // minor levels
  for (let i = 0; i < 8; i++) {
    const p = rt(priceMin + rand(seed + i * 17) * range);
    levels.push({ price: p, type: rand(seed + i) > 0.5 ? "minor" : "dashed" });
  }
  return levels;
}

function genVolProfile(candles: OFCandle[], priceMin: number, priceMax: number): VolProfileBar[] {
  const map = new Map<number, number>();
  candles.forEach(c => {
    // distribute volume across candle range
    const nL = Math.round((c.h - c.l) / TICK) + 1;
    for (let li = 0; li < nL; li++) {
      const p = rt(c.l + li * TICK);
      const distH = Math.abs(p - c.h) / Math.max(TICK, c.h - c.l);
      const distL = Math.abs(p - c.l) / Math.max(TICK, c.h - c.l);
      const w = 1 - Math.min(distH, distL) * 0.4;
      map.set(p, (map.get(p) ?? 0) + c.vol * w / nL);
    }
  });
  const out: VolProfileBar[] = [];
  for (let p = priceMin; p <= priceMax; p = rt(p + TICK)) {
    out.push({ price: p, vol: map.get(p) ?? 0 });
  }
  return out;
}

function genDOM(price: number, seed: number, n = 20): DOMRow[] {
  const rows: DOMRow[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const sz = Math.round(5 + rand(seed + 300 + i * 7) * 200);
    const wall = rand(seed + 400 + i) < 0.08;
    const ps = Math.round((rand(seed + 500 + i) - 0.5) * 50);
    rows.push({ price: rt(price + (i + 1) * TICK), bidSz: 0, askSz: wall ? sz * 8 : sz, ps });
  }
  for (let i = 0; i < n; i++) {
    const sz = Math.round(5 + rand(seed + 100 + i * 7) * 200);
    const wall = rand(seed + 200 + i) < 0.08;
    const ps = Math.round((rand(seed + 600 + i) - 0.5) * 50);
    rows.push({ price: rt(price - (i + 1) * TICK), bidSz: wall ? sz * 8 : sz, askSz: 0, ps });
  }
  return rows.sort((a, b) => b.price - a.price);
}

// ── Component ─────────────────────────────────────────────────────────────────
// `live` is the real per-bar OHLC + buy/sell volume from /v1/market/footprint.
// Each bar is converted into the chart's internal OFCandle shape; large-trade
// circles + per-row DOM panel are still mock since L2 depth (mbp-10) is not
// authorized on this Databento plan.
export default function OrderflowChart({
  seed = 1,
  basePrice = 5710,
  live,
}: {
  seed?: number;
  basePrice?: number;
  live?: ApiFPBar[];
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);

  // Live FP bars → OFCandle. Falls back to seed-based mock when no live
  // data has arrived yet (or when symbol isn't on the backend).
  const candles = useMemo<OFCandle[]>(() => {
    if (!live || live.length === 0) return genOFCandles(120, basePrice, seed);
    return live.map((b, i) => {
      let buyVol = 0, sellVol = 0;
      for (const lv of b.levels) {
        buyVol += lv.buy_volume;
        sellVol += lv.sell_volume;
      }
      return {
        o: b.open, h: b.high, l: b.low, c: b.close,
        ts: i,
        vol: b.volume,
        delta: b.delta,
        buyVol,
        sellVol,
      };
    });
  }, [live, basePrice, seed]);

  // Pan/zoom hook sized to the actual candles array so live data with
  // fewer than 120 bars doesn't yield empty slices.
  const { containerRef, size, winStart, winEnd, isGrabbing } = useCanvasPanZoom(candles.length, Math.min(40, candles.length));
  const lastC   = candles[candles.length - 1] ?? { o: 0, h: 0, l: 0, c: 0, ts: 0, vol: 0, delta: 0, buyVol: 0, sellVol: 0 };

  const trades  = useMemo(() => genLargeTrades(candles, seed + 77), [candles, seed]);

  const dom     = useMemo(() => genDOM(lastC.c, seed + 55), [lastC.c, seed]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Clamp window to current candles length (useCanvasPanZoom may carry
    // stale indices when total flips between mock 120 and live 30 etc).
    const sClamp = Math.max(0, Math.min(winStart, candles.length - 1));
    const eClamp = Math.max(sClamp, Math.min(winEnd, candles.length - 1));
    const visCands = candles.slice(sClamp, eClamp + 1);
    if (visCands.length === 0) return;
    const nCandles = visCands.length;
    const CW = (w - 160 - 40) / nCandles;
    const tToX = (i: number) => i * CW + CW / 2;

    const pMin = Math.min(...visCands.map(c => c.l));
    const pMax = Math.max(...visCands.map(c => c.h));
    const pRange = pMax - pMin;
    const pToPy = (p: number) => chartH * (1 - (p - pMin) / pRange);

    const hLevels = genHLevels(pMin, pMax, seed + 33);
    const volProf = genVolProfile(visCands, pMin, pMax);

    // Layout. DOM_W bumped 1.5× from 160 → 240 so trader-relevant numbers
    // (price, bid/ask size) are readable instead of cramped. All column
    // offsets below (price/PS/buy/RB/RA/sell) are scaled by SC = DOM_W/160.
    const DOM_W   = 240;
    const PROF_W  = 50;
    const VOL_H   = 72;
    const SC      = DOM_W / 160; // column-offset scale factor

    const chartW = w - DOM_W - PROF_W;
    const chartH = h - VOL_H;

    // ── BG — deep crimson-dark
    ctx.fillStyle = "#0c0808";
    ctx.fillRect(0, 0, w, h);

    // ── Horizontal key levels
    hLevels.forEach(lv => {
      const y = pToPy(lv.price);
      if (y < 0 || y > chartH) return;
      if (lv.type === "major") {
        ctx.strokeStyle = "rgba(200,40,40,0.55)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
      } else if (lv.type === "minor") {
        ctx.strokeStyle = "rgba(180,180,180,0.20)";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = "rgba(140,140,140,0.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
      }
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── Candlesticks (crimson theme: wick only, very thin)
    visCands.forEach((c, i) => {
      const x  = tToX(i);
      const oY = pToPy(c.o);
      const cY = pToPy(c.c);
      const hY = pToPy(c.h);
      const lY = pToPy(c.l);
      const isUp = c.c >= c.o;

      // wick
      ctx.strokeStyle = isUp ? "rgba(220,220,220,0.7)" : "rgba(200,30,30,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY); ctx.stroke();

      // body — thin filled
      const bodyTop = Math.min(oY, cY);
      const bodyH   = Math.max(1, Math.abs(cY - oY));
      ctx.fillStyle = isUp ? "rgba(200,200,200,0.5)" : "rgba(190,20,20,0.7)";
      ctx.fillRect(x - CW * 0.25, bodyTop, CW * 0.5, bodyH);
    });

    // ── Large trade bubbles
    const visTrades = trades.filter(tr => tr.ts >= winStart && tr.ts <= winEnd);
    const maxTradeSize = visTrades.length > 0 ? Math.max(...visTrades.map(t => t.size)) : 1;
    visTrades.forEach(tr => {
      const x  = tToX(tr.ts - winStart);
      const y  = pToPy(tr.price);
      const r  = 4 + (tr.size / maxTradeSize) * 22;
      const isBuy = tr.side === "buy";

      // glow
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, isBuy ? "rgba(180,60,60,0.9)" : "rgba(160,20,20,0.95)");
      grad.addColorStop(0.6, isBuy ? "rgba(140,30,30,0.6)" : "rgba(120,10,10,0.7)");
      grad.addColorStop(1, "rgba(80,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

      // border
      ctx.strokeStyle = isBuy ? "rgba(220,80,80,0.7)" : "rgba(255,30,30,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, Math.PI * 2); ctx.stroke();

      // size label on larger bubbles
      if (r > 12) {
        ctx.fillStyle = "rgba(255,200,200,0.9)";
        ctx.font = `bold ${Math.min(10, Math.round(r * 0.55))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(tr.size.toString(), x, y + 3);
      }
    });

    // ── Volume profile (right of chart, left of DOM)
    const profX = chartW;
    ctx.fillStyle = "#080505";
    ctx.fillRect(profX, 0, PROF_W, chartH);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(profX, 0); ctx.lineTo(profX, chartH); ctx.stroke();

    const maxProfVol = Math.max(...volProf.map(b => b.vol));
    const tickH = Math.max(1, chartH / volProf.length);
    volProf.forEach(bar => {
      const y  = pToPy(bar.price);
      const bw = (bar.vol / maxProfVol) * (PROF_W - 2);
      const isHigh = bar.vol > maxProfVol * 0.6;
      ctx.fillStyle = isHigh ? "rgba(180,180,180,0.55)" : "rgba(100,100,100,0.35)";
      ctx.fillRect(profX + 1, y, bw, tickH);
    });

    // ── DOM panel (right edge)
    const domX = chartW + PROF_W;
    ctx.fillStyle = "#070505";
    ctx.fillRect(domX, 0, DOM_W, h);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(domX, 0); ctx.lineTo(domX, h); ctx.stroke();

    // DOM header row
    const domCols = [
      { label: "Price", x: domX + 38 * SC,  color: "#aaa" },
      { label: "P/S",   x: domX + 62 * SC,  color: "#aaa" },
      { label: "Buy",   x: domX + 85 * SC,  color: "#4af" },
      { label: "RB",    x: domX + 107 * SC, color: "#888" },
      { label: "RA",    x: domX + 125 * SC, color: "#888" },
      { label: "Sell",  x: domX + 148 * SC, color: "#f55" },
    ];
    ctx.font = "bold 11px sans-serif";
    domCols.forEach(col => {
      ctx.fillStyle = col.color;
      ctx.textAlign = "center";
      ctx.fillText(col.label, col.x, 12);
    });
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.moveTo(domX, 18); ctx.lineTo(domX + DOM_W, 18); ctx.stroke();

    // DOM rows now live in their own evenly-spaced column (independent of
    // chart price-axis scale) — the chart's pToPy maps many DOM rows to
    // overlapping pixels when DOM tick density > chart tick density,
    // squishing all numbers into an unreadable band. Equal slot per row
    // fixes that.
    const domAreaH  = h - 18; // header takes top 18px
    const domTickH  = Math.max(14, Math.floor(domAreaH / dom.length));
    const maxDomBid = Math.max(...dom.map(r => r.bidSz));
    const maxDomAsk = Math.max(...dom.map(r => r.askSz));

    dom.forEach((dr, idx) => {
      const rowY = 18 + idx * domTickH;
      const rh   = Math.max(1, domTickH - 1);
      const isCur = Math.abs(dr.price - lastC.c) < TICK / 2;
      const isAsk = dr.askSz > 0;

      // row bg
      if (isCur) {
        ctx.fillStyle = "rgba(255,140,0,0.22)";
        ctx.fillRect(domX, rowY, DOM_W, rh);
      } else if (isAsk) {
        ctx.fillStyle = "rgba(255,30,30,0.04)";
        ctx.fillRect(domX, rowY, DOM_W, rh);
      } else {
        ctx.fillStyle = "rgba(30,80,180,0.04)";
        ctx.fillRect(domX, rowY, DOM_W, rh);
      }

      const ty = rowY + domTickH * 0.65;
      ctx.font = `${Math.min(12, domTickH - 3)}px 'JetBrains Mono', monospace`;

      // Price
      ctx.fillStyle = isCur ? "#ffcc44" : "#aaa";
      ctx.textAlign = "right";
      ctx.fillText(dr.price.toFixed(2), domX + 56 * SC, ty);

      // P/S
      const psColor = dr.ps > 0 ? "#4af" : dr.ps < 0 ? "#f55" : "#555";
      ctx.fillStyle = psColor;
      ctx.textAlign = "center";
      ctx.fillText(dr.ps !== 0 ? dr.ps.toString() : "", domX + 62 * SC, ty);

      const BAR_MAX = 28 * SC;
      if (isAsk) {
        // Sell bar (red)
        const aw = Math.min((dr.askSz / maxDomAsk) * BAR_MAX, BAR_MAX);
        const bigWall = dr.askSz > maxDomAsk * 0.3;
        ctx.fillStyle = bigWall ? "rgba(255,40,40,0.85)" : "rgba(180,30,30,0.55)";
        ctx.fillRect(domX + 130 * SC, rowY + 1, aw, rh - 2);
        ctx.fillStyle = bigWall ? "#ffaaaa" : "#cc6666";
        ctx.textAlign = "center";
        ctx.fillText(dr.askSz.toString(), domX + 148 * SC, ty);
        // RB/RA columns (RTH metrics, simulated)
        ctx.fillStyle = "#666";
        ctx.fillText(Math.round(dr.askSz * 0.3).toString(), domX + 107 * SC, ty);
        ctx.fillText(Math.round(dr.askSz * 0.7).toString(), domX + 125 * SC, ty);
      } else {
        // Buy bar (blue)
        const bw = Math.min((dr.bidSz / maxDomBid) * BAR_MAX, BAR_MAX);
        const bigWall = dr.bidSz > maxDomBid * 0.3;
        ctx.fillStyle = bigWall ? "rgba(40,140,255,0.85)" : "rgba(30,80,180,0.55)";
        ctx.fillRect(domX + 57 * SC, rowY + 1, bw, rh - 2);
        ctx.fillStyle = bigWall ? "#aaccff" : "#6699cc";
        ctx.textAlign = "center";
        ctx.fillText(dr.bidSz.toString(), domX + 85 * SC, ty);
        ctx.fillStyle = "#666";
        ctx.fillText(Math.round(dr.bidSz * 0.3).toString(), domX + 107 * SC, ty);
        ctx.fillText(Math.round(dr.bidSz * 0.7).toString(), domX + 125 * SC, ty);
      }

      // row separator
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(domX, rowY + rh); ctx.lineTo(domX + DOM_W, rowY + rh); ctx.stroke();
    });

    // DOM current price badge — anchored to the DOM row whose price matches
    // lastC.c (independent slot grid; chart pToPy would land on a different y).
    const curIdx = dom.findIndex(r => Math.abs(r.price - lastC.c) < TICK / 2);
    const cpY = curIdx >= 0 ? 18 + curIdx * domTickH + domTickH * 0.5 : pToPy(lastC.c);
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(domX, cpY - 9, 84 * SC / 1.5, 18);
    ctx.fillStyle = "#000";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(lastC.c.toFixed(2), domX + 28 * SC, cpY + 5);

    // ── Bottom volume bars
    const volY = chartH;
    ctx.fillStyle = "#080505";
    ctx.fillRect(0, volY, chartW, VOL_H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, volY); ctx.lineTo(chartW, volY); ctx.stroke();

    const maxVol = Math.max(...visCands.map(c => c.vol));
    const showEvery = Math.max(1, Math.floor(nCandles / 20));

    visCands.forEach((c, i) => {
      const x   = tToX(i);
      const bh  = (c.vol / maxVol) * (VOL_H - 12);
      const isUp = c.c >= c.o;
      ctx.fillStyle = isUp ? "rgba(180,180,180,0.55)" : "rgba(180,20,20,0.75)";
      ctx.fillRect(x - CW * 0.4, volY + VOL_H - 8 - bh, CW * 0.8, bh);

      // delta text on prominent bars
      if (i % showEvery === 0 && Math.abs(c.delta) > 200) {
        ctx.fillStyle = c.delta > 0 ? "#6699cc" : "#cc4444";
        ctx.font = "7px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(Math.abs(c.delta).toString(), x, volY + VOL_H - 1);
      }
    });

    // "Large Trade Graphic" label
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Large Trade Graphic", 4, volY + 11);

    // RTH Vol & Delta label on DOM
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("RTH Vol & Delta", domX + 4, volY + 11);

    // ── Current price dashed line on main chart
    ctx.strokeStyle = "rgba(255,200,0,0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(0, cpY); ctx.lineTo(chartW, cpY); ctx.stroke();
    ctx.setLineDash([]);

    // Spread to current price badge in chart area
    ctx.fillStyle = "#c8a000";
    ctx.fillRect(chartW - 46, cpY - 7, 46, 14);
    ctx.fillStyle = "#000";
    ctx.font = "bold 8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(lastC.c.toFixed(2), chartW - 23, cpY + 4);

  }, [candles, trades, dom, size, lastC, seed, winStart, winEnd]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#0c0808]" style={{ cursor: isGrabbing ? "grabbing" : "grab" }}>
      <canvas ref={canvasRef} className="block" />
      {/* Custom studies legend */}
      <div className="absolute top-1 left-1 flex gap-3 pointer-events-none text-[9px] font-mono">
        <span style={{ color: "rgba(220,80,80,0.85)" }}>● Large Trade</span>
        <span style={{ color: "rgba(200,40,40,0.75)" }}>━ Major Level</span>
        <span style={{ color: "rgba(160,160,160,0.50)" }}>━ Minor Level</span>
        <span style={{ color: "rgba(120,120,120,0.40)" }}>╌ Key Zone</span>
      </div>
    </div>
  );
}
