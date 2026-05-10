"use client";
import { useEffect, useState } from "react";
import { fetchCandles, type ApiCandle } from "./api";

// Mock-compatible candle shape consumed by the chart components in
// dashboard/charts/page.tsx. Mapping API → mock keeps the existing renderer
// + indicator math (calcSMA/EMA/BB/VWAP/RSI/MACD) untouched.
export interface ChartCandle {
  i: number;
  o: number;
  h: number;
  l: number;
  c: number;
  body: [number, number];
  wick: [number, number];
  up: boolean;
  vol: number;
  ts: number;
}

const POLL_MS = 5000;

function toChart(rows: ApiCandle[]): ChartCandle[] {
  return rows.map((r, i) => ({
    i,
    o: r.open,
    h: r.high,
    l: r.low,
    c: r.close,
    body: [Math.min(r.open, r.close), Math.max(r.open, r.close)],
    wick: [r.low, r.high],
    up: r.close >= r.open,
    vol: r.volume,
    ts: new Date(r.time).getTime(),
  }));
}

export interface CandlesState {
  data: ChartCandle[] | null;
  loading: boolean;
  error: string | null;
}

export function useCandles(symbol: string, tf: string, limit = 200): CandlesState {
  const [state, setState] = useState<CandlesState>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    setState({ data: null, loading: true, error: null });

    const tick = async () => {
      try {
        const rows = await fetchCandles(symbol, tf, limit);
        if (cancelled) return;
        setState({ data: toChart(rows), loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        setState((prev) => ({ ...prev, loading: false, error: String(e) }));
      }
      if (!cancelled) timer = window.setTimeout(tick, POLL_MS);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [symbol, tf, limit]);

  return state;
}
