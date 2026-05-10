"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { rand } from "@/lib/chart-data";
import type { ApiFPBar } from "@/lib/api";
import { useCanvasPanZoom } from "./useCanvasPanZoom";

const TICK = 50;
const TOTAL_BARS = 60;
const VISIBLE_BARS = 8;
const HOURS_PER_DAY = 13; // 9:00–21:00
const rt = (v: number) => Math.round(v / TICK) * TICK;

interface FPLevel {
  price: number;
  bid: number;
  ask: number;
  poc: boolean;
  imbalBid: boolean;
  imbalAsk: boolean;
}

interface FPBar {
  ts: number;
  timeLabel: string;
  o: number; h: number; l: number; c: number;
  levels: FPLevel[];
  delta: number;
  volume: number;
  finishDelta: number;
  volPerSec: number;
}

function fmtVol(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1) + "K";
  return v.toFixed(0);
}

function genBars(seed: number, base: number): FPBar[] {
  const bars: FPBar[] = [];
  let p = base;
  for (let i = 0; i < TOTAL_BARS; i++) {
    const o = rt(p);
    const trend = Math.sin(i / 9) * 0.35;
    const c = rt(o + (rand(seed + i * 3) - 0.48 + trend) * 400);
    const h = rt(Math.max(o, c) + rand(seed + i * 7) * 250);
    const l = rt(Math.min(o, c) - rand(seed + i * 11) * 250);
    const nL = Math.round((h - l) / TICK) + 1;
    const midP = (h + l) / 2;

    let pocPrice = l, pocVol = 0;
    const levels: FPLevel[] = [];

    for (let li = 0; li < nL; li++) {
      const price = rt(l + li * TICK);
      const dist = Math.abs(price - midP) / Math.max(TICK, h - l);
      const mult = Math.max(0.08, 1.2 - dist * 1.8);
      const total = Math.round((120_000 + rand(seed + i * 100 + li * 7) * 3_000_000) * mult);
      const bidFrac = 0.28 + rand(seed + i * 200 + li * 3) * 0.44;
      const bid = Math.round(total * bidFrac);
      const ask = total - bid;
      if (total > pocVol) { pocVol = total; pocPrice = price; }
      levels.push({ price, bid, ask, poc: false, imbalBid: false, imbalAsk: false });
    }

    levels.forEach(lv => {
      lv.poc = lv.price === pocPrice;
      lv.imbalBid = lv.ask > 0 && lv.bid / lv.ask >= 3;
      lv.imbalAsk = lv.bid > 0 && lv.ask / lv.bid >= 3;
    });

    const delta = levels.reduce((s, lv) => s + lv.ask - lv.bid, 0);
    const volume = levels.reduce((s, lv) => s + lv.bid + lv.ask, 0);
    const closeRow = levels.find(lv => lv.price === rt(c)) ?? levels[Math.floor(levels.length / 2)];
    const finishDelta = closeRow.ask - closeRow.bid;

    const barHour = i % HOURS_PER_DAY;
    const barDay = Math.floor(i / HOURS_PER_DAY) + 4;
    const hour = 9 + barHour;
    const timeLabel = barHour === 0
      ? `2024-6-${barDay}`
      : `${String(hour).padStart(2, "0")}:00`;

    bars.push({ ts: i, timeLabel, o, h, l, c, levels, delta, volume, finishDelta, volPerSec: Math.round(volume / 3600) });
    p = c;
  }
  return bars;
}

