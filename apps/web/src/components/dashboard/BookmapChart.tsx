"use client";
import { useEffect, useRef, useCallback } from "react";
import { rand } from "@/lib/chart-data";
import { useCanvasPanZoom } from "./useCanvasPanZoom";

// ── color gradient matching Bookmap: dark → blue → cyan → yellow → orange → red
function heatRgb(intensity: number): [number, number, number] {
  if (intensity <= 0) return [8, 8, 16];
  const stops: [number, [number, number, number]][] = [
    [0.00, [8,   8,  16]],
    [0.05, [0,  20,  80]],
    [0.20, [0,  60, 160]],
    [0.40, [0, 160, 200]],
    [0.60, [20, 200, 80]],
    [0.75, [220, 200, 0]],
    [0.88, [230, 100, 0]],
    [1.00, [220,  20, 20]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (intensity >= t0 && intensity <= t1) {
      const t = (intensity - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + t * (c1[0] - c0[0])),
        Math.round(c0[1] + t * (c1[1] - c0[1])),
        Math.round(c0[2] + t * (c1[2] - c0[2])),
      ];
    }
  }
  return [220, 20, 20];
}

function heatStyle(intensity: number, alpha = 1) {
  const [r, g, b] = heatRgb(intensity);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── SMA helper
function sma(vals: (number | null)[], n: number): (number | null)[] {
  return vals.map((_, i) => {
    if (i < n - 1) return null;
    let sum = 0;
    for (let k = 0; k < n; k++) { const v = vals[i - k]; if (v == null) return null; sum += v; }
    return sum / n;
  });
}

// ── Generate heatmap data
// Returns a Float32Array[nTime * nTicks] of intensities
function genHeatmap(candles: any[], tickSize: number, priceMin: number, nTicks: number, seed: number) {
  const nTime = candles.length;
  const heat = new Float32Array(nTime * nTicks);

  // Random "walls" — persistent large limit order clusters
  const walls: { p: number; tS: number; tE: number; sz: number; width: number }[] = [];
  for (let w = 0; w < 14; w++) {
    const pi = Math.floor(rand(seed + w * 31) * nTicks);
    const tS = Math.floor(rand(seed + w * 17) * nTime);
    const dur = 8 + Math.floor(rand(seed + w * 23) * 28);
    walls.push({ p: pi, tS, tE: Math.min(nTime - 1, tS + dur), sz: 0.55 + rand(seed + w * 7) * 0.45, width: 1 + Math.floor(rand(seed + w * 13) * 3) });
  }

  for (let t = 0; t < nTime; t++) {
    const c = candles[t];
    const midPi = Math.round((((c.o + c.c) / 2) - priceMin) / tickSize);

    for (let pi = 0; pi < nTicks; pi++) {
      const dist = Math.abs(pi - midPi);
      // Base noise — slightly denser near mid price
      const v = rand(seed + t * 1000 + pi * 7) * Math.max(0, 0.22 - dist * 0.003);
      heat[t * nTicks + pi] = Math.max(0, v);
    }

    // Apply walls
    for (const w of walls) {
      if (t < w.tS || t > w.tE) continue;
      for (let dw = -w.width; dw <= w.width; dw++) {
        const pi2 = w.p + dw;
        if (pi2 < 0 || pi2 >= nTicks) continue;
        const falloff = 1 - Math.abs(dw) / (w.width + 1);
        heat[t * nTicks + pi2] = Math.min(1, heat[t * nTicks + pi2] + w.sz * falloff);
      }
    }
  }

  return heat;
}

// ── Book snapshot at last candle
function genBook(lastPrice: number, seed: number) {
  const bids: { p: number; s: number }[] = [];
  const asks: { p: number; s: number }[] = [];
  const TICK = 0.5;
  for (let i = 0; i < 20; i++) {
    const p = Math.round((lastPrice - (i + 1) * TICK) / TICK) * TICK;
    const s = rand(seed + i * 3) * 0.85;
    bids.push({ p, s: i % 5 === 2 ? Math.min(1, s + 0.5) : s }); // random walls
  }
  for (let i = 0; i < 20; i++) {
    const p = Math.round((lastPrice + (i + 1) * TICK) / TICK) * TICK;
    const s = rand(seed + 200 + i * 3) * 0.85;
    asks.push({ p, s: i % 6 === 3 ? Math.min(1, s + 0.5) : s });
  }
  return { bids, asks };
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { candles: any[]; seed?: number }

export default function BookmapChart({ candles, seed = 1 }: Props) {
  const { containerRef, size, winStart, winEnd, isGrabbing } = useCanvasPanZoom(candles.length, 40);
  const heatCanvasRef = useRef<HTMLCanvasElement>(null);

  // Layout constants
  const VOL_H  = 48;
  const BOOK_W = 140; // right-side resting depth profile (was 70 — too cramped to read)
  const AXIS_Y = 60;  // right price axis (slightly wider for 4-digit ES prices)
  const AXIS_X = 20;  // bottom time axis

  const TICK = 0.5;

  const priceMin = candles.length > 0 ? Math.min(...candles.map(d => d.l)) - 2 : 0;
  const priceMax = candles.length > 0 ? Math.max(...candles.map(d => d.h)) + 2 : 1;
  const nTicks   = Math.round((priceMax - priceMin) / TICK) + 1;
  const lastC    = candles[candles.length - 1];

  // Memoised heavy data — only initialise once we actually have candles, else
  // genBook(undefined.c) crashes the panel during the brief loading state.
  const heat = useRef<Float32Array | null>(null);
  const book = useRef<ReturnType<typeof genBook> | null>(null);
  if (!heat.current && candles.length > 0) heat.current = genHeatmap(candles, TICK, priceMin, nTicks, seed);
  if (!book.current && lastC) book.current = genBook(lastC.c, seed + 500);

  // MA lines
  const closes = candles.map(d => d.c as number | null);
  const ma20  = sma(closes, 20);
  const ma50  = sma(closes, 50);

  const draw = useCallback(() => {
    const canvas = heatCanvasRef.current;
    if (!canvas || !heat.current || !book.current || candles.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const visCands = candles.slice(winStart, winEnd + 1);

    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const plotW = w - AXIS_Y - BOOK_W;
    const plotH = h - VOL_H - AXIS_X;

    const cellW = plotW / visCands.length;
    const cellH = plotH / nTicks;

    const priceToPy = (p: number)  => plotH - ((p - priceMin) / (priceMax - priceMin)) * plotH;
    const tToX      = (i: number)  => i * cellW + cellW / 2;

    // ── Background
    ctx.fillStyle = "#080810";
    ctx.fillRect(0, 0, w, h);

    // ── Heatmap cells
    for (let t = winStart; t <= winEnd; t++) {
      for (let pi = 0; pi < nTicks; pi++) {
        const intensity = heat.current[t * nTicks + pi];
        if (intensity < 0.03) continue;
        const x = (t - winStart) * cellW;
        const y = plotH - (pi + 1) * cellH;
        ctx.fillStyle = heatStyle(intensity, Math.min(1, intensity * 2.5 + 0.1));
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
      }
    }

    // ── Grid lines (horizontal price)
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const priceStep = priceRange(priceMax - priceMin);
    for (let p = Math.ceil(priceMin / priceStep) * priceStep; p <= priceMax; p += priceStep) {
      const y = priceToPy(p);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(plotW, y); ctx.stroke();
    }

    // ── Candles
    visCands.forEach((c, i) => {
      const x = tToX(i);
      const yO = priceToPy(c.o);
      const yC = priceToPy(c.c);
      const yH = priceToPy(c.h);
      const yL = priceToPy(c.l);
      const color = c.up ? "#26a69a" : "#ef5350";
      const bodyTop = Math.min(yO, yC);
      const bodyH   = Math.max(1.5, Math.abs(yC - yO));

      // wick
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();

      // body
      ctx.fillStyle = color;
      ctx.fillRect(x - cellW * 0.28, bodyTop, cellW * 0.56, bodyH);
    });

    // ── MA lines
    const drawMA = (vals: (number | null)[], color: string, lw: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth   = lw;
      ctx.beginPath();
      let started = false;
      visCands.forEach((_, i) => {
        const v = vals[winStart + i];
        if (v == null) return;
        const x = tToX(i);
        const y = priceToPy(v);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    drawMA(ma20, "#f472b6", 1.5);
    drawMA(ma50, "#a78bfa", 1.2);

    // ── Volume bars (bottom strip)
    const volMax = Math.max(...visCands.map(d => d.vol));
    visCands.forEach((c, i) => {
      const bh = (c.vol / volMax) * (VOL_H - 4);
      const x  = i * cellW;
      const y  = plotH + AXIS_X + (VOL_H - 4) - bh;
      ctx.fillStyle = c.up ? "rgba(38,166,154,0.7)" : "rgba(239,83,80,0.7)";
      ctx.fillRect(x + 0.5, y, cellW - 1, bh);
    });

    // ── Volume panel separator
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, plotH + AXIS_X); ctx.lineTo(plotW, plotH + AXIS_X); ctx.stroke();

    // ── Right: Price Y axis
    const axisX = plotW;
    ctx.fillStyle = "#0d0d18";
    ctx.fillRect(axisX, 0, AXIS_Y, plotH);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(axisX, 0); ctx.lineTo(axisX, plotH); ctx.stroke();

    ctx.fillStyle = "#888";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    for (let p = Math.ceil(priceMin / priceStep) * priceStep; p <= priceMax; p += priceStep) {
      const y = priceToPy(p);
      if (y < 8 || y > plotH - 8) continue;
      ctx.fillText(p.toFixed(2), axisX + 5, y + 3.5);
    }

    // ── Current price marker on Y axis
    const cp = lastC.c;
    const cpY = priceToPy(cp);
    ctx.fillStyle = cp >= lastC.o ? "#26a69a" : "#ef5350";
    ctx.fillRect(axisX, cpY - 8, AXIS_Y, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillText(cp.toFixed(2), axisX + 4, cpY + 3.5);

    // ── Right: Order book panel
    const bookX = axisX + AXIS_Y;
    ctx.fillStyle = "#07070f";
    ctx.fillRect(bookX, 0, BOOK_W, plotH);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bookX, 0); ctx.lineTo(bookX, plotH); ctx.stroke();

    // mid line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(bookX, cpY); ctx.lineTo(bookX + BOOK_W, cpY); ctx.stroke();
    ctx.setLineDash([]);

    // bids
    book.current.bids.forEach(b => {
      const y = priceToPy(b.p);
      if (y < 0 || y > plotH) return;
      const [r, g, bv] = heatRgb(b.s);
      ctx.fillStyle = `rgba(${r},${g},${bv},0.85)`;
      ctx.fillRect(bookX + 1, y - cellH / 2, (BOOK_W - 2) * b.s, cellH);
    });
    // asks
    book.current.asks.forEach(a => {
      const y = priceToPy(a.p);
      if (y < 0 || y > plotH) return;
      const [r, g, bv] = heatRgb(a.s);
      ctx.fillStyle = `rgba(${r},${g},${bv},0.85)`;
      ctx.fillRect(bookX + 1, y - cellH / 2, (BOOK_W - 2) * a.s, cellH);
    });

    // ── X axis (time labels)
    ctx.fillStyle = "#666";
    ctx.font      = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    const step = Math.max(1, Math.floor(visCands.length / 8));
    visCands.forEach((_, i) => {
      if (i % step !== 0) return;
      const x = tToX(i);
      const label = `${String(winStart + i).padStart(2, "0")}:00`;
      ctx.fillText(label, x, plotH + AXIS_X - 4);
    });

    // ── Legend
    const legends = [
      { color: "#f472b6", label: "MA(20)" },
      { color: "#a78bfa", label: "MA(50)" },
    ];
    ctx.textAlign = "left";
    legends.forEach((l, i) => {
      const lx = 10 + i * 80;
      const ly = 14;
      ctx.fillStyle = l.color;
      ctx.fillRect(lx, ly - 5, 16, 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "9px sans-serif";
      ctx.fillText(l.label, lx + 20, ly);
    });

  }, [size, nTicks, priceMin, priceMax, ma20, ma50, lastC, winStart, winEnd]);

  useEffect(() => { draw(); }, [draw, size]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#080810]" style={{ cursor: isGrabbing ? "grabbing" : "grab" }}>
      <canvas ref={heatCanvasRef} className="block" />
      {/* Legend pill */}
      <div className="absolute top-2 right-2 flex gap-2 pointer-events-none">
        {[["#f472b6","MA20"],["#a78bfa","MA50"]].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1 text-[9px] font-mono opacity-60">
            <span className="inline-block w-3 h-0.5" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
      {/* Heat scale */}
      <div className="absolute bottom-14 right-[126px] flex flex-col items-center gap-0.5 pointer-events-none">
        <span className="text-[8px] text-white/30 font-mono">HIGH</span>
        <div className="w-2 h-20 rounded-sm overflow-hidden" style={{
          background: "linear-gradient(to bottom, rgb(220,20,20), rgb(230,100,0), rgb(220,200,0), rgb(0,160,200), rgb(0,60,160), rgb(8,8,16))"
        }} />
        <span className="text-[8px] text-white/30 font-mono">LOW</span>
      </div>
    </div>
  );
}

// pick a readable price step from range
function priceRange(range: number) {
  const raw = range / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) if (s * mag >= raw) return s * mag;
  return 10 * mag;
}
