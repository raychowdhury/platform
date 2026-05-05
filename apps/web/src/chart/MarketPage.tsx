import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/store";
import type { Candle, StreamTick, Symbol as SymbolMeta, Timeframe } from "../api/types";
import { TF_SECONDS } from "../api/types";
import Chart, { type CandleBar, type ChartHandle } from "./Chart";
import { useStream } from "./useStream";

const TFS: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "8h", "1d", "1w"];

export default function MarketPage() {
  const clearAuth = useAuth((s) => s.clear);
  const [symbols, setSymbols] = useState<SymbolMeta[]>([]);
  const [symbol, setSymbol] = useState<string>("");
  const [tf, setTf] = useState<Timeframe>("1m");
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [prevClose, setPrevClose] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const chartRef = useRef<ChartHandle | null>(null);
  const currentBarRef = useRef<CandleBar | null>(null);

  // bootstrap symbol list
  useEffect(() => {
    let cancelled = false;
    api.symbols()
      .then((s) => {
        if (cancelled) return;
        setSymbols(s);
        if (s.length > 0 && !symbol) setSymbol(s[0].symbol);
      })
      .catch((e) => setErr(String(e)));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load history each time symbol/tf changes
  const loadHistory = useCallback(async () => {
    if (!symbol || !chartRef.current) return;
    try {
      setErr(null);
      const to = new Date();
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
      const candles = await api.candles(symbol, tf, from, to, 500);
      const bars: CandleBar[] = candles.map((c: Candle) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      chartRef.current.setHistory(bars);
      const last = bars[bars.length - 1];
      currentBarRef.current = last ?? null;
      setPrevClose(bars.length >= 2 ? bars[bars.length - 2].close : null);
      setLastPrice(last?.close ?? null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [symbol, tf]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // live ticks: roll into current bar
  const onTick = useCallback((t: StreamTick) => {
    const handle = chartRef.current;
    if (!handle) return;
    const tfSec = TF_SECONDS[tf];
    const bucket = Math.floor(t.t / 1000 / tfSec) * tfSec;
    const cur = currentBarRef.current;
    let next: CandleBar;
    if (!cur || cur.time !== bucket) {
      next = { time: bucket, open: t.price, high: t.price, low: t.price, close: t.price };
    } else {
      next = {
        time: cur.time,
        open: cur.open,
        high: Math.max(cur.high, t.price),
        low: Math.min(cur.low, t.price),
        close: t.price,
      };
    }
    currentBarRef.current = next;
    handle.upsertBar(next);
    setLastPrice(t.price);
  }, [tf]);

  useStream(symbol, onTick, setStatus);

  const dir: "up" | "down" | undefined = useMemo(() => {
    if (lastPrice == null || prevClose == null) return undefined;
    if (lastPrice > prevClose) return "up";
    if (lastPrice < prevClose) return "down";
    return undefined;
  }, [lastPrice, prevClose]);

  const onChartReady = useCallback((h: ChartHandle) => {
    chartRef.current = h;
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="layout">
      <div className="topbar">
        <strong>Platform</strong>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {symbols.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} ({s.exchange})
            </option>
          ))}
        </select>
        <select value={tf} onChange={(e) => setTf(e.target.value as Timeframe)}>
          {TFS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className={`price ${dir ?? ""}`}>
          {lastPrice != null ? lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
        </span>
        <span className={`status ${status === "open" ? "live" : ""}`}>{status}</span>
        <span className="spacer" />
        {err && <span className="error">{err}</span>}
        <button onClick={async () => { await api.logout(); clearAuth(); location.href = "/login"; }}>logout</button>
      </div>
      <Chart onReady={onChartReady} />
    </div>
  );
}
