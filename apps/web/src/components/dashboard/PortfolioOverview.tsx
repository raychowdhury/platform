import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight, Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { genArea } from "@/lib/chart-data";

const ranges = ["24H", "7D", "30D", "90D", "YTD", "ALL"] as const;

export function PortfolioOverview() {
  const [range, setRange] = useState<typeof ranges[number]>("7D");
  const [hidden, setHidden] = useState(false);
  const data = useMemo(() => genArea(range.length + 3, 80, 800, 22), [range]);

  const stats = [
    { label: "Today's capital", v: "$157,590.30", chg: "+2,500.25", pct: "+1.5%", up: true, color: "bull" },
    { label: "YTD Gain", v: "$48,210.05", chg: "+8,420.18", pct: "+34.2%", up: true, color: "bull" },
    { label: "Initial capital", v: "$109,380.25", chg: "Deposited", pct: "Sep '23", up: true, color: "muted" },
    { label: "Open P&L", v: "$3,422.10", chg: "-219.14", pct: "-0.8%", up: false, color: "bear" },
  ];

  return (
    <section className="glass rounded-3xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" /> Portfolio · Live
          </div>
          <h2 className="font-display text-3xl mt-1">Capital performance</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHidden(h => !h)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
          >
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <div className="glass-soft rounded-xl p-1 flex">
            {ranges.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  range === r ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="glass-soft rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="font-display text-2xl mt-1.5 tabular-nums">
              {hidden ? "••••••" : s.v}
            </div>
            <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md
              ${s.color === "bull" ? "bg-bull/10 text-bull" : s.color === "bear" ? "bg-bear/10 text-bear" : "bg-white/5 text-muted-foreground"}`}>
              {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {s.chg} · {s.pct}
            </div>
          </div>
        ))}
      </div>

      <div className="h-64 -mx-2">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.19 150)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.78 0.19 150)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis hide domain={["dataMin - 20", "dataMax + 20"]} />
            <Tooltip
              cursor={{ stroke: "oklch(1 0 0 / 0.2)", strokeDasharray: 3 }}
              contentStyle={{
                background: "oklch(0.18 0.012 260)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={() => ""}
              formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]}
            />
            <Area type="monotone" dataKey="v" stroke="oklch(0.78 0.19 150)" strokeWidth={2} fill="url(#grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
