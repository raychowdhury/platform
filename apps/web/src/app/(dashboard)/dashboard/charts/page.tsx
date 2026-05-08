"use client";
import { useMemo, useState } from "react";
import { genCandles, genSpark, rand } from "@/lib/chart-data";
import {
  Bar, BarChart, ComposedChart, Line, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, ReferenceLine, Cell
} from "recharts";
import {
  Crosshair, Maximize2, Settings2, Star, Search, Pencil, Ruler,
  LineChart, BarChart3, Activity, Layers, Save, Camera, Share2, Bell, Plus
} from "lucide-react";


const TFS = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];
const INDICATORS = ["MA(20)", "MA(50)", "MA(200)", "EMA(21)", "BB(20,2)", "VWAP", "RSI(14)", "MACD"];
const TOOLS = [
  { icon: Crosshair, label: "Cross" },
  { icon: Pencil, label: "Trend" },
  { icon: Ruler, label: "Measure" },
  { icon: LineChart, label: "Line" },
  { icon: BarChart3, label: "Bar" },
  { icon: Activity, label: "Pattern" },
  { icon: Layers, label: "Layers" },
];

const WATCH = [
  { sym: "AAPL", price: 63719.9, ch: 1.24 },
  { sym: "MSFT", price: 3077.93, ch: 0.42 },
  { sym: "AMD", price: 148.21, ch: 5.48 },
  { sym: "NVDA", price: 1128.34, ch: 3.22 },
  { sym: "AAPL", price: 184.40, ch: 0.18 },
  { sym: "TSLA", price: 194.22, ch: -4.14 },
  { sym: "GOLD", price: 2318.5, ch: 0.18 },
  { sym: "EUR/USD", price: 1.0784, ch: -0.06 },
];

function genBook(seed = 1) {
  const bids: any[] = [], asks: any[] = [];
  for (let i = 0; i < 12; i++) {
    bids.push({ p: 63700 - i * 4 + rand(seed + i) * 2, s: 0.1 + rand(seed + i + 1) * 4 });
    asks.push({ p: 63720 + i * 4 + rand(seed + i + 50) * 2, s: 0.1 + rand(seed + i + 51) * 4 });
  }
  return { bids, asks };
}

