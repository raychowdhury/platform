"use client";
import { useMemo, useState } from "react";
import { genSpark, rand } from "@/lib/chart-data";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Filter, Save, Plus, X, Sparkles, Search, Download, ArrowUpDown, ChevronDown, Star, Zap } from "lucide-react";


const PRESETS = [
  { name: "Large-cap momentum", count: 28, hot: true },
  { name: "Oversold bounce", count: 41 },
  { name: "Breakout > 50d high", count: 17, hot: true },
  { name: "High dividend yield", count: 64 },
  { name: "Insider buying clusters", count: 22 },
  { name: "Insider buying", count: 11 },
];

type Op = ">" | "<" | "between" | "=";
type Filt = { id: number; field: string; op: Op; value: string };

const FIELDS = ["Market cap", "Price", "P/E ratio", "RSI(14)", "24h change %", "Volume", "Dividend %", "EPS growth", "Volatility"];

const SECTORS = ["All", "Tech", "Finance", "Health", "Energy", "Consumer", "Futures", "ETF"];

function buildResults() {
  const names = [
    ["NVDA", "NVIDIA Corp", "Tech", "2.78T"],
    ["AAPL", "Apple Inc.", "Tech", "2.84T"],
    ["MSFT", "Microsoft", "Tech", "3.08T"],
    ["GOOGL", "Alphabet Inc.", "Tech", "2.10T"],
    ["AMZN", "Amazon.com", "Consumer", "1.92T"],
    ["META", "Meta Platforms", "Tech", "1.21T"],
    ["TSLA", "Tesla Inc.", "Consumer", "618B"],
    ["AMD", "AMD", "Tech", "262B"],
    ["JPM", "JP Morgan", "Finance", "578B"],
    ["BAC", "Bank of America", "Finance", "292B"],
    ["XOM", "Exxon Mobil", "Energy", "468B"],
    ["JNJ", "Johnson & Johnson", "Health", "382B"],
    ["AAPL", "Apple Inc.", "Futures", "1.25T"],
    ["MSFT", "Microsoft Corp", "Futures", "370B"],
    ["AMD", "Adv. Micro Devices", "Futures", "67B"],
  ] as const;
  return names.map((n, i) => ({
    sym: n[0],
    name: n[1],
    sector: n[2],
    cap: n[3],
    price: 50 + rand(i + 1) * 1500,
    ch: (rand(i + 9) - 0.4) * 8,
    rsi: 20 + rand(i + 4) * 70,
    pe: 8 + rand(i + 7) * 38,
    vol: `${(0.5 + rand(i + 6) * 24).toFixed(1)}B`,
    score: 60 + Math.floor(rand(i + 11) * 39),
  }));
}

