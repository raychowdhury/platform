"use client";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import {
  ArrowRight, Compass, Sparkles, Users, Globe2,
  Cpu, ShieldCheck, LineChart, Building2,
} from "lucide-react";

function Eyebrow({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-accent">{code}</span>
      <span className="h-px w-6 bg-[var(--hairline)]" />
      <span>{children}</span>
    </div>
  );
}

const STATS = [
  { k: "Founded",   v: "2024" },
  { k: "Headcount", v: "42" },
  { k: "Offices",   v: "NYC · Lisbon · Tokyo" },
  { k: "Funding",   v: "Series A · $28M" },
];

const VALUES = [
  { code: "P/01", Icon: Compass,    t: "Editorial first",          d: "Charts, type, and pace that respect attention. The screen is the product." },
  { code: "P/02", Icon: Sparkles,   t: "Honest models",            d: "Confidence is shown. Sources are linked. Hindsight is never advertised." },
  { code: "P/03", Icon: Users,      t: "Operators, not influencers", d: "We surface risk-adjusted performance — not loud opinions." },
  { code: "P/04", Icon: Globe2,     t: "Open by default",          d: "Bring your venues, your data, your code. Lock-in is a bug." },
  { code: "P/05", Icon: ShieldCheck,t: "Compliance is a feature",  d: "Audit trail, RBAC, and reporting baked in — not bolted on." },
  { code: "P/06", Icon: Cpu,        t: "Latency is respect",       d: "Every millisecond between idea and execution is borrowed. We pay it back." },
];

const TEAM = [
  { n: "Angelina Park",  r: "Co-founder & CEO",   b: "ex-Citadel, Two Sigma" },
  { n: "Marcus Vale",    r: "Co-founder & CTO",   b: "ex-Stripe, Vercel" },
  { n: "Sora Tanaka",    r: "Head of Research",   b: "PhD MIT, ex-Renaissance" },
  { n: "Daniel Kraus",   r: "Head of Design",     b: "ex-Linear, Apple" },
  { n: "Maya Reis",      r: "Head of Markets",    b: "ex-NYSE Institutional" },
  { n: "Iván Cortés",    r: "Head of Infra",      b: "ex-Cloudflare" },
  { n: "Hannah Liu",     r: "Head of Quant",      b: "ex-Jane Street" },
  { n: "Omar Faruk",     r: "Head of Compliance", b: "ex-Goldman Sachs" },
];

const TIMELINE = [
  { y: "2024 · Q1", t: "Founded in NYC",            d: "Three co-founders write the first prototype on a single Bloomberg replacement screen." },
  { y: "2024 · Q3", t: "Seed round · $6M",          d: "Sequoia leads. First 12 institutional design partners onboard." },
  { y: "2025 · Q1", t: "Order flow + footprint v1", d: "Sub-15ms execution path live across NASDAQ, NYSE, CME." },
  { y: "2025 · Q3", t: "AI Traders launches",       d: "Autonomous agent runtime with full audit and risk caps." },
  { y: "2026 · Q1", t: "Series A · $28M",           d: "Index Ventures leads. Lisbon and Tokyo offices open." },
  { y: "2026 · Q2", t: "Institutional tier",        d: "FIX 4.4 + co-location + dedicated cluster offering." },
];

const BACKERS = ["SEQUOIA", "INDEX", "BENCHMARK", "FOUNDERS FUND", "RIBBIT", "USV", "GENERAL CATALYST", "INITIALIZED"];

