"use client";
import { useMemo, useRef, useEffect, useState } from "react";
import { genArea, genSpark, rand } from "@/lib/chart-data";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  Pie, PieChart, Cell,
} from "recharts";
import {
  ArrowDownRight, ArrowUpRight, Download, Plus, Eye, EyeOff,
  Wallet, TrendingUp, ArrowLeftRight, Filter, MoreHorizontal, X, Check,
} from "lucide-react";


const RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;

const HOLDINGS = [
  { sym: "AAPL", name: "Apple Inc.", qty: 1.842, avg: 41220, price: 63719.9, alloc: 32 },
  { sym: "NVDA", name: "NVIDIA Corp", qty: 124, avg: 482.1, price: 1128.34, alloc: 22 },
  { sym: "MSFT", name: "Microsoft Corp", qty: 18.2, avg: 2210, price: 3077.93, alloc: 14 },
  { sym: "AAPL", name: "Apple Inc.", qty: 96, avg: 168.4, price: 184.4, alloc: 9 },
  { sym: "AMD", name: "Adv. Micro Devices", qty: 144, avg: 92.4, price: 148.21, alloc: 7 },
  { sym: "TSLA", name: "Tesla", qty: 60, avg: 219.0, price: 194.22, alloc: 5 },
  { sym: "GOLD", name: "Gold spot", qty: 22, avg: 1980, price: 2318.5, alloc: 6 },
  { sym: "USDC", name: "USD Coin", qty: 12400, avg: 1, price: 1, alloc: 5 },
];

const TX = [
  { t: "Buy", sym: "AAPL", qty: 0.12, price: 62410, time: "Today · 09:42", note: "AI signal entry" },
  { t: "Sell", sym: "TSLA", qty: 20, price: 198.4, time: "Today · 08:11", note: "Take profit 50%" },
  { t: "Deposit", sym: "USDC", qty: 5000, price: 1, time: "Yesterday · 22:14", note: "Wire from bank" },
  { t: "Buy", sym: "MSFT", qty: 2.1, price: 3024, time: "Yesterday · 17:35", note: "DCA weekly" },
  { t: "Buy", sym: "NVDA", qty: 8, price: 1112, time: "May 6 · 14:08", note: "Earnings play" },
  { t: "Sell", sym: "AMD", qty: 30, price: 152.6, time: "May 5 · 11:47", note: "Profit lock" },
];

const COLORS = ["var(--bull)", "var(--accent)", "oklch(0.75 0.18 60)", "oklch(0.7 0.18 220)", "var(--bear)", "oklch(0.7 0.12 320)", "oklch(0.78 0.12 90)", "oklch(0.6 0.05 260)"];

