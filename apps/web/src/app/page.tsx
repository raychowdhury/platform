"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight, ArrowRight, Activity, Zap, Shield, Globe2, Terminal,
  CandlestickChart, Layers, Bot, Bell, BookOpen, Wifi, ChevronRight,
  Check, Cpu, GitBranch, Lock, LineChart, Boxes, Radio, Sun, MoonStar,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

/* ─────────────────── primitives ─────────────────── */

function Strip({ code, title, right }: { code: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="strip">
      <div className="flex items-center gap-2.5">
        <span className="strip-code">{code}</span>
        <span className="text-muted-foreground/40">/</span>
        <span className="strip-title">{title}</span>
      </div>
      {right}
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`panel ${className}`}>{children}</div>;
}

function Eyebrow({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-accent">{code}</span>
      <span className="h-px w-6 bg-[var(--hairline)]" />
      <span>{children}</span>
    </div>
  );
}

/* ─────────────────── nav ─────────────────── */

function Nav() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-50 border-b hairline bg-background/85 backdrop-blur-md">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-accent grid place-items-center">
            <span className="font-mono text-[11px] font-bold text-accent-foreground">T</span>
          </div>
          <span className="font-display text-[13px] tracking-tight">TREVISE</span>
          <span className="hidden sm:inline text-[9px] font-mono text-muted-foreground tracking-[0.2em] ml-1">TERMINAL · v4.2</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Link href="/dashboard/markets" className="hover:text-foreground">Markets</Link>
          <Link href="/dashboard/charts" className="hover:text-foreground">Charts</Link>
          <Link href="/dashboard/signals" className="hover:text-foreground">Signals</Link>
          <a href="#api" className="hover:text-foreground">API</a>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            className="p-1.5 border hairline text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <MoonStar className="w-3.5 h-3.5" />}
          </button>
          <Link href="/login" className="text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1.5 text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link href="/signup" className="text-[11px] font-mono uppercase tracking-[0.18em] px-3 py-1.5 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center gap-1.5">
            Open terminal <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────── live clock ─────────────────── */

