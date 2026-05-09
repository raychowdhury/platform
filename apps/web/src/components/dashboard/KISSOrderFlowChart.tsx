"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { rand } from "@/lib/chart-data";
import { useCanvasPanZoom } from "./useCanvasPanZoom";

const TICK = 0.25;
const TOTAL_BARS = 120;
const VISIBLE_BARS = 25;
const rt = (v: number) => Math.round(v / TICK) * TICK;

interface KLevel {
  price: number;
  bid: number;
  ask: number;
  isBuy: boolean;
  isSell: boolean;
}

interface KBar {
  ts: number;
  timeLabel: string;
  o: number; h: number; l: number; c: number;
  levels: KLevel[];
  delta: number;
  volume: number;
  deltaFrac: number;
  signalUp: boolean;
  signalDown: boolean;
  trappedTraders: "top" | "bot" | null;
}

interface Zone {
  lo: number;
  hi: number;
  type: "sell" | "buy";
  label?: string;
}

function genKBars(seed: number, base: number): KBar[] {
  const bars: KBar[] = [];
  let p = base;
  for (let i = 0; i < TOTAL_BARS; i++) {
    const o = rt(p);
    const trend = Math.sin(i / 15) * 0.5 + Math.sin(i / 40) * 0.8;
    const c = rt(o + (rand(seed + i * 3) - 0.5 + trend * 0.03) * 4);
    const hl = 0.5 + rand(seed + i * 7) * 3.5;
    const h = rt(Math.max(o, c) + rand(seed + i * 11) * hl * 0.5);
    const l = rt(Math.min(o, c) - rand(seed + i * 13) * hl * 0.5);
    const nL = Math.max(1, Math.round((h - l) / TICK) + 1);
    const midP = (h + l) / 2;
    const levels: KLevel[] = [];

    for (let li = 0; li < nL; li++) {
      const price = rt(l + li * TICK);
      const dist = Math.abs(price - midP) / Math.max(TICK, h - l);
      const mult = Math.max(0.1, 1 - dist * 1.2);
      const total = Math.round((20 + rand(seed + i * 100 + li * 7) * 480) * mult);
      const bidFrac = 0.2 + rand(seed + i * 200 + li * 3) * 0.6;
      const bid = Math.round(total * bidFrac);
      const ask = total - bid;
      levels.push({ price, bid, ask, isBuy: ask > bid * 2.5, isSell: bid > ask * 2.5 });
    }

    const delta = levels.reduce((s, lv) => s + lv.ask - lv.bid, 0);
    const volume = levels.reduce((s, lv) => s + lv.bid + lv.ask, 0);
    const deltaFrac = volume > 0 ? delta / volume : 0;

    const topLvls = levels.slice(-Math.ceil(levels.length * 0.3));
    const botLvls = levels.slice(0, Math.ceil(levels.length * 0.3));
    const topSellDom = topLvls.filter(lv => lv.isSell).length >= topLvls.length * 0.4;
    const botBuyDom  = botLvls.filter(lv => lv.isBuy).length  >= botLvls.length * 0.4;

    const signalDown = topSellDom && rand(seed + i * 300) > 0.55;
    const signalUp   = botBuyDom  && rand(seed + i * 400) > 0.55;
    const roll = rand(seed + i * 500);
    const trappedTraders: "top" | "bot" | null =
      signalDown && roll > 0.65 ? "top" :
      signalUp   && roll > 0.65 ? "bot" : null;

    const totalMin = 11 * 60 + 18 + i;
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    const timeLabel = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

    bars.push({ ts: i, timeLabel, o, h, l, c, levels, delta, volume, deltaFrac, signalDown, signalUp, trappedTraders });
    p = c;
  }
  return bars;
}

function genZones(bars: KBar[]): Zone[] {
  if (bars.length === 0) return [];
  const sortedH = [...bars.map(b => b.h)].sort((a, b) => b - a);
  const sortedL = [...bars.map(b => b.l)].sort((a, b) => a - b);
  const n = bars.length;
  const r1 = sortedH[Math.floor(n * 0.08)];
  const r2 = sortedH[Math.floor(n * 0.30)];
  const s1 = sortedL[Math.floor(n * 0.08)];
  const s2 = sortedL[Math.floor(n * 0.30)];
  const zones: Zone[] = [
    { lo: r1 - 0.5, hi: r1 + 1.25, type: "sell" },
    { lo: s1 - 1.0, hi: s1 + 0.5,  type: "buy" },
  ];
  if (Math.abs(r2 - r1) > 3) zones.push({ lo: r2 - 0.5, hi: r2 + 1.0, type: "sell", label: "SELL" });
  if (Math.abs(s2 - s1) > 3) zones.push({ lo: s2 - 0.75, hi: s2 + 0.5, type: "buy" });
  return zones;
}

