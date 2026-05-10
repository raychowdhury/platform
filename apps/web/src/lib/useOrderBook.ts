"use client";
import { useEffect, useState } from "react";
import { fetchLadder, fetchSignal, type ApiLadder, type ApiSignal } from "./api";

const POLL_MS = 1500;

export interface OrderBookState {
  ladder: ApiLadder | null;
  signal: ApiSignal | null;
  loading: boolean;
  error: string | null;
}

// Polls /v1/market/ladder + /v1/market/signals in parallel for the active
// chart symbol. Both are best-effort: signal returns null when no live cache
// (markets closed); ladder returns volume-by-price even from stale ticks.
export function useOrderBook(symbol: string, mins = 1440): OrderBookState {
  const [state, setState] = useState<OrderBookState>({
    ladder: null,
    signal: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    setState({ ladder: null, signal: null, loading: true, error: null });

    const tick = async () => {
      try {
        const [ladder, signal] = await Promise.all([
          fetchLadder(symbol, mins).catch(() => null),
          fetchSignal(symbol).catch(() => null),
        ]);
        if (cancelled) return;
        setState({ ladder, signal, loading: false, error: null });
      } catch (e) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: String(e) }));
        }
      }
      if (!cancelled) timer = window.setTimeout(tick, POLL_MS);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [symbol, mins]);

  return state;
}
