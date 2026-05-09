"use client";
import { useState } from "react";
import {
  Search, BookOpen, Video, MessageSquare, Mail, LifeBuoy,
  ChevronDown, ChevronRight, ExternalLink, Zap, Bot, BarChart2,
  Shield, CreditCard, Globe2, Check, ArrowUpRight, Clock,
} from "lucide-react";

const FAQS: { q: string; a: string; cat: string }[] = [
  {
    cat: "Getting started",
    q: "How do I connect a brokerage account?",
    a: "Go to Settings → Integrations and click 'Add broker'. We support Interactive Brokers, TD Ameritrade, Alpaca, and more. OAuth-based linking takes under 2 minutes.",
  },
  {
    cat: "Getting started",
    q: "What data is included in real-time feeds?",
    a: "All plans include real-time Level 1 quotes for US equities, futures (CME, CBOT), and major forex pairs. Level 2 order book data is available on Pro and Elite plans.",
  },
  {
    cat: "AI & Signals",
    q: "How are AI signals generated?",
    a: "Signals are produced by an ensemble of transformer-based models trained on 10+ years of multi-asset market data. They combine technical, macro, and sentiment features, and are scored 0–100 for confidence.",
  },
  {
    cat: "AI & Signals",
    q: "What does the signal confidence score mean?",
    a: "The score reflects the model's certainty (0 = no edge, 100 = very high conviction). Historically, signals above 75 have a 68% 5-day directional accuracy. Always apply your own risk management.",
  },
  {
    cat: "AI & Signals",
    q: "Can I auto-execute AI signals?",
    a: "Yes — with an Elite plan and a connected broker. Go to AI Traders, enable auto-execution on a strategy, and set your max position size and risk limits.",
  },
  {
    cat: "Billing",
    q: "How does plan proration work?",
    a: "When you upgrade mid-cycle, you're charged for the remaining days at the new plan rate, minus unused days on your current plan. The difference is billed immediately.",
  },
  {
    cat: "Billing",
    q: "Do you offer refunds?",
    a: "We offer a full refund within 7 days of any new subscription or upgrade. After that, cancellations take effect at the end of the current billing period — no partial refunds.",
  },
  {
    cat: "Security",
    q: "Is my trading data secure?",
    a: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are SOC 2 Type II certified and GDPR compliant. We never share your data with third parties.",
  },
  {
    cat: "Security",
    q: "What happens if I lose access to my 2FA device?",
    a: "Use one of your recovery codes (found in Settings → Security). If you've lost those too, contact support with your government-issued ID for account recovery.",
  },
];

const CATS = ["All", ...Array.from(new Set(FAQS.map((f) => f.cat)))];

