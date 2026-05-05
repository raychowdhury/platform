import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/store";
import type {
  Account,
  Alert,
  Candle,
  Drawing,
  Order,
  Plan,
  Position,
  StreamTick,
  Subscription,
  Symbol as SymbolMeta,
  Timeframe,
} from "../api/types";
import { TF_SECONDS } from "../api/types";
import Chart, { type CandleBar, type ChartHandle, type IndicatorKey, type OscillatorKey } from "./Chart";
import { ema, macd as macdFn, rsi as rsiFn, sma } from "./indicators";
import { useStream } from "./useStream";
import Ticket from "../oms/Ticket";
import PositionsPanel from "../oms/PositionsPanel";
import OrdersPanel from "../oms/OrdersPanel";
import { useOmsStream } from "../oms/useOmsStream";
import AlertsPanel from "../alerts/AlertsPanel";
import { useAlertsStream } from "../alerts/useAlertsStream";
import NotificationsBell from "../notifications/NotificationsBell";

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
  const [oscillator, setOscillator] = useState<OscillatorKey | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [notifTick, setNotifTick] = useState(0);
  const [role, setRole] = useState<string>("user");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const marksRef = useRef<Map<string, number>>(new Map());
  const [marks, setMarks] = useState<Map<string, number>>(new Map());

  const chartRef = useRef<ChartHandle | null>(null);
  const barsRef = useRef<CandleBar[]>([]);
  const activeRef = useRef(active);
  activeRef.current = active;

  // bootstrap symbol list + plan catalog
  useEffect(() => {
    let cancelled = false;
    api.symbols()
      .then((s) => {
        if (cancelled) return;
        setSymbols(s);
        if (s.length > 0) setSymbol((cur) => cur || s[0].symbol);
      })
      .catch((e) => setErr(String(e)));
    api.listPlans().then((p) => { if (!cancelled) setPlans(p); }).catch(() => {});
    api.me().then((u) => { if (!cancelled) setRole(u.role); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const currentPlan = useMemo(
    () => plans.find((p) => p.code === sub?.plan_code) ?? null,
    [plans, sub],
  );
  const maxIndicators = currentPlan?.max_indicators ?? 3;

  const refreshOms = useCallback(async () => {
    try {
      const [a, p, o, s, al] = await Promise.all([
        api.account(),
        api.positions(),
        api.orders(undefined, 50),
        api.mySubscription().catch(() => null),
        api.listAlerts().catch(() => [] as Alert[]),
      ]);
      setAccount(a);
      setPositions(p);
      setOrders(o);
      setAlerts(al);
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
  useAlertsStream(userId, (e) => {
    const arrow = e.condition === "price_above" ? "≥" : "≤";
    setToast(`🔔 ${e.symbol} ${arrow} ${e.threshold} (now ${e.price.toFixed(2)})`);
    refreshOms();
    setNotifTick((n) => n + 1);
    window.setTimeout(() => setToast(null), 6000);
  });

  const oscillatorRef = useRef(oscillator);
  oscillatorRef.current = oscillator;

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
    const osc = oscillatorRef.current;
    if (osc === "rsi") {
      handle.setOscillator("rsi", rsiFn(bars, 14));
    } else if (osc === "macd") {
      handle.setOscillator("macd", macdFn(bars, 12, 26, 9));
    } else {
      handle.setOscillator(null, null);
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
        volume: c.volume,
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
  useEffect(() => { refreshIndicators(); }, [active, oscillator, refreshIndicators]);

  // load drawings whenever symbol changes
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    api.listDrawings(symbol).then((ds) => { if (!cancelled) setDrawings(ds); }).catch(() => {});
    return () => { cancelled = true; };
  }, [symbol]);

  // push drawings to chart whenever they change
  useEffect(() => {
    chartRef.current?.setPriceLines(drawings.map((d) => ({
      id: d.id, price: d.price, color: d.color, label: d.label,
    })));
  }, [drawings]);

  // click handler — only acts in draw mode
  const onChartClick = useCallback(async (price: number) => {
    if (!drawMode || !symbol) return;
    try {
      const d = await api.createDrawing({ symbol, type: "price_line", price, label: price.toFixed(2) });
      setDrawings((cur) => [...cur, d]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setDrawMode(false);
    }
  }, [drawMode, symbol]);

  const removeDrawing = useCallback(async (id: string) => {
    try {
      await api.deleteDrawing(id);
      setDrawings((cur) => cur.filter((d) => d.id !== id));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

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
      next = {
        time: bucket,
        open: t.price, high: t.price, low: t.price, close: t.price,
        volume: t.qty,
      };
      bars.push(next);
    } else {
      next = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, t.price),
        low: Math.min(last.low, t.price),
        close: t.price,
        volume: (last.volume ?? 0) + t.qty,
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
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      if (next.size >= maxIndicators) {
        setErr(`Plan limit: ${maxIndicators} indicators max. Upgrade for more.`);
        return cur;
      }
      next.add(key);
      return next;
    });
  };

  // trim active set if a downgrade lowered the cap
  useEffect(() => {
    setActive((cur) => {
      if (cur.size <= maxIndicators) return cur;
      const arr = Array.from(cur).slice(0, maxIndicators);
      return new Set(arr);
    });
  }, [maxIndicators]);

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
        {INDICATOR_DEFS.map((d) => {
          const on = active.has(d.key);
          const blocked = !on && active.size >= maxIndicators;
          return (
            <button
              key={d.key}
              onClick={() => toggle(d.key)}
              disabled={blocked}
              title={blocked ? `Plan limit ${maxIndicators}` : ""}
              style={{ opacity: on ? 1 : blocked ? 0.25 : 0.45 }}
            >
              {d.label}
            </button>
          );
        })}
        {(["rsi", "macd"] as OscillatorKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setOscillator((cur) => (cur === k ? null : k))}
            style={{ opacity: oscillator === k ? 1 : 0.45 }}
          >
            {k.toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => setDrawMode((d) => !d)}
          style={{ opacity: drawMode ? 1 : 0.55 }}
          title="click chart to add a horizontal price line"
        >
          {drawMode ? "click chart…" : "+ line"}
        </button>
        <span className="account-summary">
          {account != null ? (
            <>
              <span className="muted small">avail</span> {account.available.toFixed(2)}{" "}
              {account.locked > 0 && <><span className="muted small">locked</span> {account.locked.toFixed(2)}{" "}</>}
              {equity != null && <><span className="muted small">eq</span> {equity.toFixed(2)}</>}
            </>
          ) : "—"}
        </span>
        <Link to="/plans" className="plan-pill">{sub?.plan_code ?? "free"}</Link>
        <Link to="/me/mfa" className="link" style={{ fontSize: 12 }}>2fa</Link>
        <Link to="/me/api-keys" className="link" style={{ fontSize: 12 }}>keys</Link>
        <Link to="/multi" className="link" style={{ fontSize: 12 }}>multi</Link>
        {role === "admin" && <Link to="/admin" className="link" style={{ fontSize: 12 }}>admin</Link>}
        <NotificationsBell refreshTrigger={notifTick} />
        {err && <span className="error">{err}</span>}
        <button onClick={async () => { await api.logout(); clearAuth(); location.href = "/login"; }}>logout</button>
      </div>
      <div className={`chart-cell ${oscillator ? "has-osc" : ""} ${drawMode ? "draw-mode" : ""}`}>
        <Chart onReady={onChartReady} onClick={onChartClick} />
      </div>
      <aside className="sidebar">
        <Ticket symbol={symbol} lastPrice={lastPrice} onPlaced={refreshOms} />
        <AlertsPanel symbol={symbol} alerts={alerts} lastPrice={lastPrice} onChanged={refreshOms} />
        {drawings.length > 0 && (
          <div className="panel">
            <div className="panel-title">Lines — {symbol}</div>
            <table className="oms-table">
              <tbody>
                {drawings.map((d) => (
                  <tr key={d.id}>
                    <td><span style={{ color: d.color }}>━</span> {d.price.toFixed(2)}</td>
                    <td><button className="link" onClick={() => removeDrawing(d.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PositionsPanel positions={positions} marks={marks} />
        <OrdersPanel orders={orders} onChanged={refreshOms} />
      </aside>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
