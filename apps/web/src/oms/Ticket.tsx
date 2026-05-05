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

export default function Ticket({ symbol, lastPrice, onPlaced }: Props) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [qty, setQty] = useState("0.001");
  const [price, setPrice] = useState("");
  const [stop, setStop] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
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

  return (
    <form className="panel ticket" onSubmit={submit}>
      <div className="panel-title">Order Ticket — {symbol}</div>
      <div className="seg">
        <button type="button" className={side === "buy" ? "seg-on buy" : ""} onClick={() => setSide("buy")}>BUY</button>
        <button type="button" className={side === "sell" ? "seg-on sell" : ""} onClick={() => setSide("sell")}>SELL</button>
      </div>
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
      <div className="muted small">
        notional: {notional != null ? notional.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
      </div>
      <button type="submit" disabled={busy} className={side === "buy" ? "btn-buy" : "btn-sell"}>
        {busy ? "placing..." : `${side.toUpperCase()} ${qty} ${symbol.split("-")[0]}`}
      </button>
      {msg && <div className="muted small">{msg}</div>}
    </form>
  );
}
