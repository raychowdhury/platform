"use client";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { genSpark } from "@/lib/chart-data";
import { Bot, Play, Pause, Settings2, TrendingUp, Users, Cpu, Search, X, Check } from "lucide-react";


type Trader = {
  id: string;
  name: string;
  tag: string;
  style: "Aggressive" | "Balanced" | "Conservative";
  market: string;
  pnl30: number;
  win: number;
  trades: number;
  followers: number;
  drawdown: number;
  status: "Running" | "Paused";
};

const TRADERS: Trader[] = [
  { id: "t1", name: "Helios Momentum", tag: "HEL-M", style: "Aggressive", market: "US Equities", pnl30: 24.8, win: 68, trades: 142, followers: 4820, drawdown: 9.4, status: "Running" },
  { id: "t2", name: "Nyx Mean Reversion", tag: "NYX-MR", style: "Balanced", market: "Index Majors", pnl30: 18.2, win: 71, trades: 96, followers: 3104, drawdown: 6.1, status: "Running" },
  { id: "t3", name: "Atlas Macro", tag: "ATL-M", style: "Conservative", market: "FX & Commodities", pnl30: 9.6, win: 74, trades: 41, followers: 2890, drawdown: 3.2, status: "Running" },
  { id: "t4", name: "Pyra Volatility", tag: "PYR-V", style: "Aggressive", market: "Index Options", pnl30: 32.1, win: 58, trades: 88, followers: 2210, drawdown: 14.8, status: "Paused" },
  { id: "t5", name: "Orion Trend", tag: "ORI-T", style: "Balanced", market: "Global Equities", pnl30: 14.4, win: 66, trades: 73, followers: 1780, drawdown: 7.0, status: "Running" },
  { id: "t6", name: "Vesta Income", tag: "VES-I", style: "Conservative", market: "Bonds & Yields", pnl30: 6.2, win: 78, trades: 28, followers: 1410, drawdown: 1.8, status: "Running" },
];

