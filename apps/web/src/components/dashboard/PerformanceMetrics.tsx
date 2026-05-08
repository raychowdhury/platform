import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Cell } from "recharts";

const daily = [
  { d: "Mon", v: 420 }, { d: "Tue", v: -180 }, { d: "Wed", v: 760 },
  { d: "Thu", v: 320 }, { d: "Fri", v: -240 }, { d: "Sat", v: 580 },
  { d: "Sun", v: 110 }, { d: "Mon", v: 690 }, { d: "Tue", v: -90 },
  { d: "Wed", v: 410 }, { d: "Thu", v: 250 }, { d: "Fri", v: -310 },
];

export function PerformanceMetrics() {
  const stats = [
    { l: "Trade win %", v: "46.84%" },
    { l: "Profit factor", v: "1.30" },
    { l: "Avg win/loss", v: "$239" },
    { l: "Sharpe", v: "1.84" },
  ];
  return (
    <section className="glass rounded-3xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Analytics</div>
          <h3 className="font-display text-2xl mt-1">Daily performance</h3>
        </div>
        <div className="text-right text-xs">
          <div className="text-muted-foreground">Net P&L · 30D</div>
          <div className="font-display text-2xl text-bull mt-0.5">+$3,420.18</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.l} className="glass-soft rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className="font-mono text-base mt-1">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="h-32 -mx-2">
        <ResponsiveContainer>
          <BarChart data={daily}>
            <XAxis dataKey="d" tick={{ fontSize: 10, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "oklch(1 0 0 / 0.04)" }} contentStyle={{ background: "oklch(0.18 0.012 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 11 }} />
            <Bar dataKey="v" radius={4}>
              {daily.map((d, i) => (
                <Cell key={i} fill={d.v >= 0 ? "var(--bull)" : "var(--bear)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
        <div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Win / Loss</div>
          <div className="mt-1 flex h-2 rounded-full overflow-hidden bg-white/5 w-48">
            <div className="bg-bull" style={{ width: "47%" }} />
            <div className="bg-bear" style={{ width: "53%" }} />
          </div>
        </div>
        <div className="flex gap-4 font-mono">
          <span><span className="text-bull">●</span> 64 wins</span>
          <span><span className="text-bear">●</span> 72 losses</span>
        </div>
      </div>
    </section>
  );
}
