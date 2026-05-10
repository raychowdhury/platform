"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { genCandles, rand } from "@/lib/chart-data";
import { useCandles } from "@/lib/useCandles";
import { useOrderBook } from "@/lib/useOrderBook";
import { useFootprint, useCvd, useTpo } from "@/lib/useMarketStreams";
import {
  Bar, BarChart, ComposedChart, Line, ResponsiveContainer,
  XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, AreaChart, Area, ReferenceLine, ReferenceArea, Cell
} from "recharts";
import {
  Crosshair, Maximize2, Settings2, Star, Search, Pencil, Ruler,
  LineChart, BarChart3, Activity, Layers, Save, Camera, Share2, Bell,
  ChevronDown, ChevronRight, ChevronLeft, Grid2x2,
} from "lucide-react";
import BookmapChart         from "@/components/dashboard/BookmapChart";
import FootprintChart        from "@/components/dashboard/FootprintChart";
import OrderflowChart        from "@/components/dashboard/OrderflowChart";
import RangeFPChart          from "@/components/dashboard/RangeFPChart";
import TPOChart              from "@/components/dashboard/TPOChart";
import ESRTHChart            from "@/components/dashboard/ESRTHChart";
import FootprintDeltaChart   from "@/components/dashboard/FootprintDeltaChart";
import KISSOrderFlowChart    from "@/components/dashboard/KISSOrderFlowChart";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types & constants ────────────────────────────────────────────────────────

type Layout    = "1x1" | "2h" | "2v" | "2x2";
type ChartType = "candles" | "line" | "area" | "depth" | "bookmap" | "footprint" | "orderflow" | "rangefp" | "tpo" | "esrth" | "fpdelta" | "kiss";

const LAYOUTS: { id: Layout; title: string }[] = [
  { id: "1x1", title: "Single" },
  { id: "2h",  title: "Side by side" },
  { id: "2v",  title: "Stacked" },
  { id: "2x2", title: "2×2 grid" },
];

const PANEL_COUNT: Record<Layout, number> = { "1x1": 1, "2h": 2, "2v": 2, "2x2": 4 };

const TF_MS: Record<string, number> = {
  "1m": 60_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000,
  "1H": 3_600_000, "4H": 14_400_000, "1D": 86_400_000, "1W": 604_800_000,
};

const TFS      = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];
const TFS_COMP = ["5m", "15m", "1H", "4H", "1D"];
const INDICATORS = ["MA(20)", "MA(50)", "MA(200)", "EMA(21)", "BB(20,2)", "VWAP", "RSI(14)", "MACD", "Hammer↑", "Hammer↓"];
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
  { id: "candles",   label: "Candles",    short: "C" },
  { id: "line",      label: "Line",       short: "L" },
  { id: "area",      label: "Area",       short: "A" },
  { id: "depth",     label: "Depth",      short: "D" },
  { id: "bookmap",   label: "Bookmap",    short: "BM" },
  { id: "footprint", label: "Footprint",  short: "FP" },
  { id: "orderflow", label: "Orderflow",  short: "OF" },
  { id: "rangefp",   label: "Range FP Δ", short: "RF" },
  { id: "tpo",       label: "TPO RTH",    short: "TP" },
  { id: "esrth",     label: "ES RTH FP",    short: "ES" },
  { id: "fpdelta",   label: "FP Delta 1H",  short: "FD" },
  { id: "kiss",      label: "KISS Flow",    short: "KF" },
];

const SYMBOLS = [
  { sym: "ESM6",    name: "E-mini S&P 500 Jun 2026",  type: "Futures", exchange: "CME",    price: 7377,     ch:  0     },
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

// ─── Indicator math ───────────────────────────────────────────────────────────

function calcSMA(data: any[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((s: number, d: any) => s + d.c, 0) / period;
  });
}

