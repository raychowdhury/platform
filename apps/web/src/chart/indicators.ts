import type { CandleBar } from "./Chart";

export interface LinePoint {
  time: number;
  value: number;
}

// Simple moving average over close.
export function sma(bars: CandleBar[], period: number): LinePoint[] {
  const out: LinePoint[] = [];
  if (period <= 0 || bars.length < period) return out;
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= period) sum -= bars[i - period].close;
    if (i >= period - 1) {
      out.push({ time: bars[i].time, value: sum / period });
    }
  }
  return out;
}

// Exponential moving average over close, seeded with SMA of first `period` bars.
export function ema(bars: CandleBar[], period: number): LinePoint[] {
  const out: LinePoint[] = [];
  if (period <= 0 || bars.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += bars[i].close;
  let prev = seed / period;
  out.push({ time: bars[period - 1].time, value: prev });
  for (let i = period; i < bars.length; i++) {
    const v = bars[i].close * k + prev * (1 - k);
    out.push({ time: bars[i].time, value: v });
    prev = v;
  }
  return out;
}

// Wilder's RSI: smoothed average of gains and losses over `period` bars.
export function rsi(bars: CandleBar[], period = 14): LinePoint[] {
  const out: LinePoint[] = [];
  if (bars.length <= period) return out;
  let gainSum = 0;
  let lossSum = 0;
  // seed with simple averages of first `period` deltas
  for (let i = 1; i <= period; i++) {
    const d = bars[i].close - bars[i - 1].close;
    if (d >= 0) gainSum += d; else lossSum -= d;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out.push({
    time: bars[period].time,
    value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss),
  });
  for (let i = period + 1; i < bars.length; i++) {
    const d = bars[i].close - bars[i - 1].close;
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    out.push({ time: bars[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs) });
  }
  return out;
}

export interface MACDSeries {
  macd: LinePoint[];
  signal: LinePoint[];
  hist: LinePoint[];
}

// Standard MACD(12, 26, 9):
//   macd   = ema(close, fast) - ema(close, slow)
//   signal = ema(macd, signalPeriod)
//   hist   = macd - signal
export function macd(bars: CandleBar[], fast = 12, slow = 26, signalP = 9): MACDSeries {
  const empty: MACDSeries = { macd: [], signal: [], hist: [] };
  if (bars.length < slow + signalP) return empty;
  const fastE = ema(bars, fast);
  const slowE = ema(bars, slow);
  // align fastE to slowE's start (slowE starts later)
  const start = slow - 1;
  const macdLine: LinePoint[] = [];
  const fastByTime = new Map(fastE.map((p) => [p.time, p.value]));
  for (let i = start; i < bars.length; i++) {
    const t = bars[i].time;
    const f = fastByTime.get(t);
    const s = slowE[i - start]?.value;
    if (f == null || s == null) continue;
    macdLine.push({ time: t, value: f - s });
  }
  // EMA over macd values for signal — reuse ema by faking close via a temporary bar list
  const fakeBars: CandleBar[] = macdLine.map((p) => ({
    time: p.time, open: p.value, high: p.value, low: p.value, close: p.value,
  }));
  const signalLine = ema(fakeBars, signalP);
  const sigByTime = new Map(signalLine.map((p) => [p.time, p.value]));
  const hist: LinePoint[] = [];
  for (const p of macdLine) {
    const s = sigByTime.get(p.time);
    if (s == null) continue;
    hist.push({ time: p.time, value: p.value - s });
  }
  return { macd: macdLine, signal: signalLine, hist };
}
