"use client";
import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { rand } from "@/lib/chart-data";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, ChevronDown, Search } from "lucide-react";

const ALL_SYMS = [
  "AAPL","MSFT","NVDA","TSLA","AMD","META","AMZN","GOLD","GOOG","NFLX",
  "INTC","QCOM","BABA","WMT","JPM","BAC","XOM","GE","DIS","PYPL",
];

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtM(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
}

function genFlow(seed: number, n = 24) {
  const out: { t: string; inflow: number; outflow: number }[] = [];
  for (let i = 0; i < n; i++) {
    const h = i.toString().padStart(2, "0");
    out.push({
      t: `${h}:00`,
      inflow: 80 + rand(seed + i) * 220,
      outflow: 60 + rand(seed + i + 50) * 180,
    });
  }
  return out;
}

function genTimeSeries(seed: number, n = 48, base = 100, vol = 12) {
  const out: { t: string; v: number }[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (rand(seed + i) - 0.48) * vol;
    v = Math.max(10, v);
    const h = (i % 24).toString().padStart(2, "0");
    out.push({ t: `${h}:00`, v: +v.toFixed(2) });
  }
  return out;
}

function genConcentration(seed: number, n = 48) {
  const out: { t: string; top5: number; top20: number; rest: number }[] = [];
  let t5 = 42, t20 = 28;
  for (let i = 0; i < n; i++) {
    t5 = Math.min(70, Math.max(25, t5 + (rand(seed + i) - 0.5) * 2));
    t20 = Math.min(40, Math.max(15, t20 + (rand(seed + i + 30) - 0.5) * 1.5));
    const h = (i % 24).toString().padStart(2, "0");
    out.push({ t: `${h}:00`, top5: +t5.toFixed(1), top20: +t20.toFixed(1), rest: +(100 - t5 - t20).toFixed(1) });
  }
  return out;
}

function genLongShort(seed: number, n = 48) {
  const out: { t: string; long: number; short: number }[] = [];
  let l = 55;
  for (let i = 0; i < n; i++) {
    l = Math.min(80, Math.max(20, l + (rand(seed + i) - 0.5) * 3));
    const h = (i % 24).toString().padStart(2, "0");
    out.push({ t: `${h}:00`, long: +l.toFixed(1), short: +(100 - l).toFixed(1) });
  }
  return out;
}

function gen5DayInflow(seed: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return days.map((d, i) => ({
    d,
    net: (rand(seed + i) - 0.4) * 800,
  }));
}

function genOrders(seed: number, sym: string) {
  const bases = [125.4, 88.2, 210.5, 33.7, 445.1];
  return Array.from({ length: 8 }, (_, i) => {
    const side = rand(seed + i) > 0.5 ? "Buy" : "Sell";
    const qty = (500 + rand(seed + i + 10) * 4500).toFixed(0);
    const price = (bases[i % 5] + (rand(seed + i + 20) - 0.5) * 10).toFixed(2);
    const total = (+qty * +price).toFixed(0);
    return { side, sym, qty, price, total };
  });
}

// ── sub-components ────────────────────────────────────────────────────────────
function SectionCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="glass p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2.5 py-1 text-[10px] font-mono rounded-sm transition-colors ${active === t ? "bg-accent text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
        >{t}</button>
      ))}
    </div>
  );
}

