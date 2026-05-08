"use client";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { CheckCircle2, AlertTriangle, Clock, Activity, ArrowRight, Radio } from "lucide-react";

function Eyebrow({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-accent">{code}</span>
      <span className="h-px w-6 bg-[var(--hairline)]" />
      <span>{children}</span>
    </div>
  );
}

type Health = "operational" | "degraded" | "outage";

const SERVICES: { name: string; status: Health; latency: string; uptime: string }[] = [
  { name: "Web Application",    status: "operational", latency: "84ms",  uptime: "99.998%" },
  { name: "Authentication",     status: "operational", latency: "112ms", uptime: "99.999%" },
  { name: "Market Data Feed",   status: "operational", latency: "12ms",  uptime: "99.996%" },
  { name: "AI Signals API",     status: "operational", latency: "240ms", uptime: "99.94%"  },
  { name: "AI Traders Runtime", status: "degraded",    latency: "1.2s",  uptime: "99.81%"  },
  { name: "Order Routing",      status: "operational", latency: "38ms",  uptime: "99.997%" },
  { name: "Webhooks & Alerts",  status: "operational", latency: "190ms", uptime: "99.95%"  },
  { name: "Database (Primary)", status: "operational", latency: "4ms",   uptime: "99.999%" },
  { name: "File Storage",       status: "operational", latency: "67ms",  uptime: "99.998%" },
];

const REGIONS = [
  { name: "North America", code: "us-east-1",       status: "operational" as Health, lat: "84ms"  },
  { name: "Europe",        code: "eu-west-1",       status: "operational" as Health, lat: "92ms"  },
  { name: "Asia Pacific",  code: "ap-southeast-1",  status: "degraded"    as Health, lat: "210ms" },
  { name: "South America", code: "sa-east-1",       status: "operational" as Health, lat: "180ms" },
];

const INCIDENTS = [
  { date: "May 8, 2026 · 09:42 UTC", title: "Elevated latency on AI Traders Runtime", status: "Investigating", severity: "Minor", body: "We're seeing elevated p95 latency for autonomous agents in ap-southeast. Trading is unaffected. Engineers are scaling capacity." },
  { date: "May 5, 2026 · 14:10 UTC", title: "Resolved — Webhook delivery delays",      status: "Resolved",      severity: "Minor", body: "Webhook delivery delays of up to 90s for ~22 minutes due to a queue back-pressure event. All retries delivered successfully." },
  { date: "Apr 28, 2026 · 03:15 UTC", title: "Resolved — Brief auth provider outage",  status: "Resolved",      severity: "Major", body: "Sign-ins failed for 6 minutes due to upstream identity provider incident. Mitigated via failover. Post-mortem published." },
  { date: "Apr 19, 2026 · 22:48 UTC", title: "Resolved — Market data lag (NASDAQ)",    status: "Resolved",      severity: "Minor", body: "Lag of 1-3s for NASDAQ-listed tickers for 11 minutes. Caused by upstream feed handler restart." },
];

const dotColor = (s: Health) =>
  s === "operational" ? "bg-bull" : s === "degraded" ? "bg-warning" : "bg-bear";

const StatusDot = ({ s }: { s: Health }) => (
  <span className={`inline-block w-1.5 h-1.5 ${dotColor(s)} ${s === "operational" ? "animate-pulse" : ""}`} />
);

const StatusBadge = ({ s }: { s: Health }) => {
  const cfg = {
    operational: { l: "Operational", c: "text-bull" },
    degraded:    { l: "Degraded",    c: "text-warning" },
    outage:      { l: "Outage",      c: "text-bear" },
  }[s];
  return (
    <span className={`text-[10px] font-mono uppercase tracking-[0.18em] ${cfg.c}`}>{cfg.l}</span>
  );
};

