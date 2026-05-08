import { Bar, BarChart, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { useMemo, useState } from "react";
import { Maximize2, Settings2 } from "lucide-react";
import { genCandles } from "@/lib/chart-data";

const tfs = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];

export function MarketChart() {
  const [tf, setTf] = useState("15m");
  const [symbol] = useState("AAPL");
  const data = useMemo(() => genCandles(tf.length + 7, 70), [tf]);
  const last = data[data.length - 1];
  const change = ((last.c - data[0].o) / data[0].o) * 100;

  return (
    <section className="glass rounded-3xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-400/30 grid place-items-center font-display">₿</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xl">{symbol}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-white/10 rounded px-1.5 py-0.5">Spot</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
              <span>O {data[0].o.toFixed(2)}</span>
              <span>H {Math.max(...data.map(d=>d.h)).toFixed(2)}</span>
              <span>L {Math.min(...data.map(d=>d.l)).toFixed(2)}</span>
              <span>C <span className="text-foreground">{last.c.toFixed(2)}</span></span>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div className="text-right">
            <div className="font-display text-3xl tabular-nums">{last.c.toFixed(2)}</div>
            <div className={`text-xs font-mono ${change >= 0 ? "text-bull" : "text-bear"}`}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}% · 24h
            </div>
          </div>
          <div className="flex gap-1">
            <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"><Settings2 className="w-3.5 h-3.5" /></button>
            <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"><Maximize2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="glass-soft rounded-xl p-1 flex gap-0.5">
          {tfs.map(t => (
            <button key={t} onClick={() => setTf(t)}
              className={`px-2.5 py-1.5 text-xs rounded-lg ${tf === t ? "bg-white/10" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1 text-[11px] text-muted-foreground">
          {["MA(20)", "MA(50)", "BB(20)", "RSI(14)", "VOL"].map(i => (
            <span key={i} className="px-2 py-1 rounded-md bg-white/5 border border-white/10">{i}</span>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} domain={["dataMin - 30", "dataMax + 30"]} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: "var(--chart-cursor)", strokeDasharray: 3 }}
              contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", borderRadius: 12, fontSize: 11, color: "var(--foreground)" }}
              labelFormatter={() => ""}
            />
            <Bar dataKey="wick" fill="transparent" stroke="var(--chart-wick)" strokeWidth={1} />
            <Bar dataKey="body" radius={1}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.up ? "var(--bull)" : "var(--bear)"} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="c" stroke="var(--violet)" strokeOpacity={0.7} strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="h-16 -mt-2">
        <ResponsiveContainer>
          <BarChart data={data}>
            <Bar dataKey="vol" radius={2}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.up ? "var(--bull)" : "var(--bear)"} fillOpacity={0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