export default function ChartsPage() {
  const [tf, setTf] = useState("15m");
  const [chartType, setChartType] = useState<"candles" | "line" | "area">("candles");
  const data = useMemo(() => genCandles(tf.length + 9, 90), [tf]);
  const last = data[data.length - 1];
  const change = ((last.c - data[0].o) / data[0].o) * 100;
  const book = useMemo(() => genBook(3), []);
  const rsi = useMemo(() => Array.from({ length: 90 }, (_, i) => ({ i, v: 30 + rand(i + 99) * 50 })), []);

  return (
    <>
      {/* Symbol header */}
      <div className="glass p-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-400/30 grid place-items-center font-display text-lg">₿</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl">AAPL</h1>
              <button className="text-muted-foreground hover:text-amber-300"><Star className="w-3.5 h-3.5" /></button>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border hairline px-1.5 py-0.5">Spot · NASDAQ</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-1">
              Apple Inc. · Equity · Day vol 42.1B
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <div className="font-display text-3xl tabular-nums">{last.c.toFixed(2)}</div>
            <div className={`text-xs font-mono ${change >= 0 ? "text-bull" : "text-bear"}`}>
              {change >= 0 ? "+" : ""}{(last.c - data[0].o).toFixed(2)} ({change.toFixed(2)}%) · today
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] font-mono">
            <span className="text-muted-foreground">O <span className="text-foreground">{data[0].o.toFixed(2)}</span></span>
            <span className="text-muted-foreground">H <span className="text-foreground">{Math.max(...data.map(d => d.h)).toFixed(2)}</span></span>
            <span className="text-muted-foreground">L <span className="text-foreground">{Math.min(...data.map(d => d.l)).toFixed(2)}</span></span>
            <span className="text-muted-foreground">C <span className="text-foreground">{last.c.toFixed(2)}</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr_280px] gap-5">
        {/* Watchlist column */}
        <aside className="glass p-3 flex flex-col gap-2 order-2 xl:order-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Watchlist</span>
            <button className="text-muted-foreground hover:text-foreground"><Plus className="w-3 h-3" /></button>
          </div>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Filter…" className="w-full text-[11px] bg-white/[0.03] border hairline pl-7 pr-2 py-1.5 focus:outline-none focus:border-accent/40" />
          </div>
          <div className="flex flex-col gap-0.5 mt-1">
            {WATCH.map((w, i) => (
              <button key={w.sym} className={`flex items-center justify-between px-2 py-2 text-[12px] hover:bg-white/[0.04] ${i === 0 ? "bg-white/[0.05]" : ""}`}>
                <span>{w.sym}</span>
                <div className="text-right">
                  <div className="font-mono">{w.price.toLocaleString()}</div>
                  <div className={`text-[10px] font-mono ${w.ch >= 0 ? "text-bull" : "text-bear"}`}>{w.ch >= 0 ? "+" : ""}{w.ch}%</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chart workspace */}
        <section className="glass p-0 flex flex-col order-1 xl:order-2 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 p-3 border-b hairline">
            <div className="flex items-center gap-1">
              {TFS.map(t => (
                <button key={t} onClick={() => setTf(t)}
                  className={`px-2.5 py-1.5 text-[11px] border hairline ${tf === t ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {t}
                </button>
              ))}
              <span className="w-px h-5 bg-white/10 mx-2" />
              {(["candles", "line", "area"] as const).map(t => (
                <button key={t} onClick={() => setChartType(t)}
                  className={`px-2.5 py-1.5 text-[11px] border hairline capitalize ${chartType === t ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button className="px-2.5 py-1.5 text-[11px] border hairline text-muted-foreground hover:text-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> Alert</button>
              <button className="px-2.5 py-1.5 text-[11px] border hairline text-muted-foreground hover:text-foreground flex items-center gap-1"><Camera className="w-3 h-3" /> Snap</button>
              <button className="px-2.5 py-1.5 text-[11px] border hairline text-muted-foreground hover:text-foreground flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
              <button className="px-2.5 py-1.5 text-[11px] border hairline text-muted-foreground hover:text-foreground flex items-center gap-1"><Share2 className="w-3 h-3" /></button>
              <button className="px-2.5 py-1.5 text-[11px] border hairline text-muted-foreground hover:text-foreground"><Settings2 className="w-3 h-3" /></button>
              <button className="px-2.5 py-1.5 text-[11px] border hairline text-muted-foreground hover:text-foreground"><Maximize2 className="w-3 h-3" /></button>
            </div>
          </div>

          {/* Indicators row */}
          <div className="flex items-center gap-1 px-3 py-2 border-b hairline overflow-x-auto">
            {INDICATORS.map((ind, i) => (
              <span key={ind} className={`text-[10px] font-mono px-2 py-1 border hairline whitespace-nowrap ${i < 3 ? "text-foreground bg-white/[0.04]" : "text-muted-foreground"}`}>
                {ind}
              </span>
            ))}
            <button className="text-[10px] px-2 py-1 border border-dashed border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 whitespace-nowrap">+ Indicator</button>
          </div>

          <div className="flex">
            {/* Drawing tools */}
            <div className="hidden md:flex flex-col border-r hairline p-1.5 gap-1">
              {TOOLS.map(({ icon: Icon, label }, i) => (
                <button key={label} title={label}
                  className={`p-2 ${i === 0 ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              ))}
            </div>

            {/* Main chart */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="h-[420px] p-2">
                <ResponsiveContainer>
                  {chartType === "candles" ? (
                    <ComposedChart data={data} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="i" hide />
                      <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} domain={["dataMin - 30", "dataMax + 30"]} axisLine={false} tickLine={false} width={50} />
                      <Tooltip cursor={{ stroke: "var(--chart-cursor)", strokeDasharray: 3 }}
                        contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <ReferenceLine y={last.c} stroke="color-mix(in oklab, var(--violet) 50%, transparent)" strokeDasharray="3 3" label={{ value: last.c.toFixed(0), fill: "var(--violet)", fontSize: 10, position: "right" }} />
                      <Bar dataKey="wick" fill="transparent" stroke="var(--chart-wick)" strokeWidth={1} />
                      <Bar dataKey="body">
                        {data.map((d, i) => <Cell key={i} fill={d.up ? "var(--bull)" : "var(--bear)"} />)}
                      </Bar>
                      <Line type="monotone" dataKey="c" stroke="color-mix(in oklab, var(--violet) 60%, transparent)" strokeWidth={1.2} dot={false} />
                    </ComposedChart>
                  ) : chartType === "line" ? (
                    <ComposedChart data={data} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="i" hide />
                      <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={50} />
                      <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <Line type="monotone" dataKey="c" stroke="var(--accent)" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  ) : (
                    <AreaChart data={data} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="i" hide />
                      <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={50} />
                      <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <Area type="monotone" dataKey="c" stroke="var(--accent)" strokeWidth={2} fill="url(#cArea)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
              {/* Volume */}
              <div className="h-20 px-2 border-t hairline">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground py-1 px-1">
                  <span>Volume</span><span className="font-mono">{(last.vol).toFixed(0)}</span>
                </div>
                <div className="h-12">
                  <ResponsiveContainer>
                    <BarChart data={data}>
                      <Bar dataKey="vol">
                        {data.map((d, i) => <Cell key={i} fill={d.up ? "color-mix(in oklab, var(--bull) 40%, transparent)" : "color-mix(in oklab, var(--bear) 40%, transparent)"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* RSI */}
              <div className="h-24 px-2 border-t hairline">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground py-1 px-1">
                  <span>RSI(14)</span><span className="font-mono text-bull">62.4</span>
                </div>
                <div className="h-16">
                  <ResponsiveContainer>
                    <ComposedChart data={rsi}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <YAxis hide domain={[0, 100]} />
                      <ReferenceLine y={70} stroke="color-mix(in oklab, var(--bear) 40%, transparent)" strokeDasharray="2 2" />
                      <ReferenceLine y={30} stroke="color-mix(in oklab, var(--bull) 40%, transparent)" strokeDasharray="2 2" />
                      <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Order book + trade */}
        <aside className="glass flex flex-col order-3 overflow-hidden">
          <div className="px-4 py-3 border-b hairline flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Order book</span>
            <span className="text-[10px] font-mono text-muted-foreground">0.01 ▾</span>
          </div>
          <div className="grid grid-cols-3 px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b hairline">
            <span>Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
          </div>
          <div className="flex flex-col">
            {book.asks.slice().reverse().map((a, i) => (
              <div key={i} className="relative grid grid-cols-3 px-4 py-1 text-[11px] font-mono">
                <div className="absolute inset-y-0 right-0 bg-bear/10" style={{ width: `${a.s * 18}%` }} />
                <span className="relative text-bear">{a.p.toFixed(2)}</span>
                <span className="relative text-right">{a.s.toFixed(3)}</span>
                <span className="relative text-right text-muted-foreground">{(a.p * a.s).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-y hairline flex items-center justify-between">
            <span className="font-display text-lg text-bull">{last.c.toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground font-mono">spread 12.4</span>
          </div>
          <div className="flex flex-col">
            {book.bids.map((b, i) => (
              <div key={i} className="relative grid grid-cols-3 px-4 py-1 text-[11px] font-mono">
                <div className="absolute inset-y-0 right-0 bg-bull/10" style={{ width: `${b.s * 18}%` }} />
                <span className="relative text-bull">{b.p.toFixed(2)}</span>
                <span className="relative text-right">{b.s.toFixed(3)}</span>
                <span className="relative text-right text-muted-foreground">{(b.p * b.s).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="p-3 border-t hairline flex flex-col gap-2 mt-auto">
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <button className="py-2 bg-bull/15 border border-bull/30 text-bull font-medium">Buy</button>
              <button className="py-2 bg-bear/15 border border-bear/30 text-bear font-medium">Sell</button>
            </div>
            <input placeholder="Amount" className="w-full bg-white/[0.03] border hairline px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-accent/40" />
            <button className="text-[11px] py-2 bg-primary text-primary-foreground font-medium">Place market order</button>
          </div>
        </aside>
      </div>

      {/* Bottom: depth + trades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="glass p-5 lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Market depth</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cumulative · 1% range</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={genSpark(7, true, 60).map((d, i) => ({ i, b: i < 30 ? d.v + 10 : 0, a: i >= 30 ? d.v + 10 : 0 }))}>
                <defs>
                  <linearGradient id="bd" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--bull)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--bull)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="ad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--bear)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--bear)" stopOpacity={0} /></linearGradient>
                </defs>
                <Area type="step" dataKey="b" stroke="var(--bull)" fill="url(#bd)" strokeWidth={1.5} />
                <Area type="step" dataKey="a" stroke="var(--bear)" fill="url(#ad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="glass p-5 flex flex-col gap-2">
          <h3 className="font-display text-xl">Recent trades</h3>
          <div className="grid grid-cols-3 text-[10px] uppercase tracking-wider text-muted-foreground border-b hairline pb-2">
            <span>Price</span><span className="text-right">Size</span><span className="text-right">Time</span>
          </div>
          <div className="flex flex-col text-[11px] font-mono">
            {Array.from({ length: 10 }).map((_, i) => {
              const up = rand(i + 8) > 0.5;
              return (
                <div key={i} className="grid grid-cols-3 py-1 border-b hairline last:border-0">
                  <span className={up ? "text-bull" : "text-bear"}>{(63700 + rand(i) * 40).toFixed(2)}</span>
                  <span className="text-right">{(0.01 + rand(i + 1) * 1.4).toFixed(3)}</span>
                  <span className="text-right text-muted-foreground">{`14:${(20 + i).toString().padStart(2, "0")}:0${i % 9}`}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