function calcEMA(data: any[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return out;
  out[period - 1] = data.slice(0, period).reduce((s: number, d: any) => s + d.c, 0) / period;
  for (let i = period; i < data.length; i++) {
    out[i] = data[i].c * k + out[i - 1]! * (1 - k);
  }
  return out;
}

function calcEMAValues(values: (number | null)[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = new Array(values.length).fill(null);
  const start = values.findIndex(v => v !== null);
  if (start === -1 || start + period > values.length) return out;
  let sum = 0, count = 0;
  for (let i = start; i < start + period; i++) { if (values[i] !== null) { sum += values[i]!; count++; } }
  out[start + period - 1] = sum / count;
  for (let i = start + period; i < values.length; i++) {
    if (values[i] === null) continue;
    out[i] = values[i]! * k + out[i - 1]! * (1 - k);
  }
  return out;
}

function calcBB(data: any[], period: number, mult: number) {
  const ma = calcSMA(data, period);
  return data.map((_, i) => {
    if (ma[i] === null) return { bbUpper: null, bbLower: null, bbMid: null };
    const slice = data.slice(i - period + 1, i + 1);
    const mean = ma[i]!;
    const std = Math.sqrt(slice.reduce((s: number, d: any) => s + Math.pow(d.c - mean, 2), 0) / period);
    return { bbUpper: mean + mult * std, bbLower: mean - mult * std, bbMid: mean };
  });
}

function calcVWAP(data: any[]): number[] {
  let cumVP = 0, cumV = 0;
  return data.map((d: any) => { cumVP += ((d.h + d.l + d.c) / 3) * d.vol; cumV += d.vol; return cumVP / cumV; });
}

function calcRSI(data: any[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(data.length).fill(null);
  for (let i = period; i < data.length; i++) {
    let g = 0, l = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = data[j].c - data[j - 1].c;
      if (d > 0) g += d; else l -= d;
    }
    out[i] = 100 - 100 / (1 + (l === 0 ? 100 : g / l));
  }
  return out;
}

function calcMACD(data: any[]) {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdLine = data.map((_, i) => ema12[i] !== null && ema26[i] !== null ? ema12[i]! - ema26[i]! : null);
  const signal = calcEMAValues(macdLine, 9);
  return data.map((_, i) => ({
    macd: macdLine[i],
    macdSig: signal[i],
    macdHist: macdLine[i] !== null && signal[i] !== null ? macdLine[i]! - signal[i]! : null,
  }));
}

// ─── Candlestick custom shapes ───────────────────────────────────────────────

function CandleShape(props: any) {
  const { x, y, width, height, payload } = props;
  if (!payload || height <= 0) return null;
  const { l, h, o, c } = payload;
  if (h === l) return null;
  const up    = c >= o;
  const color = up ? "#26a69a" : "#ef5350";
  const cx    = Math.round(x + width / 2);
  const toY   = (price: number) => y + height * (h - price) / (h - l);
  const bodyTop = toY(Math.max(o, c));
  const bodyBot = toY(Math.min(o, c));
  const bodyH   = Math.max(1.5, bodyBot - bodyTop);
  const bodyW   = Math.max(3, Math.round(width * 0.65));
  const bx      = Math.round(x + (width - bodyW) / 2);
  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={bx} y={bodyTop} width={bodyW} height={bodyH} fill={color} />
    </g>
  );
}

// ─── Hammer pattern detection ────────────────────────────────────────────────

function detectHammer(d: any): boolean {
  const body        = Math.abs(d.c - d.o);
  const range       = d.h - d.l;
  if (range < 0.01) return false;
  const lowerShadow = Math.min(d.o, d.c) - d.l;
  const upperShadow = d.h - Math.max(d.o, d.c);
  return lowerShadow >= Math.max(body * 2, range * 0.3) && upperShadow <= range * 0.2 && body <= range * 0.35;
}

function detectShootingStar(d: any): boolean {
  const body        = Math.abs(d.c - d.o);
  const range       = d.h - d.l;
  if (range < 0.01) return false;
  const upperShadow = d.h - Math.max(d.o, d.c);
  const lowerShadow = Math.min(d.o, d.c) - d.l;
  return upperShadow >= Math.max(body * 2, range * 0.3) && lowerShadow <= range * 0.2 && body <= range * 0.35;
}

function HammerUpDot({ cx, cy, value }: any) {
  if (value == null || cy == null) return null;
  return <polygon points={`${cx},${cy - 9} ${cx - 6},${cy} ${cx + 6},${cy}`} fill="#22c55e" opacity={0.9} />;
}

function HammerDownDot({ cx, cy, value }: any) {
  if (value == null || cy == null) return null;
  return <polygon points={`${cx},${cy + 9} ${cx - 6},${cy} ${cx + 6},${cy}`} fill="#ef4444" opacity={0.9} />;
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

// ─── ChartTypeDropdown ────────────────────────────────────────────────────────

const CHART_TYPE_ICONS: Record<ChartType, React.ReactNode> = {
  candles:   <BarChart3 size={12} />,
  line:      <LineChart size={12} />,
  area:      <Activity size={12} />,
  depth:     <Layers size={12} />,
  bookmap:   <Grid2x2 size={12} />,
  footprint: <Layers size={12} />,
  orderflow: <Activity size={12} />,
  rangefp:   <BarChart3 size={12} />,
  tpo:       <BarChart3 size={12} />,
  esrth:     <Grid2x2 size={12} />,
  fpdelta:   <BarChart3 size={12} />,
  kiss:      <Activity size={12} />,
};

function ChartTypeDropdown({ value, onChange }: { value: ChartType; onChange: (t: ChartType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = CHART_TYPES.find(ct => ct.id === value)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] border hairline bg-white/[0.04] hover:bg-white/[0.08] text-foreground transition-colors"
      >
        {CHART_TYPE_ICONS[value]}
        {current.label}
        <ChevronDown size={10} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 border hairline bg-popover shadow-xl min-w-[110px] py-0.5">
          {CHART_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => { onChange(ct.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors ${ct.id === value ? "text-accent" : "text-foreground"}`}
            >
              {CHART_TYPE_ICONS[ct.id]}
              {ct.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ChartPanel ───────────────────────────────────────────────────────────────

function ChartPanel({
  panelId,
  defaultSymIdx = 0,
  isActive,
  compact,
  onActivate,
  onSymbolChange,
}: {
  panelId: string;
  defaultSymIdx?: number;
  isActive: boolean;
  compact: boolean;
  onActivate: () => void;
  onSymbolChange?: (sym: string) => void;
}) {
  const [tf, setTf]               = useState("15m");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [symbol, setSymbol]       = useState(SYMBOLS[defaultSymIdx % SYMBOLS.length]);

  // Notify parent whenever this panel's symbol changes (and on first mount
  // when active) so the OB aside can follow the active panel's symbol.
  useEffect(() => {
    if (isActive) onSymbolChange?.(symbol.sym);
  }, [isActive, symbol.sym, onSymbolChange]);
  const [showPicker, setShowPicker] = useState(false);
  const [symSearch, setSymSearch]   = useState("");
  const [starred, setStarred]       = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(
    () => new Set(["MA(20)", "MA(50)", "MA(200)"])
  );

  // Real candles via API; fall back to deterministic mock when the symbol
  // is not wired to the backend (or the API hasn't responded yet).
  const live = useCandles(symbol.sym, tf, 200);
  const data = useMemo(() => {
    if (live.data && live.data.length > 0) return live.data;
    return genCandles(tf.length + 9, 90);
  }, [live.data, tf]);

  // Live order-flow streams are fetched per active chart type — no point
  // polling footprint when user is on plain candles, etc. The hooks
  // tolerate symbols without backend coverage by returning `data: null`.
  const fpLive  = useFootprint(symbol.sym, tf, 50);
  const cvdLive = useCvd(symbol.sym, tf, 200);
  const tpoLive = useTpo(symbol.sym);
  // Defensive: data is always 90+ via the genCandles fallback, but a future
  // refactor or empty-API edge case must not crash the whole chart panel.
  const last      = data[data.length - 1] ?? { c: 0, o: 0, h: 0, l: 0, body: [0, 0] as [number, number], wick: [0, 0] as [number, number], up: true, vol: 0, i: 0 };
  const firstO    = data[0]?.o ?? 0;
  const change    = firstO !== 0 ? ((last.c - firstO) / firstO) * 100 : 0;

  const enrichedData = useMemo(() => {
    const ma20  = calcSMA(data, 20);
    const ma50  = calcSMA(data, 50);
    const ma200 = calcSMA(data, 200);
    const ema21 = calcEMA(data, 21);
    const bb    = calcBB(data, 20, 2);
    const vwap  = calcVWAP(data);
    const rsiV  = calcRSI(data, 14);
    const macdV = calcMACD(data);
    const tfMs  = TF_MS[tf] ?? 900_000;
    // Hydration-safe baseTs: prefer the API-provided ts on the first bar,
    // else fall back to a fixed origin so SSR matches client (Date.now()
    // would diverge → React error #418).
    const firstTs = (data[0] as { ts?: number } | undefined)?.ts ?? 0;
    const baseTs = firstTs;
    return data.map((d, idx) => ({
      ...d,
      ts:    (d as { ts?: number }).ts ?? baseTs + idx * tfMs,
      ma20:  ma20[idx],  ma50:  ma50[idx],  ma200: ma200[idx], ema21: ema21[idx],
      ...bb[idx],
      vwap:  vwap[idx],
      rsiV:       rsiV[idx],
      ...macdV[idx],
      hammerLow:  detectHammer(d)       ? d.l - 10 : null,
      hammerHigh: detectShootingStar(d) ? d.h + 10 : null,
    }));
  }, [data, tf]);

  const book      = useMemo(() => genBook(defaultSymIdx + 3), [defaultSymIdx]);
  const depthData = useMemo(() => buildDepthData(book), [book]);

  const toggleIndicator = (ind: string) =>
    setActiveIndicators(prev => { const n = new Set(prev); n.has(ind) ? n.delete(ind) : n.add(ind); return n; });

  // ── Pan / zoom ────────────────────────────────────────────────────────────────
  const TOTAL = enrichedData.length;
  const MIN_WIN = 10;
  const chartBodyRef = useRef<HTMLDivElement>(null);
  const isDragging   = useRef(false);
  const dragStartX   = useRef(0);
  const dragStartOff = useRef(0);
  const [isGrabbing, setIsGrabbing] = useState(false);

  // Floating-point window (for smooth lerp)
  const curS = useRef(0), curE = useRef(TOTAL - 1);
  const tgtS = useRef(0), tgtE = useRef(TOTAL - 1);
  const animId = useRef<number | null>(null);

  // Integer state (drives React rendering)
  const [winStart, setWinStart] = useState(0);
  const [winEnd,   setWinEnd]   = useState(TOTAL - 1);

  // Reset window when tf changes
  useEffect(() => {
    curS.current = 0; curE.current = TOTAL - 1;
    tgtS.current = 0; tgtE.current = TOTAL - 1;
    if (animId.current) cancelAnimationFrame(animId.current);
    setWinStart(0); setWinEnd(TOTAL - 1);
  }, [tf, TOTAL]);

  // Animation fn stored in ref so the rAF loop always closes over the latest version
  const animFn = useRef(() => {});
  animFn.current = () => {
    const L = 0.18;
    const ns = curS.current + (tgtS.current - curS.current) * L;
    const ne = curE.current + (tgtE.current - curE.current) * L;
    const done = Math.abs(ns - tgtS.current) < 0.05 && Math.abs(ne - tgtE.current) < 0.05;
    curS.current = done ? tgtS.current : ns;
    curE.current = done ? tgtE.current : ne;
    setWinStart(Math.round(Math.max(0, curS.current)));
    setWinEnd(Math.round(Math.min(TOTAL - 1, curE.current)));
    if (!done) animId.current = requestAnimationFrame(animFn.current);
    else animId.current = null;
  };

  // Wheel — vertical = zoom, horizontal = pan
  useEffect(() => {
    const el = chartBodyRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const span = tgtE.current - tgtS.current;
      let ns = tgtS.current;
      let ne = tgtE.current;

      // Horizontal scroll → pan (keep span fixed)
      if (e.deltaX !== 0) {
        const rect  = el.getBoundingClientRect();
        const shift = (e.deltaX / rect.width) * span * 2.5;
        ns += shift;
        ne += shift;
        if (ns < 0)         { ns = 0;         ne = span; }
        if (ne > TOTAL - 1) { ne = TOTAL - 1; ns = Math.max(0, ne - span); }
      }

      // Vertical scroll → zoom
      if (e.deltaY !== 0) {
        const dir   = e.deltaY > 0 ? 1 : -1;
        const delta = (ne - ns) * 0.12 * dir;
        ns += delta / 2;
        ne -= delta / 2;
        if (ne - ns < MIN_WIN - 1) { const mid = (ns + ne) / 2; ns = mid - (MIN_WIN - 1) / 2; ne = mid + (MIN_WIN - 1) / 2; }
        if (ns < 0) { ne -= ns; ns = 0; }
        if (ne > TOTAL - 1) { ns -= ne - (TOTAL - 1); ne = TOTAL - 1; }
        ns = Math.max(0, ns);
        ne = Math.min(TOTAL - 1, ne);
      }

      tgtS.current = ns;
      tgtE.current = ne;

      // Horizontal dominant → immediate update for 1:1 trackpad feel
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        curS.current = ns;
        curE.current = ne;
        setWinStart(Math.round(Math.max(0, ns)));
        setWinEnd(Math.round(Math.min(TOTAL - 1, ne)));
        if (animId.current) { cancelAnimationFrame(animId.current); animId.current = null; }
      } else {
        if (animId.current) cancelAnimationFrame(animId.current);
        animId.current = requestAnimationFrame(animFn.current);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global mousemove / mouseup for pan (so drag works outside the chart div)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const el = chartBodyRef.current;
      if (!el) return;
      const pxPerBar = el.offsetWidth / (curE.current - curS.current + 1);
      const deltaBar = -(e.clientX - dragStartX.current) / pxPerBar;
      const size = curE.current - curS.current;
      const ns = Math.max(0, Math.min(TOTAL - 1 - size, dragStartOff.current + deltaBar));
      curS.current = ns; curE.current = ns + size;
      tgtS.current = ns; tgtE.current = ns + size;
      setWinStart(Math.round(ns)); setWinEnd(Math.round(ns + size));
    };
    const onUp = () => { isDragging.current = false; setIsGrabbing(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPanDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartOff.current = curS.current;
    setIsGrabbing(true);
    setCrosshair(null);
    if (animId.current) { cancelAnimationFrame(animId.current); animId.current = null; }
    e.preventDefault();
  };

  const resetZoom = () => {
    tgtS.current = 0; tgtE.current = TOTAL - 1;
    if (animId.current) cancelAnimationFrame(animId.current);
    animId.current = requestAnimationFrame(animFn.current);
  };

  const isZoomed    = winStart !== 0 || winEnd !== TOTAL - 1;
  const visibleData = enrichedData.slice(winStart, winEnd + 1);

  // X axis date formatter — UTC components only so the SSR-rendered SVG
  // text matches the client's first paint (local-time getters would yield
  // different output on different timezones → React #418 hydration error).
  const tfMs = TF_MS[tf] ?? 900_000;
  const formatXLabel = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const mm  = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd  = String(d.getUTCDate()).padStart(2, "0");
    const hh  = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return tfMs >= 86_400_000 ? `${mm}/${dd}` : tfMs >= 3_600_000 ? `${mm}/${dd} ${hh}:${min}` : `${hh}:${min}`;
  };
  const fmtPrice = (v: number) => v >= 1000 ? v.toFixed(0) : v.toFixed(2);

  const formatXLabelFull = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const yyyy = d.getUTCFullYear();
    const mm  = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd  = String(d.getUTCDate()).padStart(2, "0");
    const hh  = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return tfMs >= 86_400_000 ? `${yyyy}/${mm}/${dd}` : `${yyyy}/${mm}/${dd} ${hh}:${min}`;
  };

  // Crosshair overlay
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; ts: number; price: number; pct: number } | null>(null);

  const pDomainMin = visibleData.length ? Math.min(...visibleData.map(d => d.l)) - 30 : 0;
  const pDomainMax = visibleData.length ? Math.max(...visibleData.map(d => d.h)) + 30 : 100;

  const handleChartMove = (e: any) => {
    if (isDragging.current || !e?.activeCoordinate) { setCrosshair(null); return; }
    const svgY = e.activeCoordinate.y;
    const svgX = e.activeCoordinate.x;
    const h = chartBodyRef.current?.clientHeight ?? 380;
    // plot area: top margin 8 + div padding 8 = 16; bottom padding 8
    const plotH = h - 16 - 8;
    const price = pDomainMax - (svgY / plotH) * (pDomainMax - pDomainMin);
    const open0 = visibleData[0]?.o ?? price;
    const pct   = open0 ? ((price - open0) / open0) * 100 : 0;
    setCrosshair({ x: svgX, y: svgY, ts: Number(e.activeLabel), price, pct });
  };

  const filtered = SYMBOLS.filter(
    s => s.sym.toLowerCase().includes(symSearch.toLowerCase()) ||
         s.name.toLowerCase().includes(symSearch.toLowerCase())
  );

  const isDepth     = chartType === "depth";
  const isBookmap   = chartType === "bookmap";
  const isCanvasChart = ["bookmap","footprint","orderflow","rangefp","tpo","esrth","fpdelta","kiss"].includes(chartType);
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
          <ChartTypeDropdown value={chartType} onChange={setChartType} />
          {isZoomed && (
            <button onClick={resetZoom}
              className="px-2 py-1 text-[10px] border hairline border-accent/40 text-accent hover:bg-accent/10 transition-colors">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Indicators row (single, non-depth/canvas only) ── */}
      {!compact && !isDepth && !isCanvasChart && (
        <div className="flex items-center gap-1 px-3 py-2 border-b hairline overflow-x-auto shrink-0">
          {INDICATORS.map(ind => (
            <button
              key={ind}
              onClick={() => toggleIndicator(ind)}
              className={`text-[10px] font-mono px-2 py-1 border hairline whitespace-nowrap transition-colors ${
                activeIndicators.has(ind) ? "text-foreground bg-white/[0.08]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      )}

      {/* ── Chart body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Drawing tools (single, non-depth only) */}
        {!compact && !isDepth && !isCanvasChart && (
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
          {/* ── Canvas chart views ── */}
          {isCanvasChart ? (
            <div className="flex-1 min-h-0">
              {chartType === "bookmap"   && <BookmapChart  candles={enrichedData} seed={defaultSymIdx * 7 + 3} />}
              {chartType === "footprint" && <FootprintChart       basePrice={Math.round(data[0]?.o ?? 4262)} seed={defaultSymIdx * 5 + 1}  live={fpLive.data ?? undefined} />}
              {chartType === "orderflow" && <OrderflowChart       basePrice={Math.round(data[0]?.o ?? 5710)} seed={defaultSymIdx * 9 + 2}  live={fpLive.data ?? undefined} />}
              {chartType === "rangefp"   && <RangeFPChart         basePrice={Math.round(data[0]?.o ?? 5564)} seed={defaultSymIdx * 11 + 4} live={fpLive.data ?? undefined} />}
              {chartType === "tpo"       && <TPOChart             basePrice={Math.round(data[0]?.o ?? 5700)} seed={defaultSymIdx * 13 + 6} live={tpoLive.data ?? undefined} />}
              {chartType === "esrth"     && <ESRTHChart           basePrice={Math.round(data[0]?.o ?? 4187)} seed={defaultSymIdx * 17 + 8} live={fpLive.data ?? undefined} />}
              {chartType === "fpdelta"   && <FootprintDeltaChart  basePrice={Math.round(data[0]?.o ?? 70500)} seed={defaultSymIdx * 19 + 5} live={fpLive.data ?? undefined} />}
              {chartType === "kiss"      && <KISSOrderFlowChart   basePrice={Math.round(data[0]?.o ?? 6020)} seed={defaultSymIdx * 23 + 7} live={cvdLive.data ?? undefined} />}
            </div>
          ) : isDepth ? (
            <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">
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
                      formatter={(val: number, name: string) => [val > 0 ? val.toFixed(0) : null, name === "bid" ? "Bid size" : "Ask size"]}
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
              <div
                ref={chartBodyRef}
                className="flex-1 min-h-0 p-2 relative"
                onMouseDown={onPanDown}
                onMouseLeave={() => setCrosshair(null)}
                style={{ cursor: isGrabbing ? "grabbing" : "crosshair", userSelect: "none" }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "candles" ? (
                    <ComposedChart data={visibleData} margin={{ top: 8, right: 50, left: 0, bottom: 0 }}
                      onMouseMove={handleChartMove} onMouseLeave={() => setCrosshair(null)}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="ts" hide tickFormatter={formatXLabel} />
                      <YAxis orientation="right" tickFormatter={fmtPrice} tick={{ fontSize: 10, fill: "var(--chart-axis)" }} domain={["dataMin - 30", "dataMax + 30"]} axisLine={false} tickLine={false} width={50} />
                      <ChartTooltip cursor={{ stroke: "var(--chart-cursor)", strokeDasharray: 3 }}
                        contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <ReferenceLine y={last.h} stroke="rgba(38,166,154,0.35)" strokeDasharray="2 4"
                        label={!compact ? { value: `H ${last.h.toFixed(2)}`, fill: "rgba(38,166,154,0.75)", fontSize: 9, position: "right" } : undefined} />
                      <ReferenceLine y={last.o} stroke="rgba(180,180,180,0.25)" strokeDasharray="2 4"
                        label={!compact ? { value: `O ${last.o.toFixed(2)}`, fill: "rgba(180,180,180,0.60)", fontSize: 9, position: "right" } : undefined} />
                      <ReferenceLine y={last.c} stroke="color-mix(in oklab, var(--violet) 50%, transparent)" strokeDasharray="3 3"
                        label={!compact ? { value: `C ${last.c.toFixed(2)}`, fill: "var(--violet)", fontSize: 9, position: "right" } : undefined} />
                      <ReferenceLine y={last.l} stroke="rgba(239,83,80,0.35)" strokeDasharray="2 4"
                        label={!compact ? { value: `L ${last.l.toFixed(2)}`, fill: "rgba(239,83,80,0.75)", fontSize: 9, position: "right" } : undefined} />
                      <Bar dataKey="wick" shape={<CandleShape />} isAnimationActive={false} />
                      <Line type="monotone" dataKey="c" stroke="color-mix(in oklab, var(--violet) 60%, transparent)" strokeWidth={1.2} dot={false} />
                      {activeIndicators.has("MA(20)")   && <Line type="monotone" dataKey="ma20"    stroke="#60a5fa" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("MA(50)")   && <Line type="monotone" dataKey="ma50"    stroke="#a78bfa" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("MA(200)")  && <Line type="monotone" dataKey="ma200"   stroke="#f59e0b" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("EMA(21)")  && <Line type="monotone" dataKey="ema21"   stroke="#34d399" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("BB(20,2)") && <Line type="monotone" dataKey="bbUpper" stroke="rgba(148,163,184,0.55)" strokeWidth={1} strokeDasharray="3 2" dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("BB(20,2)") && <Line type="monotone" dataKey="bbLower" stroke="rgba(148,163,184,0.55)" strokeWidth={1} strokeDasharray="3 2" dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("BB(20,2)") && <Line type="monotone" dataKey="bbMid"   stroke="rgba(148,163,184,0.3)"  strokeWidth={1} dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("VWAP")     && <Line type="monotone" dataKey="vwap"    stroke="#fb923c" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("Hammer↑")  && <Line dataKey="hammerLow"  strokeWidth={0} dot={<HammerUpDot />}   isAnimationActive={false} legendType="none" />}
                      {activeIndicators.has("Hammer↓")  && <Line dataKey="hammerHigh" strokeWidth={0} dot={<HammerDownDot />} isAnimationActive={false} legendType="none" />}
                    </ComposedChart>
                  ) : chartType === "line" ? (
                    <ComposedChart data={visibleData} margin={{ top: 8, right: 50, left: 0, bottom: 0 }}
                      onMouseMove={handleChartMove} onMouseLeave={() => setCrosshair(null)}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="ts" hide tickFormatter={formatXLabel} />
                      <YAxis orientation="right" tickFormatter={fmtPrice} tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={50} />
                      <ChartTooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <Line type="monotone" dataKey="c" stroke="var(--accent)" strokeWidth={2} dot={false} />
                      {activeIndicators.has("MA(20)")   && <Line type="monotone" dataKey="ma20"    stroke="#60a5fa" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("MA(50)")   && <Line type="monotone" dataKey="ma50"    stroke="#a78bfa" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("MA(200)")  && <Line type="monotone" dataKey="ma200"   stroke="#f59e0b" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("EMA(21)")  && <Line type="monotone" dataKey="ema21"   stroke="#34d399" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("BB(20,2)") && <Line type="monotone" dataKey="bbUpper" stroke="rgba(148,163,184,0.55)" strokeWidth={1} strokeDasharray="3 2" dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("BB(20,2)") && <Line type="monotone" dataKey="bbLower" stroke="rgba(148,163,184,0.55)" strokeWidth={1} strokeDasharray="3 2" dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("VWAP")     && <Line type="monotone" dataKey="vwap"    stroke="#fb923c" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls legendType="none" />}
                    </ComposedChart>
                  ) : (
                    <ComposedChart data={visibleData} margin={{ top: 8, right: 50, left: 0, bottom: 0 }}
                      onMouseMove={handleChartMove} onMouseLeave={() => setCrosshair(null)}>
                      <defs>
                        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="ts" hide tickFormatter={formatXLabel} />
                      <YAxis orientation="right" tickFormatter={fmtPrice} tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={50} />
                      <ChartTooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11, color: "var(--foreground)" }} labelFormatter={() => ""} />
                      <Area type="monotone" dataKey="c" stroke="var(--accent)" strokeWidth={2} fill={`url(#${gradId})`} />
                      {activeIndicators.has("MA(20)")   && <Line type="monotone" dataKey="ma20"    stroke="#60a5fa" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("MA(50)")   && <Line type="monotone" dataKey="ma50"    stroke="#a78bfa" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("MA(200)")  && <Line type="monotone" dataKey="ma200"   stroke="#f59e0b" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("EMA(21)")  && <Line type="monotone" dataKey="ema21"   stroke="#34d399" strokeWidth={1}   dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("BB(20,2)") && <Line type="monotone" dataKey="bbUpper" stroke="rgba(148,163,184,0.55)" strokeWidth={1} strokeDasharray="3 2" dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("BB(20,2)") && <Line type="monotone" dataKey="bbLower" stroke="rgba(148,163,184,0.55)" strokeWidth={1} strokeDasharray="3 2" dot={false} connectNulls legendType="none" />}
                      {activeIndicators.has("VWAP")     && <Line type="monotone" dataKey="vwap"    stroke="#fb923c" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls legendType="none" />}
                    </ComposedChart>
                  )}
                </ResponsiveContainer>

                {/* ── Crosshair overlays ── */}
                {crosshair && !isDepth && (() => {
                  // SVG coords → div-relative coords (div has p-2 = 8px padding, chart top margin = 8)
                  const ox = crosshair.x + 8;  // left: 0 left-margin + 8px padding
                  const oy = crosshair.y + 16; // 8px top-margin + 8px padding
                  return (
                    <>
                      {/* Horizontal dashed line */}
                      <div className="absolute pointer-events-none"
                        style={{ top: oy, left: 8, right: 58, height: 0, borderTop: "1px dashed rgba(255,255,255,0.22)", zIndex: 15 }} />

                      {/* Price label — right Y axis */}
                      <div className="absolute pointer-events-none font-mono flex flex-col items-center"
                        style={{ top: oy, right: 8, transform: "translateY(-50%)", zIndex: 16, whiteSpace: "nowrap" }}>
                        <div style={{
                          background: "var(--accent)",
                          color: "#000",
                          padding: "2px 7px 2px 6px",
                          fontSize: 11,
                          fontWeight: 600,
                          lineHeight: 1.4,
                        }}>
                          {crosshair.price.toFixed(2)}
                        </div>
                        <div style={{
                          background: crosshair.pct >= 0 ? "var(--bull)" : "var(--bear)",
                          color: "#fff",
                          padding: "1px 6px",
                          fontSize: 9,
                          lineHeight: 1.4,
                        }}>
                          {crosshair.pct >= 0 ? "+" : ""}{crosshair.pct.toFixed(2)}%
                        </div>
                      </div>

                      {/* Datetime label — bottom X axis */}
                      <div className="absolute pointer-events-none font-mono text-[10px]"
                        style={{
                          bottom: 8,
                          left: ox,
                          transform: "translateX(-50%)",
                          background: "rgba(55,55,60,0.96)",
                          color: "var(--foreground)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          padding: "2px 7px",
                          zIndex: 16,
                          whiteSpace: "nowrap",
                        }}>
                        {formatXLabelFull(crosshair.ts)}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Volume + date axis */}
              <div className={`${compact ? "h-16" : "h-24"} px-2 border-t hairline shrink-0`}>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground py-1 px-1">
                  <span>VOL</span><span className="font-mono">{last.vol.toFixed(0)}</span>
                </div>
                <div className={compact ? "h-11" : "h-16"}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visibleData} margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="ts"
                        tickFormatter={formatXLabel}
                        tick={{ fontSize: 9, fill: "var(--chart-axis)" }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={55}
                        height={18}
                      />
                      <Bar dataKey="vol">
                        {visibleData.map((d, i) => <Cell key={i} fill={d.up ? "color-mix(in oklab, var(--bull) 40%, transparent)" : "color-mix(in oklab, var(--bear) 40%, transparent)"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RSI — toggled by indicator */}
              {!compact && activeIndicators.has("RSI(14)") && (() => {
                const lastRsi = [...visibleData].reverse().find(d => d.rsiV !== null)?.rsiV ?? 50;
                return (
                  <div className="h-24 px-2 border-t hairline shrink-0">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground py-1 px-1">
                      <span>RSI(14)</span>
                      <span className={`font-mono ${lastRsi > 70 ? "text-bear" : lastRsi < 30 ? "text-bull" : "text-foreground"}`}>
                        {lastRsi.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={visibleData}>
                          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                          <YAxis hide domain={[0, 100]} />
                          <ReferenceLine y={70} stroke="color-mix(in oklab, var(--bear) 40%, transparent)" strokeDasharray="2 2" />
                          <ReferenceLine y={30} stroke="color-mix(in oklab, var(--bull) 40%, transparent)" strokeDasharray="2 2" />
                          <Line type="monotone" dataKey="rsiV" stroke="var(--accent)" strokeWidth={1.2} dot={false} connectNulls />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* MACD — toggled by indicator */}
              {!compact && activeIndicators.has("MACD") && (() => {
                const lastMacd = [...visibleData].reverse().find(d => d.macd !== null);
                return (
                  <div className="h-24 px-2 border-t hairline shrink-0">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground py-1 px-1">
                      <span>MACD(12,26,9)</span>
                      <span className="font-mono text-[10px] flex gap-2">
                        <span className="text-accent">M {lastMacd?.macd?.toFixed(2) ?? "—"}</span>
                        <span className="text-orange-400">S {lastMacd?.macdSig?.toFixed(2) ?? "—"}</span>
                      </span>
                    </div>
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={visibleData}>
                          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                          <YAxis hide />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                          <Bar dataKey="macdHist">
                            {visibleData.map((d, i) => (
                              <Cell key={i} fill={d.macdHist >= 0 ? "color-mix(in oklab, var(--bull) 50%, transparent)" : "color-mix(in oklab, var(--bear) 50%, transparent)"} />
                            ))}
                          </Bar>
                          <Line type="monotone" dataKey="macd"    stroke="var(--accent)"  strokeWidth={1.2} dot={false} connectNulls />
                          <Line type="monotone" dataKey="macdSig" stroke="#fb923c"        strokeWidth={1}   dot={false} connectNulls />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

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
  // Skip SSR for the entire chart workspace — too many sub-trees use locale
  // formatters / canvas / window APIs that diverge from server output and
  // trip React #418. Render placeholder on first paint, swap to live tree
  // after mount. Cheap fix that's also more honest: charts are useless until
  // the polling hooks below have fired anyway.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [layout, setLayout]           = useState<Layout>("1x1");
  const [activePanel, setActivePanel] = useState(0);
  const [activeSymbol, setActiveSymbol] = useState<string>("ESM6");
  const [bookCollapsed, setBookCollapsed] = useState(false);
  const [bookView, setBookView]           = useState<"both" | "buy" | "sell">("both");
  const [priceGap, setPriceGap]           = useState("0.25");
  const [showGapPicker, setShowGapPicker] = useState(false);
  const [snapped, setSnapped]           = useState(false);
  const [chartSaved, setChartSaved]     = useState(false);
  const [shared, setShared]             = useState(false);
  const [maximized, setMaximized]       = useState(false);
  const [orderSide, setOrderSide]       = useState<"Buy" | "Sell" | null>(null);
  const [orderAmount, setOrderAmount]   = useState("");
  const [orderPlaced, setOrderPlaced]   = useState(false);
  const router = useRouter();

  // Real-time order book from /v1/market/{ladder,signals}. Live L1 only on
  // active sessions; weekend/closed renders the rolling volume profile.
  const ob = useOrderBook(activeSymbol, 1440);

  const PRICE_GAPS = ["0.05", "0.10", "0.25", "0.50", "1.00", "5.00"];

  // Bid rows = real-tape rows priced at or below best_bid; ask rows = at or
  // above best_ask. When the L1 quote isn't available (closed market) we
  // split rows around the median price so both sides still render.
  const ladderRows = ob.ladder?.rows ?? [];
  const bestBid = ob.signal?.best_bid ?? ob.ladder?.best_bid ?? 0;
  const bestAsk = ob.signal?.best_ask ?? ob.ladder?.best_ask ?? 0;

  const aggBids = useMemo(() => {
    const gap = parseFloat(priceGap) || 0.25;
    const m = new Map<number, { p: number; s: number }>();
    for (const r of ladderRows) {
      if (bestBid > 0 && r.price > bestBid) continue;
      const key = Math.floor(r.price / gap) * gap;
      const e = m.get(key);
      const sz = r.volume;
      if (e) e.s += sz; else m.set(key, { p: key, s: sz });
    }
    return [...m.values()].sort((a, b) => b.p - a.p).slice(0, 14);
  }, [ladderRows, bestBid, priceGap]);

  const aggAsks = useMemo(() => {
    const gap = parseFloat(priceGap) || 0.25;
    const m = new Map<number, { p: number; s: number }>();
    for (const r of ladderRows) {
      if (bestAsk > 0 && r.price < bestAsk) continue;
      const key = Math.ceil(r.price / gap) * gap;
      const e = m.get(key);
      const sz = r.volume;
      if (e) e.s += sz; else m.set(key, { p: key, s: sz });
    }
    return [...m.values()].sort((a, b) => a.p - b.p).slice(0, 14);
  }, [ladderRows, bestAsk, priceGap]);

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
  const gridStyle: React.CSSProperties = {
    height: layout === "2x2" ? "640px" : layout === "2v" || layout === "2h" ? "600px" : "100%",
    gridTemplateRows: layout === "2x2" || layout === "2v" ? "1fr 1fr" : "1fr",
  };

  // SSR placeholder — must match the post-mount root container so the
  // hydration boundary has consistent markup. Real workspace renders after.
  if (!mounted) {
    return (
      <div className="contents">
        <div className="glass p-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] text-muted-foreground">loading workspace…</span>
        </div>
        <div className="glass" style={{ height: 680 }} />
      </div>
    );
  }

  return (
    <div className={maximized ? "fixed inset-0 z-[100] bg-background overflow-auto flex flex-col gap-5 p-5" : "contents"}>
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
      <div className={`grid grid-cols-1 gap-5 xl:transition-[grid-template-columns] xl:duration-300 xl:ease-in-out xl:h-[680px] ${bookCollapsed ? "xl:grid-cols-[1fr_36px]" : "xl:grid-cols-[1fr_360px]"}`}>
        {/* Chart workspace */}
        <section className="glass p-0 flex flex-col order-1 overflow-hidden xl:h-full">
          <div className={`${gridClass[layout]} overflow-hidden`} style={gridStyle}>
            {Array.from({ length: panelCount }, (_, i) => (
              <ChartPanel
                key={i}
                panelId={`p${i}`}
                defaultSymIdx={i}
                isActive={activePanel === i}
                compact={compact}
                onActivate={() => setActivePanel(i)}
                onSymbolChange={setActiveSymbol}
              />
            ))}
          </div>
        </section>

        {/* ── Order book ── */}
        <aside className="glass flex flex-col order-2 overflow-hidden relative xl:h-full">
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
            {/* Title row */}
            <div className="px-4 py-3 border-b hairline flex items-center justify-between shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Order Book</span>
              <button onClick={() => setBookCollapsed(true)} title="Collapse" className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View mode + gap row */}
            <div className="px-3 py-2 border-b hairline flex items-center justify-between shrink-0">
              {/* View mode icons */}
              <div className="flex items-center gap-1">
                {/* Both */}
                <button onClick={() => setBookView("both")} title="Both sides"
                  className={`p-1.5 transition-colors ${bookView === "both" ? "opacity-100" : "opacity-40 hover:opacity-70"}`}>
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
                    <rect x="2" y="1.5" width="11" height="1.8" rx="0.5" fill="var(--bear)" />
                    <rect x="2" y="4"   width="8"  height="1.8" rx="0.5" fill="var(--bear)" />
                    <rect x="2" y="6.5" width="10" height="1.8" rx="0.5" fill="var(--bear)" />
                    <rect x="2" y="9.5" width="10" height="1.8" rx="0.5" fill="var(--bull)" />
                    <rect x="2" y="12"  width="8"  height="1.8" rx="0.5" fill="var(--bull)" />
                    <rect x="2" y="14.5" width="6" height="1.8" rx="0.5" fill="var(--bull)" />
                  </svg>
                </button>
                {/* Buy only */}
                <button onClick={() => setBookView("buy")} title="Buy side only"
                  className={`p-1.5 transition-colors ${bookView === "buy" ? "opacity-100" : "opacity-40 hover:opacity-70"}`}>
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
                    <rect x="2" y="1.5" width="11" height="1.8" rx="0.5" fill="rgba(100,100,110,0.5)" />
                    <rect x="2" y="4"   width="8"  height="1.8" rx="0.5" fill="rgba(100,100,110,0.5)" />
                    <rect x="2" y="6.5" width="10" height="1.8" rx="0.5" fill="rgba(100,100,110,0.5)" />
                    <rect x="2" y="9.5" width="10" height="1.8" rx="0.5" fill="var(--bull)" />
                    <rect x="2" y="12"  width="8"  height="1.8" rx="0.5" fill="var(--bull)" />
                    <rect x="2" y="14.5" width="6" height="1.8" rx="0.5" fill="var(--bull)" />
                  </svg>
                </button>
                {/* Sell only */}
                <button onClick={() => setBookView("sell")} title="Sell side only"
                  className={`p-1.5 transition-colors ${bookView === "sell" ? "opacity-100" : "opacity-40 hover:opacity-70"}`}>
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
                    <rect x="2" y="1.5" width="11" height="1.8" rx="0.5" fill="var(--bear)" />
                    <rect x="2" y="4"   width="8"  height="1.8" rx="0.5" fill="var(--bear)" />
                    <rect x="2" y="6.5" width="10" height="1.8" rx="0.5" fill="var(--bear)" />
                    <rect x="2" y="9.5" width="10" height="1.8" rx="0.5" fill="rgba(100,100,110,0.5)" />
                    <rect x="2" y="12"  width="8"  height="1.8" rx="0.5" fill="rgba(100,100,110,0.5)" />
                    <rect x="2" y="14.5" width="6" height="1.8" rx="0.5" fill="rgba(100,100,110,0.5)" />
                  </svg>
                </button>
              </div>

              {/* Price gap dropdown */}
              <div className="relative">
                {showGapPicker && (
                  <div className="fixed inset-0 z-40" onClick={() => setShowGapPicker(false)} />
                )}
                <button
                  onClick={() => setShowGapPicker(v => !v)}
                  className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground border hairline px-2 py-1 transition-colors"
                >
                  {priceGap}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showGapPicker ? "rotate-180" : ""}`} />
                </button>
                {showGapPicker && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--sidebar)] border hairline shadow-xl flex flex-col min-w-[80px]">
                    {PRICE_GAPS.map(g => (
                      <button key={g} onClick={() => { setPriceGap(g); setShowGapPicker(false); }}
                        className={`px-3 py-1.5 text-[11px] font-mono text-left hover:bg-white/[0.06] transition-colors ${priceGap === g ? "text-accent" : "text-muted-foreground"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr] px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b hairline shrink-0">
              <span>Price</span>
              <span className="text-right">Size</span>
            </div>

            {/* Asks (sell side) */}
            {bookView !== "buy" && (
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                {aggAsks.slice().reverse().map((a, i) => {
                  const maxS = Math.max(...aggBids.map(x => x.s), ...aggAsks.map(x => x.s), 1);
                  return (
                    <div key={i} className="relative grid grid-cols-[1fr_1fr] px-4 py-1.5 text-[14px] font-mono leading-tight">
                      <div className="absolute inset-y-0 right-0 bg-bear/10" style={{ width: `${Math.min((a.s / maxS) * 95, 95)}%` }} />
                      <span className="relative text-bear">{a.p.toFixed(2)}</span>
                      <span className="relative text-right">{a.s.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Spread */}
            {bookView === "both" && (
              <div className="px-4 py-3 border-y hairline flex items-center justify-between shrink-0">
                <span className="font-display text-2xl text-bull font-semibold">{(bestBid || aggBids[0]?.p)?.toFixed(2) ?? "—"}</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {ob.signal
                    ? `spread ${(bestAsk - bestBid).toFixed(2)}`
                    : ob.loading
                      ? "loading…"
                      : `${ob.ladder?.window_mins ?? 0}m vol-profile`}
                </span>
              </div>
            )}

            {/* Bids (buy side) */}
            {bookView !== "sell" && (
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                {aggBids.map((b, i) => {
                  const maxS = Math.max(...aggBids.map(x => x.s), ...aggAsks.map(x => x.s), 1);
                  return (
                  <div key={i} className="relative grid grid-cols-[1fr_1fr] px-4 py-1.5 text-[14px] font-mono leading-tight">
                    <div className="absolute inset-y-0 right-0 bg-bull/10" style={{ width: `${Math.min((b.s / maxS) * 95, 95)}%` }} />
                    <span className="relative text-bull">{b.p.toFixed(2)}</span>
                    <span className="relative text-right">{b.s.toLocaleString()}</span>
                  </div>
                  );
                })}
              </div>
            )}
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
    </div>
  );
}
