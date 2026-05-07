import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { OrderSide, OrderType } from "../api/types";

interface Props {
  symbol: string;
  lastPrice: number | null;
  onPlaced: () => void;
}

const TYPES: { value: OrderType; label: string }[] = [
  { value: "market", label: "Market" },
  { value: "limit", label: "Limit" },
  { value: "stop_market", label: "Stop" },
];

const LEV_STEPS = [1, 2, 5, 10, 25, 50, 100];

type Mode = "cross" | "isolated";

export default function Ticket({ symbol, lastPrice, onPlaced }: Props) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [qty, setQty] = useState("0.001");
  const [price, setPrice] = useState("");
  const [stop, setStop] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [levIdx, setLevIdx] = useState(0); // 1x by default
  const [mode, setMode] = useState<Mode>("cross");

  const lev = LEV_STEPS[levIdx];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lev >= 25) {
      const ok = window.confirm(
        `${lev}x leverage is high-risk. A small adverse move can liquidate. Continue?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const qtyN = parseFloat(qty);
      if (!isFinite(qtyN) || qtyN <= 0) throw new Error("qty must be > 0");
      const req: Parameters<typeof api.placeOrder>[0] = { symbol, side, type, qty: qtyN };
      if (type === "limit") {
        const p = parseFloat(price);
        if (!isFinite(p) || p <= 0) throw new Error("limit price required");
        req.limit_price = p;
      }
      if (type === "stop_market") {
        const s = parseFloat(stop);
        if (!isFinite(s) || s <= 0) throw new Error("stop price required");
        req.stop_price = s;
      }
      const o = await api.placeOrder(req);
      setMsg(`order ${o.id.slice(0, 8)} ${o.status}`);
      onPlaced();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg(m.includes("402") ? "Insufficient available balance" : m);
    } finally {
      setBusy(false);
    }
  }

  function fillAtMarket() {
    if (lastPrice == null) return;
    if (type === "limit") setPrice(lastPrice.toFixed(2));
    if (type === "stop_market") setStop(lastPrice.toFixed(2));
  }

  const refPrice = (() => {
    if (type === "limit") return parseFloat(price);
    if (type === "stop_market") return parseFloat(stop);
    return lastPrice ?? NaN;
  })();
  const qtyN = parseFloat(qty);
  const notional = isFinite(qtyN) && isFinite(refPrice) ? qtyN * refPrice : null;
  const cost = notional != null ? notional / lev : null;
  // Simplified isolated-margin liq estimate: liq = entry * (1 - 1/lev) for long,
  // entry * (1 + 1/lev) for short. Ignores fees + maintenance margin — directional only.
  const liq = (() => {
    if (!isFinite(refPrice) || refPrice <= 0) return null;
    const m = 1 / lev;
    return side === "buy" ? refPrice * (1 - m) : refPrice * (1 + m);
  })();
  const liqDistPct = (liq != null && isFinite(refPrice))
    ? Math.abs((refPrice - liq) / refPrice) * 100
    : null;

  const levClass = lev >= 50 ? "extreme" : lev >= 10 ? "high" : "";

  return (
    <form className="panel ticket" onSubmit={submit}>
      <div className="panel-title">Order Ticket — {symbol}</div>
      <div className="seg">
        <button type="button" className={side === "buy" ? "seg-on buy" : ""} onClick={() => setSide("buy")}>BUY</button>
        <button type="button" className={side === "sell" ? "seg-on sell" : ""} onClick={() => setSide("sell")}>SELL</button>
      </div>
      <div className="seg pro-only">
        <button type="button" className={mode === "cross" ? "seg-on" : ""} onClick={() => setMode("cross")}>Cross</button>
        <button type="button" className={mode === "isolated" ? "seg-on" : ""} onClick={() => setMode("isolated")}>Isolated</button>
      </div>
      <div className="lev-row pro-only">
        <span className="muted small">Leverage</span>
        <input
          type="range"
          min={0}
          max={LEV_STEPS.length - 1}
          step={1}
          value={levIdx}
          onChange={(e) => setLevIdx(parseInt(e.target.value, 10))}
        />
        <span className={`lev-val ${levClass}`}>{lev}x</span>
      </div>
      {lev >= 25 && (
        <div className="leverage-warn pro-only">
          High leverage: a {(100 / lev).toFixed(2)}% adverse move can liquidate.
        </div>
      )}
      <div className="seg">
        {TYPES.map((t) => (
          <button key={t.value} type="button"
                  className={type === t.value ? "seg-on" : ""}
                  onClick={() => setType(t.value)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="field">
        <label>Quantity</label>
        <input type="number" step="any" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
      </div>
      {type === "limit" && (
        <div className="field">
          <label>
            Limit Price
            {lastPrice != null && <button type="button" className="link" onClick={fillAtMarket}>use mkt</button>}
          </label>
          <input type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      )}
      {type === "stop_market" && (
        <div className="field">
          <label>
            Stop Price
            {lastPrice != null && <button type="button" className="link" onClick={fillAtMarket}>use mkt</button>}
          </label>
          <input type="number" step="any" min="0" value={stop} onChange={(e) => setStop(e.target.value)} />
        </div>
      )}
      <dl className="summary">
        <dt>Notional</dt>
        <dd>{notional != null ? notional.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</dd>
        <dt className="pro-only">Cost ({lev}x)</dt>
        <dd className="pro-only">{cost != null ? cost.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</dd>
        <dt className="pro-only">Est. liq. price</dt>
        <dd className={`pro-only ${lev >= 50 ? "danger" : lev >= 10 ? "warn" : ""}`}>
          {liq != null ? liq.toFixed(2) : "—"}
          {liqDistPct != null && (
            <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
              {liqDistPct.toFixed(2)}%
            </span>
          )}
        </dd>
      </dl>
      <button type="submit" disabled={busy} className={side === "buy" ? "btn-buy" : "btn-sell"}>
        {busy ? "placing..." : `${side.toUpperCase()} ${qty} ${symbol.split("-")[0]}`}
      </button>
      {msg && <div className="muted small">{msg}</div>}
    </form>
  );
}
