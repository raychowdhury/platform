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
