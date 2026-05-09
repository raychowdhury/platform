"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { rand } from "@/lib/chart-data";
import { useCanvasPanZoom } from "./useCanvasPanZoom";

const TICK = 0.25;
const IMBAL = 3;

interface FPLevel {
  price: number;
  ask: number;  // buy-initiated
  bid: number;  // sell-initiated
  poc: boolean;
  imbalBuy: boolean;
  imbalSell: boolean;
}

interface FPCandle {
  o: number; h: number; l: number; c: number; ts: number;
  levels: FPLevel[];
  delta: number;
  volume: number;
  vps: number;
}

interface DOMRow { price: number; bidSz: number; askSz: number }

function rt(v: number) { return Math.round(v / TICK) * TICK; }

function genFP(n = 14, base = 4262, seed = 1): FPCandle[] {
  const out: FPCandle[] = [];
  let p = base;
  for (let ci = 0; ci < n; ci++) {
    const o = rt(p);
    const c = rt(o + (rand(seed + ci * 3) - 0.47) * 3.5);
    const h = rt(Math.max(o, c) + rand(seed + ci * 7) * 1.75);
    const l = rt(Math.min(o, c) - rand(seed + ci * 11) * 1.75);
    const nL = Math.round((h - l) / TICK) + 1;
    const levels: FPLevel[] = [];
    let pocIdx = 0, pocVol = 0;
    for (let li = 0; li < nL; li++) {
      const lp = rt(l + li * TICK);
      const distO = Math.abs(lp - o) / Math.max(0.5, h - l);
      const distC = Math.abs(lp - c) / Math.max(0.5, h - l);
      const m = 1 + (1 - Math.min(distO, distC)) * 4;
      const ask = Math.round((25 + rand(seed + ci * 1000 + li * 3) * 500) * m);
      const bid = Math.round((25 + rand(seed + ci * 1000 + li * 7) * 500) * m);
      if (ask + bid > pocVol) { pocVol = ask + bid; pocIdx = li; }
      levels.push({ price: lp, ask, bid, poc: false, imbalBuy: ask > bid * IMBAL, imbalSell: bid > ask * IMBAL });
    }
    if (levels[pocIdx]) levels[pocIdx].poc = true;
    const volume = levels.reduce((s, l) => s + l.ask + l.bid, 0);
    const delta  = levels.reduce((s, l) => s + l.ask - l.bid, 0);
    out.push({ o, h, l, c, ts: ci, levels, delta, volume, vps: +(volume / (90 + rand(seed + ci) * 270)).toFixed(1) });
    p = c;
  }
  return out;
}

function genDOM(price: number, seed: number, n = 22): DOMRow[] {
  const rows: DOMRow[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const sz = Math.round(40 + rand(seed + 300 + i * 7) * 1400);
    rows.push({ price: rt(price + (i + 1) * TICK), bidSz: 0, askSz: rand(seed + 400 + i) < 0.1 ? sz * 5 : sz });
  }
  for (let i = 0; i < n; i++) {
    const sz = Math.round(40 + rand(seed + 100 + i * 7) * 1400);
    rows.push({ price: rt(price - (i + 1) * TICK), bidSz: rand(seed + 200 + i) < 0.1 ? sz * 5 : sz, askSz: 0 });
  }
  return rows.sort((a, b) => b.price - a.price);
}