export default function KISSOrderFlowChart({ seed = 1, basePrice = 6020 }: { seed?: number; basePrice?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { containerRef, size, winStart, winEnd, isGrabbing } = useCanvasPanZoom(TOTAL_BARS, VISIBLE_BARS);

  const allBars  = useMemo(() => genKBars(seed, basePrice), [seed, basePrice]);
  const allZones = useMemo(() => genZones(allBars), [allBars]);

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
    const nVis    = visBars.length;
    if (nVis === 0) return;
    const lastBar = allBars[allBars.length - 1];

    const pMin = Math.min(...visBars.map(b => b.l)) - 0.5;
    const pMax = Math.max(...visBars.map(b => b.h)) + 0.5;

    const AXIS_W = 52;
    const BOT_H  = 28;
    const TIME_H = 16;
    const SIG_H  = 20;

    const chartW = w - AXIS_W;
    const chartH = h - BOT_H - TIME_H - SIG_H;
    if (chartW <= 0 || chartH <= 0) return;

    const BAR_W  = chartW / nVis;
    const nTicks = Math.round((pMax - pMin) / TICK) + 1;
    const ROW_H  = chartH / nTicks;

    const pToPy      = (p: number) => SIG_H + chartH - ((p - pMin) / (pMax - pMin)) * chartH;
    const priceToRow = (p: number) => Math.round((p - pMin) / TICK);
    const rowToY     = (row: number) => SIG_H + chartH - (row + 1) * ROW_H;

    // ── Background
    ctx.fillStyle = "#0d0d10";
    ctx.fillRect(0, 0, w, h);

    // ── Grid
    const gStep = Math.max(0.5, Math.round((pMax - pMin) / 8 / 0.5) * 0.5);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    for (let p = Math.ceil(pMin / gStep) * gStep; p <= pMax; p += gStep) {
      const y = pToPy(p);
      if (y < SIG_H || y > SIG_H + chartH) continue;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }

    // ── Zone bands
    allZones.forEach(z => {
      const y1 = pToPy(z.hi);
      const y2 = pToPy(z.lo);
      if (y2 < SIG_H || y1 > SIG_H + chartH) return;
      const bh = Math.abs(y2 - y1);
      ctx.fillStyle = z.type === "sell" ? "rgba(255,80,100,0.09)" : "rgba(80,200,100,0.09)";
      ctx.fillRect(0, y1, chartW, bh);
      ctx.strokeStyle = z.type === "sell" ? "rgba(255,80,100,0.28)" : "rgba(80,200,100,0.28)";
      ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(chartW, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(chartW, y2); ctx.stroke();
      ctx.setLineDash([]);
      if (z.label) {
        ctx.fillStyle = "rgba(255,120,140,0.65)";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(z.label, 6, y1 + bh * 0.6);
      }
    });

    // ── Max vol across all visible levels (for bar width scaling)
    const maxVolAll = Math.max(
      ...visBars.flatMap(b => b.levels.map(lv => lv.bid + lv.ask)), 1
    );

    visBars.forEach((bar, bi) => {
      const barX   = bi * BAR_W;
      const cx     = barX + BAR_W / 2;
      const isUp   = bar.c >= bar.o;

      // Column background
      ctx.fillStyle = isUp ? "rgba(38,166,154,0.025)" : "rgba(239,83,80,0.025)";
      ctx.fillRect(barX, SIG_H, BAR_W, chartH);

      // Separator
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(barX, SIG_H); ctx.lineTo(barX, SIG_H + chartH); ctx.stroke();

      // Wick
      const hY = pToPy(bar.h);
      const lY = pToPy(bar.l);
      ctx.strokeStyle = "rgba(180,180,185,0.38)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, hY); ctx.lineTo(cx, lY); ctx.stroke();

      // Volume level bars
      bar.levels.forEach(lv => {
        const row = priceToRow(lv.price);
        const y   = rowToY(row);
        if (y < SIG_H - ROW_H || y > SIG_H + chartH) return;
        const rh  = Math.max(1, ROW_H - 0.3);
        const total = lv.bid + lv.ask;
        const bw = Math.min((total / maxVolAll) * BAR_W * 3.8, BAR_W - 1);

        ctx.fillStyle = lv.isBuy
          ? "rgba(30,130,220,0.70)"
          : lv.isSell
            ? "rgba(220,50,140,0.70)"
            : "rgba(155,155,160,0.38)";
        ctx.fillRect(barX + (BAR_W - bw) / 2, y + 0.5, bw, rh - 1);
      });

      // Candlestick body (thin center overlay)
      const oY = pToPy(bar.o);
      const cY = pToPy(bar.c);
      const bodyTop = Math.min(oY, cY);
      const bodyH   = Math.max(1, Math.abs(cY - oY));
      ctx.fillStyle = isUp ? "#26a69a" : "#ef5350";
      ctx.fillRect(cx - 2, bodyTop, 4, bodyH);

      // ── Signals
      if (bar.signalDown) {
        const ty = hY - 14;
        ctx.fillStyle = "#ff69b4";
        ctx.beginPath();
        ctx.moveTo(cx - 5, ty); ctx.lineTo(cx + 5, ty); ctx.lineTo(cx, ty + 9);
        ctx.closePath(); ctx.fill();
      }
      if (bar.signalUp) {
        const ty = lY + 5;
        ctx.fillStyle = "#4caf50";
        ctx.beginPath();
        ctx.moveTo(cx - 5, ty + 9); ctx.lineTo(cx + 5, ty + 9); ctx.lineTo(cx, ty);
        ctx.closePath(); ctx.fill();
      }

      // Trapped Traders label
      if (bar.trappedTraders && BAR_W > 20) {
        const ttY = bar.trappedTraders === "top" ? hY - 28 : lY + 14;
        ctx.fillStyle = "rgba(255,160,180,0.75)";
        ctx.font = "6px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Trapped", cx, ttY);
        ctx.fillText("Traders", cx, ttY + 7);
      }
    });

    // ── Bottom delta strip
    const botY = SIG_H + chartH;
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, botY, chartW, BOT_H);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, botY); ctx.lineTo(chartW, botY); ctx.stroke();

    visBars.forEach((bar, bi) => {
      const bx  = bi * BAR_W;
      const pct = Math.round(bar.deltaFrac * 100);
      const isPos = pct > 0;
      const isSig = Math.abs(pct) > 10;
      const cellH = isSig ? BOT_H - 2 : BOT_H * 0.58;
      const cellY = botY + (BOT_H - cellH) - 1;

      ctx.fillStyle = isPos
        ? (isSig ? "rgba(30,110,220,0.85)" : "rgba(30,110,220,0.55)")
        : (isSig ? "rgba(220,50,140,0.85)" : "rgba(220,50,140,0.55)");
      ctx.fillRect(bx + 0.5, cellY, BAR_W - 1, cellH - 1);

      if (BAR_W > 10) {
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.font = "7px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${pct}%`, bx + BAR_W / 2, cellY + cellH * 0.7);
      }
    });

    // Time axis
    const timeY = botY + BOT_H;
    ctx.fillStyle = "#060606";
    ctx.fillRect(0, timeY, chartW, TIME_H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, timeY); ctx.lineTo(chartW, timeY); ctx.stroke();

    const lblStep = Math.max(1, Math.floor(nVis / 10));
    visBars.forEach((bar, bi) => {
      if (bi % lblStep !== 0) return;
      ctx.fillStyle = "#555";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(bar.timeLabel, bi * BAR_W + BAR_W / 2, timeY + TIME_H * 0.72);
    });

    // ── Right price axis
    const axisX = chartW;
    ctx.fillStyle = "#070707";
    ctx.fillRect(axisX, 0, AXIS_W, h);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(axisX, 0); ctx.lineTo(axisX, SIG_H + chartH); ctx.stroke();

    const pAxisStep = Math.max(TICK, Math.round((pMax - pMin) / 10 / 0.25) * 0.25);
    for (let p = Math.ceil(pMin / pAxisStep) * pAxisStep; p <= pMax; p += pAxisStep) {
      const y = pToPy(p);
      if (y < SIG_H + 4 || y > SIG_H + chartH - 4) continue;
      ctx.fillStyle = "#555";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(p.toFixed(2), axisX + 4, y + 3);
    }

    // Current price badge
    const cpY = pToPy(lastBar.c);
    if (cpY >= SIG_H && cpY <= SIG_H + chartH) {
      ctx.strokeStyle = "rgba(255,200,0,0.25)";
      ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(0, cpY); ctx.lineTo(chartW, cpY); ctx.stroke();
      ctx.setLineDash([]);
      const cpUp = lastBar.c >= lastBar.o;
      ctx.fillStyle = cpUp ? "#26a69a" : "#ef5350";
      ctx.fillRect(axisX, cpY - 8, AXIS_W - 1, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(lastBar.c.toFixed(2), axisX + AXIS_W / 2, cpY + 3.5);
    }

    // Title
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("KISS Order Flow", 6, 12);

  }, [allBars, allZones, size, winStart, winEnd]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0d0d10]"
      style={{ cursor: isGrabbing ? "grabbing" : "crosshair" }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
