"use client";
import Link from "next/link";
import { ArrowRight, Check, Minus, ShieldCheck, Zap, Globe2, Server, Headphones } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Fragment } from "react";

function Eyebrow({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-accent">{code}</span>
      <span className="h-px w-6 bg-[var(--hairline)]" />
      <span>{children}</span>
    </div>
  );
}

const tiers = [
  {
    code: "TIER/01",
    name: "Starter",
    price: "$0",
    per: "/forever",
    desc: "Real-time charts and watchlists for active retail.",
    cta: "Open free account",
    primary: false,
  },
  {
    code: "TIER/02",
    name: "Pro",
    price: "$49",
    per: "/month",
    desc: "Order flow, footprint, AI signals, and execution.",
    cta: "Start 14-day trial",
    primary: true,
  },
  {
    code: "TIER/03",
    name: "Institutional",
    price: "Custom",
    per: "",
    desc: "FIX, dedicated infra, compliance reporting.",
    cta: "Talk to desk",
    primary: false,
  },
];

type Cell = boolean | string;
type Row = { feat: string; values: [Cell, Cell, Cell] };
type Group = { title: string; rows: Row[] };

const groups: Group[] = [
  {
    title: "Market data",
    rows: [
      { feat: "Real-time level 1 quotes", values: [true, true, true] },
      { feat: "Level 2 order book depth", values: [false, true, true] },
      { feat: "Time & sales (tick stream)", values: [false, true, true] },
      { feat: "Order flow + footprint charts", values: [false, true, true] },
      { feat: "Dark pool prints + GEX overlay", values: [false, true, true] },
      { feat: "Options chain + skew analytics", values: ["15-min delay", "Real-time", "Real-time"] },
      { feat: "Historical depth", values: ["1 year", "10 years", "Full archive"] },
    ],
  },
  {
    title: "Charts & analytics",
    rows: [
      { feat: "Watchlist symbols", values: ["20", "Unlimited", "Unlimited"] },
      { feat: "Concurrent chart layouts", values: ["2", "20", "Unlimited"] },
      { feat: "Custom indicators", values: ["Built-in only", "Pine + Python", "Pine + Python + C++"] },
      { feat: "Multi-monitor workspaces", values: [false, true, true] },
      { feat: "Replay & backtesting engine", values: [false, true, true] },
    ],
  },
  {
    title: "AI & intelligence",
    rows: [
      { feat: "Daily AI market summary", values: [true, true, true] },
      { feat: "Live AI research notes", values: [false, true, true] },
      { feat: "AI trading copilots", values: [false, "5 copilots", "Unlimited"] },
      { feat: "Signal alerts per month", values: ["50", "Unlimited", "Unlimited"] },
      { feat: "Custom model fine-tuning", values: [false, false, true] },
    ],
  },
  {
    title: "Execution & APIs",
    rows: [
      { feat: "Execution latency", values: ["~250ms", "Sub-15ms", "Sub-2ms (co-lo)"] },
      { feat: "Order types", values: ["Market, Limit", "Bracket, OCO, Algo, Iceberg", "Full algo suite"] },
      { feat: "REST + WebSocket API", values: [false, true, true] },
      { feat: "FIX 4.4 connectivity", values: [false, false, true] },
      { feat: "Connected venues", values: ["12", "38", "All 38 + custom"] },
    ],
  },
  {
    title: "Workspace & collaboration",
    rows: [
      { feat: "Trade journal & analytics", values: [true, true, true] },
      { feat: "Shared watchlists & layouts", values: [false, true, true] },
      { feat: "Team seats", values: ["1", "Up to 5", "Unlimited"] },
      { feat: "Community access", values: [true, true, true] },
    ],
  },
  {
    title: "Compliance & support",
    rows: [
      { feat: "SOC 2 Type II + GDPR", values: [true, true, true] },
      { feat: "Compliance + audit export", values: [false, false, true] },
      { feat: "Single sign-on (SSO/SAML)", values: [false, false, true] },
      { feat: "Dedicated cluster + VPC peering", values: [false, false, true] },
      { feat: "Support", values: ["Community", "Priority email + chat", "24/7 desk + dedicated CSM"] },
    ],
  },
];

const faqs = [
  {
    q: "Do you charge exchange or market data fees?",
    a: "Real-time US equities and futures data is included in every tier at no extra cost. International market subscriptions and professional-use data licenses are billed at exchange-published rates with full transparency.",
  },
  {
    q: "Can I switch tiers or cancel anytime?",
    a: "Yes. Upgrades are prorated and effective immediately. Downgrades and cancellations take effect at the end of your current billing period — no termination fees.",
  },
  {
    q: "What's included in the 14-day Pro trial?",
    a: "Full Pro tier access — order flow, footprint, live AI notes, sub-15ms execution, REST + WebSocket APIs. No credit card required to start.",
  },
  {
    q: "How does Institutional onboarding work?",
    a: "Our desk handles FIX certification, co-location, dedicated cluster provisioning, and compliance integration. Typical timeline is 2–4 weeks from contract to live trading.",
  },
  {
    q: "Is there a discount for annual billing?",
    a: "Yes — Pro is $39/month when billed annually (a 20% discount). Institutional pricing is always custom and negotiated annually.",
  },
];

