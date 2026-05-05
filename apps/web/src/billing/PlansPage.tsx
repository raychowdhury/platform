import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Plan, Subscription } from "../api/types";

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const [p, s] = await Promise.all([api.listPlans(), api.mySubscription()]);
      setPlans(p);
      setSub(s);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => { load(); }, []);

  async function pick(code: string) {
    setBusy(code);
    setErr(null);
    setMsg(null);
    try {
      const next = await api.upgradePlan(code);
      setSub(next);
      setMsg(`switched to ${next.plan_code}`);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      // 501 → Stripe configured but SDK not wired; tell the user
      if (m.includes("501")) {
        setErr("Stripe checkout not yet wired — set STRIPE_SECRET_KEY=\"\" to enable dev upgrade.");
      } else {
        setErr(m);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="plans-page">
      <header className="plans-header">
        <strong>Plans</strong>
        <span className="spacer" />
        <Link to="/" className="link">← back</Link>
      </header>

      <div className="muted small" style={{ padding: "12px 24px" }}>
        Current plan: <strong>{sub?.plan_code ?? "—"}</strong> · {sub?.status ?? ""}
      </div>

      {err && <div className="error" style={{ padding: "0 24px" }}>{err}</div>}
      {msg && <div className="muted small" style={{ padding: "0 24px" }}>{msg}</div>}

      <div className="plans-grid">
        {plans.map((p) => {
          const current = sub?.plan_code === p.code;
          return (
            <div key={p.code} className={`plan-card ${current ? "plan-current" : ""}`}>
              <div className="plan-name">{p.name}</div>
              <div className="plan-price">
                ${(p.price_cents / 100).toFixed(0)}
                <span className="muted small">/{p.interval}</span>
              </div>
              <ul className="plan-feats">
                <li>{p.max_indicators} indicators</li>
                <li>{p.max_layouts} layouts</li>
                <li>{p.max_alerts} alerts</li>
                <li>{p.history_days}d history</li>
              </ul>
              <button
                disabled={current || busy === p.code}
                onClick={() => pick(p.code)}
              >
                {current ? "Current" : busy === p.code ? "Switching..." : "Choose"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
