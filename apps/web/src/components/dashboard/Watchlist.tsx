import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Star } from "lucide-react";
import { genSpark } from "@/lib/chart-data";

const ALL = [
  { s: "AAPL", n: "Apple Inc.", p: 63719.9, c: 1.24, cat: "Futures" },
  { s: "MSFT", n: "Microsoft Corp", p: 3077.93, c: 0.42, cat: "Futures" },
  { s: "AMD", n: "Adv. Micro Devices", p: 184.2, c: -2.1, cat: "Futures" },
  { s: "AAPL", n: "Apple Inc.", p: 234.55, c: 0.89, cat: "Stocks" },
  { s: "NVDA", n: "NVIDIA", p: 1128.34, c: 3.22, cat: "Stocks" },
  { s: "TSLA", n: "Tesla", p: 194.22, c: -4.14, cat: "Stocks" },
  { s: "MSFT", n: "Microsoft", p: 432.1, c: 0.51, cat: "Stocks" },
  { s: "EUR/USD", n: "Euro Dollar", p: 1.0784, c: -0.06, cat: "FX" },
  { s: "GBP/USD", n: "Pound Dollar", p: 1.2521, c: 0.18, cat: "FX" },
];

const TABS = ["All", "Futures", "Stocks", "FX"] as const;

export function Watchlist() {
  const [tab, setTab] = useState<typeof TABS[number]>("All");
  const [stars, setStars] = useState<Record<string, boolean>>({ AAPL: true, NVDA: true });
  const [selected, setSelected] = useState<string | null>(null);

  const items = tab === "All" ? ALL : ALL.filter((i) => i.cat === tab);

  return (
    <section className="glass p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Watchlist</div>
          <h3 className="font-display text-2xl mt-1">Markets pulse</h3>
        </div>
        <div className="flex gap-1 text-[11px]">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2.5 py-1 cursor-pointer transition-colors ${tab === t ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        {items.map((it, i) => (
          <button
            key={it.s}
            onClick={() => setSelected((s) => (s === it.s ? null : it.s))}
            className={`grid grid-cols-[auto_1fr_80px_70px] items-center gap-3 py-2.5 border-b border-white/5 last:border-0 group text-left cursor-pointer transition-colors ${
              selected === it.s ? "bg-accent/[0.06]" : "hover:bg-white/[0.025]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStars((s) => ({ ...s, [it.s]: !s[it.s] }));
                }}
              >
                <Star
                  className={`w-3.5 h-3.5 cursor-pointer ${stars[it.s] ? "text-amber-300 fill-amber-300" : "text-muted-foreground hover:text-amber-300"}`}
                />
              </span>
              <div className="w-8 h-8 bg-white/5 border border-white/10 grid place-items-center text-[10px] font-mono">{it.s.slice(0, 3)}</div>
              <div>
                <div className="text-sm font-medium">{it.s}</div>
                <div className="text-[11px] text-muted-foreground">{it.n}</div>
              </div>
            </div>
            <div className="h-10">
              <ResponsiveContainer>
                <AreaChart data={genSpark(i + 1, it.c >= 0)}>
                  <defs>
                    <linearGradient id={`spw${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={it.c >= 0 ? "var(--bull)" : "var(--bear)"} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={it.c >= 0 ? "var(--bull)" : "var(--bear)"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={it.c >= 0 ? "var(--bull)" : "var(--bear)"} strokeWidth={1.5} fill={`url(#spw${i})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-right text-sm font-mono tabular-nums">{it.p.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className={`text-right text-xs font-mono ${it.c >= 0 ? "text-bull" : "text-bear"}`}>
              {it.c >= 0 ? "+" : ""}
              {it.c.toFixed(2)}%
            </div>
          </button>
        ))}
        {items.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No items in this category.</div>}
      </div>
    </section>
  );
}
