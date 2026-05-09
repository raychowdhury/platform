"use client";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { genSpark } from "@/lib/chart-data";
import {
  Sparkles, Search, Filter, ArrowUpRight, ArrowDownRight, Check, X,
  Bell, Bookmark, BookmarkCheck, ChevronDown, Bot, Zap,
} from "lucide-react";


type Signal = {
  id: string;
  sym: string;
  name: string;
  side: "Long" | "Short";
  entry: number;
  target: number;
  stop: number;
  conf: number;
  rr: number;
  horizon: string;
  category: "Futures" | "Stocks" | "FX" | "Commodities";
  model: "Momentum" | "Mean Reversion" | "Sentiment" | "Macro";
  age: string;
  status: "Active" | "Hit Target" | "Stopped" | "Expired";
};

const SIGNALS: Signal[] = [
  { id: "s1", sym: "NVDA", name: "NVIDIA Corp", side: "Long", entry: 1124, target: 1198, stop: 1086, conf: 92, rr: 2.4, horizon: "5d", category: "Stocks", model: "Momentum", age: "12m ago", status: "Active" },
  { id: "s2", sym: "AAPL", name: "Apple Inc.", side: "Long", entry: 63420, target: 67800, stop: 61200, conf: 86, rr: 2.1, horizon: "3d", category: "Futures", model: "Sentiment", age: "28m ago", status: "Active" },
  { id: "s3", sym: "TSLA", name: "Tesla Inc.", side: "Short", entry: 198.4, target: 182.0, stop: 206.5, conf: 78, rr: 1.9, horizon: "7d", category: "Stocks", model: "Mean Reversion", age: "1h ago", status: "Active" },
  { id: "s4", sym: "EUR/USD", name: "Euro / Dollar", side: "Short", entry: 1.0784, target: 1.062, stop: 1.087, conf: 71, rr: 1.6, horizon: "2d", category: "FX", model: "Macro", age: "2h ago", status: "Active" },
  { id: "s5", sym: "AMD", name: "Adv. Micro Devices", side: "Long", entry: 144.8, target: 162, stop: 138, conf: 88, rr: 2.6, horizon: "4d", category: "Futures", model: "Momentum", age: "3h ago", status: "Hit Target" },
  { id: "s6", sym: "GOLD", name: "Gold Spot", side: "Long", entry: 2308, target: 2362, stop: 2284, conf: 74, rr: 1.8, horizon: "10d", category: "Commodities", model: "Macro", age: "5h ago", status: "Active" },
  { id: "s7", sym: "META", name: "Meta Platforms", side: "Short", entry: 482, target: 458, stop: 494, conf: 69, rr: 1.7, horizon: "6d", category: "Stocks", model: "Mean Reversion", age: "8h ago", status: "Stopped" },
  { id: "s8", sym: "MSFT", name: "Microsoft Corp", side: "Long", entry: 3074, target: 3260, stop: 2982, conf: 84, rr: 2.0, horizon: "5d", category: "Futures", model: "Sentiment", age: "Yesterday", status: "Active" },
];

const CATS = ["All", "Futures", "Stocks", "FX", "Commodities"] as const;
const MODELS = ["All models", "Momentum", "Mean Reversion", "Sentiment", "Macro"] as const;