export default function FootprintChart({ seed = 1, basePrice = 4262 }: { seed?: number; basePrice?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { containerRef, size, winStart, winEnd, isGrabbing } = useCanvasPanZoom(50, 14);

  const cands = useMemo(() => genFP(50, basePrice, seed), [seed, basePrice]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const visibleCands = cands.slice(winStart, winEnd + 1);
    const lastC = visibleCands[visibleCands.length - 1];
    const dom   = genDOM(lastC.c, seed);

    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const DOM_W   = 138;
    const STRIP_H = 54;
    const PAXIS_W = 54;
    const TIME_H  = 16;

    const chartW = w - DOM_W - PAXIS_W;
    const chartH = h - STRIP_H - TIME_H;
    const COL_W  = chartW / visibleCands.length;

    const priceMin = Math.min(...visibleCands.map(c => c.l));
    const priceMax = Math.max(...visibleCands.map(c => c.h));
    const nTicks   = Math.round((priceMax - priceMin) / TICK) + 1;
    const ROW_H    = Math.max(10, Math.floor(chartH / nTicks));

    const pToPy = (p: number) => (nTicks - 1 - Math.round((p - priceMin) / TICK)) * ROW_H;

    // ── background
    ctx.fillStyle = "#080810";
    ctx.fillRect(0, 0, w, h);

    // ── left price axis
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, PAXIS_W, h);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAXIS_W, 0); ctx.lineTo(PAXIS_W, chartH + STRIP_H); ctx.stroke();

    // price labels every 2 ticks
    for (let ti = 0; ti < nTicks; ti += 2) {
      const lp = rt(priceMin + ti * TICK);
      const y  = pToPy(lp) + ROW_H / 2;
      ctx.fillStyle = "#555";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(lp.toFixed(2), PAXIS_W - 3, y + 3);
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAXIS_W, pToPy(lp)); ctx.lineTo(PAXIS_W + chartW, pToPy(lp)); ctx.stroke();
    }

    // ── candle columns
    visibleCands.forEach((candle, ci) => {
      const colX = PAXIS_W + ci * COL_W;

      // alternating col bg
      if (ci % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.012)";
        ctx.fillRect(colX, 0, COL_W, chartH);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(colX, 0); ctx.lineTo(colX, chartH); ctx.stroke();

      // price level rows
      candle.levels.forEach(lv => {
        const rowY = pToPy(lv.price);
        const rh   = Math.max(1, ROW_H - 1);

        // cell bg
        if (lv.poc) {
          ctx.fillStyle = "rgba(255,140,0,0.22)";
        } else if (lv.imbalBuy) {
          ctx.fillStyle = "rgba(0,110,255,0.30)";
        } else if (lv.imbalSell) {
          ctx.fillStyle = "rgba(220,0,160,0.30)";
        } else {
          const r = lv.ask / (lv.ask + lv.bid + 1);
          ctx.fillStyle = r > 0.6 ? "rgba(0,80,200,0.10)" : r < 0.4 ? "rgba(200,0,120,0.10)" : "transparent";
        }
        ctx.fillRect(colX + 1, rowY, COL_W - 2, rh);

        // imbalance border
        if (lv.imbalBuy || lv.imbalSell) {
          ctx.strokeStyle = lv.imbalBuy ? "rgba(60,160,255,0.75)" : "rgba(255,40,180,0.75)";
          ctx.lineWidth = 1;
          ctx.strokeRect(colX + 1.5, rowY + 0.5, COL_W - 3, rh - 1);
        }

        // bid | ask numbers
        if (ROW_H >= 10) {
          const fs  = Math.min(10, Math.max(7, ROW_H - 3));
          const mid = colX + COL_W / 2;
          const ty  = rowY + ROW_H * 0.70;
          ctx.font = `${fs}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = lv.imbalSell ? "#ff60c8" : "#993377";
          ctx.textAlign = "right";
          ctx.fillText(lv.bid.toString(), mid - 2, ty);
          ctx.fillStyle = lv.imbalBuy ? "#60b8ff" : "#2266aa";
          ctx.textAlign = "left";
          ctx.fillText(lv.ask.toString(), mid + 2, ty);
        }
      });

      // center candle outline
      const isUp = candle.c >= candle.o;
      const color = isUp ? "#26a69a" : "#ef5350";
      const cx = colX + COL_W / 2;
      const oY = pToPy(candle.o) + ROW_H / 2;
      const cY = pToPy(candle.c) + ROW_H / 2;
      const hY = pToPy(candle.h) + ROW_H / 2;
      const lY = pToPy(candle.l) + ROW_H / 2;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, hY); ctx.lineTo(cx, lY); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 4, Math.min(oY, cY), 8, Math.max(2, Math.abs(cY - oY)));
    });

    // ── bottom strip
    const sY = chartH;
    // strip bg
    ctx.fillStyle = "#050510";
    ctx.fillRect(PAXIS_W, sY, chartW, STRIP_H);

    // strip labels
    ctx.fillStyle = "#444";
    ctx.font = "7px sans-serif";
    ctx.textAlign = "right";
    ["Delta", "Volume", "V/Sec"].forEach((lbl, ri) => {
      ctx.fillText(lbl, PAXIS_W - 2, sY + 13 + ri * 19);
    });

    visibleCands.forEach((candle, ci) => {
      const colX = PAXIS_W + ci * COL_W;
      const mid  = colX + COL_W / 2;
      const dPos = candle.delta >= 0;

      // delta
      ctx.fillStyle = dPos ? "rgba(0,100,220,0.85)" : "rgba(220,0,140,0.85)";
      ctx.fillRect(colX + 1, sY + 1, COL_W - 2, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText((dPos ? "+" : "") + Math.round(candle.delta).toLocaleString(), mid, sY + 13);

      // volume
      ctx.fillStyle = "rgba(25,25,45,0.9)";
      ctx.fillRect(colX + 1, sY + 18, COL_W - 2, 16);
      ctx.fillStyle = "#888";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillText(candle.volume.toLocaleString(), mid, sY + 30);

      // vol/sec
      ctx.fillStyle = "rgba(18,18,35,0.9)";
      ctx.fillRect(colX + 1, sY + 35, COL_W - 2, 14);
      ctx.fillStyle = "#555";
      ctx.fillText(candle.vps.toFixed(1), mid, sY + 46);
    });

    // ── time labels
    visibleCands.forEach((_, ci) => {
      const mid = PAXIS_W + ci * COL_W + COL_W / 2;
      const hh  = (10 + Math.floor(ci / 12)).toString().padStart(2, "0");
      const mm  = ((ci % 12) * 5).toString().padStart(2, "0");
      ctx.fillStyle = "#444";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${hh}:${mm}`, mid, h - 3);
    });

    // ── DOM panel
    const domX = w - DOM_W;
    ctx.fillStyle = "#050510";
    ctx.fillRect(domX, 0, DOM_W, chartH);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(domX, 0); ctx.lineTo(domX, chartH + STRIP_H); ctx.stroke();

    // DOM header
    ctx.fillStyle = "rgba(0,100,220,0.4)";
    ctx.fillRect(domX, 0, DOM_W / 2, 15);
    ctx.fillStyle = "rgba(220,0,140,0.4)";
    ctx.fillRect(domX + DOM_W / 2, 0, DOM_W / 2, 15);
    ctx.fillStyle = "#ddd";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Buy", domX + DOM_W / 4, 11);
    ctx.fillText("Sell", domX + DOM_W * 3 / 4, 11);

    const maxSz = Math.max(...dom.map(r => Math.max(r.bidSz, r.askSz)));

    dom.forEach(dr => {
      if (dr.price < priceMin - TICK || dr.price > priceMax + TICK) return;
      const rowY = pToPy(dr.price);
      const rh   = Math.max(1, ROW_H - 1);
      const isCur = Math.abs(dr.price - lastC.c) < TICK / 2;

      if (isCur) {
        ctx.fillStyle = lastC.c >= lastC.o ? "rgba(38,166,154,0.25)" : "rgba(239,83,80,0.25)";
        ctx.fillRect(domX, rowY, DOM_W, rh);
      }

      const mid = domX + DOM_W / 2;

      if (dr.bidSz > 0) {
        const bw = (dr.bidSz / maxSz) * (DOM_W / 2 - 2);
        const wall = dr.bidSz > maxSz * 0.35;
        ctx.fillStyle = wall ? "rgba(30,140,255,0.95)" : "rgba(0,80,200,0.65)";
        ctx.fillRect(mid - bw - 1, rowY + 1, bw, rh - 2);
        if (ROW_H >= 10) {
          ctx.fillStyle = wall ? "#aaddff" : "#5588bb";
          ctx.font = `${Math.min(9, ROW_H - 2)}px 'JetBrains Mono', monospace`;
          ctx.textAlign = "center";
          ctx.fillText(dr.bidSz.toLocaleString(), domX + DOM_W / 4, rowY + ROW_H * 0.72);
        }
      }
      if (dr.askSz > 0) {
        const aw = (dr.askSz / maxSz) * (DOM_W / 2 - 2);
        const wall = dr.askSz > maxSz * 0.35;
        ctx.fillStyle = wall ? "rgba(255,30,180,0.95)" : "rgba(180,0,120,0.65)";
        ctx.fillRect(mid + 1, rowY + 1, aw, rh - 2);
        if (ROW_H >= 10) {
          ctx.fillStyle = wall ? "#ffaadd" : "#bb5599";
          ctx.font = `${Math.min(9, ROW_H - 2)}px 'JetBrains Mono', monospace`;
          ctx.textAlign = "center";
          ctx.fillText(dr.askSz.toLocaleString(), domX + DOM_W * 3 / 4, rowY + ROW_H * 0.72);
        }
      }

      // DOM mid divider
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mid, rowY); ctx.lineTo(mid, rowY + rh); ctx.stroke();

      if (ROW_H >= 12) {
        ctx.fillStyle = isCur ? "#fff" : "#444";
        ctx.font = isCur ? "bold 8px 'JetBrains Mono', monospace" : "8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(dr.price.toFixed(2), mid, rowY + ROW_H * 0.72);
      }
    });

    // ── current price dashed line
    const cpY = pToPy(lastC.c) + ROW_H / 2;
    ctx.strokeStyle = lastC.c >= lastC.o ? "rgba(38,166,154,0.55)" : "rgba(239,83,80,0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(PAXIS_W, cpY); ctx.lineTo(w - DOM_W, cpY); ctx.stroke();
    ctx.setLineDash([]);

    // current price badge on axis
    ctx.fillStyle = lastC.c >= lastC.o ? "#26a69a" : "#ef5350";
    ctx.fillRect(1, cpY - 8, PAXIS_W - 2, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(lastC.c.toFixed(2), PAXIS_W / 2, cpY + 4);

  }, [cands, size, winStart, winEnd, seed]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#080810]" style={{ cursor: isGrabbing ? "grabbing" : "grab" }}>
      <canvas ref={canvasRef} className="block" />
      <div className="absolute top-1 left-1 flex gap-3 pointer-events-none text-[9px] font-mono">
        <span className="text-[#ff60c8]">■ Sell</span>
        <span className="text-[#60b8ff]">■ Buy</span>
        <span className="text-[#ffaa30]">■ POC</span>
        <span className="text-[#555]">◻ Imbalance 3:1</span>
      </div>
    </div>
  );
}
