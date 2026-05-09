"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rand } from "@/lib/chart-data";
import { useCanvasPanZoom } from "./useCanvasPanZoom";

// Range Footprint Delta Volume
// Each bar = fixed tick range. Cells show: delta | volume

const TICK = 0.25;
const BAR_RANGE_TICKS = 8; // 2-point range bars
const rt = (v: number) => Math.round(v / TICK) * TICK;

interface RFLevel {
  price: number;
  delta: number;
  volume: number;
  poc: boolean;
  imbal: "buy" | "sell" | "none";
}

interface RFBar {
  o: number; h: number; l: number; c: number;
  ts: number;
  timeLabel: string;
  levels: RFLevel[];
  delta: number;
  volume: number;
}

interface VolBar { price: number; buyVol: number; sellVol: number }

function genRFBars(n = 16, base = 5564, seed = 1): RFBar[] {
  const out: RFBar[] = [];
  let p = base;
  const rangePts = BAR_RANGE_TICKS * TICK;

  for (let bi = 0; bi < n; bi++) {
    const o = rt(p);
    const up = rand(seed + bi * 7) > 0.42;
    const c = rt(up ? o + rangePts : o - rangePts);
    const h = rt(Math.max(o, c));
    const l = rt(Math.min(o, c));
    const nL = BAR_RANGE_TICKS + 1;
    const levels: RFLevel[] = [];
    let pocIdx = 0, pocVol = 0;

    for (let li = 0; li < nL; li++) {
      const lp = rt(l + li * TICK);
      const distO = Math.abs(lp - o) / (rangePts || 1);
      const distC = Math.abs(lp - c) / (rangePts || 1);
      const m = 1 + (1 - Math.min(distO, distC)) * 5;
      const ask = Math.round((20 + rand(seed + bi * 1000 + li * 3) * 600) * m);
      const bid = Math.round((20 + rand(seed + bi * 1000 + li * 7) * 600) * m);
      const vol = ask + bid;
      const delta = ask - bid;
      if (vol > pocVol) { pocVol = vol; pocIdx = li; }
      const imbal: RFLevel["imbal"] = ask > bid * 3 ? "buy" : bid > ask * 3 ? "sell" : "none";
      levels.push({ price: lp, delta, volume: vol, poc: false, imbal });
    }
    if (levels[pocIdx]) levels[pocIdx].poc = true;

    const totalVol   = levels.reduce((s, l) => s + l.volume, 0);
    const totalDelta = levels.reduce((s, l) => s + l.delta, 0);
    const hh = (10 + Math.floor(bi / 4)).toString().padStart(2, "0");
    const mm = ((bi % 4) * 5 + Math.floor(rand(seed + bi) * 4)).toString().padStart(2, "0");
    const ss = Math.floor(rand(seed + bi * 3) * 59).toString().padStart(2, "0");

    out.push({ o, h, l, c, ts: bi, timeLabel: `${hh}:${mm}:${ss}`, levels, delta: totalDelta, volume: totalVol });
    p = c;
  }
  return out;
}

function genVolProfile(bars: RFBar[], pMin: number, pMax: number): VolBar[] {
  const map = new Map<number, { buy: number; sell: number }>();
  bars.forEach(b => {
    b.levels.forEach(lv => {
      const e = map.get(lv.price) ?? { buy: 0, sell: 0 };
      if (lv.delta >= 0) e.buy += lv.delta; else e.sell += -lv.delta;
      map.set(lv.price, e);
    });
  });
  const out: VolBar[] = [];
  for (let p = pMin; p <= pMax + TICK / 2; p = rt(p + TICK)) {
    const e = map.get(p) ?? { buy: 0, sell: 0 };
    out.push({ price: p, buyVol: e.buy, sellVol: e.sell });
  }
  return out;
}