export default function SignalsPage() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<typeof CATS[number]>("All");
  const [model, setModel] = useState<typeof MODELS[number]>("All models");
  const [minConf, setMinConf] = useState(60);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Signal | null>(null);
  const [notifyOn, setNotifyOn] = useState(false);
  const [autoTradeConfirm, setAutoTradeConfirm] = useState(false);
  const [autoTradeActive, setAutoTradeActive] = useState(false);
  const [executed, setExecuted] = useState<Record<string, boolean>>({});
  const [manualDone, setManualDone] = useState<Record<string, boolean>>({});

  const executeSignal = (id: string) => {
    setExecuted(p => ({ ...p, [id]: true }));
    setOpen(null);
  };
  const executeManual = (id: string) => {
    setManualDone(p => ({ ...p, [id]: true }));
    setOpen(null);
  };

  const filtered = useMemo(() => SIGNALS.filter((s) =>
    (cat === "All" || s.category === cat) &&
    (model === "All models" || s.model === model) &&
    s.conf >= minConf &&
    (s.sym.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()))
  ), [search, cat, model, minConf]);

  const stats = useMemo(() => {
    const total = SIGNALS.length;
    const wins = SIGNALS.filter(s => s.status === "Hit Target").length;
    const active = SIGNALS.filter(s => s.status === "Active").length;
    return { total, wins, active, winRate: Math.round((wins / (wins + SIGNALS.filter(s => s.status === "Stopped").length)) * 100) };
  }, []);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <Sparkles className="w-3 h-3" /> Intelligence
          </div>
          <h1 className="font-display text-3xl tracking-tight mt-1">AI Signals</h1>
          <p className="text-sm text-muted-foreground mt-1">High-confidence trade ideas, ranked by our ensemble of models.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => setNotifyOn(v => !v)} className={`px-3 py-1.5 border flex items-center gap-1.5 transition-colors ${notifyOn ? "border-accent/30 text-accent bg-accent/10" : "hairline hover:bg-muted"}`}>
            <Bell className={`w-3 h-3 ${notifyOn ? "fill-current" : ""}`} /> {notifyOn ? "Notifying" : "Notify on new"}
          </button>
          <button onClick={() => setAutoTradeConfirm(true)} className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${autoTradeActive ? "bg-bull/15 border border-bull/30 text-bull" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
            <Zap className="w-3 h-3" /> {autoTradeActive ? "Auto-trade: On" : "Auto-trade"}
          </button>
        </div>
      </div>

      {/* Stat row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {[
          { l: "Active signals", v: stats.active, s: "Updated 2m ago" },
          { l: "Win rate (30d)", v: `${stats.winRate}%`, s: "+4.2% vs 60d" },
          { l: "Avg R:R", v: "2.1x", s: "Across all models" },
          { l: "Models running", v: "12", s: "4 ensembles" },
        ].map((s) => (
          <div key={s.l} className="bg-background p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.l}</div>
            <div className="font-display text-2xl mt-1">{s.v}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{s.s}</div>
          </div>
        ))}
      </section>

      {/* Filters */}
      <section className="glass p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol or name…"
            className="w-full bg-transparent border hairline pl-9 pr-3 py-2 text-xs"
          />
        </div>
        <div className="inline-flex border hairline p-0.5 text-xs">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-2.5 py-1.5 ${cat === c ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <select value={model} onChange={(e) => setModel(e.target.value as any)}
          className="bg-background border hairline px-2.5 py-2 text-xs">
          {MODELS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground border hairline px-2.5 py-1.5">
          <Filter className="w-3 h-3" />
          <span>Min confidence</span>
          <input type="range" min={50} max={95} value={minConf} onChange={(e) => setMinConf(+e.target.value)} className="accent-primary w-24" />
          <span className="font-mono text-foreground tabular-nums w-7">{minConf}</span>
        </label>
      </section>

      {/* Signal cards */}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => {
          const data = genSpark(s.id.length, s.side === "Long", 24);
          const isSaved = !!saved[s.id];
          const isTaken = !!taken[s.id];
          const sideColor = s.side === "Long" ? "text-bull" : "text-bear";
          return (
            <article key={s.id} className="glass p-4 flex flex-col gap-3 cursor-pointer hover:border-foreground/20"
              onClick={() => setOpen(s)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg">{s.sym}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 border ${s.side === "Long" ? "border-bull/30 text-bull bg-bull/10" : "border-bear/30 text-bear bg-bear/10"}`}>
                      {s.side}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{s.name} · {s.category}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSaved((p) => ({ ...p, [s.id]: !p[s.id] })); }}
                  className="p-1.5 text-muted-foreground hover:text-foreground">
                  {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>

              <div className="h-16 -mx-1">
                <ResponsiveContainer>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id={`g-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.side === "Long" ? "var(--bull)" : "var(--bear)"} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={s.side === "Long" ? "var(--bull)" : "var(--bear)"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area dataKey="v" stroke={s.side === "Long" ? "var(--bull)" : "var(--bear)"} fill={`url(#g-${s.id})`} strokeWidth={1.5} type="monotone" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry</div><div>{s.entry.toLocaleString()}</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Target</div><div className="text-bull">{s.target.toLocaleString()}</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Stop</div><div className="text-bear">{s.stop.toLocaleString()}</div></div>
              </div>

              <div className="flex items-center justify-between border-t hairline pt-3">
                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${s.conf >= 85 ? "bg-bull" : s.conf >= 70 ? "bg-amber-500" : "bg-muted-foreground"}`} />{s.conf}% conf</div>
                  <span className="text-muted-foreground">R:R {s.rr}x</span>
                  <span className="text-muted-foreground">{s.horizon}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setTaken((p) => ({ ...p, [s.id]: !p[s.id] })); }}
                  className={`text-[11px] px-2.5 py-1 border ${isTaken ? "bg-foreground text-background border-foreground" : "hairline hover:bg-muted"}`}>
                  {isTaken ? <span className="flex items-center gap-1"><Check className="w-3 h-3" />Taken</span> : "Take signal"}
                </button>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 glass p-8 text-center text-sm text-muted-foreground">
            No signals match your filters. Try lowering confidence or clearing search.
          </div>
        )}
      </section>

      {/* Auto-trade confirm modal */}
      {autoTradeConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAutoTradeConfirm(false)}>
          <div onClick={e => e.stopPropagation()} className="glass max-w-sm w-full p-6 flex flex-col gap-4">
            <h3 className="font-display text-xl">{autoTradeActive ? "Disable auto-trade?" : "Enable auto-trade?"}</h3>
            <p className="text-xs text-muted-foreground">
              {autoTradeActive
                ? "AI signals will no longer execute automatically. Open positions are not affected."
                : "AI signals with confidence ≥ 80% will be auto-executed using your connected broker account. You can set position limits in Settings."}
            </p>
            <div className="flex gap-2 text-[11px]">
              <button onClick={() => setAutoTradeConfirm(false)} className="flex-1 py-2.5 border hairline hover:bg-white/5">Cancel</button>
              <button onClick={() => { setAutoTradeActive(v => !v); setAutoTradeConfirm(false); }}
                className={`flex-1 py-2.5 font-medium ${autoTradeActive ? "border border-bear/30 text-bear hover:bg-bear/10" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
                {autoTradeActive ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/20" onClick={() => setOpen(null)}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-background border-l hairline p-6 flex flex-col gap-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Signal · {open.age}</div>
                <h2 className="font-display text-2xl mt-1">{open.sym} <span className={open.side === "Long" ? "text-bull" : "text-bear"}>· {open.side}</span></h2>
                <div className="text-xs text-muted-foreground">{open.name}</div>
              </div>
              <button onClick={() => setOpen(null)} className="p-1.5 hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-px bg-border">
              {[["Entry", open.entry], ["Target", open.target], ["Stop", open.stop]].map(([l, v]) => (
                <div key={l as string} className="bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                  <div className="font-mono text-sm mt-1">{(v as number).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Thesis</div>
              <p className="text-sm leading-relaxed">
                {open.model} model detected a high-probability {open.side.toLowerCase()} setup on {open.sym} with {open.conf}% confidence.
                Volume profile, momentum cross, and {open.category === "Futures" ? "options skew" : "options skew"} confirm the bias.
                Suggested horizon: {open.horizon}, risk-reward {open.rr}x.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => open && executeSignal(open.id)} className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs hover:opacity-90 flex items-center justify-center gap-1.5">
                <Bot className="w-3.5 h-3.5" /> Execute via AI Trader
              </button>
              <button onClick={() => open && executeManual(open.id)} className="px-3 py-2.5 border hairline text-xs hover:bg-muted">Manual</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
