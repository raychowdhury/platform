"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { genCandles, rand } from "@/lib/chart-data";
import {
  Bar, BarChart, ComposedChart, Line, ResponsiveContainer,
  XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, AreaChart, Area, ReferenceLine, Cell
} from "recharts";
import {
  Crosshair, Maximize2, Settings2, Star, Search, Pencil, Ruler,
  LineChart, BarChart3, Activity, Layers, Save, Camera, Share2, Bell,
  ChevronDown, ChevronRight, ChevronLeft,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types & constants ────────────────────────────────────────────────────────

type Layout    = "1x1" | "2h" | "2v" | "2x2";
type ChartType = "candles" | "line" | "area" | "depth";

const LAYOUTS: { id: Layout; title: string }[] = [
  { id: "1x1", title: "Single" },
  { id: "2h",  title: "Side by side" },
  { id: "2v",  title: "Stacked" },
  { id: "2x2", title: "2×2 grid" },
];

const PANEL_COUNT: Record<Layout, number> = { "1x1": 1, "2h": 2, "2v": 2, "2x2": 4 };

const TFS      = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];
const TFS_COMP = ["5m", "15m", "1H", "4H", "1D"];
const INDICATORS = ["MA(20)", "MA(50)", "MA(200)", "EMA(21)", "BB(20,2)", "VWAP", "RSI(14)", "MACD"];
const TOOLS = [
  { icon: Crosshair, label: "Cross"   },
  { icon: Pencil,    label: "Trend"   },
  { icon: Ruler,     label: "Measure" },
  { icon: LineChart, label: "Line"    },
  { icon: BarChart3, label: "Bar"     },
  { icon: Activity,  label: "Pattern" },
  { icon: Layers,    label: "Layers"  },
];

const CHART_TYPES: { id: ChartType; label: string; short: string }[] = [
  { id: "candles", label: "Candles", short: "C" },
  { id: "line",    label: "Line",    short: "L" },
  { id: "area",    label: "Area",    short: "A" },
  { id: "depth",   label: "Depth",   short: "D" },
];