export default function About() {
  return (
    <MarketingLayout>
      <div className="bg-background text-foreground">
        {/* Hero */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 pt-20 pb-14 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8">
              <Eyebrow code="00">About</Eyebrow>
              <h1 className="mt-6 font-display text-[44px] md:text-[68px] leading-[0.98] tracking-[-0.03em]">
                Built by people who've<br/>sat on the desk.
              </h1>
              <p className="mt-7 text-[14.5px] text-muted-foreground max-w-2xl leading-relaxed">
                Trevise is the institutional trading workstation. We started in 2024 because the desk had ten tools open and none of them spoke to each other. One screen. Real data. Real execution. No noise.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col justify-end gap-3">
              <Link href="/dashboard/overview" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center justify-between">
                Open the terminal <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="mailto:careers@trevise.com" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
                See open roles <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--hairline)] border-x hairline">
              {STATS.map((s, i) => (
                <div key={s.k} className="bg-background p-7">
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-4 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">{s.k}</div>
                  <div className="mt-2 font-display text-[28px] tracking-tight">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <Eyebrow code="01">Mission</Eyebrow>
              <h2 className="mt-6 font-display text-[34px] md:text-[40px] leading-[1.02] tracking-[-0.025em]">
                One terminal.<br/>Every workflow.
              </h2>
            </div>
            <div className="lg:col-span-8 space-y-6 text-[14px] text-muted-foreground leading-relaxed border-l hairline pl-8">
              <p>
                Idea, research, execution, review — they belong in the same place. Trevise unifies real-time market data, AI signals, multi-venue routing, and post-trade analytics on a single canvas built for the speed of decision-making, not the speed of marketing.
              </p>
              <p className="text-foreground/80">
                We measure ourselves on three numbers: time from insight to order, slippage versus reference price, and the percentage of decisions a trader can review with full provenance. Everything else is detail.
              </p>
              <div className="flex flex-wrap gap-x-8 gap-y-3 pt-4 border-t hairline">
                {[
                  { Icon: LineChart, l: "Sub-15ms execution" },
                  { Icon: Building2, l: "38 connected venues" },
                  { Icon: ShieldCheck, l: "SOC 2 Type II" },
                ].map((m) => (
                  <span key={m.l} className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-foreground/85">
                    <m.Icon className="w-3.5 h-3.5 text-accent" /> {m.l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <Eyebrow code="02">Principles</Eyebrow>
                <h2 className="mt-6 font-display text-[36px] md:text-[44px] leading-[1.02] tracking-[-0.025em]">
                  What we believe.
                </h2>
              </div>
              <p className="max-w-md text-[13px] text-muted-foreground">
                Six rules we keep on the wall. Every product decision goes through them.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--hairline)] border hairline">
              {VALUES.map((v) => (
                <div key={v.code} className="bg-background p-7 flex flex-col gap-4">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
                    <span className="text-accent">{v.code}</span>
                    <v.Icon className="w-4 h-4 text-foreground/70" />
                  </div>
                  <div className="font-display text-[20px] tracking-tight">{v.t}</div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <Eyebrow code="03">Timeline</Eyebrow>
              <h2 className="mt-6 font-display text-[34px] md:text-[40px] leading-[1.02] tracking-[-0.025em]">
                From prototype<br/>to terminal.
              </h2>
              <p className="mt-5 text-[13px] text-muted-foreground">
                Two years, six milestones. Still day one.
              </p>
            </div>
            <div className="lg:col-span-8">
              <div className="border-l hairline">
                {TIMELINE.map((m, i) => (
                  <div key={m.y} className="relative pl-8 pb-8 last:pb-0">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-accent" />
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-3">
                      <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                      <span>{m.y}</span>
                    </div>
                    <div className="mt-2 font-display text-[20px] tracking-tight">{m.t}</div>
                    <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed max-w-xl">{m.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <Eyebrow code="04">Team</Eyebrow>
                <h2 className="mt-6 font-display text-[36px] md:text-[44px] leading-[1.02] tracking-[-0.025em]">
                  Operators, designers, scientists.
                </h2>
              </div>
              <p className="max-w-md text-[13px] text-muted-foreground">
                Forty-two people across three cities. Half have run a desk. Half have shipped a product. A few have done both.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--hairline)] border hairline">
              {TEAM.map((p, i) => (
                <div key={p.n} className="bg-background p-6 flex flex-col gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
                    <span className="text-accent">M/{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-muted-foreground">Active</span>
                  </div>
                  <div className="w-12 h-12 bg-muted border hairline grid place-items-center font-mono text-[13px] tracking-wider">
                    {p.n.split(" ").map((s) => s[0]).join("")}
                  </div>
                  <div>
                    <div className="font-display text-[16px] tracking-tight">{p.n}</div>
                    <div className="mt-1 text-[12px] text-foreground/70">{p.r}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.b}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Backers */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-12">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
              Backed by · 8 funds
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px bg-[var(--hairline)] border hairline">
              {BACKERS.map((b) => (
                <div key={b} className="bg-background py-5 text-center font-mono text-[11px] tracking-[0.18em] text-foreground/80 hover:text-foreground hover:bg-muted">
                  {b}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-24 grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <Eyebrow code="05">Join us</Eyebrow>
              <h2 className="mt-6 font-display text-[44px] md:text-[60px] leading-[0.98] tracking-[-0.03em]">
                Build the terminal<br/>the desk deserves.
              </h2>
              <p className="mt-6 text-[14px] text-muted-foreground max-w-xl">
                We're hiring across research, infrastructure, design, and markets. Remote-friendly with hubs in NYC, Lisbon, and Tokyo.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <a href="mailto:careers@trevise.com" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center justify-between">
                Open roles <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/pricing" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
                See pricing <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="mailto:press@trevise.com" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
                Press inquiries <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