export default function RangeFPChart({ seed = 1, basePrice = 5564 }: { seed?: number; basePrice?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { containerRef, size, winStart, winEnd, isGrabbing } = useCanvasPanZoom(60, 16);
  const [showGrid, setShowGrid] = useState(true);

  const bars = useMemo(() => genRFBars(60, basePrice, seed), [seed, basePrice]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const visibleBars = bars.slice(winStart, winEnd + 1);
    if (visibleBars.length === 0) return;
    const lastBar = visibleBars[visibleBars.length - 1];
    const visiblePMin = Math.min(...visibleBars.map(b => b.l));
    const visiblePMax = Math.max(...visibleBars.map(b => b.h));
    const visibleVolProf = genVolProfile(visibleBars, visiblePMin, visiblePMax);

    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Layout — generous axis widths so labels never overlap bars
    const PAXIS_W = 62;   // left price axis
    const PROF_W  = 60;   // right volume profile
    const DELTA_H = 90;   // bottom delta bars
    const TIME_H  = 20;   // time labels
    const PAD_TOP = 14;   // breathing room above top row
    const PAD_BOT = 10;   // breathing room below bottom row

    const chartW  = w - PAXIS_W - PROF_W;
    const chartH  = h - DELTA_H - TIME_H;
    // usable vertical space for the rows (inside padding)
    const usableH = chartH - PAD_TOP - PAD_BOT;

    const nTicks  = Math.round((visiblePMax - visiblePMin) / TICK) + 1;
    // cap ROW_H so it never blows the chart — min 6px to stay readable
    const ROW_H   = Math.max(6, Math.min(40, Math.floor(usableH / nTicks)));
    const COL_W   = chartW / visibleBars.length;

    // Adaptive label spacing so axis labels never overlap each other
    // Each label is ~12px tall — skip levels when rows are thin
    const labelEvery = ROW_H < 8 ? 8 : ROW_H < 11 ? 4 : ROW_H < 15 ? 2 : 1;

    // Y mapped with top padding
    const pToPy = (p: number) =>
      PAD_TOP + (nTicks - 1 - Math.round((p - visiblePMin) / TICK)) * ROW_H;

    // ── Background
    ctx.fillStyle = "#0e0e0e";
    ctx.fillRect(0, 0, w, h);

    // ── Left price axis panel
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, PAXIS_W, chartH);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAXIS_W, 0); ctx.lineTo(PAXIS_W, chartH); ctx.stroke();

    // Price labels & optional grid
    for (let ti = 0; ti < nTicks; ti++) {
      const lp = rt(visiblePMin + ti * TICK);
      const rowY = pToPy(lp);
      // clip label to safe zone
      if (rowY < 4 || rowY + ROW_H > chartH + 4) continue;
      const midY = rowY + ROW_H / 2;

      // horizontal grid line across chart body
      if (showGrid) {
        ctx.strokeStyle = "rgba(255,255,255,0.028)";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(PAXIS_W, rowY);
        ctx.lineTo(PAXIS_W + chartW, rowY);
        ctx.stroke();
      }

      // axis label — only every N ticks so they don't collide
      if (ti % labelEvery === 0) {
        ctx.fillStyle = "#555";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        // 4px gap between label right-edge and axis line
        ctx.fillText(lp.toFixed(2), PAXIS_W - 5, midY + 3.5);

        // tick mark on the axis border
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(PAXIS_W - 3, midY);
        ctx.lineTo(PAXIS_W, midY);
        ctx.stroke();
      }
    }

    // ── Bars (clipped to chart body so overflow never bleeds into axis / delta)
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAXIS_W, 0, chartW, chartH);
    ctx.clip();

    visibleBars.forEach((bar, bi) => {
      const colX = PAXIS_W + bi * COL_W;

      // column separator
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(colX, 0); ctx.lineTo(colX, chartH); ctx.stroke();

      // alternating column tint
      if (bi % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.010)";
        ctx.fillRect(colX, 0, COL_W, chartH);
      }

      // ── Price levels
      bar.levels.forEach(lv => {
        const rowY = pToPy(lv.price);
        const rh   = Math.max(1, ROW_H - 1);

        // cell background
        if (lv.poc) {
          ctx.fillStyle = lv.delta >= 0 ? "rgba(0,180,80,0.35)" : "rgba(220,30,30,0.35)";
        } else if (lv.imbal === "buy") {
          ctx.fillStyle = "rgba(0,200,80,0.25)";
        } else if (lv.imbal === "sell") {
          ctx.fillStyle = "rgba(220,20,20,0.25)";
        } else if (lv.delta > 0) {
          ctx.fillStyle = "rgba(0,140,60,0.10)";
        } else {
          ctx.fillStyle = "rgba(180,20,20,0.10)";
        }
        ctx.fillRect(colX + 1, rowY, COL_W - 2, rh);

        // imbalance border
        if (lv.imbal !== "none") {
          ctx.strokeStyle = lv.imbal === "buy" ? "rgba(0,220,100,0.7)" : "rgba(255,40,40,0.7)";
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.strokeRect(colX + 1.5, rowY + 0.5, COL_W - 3, rh - 1);
        }

        // delta | volume numbers — only when rows are tall enough
        if (ROW_H >= 10) {
          const fs  = Math.min(10, Math.max(7, ROW_H - 3));
          const mid = colX + COL_W / 2;
          const ty  = rowY + ROW_H * 0.70;
          ctx.font = `${fs}px 'JetBrains Mono', monospace`;

          if (lv.delta !== 0) {
            ctx.fillStyle = lv.delta > 0
              ? (lv.imbal === "buy" ? "#66ff99" : "#33cc66")
              : (lv.imbal === "sell" ? "#ff5555" : "#cc3333");
            ctx.textAlign = "right";
            ctx.fillText(lv.delta.toString(), mid - 3, ty);
          }

          ctx.fillStyle = lv.poc ? "#ffffff" : "#888888";
          ctx.textAlign = "left";
          ctx.fillText(lv.volume.toString(), mid + 3, ty);
        }
      });

      // ── Candle direction indicator (center outline)
      const isUp = bar.c >= bar.o;
      const cx   = colX + COL_W / 2;
      const oY   = pToPy(bar.o) + ROW_H / 2;
      const cY   = pToPy(bar.c) + ROW_H / 2;
      ctx.fillStyle = isUp ? "#26a69a" : "#ef5350";
      ctx.fillRect(cx - 3, Math.min(oY, cY), 6, Math.max(2, Math.abs(cY - oY)));
    });

    ctx.restore(); // end chart clip

    // ── Current price dashed line
    const cpY = pToPy(lastBar.c) + ROW_H / 2;
    if (cpY >= 0 && cpY <= chartH) {
      ctx.strokeStyle = "rgba(255,220,0,0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(PAXIS_W, cpY); ctx.lineTo(PAXIS_W + chartW, cpY); ctx.stroke();
      ctx.setLineDash([]);
      // badge on the left axis
      ctx.fillStyle = "#cc9900";
      ctx.fillRect(2, cpY - 8, PAXIS_W - 4, 16);
      ctx.fillStyle = "#000";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(lastBar.c.toFixed(2), PAXIS_W / 2, cpY + 3.5);
    }

    // ── Volume profile (right side)
    const profX = PAXIS_W + chartW;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(profX, 0, PROF_W, chartH);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(profX, 0); ctx.lineTo(profX, chartH); ctx.stroke();

    const maxPV = Math.max(...visibleVolProf.map(b => b.buyVol + b.sellVol), 1);
    const tickH = Math.max(1, ROW_H - 1);
    visibleVolProf.forEach(bar => {
      const y     = pToPy(bar.price);
      if (y < 0 || y > chartH) return;
      const total = bar.buyVol + bar.sellVol;
      const bw    = (total / maxPV) * (PROF_W - 6);
      const buyW  = (bar.buyVol / (total || 1)) * bw;
      ctx.fillStyle = "rgba(0,160,70,0.6)";
      ctx.fillRect(profX + 3, y + 1, buyW, tickH - 2);
      ctx.fillStyle = "rgba(200,30,30,0.6)";
      ctx.fillRect(profX + 3 + buyW, y + 1, bw - buyW, tickH - 2);
    });

    // ── Bottom delta bars
    const deltaY = chartH;
    ctx.fillStyle = "#080808";
    ctx.fillRect(PAXIS_W, deltaY, chartW, DELTA_H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(PAXIS_W, deltaY); ctx.lineTo(PAXIS_W + chartW, deltaY); ctx.stroke();

    const maxDelta = Math.max(...visibleBars.map(b => Math.abs(b.delta)), 1);
    const midY = deltaY + DELTA_H / 2;

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAXIS_W, midY); ctx.lineTo(PAXIS_W + chartW, midY); ctx.stroke();

    visibleBars.forEach((bar, bi) => {
      const colX = PAXIS_W + bi * COL_W;
      const bh   = Math.abs(bar.delta) / maxDelta * (DELTA_H / 2 - 4);
      const pos  = bar.delta >= 0;

      ctx.fillStyle = pos ? "rgba(0,180,70,0.9)" : "rgba(200,30,30,0.9)";
      if (pos) ctx.fillRect(colX + 2, midY - bh, COL_W - 4, bh);
      else     ctx.fillRect(colX + 2, midY,       COL_W - 4, bh);

      ctx.fillStyle = pos ? "#44ff88" : "#ff5555";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      const tx = colX + COL_W / 2;
      const ty = pos ? midY - bh - 3 : midY + bh + 10;
      if (bh > 6) ctx.fillText(Math.round(bar.delta).toLocaleString(), tx, ty);
    });

    // ── Time labels
    visibleBars.forEach((bar, bi) => {
      const tx = PAXIS_W + bi * COL_W + COL_W / 2;
      ctx.fillStyle = "#444";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(bar.timeLabel, tx, h - 4);
    });

    // ── Legend
    ctx.textAlign = "left";
    ctx.font = "8px 'JetBrains Mono', monospace";
    const legends = [
      { color: "#33cc66",            txt: "Buy Δ"  },
      { color: "#cc3333",            txt: "Sell Δ" },
      { color: "#ffffff",            txt: "Volume" },
      { color: "rgba(0,200,80,0.4)", txt: "POC"   },
    ];
    legends.forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.fillRect(PAXIS_W + 4 + i * 65, 2, 8, 8);
      ctx.fillStyle = "#666";
      ctx.fillText(l.txt, PAXIS_W + 14 + i * 65, 10);
    });

    // ── "Daily Vol & Delta" header
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Daily Vol & Delta", w - 2, 10);

  }, [bars, size, winStart, winEnd, showGrid]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0e0e0e]"
      style={{ cursor: isGrabbing ? "grabbing" : "grab" }}
    >
      <canvas ref={canvasRef} className="block" />
      {/* Grid toggle */}
      <button
        onClick={() => setShowGrid(g => !g)}
        className="absolute bottom-[108px] right-[66px] px-1.5 py-0.5 text-[9px] font-mono border hairline transition-colors select-none"
        style={{
          background: showGrid ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
          color: showGrid ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.30)",
          borderColor: showGrid ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
        }}
      >
        grid
      </button>
    </div>
  );
}