const SYMBOLS = [
  { sym: "AAPL",    name: "Apple Inc.",               type: "Equity",  exchange: "NASDAQ", price: 184.40,   ch:  0.18  },
  { sym: "MSFT",    name: "Microsoft Corp.",           type: "Equity",  exchange: "NASDAQ", price: 415.32,   ch:  0.42  },
  { sym: "NVDA",    name: "NVIDIA Corp.",              type: "Equity",  exchange: "NASDAQ", price: 1128.34,  ch:  3.22  },
  { sym: "TSLA",    name: "Tesla Inc.",                type: "Equity",  exchange: "NASDAQ", price: 194.22,   ch: -4.14  },
  { sym: "AMD",     name: "Advanced Micro Devices",    type: "Equity",  exchange: "NASDAQ", price: 148.21,   ch:  5.48  },
  { sym: "AMZN",    name: "Amazon.com Inc.",           type: "Equity",  exchange: "NASDAQ", price: 185.07,   ch:  0.89  },
  { sym: "GOOG",    name: "Alphabet Inc.",             type: "Equity",  exchange: "NASDAQ", price: 170.62,   ch: -0.31  },
  { sym: "META",    name: "Meta Platforms",            type: "Equity",  exchange: "NASDAQ", price: 495.18,   ch:  1.14  },
  { sym: "SPX",     name: "S&P 500 Index",             type: "Index",   exchange: "CBOE",   price: 5214.08,  ch:  0.42  },
  { sym: "ES1!",    name: "E-mini S&P 500 Futures",    type: "Futures", exchange: "CME",    price: 5210.25,  ch:  0.38  },
  { sym: "NQ1!",    name: "E-mini Nasdaq-100 Futures", type: "Futures", exchange: "CME",    price: 18240.00, ch:  0.61  },
  { sym: "XAUUSD",  name: "Gold / US Dollar",          type: "Forex",   exchange: "OTC",    price: 2318.50,  ch:  0.18  },
  { sym: "EURUSD",  name: "Euro / US Dollar",          type: "Forex",   exchange: "OTC",    price: 1.0784,   ch: -0.06  },
  { sym: "BTC/USD", name: "Bitcoin / US Dollar",       type: "Crypto",  exchange: "SPOT",   price: 63719.90, ch:  1.24  },
  { sym: "ETH/USD", name: "Ethereum / US Dollar",      type: "Crypto",  exchange: "SPOT",   price: 3077.93,  ch:  0.42  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genBook(seed = 1) {
  const bids: { p: number; s: number }[] = [];
  const asks: { p: number; s: number }[] = [];
  for (let i = 0; i < 14; i++) {
    bids.push({ p: 63700 - i * 4 + rand(seed + i) * 2,      s: 0.1 + rand(seed + i + 1)  * 4 });
    asks.push({ p: 63720 + i * 4 + rand(seed + i + 50) * 2, s: 0.1 + rand(seed + i + 51) * 4 });
  }
  return { bids, asks };
}

function buildDepthData(book: ReturnType<typeof genBook>) {
  const bids = [...book.bids].sort((a, b) => b.p - a.p); // high → low
  const asks = [...book.asks].sort((a, b) => a.p - b.p); // low  → high
  let cum = 0;
  const bidPts = bids.map(b => { cum += b.s; return { price: Math.round(b.p), bid: +cum.toFixed(2), ask: 0 }; }).reverse();
  cum = 0;
  const askPts = asks.map(a => { cum += a.s; return { price: Math.round(a.p), bid: 0, ask: +cum.toFixed(2) }; });
  return [...bidPts, ...askPts];
}

// ─── Layout icon ─────────────────────────────────────────────────────────────

function LayoutIcon({ id }: { id: Layout }) {
  if (id === "1x1") return (
    <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="12" height="12" rx="1" />
    </svg>
  );
  if (id === "2h") return (
    <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="5.5" height="12" rx="1" />
      <rect x="7.5" y="1" width="5.5" height="12" rx="1" />
    </svg>
  );
  if (id === "2v") return (
    <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="12" height="5.5" rx="1" />
      <rect x="1" y="7.5" width="12" height="5.5" rx="1" />
    </svg>
  );
  return (
    <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1"   y="1"   width="5.5" height="5.5" rx="1" />
      <rect x="7.5" y="1"   width="5.5" height="5.5" rx="1" />
      <rect x="1"   y="7.5" width="5.5" height="5.5" rx="1" />
      <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

// ─── ChartPanel ───────────────────────────────────────────────────────────────

function ChartPanel({
  panelId,
  defaultSymIdx = 0,
  isActive,
  compact,
  onActivate,
}: {
  panelId: string;
  defaultSymIdx?: number;
  isActive: boolean;
  compact: boolean;
  onActivate: () => void;
}) {
  const [tf, setTf]               = useState("15m");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [symbol, setSymbol]       = useState(SYMBOLS[defaultSymIdx % SYMBOLS.length]);
  const [showPicker, setShowPicker] = useState(false);
  const [symSearch, setSymSearch]   = useState("");
  const [starred, setStarred]       = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const data      = useMemo(() => genCandles(tf.length + 9, 90), [tf]);
  const last      = data[data.length - 1];
  const change    = ((last.c - data[0].o) / data[0].o) * 100;
  const rsi       = useMemo(() => Array.from({ length: 90 }, (_, i) => ({ i, v: 30 + rand(i + 99) * 50 })), []);
  const book      = useMemo(() => genBook(defaultSymIdx + 3), [defaultSymIdx]);
  const depthData = useMemo(() => buildDepthData(book), [book]);

  const filtered = SYMBOLS.filter(
    s => s.sym.toLowerCase().includes(symSearch.toLowerCase()) ||
         s.name.toLowerCase().includes(symSearch.toLowerCase())
  );

  const isDepth = chartType === "depth";
  const gradId  = `cArea-${panelId}`;

  return (
    <div
      className={`flex flex-col min-h-0 h-full overflow-hidden relative cursor-default
        ${isActive && compact ? "ring-1 ring-inset ring-accent/50 z-10" : ""}`}
      onClick={onActivate}
    >
      {/* ── Panel toolbar ── */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 border-b hairline shrink-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Left: symbol + price */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <button
              onClick={() => { setShowPicker(v => !v); setTimeout(() => searchRef.current?.focus(), 40); }}
              className="flex items-center gap-1 hover:text-accent transition-colors"
            >
              <span className="font-mono font-semibold text-[13px]">{symbol.sym}</span>
              <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showPicker ? "rotate-180" : ""}`} />
            </button>

            {showPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setShowPicker(false); setSymSearch(""); }} />
                <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-[var(--sidebar)] border hairline shadow-xl flex flex-col">
                  <div className="relative border-b hairline">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={searchRef}
                      value={symSearch}
                      onChange={e => setSymSearch(e.target.value)}
                      placeholder="Search symbol…"
                      className="w-full bg-transparent pl-8 pr-3 py-2 text-[11px] font-mono focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col max-h-60 overflow-y-auto">
                    {filtered.map(s => (
                      <button
                        key={s.sym}
                        onClick={() => { setSymbol(s); setShowPicker(false); setSymSearch(""); }}
                        className={`flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.06] ${s.sym === symbol.sym ? "bg-white/[0.04]" : ""}`}
                      >
                        <div>
                          <div className="text-[11px] font-mono font-medium">{s.sym}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{s.name}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-mono">{s.price.toLocaleString()}</div>
                          <div className={`text-[10px] font-mono ${s.ch >= 0 ? "text-bull" : "text-bear"}`}>
                            {s.ch >= 0 ? "+" : ""}{s.ch}%
                          </div>
                        </div>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <div className="px-3 py-5 text-center text-[11px] text-muted-foreground">No results</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className={compact ? "text-[13px]" : "font-display text-xl"}>{last.c.toFixed(2)}</span>
            <span className={change >= 0 ? "text-bull" : "text-bear"}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </span>
          </div>

          {!compact && (
            <>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border hairline px-1.5 py-0.5 hidden lg:inline-flex">
                {symbol.type} · {symbol.exchange}
              </span>
              <button onClick={() => setStarred(s => !s)} className={`transition-colors ${starred ? "text-amber-300" : "text-muted-foreground hover:text-amber-300"}`}>
                <Star className={`w-3.5 h-3.5 ${starred ? "fill-current" : ""}`} />
              </button>
            </>
          )}
        </div>

        {/* Right: TF + chart type */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {(compact ? TFS_COMP : TFS).map(t => (
            <button key={t} onClick={() => setTf(t)}
              className={`px-2 py-1 text-[10px] border hairline ${tf === t ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
          <span className="w-px h-4 bg-white/10 mx-1" />
          <TooltipProvider delayDuration={0}>
            {CHART_TYPES.map(ct => (
              <Tooltip key={ct.id}>
                <TooltipTrigger asChild>
                  <button onClick={() => setChartType(ct.id)}
                    className={`px-2 py-1 text-[10px] border hairline ${chartType === ct.id ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {compact ? ct.short : ct.label}
                  </button>
                </TooltipTrigger>
                {compact && (
                  <TooltipContent side="bottom" sideOffset={6} className="rounded-none bg-popover text-popover-foreground border hairline px-2 py-1 text-[11px] font-mono uppercase tracking-[0.15em] shadow-lg">
                    {ct.label}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* ── Indicators row (single, non-depth only) ── */}
      {!compact && !isDepth && (
        <div className="flex items-center gap-1 px-3 py-2 border-b hairline overflow-x-auto shrink-0">
          {INDICATORS.map((ind, i) => (
            <span key={ind} className={`text-[10px] font-mono px-2 py-1 border hairline whitespace-nowrap ${i < 3 ? "text-foreground bg-white/[0.04]" : "text-muted-foreground"}`}>
              {ind}
            </span>
          ))}
          <button className="text-[10px] px-2 py-1 border border-dashed border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 whitespace-nowrap">
            + Indicator
          </button>
        </div>
      )}

      {/* ── Chart body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Drawing tools (single, non-depth only) */}
        {!compact && !isDepth && (
          <div className="hidden md:flex flex-col border-r hairline p-1.5 gap-1 shrink-0">
            {TOOLS.map(({ icon: Icon, label }, i) => (
              <button key={label} title={label}
                className={`p-2 ${i === 0 ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}>
                <Icon className="w-3.5 h-3.5" strokeWidth={1.6} />
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* ── Market Depth view ── */}
          {isDepth ? (
            <div className={`${compact ? "flex-1 min-h-0" : "h-[560px]"} p-4 flex flex-col gap-3`}>
              {/* Mid-price callout */}
              <div className="flex items-center justify-center gap-4 text-[11px] font-mono">
                <span className="text-bull">Bid {book.bids[0].p.toFixed(2)}</span>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-foreground font-semibold">{last.c.toFixed(2)}</span>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-bear">Ask {book.asks[0].p.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground">Spread {(book.asks[0].p - book.bids[0].p).toFixed(2)}</span>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={depthData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`bid-${panelId}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--bull)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--bull)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id={`ask-${panelId}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--bear)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--bear)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="price" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={40} />
                    <ChartTooltip
                      contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }}
                      formatter={(val: number, name: string) => [val > 0 ? val.toFixed(3) : null, name === "bid" ? "Bid size" : "Ask size"]}
                      labelFormatter={v => `Price ${v}`}
                    />
                    <Area type="step" dataKey="bid" stroke="var(--bull)" fill={`url(#bid-${panelId})`} strokeWidth={1.5} />
                    <Area type="step" dataKey="ask" stroke="var(--bear)" fill={`url(#ask-${panelId})`} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Bid/ask summary row */}
              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono shrink-0">
                <div className="border hairline border-bull/20 bg-bull/5 p-2.5 flex flex-col gap-1">
                  <div className="text-[9px] uppercase tracking-wider text-bull">Total bid liquidity</div>
                  <div className="text-lg font-display text-bull">{book.bids.reduce((s, b) => s + b.s, 0).toFixed(2)}</div>
                </div>
                <div className="border hairline border-bear/20 bg-bear/5 p-2.5 flex flex-col gap-1">
                  <div className="text-[9px] uppercase tracking-wider text-bear">Total ask liquidity</div>
                  <div className="text-lg font-display text-bear">{book.asks.reduce((s, a) => s + a.s, 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Price chart ── */}
              <div className={compact ? "flex-1 min-h-0 p-2" : "h-[380px] p-2"}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "candles" ? (
                    <ComposedChart data={data} margin={{ top: 8, right: 50, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="i" hide />
                      <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} domain={["dataMin - 30", "dataMax + 30"]} axisLine={false} tickLine={false} width={50} />
                      <ChartTooltip cursor={{ stroke: "var(--chart-cursor)", strokeDasharray: 3 }}
                        contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <ReferenceLine y={last.c} stroke="color-mix(in oklab, var(--violet) 50%, transparent)" strokeDasharray="3 3"
                        label={!compact ? { value: last.c.toFixed(0), fill: "var(--violet)", fontSize: 10, position: "right" } : undefined} />
                      <Bar dataKey="wick" fill="transparent" stroke="var(--chart-wick)" strokeWidth={1} />
                      <Bar dataKey="body">
                        {data.map((d, i) => <Cell key={i} fill={d.up ? "var(--bull)" : "var(--bear)"} />)}
                      </Bar>
                      <Line type="monotone" dataKey="c" stroke="color-mix(in oklab, var(--violet) 60%, transparent)" strokeWidth={1.2} dot={false} />
                    </ComposedChart>
                  ) : chartType === "line" ? (
                    <ComposedChart data={data} margin={{ top: 8, right: 50, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="i" hide />
                      <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={50} />
                      <ChartTooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <Line type="monotone" dataKey="c" stroke="var(--accent)" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  ) : (
                    <AreaChart data={data} margin={{ top: 8, right: 50, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="i" hide />
                      <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={50} />
                      <ChartTooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <Area type="monotone" dataKey="c" stroke="var(--accent)" strokeWidth={2} fill={`url(#${gradId})`} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Volume */}
              <div className={`${compact ? "h-14" : "h-20"} px-2 border-t hairline shrink-0`}>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground py-1 px-1">
                  <span>VOL</span><span className="font-mono">{last.vol.toFixed(0)}</span>
                </div>
                <div className="h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <Bar dataKey="vol">
                        {data.map((d, i) => <Cell key={i} fill={d.up ? "color-mix(in oklab, var(--bull) 40%, transparent)" : "color-mix(in oklab, var(--bear) 40%, transparent)"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RSI — single panel only */}
              {!compact && (
                <div className="h-24 px-2 border-t hairline shrink-0">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground py-1 px-1">
                    <span>RSI(14)</span><span className="font-mono text-bull">62.4</span>
                  </div>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
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
              )}

              {/* OHLC footer — single panel only */}
              {!compact && (
                <div className="hidden md:flex items-center gap-6 px-4 py-2 border-t hairline text-[11px] font-mono shrink-0">
                  <span className="text-muted-foreground">O <span className="text-foreground">{data[0].o.toFixed(2)}</span></span>
                  <span className="text-muted-foreground">H <span className="text-foreground">{Math.max(...data.map(d => d.h)).toFixed(2)}</span></span>
                  <span className="text-muted-foreground">L <span className="text-foreground">{Math.min(...data.map(d => d.l)).toFixed(2)}</span></span>
                  <span className="text-muted-foreground">C <span className="text-foreground">{last.c.toFixed(2)}</span></span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChartsPage() {
  const [layout, setLayout]           = useState<Layout>("1x1");
  const [activePanel, setActivePanel] = useState(0);
  const [bookCollapsed, setBookCollapsed] = useState(false);
  const [snapped, setSnapped]           = useState(false);
  const [chartSaved, setChartSaved]     = useState(false);
  const [shared, setShared]             = useState(false);
  const [maximized, setMaximized]       = useState(false);
  const [orderSide, setOrderSide]       = useState<"Buy" | "Sell" | null>(null);
  const [orderAmount, setOrderAmount]   = useState("");
  const [orderPlaced, setOrderPlaced]   = useState(false);
  const router = useRouter();

  const book = useMemo(() => genBook(3), []);
  const last = useMemo(() => genBook(3).bids[0], []);

  const snap = () => { setSnapped(true); setTimeout(() => setSnapped(false), 1500); };
  const saveChart = () => { setChartSaved(true); setTimeout(() => setChartSaved(false), 1500); };
  const share = () => { setShared(true); setTimeout(() => setShared(false), 1500); };
  const placeOrder = () => {
    if (!orderAmount) return;
    setOrderPlaced(true);
    setOrderSide(null);
    setOrderAmount("");
    setTimeout(() => setOrderPlaced(false), 2000);
  };

  const panelCount = PANEL_COUNT[layout];
  const compact    = layout !== "1x1";

  const gridClass: Record<Layout, string> = {
    "1x1": "grid grid-cols-1",
    "2h":  "grid grid-cols-2 divide-x divide-[var(--hairline)]",
    "2v":  "grid grid-cols-1 divide-y divide-[var(--hairline)]",
    "2x2": "grid grid-cols-2 divide-x divide-[var(--hairline)]",
  };
  const gridStyle: React.CSSProperties = compact
    ? { height: layout === "2x2" ? "640px" : "600px", gridTemplateRows: layout === "2x2" ? "1fr 1fr" : "1fr" }
    : {};

  return (
    <>
      {/* ── Global toolbar ── */}
      <div className="glass p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground mr-2">Layout</span>
          {LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => { setLayout(l.id); setActivePanel(0); }}
              title={l.title}
              className={`p-2 border hairline transition-colors ${layout === l.id ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}
            >
              <LayoutIcon id={l.id} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => router.push("/dashboard/alerts")} className="px-2.5 py-1.5 text-[11px] border hairline text-muted-foreground hover:text-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> Alert</button>
          <button onClick={snap} className={`px-2.5 py-1.5 text-[11px] border transition-colors flex items-center gap-1 ${snapped ? "border-bull/30 text-bull bg-bull/10" : "hairline text-muted-foreground hover:text-foreground"}`}><Camera className="w-3 h-3" /> {snapped ? "Saved!" : "Snap"}</button>
          <button onClick={saveChart} className={`px-2.5 py-1.5 text-[11px] border transition-colors flex items-center gap-1 ${chartSaved ? "border-bull/30 text-bull bg-bull/10" : "hairline text-muted-foreground hover:text-foreground"}`}><Save className="w-3 h-3" /> {chartSaved ? "Saved!" : "Save"}</button>
          <button onClick={share} className={`px-2.5 py-1.5 text-[11px] border transition-colors ${shared ? "border-accent/30 text-accent bg-accent/10" : "hairline text-muted-foreground hover:text-foreground"}`} title={shared ? "Link copied!" : "Share"}><Share2 className="w-3 h-3" /></button>
          <button onClick={() => router.push("/dashboard/settings")} className="px-2.5 py-1.5 text-[11px] border hairline text-muted-foreground hover:text-foreground" title="Chart settings"><Settings2 className="w-3 h-3" /></button>
          <button onClick={() => setMaximized(m => !m)} className={`px-2.5 py-1.5 text-[11px] border transition-colors ${maximized ? "border-accent/30 text-accent bg-accent/10" : "hairline text-muted-foreground hover:text-foreground"}`} title={maximized ? "Exit fullscreen" : "Fullscreen"}><Maximize2 className="w-3 h-3" /></button>
        </div>
      </div>

      {/* ── Chart + Order book grid ── */}
      <div className={`grid grid-cols-1 gap-5 xl:transition-[grid-template-columns] xl:duration-300 xl:ease-in-out ${bookCollapsed ? "xl:grid-cols-[1fr_36px]" : "xl:grid-cols-[1fr_280px]"}`}>
        {/* Chart workspace */}
        <section className="glass p-0 flex flex-col order-1 overflow-hidden">
          <div className={`${gridClass[layout]} overflow-hidden`} style={gridStyle}>
            {Array.from({ length: panelCount }, (_, i) => (
              <ChartPanel
                key={i}
                panelId={`p${i}`}
                defaultSymIdx={i}
                isActive={activePanel === i}
                compact={compact}
                onActivate={() => setActivePanel(i)}
              />
            ))}
          </div>
        </section>

        {/* ── Order book ── */}
        <aside className="glass flex flex-col order-2 overflow-hidden relative">
          {/* Collapsed strip — fades in when collapsed */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200 ${bookCollapsed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
            <button
              onClick={() => setBookCollapsed(false)}
              title="Expand order book"
              className="flex-1 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ writingMode: "vertical-rl" }}>Book</span>
            </button>
          </div>

          {/* Expanded content — fades in when expanded */}
          <div className={`flex flex-col h-full transition-opacity duration-200 ${bookCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            <div className="px-4 py-3 border-b hairline flex items-center justify-between shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Order book</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">0.01 ▾</span>
                <button
                  onClick={() => setBookCollapsed(true)}
                  title="Collapse order book"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b hairline shrink-0">
              <span>Price</span>
              <span className="text-right">Size</span>
              <span className="text-right">Total</span>
            </div>
            <div className="flex flex-col overflow-y-auto">
              {book.asks.slice().reverse().map((a, i) => (
                <div key={i} className="relative grid grid-cols-3 px-4 py-1 text-[11px] font-mono">
                  <div className="absolute inset-y-0 right-0 bg-bear/10" style={{ width: `${a.s * 18}%` }} />
                  <span className="relative text-bear">{a.p.toFixed(2)}</span>
                  <span className="relative text-right">{a.s.toFixed(3)}</span>
                  <span className="relative text-right text-muted-foreground">{(a.p * a.s).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-y hairline flex items-center justify-between shrink-0">
              <span className="font-display text-lg text-bull">{book.bids[0].p.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                spread {(book.asks[0].p - book.bids[0].p).toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col overflow-y-auto">
              {book.bids.map((b, i) => (
                <div key={i} className="relative grid grid-cols-3 px-4 py-1 text-[11px] font-mono">
                  <div className="absolute inset-y-0 right-0 bg-bull/10" style={{ width: `${b.s * 18}%` }} />
                  <span className="relative text-bull">{b.p.toFixed(2)}</span>
                  <span className="relative text-right">{b.s.toFixed(3)}</span>
                  <span className="relative text-right text-muted-foreground">{(b.p * b.s).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="p-3 border-t hairline flex flex-col gap-2 mt-auto shrink-0">
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <button onClick={() => setOrderSide("Buy")} className={`py-2 font-medium transition-colors ${orderSide === "Buy" ? "bg-bull/40 border border-bull text-bull" : "bg-bull/15 border border-bull/30 text-bull hover:bg-bull/25"}`}>Buy</button>
                <button onClick={() => setOrderSide("Sell")} className={`py-2 font-medium transition-colors ${orderSide === "Sell" ? "bg-bear/40 border border-bear text-bear" : "bg-bear/15 border border-bear/30 text-bear hover:bg-bear/25"}`}>Sell</button>
              </div>
              <input value={orderAmount} onChange={e => setOrderAmount(e.target.value)} placeholder="Amount" className="w-full bg-white/[0.03] border hairline px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-accent/40" />
              {orderPlaced ? (
                <div className="text-[11px] py-2 bg-bull/15 border border-bull/30 text-bull text-center font-medium">✓ Order placed</div>
              ) : (
                <button onClick={placeOrder} disabled={!orderSide || !orderAmount} className={`text-[11px] py-2 font-medium transition-colors ${orderSide ? "bg-primary text-primary-foreground hover:bg-primary/80" : "bg-white/5 text-muted-foreground cursor-not-allowed"}`}>
                  {orderSide ? `Place ${orderSide} order` : "Select Buy or Sell"}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
