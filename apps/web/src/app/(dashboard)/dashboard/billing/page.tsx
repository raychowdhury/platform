"use client";
import { useState } from "react";
import {
  Check, Sparkles, Zap, Crown, CreditCard, Download, ArrowUpRight,
  Calendar, Receipt, AlertCircle, Plus, X, Shield, TrendingUp
} from "lucide-react";


type Cycle = "monthly" | "yearly";
type PlanId = "starter" | "pro" | "elite";

const PLANS: {
  id: PlanId;
  name: string;
  tagline: string;
  icon: any;
  monthly: number;
  yearly: number;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For curious traders getting started",
    icon: Sparkles,
    monthly: 0,
    yearly: 0,
    features: [
      "Real-time markets data",
      "5 watchlist symbols",
      "Basic charting",
      "Community access",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Everything you need to trade seriously",
    icon: Zap,
    monthly: 29,
    yearly: 290,
    highlight: true,
    features: [
      "Unlimited watchlists & alerts",
      "AI signals (200 / month)",
      "Advanced charting & indicators",
      "Portfolio analytics",
      "Priority support",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "For pros & funds",
    icon: Crown,
    monthly: 89,
    yearly: 890,
    features: [
      "Unlimited AI signals",
      "AI Traders auto-execution",
      "Custom strategies & backtests",
      "Dedicated account manager",
      "API access",
    ],
  },
];

const INVOICES = [
  { id: "INV-2026-0042", date: "May 1, 2026", amount: 29, status: "Paid", plan: "Pro · Monthly" },
  { id: "INV-2026-0036", date: "Apr 1, 2026", amount: 29, status: "Paid", plan: "Pro · Monthly" },
  { id: "INV-2026-0028", date: "Mar 1, 2026", amount: 29, status: "Paid", plan: "Pro · Monthly" },
  { id: "INV-2026-0019", date: "Feb 1, 2026", amount: 29, status: "Paid", plan: "Pro · Monthly" },
  { id: "INV-2026-0011", date: "Jan 1, 2026", amount: 29, status: "Paid", plan: "Pro · Monthly" },
];

export default function BillingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [currentPlan, setCurrentPlan] = useState<PlanId>("pro");
  const [confirmPlan, setConfirmPlan] = useState<PlanId | null>(null);
  const [methods, setMethods] = useState([
    { id: "pm_1", brand: "Visa", last4: "4242", exp: "08/28", primary: true },
    { id: "pm_2", brand: "Mastercard", last4: "5577", exp: "11/27", primary: false },
  ]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  const setPrimary = (id: string) =>
    setMethods((arr) => arr.map((m) => ({ ...m, primary: m.id === id })));
  const removeMethod = (id: string) =>
    setMethods((arr) => arr.filter((m) => m.id !== id));

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Billing & Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your plan, payment methods, and invoices.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Need help?</span>
          <button className="px-3 py-1.5 border hairline hover:bg-white/5">Contact billing</button>
        </div>
      </div>

      {/* Current plan summary */}
      <section className="glass p-5 grid md:grid-cols-4 gap-5">
        <div className="md:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Current plan</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 grid place-items-center bg-gradient-to-br from-primary/30 to-accent/30 border hairline">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-display text-2xl">Pro</div>
              <div className="text-xs text-muted-foreground">$29 / month · billed monthly</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-bull/10 text-bull border border-bull/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-bull" /> Active
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Renews Jun 1, 2026
            </span>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">AI signals</div>
          <div className="font-display text-2xl mt-2">137 <span className="text-sm text-muted-foreground">/ 200</span></div>
          <div className="h-1 bg-white/5 mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-primary" style={{ width: "68%" }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Resets in 23 days</div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Next invoice</div>
          <div className="font-display text-2xl mt-2 font-mono">$29.00</div>
          <div className="text-[10px] text-muted-foreground mt-1">Jun 1 · Visa •• 4242</div>
          <label className="mt-3 flex items-center gap-2 text-[11px] cursor-pointer">
            <span className={`relative w-7 h-4 transition-colors ${autoRenew ? "bg-primary" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 w-3 h-3 bg-background transition-all ${autoRenew ? "left-3.5" : "left-0.5"}`} />
            </span>
            <input type="checkbox" className="sr-only" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
            <span className="text-muted-foreground">Auto-renew</span>
          </label>
        </div>
      </section>

      {/* Plans */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-xl">Choose your plan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Switch anytime. Prorated to your next invoice.</p>
          </div>
          <div className="inline-flex border hairline p-0.5 text-xs">
            {(["monthly", "yearly"] as Cycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-3 py-1.5 capitalize ${cycle === c ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
              >
                {c} {c === "yearly" && <span className="text-bull text-[10px] ml-1">−17%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const Icon = p.icon;
            const price = cycle === "monthly" ? p.monthly : Math.round(p.yearly / 12);
            const isCurrent = p.id === currentPlan;
            return (
              <div
                key={p.id}
                className={`glass p-5 flex flex-col gap-4 relative ${p.highlight ? "ring-1 ring-primary/40" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-2 left-5 text-[9px] uppercase tracking-[0.2em] bg-primary text-primary-foreground px-2 py-0.5">
                    Most popular
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-accent" />
                  <span className="font-display text-lg">{p.name}</span>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">{p.tagline}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-4xl">${price}</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
                {cycle === "yearly" && p.yearly > 0 && (
                  <div className="text-[10px] text-muted-foreground -mt-3">${p.yearly} billed yearly</div>
                )}
                <ul className="flex flex-col gap-2 text-xs flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-bull shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCurrent}
                  onClick={() => setConfirmPlan(p.id)}
                  className={`text-xs py-2.5 font-medium ${
                    isCurrent
                      ? "bg-white/5 text-muted-foreground cursor-default"
                      : p.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border hairline hover:bg-white/5"
                  }`}
                >
                  {isCurrent ? "Current plan" : p.monthly > PLANS.find(x => x.id === currentPlan)!.monthly ? "Upgrade" : "Switch"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment methods + Billing details */}
      <section className="grid lg:grid-cols-3 gap-4">
        <div className="glass p-5 lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-accent" /> Payment methods
            </h3>
            <button
              onClick={() => setShowAddCard(true)}
              className="text-xs px-2.5 py-1.5 border hairline hover:bg-white/5 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add card
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {methods.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 border hairline bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 bg-gradient-to-br from-white/15 to-white/5 grid place-items-center text-[10px] font-mono">
                    {m.brand.slice(0, 4).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm">{m.brand} ending in {m.last4}</div>
                    <div className="text-[10px] text-muted-foreground">Expires {m.exp}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {m.primary ? (
                    <span className="text-[10px] px-2 py-1 bg-primary/15 text-primary border border-primary/25">Primary</span>
                  ) : (
                    <button onClick={() => setPrimary(m.id)} className="px-2 py-1 hover:bg-white/5 text-muted-foreground hover:text-foreground">
                      Make primary
                    </button>
                  )}
                  <button
                    onClick={() => removeMethod(m.id)}
                    className="p-1.5 text-muted-foreground hover:text-bear hover:bg-bear/10"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
            <Shield className="w-3 h-3" /> Encrypted & PCI-DSS compliant. We never store full card numbers.
          </div>
        </div>

        <div className="glass p-5 flex flex-col gap-4">
          <h3 className="font-display text-lg flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" /> Billing details
          </h3>
          <div className="text-xs flex flex-col gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Billed to</div>
              <div className="mt-1">Angelina Kovacs</div>
              <div className="text-muted-foreground">angelina@trevise.app</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Address</div>
              <div className="mt-1 leading-relaxed">
                Trevise Trading Ltd.<br />
                Reichenbachstr. 14<br />
                80469 München, Germany
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">VAT ID</div>
              <div className="mt-1 font-mono">DE 287 461 902</div>
            </div>
          </div>
          <button className="text-xs px-3 py-2 border hairline hover:bg-white/5 flex items-center justify-center gap-1.5">
            Edit billing details <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </section>

      {/* Invoice history */}
      <section className="glass p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" /> Invoice history
          </h3>
          <button className="text-xs px-2.5 py-1.5 border hairline hover:bg-white/5 flex items-center gap-1">
            <Download className="w-3 h-3" /> Export all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b hairline">
                <th className="text-left py-2 font-medium">Invoice</th>
                <th className="text-left py-2 font-medium">Date</th>
                <th className="text-left py-2 font-medium">Plan</th>
                <th className="text-right py-2 font-medium">Amount</th>
                <th className="text-left py-2 pl-4 font-medium">Status</th>
                <th className="text-right py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv) => (
                <tr key={inv.id} className="border-b hairline last:border-0 hover:bg-white/[0.02] group">
                  <td className="py-3 font-mono">{inv.id}</td>
                  <td className="py-3 text-muted-foreground">{inv.date}</td>
                  <td className="py-3 text-muted-foreground">{inv.plan}</td>
                  <td className="py-3 text-right font-mono">${inv.amount.toFixed(2)}</td>
                  <td className="py-3 pl-4">
                    <span className="text-[10px] px-2 py-0.5 bg-bull/10 text-bull border border-bull/20">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button className="opacity-60 group-hover:opacity-100 p-1.5 hover:bg-white/5" title="Download PDF">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cancel zone */}
      <section className="glass p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-bear/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-bear mt-0.5" />
          <div>
            <div className="text-sm font-medium">Cancel subscription</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              You'll keep Pro access until Jun 1, 2026. No further charges after cancellation.
            </div>
          </div>
        </div>
        <button className="text-xs px-3 py-2 border border-bear/30 text-bear hover:bg-bear/10">
          Cancel plan
        </button>
      </section>

      {/* Add card modal */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowAddCard(false)}>
          <div className="glass max-w-md w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Add payment method</h3>
              <button onClick={() => setShowAddCard(false)} className="p-1 hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">Card number</span>
                <input className="bg-white/[0.03] border hairline px-3 py-2 font-mono" placeholder="1234 1234 1234 1234" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground">Expiry</span>
                  <input className="bg-white/[0.03] border hairline px-3 py-2 font-mono" placeholder="MM / YY" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground">CVC</span>
                  <input className="bg-white/[0.03] border hairline px-3 py-2 font-mono" placeholder="123" />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">Cardholder name</span>
                <input className="bg-white/[0.03] border hairline px-3 py-2" placeholder="Angelina Kovacs" />
              </label>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setShowAddCard(false)} className="flex-1 text-xs py-2.5 border hairline hover:bg-white/5">Cancel</button>
              <button
                onClick={() => {
                  setMethods((arr) => [...arr, { id: `pm_${Date.now()}`, brand: "Visa", last4: "0000", exp: "01/30", primary: false }]);
                  setShowAddCard(false);
                }}
                className="flex-1 text-xs py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                Add card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm plan change modal */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setConfirmPlan(null)}>
          <div className="glass max-w-md w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl">Switch to {PLANS.find((p) => p.id === confirmPlan)?.name}?</h3>
            <p className="text-xs text-muted-foreground">
              You'll be charged a prorated amount today, and your billing cycle continues on the 1st of each month.
            </p>
            <div className="border hairline p-3 text-xs flex justify-between">
              <span className="text-muted-foreground">New monthly</span>
              <span className="font-mono">
                ${cycle === "monthly"
                  ? PLANS.find((p) => p.id === confirmPlan)?.monthly
                  : Math.round((PLANS.find((p) => p.id === confirmPlan)?.yearly ?? 0) / 12)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmPlan(null)} className="flex-1 text-xs py-2.5 border hairline hover:bg-white/5">Cancel</button>
              <button
                onClick={() => {
                  setCurrentPlan(confirmPlan);
                  setConfirmPlan(null);
                }}
                className="flex-1 text-xs py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                Confirm switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
