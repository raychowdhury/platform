"use client";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { genSpark } from "@/lib/chart-data";
import { Zap, Plus, Play, Copy, Code2, GitBranch, Activity, X, Check } from "lucide-react";


type Strategy = {
  id: string;
  name: string;
  desc: string;
  type: "Trend" | "Mean Rev" | "Arb" | "Volatility";
  cagr: number;
  sharpe: number;
  dd: number;
  status: "Live" | "Paper" | "Draft";
  forks: number;
};

const STRATS: Strategy[] = [
  { id: "st1", name: "Triple Cross EMA", desc: "Classic 8/21/55 crossover with ATR trailing stop on liquid majors.", type: "Trend", cagr: 38.2, sharpe: 1.84, dd: 12.1, status: "Live", forks: 412 },
  { id: "st2", name: "RSI Divergence Hunter", desc: "Detects bullish/bearish divergences on the 4h timeframe with volume confirmation.", type: "Mean Rev", cagr: 22.6, sharpe: 1.62, dd: 8.4, status: "Live", forks: 286 },
  { id: "st3", name: "Vol Compression Breakout", desc: "Trades breakouts after Bollinger Band squeeze with dynamic position sizing.", type: "Volatility", cagr: 41.7, sharpe: 1.41, dd: 18.2, status: "Paper", forks: 198 },
  { id: "st4", name: "Pairs Stat-Arb (ES/NQ)", desc: "Cointegrated pair trade with z-score entries and Kalman filter hedge.", type: "Arb", cagr: 14.8, sharpe: 2.21, dd: 4.6, status: "Live", forks: 134 },
  { id: "st5", name: "Overnight Drift S&P", desc: "Captures the well-documented overnight equity drift with index futures.", type: "Trend", cagr: 11.2, sharpe: 1.95, dd: 5.1, status: "Paper", forks: 92 },
  { id: "st6", name: "Earnings Reversion", desc: "Fades extreme post-earnings moves on large caps within 48h window.", type: "Mean Rev", cagr: 17.4, sharpe: 1.38, dd: 9.9, status: "Draft", forks: 51 },
];

const TYPES = ["All", "Trend", "Mean Rev", "Arb", "Volatility"] as const;

