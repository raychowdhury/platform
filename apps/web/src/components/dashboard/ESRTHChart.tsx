"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { rand } from "@/lib/chart-data";
import type { ApiFPBar } from "@/lib/api";
import { useCanvasPanZoom } from "./useCanvasPanZoom";

// ES RTH Footprint with Volume Profile and DOM
// Cells: bid (sell-initiated) | ask (buy-initiated)
// Green = ask dominant, Red/pink = bid dominant
// DOM: Price | P/S | Buy | RB | RA | Sell | P/S

const TICK = 0.25;
const IMBAL = 3;
const rt = (v: number) => Math.round(v / TICK) * TICK;

interface ESLevel {
  price: number;
  bid: number;    // sell-initiated volume
  ask: number;    // buy-initiated volume
  delta: number;  // ask - bid
  poc: boolean;
  imbal: "buy" | "sell" | "none";
}

interface ESBar {
  o: number; h: number; l: number; c: number;
  ts: number; time: string;
  levels: ESLevel[];
  delta: number;
  volume: number;
  vps: number;
}

interface DOMRow {
  price: number;
  bidSz: number;  // resting buy orders (displayed under "Buy")
  askSz: number;  // resting sell orders (displayed under "Sell")
  rb: number;     // recent buys executed
  ra: number;     // recent asks executed
  ps: number;     // position/size running delta
}

interface VPBar { price: number; buyVol: number; sellVol: number }

// ── Generators ────────────────────────────────────────────────────────────────

function genBar(idx: number, open: number, seed: number): ESBar {
  const o = rt(open);
  const move = (rand(seed + idx * 3) - 0.48) * 4;
  const c = rt(o + move);
  const h = rt(Math.max(o, c) + rand(seed + idx * 7) * 2);
  const l = rt(Math.min(o, c) - rand(seed + idx * 11) * 2);
  const nL = Math.round((h - l) / TICK) + 1;
  const levels: ESLevel[] = [];
  let pocIdx = 0, pocVol = 0;

  for (let li = 0; li < nL; li++) {
    const lp = rt(l + li * TICK);
    const distO = Math.abs(lp - o) / Math.max(TICK, h - l);
    const distC = Math.abs(lp - c) / Math.max(TICK, h - l);
    const m = 1 + (1 - Math.min(distO, distC)) * 5;
    const ask = Math.round((10 + rand(seed + idx * 1000 + li * 3) * 700) * m);
    const bid = Math.round((10 + rand(seed + idx * 1000 + li * 7) * 700) * m);
    const vol = ask + bid;
    if (vol > pocVol) { pocVol = vol; pocIdx = li; }
    const imbal: ESLevel["imbal"] = ask > bid * IMBAL ? "buy" : bid > ask * IMBAL ? "sell" : "none";
    levels.push({ price: lp, bid, ask, delta: ask - bid, poc: false, imbal });
  }
  if (levels[pocIdx]) levels[pocIdx].poc = true;

  const volume = levels.reduce((s, lv) => s + lv.bid + lv.ask, 0);
  const delta  = levels.reduce((s, lv) => s + lv.delta, 0);
  const hh = (10 + Math.floor(idx / 12)).toString().padStart(2, "0");
  const mm = ((idx % 12) * 5).toString().padStart(2, "0");
  return { o, h, l, c, ts: idx, time: `${hh}:${mm}`, levels, delta, volume, vps: +(volume / (60 + rand(seed + idx) * 240)).toFixed(1) };
}

function genBars(n = 18, base = 4187, seed = 1): ESBar[] {
  const out: ESBar[] = [];
  let p = base;
  for (let i = 0; i < n; i++) {
    const bar = genBar(i, p, seed);
    out.push(bar);
    p = bar.c;
  }
  return out;
}

