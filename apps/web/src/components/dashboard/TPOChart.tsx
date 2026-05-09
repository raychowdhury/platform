"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { rand } from "@/lib/chart-data";
import { useCanvasPanZoom } from "./useCanvasPanZoom";

// TPO Daily RTH Delta — Market Profile chart
// Each session shows letter-based TPO profile with volume and delta

const TICK = 0.25;
const PERIOD_MIN = 30;      // each TPO period = 30 min
const RTH_PERIODS = 13;     // A–M  (9:30–16:00 = 6.5h = 13 × 30min)
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const rt = (v: number) => Math.round(v / TICK) * TICK;

interface TPOLevel {
  price: number;
  periods: number[];   // which period letters visited (0=A, 1=B, ...)
  buyVol: number;
  sellVol: number;
  poc: boolean;        // highest TPO count
  vah: boolean;        // value area high
  val: boolean;        // value area low
}

interface TPOSession {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  poc: number;
  vah: number;
  val: number;
  levels: TPOLevel[];
  volume: number;
  delta: number;
  avDelta: number;
  range: number;
}

interface VolBar { price: number; buyVol: number; sellVol: number }

function genSession(base: number, sessionIdx: number, seed: number): TPOSession {
  const open = rt(base + (rand(seed + sessionIdx * 3) - 0.5) * 10);
  const lo   = rt(open - rand(seed + sessionIdx * 7) * 15 - 3);
  const hi   = rt(open + rand(seed + sessionIdx * 11) * 15 + 3);
  const close = rt(lo + rand(seed + sessionIdx * 13) * (hi - lo));
  const nTicks = Math.round((hi - lo) / TICK) + 1;

  // For each period A–M, decide which prices were visited (random walk per period)
  const levels: Map<number, number[]> = new Map();
  const initLevels = () => {
    for (let t = 0; t < nTicks; t++) levels.set(rt(lo + t * TICK), []);
  };
  initLevels();

  for (let pi = 0; pi < RTH_PERIODS; pi++) {
    // Each period: random walk within session range
    const pLo = rt(lo + rand(seed + sessionIdx * 100 + pi * 7) * (hi - lo) * 0.3);
    const pHi = rt(pLo + rand(seed + sessionIdx * 100 + pi * 3) * (hi - pLo) + TICK);
    for (let t = 0; t < nTicks; t++) {
      const p = rt(lo + t * TICK);
      if (p >= pLo && p <= pHi) {
        const arr = levels.get(p);
        if (arr && !arr.includes(pi)) arr.push(pi);
      }
    }
  }

  // Find POC (most periods)
  let pocPrice = lo, pocCount = 0;
  levels.forEach((periods, price) => {
    if (periods.length > pocCount) { pocCount = periods.length; pocPrice = price; }
  });

  // Value area (70% of volume around POC)
  const sortedByCount = [...levels.entries()].sort((a, b) => b[1].length - a[1].length);
  const totalTPO = sortedByCount.reduce((s, [, p]) => s + p.length, 0);
  let cum = 0, vahP = pocPrice, valP = pocPrice;
  for (const [price, periods] of sortedByCount) {
    cum += periods.length;
    if (price > vahP) vahP = price;
    if (price < valP) valP = price;
    if (cum >= totalTPO * 0.7) break;
  }

  // Build levels array with buy/sell vol
  let totalVol = 0, totalDelta = 0;
  const levelArr: TPOLevel[] = [];
  levels.forEach((periods, price) => {
    if (periods.length === 0) return;
    const distPOC = Math.abs(price - pocPrice) / Math.max(TICK, hi - lo);
    const m = 1 + (1 - distPOC) * 3;
    const buyVol  = Math.round((50 + rand(seed + sessionIdx * 500 + Math.round(price * 4)) * 800) * m);
    const sellVol = Math.round((50 + rand(seed + sessionIdx * 500 + Math.round(price * 4) + 1) * 800) * m);
    totalVol  += buyVol + sellVol;
    totalDelta += buyVol - sellVol;
    levelArr.push({
      price,
      periods,
      buyVol,
      sellVol,
      poc: price === pocPrice,
      vah: Math.abs(price - vahP) < TICK / 2,
      val: Math.abs(price - valP) < TICK / 2,
    });
  });

  levelArr.sort((a, b) => b.price - a.price);

  const range = +(hi - lo).toFixed(2);
  const m = sessionIdx + 1;
  const date = `3-${m < 10 ? "0" + m : m} 9:30`;

  return { date, open, high: hi, low: lo, close, poc: pocPrice, vah: vahP, val: valP, levels: levelArr, volume: totalVol, delta: totalDelta, avDelta: Math.round(totalDelta / RTH_PERIODS), range };
}