function CellView({ v }: { v: Cell }) {
  if (v === true) return <Check className="w-4 h-4 text-accent" />;
  if (v === false) return <Minus className="w-4 h-4 text-muted-foreground/40" />;
  return <span className="text-[12.5px] text-foreground/85 font-mono">{v}</span>;
}

export default function PricingPage() {
  return (
    <MarketingLayout>
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section className="border-b hairline">
        <div className="max-w-[1320px] mx-auto px-5 lg:px-8 pt-20 pb-14">
          <Eyebrow code="00">Pricing</Eyebrow>
          <h1 className="mt-6 font-display text-[44px] md:text-[64px] leading-[0.98] tracking-[-0.03em] max-w-3xl">
            Transparent pricing.<br/>Institutional power.
          </h1>
          <p className="mt-6 text-[14px] text-muted-foreground max-w-xl">
            One terminal. Three tiers. Real-time data and execution included on every plan — no hidden exchange surcharges on equities or futures.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-accent" /> SOC 2 · GDPR</span>
            <span className="inline-flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-accent" /> Sub-15ms execution</span>
            <span className="inline-flex items-center gap-2"><Globe2 className="w-3.5 h-3.5 text-accent" /> 38 venues</span>
            <span className="inline-flex items-center gap-2"><Server className="w-3.5 h-3.5 text-accent" /> 99.99% uptime SLA</span>
          </div>
        </div>
      </section>

      {/* Tier cards */}
      <section className="border-b hairline">
        <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-px bg-[var(--hairline)] border hairline">
            {tiers.map((t) => (
              <div key={t.code} className={`bg-background p-7 flex flex-col gap-5 ${t.primary ? "ring-1 ring-accent/40 relative z-10" : ""}`}>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
                  <span className="text-accent">{t.code}</span>
                  {t.primary && <span className="text-accent">RECOMMENDED</span>}
                </div>
                <div>
                  <div className="font-display text-[22px] tracking-tight">{t.name}</div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-mono text-[40px] tracking-tight">{t.price}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{t.per}</span>
                  </div>
                  <p className="mt-3 text-[12.5px] text-muted-foreground">{t.desc}</p>
                </div>
                <Link
                  href="/signup"
                  className={`mt-2 text-[11px] font-mono uppercase tracking-[0.2em] py-3 text-center inline-flex items-center justify-center gap-2 ${
                    t.primary ? "bg-accent text-accent-foreground hover:brightness-110" : "border hairline hover:bg-muted"
                  }`}
                >
                  {t.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-b hairline">
        <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <Eyebrow code="01">Compare</Eyebrow>
              <h2 className="mt-6 font-display text-[36px] md:text-[44px] leading-[1.02] tracking-[-0.025em]">
                Everything in every tier.
              </h2>
            </div>
            <p className="max-w-md text-[13px] text-muted-foreground">
              Side-by-side breakdown of data, analytics, execution, and support across Starter, Pro, and Institutional.
            </p>
          </div>

          <div className="mt-12 border hairline overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b hairline">
                  <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-5 py-4 w-[40%]">
                    Feature
                  </th>
                  {tiers.map((t) => (
                    <th key={t.code} className="text-left px-5 py-4 w-[20%]">
                      <div className="flex flex-col gap-1">
                        <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${t.primary ? "text-accent" : "text-muted-foreground"}`}>
                          {t.code}
                        </span>
                        <span className="font-display text-[16px] tracking-tight">{t.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.title}>
                    <tr className="bg-muted/40 border-b hairline">
                      <td colSpan={4} className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/70">
                        {g.title}
                      </td>
                    </tr>
                    {g.rows.map((r, i) => (
                      <tr key={`${g.title}-${i}`} className="border-b hairline last:border-b-0 hover:bg-muted/20">
                        <td className="px-5 py-3.5 text-foreground/85">{r.feat}</td>
                        {r.values.map((v, idx) => (
                          <td key={idx} className="px-5 py-3.5"><CellView v={v} /></td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b hairline">
        <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <Eyebrow code="02">FAQ</Eyebrow>
            <h2 className="mt-6 font-display text-[34px] leading-[1.02] tracking-[-0.025em]">
              Questions, answered.
            </h2>
            <p className="mt-5 text-[13px] text-muted-foreground">
              Still wondering about something? Our desk replies in under an hour during market hours.
            </p>
            <a
              href="mailto:desk@trevise.com"
              className="mt-6 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-accent hover:underline"
            >
              <Headphones className="w-3.5 h-3.5" /> desk@trevise.com
            </a>
          </div>
          <div className="lg:col-span-8 divide-y divide-[var(--hairline)] border-y hairline">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5 px-1">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-6">
                  <span className="text-[14px] text-foreground/90">{f.q}</span>
                  <span className="font-mono text-[18px] text-muted-foreground group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed max-w-2xl">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b hairline">
        <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <Eyebrow code="03">Get started</Eyebrow>
            <h2 className="mt-6 font-display text-[40px] md:text-[56px] leading-[0.98] tracking-[-0.03em]">
              Start free.<br/>Scale when you're ready.
            </h2>
            <p className="mt-6 text-[14px] text-muted-foreground max-w-xl">
              No credit card on the free tier. Upgrade to Pro in one click. Talk to our desk for Institutional terms.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-3">
            <Link href="/signup" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center justify-between">
              Open free account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard/overview" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
              Try the live demo <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="mailto:desk@trevise.com" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
              Talk to the desk <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
    </MarketingLayout>
  );
}