function genDOM(price: number, seed: number, n = 28): DOMRow[] {
  const rows: DOMRow[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const sz  = Math.round(10 + rand(seed + 300 + i * 7) * 400);
    const wall = rand(seed + 400 + i) < 0.06;
    const rb  = Math.round(rand(seed + 700 + i) * 120);
    const ra  = Math.round(rand(seed + 800 + i) * 80);
    const ps  = Math.round((rand(seed + 900 + i) - 0.5) * 500);
    rows.push({ price: rt(price + (i + 1) * TICK), bidSz: 0, askSz: wall ? sz * 8 : sz, rb, ra, ps });
  }
  for (let i = 0; i < n; i++) {
    const sz  = Math.round(10 + rand(seed + 100 + i * 7) * 400);
    const wall = rand(seed + 200 + i) < 0.06;
    const rb  = Math.round(rand(seed + 500 + i) * 80);
    const ra  = Math.round(rand(seed + 600 + i) * 120);
    const ps  = Math.round((rand(seed + 110 + i) - 0.5) * 500);
    rows.push({ price: rt(price - (i + 1) * TICK), bidSz: wall ? sz * 8 : sz, askSz: 0, rb, ra, ps });
  }
  return rows.sort((a, b) => b.price - a.price);
}

function genVolumeProfile(bars: ESBar[], pMin: number, pMax: number): VPBar[] {
  const map = new Map<number, { buy: number; sell: number }>();
  bars.forEach(b => {
    b.levels.forEach(lv => {
      const e = map.get(lv.price) ?? { buy: 0, sell: 0 };
      e.buy  += lv.ask;
      e.sell += lv.bid;
      map.set(lv.price, e);
    });
  });
  const out: VPBar[] = [];
  for (let p = pMin; p <= pMax + TICK / 2; p = rt(p + TICK)) {
    const e = map.get(p) ?? { buy: 0, sell: 0 };
    out.push({ price: p, buyVol: e.buy, sellVol: e.sell });
  }
  return out;
}

