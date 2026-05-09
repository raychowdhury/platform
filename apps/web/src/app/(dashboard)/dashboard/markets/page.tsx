"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { genSpark, rand } from "@/lib/chart-data";
import { Area, AreaChart, ResponsiveContainer, RadialBar, RadialBarChart } from "recharts";
import { ArrowDownRight, ArrowUpRight, Flame, Globe2, TrendingDown, TrendingUp, Search, Filter, Star, X } from "lucide-react";


const CATS = ["All", "Futures", "Stocks", "Forex", "Commodities", "Indices", "ETFs", "Bonds"];

const SECTORS = [
  { name: "Technology", change: 2.41, weight: 28 },
  { name: "Financials", change: 0.82, weight: 14 },
  { name: "Healthcare", change: -0.34, weight: 13 },
  { name: "Energy", change: 1.96, weight: 9 },
  { name: "Consumer", change: -1.18, weight: 11 },
  { name: "Industrials", change: 0.42, weight: 8 },
  { name: "Utilities", change: -0.27, weight: 5 },
  { name: "Materials", change: 0.18, weight: 6 },
  { name: "Comms", change: 1.04, weight: 6 },
];

const ASSETS = [
  { sym: "AAPL", name: "Apple Inc.", price: 63719.9, ch: 1.24, vol: "42.1B", cap: "1.25T", up: true },
  { sym: "MSFT", name: "Microsoft Corp", price: 3077.93, ch: 0.42, vol: "18.4B", cap: "370.2B", up: true },
  { sym: "NVDA", name: "NVIDIA Corp", price: 1128.34, ch: 3.22, vol: "21.0B", cap: "2.78T", up: true },
  { sym: "AAPL", name: "Apple Inc.", price: 184.40, ch: 0.18, vol: "8.9B", cap: "2.84T", up: true },
  { sym: "TSLA", name: "Tesla Inc.", price: 194.22, ch: -4.14, vol: "16.2B", cap: "618.0B", up: false },
  { sym: "MSFT", name: "Microsoft", price: 415.06, ch: 0.86, vol: "6.4B", cap: "3.08T", up: true },
  { sym: "AMD", name: "Adv. Micro Devices", price: 148.21, ch: 5.48, vol: "3.1B", cap: "67.0B", up: true },
  { sym: "META", name: "Meta Platforms", price: 478.22, ch: -1.92, vol: "5.8B", cap: "1.21T", up: false },
  { sym: "GOLD", name: "Gold spot", price: 2318.5, ch: 0.18, vol: "—", cap: "—", up: true },
  { sym: "EURUSD", name: "EUR / USD", price: 1.0784, ch: -0.06, vol: "—", cap: "—", up: false },
];

const GAINERS = [
  { sym: "AMD", ch: 5.48 },
  { sym: "NVDA", ch: 3.22 },
  { sym: "ARKK", ch: 2.74 },
  { sym: "AMD", ch: 2.41 },
  { sym: "AAPL", ch: 1.24 },
];
const LOSERS = [
  { sym: "TSLA", ch: -4.14 },
  { sym: "META", ch: -1.92 },
  { sym: "DIS", ch: -1.41 },
  { sym: "PYPL", ch: -1.08 },
  { sym: "NFLX", ch: -0.84 },
];

