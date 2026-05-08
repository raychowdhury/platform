import { useState } from "react";
import { Bot, BadgeCheck, TrendingUp, Check } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { genSpark } from "@/lib/chart-data";

const TRADERS = [
  { name: "Willson Alex", spec: "AAPL · Indices", roi: 18.4, win: 72, follow: 12420, color: "oklch(0.78 0.19 150)" },
  { name: "Sora Tanaka", spec: "Equities · Tech", roi: 24.1, win: 68, follow: 9810, color: "oklch(0.7 0.2 290)" },
  { name: "Diego Marín", spec: "FX · Macro", roi: 11.2, win: 64, follow: 5240, color: "oklch(0.75 0.18 220)" },
  { name: "Aria Petrov", spec: "Memes · Alt", roi: 41.7, win: 58, follow: 18230, color: "oklch(0.78 0.18 60)" },
];

export function AITraders() {
  const [copied, setCopied] = useState<Set<string>>(new Set());

  const toggle = (name: string) =>
    setCopied((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  return (
    <section className="glass p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/15 border border-primary/30">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Copy trading</div>
            <h3 className="font-display text-2xl mt-0.5">Top AI traders</h3>
          </div>
        </div>
        <button className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">Browse leaderboard →</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {TRADERS.map((t, i) => {
          const isCopying = copied.has(t.name);
          return (
            <div
              key={t.name}
              className={`glass-soft p-4 flex flex-col gap-3 transition-colors cursor-pointer ${isCopying ? "border-accent/40 bg-accent/[0.04]" : "hover:border-white/20"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full grid place-items-center font-display text-background" style={{ background: t.color }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1">
                      {t.name} <BadgeCheck className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">{t.spec}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-bull/10 text-bull">+{t.roi}%</span>
              </div>
              <div className="h-12 -mx-1">
                <ResponsiveContainer>
                  <AreaChart data={genSpark(i + 6, true, 30)}>
                    <defs>
                      <linearGradient id={`tg${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={t.color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={t.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={t.color} strokeWidth={1.5} fill={`url(#tg${i})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/5">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Win</div>
                  <div className="text-xs font-mono mt-0.5">{t.win}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI</div>
                  <div className="text-xs font-mono mt-0.5 text-bull">+{t.roi}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Followers</div>
                  <div className="text-xs font-mono mt-0.5">{((t.follow + (isCopying ? 1 : 0)) / 1000).toFixed(1)}K</div>
                </div>
              </div>
              <button
                onClick={() => toggle(t.name)}
                className={`w-full text-xs py-2 border cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                  isCopying ? "bg-accent/15 border-accent/30 text-accent" : "bg-white/5 hover:bg-white/10 border-white/10"
                }`}
              >
                {isCopying ? <><Check className="w-3 h-3" /> Copying</> : <><TrendingUp className="w-3 h-3" /> Copy trades</>}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