function genKeyLevels(bars: ESBar[], seed: number) {
  const prices = bars.flatMap(b => [b.h, b.l, b.o, b.c]);
  const pMin = Math.min(...prices), pMax = Math.max(...prices);
  return {
    pinkLevel:  rt(pMax - (rand(seed + 11) * 0.15) * (pMax - pMin)),
    orangeLevel: rt(pMin + (0.3 + rand(seed + 22) * 0.15) * (pMax - pMin)),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ESRTHChart({
  seed = 1,
  basePrice = 4187,
  live: _live,
}: {
  seed?: number;
  basePrice?: number;
  live?: ApiFPBar[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { containerRef, size, winStart, winEnd, isGrabbing } = useCanvasPanZoom(60, 18);

  const bars = useMemo(() => genBars(60, basePrice, seed), [seed, basePrice]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const visibleBars = bars.slice(winStart, winEnd + 1);
    const lastBar = visibleBars[visibleBars.length - 1];
    const pMin = Math.min(...visibleBars.map(b => b.l));
    const pMax = Math.max(...visibleBars.map(b => b.h));
    const volProf = genVolumeProfile(visibleBars, pMin, pMax);
    const { pinkLevel, orangeLevel } = genKeyLevels(visibleBars, seed + 99);
    const dom = genDOM(lastBar.c, seed + 55);

    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // ── Layout constants
    const DOM_W   = 200;   // far-right DOM
    const VP_W    = 48;    // volume profile to left of DOM
    const STRIP_H = 54;    // bottom delta/vol strip
    const TIME_H  = 16;
    const PAXIS_W = 52;    // left price axis

    const chartW = w - DOM_W - VP_W - PAXIS_W;
    const chartH = h - STRIP_H - TIME_H;
    const COL_W  = chartW / visibleBars.length;
    const nTicks = Math.round((pMax - pMin) / TICK) + 1;
    const ROW_H  = Math.max(11, Math.floor(chartH / nTicks));

    const pToPy = (p: number) => (nTicks - 1 - Math.round((p - pMin) / TICK)) * ROW_H;

    // ── Background
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, w, h);

    // ── Left price axis
    ctx.fillStyle = "#090909";
    ctx.fillRect(0, 0, PAXIS_W, chartH + STRIP_H);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAXIS_W, 0); ctx.lineTo(PAXIS_W, chartH); ctx.stroke();

    const pStep = Math.max(TICK, Math.round((pMax - pMin) / 14 / TICK) * TICK);
    for (let p = Math.ceil(pMin / pStep) * pStep; p <= pMax; p = rt(p + pStep)) {
      const y = pToPy(p) + ROW_H / 2;
      ctx.fillStyle = "#555";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(p.toFixed(2), PAXIS_W - 3, y + 3);
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAXIS_W, pToPy(p)); ctx.lineTo(PAXIS_W + chartW, pToPy(p)); ctx.stroke();
    }

    // ── Pink key level (large sell wall)
    const pinkY = pToPy(pinkLevel) + ROW_H / 2;
    ctx.fillStyle = "rgba(255,20,140,0.18)";
    ctx.fillRect(PAXIS_W, pinkY - ROW_H, chartW, ROW_H * 2);
    ctx.strokeStyle = "rgba(255,20,140,0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAXIS_W, pinkY); ctx.lineTo(PAXIS_W + chartW, pinkY); ctx.stroke();

    // ── Orange key level
    const orangeY = pToPy(orangeLevel) + ROW_H / 2;
    ctx.strokeStyle = "rgba(220,130,0,0.70)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAXIS_W, orangeY); ctx.lineTo(PAXIS_W + chartW, orangeY); ctx.stroke();

    // ── Footprint bars
    visibleBars.forEach((bar, bi) => {
      const colX = PAXIS_W + bi * COL_W;

      // column separator
      ctx.strokeStyle = "rgba(255,255,255,0.055)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(colX, 0); ctx.lineTo(colX, chartH); ctx.stroke();

      // alternating bg
      if (bi % 2 === 0) { ctx.fillStyle = "rgba(255,255,255,0.01)"; ctx.fillRect(colX, 0, COL_W, chartH); }

      // ── Price levels
      bar.levels.forEach(lv => {
        const rowY = pToPy(lv.price);
        const rh   = Math.max(1, ROW_H - 1);
        const buyR = lv.ask / (lv.ask + lv.bid + 1);

        // cell background
        if (lv.poc) {
          ctx.fillStyle = buyR >= 0.5 ? "rgba(0,180,80,0.32)" : "rgba(200,20,20,0.32)";
        } else if (lv.imbal === "buy") {
          ctx.fillStyle = "rgba(0,160,70,0.25)";
        } else if (lv.imbal === "sell") {
          ctx.fillStyle = "rgba(200,20,30,0.25)";
        } else if (buyR > 0.58) {
          ctx.fillStyle = "rgba(0,110,50,0.10)";
        } else if (buyR < 0.42) {
          ctx.fillStyle = "rgba(160,15,15,0.10)";
        } else {
          ctx.fillStyle = "transparent";
        }
        ctx.fillRect(colX + 1, rowY, COL_W - 2, rh);

        // imbalance highlight border
        if (lv.imbal !== "none") {
          ctx.strokeStyle = lv.imbal === "buy" ? "rgba(0,220,90,0.70)" : "rgba(255,30,50,0.70)";
          ctx.lineWidth = 1;
          ctx.strokeRect(colX + 1.5, rowY + 0.5, COL_W - 3, rh - 1);
        }

        // bid | ask numbers
        if (ROW_H >= 11) {
          const fs  = Math.min(10, Math.max(7, ROW_H - 3));
          const mid = colX + COL_W / 2;
          const ty  = rowY + ROW_H * 0.70;
          ctx.font = `${fs}px 'JetBrains Mono', monospace`;

          // bid (left) — reddish
          ctx.fillStyle = lv.imbal === "sell" ? "#ff5566" : "#993333";
          ctx.textAlign = "right";
          ctx.fillText(lv.bid.toString(), mid - 2, ty);

          // ask (right) — greenish
          ctx.fillStyle = lv.imbal === "buy" ? "#44ee88" : "#226633";
          ctx.textAlign = "left";
          ctx.fillText(lv.ask.toString(), mid + 2, ty);
        }
      });

      // ── Center candle outline
      const isUp = bar.c >= bar.o;
      const cx   = colX + COL_W / 2;
      const oY   = pToPy(bar.o) + ROW_H / 2;
      const cY   = pToPy(bar.c) + ROW_H / 2;
      const hY   = pToPy(bar.h) + ROW_H / 2;
      const lY   = pToPy(bar.l) + ROW_H / 2;
      const candleColor = isUp ? "#26a69a" : "#ef5350";
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, hY); ctx.lineTo(cx, lY); ctx.stroke();
      ctx.fillStyle = candleColor;
      ctx.fillRect(cx - 3.5, Math.min(oY, cY), 7, Math.max(2, Math.abs(cY - oY)));
    });

    // ── Volume profile (right of footprint, left of DOM)
    const vpX = PAXIS_W + chartW;
    ctx.fillStyle = "#080808";
    ctx.fillRect(vpX, 0, VP_W, chartH);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(vpX, 0); ctx.lineTo(vpX, chartH); ctx.stroke();

    const maxVP = Math.max(...volProf.map(b => b.buyVol + b.sellVol));
    const tickH = Math.max(1, chartH / volProf.length);
    volProf.forEach(bar => {
      const y     = pToPy(bar.price);
      const total = bar.buyVol + bar.sellVol;
      const bw    = (total / (maxVP || 1)) * (VP_W - 3);
      const buyW  = (bar.buyVol / (total || 1)) * bw;
      const isHigh = total > maxVP * 0.55;
      // sell (dark red, left)
      ctx.fillStyle = isHigh ? "rgba(180,30,30,0.70)" : "rgba(120,20,20,0.50)";
      ctx.fillRect(vpX + 1, y + 1, bw - buyW, tickH - 1);
      // buy (dark blue, right of sell)
      ctx.fillStyle = isHigh ? "rgba(30,120,210,0.70)" : "rgba(20,70,160,0.50)";
      ctx.fillRect(vpX + 1 + (bw - buyW), y + 1, buyW, tickH - 1);
    });

    // ── Current price dashed line
    const cpY = pToPy(lastBar.c) + ROW_H / 2;
    ctx.strokeStyle = "rgba(255,200,60,0.50)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(PAXIS_W, cpY); ctx.lineTo(PAXIS_W + chartW + VP_W, cpY); ctx.stroke();
    ctx.setLineDash([]);

    // current price badge
    ctx.fillStyle = "#b07800";
    ctx.fillRect(2, cpY - 8, PAXIS_W - 3, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(lastBar.c.toFixed(2), PAXIS_W / 2, cpY + 4);

    // ── DOM panel
    const domX = PAXIS_W + chartW + VP_W;
    ctx.fillStyle = "#070707";
    ctx.fillRect(domX, 0, DOM_W, h);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(domX, 0); ctx.lineTo(domX, h); ctx.stroke();

    // DOM column layout
    const domCols = {
      price: domX + 36,
      ps1:   domX + 52,
      buy:   domX + 84,
      rb:    domX + 116,
      ra:    domX + 136,
      sell:  domX + 168,
      ps2:   domX + 190,
    };

    // Header
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    [
      { label: "Price", x: domCols.price - 6, color: "#888" },
      { label: "P/S",   x: domCols.ps1,       color: "#666" },
      { label: "Buy",   x: domCols.buy,        color: "#4af" },
      { label: "RB",    x: domCols.rb,         color: "#555" },
      { label: "RA",    x: domCols.ra,         color: "#555" },
      { label: "Sell",  x: domCols.sell,       color: "#f55" },
      { label: "P/S",   x: domCols.ps2,        color: "#666" },
    ].forEach(col => {
      ctx.fillStyle = col.color;
      ctx.fillText(col.label, col.x, 10);
    });
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(domX, 14); ctx.lineTo(domX + DOM_W, 14); ctx.stroke();

    // "RTH Vol & Visible Delta" label
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "7px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("RTH Vol & Visible Delta", domX + DOM_W - 2, 10);

    const maxBid = Math.max(...dom.map(r => r.bidSz));
    const maxAsk = Math.max(...dom.map(r => r.askSz));
    const domRowH = Math.max(10, chartH / dom.length);

    dom.forEach(dr => {
      if (dr.price < pMin - 0.5 || dr.price > pMax + 0.5) return;
      const rowY = pToPy(dr.price);
      const rh   = Math.max(1, domRowH - 1);
      const isCur = Math.abs(dr.price - lastBar.c) < TICK / 2;
      const isAsk = dr.askSz > 0;

      // row bg
      if (isCur) {
        ctx.fillStyle = "rgba(255,160,0,0.25)";
        ctx.fillRect(domX, rowY, DOM_W, rh);
      } else if (isAsk) {
        ctx.fillStyle = "rgba(220,20,30,0.04)";
        ctx.fillRect(domX, rowY, DOM_W, rh);
      } else {
        ctx.fillStyle = "rgba(20,100,200,0.04)";
        ctx.fillRect(domX, rowY, DOM_W, rh);
      }

      const ty  = rowY + domRowH * 0.65;
      const fs  = Math.min(9, Math.max(7, domRowH - 2));
      ctx.font  = `${fs}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "right";

      // Price
      ctx.fillStyle = isCur ? "#ffcc44" : "#666";
      ctx.fillText(dr.price.toFixed(2), domCols.price, ty);

      // P/S (left)
      const ps1Color = dr.ps > 0 ? "#3399cc" : dr.ps < 0 ? "#cc3344" : "#333";
      ctx.fillStyle = ps1Color;
      ctx.textAlign = "center";
      if (dr.ps !== 0) ctx.fillText(Math.abs(dr.ps).toString(), domCols.ps1, ty);

      if (isAsk) {
        // ask bar (sell side)
        const aw = Math.min((dr.askSz / maxAsk) * 32, 32);
        const bigWall = dr.askSz > maxAsk * 0.25;
        ctx.fillStyle = bigWall ? "rgba(255,30,50,0.90)" : "rgba(160,20,30,0.55)";
        ctx.fillRect(domCols.sell - 16, rowY + 1, aw, rh - 2);
        ctx.fillStyle = bigWall ? "#ffaaaa" : "#884444";
        ctx.textAlign = "center";
        ctx.fillText(dr.askSz.toString(), domCols.sell, ty);
        ctx.fillStyle = "#444";
        ctx.fillText(dr.ra.toString(), domCols.ra, ty);
        ctx.fillText(dr.rb.toString(), domCols.rb, ty);
      } else {
        // bid bar (buy side)
        const bw = Math.min((dr.bidSz / maxBid) * 32, 32);
        const bigWall = dr.bidSz > maxBid * 0.25;
        ctx.fillStyle = bigWall ? "rgba(30,140,255,0.90)" : "rgba(20,80,180,0.55)";
        ctx.fillRect(domCols.buy + 16 - bw, rowY + 1, bw, rh - 2);
        ctx.fillStyle = bigWall ? "#aaddff" : "#336688";
        ctx.textAlign = "center";
        ctx.fillText(dr.bidSz.toString(), domCols.buy, ty);
        ctx.fillStyle = "#444";
        ctx.fillText(dr.rb.toString(), domCols.rb, ty);
        ctx.fillText(dr.ra.toString(), domCols.ra, ty);
      }

      // P/S right column (running delta metric)
      const rps = Math.round(dr.ps * 0.7);
      if (rps !== 0) {
        ctx.fillStyle = rps > 0 ? "#3399cc" : "#cc3344";
        ctx.fillText(rps.toString(), domCols.ps2, ty);
      }

      // row separator
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(domX, rowY + rh); ctx.lineTo(domX + DOM_W, rowY + rh); ctx.stroke();
    });

    // DOM current price badge
    ctx.fillStyle = lastBar.c >= lastBar.o ? "rgba(0,180,80,0.9)" : "rgba(200,30,30,0.9)";
    ctx.fillRect(domX, cpY - 8, domCols.price - 4, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(lastBar.c.toFixed(2), domX + (domCols.price - domX - 4) / 2, cpY + 4);

    // ── Bottom strip
    const sY = chartH;
    ctx.fillStyle = "#060606";
    ctx.fillRect(PAXIS_W, sY, chartW + VP_W, STRIP_H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAXIS_W, sY); ctx.lineTo(PAXIS_W + chartW + VP_W, sY); ctx.stroke();

    // Strip labels
    const stripLabels = ["Delta", "Volume", "V/Sec"];
    ctx.fillStyle = "#444";
    ctx.font = "7px sans-serif";
    ctx.textAlign = "right";
    stripLabels.forEach((lbl, ri) => ctx.fillText(lbl, PAXIS_W - 2, sY + 13 + ri * 19));

    // DOM strip label
    ctx.fillStyle = "#444";
    ctx.textAlign = "left";
    ctx.fillText("Delta",  domX + 4, sY + 13);
    ctx.fillText("Volume", domX + 4, sY + 30);

    visibleBars.forEach((bar, bi) => {
      const colX = PAXIS_W + bi * COL_W;
      const mid  = colX + COL_W / 2;
      const dPos = bar.delta >= 0;

      // delta
      ctx.fillStyle = dPos ? "rgba(0,100,220,0.85)" : "rgba(220,0,60,0.85)";
      ctx.fillRect(colX + 1, sY + 1, COL_W - 2, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText((dPos ? "" : "-") + Math.abs(Math.round(bar.delta)).toLocaleString(), mid, sY + 13);

      // volume
      ctx.fillStyle = "rgba(22,22,40,0.95)";
      ctx.fillRect(colX + 1, sY + 18, COL_W - 2, 16);
      ctx.fillStyle = "#777";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillText(bar.volume.toLocaleString(), mid, sY + 30);

      // v/sec
      ctx.fillStyle = "rgba(15,15,30,0.95)";
      ctx.fillRect(colX + 1, sY + 35, COL_W - 2, 14);
      ctx.fillStyle = "#555";
      ctx.fillText(bar.vps.toFixed(1), mid, sY + 46);
    });

    // Time labels
    visibleBars.forEach((bar, bi) => {
      const tx = PAXIS_W + bi * COL_W + COL_W / 2;
      ctx.fillStyle = "#444";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(bar.time, tx, h - 3);
    });

    // ── Legend
    ctx.textAlign = "left";
    ctx.font = "7px 'JetBrains Mono', monospace";
    const leg = [
      { color: "#226633", txt: "Bid" },
      { color: "#226633", txt: "| Ask" },
      { color: "rgba(0,160,70,0.3)", txt: "Buy dom" },
      { color: "rgba(200,20,30,0.3)", txt: "Sell dom" },
      { color: "rgba(255,20,140,0.5)", txt: "Key Sell Wall" },
      { color: "rgba(220,130,0,0.6)", txt: "Key Level" },
    ];
    leg.forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.fillRect(PAXIS_W + 4 + i * 72, 2, 8, 8);
      ctx.fillStyle = "#555";
      ctx.fillText(l.txt, PAXIS_W + 14 + i * 72, 10);
    });

  }, [bars, size, winStart, winEnd, seed]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#0d0d0d]" style={{ cursor: isGrabbing ? "grabbing" : "grab" }}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