export default function PortfolioPage() {
  const [range, setRange] = useState<typeof RANGES[number]>("1M");
  const [hideValues, setHideValues] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>("AAPL");
  const [downloading, setDownloading] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [tradeModal, setTradeModal] = useState<typeof HOLDINGS[number] | null>(null);
  const [moreMenu, setMoreMenu] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState("Asset class");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [newHolding, setNewHolding] = useState({ sym: "", qty: "", avg: "" });
  const [holdings, setHoldings] = useState(HOLDINGS);
  const moreRef = useRef<HTMLTableDataCellElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreMenu(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const GROUPS = ["Asset class", "Sector", "Currency", "Account"];
  const cycleGroup = () => setGroupBy(g => GROUPS[(GROUPS.indexOf(g) + 1) % GROUPS.length]);

  const data = useMemo(() => genArea(range.length + 3, 90, 124000, 1800), [range]);
  const allocData = HOLDINGS.map((h) => ({ name: h.sym, value: h.alloc }));
  const totalValue = HOLDINGS.reduce((s, h) => s + h.qty * h.price, 0);
  const totalCost = HOLDINGS.reduce((s, h) => s + h.qty * h.avg, 0);
  const pnl = totalValue - totalCost;
  const pnlPct = (pnl / totalCost) * 100;

  const fmt = (n: number) =>
    hideValues ? "•••••" : n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <>
      {/* Hero */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Portfolio</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">
            Net worth <em className="not-italic italic text-accent">at a glance</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Across 4 connected accounts · last sync 12 seconds ago
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button onClick={() => setHideValues(v => !v)} className="px-3 py-2 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer">
            {hideValues ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {hideValues ? "Show" : "Hide"} values
          </button>
          <button onClick={() => { setDownloading(true); setTimeout(() => setDownloading(false), 1500); }}
            className={`px-3 py-2 border hairline flex items-center gap-1.5 cursor-pointer transition-colors ${downloading ? "text-bull border-bull/30 bg-bull/10" : "hover:bg-white/5 text-muted-foreground hover:text-foreground"}`}>
            <Download className="w-3 h-3" /> {downloading ? "✓ Downloaded" : "Statement"}
          </button>
          <button onClick={() => setAddModal(true)} className="px-3 py-2 bg-accent/15 border border-accent/30 text-accent flex items-center gap-1.5 cursor-pointer hover:bg-accent/25 transition-colors">
            <Plus className="w-3 h-3" /> Add holding
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Total value", v: `$${fmt(totalValue)}`, c: "+1.5% today", up: true, i: Wallet },
          { l: "Unrealized P&L", v: `${pnl >= 0 ? "+" : ""}$${fmt(pnl)}`, c: `${pnlPct.toFixed(2)}% all time`, up: pnl >= 0, i: TrendingUp },
          { l: "Realized YTD", v: `+$${fmt(48214)}`, c: "+18.4% YTD", up: true, i: ArrowUpRight },
          { l: "Cash balance", v: `$${fmt(12400)}`, c: "5% of book", up: true, i: ArrowLeftRight },
        ].map((k) => (
          <div key={k.l} className="glass p-5 flex flex-col gap-2 cursor-pointer hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</span>
              <k.i className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.4} />
            </div>
            <div className="font-display text-3xl tabular-nums">{k.v}</div>
            <span className={`text-[11px] font-mono ${k.up ? "text-bull" : "text-bear"}`}>{k.c}</span>
          </div>
        ))}
      </div>

      {/* Chart + Allocation */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="glass p-6 xl:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-display text-2xl">Performance</h3>
              <p className="text-xs text-muted-foreground">Mark-to-market value over time</p>
            </div>
            <div className="flex gap-0.5 glass-soft p-0.5">
              {RANGES.map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-[11px] cursor-pointer transition-colors ${range === r ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pf" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.04)" vertical={false} />
                <XAxis dataKey="i" tick={{ fontSize: 10, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: "oklch(1 0 0 / 0.2)", strokeDasharray: 3 }}
                  contentStyle={{ background: "oklch(0.18 0.012 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 4, fontSize: 11 }}
                  labelFormatter={() => ""}
                />
                <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} fill="url(#pf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl">Allocation</h3>
              <p className="text-xs text-muted-foreground">Hover to highlight</p>
            </div>
          </div>
          <div className="relative h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={allocData}
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={1}
                  dataKey="value"
                  onMouseEnter={(_, i) => setHovered(allocData[i].name)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {allocData.map((d, i) => (
                    <Cell key={d.name} fill={COLORS[i % COLORS.length]}
                      opacity={hovered === null || hovered === d.name ? 1 : 0.3}
                      style={{ cursor: "pointer", transition: "opacity 0.2s" }} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{hovered ?? "Total"}</div>
                <div className="font-display text-xl tabular-nums">
                  {hovered
                    ? `${HOLDINGS.find(h => h.sym === hovered)?.alloc}%`
                    : `$${fmt(totalValue / 1000)}k`}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
            {HOLDINGS.slice(0, 8).map((h, i) => (
              <button key={h.sym}
                onMouseEnter={() => setHovered(h.sym)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center gap-2 text-[11px] py-1 cursor-pointer hover:bg-white/[0.04] px-1 transition-colors ${hovered === h.sym ? "bg-white/[0.04]" : ""}`}>
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 text-left">{h.sym}</span>
                <span className="font-mono text-muted-foreground">{h.alloc}%</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Holdings table */}
      <section className="glass p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b hairline flex-wrap gap-3">
          <div>
            <h3 className="font-display text-2xl">Holdings</h3>
            <p className="text-xs text-muted-foreground">Click a row to view details · {HOLDINGS.length} positions</p>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <button onClick={() => setFilterOpen(o => !o)} className={`px-2.5 py-1.5 border hairline flex items-center gap-1 cursor-pointer transition-colors ${filterOpen ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Filter className="w-3 h-3" /> Filter</button>
            <button onClick={cycleGroup} className="px-2.5 py-1.5 border hairline text-muted-foreground hover:text-foreground cursor-pointer">Group: {groupBy}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b hairline">
                <th className="text-left font-normal py-3 pl-4">Asset</th>
                <th className="text-right font-normal">Qty</th>
                <th className="text-right font-normal">Avg cost</th>
                <th className="text-right font-normal">Price</th>
                <th className="text-right font-normal">Value</th>
                <th className="text-right font-normal">P&L</th>
                <th className="text-right font-normal pr-2">Trend</th>
                <th className="pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((h, i) => {
                const value = h.qty * h.price;
                const pnl = value - h.qty * h.avg;
                const pnlPct = ((h.price - h.avg) / h.avg) * 100;
                const isSelected = selected === h.sym;
                return (
                  <tr key={h.sym}
                    onClick={() => setSelected(s => s === h.sym ? null : h.sym)}
                    className={`border-b hairline cursor-pointer transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-white/[0.03]"}`}>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] grid place-items-center text-[10px] font-mono">{h.sym.slice(0, 2)}</div>
                        <div>
                          <div className="text-sm">{h.sym}</div>
                          <div className="text-[10px] text-muted-foreground">{h.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-mono">{h.qty}</td>
                    <td className="text-right font-mono text-muted-foreground">${fmt(h.avg)}</td>
                    <td className="text-right font-mono">${fmt(h.price)}</td>
                    <td className="text-right font-mono">${fmt(value)}</td>
                    <td className={`text-right font-mono ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
                      {pnl >= 0 ? "+" : ""}${fmt(pnl)}
                      <div className="text-[10px] opacity-70">{pnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</div>
                    </td>
                    <td className="pr-2">
                      <div className="h-7 w-20 ml-auto">
                        <ResponsiveContainer>
                          <AreaChart data={genSpark(i + 17, pnl >= 0)}>
                            <defs>
                              <linearGradient id={`pfh${i}`} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={pnl >= 0 ? "var(--bull)" : "var(--bear)"} stopOpacity={0.5} />
                                <stop offset="100%" stopColor={pnl >= 0 ? "var(--bull)" : "var(--bear)"} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="v" stroke={pnl >= 0 ? "var(--bull)" : "var(--bear)"} strokeWidth={1.4} fill={`url(#pfh${i})`} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="pr-4 text-right" ref={moreRef}>
                      <div className="flex items-center gap-1 justify-end relative">
                        <button onClick={(e) => { e.stopPropagation(); setTradeModal(h); }} className="text-[10px] px-2 py-1 border hairline text-muted-foreground hover:text-foreground hover:bg-white/[0.06] cursor-pointer">Trade</button>
                        <button onClick={(e) => { e.stopPropagation(); setMoreMenu(m => m === h.sym ? null : h.sym); }}
                          className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                        {moreMenu === h.sym && (
                          <div className="absolute right-0 top-full mt-1 glass z-30 flex flex-col min-w-[140px] shadow-xl">
                            {["View details", "Set alert", "Add to watchlist", "Remove position"].map(action => (
                              <button key={action} onClick={(e) => { e.stopPropagation(); setMoreMenu(null); }}
                                className={`text-left px-3 py-2 text-[12px] hover:bg-white/[0.06] transition-colors ${action === "Remove position" ? "text-bear" : "text-muted-foreground hover:text-foreground"}`}>
                                {action}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transactions */}
      <section className="glass p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-2xl">Recent activity</h3>
            <p className="text-xs text-muted-foreground">All accounts · last 7 days</p>
          </div>
          <button onClick={() => setShowAll(s => !s)} className="text-[11px] text-accent hover:text-foreground cursor-pointer">{showAll ? "Show less ↑" : "View all →"}</button>
        </div>
        <div className="flex flex-col gap-1">
          {(showAll ? TX : TX.slice(0, 4)).map((t, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_auto] md:grid-cols-[40px_1fr_120px_140px_auto] items-center gap-3 px-2 py-2 hover:bg-white/[0.04] cursor-pointer transition-colors">
              <div className={`w-7 h-7 grid place-items-center text-[10px] uppercase font-mono ${
                t.t === "Buy" ? "bg-bull/15 text-bull border border-bull/30" :
                t.t === "Sell" ? "bg-bear/15 text-bear border border-bear/30" :
                "bg-accent/15 text-accent border border-accent/30"
              }`}>
                {t.t === "Buy" ? <ArrowDownRight className="w-3.5 h-3.5" /> : t.t === "Sell" ? <ArrowUpRight className="w-3.5 h-3.5" /> : "$"}
              </div>
              <div className="min-w-0">
                <div className="text-sm">{t.t} <span className="text-muted-foreground">·</span> {t.sym}</div>
                <div className="text-[10px] text-muted-foreground truncate">{t.note}</div>
              </div>
              <div className="hidden md:block text-right font-mono text-xs">{t.qty} @ ${t.price.toLocaleString()}</div>
              <div className="hidden md:block text-right text-[11px] text-muted-foreground">{t.time}</div>
              <button className="text-muted-foreground hover:text-foreground cursor-pointer p-1" title="More options"><MoreHorizontal className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Add holding modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setAddModal(false)}>
          <div onClick={e => e.stopPropagation()} className="glass max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Add holding</h3>
              <button onClick={() => setAddModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Symbol</span>
                <input value={newHolding.sym} onChange={e => setNewHolding(h => ({ ...h, sym: e.target.value }))}
                  className="bg-white/[0.03] border hairline px-3 py-2 font-mono uppercase focus:outline-none focus:border-accent/40" placeholder="AAPL" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Quantity</span>
                <input type="number" value={newHolding.qty} onChange={e => setNewHolding(h => ({ ...h, qty: e.target.value }))}
                  className="bg-white/[0.03] border hairline px-3 py-2 font-mono focus:outline-none focus:border-accent/40" placeholder="10" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Avg cost</span>
                <input type="number" value={newHolding.avg} onChange={e => setNewHolding(h => ({ ...h, avg: e.target.value }))}
                  className="bg-white/[0.03] border hairline px-3 py-2 font-mono focus:outline-none focus:border-accent/40" placeholder="150.00" />
              </label>
            </div>
            <div className="flex gap-2 text-[11px]">
              <button onClick={() => setAddModal(false)} className="flex-1 py-2.5 border hairline hover:bg-white/5">Cancel</button>
              <button onClick={() => {
                if (!newHolding.sym) return;
                setHoldings(arr => [...arr, { sym: newHolding.sym.toUpperCase(), name: newHolding.sym.toUpperCase(), qty: Number(newHolding.qty) || 1, avg: Number(newHolding.avg) || 100, price: Number(newHolding.avg) || 100, alloc: 1 }]);
                setAddModal(false); setNewHolding({ sym: "", qty: "", avg: "" });
              }} className="flex-1 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Trade modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setTradeModal(null)}>
          <div onClick={e => e.stopPropagation()} className="glass max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trade</div>
                <h3 className="font-display text-2xl mt-1">{tradeModal.sym}</h3>
                <p className="text-xs text-muted-foreground">{tradeModal.name}</p>
              </div>
              <button onClick={() => setTradeModal(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="border hairline p-2"><div className="font-mono text-sm">${tradeModal.price.toLocaleString()}</div><div className="text-[10px] text-muted-foreground">Price</div></div>
              <div className="border hairline p-2"><div className="font-mono text-sm">{tradeModal.qty} units</div><div className="text-[10px] text-muted-foreground">Held</div></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTradeModal(null)} className="py-2.5 bg-bull/15 border border-bull/30 text-bull cursor-pointer hover:bg-bull/25 transition-colors text-sm">Buy more</button>
              <button onClick={() => setTradeModal(null)} className="py-2.5 bg-bear/15 border border-bear/30 text-bear cursor-pointer hover:bg-bear/25 transition-colors text-sm">Sell</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
