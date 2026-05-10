"use client";
import { useEffect, useState } from "react";
import {
  fetchFootprint,
  fetchCvd,
  fetchTpo,
  type ApiFPBar,
  type ApiCvdBar,
  type ApiTpo,
} from "./api";

const POLL_MS = 5000;

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function usePoller<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  intervalMs = POLL_MS,
): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    setState({ data: null, loading: true, error: null });
    const tick = async () => {
      try {
        const d = await fetcher();
        if (!cancelled) setState({ data: d, loading: false, error: null });
      } catch (e) {
        if (!cancelled) setState((p) => ({ ...p, loading: false, error: String(e) }));
      }
      if (!cancelled) timer = window.setTimeout(tick, intervalMs);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useFootprint(symbol: string, tf = "5m", limit = 30) {
  return usePoller<ApiFPBar[]>(() => fetchFootprint(symbol, tf, limit), [symbol, tf, limit]);
}

export function useCvd(symbol: string, tf = "1m", limit = 200) {
  return usePoller<ApiCvdBar[]>(() => fetchCvd(symbol, tf, limit), [symbol, tf, limit]);
}

export function useTpo(symbol: string, day?: string, periodMins = 30) {
  return usePoller<ApiTpo>(() => fetchTpo(symbol, day, periodMins), [symbol, day, periodMins], 30000);
}