export default function TradersPage() {
  const [following, setFollowing] = useState<Record<string, boolean>>({ t1: true, t3: true });
  const [running, setRunning] = useState<Record<string, boolean>>(Object.fromEntries(TRADERS.map(t => [t.id, t.status === "Running"])));
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState<"All" | Trader["style"]>("All");
  const [open, setOpen] = useState<Trader | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [allocAmount, setAllocAmount] = useState("");
  const [allocated, setAllocated] = useState(false);

  const placeAllocation = () => {
    if (!allocAmount) return;
    setAllocated(true);
    setAllocAmount("");
    setTimeout(() => setAllocated(false), 2000);
  };

  const filtered = TRADERS.filter((t) =>
    (style === "All" || t.style === style) &&
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.market.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"><Bot className="w-3 h-3" /> Intelligence</div>
          <h1 className="font-display text-3xl tracking-tight mt-1">AI Traders</h1>
          <p className="text-sm text-muted-foreground mt-1">Autonomous agents you can follow, copy, or run as live execution engines.</p>
        </div>
        <button onClick={() => setShowBuilder(true)} className="text-xs px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 self-start md:self-auto">
          <Cpu className="w-3 h-3" /> Build your own
        </button>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {[
          { l: "Active agents", v: TRADERS.filter(t => running[t.id]).length },
          { l: "You follow", v: Object.values(following).filter(Boolean).length },
          { l: "Combined PnL (30d)", v: "+18.4%" },
          { l: "Total followers", v: TRADERS.reduce((a, t) => a + t.followers, 0).toLocaleString() },
        ].map((s) => (
          <div key={s.l} className="bg-background p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.l}</div>
            <div className="font-display text-2xl mt-1">{s.v}</div>
          </div>
        ))}
      </section>

      <section className="glass p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search traders or markets…" className="w-full bg-transparent border hairline pl-9 pr-3 py-2 text-xs" />
        </div>
        <div className="inline-flex border hairline p-0.5 text-xs">
          {(["All", "Aggressive", "Balanced", "Conservative"] as const).map((s) => (
            <button key={s} onClick={() => setStyle(s)} className={`px-2.5 py-1.5 ${style === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{s}</button>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((t) => {
          const data = genSpark(t.id.length, t.pnl30 >= 0, 28);
          const isFollowing = !!following[t.id];
          const isRunning = !!running[t.id];
          return (
            <article key={t.id} className="glass p-4 flex flex-col gap-3 cursor-pointer hover:border-foreground/20" onClick={() => setOpen(t)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 grid place-items-center bg-muted border hairline font-display">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-display text-lg leading-none">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{t.tag} · {t.market}</div>
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 border ${t.style === "Aggressive" ? "border-bear/30 text-bear" : t.style === "Conservative" ? "border-bull/30 text-bull" : "hairline text-muted-foreground"}`}>{t.style}</span>
              </div>

              <div className="h-14 -mx-1">
                <ResponsiveContainer>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id={`tg-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area dataKey="v" stroke="var(--primary)" fill={`url(#tg-${t.id})`} strokeWidth={1.5} type="monotone" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">PnL 30d</div><div className={`font-mono ${t.pnl30 >= 0 ? "text-bull" : "text-bear"}`}>+{t.pnl30}%</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Win</div><div className="font-mono">{t.win}%</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">DD</div><div className="font-mono text-bear">−{t.drawdown}%</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Trades</div><div className="font-mono">{t.trades}</div></div>
              </div>

              <div className="flex items-center justify-between border-t hairline pt-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{t.followers.toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setRunning((p) => ({ ...p, [t.id]: !p[t.id] })); }}
                    className="text-[11px] px-2 py-1 border hairline hover:bg-muted flex items-center gap-1">
                    {isRunning ? <><Pause className="w-3 h-3" />Pause</> : <><Play className="w-3 h-3" />Run</>}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setFollowing((p) => ({ ...p, [t.id]: !p[t.id] })); }}
                    className={`text-[11px] px-2.5 py-1 border ${isFollowing ? "bg-foreground text-background border-foreground" : "hairline hover:bg-muted"}`}>
                    {isFollowing ? <span className="flex items-center gap-1"><Check className="w-3 h-3" />Copying</span> : "Copy"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {showBuilder && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowBuilder(false)}>
          <div onClick={(e) => e.stopPropagation()} className="glass max-w-md w-full p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Build your own trader</h3>
              <button onClick={() => setShowBuilder(false)} className="p-1 hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Name", placeholder: "e.g. My Momentum Bot", type: "text" },
                { label: "Market", placeholder: "e.g. US Equities", type: "text" },
              ].map(({ label, placeholder, type }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
                  <input type={type} placeholder={placeholder} className="bg-transparent border hairline px-3 py-2 text-sm focus:outline-none focus:border-accent/40" />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Style</label>
                <select className="bg-background border hairline px-3 py-2 text-sm focus:outline-none focus:border-accent/40">
                  <option>Aggressive</option>
                  <option>Balanced</option>
                  <option>Conservative</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Max drawdown %</label>
                <input type="number" placeholder="e.g. 10" className="bg-transparent border hairline px-3 py-2 text-sm focus:outline-none focus:border-accent/40" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowBuilder(false)} className="px-4 py-2 text-xs border hairline hover:bg-muted">Cancel</button>
              <button onClick={() => setShowBuilder(false)} className="px-4 py-2 text-xs bg-primary text-primary-foreground hover:opacity-90">Create trader</button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/20" onClick={() => setOpen(null)}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-background border-l hairline p-6 flex flex-col gap-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{open.tag}</div>
                <h2 className="font-display text-2xl mt-1">{open.name}</h2>
                <div className="text-xs text-muted-foreground">{open.market} · {open.style}</div>
              </div>
              <button onClick={() => setOpen(null)} className="p-1.5 hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border">
              {[["PnL 30d", `+${open.pnl30}%`], ["Win rate", `${open.win}%`], ["Max DD", `−${open.drawdown}%`], ["Trades", open.trades]].map(([l, v]) => (
                <div key={l as string} className="bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                  <div className="font-mono text-sm mt-1">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Strategy</div>
              <p className="text-sm leading-relaxed">
                {open.name} runs a {open.style.toLowerCase()} {open.market.toLowerCase()} program combining cross-sectional signals,
                regime detection and dynamic position sizing. Capital allocation is risk-parity weighted with a hard {open.drawdown}% drawdown circuit-breaker.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  placeholder="Amount (USD)"
                  type="number"
                  className="flex-1 bg-transparent border hairline px-3 py-2 text-xs focus:outline-none focus:border-accent/40"
                />
                <button
                  onClick={placeAllocation}
                  disabled={!allocAmount}
                  className={`px-4 py-2 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${allocated ? "bg-bull/15 border border-bull/30 text-bull" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
                  <TrendingUp className="w-3.5 h-3.5" /> {allocated ? "Allocated!" : "Allocate"}
                </button>
              </div>
              <button onClick={() => { setOpen(null); }} className="w-full py-2.5 border hairline text-xs hover:bg-muted flex items-center justify-center gap-1.5"><Settings2 className="w-3.5 h-3.5" />Configure</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
