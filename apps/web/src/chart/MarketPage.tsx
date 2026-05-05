import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/store";
import type {
  Account,
  Candle,
  Order,
  Position,
  StreamTick,
  Subscription,
  Symbol as SymbolMeta,
  Timeframe,
} from "../api/types";
import { TF_SECONDS } from "../api/types";
import Chart, { type CandleBar, type ChartHandle, type IndicatorKey } from "./Chart";
import { ema, sma } from "./indicators";
import { useStream } from "./useStream";
import Ticket from "../oms/Ticket";
import PositionsPanel from "../oms/PositionsPanel";
import OrdersPanel from "../oms/OrdersPanel";
import { useOmsStream } from "../oms/useOmsStream";

const TFS: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "8h", "1d", "1w"];

const INDICATOR_DEFS: { key: IndicatorKey; label: string }[] = [
  { key: "ma20",  label: "MA 20" },
  { key: "ma50",  label: "MA 50" },
  { key: "ema12", label: "EMA 12" },
  { key: "ema26", label: "EMA 26" },
];

function compute(key: IndicatorKey, bars: CandleBar[]) {
  switch (key) {
    case "ma20":  return sma(bars, 20);
    case "ma50":  return sma(bars, 50);
    case "ema12": return ema(bars, 12);
    case "ema26": return ema(bars, 26);
  }
}

export default function MarketPage() {
  const clearAuth = useAuth((s) => s.clear);
  const [symbols, setSymbols] = useState<SymbolMeta[]>([]);
  const [symbol, setSymbol] = useState<string>("");
  const [tf, setTf] = useState<Timeframe>("1m");
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [prevClose, setPrevClose] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<Set<IndicatorKey>>(() => new Set(["ma20"]));

  const [userId, setUserId] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const marksRef = useRef<Map<string, number>>(new Map());
  const [marks, setMarks] = useState<Map<string, number>>(new Map());

  const chartRef = useRef<ChartHandle | null>(null);
  const barsRef = useRef<CandleBar[]>([]);
  const activeRef = useRef(active);
  activeRef.current = active;

  // bootstrap symbol list
  useEffect(() => {
    let cancelled = false;
    api.symbols()
      .then((s) => {
        if (cancelled) return;
        setSymbols(s);
        if (s.length > 0) setSymbol((cur) => cur || s[0].symbol);
      })
      .catch((e) => setErr(String(e)));
    return () => { cancelled = true; };
  }, []);

  const refreshOms = useCallback(async () => {
    try {
      const [a, p, o, s] = await Promise.all([
        api.account(),
        api.positions(),
        api.orders(undefined, 50),
        api.mySubscription().catch(() => null),
      ]);
      setAccount(a);
      setPositions(p);
      setOrders(o);
      setUserId(a.user_id);
      if (s) setSub(s);
    } catch (e: unknown) {
      // surface but don't crash UI
      console.warn("oms refresh", e);
    }
  }, []);

  // initial load + slow safety poll (WS push is the primary refresh trigger now)
  useEffect(() => {
    refreshOms();
    const t = window.setInterval(refreshOms, 15000);
    return () => window.clearInterval(t);
  }, [refreshOms]);

  useOmsStream(userId, () => { refreshOms(); });

  const refreshIndicators = useCallback(() => {
    const handle = chartRef.current;
    if (!handle) return;
    const bars = barsRef.current;
    for (const def of INDICATOR_DEFS) {
      if (activeRef.current.has(def.key)) {
        handle.setIndicator(def.key, compute(def.key, bars));
      } else {
        handle.setIndicator(def.key, null);
      }
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!symbol || !chartRef.current) return;
    try {
      setErr(null);
      const to = new Date();
      const tfSec = TF_SECONDS[tf];
      const from = new Date(to.getTime() - tfSec * 500 * 1000);
      const candles = await api.candles(symbol, tf, from, to, 500);
      const bars: CandleBar[] = candles.map((c: Candle) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      barsRef.current = bars;
      chartRef.current.setHistory(bars);
      refreshIndicators();
      const last = bars[bars.length - 1];
      setPrevClose(bars.length >= 2 ? bars[bars.length - 2].close : null);
      setLastPrice(last?.close ?? null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [symbol, tf, refreshIndicators]);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { refreshIndicators(); }, [active, refreshIndicators]);

  const onTick = useCallback((t: StreamTick) => {
    // update mark for any symbol that streams (positions panel uses these)
    marksRef.current.set(t.symbol, t.price);

    if (t.symbol !== symbol) return;
    const handle = chartRef.current;
    if (!handle) return;
    const tfSec = TF_SECONDS[tf];
    const bucket = Math.floor(t.t / 1000 / tfSec) * tfSec;
    const bars = barsRef.current;
    const last = bars[bars.length - 1];
    let next: CandleBar;
    if (!last || last.time !== bucket) {
      next = { time: bucket, open: t.price, high: t.price, low: t.price, close: t.price };
      bars.push(next);
    } else {
      next = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, t.price),
        low: Math.min(last.low, t.price),
        close: t.price,
      };
      bars[bars.length - 1] = next;
    }
    handle.upsertBar(next);
    setLastPrice(t.price);
    refreshIndicators();
  }, [tf, symbol, refreshIndicators]);

  useStream(symbol, onTick, setStatus);

  // also subscribe to all position symbols for marks (when different from chart symbol)
  // For MVP: marks come from whatever streams in via the active chart sub.
  // Refresh `marks` state every 1s to drive PositionsPanel re-render.
  useEffect(() => {
    const t = window.setInterval(() => {
      setMarks(new Map(marksRef.current));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

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

  const toggle = (key: IndicatorKey) => {
    setActive((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const equity = useMemo(() => {
    if (!account) return null;
    let mtm = 0;
    for (const p of positions) {
      const m = marks.get(p.symbol) ?? p.avg_cost;
      mtm += p.qty * m;
    }
    return account.balance + mtm;
  }, [account, positions, marks]);

  return (
    <div className="layout-trade">
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
        {INDICATOR_DEFS.map((d) => (
          <button
            key={d.key}
            onClick={() => toggle(d.key)}
            style={{ opacity: active.has(d.key) ? 1 : 0.45 }}
          >
            {d.label}
          </button>
        ))}
        <span className="account-summary">
          {account != null ? (
            <>
              <span className="muted small">cash</span> {account.balance.toFixed(2)}{" "}
              {equity != null && <><span className="muted small">eq</span> {equity.toFixed(2)}</>}
            </>
          ) : "—"}
        </span>
        <Link to="/plans" className="plan-pill">{sub?.plan_code ?? "free"}</Link>
        <Link to="/me/mfa" className="link" style={{ fontSize: 12 }}>2fa</Link>
        {err && <span className="error">{err}</span>}
        <button onClick={async () => { await api.logout(); clearAuth(); location.href = "/login"; }}>logout</button>
      </div>
      <div className="chart-cell">
        <Chart onReady={onChartReady} />
      </div>
      <aside className="sidebar">
        <Ticket symbol={symbol} lastPrice={lastPrice} onPlaced={refreshOms} />
        <PositionsPanel positions={positions} marks={marks} />
        <OrdersPanel orders={orders} onChanged={refreshOms} />
      </aside>
    </div>
  );
}