export default function StrategiesPage() {
  const [type, setType] = useState<typeof TYPES[number]>("All");
  const [active, setActive] = useState<Record<string, boolean>>({ st1: true, st2: true, st4: true });
  const [open, setOpen] = useState<Strategy | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const filtered = STRATS.filter((s) => type === "All" || s.type === type);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"><Zap className="w-3 h-3" /> Intelligence</div>
          <h1 className="font-display text-3xl tracking-tight mt-1">Strategies</h1>
          <p className="text-sm text-muted-foreground mt-1">Battle-tested systematic strategies. Backtest, paper-trade, then go live.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 py-2 border hairline hover:bg-muted flex items-center gap-1.5"><GitBranch className="w-3 h-3" />Marketplace</button>
          <button onClick={() => setShowBuilder(true)} className="text-xs px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> New strategy
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {[
          { l: "Live strategies", v: STRATS.filter(s => s.status === "Live").length },
          { l: "Active for you", v: Object.values(active).filter(Boolean).length },
          { l: "Avg Sharpe", v: (STRATS.reduce((a, s) => a + s.sharpe, 0) / STRATS.length).toFixed(2) },
          { l: "Total forks", v: STRATS.reduce((a, s) => a + s.forks, 0) },
        ].map((s) => (
          <div key={s.l} className="bg-background p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.l}</div>
            <div className="font-display text-2xl mt-1">{s.v}</div>
          </div>
        ))}
      </section>

      <section className="glass p-3 flex items-center gap-2">
        <div className="inline-flex border hairline p-0.5 text-xs">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`px-2.5 py-1.5 ${type === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {filtered.map((s) => {
          const data = genSpark(s.id.length, true, 40);
          const isActive = !!active[s.id];
          return (
            <article key={s.id} className="glass p-4 flex flex-col gap-3 cursor-pointer hover:border-foreground/20" onClick={() => setOpen(s)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg">{s.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 border ${s.status === "Live" ? "border-bull/30 text-bull bg-bull/10" : s.status === "Paper" ? "hairline text-muted-foreground" : "border-amber-500/30 text-amber-500"}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 border hairline text-muted-foreground shrink-0">{s.type}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">CAGR</div><div className="font-mono text-bull">+{s.cagr}%</div></div>
                  <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Sharpe</div><div className="font-mono">{s.sharpe}</div></div>
                  <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Max DD</div><div className="font-mono text-bear">−{s.dd}%</div></div>
                </div>
                <div className="w-28 h-12">
                  <ResponsiveContainer>
                    <AreaChart data={data}>
                      <defs>
                        <linearGradient id={`stg-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--bull)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--bull)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area dataKey="v" stroke="var(--bull)" fill={`url(#stg-${s.id})`} strokeWidth={1.5} type="monotone" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex items-center justify-between border-t hairline pt-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                  <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{s.forks}</span>
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" />Backtested 2018–2026</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); }} className="text-[11px] px-2 py-1 border hairline hover:bg-muted flex items-center gap-1"><Copy className="w-3 h-3" />Fork</button>
                  <button onClick={(e) => { e.stopPropagation(); setActive((p) => ({ ...p, [s.id]: !p[s.id] })); }}
                    className={`text-[11px] px-2.5 py-1 border ${isActive ? "bg-foreground text-background border-foreground" : "hairline hover:bg-muted"}`}>
                    {isActive ? <span className="flex items-center gap-1"><Check className="w-3 h-3" />Running</span> : <span className="flex items-center gap-1"><Play className="w-3 h-3" />Deploy</span>}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/20" onClick={() => setOpen(null)}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-lg bg-background border-l hairline p-6 flex flex-col gap-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{open.type} strategy</div>
                <h2 className="font-display text-2xl mt-1">{open.name}</h2>
              </div>
              <button onClick={() => setOpen(null)} className="p-1.5 hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm leading-relaxed">{open.desc}</p>
            <div className="grid grid-cols-3 gap-px bg-border">
              {[["CAGR", `+${open.cagr}%`], ["Sharpe", open.sharpe], ["Max DD", `−${open.dd}%`]].map(([l, v]) => (
                <div key={l as string} className="bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                  <div className="font-mono text-sm mt-1">{v}</div>
                </div>
              ))}
            </div>
            <div className="border hairline p-3 font-mono text-[11px] leading-relaxed text-muted-foreground bg-muted/40">
              <div className="text-foreground"># Pseudocode</div>
              <div>if ema(8) {`>`} ema(21) {`>`} ema(55):</div>
              <div>&nbsp;&nbsp;buy(size = risk / atr(14))</div>
              <div>&nbsp;&nbsp;trail_stop(2 * atr(14))</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs hover:opacity-90 flex items-center justify-center gap-1.5"><Play className="w-3.5 h-3.5" />Run backtest</button>
              <button className="px-3 py-2.5 border hairline text-xs hover:bg-muted flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" />Edit code</button>
            </div>
          </aside>
        </div>
      )}

      {showBuilder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4" onClick={() => setShowBuilder(false)}>
          <div className="bg-background border hairline max-w-md w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">New strategy</h3>
              <button onClick={() => setShowBuilder(false)} className="p-1 hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="text-muted-foreground">Name</span>
              <input className="bg-transparent border hairline px-3 py-2" placeholder="My Awesome Strategy" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="text-muted-foreground">Type</span>
              <select className="bg-background border hairline px-3 py-2">
                {TYPES.filter(t => t !== "All").map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="text-muted-foreground">Starting capital</span>
              <input className="bg-transparent border hairline px-3 py-2 font-mono" placeholder="$10,000" />
            </label>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setShowBuilder(false)} className="flex-1 text-xs py-2.5 border hairline hover:bg-muted">Cancel</button>
              <button onClick={() => setShowBuilder(false)} className="flex-1 text-xs py-2.5 bg-primary text-primary-foreground hover:opacity-90">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
