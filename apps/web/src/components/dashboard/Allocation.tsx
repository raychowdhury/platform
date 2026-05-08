import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "AAPL", value: 34, color: "oklch(0.78 0.18 60)" },
  { name: "MSFT", value: 22, color: "oklch(0.7 0.2 290)" },
  { name: "AMD", value: 14, color: "oklch(0.78 0.19 150)" },
  { name: "Stocks", value: 18, color: "oklch(0.75 0.18 220)" },
  { name: "Cash", value: 8, color: "oklch(0.6 0.02 260)" },
  { name: "Other", value: 4, color: "oklch(0.66 0.22 22)" },
];

export function Allocation() {
  return (
    <section className="glass rounded-3xl p-6 flex flex-col gap-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Allocation</div>
        <h3 className="font-display text-2xl mt-1">Asset mix</h3>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-40 h-40 relative">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "oklch(0.18 0.012 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="font-display text-2xl">$157K</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
              <span className="flex-1 text-muted-foreground">{d.name}</span>
              <span className="font-mono">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
