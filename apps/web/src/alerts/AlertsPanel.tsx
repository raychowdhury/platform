import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { Alert, AlertCondition } from "../api/types";

interface Props {
  symbol: string;
  alerts: Alert[];
  lastPrice: number | null;
  onChanged: () => void;
}

export default function AlertsPanel({ symbol, alerts, lastPrice, onChanged }: Props) {
  const [cond, setCond] = useState<AlertCondition>("price_above");
  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const t = parseFloat(threshold);
      if (!isFinite(t) || t <= 0) throw new Error("threshold must be > 0");
      await api.createAlert({ symbol, condition: cond, threshold: t });
      setThreshold("");
      onChanged();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m.includes("402") ? "Plan quota reached — upgrade for more." : m);
    } finally {
      setBusy(false);
    }
  }

  function fillMkt() {
    if (lastPrice != null) setThreshold(lastPrice.toFixed(2));
  }

  async function remove(id: string) {
    try { await api.deleteAlert(id); onChanged(); } catch { /* ignore */ }
  }

  const visible = alerts.filter((a) => a.symbol === symbol);

  return (
    <div className="panel">
      <div className="panel-title">Alerts — {symbol}</div>
      <form onSubmit={submit} className="alert-form">
        <div className="seg">
          <button type="button" className={cond === "price_above" ? "seg-on" : ""} onClick={() => setCond("price_above")}>≥ above</button>
          <button type="button" className={cond === "price_below" ? "seg-on" : ""} onClick={() => setCond("price_below")}>≤ below</button>
        </div>
        <div className="field">
          <label>
            Threshold
            {lastPrice != null && <button type="button" className="link" onClick={fillMkt}>use mkt</button>}
          </label>
          <input type="number" step="any" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>
        <button type="submit" disabled={busy || !threshold}>{busy ? "..." : "Create alert"}</button>
        {err && <div className="error small">{err}</div>}
      </form>
      {visible.length > 0 && (
        <table className="oms-table" style={{ marginTop: 10 }}>
          <thead>
            <tr><th>When</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a.id}>
                <td>{a.condition === "price_above" ? "≥" : "≤"} {a.threshold}</td>
                <td className={a.status === "triggered" ? "up" : ""}>{a.status}</td>
                <td><button className="link" onClick={() => remove(a.id)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
