import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api } from "../api/client";
import type { Candle, StreamTick, Symbol as SymbolMeta, Timeframe } from "../api/types";
import { TF_SECONDS } from "../api/types";
import Chart, { type CandleBar, type ChartHandle } from "./Chart";
import type { CrosshairBus } from "./crosshairBus";
import { useStream } from "./useStream";

const TFS: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "8h", "1d", "1w"];

interface Props {
  symbol: string;
  tf: Timeframe;
  symbols: SymbolMeta[];
  onChange: (symbol: string, tf: Timeframe) => void;
  onRemove?: () => void;
  crosshairBus?: CrosshairBus;
}

// closeAtOrBefore returns the close of the last bar with time <= t. Bars are
// kept time-sorted (history loads ordered, ticks append/upsert at tail).
function closeAtOrBefore(bars: CandleBar[], t: number): number | null {
  if (bars.length === 0) return null;
  // Binary search for the rightmost bar.time <= t.
  let lo = 0, hi = bars.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].time <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return ans >= 0 ? bars[ans].close : null;
}

export default function PanelChart({ symbol, tf, symbols, onChange, onRemove, crosshairBus }: Props) {
  const panelId = useId();
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

  // Subscribe to the bus: when a peer panel reports a crosshair time, place
  // our crosshair on the bar at-or-before that time. Skip self-echo.
  useEffect(() => {
    if (!crosshairBus) return;
    return crosshairBus.subscribe((time, sourceId) => {
      const h = chartRef.current;
      if (!h || sourceId === panelId) return;
      if (time == null) { h.clearCrosshair(); return; }
      const price = closeAtOrBefore(barsRef.current, time);
      if (price == null) return;
      h.syncCrosshair(time, price);
    });
  }, [crosshairBus, panelId]);

  const onCrosshairTime = useCallback((time: number | null) => {
    crosshairBus?.publish(time, panelId);
  }, [crosshairBus, panelId]);

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
        <Chart onReady={onChartReady} onCrosshairTime={onCrosshairTime} />
      </div>
    </div>
  );
}