export default function ScreenerPage() {
  const [filters, setFilters] = useState<Filt[]>([
    { id: 1, field: "Market cap", op: ">", value: "10B" },
    { id: 2, field: "RSI(14)", op: "<", value: "40" },
    { id: 3, field: "24h change %", op: ">", value: "0" },
  ]);
  const [sector, setSector] = useState("All");
  const [universe, setUniverse] = useState<"Stocks" | "Futures" | "ETFs" | "Forex">("Stocks");
  const results = useMemo(() => buildResults(), []);
  const filtered = sector === "All" ? results : results.filter(r => r.sector === sector);
  const [starredRows, setStarredRows] = useState<Set<string>>(new Set());
  const [tradeModal, setTradeModal] = useState<typeof results[number] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [querySaved, setQuerySaved] = useState(false);
  const [aiScreening, setAiScreening] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("AI score");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const SORT_OPTIONS = ["AI score", "Price", "24h change", "RSI", "P/E", "Volume", "Market cap"];

  const exportCSV = () => { setExporting(true); setTimeout(() => setExporting(false), 1500); };
  const saveQuery = () => { setQuerySaved(true); setTimeout(() => setQuerySaved(false), 1500); };
  const aiScreen = () => { setAiScreening(true); setAiDone(false); setTimeout(() => { setAiScreening(false); setAiDone(true); }, 2000); };
  const toggleStar = (sym: string) => setStarredRows(s => { const n = new Set(s); n.has(sym) ? n.delete(sym) : n.add(sym); return n; });

  return (
    <>
      {/* Hero */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Screener</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">
            Find your next <em className="not-italic italic text-accent">edge</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {filtered.length} assets match your filters · saved as <span className="text-foreground">"Momentum AM"</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button onClick={exportCSV} className={`px-3 py-2 border transition-colors flex items-center gap-1.5 ${exporting ? "border-bull/30 text-bull bg-bull/10" : "hover:bg-white/5 hairline text-muted-foreground hover:text-foreground"}`}><Download className="w-3 h-3" /> {exporting ? "Exported!" : "Export CSV"}</button>
          <button onClick={saveQuery} className={`px-3 py-2 border transition-colors flex items-center gap-1.5 ${querySaved ? "border-bull/30 text-bull bg-bull/10" : "hover:bg-white/5 hairline text-muted-foreground hover:text-foreground"}`}><Save className="w-3 h-3" /> {querySaved ? "Saved!" : "Save query"}</button>
          <button onClick={aiScreen} disabled={aiScreening} className={`px-3 py-2 border transition-colors flex items-center gap-1.5 ${aiDone ? "bg-bull/15 border-bull/30 text-bull" : "bg-accent/15 border-accent/30 text-accent hover:bg-accent/25"} disabled:opacity-60`}><Sparkles className="w-3 h-3" /> {aiScreening ? "Scanning…" : aiDone ? "✓ 12 found" : "AI screen"}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">
        {/* Filter builder */}
        <aside className="glass p-5 flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Universe</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {(["Stocks", "Futures", "ETFs", "Forex"] as const).map(u => (
                <button key={u} onClick={() => setUniverse(u)}
                  className={`py-2 border hairline ${universe === u ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Sector</span>
            <div className="flex flex-wrap gap-1 mt-2">
              {SECTORS.map(s => (
                <button key={s} onClick={() => setSector(s)}
                  className={`text-[11px] px-2 py-1 border hairline ${sector === s ? "bg-accent/15 border-accent/30 text-accent" : "text-muted-foreground hover:text-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Filters · {filters.length}</span>
              <button onClick={() => setFilters(f => [...f, { id: Date.now(), field: "Volume", op: ">", value: "1M" }])}
                className="text-[11px] text-accent hover:text-foreground flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add</button>
            </div>
            <div className="flex flex-col gap-2">
              {filters.map(f => (
                <div key={f.id} className="glass-soft p-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <select value={f.field} onChange={e => setFilters(arr => arr.map(x => x.id === f.id ? { ...x, field: e.target.value } : x))}
                      className="bg-transparent text-[12px] focus:outline-none">
                      {FIELDS.map(fld => <option key={fld} value={fld} className="bg-[oklch(0.18_0.012_260)]">{fld}</option>)}
                    </select>
                    <button onClick={() => setFilters(arr => arr.filter(x => x.id !== f.id))} className="text-muted-foreground hover:text-bear"><X className="w-3 h-3" /></button>
                  </div>
                  <div className="flex gap-1">
                    {(["<", "=", ">", "between"] as Op[]).map(op => (
                      <button key={op} onClick={() => setFilters(arr => arr.map(x => x.id === f.id ? { ...x, op } : x))}
                        className={`flex-1 text-[10px] font-mono py-1 border hairline ${f.op === op ? "bg-white/[0.08] text-foreground" : "text-muted-foreground"}`}>
                        {op}
                      </button>
                    ))}
                  </div>
                  <input value={f.value} onChange={e => setFilters(arr => arr.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))}
                    className="w-full bg-white/[0.03] border hairline px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-accent/40" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Presets</span>
            <div className="flex flex-col gap-1 mt-2">
              {PRESETS.map(p => (
                <button key={p.name} className="flex items-center justify-between text-left p-2 hover:bg-white/[0.04] border hairline group">
                  <span className="text-[12px] flex items-center gap-1.5">
                    {p.hot && <Zap className="w-3 h-3 text-accent" />}
                    {p.name}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{p.count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <section className="glass p-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b hairline flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search results…" className="w-full pl-9 pr-3 py-2 text-xs bg-white/[0.03] border hairline focus:outline-none focus:border-accent/40" />
            </div>
            <div className="flex items-center gap-1 text-[11px] relative">
              <div className="relative">
                <button onClick={() => { setSortOpen(o => !o); setColumnsOpen(false); }} className={`px-2.5 py-1.5 border hairline flex items-center gap-1 transition-colors ${sortOpen ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground"}`}><ArrowUpDown className="w-3 h-3" /> Sort: {sortBy} <ChevronDown className="w-3 h-3" /></button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 glass z-20 flex flex-col min-w-[160px]">
                    {SORT_OPTIONS.map(o => <button key={o} onClick={() => { setSortBy(o); setSortOpen(false); }} className={`text-left px-3 py-2 hover:bg-white/[0.06] ${sortBy === o ? "text-accent" : "text-muted-foreground"}`}>{o}</button>)}
                  </div>
                )}
              </div>
              <button onClick={() => { setColumnsOpen(o => !o); setSortOpen(false); }} className={`px-2.5 py-1.5 border hairline transition-colors ${columnsOpen ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Columns</button>
              {columnsOpen && (
                <div className="absolute right-0 top-full mt-1 glass z-20 p-3 flex flex-col gap-1.5 min-w-[160px]">
                  {["Price", "24h", "RSI", "P/E", "Cap", "Vol", "AI score", "Trend"].map(col => (
                    <label key={col} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input type="checkbox" defaultChecked className="accent-primary" /> {col}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b hairline">
                  <th className="text-left font-normal py-3 pl-4 w-8"></th>
                  <th className="text-left font-normal">Symbol</th>
                  <th className="text-left font-normal">Sector</th>
                  <th className="text-right font-normal">Price</th>
                  <th className="text-right font-normal">24h</th>
                  <th className="text-right font-normal">RSI</th>
                  <th className="text-right font-normal">P/E</th>
                  <th className="text-right font-normal">Cap</th>
                  <th className="text-right font-normal">Vol</th>
                  <th className="text-right font-normal pr-2">AI score</th>
                  <th className="text-right font-normal">Trend</th>
                  <th className="pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.sym} className="border-b hairline hover:bg-white/[0.025] transition-colors">
                    <td className="pl-4"><button onClick={() => toggleStar(r.sym + i)}><Star className={`w-3.5 h-3.5 cursor-pointer ${starredRows.has(r.sym + i) ? "text-amber-300 fill-amber-300" : "text-muted-foreground hover:text-amber-300"}`} /></button></td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] grid place-items-center text-[10px] font-mono">{r.sym.slice(0,2)}</div>
                        <div>
                          <div className="text-sm">{r.sym}</div>
                          <div className="text-[10px] text-muted-foreground">{r.name}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-[10px] uppercase tracking-wider text-muted-foreground border hairline px-1.5 py-0.5">{r.sector}</span></td>
                    <td className="text-right font-mono">{r.price.toFixed(2)}</td>
                    <td className={`text-right font-mono ${r.ch >= 0 ? "text-bull" : "text-bear"}`}>{r.ch >= 0 ? "+" : ""}{r.ch.toFixed(2)}%</td>
                    <td className="text-right font-mono">
                      <span className={r.rsi > 70 ? "text-bear" : r.rsi < 30 ? "text-bull" : "text-foreground"}>{r.rsi.toFixed(0)}</span>
                    </td>
                    <td className="text-right font-mono text-muted-foreground">{r.pe.toFixed(1)}</td>
                    <td className="text-right font-mono text-muted-foreground">{r.cap}</td>
                    <td className="text-right font-mono text-muted-foreground">{r.vol}</td>
                    <td className="text-right pr-2">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-12 h-1 bg-white/5">
                          <div className="h-full bg-gradient-to-r from-accent to-primary" style={{ width: `${r.score}%` }} />
                        </div>
                        <span className="font-mono text-xs w-6 text-right">{r.score}</span>
                      </div>
                    </td>
                    <td>
                      <div className="h-7 w-20 ml-auto">
                        <ResponsiveContainer>
                          <AreaChart data={genSpark(i + 13, r.ch >= 0)}>
                            <defs>
                              <linearGradient id={`sc${i}`} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={r.ch >= 0 ? "var(--bull)" : "var(--bear)"} stopOpacity={0.5} />
                                <stop offset="100%" stopColor={r.ch >= 0 ? "var(--bull)" : "var(--bear)"} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="v" stroke={r.ch >= 0 ? "var(--bull)" : "var(--bear)"} strokeWidth={1.4} fill={`url(#sc${i})`} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="pr-4 text-right">
                      <button onClick={() => setTradeModal(r)} className="text-[11px] px-2 py-1 border hairline text-muted-foreground hover:text-foreground hover:bg-white/[0.04]">Trade</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 border-t hairline text-[11px] text-muted-foreground">
            <span>Showing {filtered.length} of {results.length} results</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 border hairline hover:bg-white/[0.06]">‹</button>
              {[1, 2, 3].map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-2 py-1 border hairline ${page === p ? "bg-white/[0.06] text-foreground" : "hover:bg-white/[0.04]"}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(3, p + 1))} className="px-2 py-1 border hairline hover:bg-white/[0.06]">›</button>
            </div>
          </div>
        </section>
      </div>
      {tradeModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTradeModal(null)}>
          <div onClick={e => e.stopPropagation()} className="glass max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trade</div>
                <h3 className="font-display text-2xl mt-1">{tradeModal.sym}</h3>
                <p className="text-xs text-muted-foreground">{tradeModal.name}</p>
              </div>
              <button onClick={() => setTradeModal(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="border hairline p-2"><div className="font-mono">${tradeModal.price.toFixed(2)}</div><div className="text-muted-foreground">Price</div></div>
              <div className="border hairline p-2"><div className={`font-mono ${tradeModal.ch >= 0 ? "text-bull" : "text-bear"}`}>{tradeModal.ch >= 0 ? "+" : ""}{tradeModal.ch.toFixed(2)}%</div><div className="text-muted-foreground">24h</div></div>
              <div className="border hairline p-2"><div className="font-mono">{tradeModal.score}</div><div className="text-muted-foreground">AI score</div></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTradeModal(null)} className="py-2.5 bg-bull/15 border border-bull/30 text-bull hover:bg-bull/25 transition-colors">Buy</button>
              <button onClick={() => setTradeModal(null)} className="py-2.5 bg-bear/15 border border-bear/30 text-bear hover:bg-bear/25 transition-colors">Sell</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