function useUTC() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setT(`${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ─────────────────── hero ─────────────────── */

const heroTickers = [
  { s: "SPX",    p: "5,214.08",  c: "+22.14",  pct: "+0.42%", up: true,  vol: "3.1B"  },
  { s: "NDX",    p: "18,237.54", c: "+109.62", pct: "+0.61%", up: true,  vol: "1.9B"  },
  { s: "ES1!", p: "63,719.90", c: "+782.11", pct: "+1.24%", up: true,  vol: "28.4B" },
  { s: "NVDA",   p: "1,128.34",  c: "+35.18",  pct: "+3.22%", up: true,  vol: "612M"  },
  { s: "TSLA",   p: "194.22",    c: "-8.39",   pct: "-4.14%", up: false, vol: "418M"  },
  { s: "ES1!",   p: "5,221.75",  c: "+18.50",  pct: "+0.36%", up: true,  vol: "1.4M"  },
  { s: "VIX",    p: "13.42",     c: "-0.30",   pct: "-2.18%", up: false, vol: "—"     },
  { s: "DXY",    p: "104.62",    c: "+0.14",   pct: "+0.14%", up: true,  vol: "—"     },
];

function Hero() {
  const utc = useUTC();
  return (
    <section className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 pt-16 pb-14 grid lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-7">
          <Eyebrow code="00">Trevise · Multi-asset terminal</Eyebrow>
          <h1 className="font-display text-[44px] md:text-[64px] lg:text-[80px] leading-[0.96] tracking-[-0.03em] mt-6">
            The terminal<br/>
            for <span className="text-accent">precision</span> trading.
          </h1>
          <p className="mt-7 text-[15px] text-muted-foreground max-w-xl leading-relaxed">
            Real-time order flow, footprint candles, dark-pool prints, gamma exposure, and AI signals
            across 240+ instruments. One workstation. Sub-15ms execution. Zero noise.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="text-[12px] font-mono uppercase tracking-[0.18em] px-4 py-2.5 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center gap-2">
              Open terminal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a href="#api" className="text-[12px] font-mono uppercase tracking-[0.18em] px-4 py-2.5 border hairline hover:bg-muted inline-flex items-center gap-2">
              Read API docs <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <div className="flex items-center gap-2"><span className="live-dot" /> Markets · LIVE</div>
            <div>240+ instruments</div>
            <div>SOC2 · ISO 27001</div>
            <div>UTC <span className="text-foreground">{utc}</span></div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <Panel>
            <Strip
              code="MKT"
              title="Watchlist · Top movers"
              right={<span className="flex items-center gap-1.5 text-[10px] text-bull"><span className="live-dot" /> STREAM</span>}
            />
            <div className="divide-y divide-[var(--hairline)]">
              {heroTickers.map((t) => (
                <div key={t.s} className="grid grid-cols-12 gap-3 px-3 py-2 items-center hover:bg-muted">
                  <div className="col-span-3 text-[12px] font-mono">{t.s}</div>
                  <div className="col-span-3 num text-[12px] text-right">{t.p}</div>
                  <div className={`col-span-3 num text-[11px] text-right ${t.up ? "text-bull" : "text-bear"}`}>{t.c}</div>
                  <div className={`col-span-2 num text-[11px] text-right ${t.up ? "text-bull" : "text-bear"}`}>{t.pct}</div>
                  <div className="col-span-1 num text-[10px] text-muted-foreground text-right">{t.vol}</div>
                </div>
              ))}
            </div>
            <div className="strip border-b-0 border-t hairline">
              <span>Universe · 240 / 12,400</span>
              <span className="text-foreground">+0.42%</span>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── metrics bar ─────────────────── */

function MetricsBar() {
  const items = [
    { k: "Latency p50",      v: "12ms",   d: "Order ack" },
    { k: "Throughput",       v: "4.2M/s", d: "Quote msgs" },
    { k: "Instruments",      v: "240+",   d: "Equities · FX · Futures · Futures" },
    { k: "Venues",           v: "38",     d: "Lit + dark + OTC" },
    { k: "Uptime · 90d",     v: "99.998%",d: "Multi-region" },
  ];
  return (
    <section className="border-b hairline">
      <div className="max-w-[1320px] mx-auto grid grid-cols-2 md:grid-cols-5 divide-x divide-[var(--hairline)]">
        {items.map((m) => (
          <div key={m.k} className="px-5 py-7">
            <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground">{m.k}</div>
            <div className="mt-3 font-mono tabular-nums text-[28px] tracking-tight">{m.v}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{m.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────── chart suite ─────────────────── */

function HeatmapSVG() {
  const cols = 60, rows = 18;
  return (
    <svg viewBox={`0 0 ${cols} ${rows}`} className="w-full h-44 block" preserveAspectRatio="none">
      {Array.from({ length: rows }).map((_, y) =>
        Array.from({ length: cols }).map((_, x) => {
          const mid = 9 + Math.sin(x * 0.32) * 1.6;
          const dist = Math.abs(y - mid);
          const intensity = Math.max(0, 1 - dist / 4);
          const isBid = y > mid;
          const fill = isBid
            ? `color-mix(in oklab, var(--bull) ${Math.round(intensity * 65)}%, transparent)`
            : `color-mix(in oklab, var(--bear) ${Math.round(intensity * 65)}%, transparent)`;
          return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />;
        })
      )}
      {Array.from({ length: cols - 1 }).map((_, x) => {
        const y = 9 + Math.sin(x * 0.32) * 1.6;
        const y2 = 9 + Math.sin((x + 1) * 0.32) * 1.6;
        return <line key={x} x1={x} y1={y} x2={x + 1} y2={y2} stroke="var(--accent)" strokeWidth={0.18} />;
      })}
    </svg>
  );
}

function FootprintSVG() {
  return (
    <svg viewBox="0 0 200 110" className="w-full h-44 block" preserveAspectRatio="none">
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 8 + i * 13;
        const up = (i * 7) % 3 !== 0;
        const open = 55 + Math.sin(i * 0.6) * 10;
        const close = open + (up ? -8 : 8);
        const high = Math.min(open, close) - 6;
        const low = Math.max(open, close) + 6;
        const color = up ? "var(--bull)" : "var(--bear)";
        return (
          <g key={i}>
            <line x1={x + 4} y1={high} x2={x + 4} y2={low} stroke={color} strokeWidth={0.6} />
            <rect x={x} y={Math.min(open, close)} width={8} height={Math.abs(close - open)} fill={color} />
            <text x={x - 6} y={open - 1} fontSize="3.6" fill="var(--muted-foreground)" fontFamily="monospace">{(120 + i * 3)}</text>
            <text x={x + 9} y={close + 3} fontSize="3.6" fill="var(--muted-foreground)" fontFamily="monospace">{(95 + i * 4)}</text>
          </g>
        );
      })}
      <line x1={0} y1={56} x2={200} y2={56} stroke="var(--accent)" strokeWidth={0.3} strokeDasharray="2 2" />
      <text x={2} y={54} fontSize="4" fill="var(--accent)" fontFamily="monospace">POC 4218.50</text>
    </svg>
  );
}

function VolumeProfileSVG() {
  return (
    <svg viewBox="0 0 200 110" className="w-full h-44 block" preserveAspectRatio="none">
      {Array.from({ length: 22 }).map((_, i) => {
        const w = 30 + Math.abs(Math.sin(i * 0.4)) * 90 + (i === 11 ? 50 : 0);
        const y = i * 4.7 + 4;
        return <rect key={i} x={0} y={y} width={w} height={3.4} fill="color-mix(in oklab, var(--accent) 35%, transparent)" />;
      })}
      <line x1={0} y1={56} x2={200} y2={56} stroke="var(--accent)" strokeWidth={0.4} />
      <text x={150} y={54} fontSize="4.5" fill="var(--accent)" fontFamily="monospace">VPOC</text>
      {Array.from({ length: 30 }).map((_, i) => {
        const x = 80 + i * 4;
        const v = 50 + Math.sin(i * 0.5 + 1) * 18 + Math.cos(i * 0.3) * 8;
        const v2 = 50 + Math.sin((i + 1) * 0.5 + 1) * 18 + Math.cos((i + 1) * 0.3) * 8;
        return <line key={i} x1={x} y1={v} x2={x + 4} y2={v2} stroke="var(--foreground)" strokeWidth={0.5} />;
      })}
    </svg>
  );
}

function ChartSuite() {
  const items = [
    {
      code: "CHT/01",
      title: "Order-flow heatmap",
      desc: "See aggregated bid/ask liquidity at every price level. Spot icebergs, walls, and absorption in real time.",
      svg: <HeatmapSVG />,
      tags: ["Bookmap", "DOM", "Iceberg detection"],
    },
    {
      code: "CHT/02",
      title: "Footprint candles",
      desc: "Bid × ask volume per candle with point-of-control highlighting. Read intent inside every bar.",
      svg: <FootprintSVG />,
      tags: ["Delta", "POC", "Imbalance"],
    },
    {
      code: "CHT/03",
      title: "Volume profile",
      desc: "Horizontal volume distribution with VWAP overlay, value area, and developing nodes.",
      svg: <VolumeProfileSVG />,
      tags: ["VPOC", "VAH/VAL", "VWAP"],
    },
  ];
  return (
    <section className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
        <Eyebrow code="01">Chart suite</Eyebrow>
        <div className="mt-6 grid lg:grid-cols-12 gap-6 items-end">
          <h2 className="lg:col-span-7 font-display text-[36px] md:text-[48px] leading-[1.02] tracking-[-0.025em]">
            The full institutional<br/>chart stack — natively.
          </h2>
          <p className="lg:col-span-5 text-[14px] text-muted-foreground leading-relaxed">
            Order flow, footprint, profile, gamma exposure. No plugins, no separate vendors, no monthly bolt-ons.
            One unified rendering engine running on a single WebSocket.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--hairline)] border hairline">
          {items.map((it) => (
            <div key={it.code} className="bg-background p-5 flex flex-col">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
                <span className="text-accent">{it.code}</span>
                <span className="text-muted-foreground">SVG · live</span>
              </div>
              <div className="mt-4 border hairline">{it.svg}</div>
              <h3 className="mt-5 font-display text-[18px] tracking-tight">{it.title}</h3>
              <p className="mt-2 text-[12.5px] text-muted-foreground leading-relaxed">{it.desc}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {it.tags.map((t) => (
                  <span key={t} className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border hairline text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── smart money ─────────────────── */

function SmartMoney() {
  const cards = [
    { code: "SM/01", icon: Activity,  t: "Dark pool prints", d: "Sub-second feed of off-exchange size with sweep classification.", stat: "1.2M prints/day" },
    { code: "SM/02", icon: LineChart, t: "GEX & dealer gamma", d: "Live gamma exposure curve with zero-gamma flip and pin levels.", stat: "Per-strike, per-expiry" },
    { code: "SM/03", icon: Boxes,     t: "Options flow", d: "Unusual activity classifier — sweeps, blocks, and roll detection.", stat: "98% venue coverage" },
    { code: "SM/04", icon: Radio,     t: "Insider & 13F", d: "Form 4, 13F, and 10b5-1 filings parsed and routed in real time.", stat: "<3s post-filing" },
  ];
  return (
    <section className="border-b hairline bg-[color-mix(in_oklab,var(--background)_60%,var(--muted)_40%)]">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <Eyebrow code="02">Institutional intelligence</Eyebrow>
            <h2 className="mt-6 font-display text-[36px] md:text-[48px] leading-[1.02] tracking-[-0.025em]">
              See what the desks see.
            </h2>
          </div>
          <p className="max-w-md text-[14px] text-muted-foreground">
            Order flow stops at level 2. The real signal lives in dark pools, dealer gamma, and unusual options
            activity. We surface it on the same chart.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--hairline)] border hairline">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.code} className="bg-background p-5 flex flex-col gap-4 min-h-[200px] hover:bg-muted">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 border hairline grid place-items-center"><Icon className="w-4 h-4 text-accent" /></div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">{c.code}</span>
                </div>
                <h3 className="font-display text-[16px] tracking-tight mt-auto">{c.t}</h3>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">{c.d}</p>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground border-t hairline pt-3">{c.stat}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── execution / order ticket ─────────────────── */

function ExecutionPanel() {
  return (
    <section className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <Eyebrow code="03">Execution</Eyebrow>
          <h2 className="mt-6 font-display text-[36px] md:text-[44px] leading-[1.04] tracking-[-0.025em]">
            Sub-15ms order routing. Every order type that matters.
          </h2>
          <p className="mt-5 text-[14px] text-muted-foreground leading-relaxed">
            Smart routing across 38 venues with native bracket, OCO, iceberg, TWAP, VWAP, and trailing logic.
            Hotkey-first ergonomics, signed audit trail, and built-in pre-trade risk.
          </p>
          <ul className="mt-7 space-y-2.5">
            {[
              "Native bracket / OCO / OTO",
              "TWAP, VWAP, POV, iceberg algos",
              "Pre-trade risk + max loss circuit",
              "Hotkey ladder · keyboard-first",
              "Signed FIX 4.4 audit trail",
            ].map((x) => (
              <li key={x} className="flex items-center gap-2.5 text-[13px]">
                <Check className="w-3.5 h-3.5 text-accent" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7">
          <Panel>
            <Strip
              code="TRD"
              title="Order entry · NVDA"
              right={<span className="flex items-center gap-1.5 text-[10px] text-bull"><span className="live-dot" /> ARMED</span>}
            />
            <div className="grid grid-cols-2 divide-x divide-[var(--hairline)]">
              <button className="py-3 text-[12px] font-mono uppercase tracking-[0.2em] text-bull hover:bg-bull/10 border-b hairline">BUY · 1,128.34</button>
              <button className="py-3 text-[12px] font-mono uppercase tracking-[0.2em] text-bear hover:bg-bear/10 border-b hairline">SELL · 1,128.30</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-[11px] font-mono uppercase tracking-[0.18em]">
              <div>
                <div className="text-muted-foreground">Type</div>
                <div className="mt-1.5 grid grid-cols-3 border hairline divide-x divide-[var(--hairline)]">
                  {["MKT", "LMT", "STP"].map((x, i) => (
                    <button key={x} className={`py-1.5 ${i === 1 ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>{x}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">TIF</div>
                <div className="mt-1.5 grid grid-cols-3 border hairline divide-x divide-[var(--hairline)]">
                  {["DAY", "GTC", "IOC"].map((x, i) => (
                    <button key={x} className={`py-1.5 ${i === 0 ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>{x}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Quantity</div>
                <div className="mt-1.5 px-3 py-2 border hairline text-foreground text-[14px] num">250</div>
              </div>
              <div>
                <div className="text-muted-foreground">Limit</div>
                <div className="mt-1.5 px-3 py-2 border hairline text-foreground text-[14px] num">1,127.50</div>
              </div>
              <div>
                <div className="text-muted-foreground">Take profit</div>
                <div className="mt-1.5 px-3 py-2 border hairline text-bull text-[14px] num">1,148.00</div>
              </div>
              <div>
                <div className="text-muted-foreground">Stop loss</div>
                <div className="mt-1.5 px-3 py-2 border hairline text-bear text-[14px] num">1,116.00</div>
              </div>
            </div>
            <div className="px-5 pb-5 grid grid-cols-3 gap-3 text-[10px] font-mono uppercase tracking-[0.18em]">
              <div className="border hairline p-2.5">
                <div className="text-muted-foreground">Notional</div>
                <div className="mt-1 num text-foreground text-[13px]">$281,875</div>
              </div>
              <div className="border hairline p-2.5">
                <div className="text-muted-foreground">Margin</div>
                <div className="mt-1 num text-foreground text-[13px]">$56,375</div>
              </div>
              <div className="border hairline p-2.5">
                <div className="text-muted-foreground">R/R</div>
                <div className="mt-1 num text-accent text-[13px]">1 : 1.78</div>
              </div>
            </div>
            <div className="strip border-t hairline border-b-0">
              <span>Latency · 11ms · NASDAQ</span>
              <span className="text-bull">PRE-TRADE OK</span>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── ai signals (research notes) ─────────────────── */

function AISignals() {
  const notes = [
    {
      code: "AI / MOMENTUM",
      asset: "NVDA",
      time: "09:41:22 ET",
      title: "Sustained call sweeps above ATH",
      body: "Five consecutive 5-min bars closing at HoD with 2.3× average call:put ratio. Dealer gamma flips positive at 1,135.",
      conf: 92,
      side: "LONG",
    },
    {
      code: "AI / VOLATILITY",
      asset: "TSLA",
      time: "09:38:11 ET",
      title: "IV crush precedes earnings drift",
      body: "Front-month IV down 18 vols in 24h with skew flattening. Historical setup: 3.4% mean reversion within 48h.",
      conf: 78,
      side: "SHORT",
    },
    {
      code: "AI / EARNINGS",
      asset: "PLTR",
      time: "09:30:04 ET",
      title: "Anomalous block accumulation",
      body: "32 dark prints > 50k shares clustered on bid in last session. No insider Form 4 yet. Reweighting probability 71%.",
      conf: 71,
      side: "LONG",
    },
  ];
  return (
    <section className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <Eyebrow code="04">AI research desk</Eyebrow>
            <h2 className="mt-6 font-display text-[36px] md:text-[48px] leading-[1.02] tracking-[-0.025em]">
              Signals delivered as research notes — not chatbot replies.
            </h2>
          </div>
          <p className="max-w-md text-[14px] text-muted-foreground">
            Twelve specialist models read the tape, options flow, and filings. Output is structured, sourced,
            and timestamped — ready for your journal.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-px bg-[var(--hairline)] border hairline">
          {notes.map((n) => (
            <article key={n.code} className="bg-background p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
                <span className="text-accent">{n.code}</span>
                <span className="text-muted-foreground">{n.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px]">{n.asset}</span>
                <span className={`text-[10px] font-mono uppercase tracking-[0.18em] px-1.5 py-0.5 border hairline ${n.side === "LONG" ? "text-bull border-bull/30" : "text-bear border-bear/30"}`}>
                  {n.side}
                </span>
              </div>
              <h3 className="font-display text-[16px] leading-snug tracking-tight">{n.title}</h3>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">{n.body}</p>
              <div className="mt-auto pt-3 border-t hairline flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                <span>Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-[3px] bg-muted">
                    <div className="h-full bg-accent" style={{ width: `${n.conf}%` }} />
                  </div>
                  <span className="text-foreground num">{n.conf}%</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── api / developer ─────────────────── */

const SNIPPETS = {
  REST: `# GET /v1/quotes/NVDA
$ curl https://api.trevise.io/v1/quotes/NVDA \\
    -H "Authorization: Bearer trv_live_•••"

{
  "symbol": "NVDA",
  "bid":    1128.32,
  "ask":    1128.34,
  "last":   1128.33,
  "volume": 612_482_119,
  "ts":     "2026-05-08T13:41:22.184Z"
}`,
  WSS: `// wss://stream.trevise.io
const ws = new WebSocket("wss://stream.trevise.io");

ws.onopen = () => ws.send(JSON.stringify({
  op: "subscribe",
  channel: "orderflow",
  symbols: ["NVDA", "ES1!", "ES1!"],
}));

ws.onmessage = (e) => {
  const tick = JSON.parse(e.data);
  // { sym, px, sz, side, venue, ts }
};`,
  PYTHON: `from trevise import Client

t = Client(api_key="trv_live_•••")

# Place a bracket order
order = t.orders.create(
    symbol  = "NVDA",
    side    = "buy",
    qty     = 250,
    type    = "limit",
    limit   = 1127.50,
    take_profit = 1148.00,
    stop_loss   = 1116.00,
)
print(order.id, order.status)`,
};

function APIBlock() {
  const [tab, setTab] = useState<keyof typeof SNIPPETS>("REST");
  const tabs: (keyof typeof SNIPPETS)[] = ["REST", "WSS", "PYTHON"];
  return (
    <section id="api" className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <Eyebrow code="05">Developer</Eyebrow>
          <h2 className="mt-6 font-display text-[36px] md:text-[44px] leading-[1.04] tracking-[-0.025em]">
            Trade like an exchange — over HTTP, WebSocket, or FIX.
          </h2>
          <p className="mt-5 text-[14px] text-muted-foreground leading-relaxed">
            Same wire that powers the terminal. REST for setup, WebSocket for streams, FIX 4.4 for institutional
            volume. Idempotency keys, signed webhooks, and SDKs in Python, TypeScript, and Go.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-px bg-[var(--hairline)] border hairline">
            {[
              { k: "REST endpoints",  v: "184" },
              { k: "WS channels",     v: "26"  },
              { k: "FIX support",     v: "4.4" },
              { k: "SDK languages",   v: "5"   },
            ].map((x) => (
              <div key={x.k} className="bg-background p-4">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{x.k}</div>
                <div className="mt-2 font-mono text-[20px]">{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7">
          <Panel>
            <div className="strip">
              <div className="flex items-center gap-3">
                <span className="strip-code">API</span>
                <span className="text-muted-foreground/40">/</span>
                <span className="strip-title">{tab.toLowerCase()}.{tab === "PYTHON" ? "py" : tab === "WSS" ? "ts" : "sh"}</span>
              </div>
              <div className="flex items-center gap-px">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] ${tab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <pre className="p-5 text-[12.5px] leading-[1.7] font-mono overflow-x-auto text-foreground whitespace-pre">
{SNIPPETS[tab]}
            </pre>
            <div className="strip border-t hairline border-b-0">
              <span>Auth · Bearer · idempotency-key</span>
              <span className="text-bull">200 OK · 14ms</span>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── infrastructure ─────────────────── */

function Infra() {
  const items = [
    { icon: Cpu,       t: "Co-located matching", d: "NY4, LD4, TY3 cross-connects with kernel-bypass NICs." },
    { icon: GitBranch, t: "Multi-region active",  d: "Three live regions, automatic failover under 800ms." },
    { icon: Lock,      t: "SOC 2 + ISO 27001",   d: "Independently audited annually. Hardware MFA enforced." },
    { icon: Shield,    t: "Pre-trade risk",      d: "Per-account max loss, max position, kill-switch." },
    { icon: Wifi,      t: "12ms p50 ack",        d: "Order acknowledgement, end-to-end, p50 globally." },
    { icon: Terminal,  t: "Signed audit trail",  d: "Every order, modify, fill — cryptographically signed." },
  ];
  return (
    <section className="border-b hairline bg-[color-mix(in_oklab,var(--background)_60%,var(--muted)_40%)]">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
        <Eyebrow code="06">Infrastructure</Eyebrow>
        <div className="mt-6 grid lg:grid-cols-12 gap-6 items-end">
          <h2 className="lg:col-span-7 font-display text-[36px] md:text-[48px] leading-[1.02] tracking-[-0.025em]">
            Built on the same plumbing prop desks pay seven figures for.
          </h2>
          <p className="lg:col-span-5 text-[14px] text-muted-foreground">
            Co-located matching, multi-region failover, hardware-signed orders. The boring stuff that keeps you
            in the market when others go offline.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--hairline)] border hairline">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.t} className="bg-background p-6 flex gap-4">
                <div className="w-9 h-9 border hairline grid place-items-center shrink-0"><Icon className="w-4 h-4 text-accent" /></div>
                <div>
                  <div className="font-display text-[15px] tracking-tight">{it.t}</div>
                  <div className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed">{it.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── testimonials ─────────────────── */

function Voices() {
  const v = [
    { q: "We replaced four vendors with Trevise. Order flow, options data, execution, and journaling — one bill, one wire.", who: "Marcus Chen", role: "PM · Tessera Capital" },
    { q: "The footprint engine renders bids and asks faster than my Bookmap install. And the API is genuinely usable.",     who: "Sara Vidal",   role: "Quant Trader · Helio" },
    { q: "Post-trade audit trail saved us during a CFTC review. Every modify and fill, signed and exportable.",             who: "Jonas Albrecht", role: "COO · Northwind Trading" },
  ];
  return (
    <section className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
        <Eyebrow code="07">Operators</Eyebrow>
        <div className="mt-10 grid md:grid-cols-3 gap-px bg-[var(--hairline)] border hairline">
          {v.map((x) => (
            <figure key={x.who} className="bg-background p-7 flex flex-col gap-5">
              <blockquote className="font-display text-[18px] leading-snug tracking-tight">"{x.q}"</blockquote>
              <figcaption className="mt-auto pt-4 border-t hairline">
                <div className="text-[12px] font-mono">{x.who}</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mt-1">{x.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── pricing ─────────────────── */

function Pricing() {
  const tiers = [
    {
      code: "TIER/01", name: "Starter", price: "$0", per: "/forever",
      desc: "Real-time charts and watchlists for active retail.",
      feats: ["Real-time level 1 quotes", "20 watchlist symbols", "Daily AI summary", "Community access"],
      cta: "Open free account", primary: false,
    },
    {
      code: "TIER/02", name: "Pro", price: "$49", per: "/month",
      desc: "Order flow, footprint, AI signals, and execution.",
      feats: ["Full order flow + footprint", "Live AI research notes", "Sub-15ms execution", "Bracket / OCO / algos", "REST + WebSocket API"],
      cta: "Start 14-day trial", primary: true,
    },
    {
      code: "TIER/03", name: "Institutional", price: "Custom", per: "",
      desc: "FIX, dedicated infra, compliance reporting.",
      feats: ["FIX 4.4 + co-location", "Dedicated cluster", "Compliance + audit export", "White-glove onboarding", "24/7 desk support"],
      cta: "Talk to desk", primary: false,
    },
  ];
  return (
    <section id="pricing" className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-20">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <Eyebrow code="08">Pricing</Eyebrow>
            <h2 className="mt-6 font-display text-[36px] md:text-[48px] leading-[1.02] tracking-[-0.025em]">
              One terminal. Three tiers.
            </h2>
          </div>
          <p className="max-w-md text-[14px] text-muted-foreground">
            Cancel anytime. All tiers include real-time data — no hidden exchange fees on equities.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-px bg-[var(--hairline)] border hairline">
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
              <ul className="space-y-2 text-[13px] flex-1">
                {t.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" /> <span>{f}</span>
                  </li>
                ))}
              </ul>
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
  );
}

/* ─────────────────── ecosystem strip ─────────────────── */

function Ecosystem() {
  const venues = ["NASDAQ", "NYSE", "CME", "ICE", "EUREX", "CBOE", "LSE", "HKEX", "BINANCE", "COINBASE", "KRAKEN", "DERIBIT"];
  return (
    <section className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Connected venues · 38 total</div>
        <div className="mt-6 grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-px bg-[var(--hairline)] border hairline">
          {venues.map((v) => (
            <div key={v} className="bg-background py-4 text-center font-mono text-[11px] tracking-[0.18em] text-foreground/80 hover:text-foreground hover:bg-muted">
              {v}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── final CTA ─────────────────── */

function FinalCTA() {
  return (
    <section className="border-b hairline">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-24 grid lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-8">
          <Eyebrow code="09">Get started</Eyebrow>
          <h2 className="mt-6 font-display text-[44px] md:text-[64px] leading-[0.98] tracking-[-0.03em]">
            Trade with the<br/>institutional stack.
          </h2>
          <p className="mt-6 text-[14px] text-muted-foreground max-w-xl">
            Order flow, footprint, dark pool, GEX, AI signals, sub-15ms execution. The full picture.
            Free to start, no card.
          </p>
        </div>
        <div className="lg:col-span-4 flex flex-col gap-3">
          <Link href="/signup" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center justify-between">
            Open free account <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#api" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
            Read the docs <ArrowUpRight className="w-4 h-4" />
          </a>
          <Link href="/dashboard/overview" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
            Live demo terminal <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── footer ─────────────────── */

function Footer() {
  const cols = [
    { t: "Platform",   l: [["Markets","/markets"],["Charts","/charts"],["Screener","/screener"],["Signals","/signals"],["Strategies","/strategies"],["Pricing","/pricing"]] },
    { t: "Workspace",  l: [["Dashboard","/dashboard"],["Portfolio","/portfolio"],["Allocations","/allocations"],["Positions","/portfolio"],["Alerts","/alerts"],["Journal","/journal"]] },
    { t: "Intelligence", l: [["AI Traders","/traders"],["Leaderboard","/leaderboard"],["Academy","/academy"],["Community","/community"]] },
    { t: "Company",    l: [["About","/about"],["System status","/status"],["Billing","/billing"],["Privacy","/privacy"],["Terms","/terms"]] },
  ];
  return (
    <footer className="bg-background">
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16 grid grid-cols-2 md:grid-cols-6 gap-10">
        <div className="col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-accent grid place-items-center"><span className="font-mono text-[11px] font-bold text-accent-foreground">T</span></div>
            <span className="font-display text-[15px] tracking-tight">TREVISE</span>
          </div>
          <p className="mt-4 text-[12.5px] text-muted-foreground max-w-xs leading-relaxed">
            Institutional-grade market analysis, real-time. Built for professionals who can't afford lag.
          </p>
          <div className="mt-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <Shield className="w-3.5 h-3.5" /> SOC 2 · ISO 27001
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.t}>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">{c.t}</div>
            <ul className="mt-4 space-y-2.5 text-[12.5px]">
              {c.l.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("#")
                    ? <a href={href} className="text-foreground/80 hover:text-foreground">{label}</a>
                    : <Link href={href} className="text-foreground/80 hover:text-foreground">{label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t hairline">
        <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground flex-wrap gap-4">
          <div>© 2026 Trevise, Inc. · All rights reserved</div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground">Twitter</a>
            <a href="#" className="hover:text-foreground">GitHub</a>
            <a href="#" className="hover:text-foreground">Discord</a>
            <span className="flex items-center gap-1.5"><Globe2 className="w-3 h-3" /> EN · USD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────── page ─────────────────── */

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <MetricsBar />
      <ChartSuite />
      <SmartMoney />
      <ExecutionPanel />
      <AISignals />
      <APIBlock />
      <Infra />
      <Voices />
      <Pricing />
      <Ecosystem />
      <FinalCTA />
      <Footer />
    </div>
  );
}