function Spark({ up, seed }: { up: boolean; seed: number }) {
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer>
        <AreaChart data={genSpark(seed, up)}>
          <defs>
            <linearGradient id={`sp${seed}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={up ? "var(--bull)" : "var(--bear)"} stopOpacity={0.6} />
              <stop offset="100%" stopColor={up ? "var(--bull)" : "var(--bear)"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={up ? "var(--bull)" : "var(--bear)"} strokeWidth={1.4} fill={`url(#sp${seed})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const SYMS = ["AAPL","MSFT","NVDA","AAPL","MSFT","TSLA","AMD","META","GOLD","AMZN"];

export default function MarketsPage() {
  const router = useRouter();
  const [region, setRegion] = useState("Global");
  const [regionOpen, setRegionOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<"Cap" | "Volume" | "Change">("Cap");
  const [stars, setStars] = useState<Set<string>>(new Set(["AAPL", "NVDA"]));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tradeModal, setTradeModal] = useState<typeof ASSETS[number] | null>(null);
  const [watchlistAdded, setWatchlistAdded] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const addToWatchlist = () => {
    setWatchlistAdded(true);
    setTimeout(() => setWatchlistAdded(false), 1500);
  };

  const filteredAssets = ASSETS.filter(
    (a) => a.sym.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (sort === "Change" ? b.ch - a.ch : sort === "Volume" ? parseFloat(b.vol) - parseFloat(a.vol) : 0));

  const toggleStar = (sym: string) =>
    setStars((s) => {
      const n = new Set(s);
      n.has(sym) ? n.delete(sym) : n.add(sym);
      return n;
    });

  return (
    <>
      {/* Hero */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Markets</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">
            Global <em className="not-italic italic text-accent">pulse</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Real-time view across 11,420 instruments. {stars.size} starred · {filteredAssets.length} matching results.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1 text-bull border hairline px-2 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" /> NYSE open
          </div>
          <div className="relative">
            <button onClick={() => setRegionOpen((o) => !o)}
              className="px-3 py-2 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer">
              <Globe2 className="w-3 h-3" /> Region: {region}
            </button>
            {regionOpen && (
              <div className="absolute right-0 top-full mt-1 glass z-20 flex flex-col min-w-[140px]">
                {["Global", "US", "Europe", "Asia"].map((r) => (
                  <button key={r}
                    onClick={() => { setRegion(r); setRegionOpen(false); }}
                    className={`text-left px-3 py-2 cursor-pointer hover:bg-white/[0.06] ${r === region ? "bg-white/[0.04] text-foreground" : "text-muted-foreground"}`}>
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={addToWatchlist} className={`px-3 py-2 border transition-colors cursor-pointer ${watchlistAdded ? "bg-bull/15 border-bull/30 text-bull" : "bg-accent/15 border-accent/30 text-accent hover:bg-accent/25"}`}>{watchlistAdded ? "✓ Added" : "Add to watchlist"}</button>
        </div>
      </div>

      {/* Index strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { l: "S&P 500", v: "5,214.08", c: 0.42 },
          { l: "Nasdaq 100", v: "18,212.33", c: 0.71 },
          { l: "Dow", v: "39,187.21", c: 0.18 },
          { l: "FTSE 100", v: "8,251.40", c: -0.22 },
          { l: "Nikkei 225", v: "38,815.10", c: 1.04 },
          { l: "VIX", v: "13.42", c: -2.18 },
        ].map((idx, i) => (
          <button key={idx.l}
            onClick={() => setHoverIdx(i === hoverIdx ? null : i)}
            className={`glass p-4 flex flex-col gap-2 cursor-pointer text-left transition-all hover:bg-white/[0.02] ${hoverIdx === i ? "border-accent/40" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{idx.l}</span>
              <span className={`text-[10px] font-mono ${idx.c >= 0 ? "text-bull" : "text-bear"}`}>{idx.c >= 0 ? "+" : ""}{idx.c}%</span>
            </div>
            <div className="font-display text-xl tabular-nums">{idx.v}</div>
            <div className="h-6 -mx-1">
              <ResponsiveContainer>
                <AreaChart data={genSpark(i + 5, idx.c >= 0)}>
                  <Area type="monotone" dataKey="v" stroke={idx.c >= 0 ? "var(--bull)" : "var(--bear)"} fill={idx.c >= 0 ? "var(--bull)" : "var(--bear)"} fillOpacity={0.12} strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="glass p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets, symbols, sectors…" className="w-full pl-9 pr-3 py-2 text-xs bg-white/[0.03] border hairline focus:outline-none focus:border-accent/40 cursor-text" />
        </div>
        <div className="flex items-center gap-1 text-[11px] flex-wrap">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-2.5 py-1.5 border hairline cursor-pointer transition-colors ${c === cat ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"}`}>{c}</button>
          ))}
        </div>
        <button onClick={() => setFilterOpen(o => !o)} className={`px-2.5 py-1.5 border hairline text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${filterOpen ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Filter className="w-3 h-3" /> Filters</button>
      </div>
      {filterOpen && (
        <div className="glass p-4 flex flex-wrap gap-4 text-[11px]">
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Min price</span><input placeholder="e.g. 10" className="bg-white/[0.03] border hairline px-2 py-1.5 w-28 font-mono focus:outline-none focus:border-accent/40" /></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Max price</span><input placeholder="e.g. 5000" className="bg-white/[0.03] border hairline px-2 py-1.5 w-28 font-mono focus:outline-none focus:border-accent/40" /></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Min change %</span><input placeholder="e.g. -5" className="bg-white/[0.03] border hairline px-2 py-1.5 w-28 font-mono focus:outline-none focus:border-accent/40" /></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Direction</span>
            <div className="flex gap-1">
              {["All", "Up", "Down"].map(d => <button key={d} className="px-2.5 py-1.5 border hairline hover:bg-white/[0.06]">{d}</button>)}
            </div>
          </label>
          <button onClick={() => setFilterOpen(false)} className="self-end px-3 py-1.5 bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25">Apply</button>
        </div>
      )}

      {/* Heatmap + sectors */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 glass p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl">Market heatmap</h3>
              <p className="text-xs text-muted-foreground">Top 60 instruments by market cap · last 24h</p>
            </div>
            <div className="flex gap-1 text-[10px] font-mono">
              <span className="px-2 py-1 bg-bear/20 text-bear">-3%</span>
              <span className="px-2 py-1 bg-white/5">0</span>
              <span className="px-2 py-1 bg-bull/20 text-bull">+3%</span>
            </div>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1.5">
            {Array.from({ length: 60 }).map((_, i) => {
              const ch = (rand(i + 11) - 0.45) * 6;
              const intensity = Math.min(1, Math.abs(ch) / 4);
              const color = ch >= 0 ? "var(--bull)" : "var(--bear)";
              return (
                <div
                  key={i}
                  className="aspect-square p-1.5 flex flex-col justify-between text-[9px] font-mono border border-white/5 hover:border-white/20 transition-colors cursor-pointer"
                  style={{ background: `color-mix(in oklab, ${color} ${intensity * 32}%, oklch(0.18 0.01 260))` }}
                  onClick={() => router.push(`/dashboard/markets/${SYMS[i % 10]}`)}
                >
                  <span className="font-sans text-[10px] truncate">{SYMS[i % 10]}</span>
                  <span className={ch >= 0 ? "text-bull" : "text-bear"}>{ch >= 0 ? "+" : ""}{ch.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl">Sectors</h3>
              <p className="text-xs text-muted-foreground">Performance · today</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {SECTORS.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-24 text-xs">{s.name}</span>
                <div className="flex-1 h-1.5 bg-white/5 relative overflow-hidden">
                  <div
                    className={`absolute top-0 h-full ${s.change >= 0 ? "bg-bull left-1/2" : "bg-bear right-1/2"}`}
                    style={{ width: `${Math.abs(s.change) * 18}%` }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-white/15" />
                </div>
                <span className={`text-[11px] font-mono w-14 text-right ${s.change >= 0 ? "text-bull" : "text-bear"}`}>
                  {s.change >= 0 ? "+" : ""}{s.change}%
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Movers + Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="glass p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl flex items-center gap-2"><TrendingUp className="w-4 h-4 text-bull" /> Top gainers</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">24h</span>
          </div>
          {GAINERS.map((g, i) => (
            <div key={g.sym} className="flex items-center gap-3 py-1.5 border-b hairline last:border-0">
              <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
              <div className="w-7 h-7 rounded-full bg-white/5 grid place-items-center text-[10px] font-mono">{g.sym.slice(0,2)}</div>
              <span className="flex-1 text-sm">{g.sym}</span>
              <Spark up seed={i + 30} />
              <span className="font-mono text-bull text-xs flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />{g.ch}%</span>
            </div>
          ))}
        </section>
        <section className="glass p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl flex items-center gap-2"><TrendingDown className="w-4 h-4 text-bear" /> Top losers</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">24h</span>
          </div>
          {LOSERS.map((g, i) => (
            <div key={g.sym} className="flex items-center gap-3 py-1.5 border-b hairline last:border-0">
              <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
              <div className="w-7 h-7 rounded-full bg-white/5 grid place-items-center text-[10px] font-mono">{g.sym.slice(0,2)}</div>
              <span className="flex-1 text-sm">{g.sym}</span>
              <Spark up={false} seed={i + 50} />
              <span className="font-mono text-bear text-xs flex items-center gap-1"><ArrowDownRight className="w-3 h-3" />{g.ch}%</span>
            </div>
          ))}
        </section>
        <section className="glass p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl flex items-center gap-2"><Flame className="w-4 h-4 text-accent" /> Sentiment</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Fear / Greed</span>
          </div>
          <div className="relative h-40 grid place-items-center">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ v: 72, fill: "var(--bull)" }]} startAngle={210} endAngle={-30}>
                <RadialBar background={{ fill: "oklch(1 0 0 / 0.05)" }} dataKey="v" cornerRadius={0} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <div className="font-display text-4xl text-bull">72</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Greed</div>
            </div>
          </div>
          <div className="grid grid-cols-3 text-center text-[11px]">
            <div><div className="font-mono">61</div><div className="text-muted-foreground">Yesterday</div></div>
            <div><div className="font-mono">54</div><div className="text-muted-foreground">Last week</div></div>
            <div><div className="font-mono">41</div><div className="text-muted-foreground">Last month</div></div>
          </div>
        </section>
      </div>

      {/* All assets table */}
      <section className="glass p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-display text-2xl">All markets</h3>
            <p className="text-xs text-muted-foreground">Showing {filteredAssets.length} of 11,420 instruments</p>
          </div>
          <div className="flex gap-1 text-[11px] text-muted-foreground">
            {(["Cap", "Volume", "Change"] as const).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-2 py-1 border hairline cursor-pointer transition-colors ${sort === s ? "bg-white/[0.06] text-foreground" : "hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b hairline">
                <th className="text-left font-normal py-2 w-8"></th>
                <th className="text-left font-normal py-2">#</th>
                <th className="text-left font-normal">Asset</th>
                <th className="text-right font-normal">Price</th>
                <th className="text-right font-normal">24h</th>
                <th className="text-right font-normal hidden md:table-cell">Volume</th>
                <th className="text-right font-normal hidden lg:table-cell">Mkt cap</th>
                <th className="text-right font-normal">Trend</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((a, i) => (
                <tr key={a.sym} className="border-b hairline hover:bg-white/[0.025] cursor-pointer transition-colors">
                  <td className="py-3 pl-1">
                    <button onClick={() => toggleStar(a.sym)} className="p-1 cursor-pointer">
                      <Star className={`w-3.5 h-3.5 ${stars.has(a.sym) ? "text-amber-300 fill-amber-300" : "text-muted-foreground hover:text-amber-300"}`} />
                    </button>
                  </td>
                  <td className="py-3 text-muted-foreground text-[11px] font-mono">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] grid place-items-center text-[10px] font-mono">{a.sym.slice(0,2)}</div>
                      <div>
                        <div className="text-sm">{a.sym}</div>
                        <div className="text-[10px] text-muted-foreground">{a.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right font-mono tabular-nums">{a.price.toLocaleString()}</td>
                  <td className={`text-right font-mono ${a.up ? "text-bull" : "text-bear"}`}>{a.up ? "+" : ""}{a.ch}%</td>
                  <td className="text-right font-mono text-muted-foreground hidden md:table-cell">{a.vol}</td>
                  <td className="text-right font-mono text-muted-foreground hidden lg:table-cell">{a.cap}</td>
                  <td><div className="flex justify-end"><Spark up={a.up} seed={i + 70} /></div></td>
                  <td className="text-right">
                    <button onClick={() => setTradeModal(a)}
                      className="text-[11px] px-2 py-1 border hairline text-muted-foreground hover:text-foreground hover:bg-white/[0.06] cursor-pointer transition-colors">Trade</button>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">No markets match "{search}".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trade modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTradeModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="glass max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trade</div>
                <h3 className="font-display text-2xl mt-1">{tradeModal.sym}</h3>
                <p className="text-xs text-muted-foreground">{tradeModal.name}</p>
              </div>
              <button onClick={() => setTradeModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="border hairline p-2"><div className="font-mono text-sm">${tradeModal.price.toLocaleString()}</div><div className="text-[10px] text-muted-foreground">Price</div></div>
              <div className="border hairline p-2"><div className={`font-mono text-sm ${tradeModal.up ? "text-bull" : "text-bear"}`}>{tradeModal.up ? "+" : ""}{tradeModal.ch}%</div><div className="text-[10px] text-muted-foreground">24h</div></div>
              <div className="border hairline p-2"><div className="font-mono text-sm">{tradeModal.vol}</div><div className="text-[10px] text-muted-foreground">Vol</div></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTradeModal(null)} className="py-2.5 bg-bull/15 border border-bull/30 text-bull cursor-pointer hover:bg-bull/25 transition-colors text-sm">Buy</button>
              <button onClick={() => setTradeModal(null)} className="py-2.5 bg-bear/15 border border-bear/30 text-bear cursor-pointer hover:bg-bear/25 transition-colors text-sm">Sell</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
