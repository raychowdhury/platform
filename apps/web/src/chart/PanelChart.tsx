import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Candle, StreamTick, Symbol as SymbolMeta, Timeframe } from "../api/types";
import { TF_SECONDS } from "../api/types";
import Chart, { type CandleBar, type ChartHandle } from "./Chart";
import { useStream } from "./useStream";

const TFS: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "8h", "1d", "1w"];

interface Props {
  symbol: string;
  tf: Timeframe;
  symbols: SymbolMeta[];
  onChange: (symbol: string, tf: Timeframe) => void;
  onRemove?: () => void;
}

export default function PanelChart({ symbol, tf, symbols, onChange, onRemove }: Props) {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const chartRef = useRef<ChartHandle | null>(null);
  const barsRef = useRef<CandleBar[]>([]);

  const loadHistory = useCallback(async () => {
    if (!symbol || !chartRef.current) return;
    try {
      const to = new Date();
      const from = new Date(to.getTime() - TF_SECONDS[tf] * 500 * 1000);
      const candles = await api.candles(symbol, tf, from, to, 500);
      const bars: CandleBar[] = candles.map((c: Candle) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open, high: c.high, low: c.low, close: c.close,
        volume: c.volume,
      }));
      barsRef.current = bars;
      chartRef.current.setHistory(bars);
      const last = bars[bars.length - 1];
      setLastPrice(last?.close ?? null);
    } catch {
      /* ignore */
    }
  }, [symbol, tf]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const onTick = useCallback((t: StreamTick) => {
    const handle = chartRef.current;
    if (!handle) return;
    const tfSec = TF_SECONDS[tf];
    const bucket = Math.floor(t.t / 1000 / tfSec) * tfSec;
    const bars = barsRef.current;
    const last = bars[bars.length - 1];
    let next: CandleBar;
    if (!last || last.time !== bucket) {
      next = { time: bucket, open: t.price, high: t.price, low: t.price, close: t.price, volume: t.qty };
      bars.push(next);
    } else {
      next = {
        time: last.time, open: last.open,
        high: Math.max(last.high, t.price),
        low: Math.min(last.low, t.price),
        close: t.price,
        volume: (last.volume ?? 0) + t.qty,
      };
      bars[bars.length - 1] = next;
    }
    handle.upsertBar(next);
    setLastPrice(t.price);
  }, [tf]);

  useStream(symbol, onTick, setStatus);

  const onChartReady = useCallback((h: ChartHandle) => {
    chartRef.current = h;
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="panel-chart">
      <div className="panel-bar">
        <select value={symbol} onChange={(e) => onChange(e.target.value, tf)}>
          {symbols.map((s) => (
            <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
          ))}
        </select>
        <select value={tf} onChange={(e) => onChange(symbol, e.target.value as Timeframe)}>
          {TFS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="panel-price">
          {lastPrice != null ? lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
        </span>
        <span className={`status ${status === "open" ? "live" : ""}`}>{status}</span>
        <span className="spacer" />
        {onRemove && <button onClick={onRemove} title="remove panel">×</button>}
      </div>
      <div className="panel-chart-host">
        <Chart onReady={onChartReady} />
      </div>
    </div>
  );
}