function genVolProfile(sessions: TPOSession[], pMin: number, pMax: number): VolBar[] {
  const map = new Map<number, { buy: number; sell: number }>();
  sessions.forEach(s => {
    s.levels.forEach(lv => {
      const e = map.get(lv.price) ?? { buy: 0, sell: 0 };
      e.buy  += lv.buyVol;
      e.sell += lv.sellVol;
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

export default function TPOChart({ seed = 1, basePrice = 5700 }: { seed?: number; basePrice?: number }) {
  const { containerRef, size, winStart, winEnd, isGrabbing } = useCanvasPanZoom(20, 8);
  const canvasRef    = useRef<HTMLCanvasElement>(null);

  const sessions = useMemo(() => {
    const out: TPOSession[] = [];
    let base = basePrice;
    for (let i = 0; i < 20; i++) {
      const s = genSession(base, i, seed);
      out.push(s);
      base = s.close;
    }
    return out;
  }, [seed, basePrice]);

  const lastSession = sessions[sessions.length - 1];

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

    const visSessions = sessions.slice(winStart, winEnd + 1);
    const nSess = visSessions.length;

    const pMin = Math.min(...visSessions.map(s => s.low));
    const pMax = Math.max(...visSessions.map(s => s.high));
    const volProf = genVolProfile(visSessions, pMin, pMax);

    const PROF_W  = 60;  // right vol profile
    const PAXIS_W = 58;  // right price axis
    const DATE_H  = 16;
    const INFO_H  = 42;  // top stats per session

    const chartW  = w - PROF_W - PAXIS_W;
    const chartH  = h - DATE_H - INFO_H;
    const COL_W   = chartW / nSess;
    const nTicks  = Math.round((pMax - pMin) / TICK) + 1;
    const ROW_H   = Math.max(8, Math.floor(chartH / nTicks));

    const pToPy = (p: number) => INFO_H + (nTicks - 1 - Math.round((p - pMin) / TICK)) * ROW_H;

    // ── BG
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, w, h);

    // ── Orange horizontal key levels (across all sessions)
    const orangeLevels: number[] = [];
    visSessions.forEach(s => {
      if (!orangeLevels.some(p => Math.abs(p - s.vah) < TICK)) orangeLevels.push(s.vah);
    });
    orangeLevels.slice(0, 3).forEach(lp => {
      const y = pToPy(lp);
      ctx.strokeStyle = "rgba(210,130,0,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    });

    // ── Sessions
    visSessions.forEach((sess, si) => {
      const colX = si * COL_W;

      // session separator
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(colX, INFO_H); ctx.lineTo(colX, h - DATE_H); ctx.stroke();

      // ── Stats box at top
      const statsX = colX + 4;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(colX + 1, 1, COL_W - 2, INFO_H - 2);
      ctx.fillStyle = "#888";
      ctx.font = "7px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`V:${sess.volume.toLocaleString()}`, statsX, 10);
      ctx.fillStyle = sess.delta >= 0 ? "#4af" : "#f55";
      ctx.fillText(`AV-B V:${sess.avDelta}`, statsX, 19);
      ctx.fillStyle = "#777";
      ctx.fillText(`Rng:${sess.range.toFixed(2)}`, statsX, 28);

      // ── VAH/VAL dashed horizontal lines (white)
      [sess.vah, sess.val].forEach(lp => {
        const y = pToPy(lp);
        ctx.strokeStyle = "rgba(220,220,220,0.18)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(colX, y); ctx.lineTo(colX + COL_W, y); ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── POC line (yellow vertical bar overlay)
      const pocY = pToPy(sess.poc);
      ctx.strokeStyle = "rgba(255,220,0,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(colX, pocY); ctx.lineTo(colX + COL_W, pocY); ctx.stroke();

      // ── Max vol for bar scaling
      const maxVol = Math.max(...sess.levels.map(lv => lv.buyVol + lv.sellVol));
      const maxLen = (COL_W - 2) * 0.42;

      // ── Render each TPO level
      sess.levels.forEach(lv => {
        const rowY = pToPy(lv.price);
        const rh   = Math.max(1, ROW_H - 1);
        const total = lv.buyVol + lv.sellVol;
        const buyFrac = lv.buyVol / (total || 1);

        // buy (blue) bar — left side
        const buyW = buyFrac * (total / maxVol) * maxLen;
        ctx.fillStyle = "rgba(30,120,220,0.75)";
        ctx.fillRect(colX + 2, rowY + 1, buyW, rh - 2);

        // sell (red) bar — right of buy
        const sellW = (1 - buyFrac) * (total / maxVol) * maxLen;
        ctx.fillStyle = "rgba(200,30,30,0.70)";
        ctx.fillRect(colX + 2 + buyW, rowY + 1, sellW, rh - 2);

        // TPO letters (gray, right side of bar)
        if (ROW_H >= 8 && lv.periods.length > 0) {
          const letters = lv.periods.map(p => LETTERS[p % 26]).join("");
          ctx.fillStyle = lv.poc ? "#ffdd00" : lv.vah || lv.val ? "#e0a030" : "rgba(180,180,180,0.55)";
          ctx.font = `${Math.min(9, ROW_H)}px 'JetBrains Mono', monospace`;
          ctx.textAlign = "left";
          ctx.fillText(letters.substring(0, Math.floor((COL_W - maxLen * 1.1) / 5.5)), colX + 2 + buyW + sellW + 2, rowY + ROW_H * 0.72);
        }
      });

      // Date label
      ctx.fillStyle = "#555";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(sess.date, colX + COL_W / 2, h - 3);
    });

    // ── Right price axis
    const axisX = chartW;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(axisX, 0, PAXIS_W, h);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(axisX, INFO_H); ctx.lineTo(axisX, h - DATE_H); ctx.stroke();

    const pStep = Math.max(TICK, Math.round((pMax - pMin) / 12 / TICK) * TICK);
    for (let p = Math.ceil(pMin / pStep) * pStep; p <= pMax; p = rt(p + pStep)) {
      const y = pToPy(p);
      if (y < INFO_H || y > h - DATE_H) continue;
      ctx.fillStyle = "#555";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(p.toFixed(2), axisX + 4, y + 3);
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(axisX, y); ctx.stroke();
    }

    // ── Volume profile (far right)
    const profX = chartW + PAXIS_W;
    ctx.fillStyle = "#080808";
    ctx.fillRect(profX, 0, PROF_W, h);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(profX, 0); ctx.lineTo(profX, h); ctx.stroke();

    const maxPV = Math.max(...volProf.map(b => b.buyVol + b.sellVol));
    const tickH = Math.max(1, chartH / volProf.length);
    volProf.forEach(bar => {
      const y     = pToPy(bar.price);
      const total = bar.buyVol + bar.sellVol;
      const bw    = (total / (maxPV || 1)) * (PROF_W - 4);
      const buyW  = (bar.buyVol / (total || 1)) * bw;
      ctx.fillStyle = "rgba(30,110,210,0.65)";
      ctx.fillRect(profX + 2, y + 1, buyW, tickH - 1);
      ctx.fillStyle = "rgba(190,30,30,0.60)";
      ctx.fillRect(profX + 2 + buyW, y + 1, bw - buyW, tickH - 1);
    });

    // Profile labels
    ctx.fillStyle = "#555";
    ctx.font = "7px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Vol", profX + 2, INFO_H - 4);

    // "Daily Vol & Delta" header
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Daily  Vol & Delta", w - 2, 10);

    // ── Current price on right axis
    const cpY = pToPy(lastSession.close);
    ctx.fillStyle = lastSession.close >= lastSession.open ? "#26a69a" : "#ef5350";
    ctx.fillRect(axisX, cpY - 8, PAXIS_W - 1, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(lastSession.close.toFixed(2), axisX + PAXIS_W / 2, cpY + 4);

    // current price dashed line
    ctx.strokeStyle = "rgba(255,200,0,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(0, cpY); ctx.lineTo(chartW, cpY); ctx.stroke();
    ctx.setLineDash([]);

    // ── Legend
    const leg = [
      { color: "rgba(30,120,220,0.8)", txt: "Buy Vol" },
      { color: "rgba(200,30,30,0.75)", txt: "Sell Vol" },
      { color: "rgba(255,220,0,0.85)", txt: "POC" },
      { color: "rgba(210,130,0,0.7)",  txt: "Value Area" },
    ];
    leg.forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.fillRect(4 + i * 72, INFO_H + 2, 8, 8);
      ctx.fillStyle = "#555";
      ctx.font = "7px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(l.txt, 14 + i * 72, INFO_H + 10);
    });

  }, [sessions, size, lastSession, winStart, winEnd]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#0d0d0d]" style={{ cursor: isGrabbing ? "grabbing" : "grab" }}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
