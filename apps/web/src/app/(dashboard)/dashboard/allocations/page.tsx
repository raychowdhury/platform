"use client";
import { useMemo, useState } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, RadialBar, RadialBarChart } from "recharts";
import { Lock, Unlock, RotateCcw, Save, Sparkles, Plus, Trash2, GripVertical } from "lucide-react";


const COLORS = ["var(--bull)", "var(--accent)", "oklch(0.75 0.18 60)", "oklch(0.7 0.18 220)", "var(--bear)", "oklch(0.7 0.12 320)", "oklch(0.78 0.12 90)", "oklch(0.6 0.05 260)"];

type Slice = { sym: string; name: string; target: number; current: number; locked: boolean };

const PRESETS = [
  { name: "Balanced", desc: "60/40 stocks/bonds", scores: [40, 20, 15, 15, 10] },
  { name: "Aggressive", desc: "Tech-heavy growth", scores: [55, 25, 10, 5, 5] },
  { name: "Conservative", desc: "Income & stability", scores: [20, 15, 25, 30, 10] },
  { name: "Futures-tilt", desc: "Index futures focus", scores: [15, 50, 15, 10, 10] },
];

export default function AllocationsPage() {
  const [slices, setSlices] = useState<Slice[]>([
    { sym: "Stocks", name: "Equities", target: 35, current: 38, locked: false },
    { sym: "Futures", name: "Index futures", target: 25, current: 22, locked: false },
    { sym: "Bonds", name: "Fixed income", target: 15, current: 14, locked: true },
    { sym: "Gold", name: "Commodities", target: 10, current: 11, locked: false },
    { sym: "REITs", name: "Real estate", target: 8, current: 7, locked: false },
    { sym: "Cash", name: "USD / stables", target: 7, current: 8, locked: false },
  ]);
  const [hovered, setHovered] = useState<string | null>(null);

  const total = slices.reduce((s, x) => s + x.target, 0);
  const drift = slices.reduce((s, x) => s + Math.abs(x.target - x.current), 0) / 2;

  const updateTarget = (idx: number, value: number) => {
    setSlices((arr) => {
      const copy = arr.map((s) => ({ ...s }));
      const old = copy[idx].target;
      const delta = value - old;
      copy[idx].target = value;

      // Distribute the delta across unlocked slices proportionally
      const others = copy.filter((_, i) => i !== idx && !copy[i].locked && copy[i].target > 0);
      const sumOthers = others.reduce((s, x) => s + x.target, 0);
      if (sumOthers > 0) {
        copy.forEach((s, i) => {
          if (i === idx || s.locked) return;
          const share = s.target / sumOthers;
          s.target = Math.max(0, Math.round(s.target - delta * share));
        });
      }
      return copy;
    });
  };

  const reset = () => setSlices(s => s.map(x => ({ ...x, target: x.current })));
  const applyPreset = (scores: number[]) => {
    setSlices((arr) => arr.map((s, i) => ({ ...s, target: scores[i] ?? 0 })));
  };

  const data = slices.map((s) => ({ name: s.sym, value: s.target }));

  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Allocations</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">
            Design your <em className="not-italic italic text-accent">target</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Drag sliders to rebalance · {drift.toFixed(0)}% drift from current allocation · {total}% allocated
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button onClick={reset} className="px-3 py-2 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button className="px-3 py-2 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer">
            <Sparkles className="w-3 h-3" /> AI suggest
          </button>
          <button className="px-3 py-2 bg-primary/90 hover:bg-primary text-primary-foreground flex items-center gap-1.5 cursor-pointer">
            <Save className="w-3 h-3" /> Save & rebalance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-5">
        {/* Editor */}
        <section className="glass p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl">Target weights</h3>
            <span className={`text-[11px] font-mono px-2 py-1 ${total === 100 ? "text-bull bg-bull/10" : "text-bear bg-bear/10"}`}>
              {total}%
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {slices.map((s, i) => {
              const drift = s.target - s.current;
              return (
                <div key={s.sym}
                  onMouseEnter={() => setHovered(s.sym)}
                  onMouseLeave={() => setHovered(null)}
                  className={`p-3 border hairline transition-colors ${hovered === s.sym ? "bg-white/[0.03] border-white/20" : ""}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab" />
                    <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <div className="text-sm">{s.sym}</div>
                      <div className="text-[10px] text-muted-foreground">{s.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular-nums">{s.target}%</div>
                      <div className={`text-[10px] font-mono ${drift > 0 ? "text-bull" : drift < 0 ? "text-bear" : "text-muted-foreground"}`}>
                        {drift > 0 ? "+" : ""}{drift}% drift
                      </div>
                    </div>
                    <button
                      onClick={() => setSlices(arr => arr.map((x, j) => j === i ? { ...x, locked: !x.locked } : x))}
                      title={s.locked ? "Unlock" : "Lock weight"}
                      className={`p-2 border hairline cursor-pointer ${s.locked ? "text-accent border-accent/40 bg-accent/10" : "text-muted-foreground hover:text-foreground"}`}>
                      {s.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => setSlices(arr => arr.filter((_, j) => j !== i))}
                      className="p-2 text-muted-foreground hover:text-bear cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={s.target}
                      disabled={s.locked}
                      onChange={(e) => updateTarget(i, parseInt(e.target.value))}
                      className="flex-1 alloc-slider cursor-pointer disabled:cursor-not-allowed"
                      style={{ accentColor: COLORS[i % COLORS.length] as string }}
                    />
                    <input
                      type="number"
                      value={s.target}
                      disabled={s.locked}
                      onChange={(e) => updateTarget(i, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-14 bg-white/[0.03] border hairline px-2 py-1 text-[11px] font-mono text-right focus:outline-none focus:border-accent/40 cursor-text" />
                  </div>
                  <div className="mt-2 h-1 bg-white/5 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 opacity-40" style={{ width: `${s.current}%`, background: COLORS[i % COLORS.length] }} />
                    <div className="absolute inset-y-0 left-0" style={{ width: `${s.target}%`, background: COLORS[i % COLORS.length] }} />
                    <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: `${s.current}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setSlices(arr => [...arr, { sym: "New", name: "Custom asset", target: 0, current: 0, locked: false }])}
            className="border border-dashed border-white/15 text-[12px] py-3 text-muted-foreground hover:text-foreground hover:border-white/30 cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add asset class
          </button>
        </section>

        {/* Preview */}
        <aside className="flex flex-col gap-5">
          <section className="glass p-6 flex flex-col gap-3">
            <h3 className="font-display text-xl">Live preview</h3>
            <div className="relative h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data} innerRadius={70} outerRadius={104} paddingAngle={1} dataKey="value">
                    {data.map((d, i) => (
                      <Cell key={d.name} fill={COLORS[i % COLORS.length]}
                        opacity={hovered === null || hovered === d.name ? 1 : 0.25}
                        style={{ transition: "opacity 0.2s" }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{hovered ?? "Total weight"}</div>
                  <div className="font-display text-3xl tabular-nums">
                    {hovered ? `${slices.find(s => s.sym === hovered)?.target}%` : `${total}%`}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="glass p-6 flex flex-col gap-3">
            <h3 className="font-display text-xl">Risk profile</h3>
            <div className="relative h-32">
              <ResponsiveContainer>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ v: 64, fill: "var(--accent)" }]} startAngle={210} endAngle={-30}>
                  <RadialBar background={{ fill: "oklch(1 0 0 / 0.05)" }} dataKey="v" cornerRadius={0} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="font-display text-3xl">64</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Moderate</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 text-center text-[11px] gap-1">
              <div className="p-2 border hairline"><div className="font-mono">12.4%</div><div className="text-muted-foreground text-[10px]">Vol</div></div>
              <div className="p-2 border hairline"><div className="font-mono">1.84</div><div className="text-muted-foreground text-[10px]">Sharpe</div></div>
              <div className="p-2 border hairline"><div className="font-mono">-9.2%</div><div className="text-muted-foreground text-[10px]">Max DD</div></div>
            </div>
          </section>

          <section className="glass p-6 flex flex-col gap-3">
            <h3 className="font-display text-xl">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button key={p.name} onClick={() => applyPreset(p.scores)}
                  className="text-left p-3 border hairline hover:bg-white/[0.04] hover:border-accent/30 cursor-pointer transition-colors group">
                  <div className="text-sm group-hover:text-accent transition-colors">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <style>{`
        .alloc-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: oklch(1 0 0 / 0.08);
          outline: none;
        }
        .alloc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: var(--foreground);
          border: 2px solid var(--background);
          box-shadow: 0 0 0 1px oklch(1 0 0 / 0.2);
          cursor: grab;
          border-radius: 9999px;
        }
        .alloc-slider::-webkit-slider-thumb:active { cursor: grabbing; }
        .alloc-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: var(--foreground);
          border: 2px solid var(--background);
          cursor: grab;
          border-radius: 9999px;
        }
      `}</style>
    </>
  );
}