const TIP_STYLE = {
  contentStyle: { background: "oklch(0.16 0.01 260)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 11 },
  labelStyle: { color: "#999" },
  itemStyle: { color: "#e2e8f0" },
};

// ── symbol picker ─────────────────────────────────────────────────────────────
function SymbolPicker({ current, onChange }: { current: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = ALL_SYMS.filter(s => s.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); setQ(""); }}
        className="flex items-center gap-2 font-display text-3xl hover:text-accent transition-colors"
      >
        {current}
        <ChevronDown size={18} className={`transition-transform text-muted-foreground ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 z-50 glass border border-white/10 shadow-2xl flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <Search size={12} className="text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search symbol…"
              className="bg-transparent text-xs outline-none w-full placeholder:text-muted-foreground"
            />
          </div>
          <div className="overflow-y-auto max-h-52">
            {filtered.map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-white/5 transition-colors ${s === current ? "text-accent" : ""}`}
              >
                {s}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function TradingDataPage() {
  const { sym } = useParams<{ sym: string }>();
  const router = useRouter();
  const S = sym ?? "AAPL";
  const seed = S.charCodeAt(0) + S.charCodeAt(S.length - 1);

  // state for tabs
  const [concTab, setConcTab] = useState("24H");
  const [debtTab, setDebtTab] = useState("24H");
  const [borrowTab, setBorrowTab] = useState("24H");
  const [borrowSym, setBorrowSym] = useState(S);
  const [lsTab, setLsTab] = useState("24H");
  const [lsSym, setLsSym] = useState(S);

  // data
  const flowData = genFlow(seed, 24);
  const inflow24 = genTimeSeries(seed + 1, 48, 120, 18);
  const conc24 = genConcentration(seed + 2, 48);
  const conc30d = genConcentration(seed + 3, 30);
  const debt24 = genTimeSeries(seed + 4, 48, 3200, 80);
  const debt30d = genTimeSeries(seed + 5, 30, 3200, 120);
  const borrow24 = genTimeSeries(seed + 6, 48, 0.38, 0.04);
  const borrow30d = genTimeSeries(seed + 7, 30, 0.38, 0.06);
  const ls24 = genLongShort(seed + 8, 48);
  const ls30d = genLongShort(seed + 9, 30);
  const fiveDay = gen5DayInflow(seed + 10);
  const orders = genOrders(seed, S);

  // donut data for money flow
  const totalIn = flowData.reduce((a, b) => a + b.inflow, 0);
  const totalOut = flowData.reduce((a, b) => a + b.outflow, 0);
  const netFlow = totalIn - totalOut;
  const donutData = [
    { name: "Inflow", value: totalIn },
    { name: "Outflow", value: totalOut },
  ];

  const concData = concTab === "24H" ? conc24 : conc30d;
  const debtData = debtTab === "24H" ? debt24 : debt30d;
  const borrowData = borrowTab === "24H" ? borrow24 : borrow30d;
  const lsData = lsTab === "24H" ? ls24 : ls30d;

  const price = 125 + rand(seed + 99) * 400;
  const chg = (rand(seed + 100) - 0.45) * 8;
  const vol24h = 4e8 + rand(seed + 101) * 2e9;
  const mcap = price * (1e8 + rand(seed + 102) * 9e9);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* hero bar */}
      <div className="glass p-5 flex flex-wrap items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <SymbolPicker current={S} onChange={s => router.push(`/dashboard/markets/${s}`)} />
            <span className={`text-sm font-mono flex items-center gap-1 ${chg >= 0 ? "text-bull" : "text-bear"}`}>
              {chg >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Trading Data · Live</p>
        </div>
        <div className="flex gap-6 text-sm font-mono ml-auto flex-wrap">
          <div><p className="text-[10px] text-muted-foreground">Price</p><p>${price.toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">24h Vol</p><p>{fmtM(vol24h)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Mkt Cap</p><p>{fmtM(mcap)}</p></div>
          <div>
            <p className="text-[10px] text-muted-foreground">Net Flow 24h</p>
            <p className={netFlow >= 0 ? "text-bull" : "text-bear"}>{netFlow >= 0 ? "+" : ""}{fmtM(netFlow * 1e5)}</p>
          </div>
        </div>
      </div>

      {/* row 1: money flow + 24h large inflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* money flow analysis */}
        <SectionCard title="Money Flow Analysis">
          <div className="flex gap-4">
            {/* donut */}
            <div className="w-36 h-36 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={56} dataKey="value" stroke="none">
                    <Cell fill="var(--bull)" />
                    <Cell fill="var(--bear)" />
                  </Pie>
                  <Tooltip {...TIP_STYLE} formatter={(v: number) => fmtM(v * 1e5)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* legend + stats */}
            <div className="flex flex-col gap-2 justify-center flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-bull inline-block" />
                <span className="text-muted-foreground">Inflow</span>
                <span className="ml-auto font-mono text-bull">{fmtM(totalIn * 1e5)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-bear inline-block" />
                <span className="text-muted-foreground">Outflow</span>
                <span className="ml-auto font-mono text-bear">{fmtM(totalOut * 1e5)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Net</span>
                <span className={`ml-auto font-mono ${netFlow >= 0 ? "text-bull" : "text-bear"}`}>{netFlow >= 0 ? "+" : ""}{fmtM(netFlow * 1e5)}</span>
              </div>
            </div>
          </div>
          {/* 5-day bars */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-2">5-Day Net Inflow (M)</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={fiveDay} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
                <Tooltip {...TIP_STYLE} formatter={(v: number) => `$${v.toFixed(1)}M`} />
                <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                  {fiveDay.map((d, i) => <Cell key={i} fill={d.net >= 0 ? "var(--bull)" : "var(--bear)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* large orders table */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-2">Large Orders (24h)</p>
            <div className="overflow-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1">Side</th>
                    <th className="text-right py-1">Qty</th>
                    <th className="text-right py-1">Price</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/3">
                      <td className={`py-1 ${o.side === "Buy" ? "text-bull" : "text-bear"}`}>{o.side}</td>
                      <td className="text-right">{(+o.qty).toLocaleString()}</td>
                      <td className="text-right">${o.price}</td>
                      <td className="text-right">{fmtM(+o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>

        {/* 24h large inflow */}
        <SectionCard title="24hr Large Inflow">
          <div className="flex gap-4 mb-1">
            <div className="text-xs">
              <p className="text-muted-foreground text-[10px]">Peak Inflow</p>
              <p className="font-mono text-bull">{fmtM(Math.max(...inflow24.map(d => d.v)) * 1e5)}</p>
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground text-[10px]">Avg / Hour</p>
              <p className="font-mono">{fmtM((inflow24.reduce((a, b) => a + b.v, 0) / inflow24.length) * 1e5)}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={inflow24} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `${v}`} />
              <Tooltip {...TIP_STYLE} formatter={(v: number) => fmtM(v * 1e5)} />
              <Line type="monotone" dataKey="v" stroke="var(--bull)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* row 2: platform concentration + margin debt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Platform Concentration"
          actions={<TabBar tabs={["24H", "30D"]} active={concTab} onChange={setConcTab} />}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={concData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} interval={Math.floor(concData.length / 6)} />
              <YAxis tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} width={30} tickFormatter={v => `${v}%`} />
              <Tooltip {...TIP_STYLE} formatter={(v: number) => `${v}%`} />
              <Area type="monotone" dataKey="top5" stackId="a" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.5} name="Top 5" />
              <Area type="monotone" dataKey="top20" stackId="a" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.4} name="Top 20" />
              <Area type="monotone" dataKey="rest" stackId="a" stroke="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.05)" name="Rest" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />Top 5</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-600" />Top 20</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/20" />Rest</span>
          </div>
        </SectionCard>

        <SectionCard
          title="Margin Debt Growth"
          actions={<TabBar tabs={["24H", "30D"]} active={debtTab} onChange={setDebtTab} />}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={debtData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} interval={Math.floor(debtData.length / 6)} />
              <YAxis tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip {...TIP_STYLE} formatter={(v: number) => `$${v.toFixed(0)}M`} />
              <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-6 text-xs font-mono mt-1">
            <div>
              <p className="text-[10px] text-muted-foreground">Current</p>
              <p>${(debtData[debtData.length - 1]?.v ?? 0).toFixed(0)}M</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Change</p>
              {(() => {
                const delta = (debtData[debtData.length - 1]?.v ?? 0) - (debtData[0]?.v ?? 0);
                return <p className={delta >= 0 ? "text-bull" : "text-bear"}>{delta >= 0 ? "+" : ""}{delta.toFixed(0)}M</p>;
              })()}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* row 3: borrow ratio + long-short ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Isolated Margin Borrow Amount Ratio"
          actions={
            <div className="flex items-center gap-2">
              <TabBar tabs={["24H", "30D"]} active={borrowTab} onChange={setBorrowTab} />
              <select
                value={borrowSym}
                onChange={e => setBorrowSym(e.target.value)}
                className="bg-white/5 border border-white/10 text-[10px] px-2 py-1 rounded-sm text-foreground"
              >
                {["AAPL","MSFT","NVDA","TSLA","AMD","META"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={borrowData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} interval={Math.floor(borrowData.length / 6)} />
              <YAxis tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
              <Tooltip {...TIP_STYLE} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Line type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground">Ratio of isolated margin borrow amount for {borrowSym} vs. total isolated margin pool</p>
        </SectionCard>

        <SectionCard
          title="Margin Long-short Positions Ratio"
          actions={
            <div className="flex items-center gap-2">
              <TabBar tabs={["24H", "30D"]} active={lsTab} onChange={setLsTab} />
              <select
                value={lsSym}
                onChange={e => setLsSym(e.target.value)}
                className="bg-white/5 border border-white/10 text-[10px] px-2 py-1 rounded-sm text-foreground"
              >
                {["AAPL","MSFT","NVDA","TSLA","AMD","META"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={lsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} interval={Math.floor(lsData.length / 6)} />
              <YAxis tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} width={30} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip {...TIP_STYLE} formatter={(v: number) => `${v}%`} />
              <Area type="monotone" dataKey="long" stackId="a" stroke="var(--bull)" fill="var(--bull)" fillOpacity={0.5} name="Long" />
              <Area type="monotone" dataKey="short" stackId="a" stroke="var(--bear)" fill="var(--bear)" fillOpacity={0.4} name="Short" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-bull" />Long</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-bear" />Short</span>
            {(() => {
              const last = lsData[lsData.length - 1];
              if (!last) return null;
              return (
                <>
                  <span className="ml-auto text-muted-foreground">L/S: <span className="font-mono text-foreground">{(last.long / last.short).toFixed(2)}x</span></span>
                </>
              );
            })()}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