export default function Status() {
  const allOk = SERVICES.every((s) => s.status === "operational");

  // 90 days uptime grid (deterministic)
  const days = Array.from({ length: 90 }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    if (i === 7 || i === 21) return "outage" as Health;
    if (r > 0.94) return "degraded" as Health;
    return "operational" as Health;
  });

  return (
    <MarketingLayout>
      <div className="bg-background text-foreground">
        {/* Hero status */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 pt-20 pb-12">
            <Eyebrow code="00">System status</Eyebrow>

            <div className="mt-6 grid lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-8">
                <h1 className="font-display text-[44px] md:text-[64px] leading-[0.98] tracking-[-0.03em]">
                  {allOk ? "All systems normal." : "Some systems degraded."}
                </h1>
                <div className="mt-5 flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  {allOk ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-bull" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  )}
                  <span>As of May 8, 2026 · 14:32 UTC</span>
                  <span className="text-foreground/30">/</span>
                  <span className="inline-flex items-center gap-1.5"><Radio className="w-3 h-3 text-accent animate-pulse" /> Auto-refresh 30s</span>
                </div>
              </div>

              <form className="lg:col-span-4 flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
                <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">Subscribe to incidents</label>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="you@firm.com"
                    className="flex-1 bg-background border hairline px-3 py-3 text-[13px] font-mono placeholder:text-muted-foreground/50 outline-none focus:border-accent"
                  />
                  <button className="px-4 bg-accent text-accent-foreground text-[11px] font-mono uppercase tracking-[0.2em] hover:brightness-110 inline-flex items-center gap-2">
                    Notify <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Services table */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <Eyebrow code="01">Services</Eyebrow>
                <h2 className="mt-4 font-display text-[28px] tracking-tight">Realtime service health</h2>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {SERVICES.length} components monitored
              </div>
            </div>

            <div className="mt-8 border hairline divide-y divide-[var(--hairline)]">
              {SERVICES.map((s) => (
                <div key={s.name} className="grid grid-cols-12 items-center px-5 py-4 hover:bg-muted/30">
                  <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                    <StatusDot s={s.status} />
                    <span className="text-[13.5px] truncate">{s.name}</span>
                  </div>
                  <div className="hidden md:block col-span-3 font-mono text-[12px] text-muted-foreground">{s.latency}</div>
                  <div className="hidden md:block col-span-2 font-mono text-[12px] text-muted-foreground">{s.uptime}</div>
                  <div className="col-span-6 md:col-span-2 text-right md:text-left">
                    <StatusBadge s={s.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Uptime + regions */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16 grid lg:grid-cols-12 gap-px bg-[var(--hairline)] border hairline">
            {/* Uptime grid */}
            <div className="bg-background lg:col-span-8 p-7">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                  <Activity className="w-3.5 h-3.5 text-accent" /> Uptime · last 90 days
                </div>
                <div className="font-mono text-[12px] text-bull">99.973%</div>
              </div>
              <div className="mt-6 grid grid-cols-[repeat(90,minmax(0,1fr))] gap-[2px]">
                {days.map((d, i) => (
                  <div
                    key={i}
                    title={`Day -${89 - i}: ${d}`}
                    className={`h-9 ${dotColor(d)} opacity-80 hover:opacity-100`}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <span>90 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Regions */}
            <div className="bg-background lg:col-span-4 p-7">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">Regions</div>
              <div className="mt-6 space-y-4">
                {REGIONS.map((r) => (
                  <div key={r.code} className="flex items-center justify-between border-b hairline pb-3 last:border-b-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusDot s={r.status} />
                      <div className="min-w-0">
                        <div className="text-[13px] truncate">{r.name}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{r.code}</div>
                      </div>
                    </div>
                    <div className="font-mono text-[12px] text-muted-foreground">{r.lat}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Incidents */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <Eyebrow code="02">Incidents</Eyebrow>
                <h2 className="mt-4 font-display text-[28px] tracking-tight">Recent activity</h2>
              </div>
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                <Clock className="w-3.5 h-3.5" /> Last 30 days
              </div>
            </div>

            <div className="mt-8 border hairline divide-y divide-[var(--hairline)]">
              {INCIDENTS.map((i) => (
                <article key={i.title} className="p-7">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{i.date}</div>
                      <h3 className="mt-2 font-display text-[18px] tracking-tight">{i.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em]">
                      <span className={i.status === "Resolved" ? "text-bull" : "text-warning"}>{i.status}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{i.severity}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[13px] text-muted-foreground leading-relaxed max-w-3xl">{i.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16 grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <Eyebrow code="03">Reliability</Eyebrow>
              <h2 className="mt-6 font-display text-[34px] md:text-[44px] leading-[1.02] tracking-[-0.025em]">
                Built on a 99.99% uptime SLA.
              </h2>
              <p className="mt-5 text-[13.5px] text-muted-foreground max-w-xl">
                Multi-region failover, sub-second health checks, and 24/7 on-call engineers. Subscribe above to be the first to know when anything changes.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <Link href="/dashboard/overview" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center justify-between">
                Open terminal <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="mailto:status@trevise.app" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
                Report an issue <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