const GUIDES = [
  { title: "Quick start: your first trade", time: "5 min", Icon: Zap },
  { title: "Setting up AI signal alerts", time: "3 min", Icon: Bot },
  { title: "Reading the market chart", time: "7 min", Icon: BarChart2 },
  { title: "Connecting your broker", time: "4 min", Icon: Globe2 },
  { title: "Understanding risk metrics", time: "6 min", Icon: Shield },
  { title: "Billing & subscription guide", time: "2 min", Icon: CreditCard },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = FAQS.filter((f) =>
    (catFilter === "All" || f.cat === catFilter) &&
    (f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Support</div>
        <h1 className="font-display text-4xl md:text-5xl leading-[0.95]">Help & Support</h1>
        <p className="text-sm text-muted-foreground max-w-lg">
          Docs, guides, and direct support for the Trevise platform.
        </p>

        {/* Search */}
        <div className="relative w-full max-w-xl mt-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs and FAQs…"
            className="w-full bg-white/[0.03] border hairline pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-accent/40"
          />
        </div>
      </div>

      {/* Contact cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            Icon: MessageSquare,
            title: "Live chat",
            sub: "Avg. response < 2 min",
            badge: "Online",
            badgeColor: "text-bull border-bull/25 bg-bull/10",
            action: "Start chat",
            primary: true,
          },
          {
            Icon: Mail,
            title: "Email support",
            sub: "support@trevise.app",
            badge: "< 4h SLA",
            badgeColor: "text-muted-foreground border-hairline bg-white/5",
            action: "Send email",
            primary: false,
          },
          {
            Icon: Globe2,
            title: "Community",
            sub: "4,200+ traders on Discord",
            badge: "1,840 online",
            badgeColor: "text-info border-info/25 bg-info/10",
            action: "Join Discord",
            primary: false,
          },
        ].map(({ Icon, title, sub, badge, badgeColor, action, primary }) => (
          <div key={title} className="glass p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Icon className="w-5 h-5 text-accent" strokeWidth={1.4} />
              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border ${badgeColor}`}>{badge}</span>
            </div>
            <div>
              <div className="font-display text-lg">{title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
            </div>
            <button className={`mt-auto text-[11px] py-2.5 flex items-center justify-center gap-1.5 ${
              primary
                ? "bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25"
                : "border hairline hover:bg-white/5 text-muted-foreground hover:text-foreground"
            }`}>
              {action} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Quick guides */}
      <section className="glass p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Video className="w-4 h-4 text-accent" /> Quick guides
          </h2>
          <button className="text-[11px] text-accent hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GUIDES.map(({ title, time, Icon }) => (
            <button key={title}
              className="flex items-center gap-3 p-3 border hairline hover:bg-white/[0.04] text-left group transition-colors">
              <div className="w-9 h-9 grid place-items-center bg-white/[0.04] border hairline shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" strokeWidth={1.4} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] truncate">{title}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" /> {time} read
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="glass p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display text-xl flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" /> Frequently asked
          </h2>
          <div className="flex gap-1 flex-wrap">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-1 text-[11px] border hairline transition-colors ${
                  catFilter === c ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">No results for "{search}"</div>
        )}

        <div className="flex flex-col divide-y divide-[var(--hairline)]">
          {filtered.map((f) => (
            <div key={f.q}>
              <button
                onClick={() => setOpen(open === f.q ? null : f.q)}
                className="w-full flex items-center justify-between gap-4 py-4 text-left group"
              >
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-accent mr-2">{f.cat}</span>
                  <span className="text-sm group-hover:text-foreground">{f.q}</span>
                </div>
                <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open === f.q ? "rotate-180" : ""}`} />
              </button>
              {open === f.q && (
                <div className="pb-4 text-[13px] text-muted-foreground leading-relaxed border-l-2 border-accent/40 pl-4 ml-0.5">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Status + system health */}
      <section className="glass p-5 grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-lg flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-accent" /> System status
          </h3>
          {[
            { svc: "Market data feeds",  ok: true  },
            { svc: "Order execution API", ok: true  },
            { svc: "AI signal engine",    ok: true  },
            { svc: "Notifications",       ok: true  },
            { svc: "WebSocket streams",   ok: false },
          ].map(({ svc, ok }) => (
            <div key={svc} className="flex items-center justify-between text-[12px]">
              <span className={ok ? "text-foreground" : "text-bear"}>{svc}</span>
              <span className={`text-[10px] px-2 py-0.5 border flex items-center gap-1 ${
                ok ? "text-bull border-bull/25 bg-bull/10" : "text-bear border-bear/25 bg-bear/10"
              }`}>
                {ok ? <><Check className="w-2.5 h-2.5" /> Operational</> : "Degraded"}
              </span>
            </div>
          ))}
          <a href="/status" className="text-[11px] text-accent hover:underline flex items-center gap-1 mt-1">
            Full status page <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-lg">Resources</h3>
          {[
            { label: "API reference",           sub: "REST + WebSocket docs" },
            { label: "Changelog",               sub: "What's new in Trevise" },
            { label: "Strategy library",        sub: "Community-built templates" },
            { label: "Risk management guide",   sub: "Position sizing & drawdowns" },
            { label: "Privacy policy",          sub: "How we handle your data" },
          ].map(({ label, sub }) => (
            <button key={label} className="flex items-center justify-between text-[12px] group">
              <div>
                <div className="group-hover:text-accent transition-colors">{label}</div>
                <div className="text-[10px] text-muted-foreground">{sub}</div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-accent transition-colors" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