export default function FootprintDeltaChart({
  seed = 1,
  basePrice = 70500,
  live: _live,
}: {
  seed?: number;
  basePrice?: number;
  live?: ApiFPBar[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { containerRef, size, winStart, winEnd, isGrabbing } = useCanvasPanZoom(TOTAL_BARS, VISIBLE_BARS);

  const allBars = useMemo(() => genBars(seed, basePrice), [seed, basePrice]);

  const keyLevels = useMemo(() => {
    const hs = allBars.map(b => b.h);
    const ls = allBars.map(b => b.l);
    const split = Math.floor(TOTAL_BARS * 0.6);
    return {
      open:   allBars[0].o,
      pWHigh: Math.max(...hs.slice(0, split)),
      pWLow:  Math.min(...ls.slice(0, split)),
      pMHigh: Math.max(...hs),
      pMLow:  Math.min(...ls),
    };
  }, [allBars]);

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

    const visBars = allBars.slice(winStart, winEnd + 1);
    const nVis = visBars.length;
    if (nVis === 0) return;
    const lastBar = allBars[allBars.length - 1];

    const pMin = Math.min(...visBars.map(b => b.l));
    const pMax = Math.max(...visBars.map(b => b.h));
    const nTicks = Math.round((pMax - pMin) / TICK) + 1;

    const PROF_W   = 130;
    const AXIS_W   = 62;
    const BOT_H    = 68;
    const BOT_ROW  = BOT_H / 4;
    const TIME_H   = 16;

    const chartW = w - PROF_W - AXIS_W;
    const chartH = h - BOT_H - TIME_H;
    if (chartW <= 0 || chartH <= 0) return;

    const BAR_W  = chartW / nVis;
    const ROW_H  = chartH / nTicks;
    const DLTA_W = BAR_W * 0.18;
    const CENT_W = BAR_W * 0.52;
    const RVOL_W = BAR_W * 0.30;

    const pToPy      = (p: number) => chartH - ((p - pMin) / (pMax - pMin)) * chartH;
    const priceToRow = (p: number) => Math.round((p - pMin) / TICK);
    const rowToY     = (row: number) => chartH - (row + 1) * ROW_H;

    // ── Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // ── Subtle grid
    const gridStep = Math.max(TICK, Math.round((pMax - pMin) / 10 / TICK) * TICK);
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let p = Math.ceil(pMin / gridStep) * gridStep; p <= pMax; p += gridStep) {
      const y = pToPy(p);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }

    // ── Key levels
    const drawKL = (price: number, color: string, dash: number[], label: string) => {
      if (price < pMin - TICK || price > pMax + TICK) return;
      const y = pToPy(price);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
      ctx.setLineDash([]);
      if (label) {
        ctx.fillStyle = color;
        ctx.font = "7px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(label, chartW - 4, y - 1);
      }
    };
    drawKL(keyLevels.open,   "rgba(180,180,0,0.50)",   [5, 4], `Open ${keyLevels.open}`);
    drawKL(keyLevels.pWHigh, "rgba(230,140,0,0.65)",   [4, 3], `pWHigh ${keyLevels.pWHigh}`);
    drawKL(keyLevels.pWLow,  "rgba(230,140,0,0.65)",   [4, 3], `pWLow ${keyLevels.pWLow}`);
    drawKL(keyLevels.pMHigh, "rgba(160,50,200,0.55)",  [3, 3], `pMHigh ${keyLevels.pMHigh}`);
    drawKL(keyLevels.pMLow,  "rgba(160,50,200,0.55)",  [3, 3], `pMLow ${keyLevels.pMLow}`);

    // ── Draw each bar
    visBars.forEach((bar, bi) => {
      const barX = bi * BAR_W;
      const isUp = bar.c >= bar.o;
      const barMaxVol = Math.max(...bar.levels.map(lv => lv.bid + lv.ask), 1);

      // Bar separator
      if (bi > 0) {
        ctx.strokeStyle = bar.timeLabel.includes("-") ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)";
        ctx.lineWidth = bar.timeLabel.includes("-") ? 1.5 : 1;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(barX, 0); ctx.lineTo(barX, chartH); ctx.stroke();
      }

      // Candlestick
      const oY = pToPy(bar.o);
      const cY = pToPy(bar.c);
      const hY = pToPy(bar.h);
      const lY = pToPy(bar.l);
      const bodyTop = Math.min(oY, cY);
      const bodyH = Math.max(1.5, Math.abs(cY - oY));
      const cx = barX + DLTA_W + CENT_W / 2;

      ctx.strokeStyle = isUp ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)";
      ctx.lineWidth = 1.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx, hY); ctx.lineTo(cx, lY); ctx.stroke();
      ctx.fillStyle = isUp ? "rgba(38,166,154,0.62)" : "rgba(239,83,80,0.62)";
      ctx.fillRect(barX + DLTA_W, bodyTop, CENT_W, bodyH);

      // Price levels
      bar.levels.forEach(lv => {
        const row = priceToRow(lv.price);
        const y = rowToY(row);
        if (y < -ROW_H || y > chartH + ROW_H) return;
        const rh = Math.max(1, ROW_H - 0.5);

        if (lv.poc) {
          ctx.fillStyle = "rgba(255,220,0,0.11)";
          ctx.fillRect(barX, y, BAR_W, rh);
        }
        if (lv.imbalBid) {
          ctx.fillStyle = "rgba(30,100,200,0.26)";
          ctx.fillRect(barX + DLTA_W, y, CENT_W, rh);
          ctx.strokeStyle = "rgba(30,120,255,0.50)";
          ctx.lineWidth = 1; ctx.setLineDash([]);
          ctx.strokeRect(barX + DLTA_W, y, CENT_W, rh);
        }
        if (lv.imbalAsk) {
          ctx.fillStyle = "rgba(200,30,30,0.26)";
          ctx.fillRect(barX + DLTA_W, y, CENT_W, rh);
          ctx.strokeStyle = "rgba(255,30,30,0.50)";
          ctx.lineWidth = 1; ctx.setLineDash([]);
          ctx.strokeRect(barX + DLTA_W, y, CENT_W, rh);
        }

        if (ROW_H < 7) return;
        const fs = Math.min(9, Math.max(6, Math.floor(ROW_H - 1.5)));
        ctx.font = `${fs}px 'JetBrains Mono', monospace`;
        const ty = y + rh * 0.73;

        // Left: level delta
        const lvDelta = lv.ask - lv.bid;
        ctx.fillStyle = lvDelta >= 0 ? "#26d4c8" : "#ef5350";
        ctx.textAlign = "right";
        ctx.fillText(fmtVol(lvDelta), barX + DLTA_W - 1, ty);

        // Center: bid ask pair
        ctx.fillStyle = "rgba(200,200,200,0.65)";
        ctx.textAlign = "left";
        ctx.fillText(`${fmtVol(lv.bid)} ${fmtVol(lv.ask)}`, barX + DLTA_W + 2, ty);

        // Right: volume bar + label
        const vbW = Math.max(1, (lv.bid + lv.ask) / barMaxVol * RVOL_W * 0.75);
        ctx.fillStyle = isUp ? "rgba(38,166,154,0.18)" : "rgba(239,83,80,0.18)";
        ctx.fillRect(barX + DLTA_W + CENT_W, y + 1, vbW, rh - 2);
        ctx.fillStyle = "rgba(150,150,150,0.60)";
        ctx.fillText(fmtVol(lv.bid + lv.ask), barX + DLTA_W + CENT_W + 2, ty);

        // Level divider
        ctx.strokeStyle = "rgba(255,255,255,0.033)";
        ctx.lineWidth = 0.5; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(barX, y + rh); ctx.lineTo(barX + BAR_W, y + rh); ctx.stroke();
      });

      // Large-delta bubble
      if (Math.abs(bar.delta) > 800_000) {
        const bubY = isUp ? lY + 16 : hY - 16;
        if (bubY > 4 && bubY < chartH - 4) {
          const r = 14;
          const grad = ctx.createRadialGradient(cx, bubY, 0, cx, bubY, r);
          const pos = bar.delta > 0;
          grad.addColorStop(0, pos ? "rgba(30,140,255,0.75)" : "rgba(255,50,50,0.75)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, bubY, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    });

    // ── Bottom metrics strip
    const botY = chartH;
    ctx.fillStyle = "#060606";
    ctx.fillRect(0, botY, w, BOT_H + TIME_H);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, botY); ctx.lineTo(w, botY); ctx.stroke();

    const rowLabels = ["Finish", "Delta", "Volume", "Volume / Sec"];
    ctx.font = "7px 'JetBrains Mono', monospace";
    rowLabels.forEach((lbl, ri) => {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.textAlign = "right";
      ctx.fillText(lbl, w - AXIS_W - 2, botY + ri * BOT_ROW + BOT_ROW * 0.68);
    });

    visBars.forEach((bar, bi) => {
      const bx = bi * BAR_W;
      const bw = BAR_W - 1;
      const mx = bx + BAR_W / 2;
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";

      const finPos = bar.finishDelta >= 0;
      ctx.fillStyle = finPos ? "rgba(38,166,154,0.22)" : "rgba(239,83,80,0.22)";
      ctx.fillRect(bx + 0.5, botY + 0.5, bw, BOT_ROW - 1);
      ctx.fillStyle = finPos ? "#26a69a" : "#ef5350";
      ctx.fillText(fmtVol(bar.finishDelta), mx, botY + BOT_ROW * 0.68);

      const dPos = bar.delta >= 0;
      ctx.fillStyle = dPos ? "rgba(30,100,220,0.28)" : "rgba(200,30,30,0.28)";
      ctx.fillRect(bx + 0.5, botY + BOT_ROW + 0.5, bw, BOT_ROW - 1);
      ctx.fillStyle = dPos ? "#5599ee" : "#ee4444";
      ctx.fillText(fmtVol(bar.delta), mx, botY + BOT_ROW * 1.68);

      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(bx + 0.5, botY + BOT_ROW * 2 + 0.5, bw, BOT_ROW - 1);
      ctx.fillStyle = "rgba(200,200,200,0.70)";
      ctx.fillText(fmtVol(bar.volume), mx, botY + BOT_ROW * 2.68);

      ctx.fillStyle = "rgba(255,255,255,0.015)";
      ctx.fillRect(bx + 0.5, botY + BOT_ROW * 3 + 0.5, bw, BOT_ROW - 1);
      ctx.fillStyle = "rgba(160,160,160,0.60)";
      ctx.fillText(fmtVol(bar.volPerSec), mx, botY + BOT_ROW * 3.68);
    });

    // Time axis
    const timeY = botY + BOT_H;
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, timeY); ctx.lineTo(chartW, timeY); ctx.stroke();
    visBars.forEach((bar, bi) => {
      const isDay = bar.timeLabel.includes("-");
      ctx.fillStyle = isDay ? "#888" : "#555";
      ctx.font = isDay ? "bold 8px 'JetBrains Mono', monospace" : "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(bar.timeLabel, bi * BAR_W + BAR_W / 2, timeY + TIME_H * 0.72);
    });

    // ── Right volume profile
    const profX = chartW;
    ctx.fillStyle = "#060808";
    ctx.fillRect(profX, 0, PROF_W, chartH);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(profX, 0); ctx.lineTo(profX, chartH); ctx.stroke();

    const profMap = new Map<number, { buy: number; sell: number }>();
    visBars.forEach(bar => {
      bar.levels.forEach(lv => {
        const e = profMap.get(lv.price) ?? { buy: 0, sell: 0 };
        e.buy += lv.ask; e.sell += lv.bid;
        profMap.set(lv.price, e);
      });
    });

    const maxPV = Math.max(...[...profMap.values()].map(e => e.buy + e.sell), 1);
    const PROF_BAR_MAX = PROF_W * 0.52;

    profMap.forEach((e, price) => {
      const row = priceToRow(price);
      const y = rowToY(row);
      if (y < 0 || y > chartH) return;
      const rh = Math.max(1, ROW_H - 0.5);
      const total = e.buy + e.sell;
      const bw = (total / maxPV) * PROF_BAR_MAX;
      const buyW = (e.buy / total) * bw;

      ctx.fillStyle = "rgba(30,100,180,0.45)";
      ctx.fillRect(profX + 2, y + 1, buyW, rh - 2);
      ctx.fillStyle = "rgba(140,140,140,0.28)";
      ctx.fillRect(profX + 2 + buyW, y + 1, bw - buyW, rh - 2);

      if (ROW_H >= 7) {
        const dv = e.buy - e.sell;
        ctx.fillStyle = dv >= 0 ? "#26d4c8" : "#ef5350";
        ctx.font = `${Math.min(8, ROW_H - 1)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "right";
        ctx.fillText(fmtVol(dv), profX + PROF_W - 4, y + rh * 0.73);
      }
    });

    // ── Right price axis
    const axisX = profX + PROF_W;
    ctx.fillStyle = "#070707";
    ctx.fillRect(axisX, 0, AXIS_W, h);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(axisX, 0); ctx.lineTo(axisX, chartH); ctx.stroke();

    const pAxisStep = Math.max(TICK, Math.round((pMax - pMin) / 8 / TICK) * TICK);
    for (let p = Math.ceil(pMin / pAxisStep) * pAxisStep; p <= pMax; p += pAxisStep) {
      const y = pToPy(p);
      if (y < 4 || y > chartH - 4) continue;
      ctx.fillStyle = "#555";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(p.toFixed(0), axisX + 4, y + 3);
    }

    // Current price badge
    const cpY = pToPy(lastBar.c);
    if (cpY >= 0 && cpY <= chartH) {
      ctx.strokeStyle = "rgba(255,200,0,0.30)";
      ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(0, cpY); ctx.lineTo(chartW, cpY); ctx.stroke();
      ctx.setLineDash([]);

      const cpColor = lastBar.c >= lastBar.o ? "#26a69a" : "#ef5350";
      ctx.fillStyle = cpColor;
      ctx.fillRect(axisX, cpY - 8, AXIS_W - 1, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(lastBar.c.toFixed(0), axisX + AXIS_W / 2, cpY + 3.5);
    }

    // Top-right summary
    const tvd = visBars.reduce((s, b) => s + b.delta, 0);
    const tvv = visBars.reduce((s, b) => s + b.volume, 0);
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Daily  Vol & Visible Delta", w - 2, 10);
    ctx.fillStyle = tvd >= 0 ? "#26d4c8" : "#ef5350";
    ctx.fillText(fmtVol(tvd), w - 2, 22);
    ctx.fillStyle = "rgba(180,180,180,0.50)";
    ctx.fillText(fmtVol(tvv), w - 2, 34);

  }, [allBars, keyLevels, size, winStart, winEnd]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0a0a0a]"
      style={{ cursor: isGrabbing ? "grabbing" : "crosshair" }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
