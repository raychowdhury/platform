import { useState } from "react";
import { X } from "lucide-react";

const SEED = [
  { sym: "AAPL", name: "Apple Inc.", qty: 25, entry: 173.5, mark: 178.2, pnl: 117.5, pct: 2.7, side: "Long" as const },
  { sym: "TSLA", name: "Tesla Inc.", qty: 15, entry: 654.3, mark: 640.1, pnl: -213.0, pct: -2.2, side: "Long" as const },
  { sym: "AAPL", name: "Apple Inc.", qty: 0.42, entry: 61400, mark: 63719, pnl: 974.0, pct: 3.78, side: "Long" as const },
  { sym: "MSFT", name: "Microsoft Corp", qty: 4.1, entry: 3210, mark: 3077, pnl: -545.3, pct: -4.14, side: "Short" as const },
  { sym: "AMD", name: "Adv. Micro Devices", qty: 32, entry: 165, mark: 184.2, pnl: 614.4, pct: 11.6, side: "Long" as const },
  { sym: "NVDA", name: "NVIDIA", qty: 8, entry: 1095, mark: 1128.3, pnl: 266.4, pct: 3.04, side: "Long" as const },
];

const TABS = ["All", "Long", "Short", "Pending"] as const;

export function Positions() {
  const [tab, setTab] = useState<typeof TABS[number]>("All");
  const [rows, setRows] = useState(SEED);
  const [selected, setSelected] = useState<string | null>(null);

  const filtered =
    tab === "All" ? rows : tab === "Pending" ? [] : rows.filter((r) => r.side === tab);

  return (
    <section className="glass p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Book</div>
          <h3 className="font-display text-2xl mt-1">Open positions</h3>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {TABS.map((t) => {
            const count = t === "All" ? rows.length : t === "Pending" ? 0 : rows.filter((r) => r.side === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 cursor-pointer transition-colors ${tab === t ? "bg-white/10 border border-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t} <span className="ml-1 font-mono text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5">
              <th className="text-left font-normal py-2.5">Symbol</th>
              <th className="text-left font-normal py-2.5">Side</th>
              <th className="text-right font-normal py-2.5">Qty</th>
              <th className="text-right font-normal py-2.5 hidden md:table-cell">Entry</th>
              <th className="text-right font-normal py-2.5">Mark</th>
              <th className="text-right font-normal py-2.5">P&L</th>
              <th className="text-right font-normal py-2.5 hidden md:table-cell">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                  No {tab.toLowerCase()} positions.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.sym}
                onClick={() => setSelected((s) => (s === r.sym ? null : r.sym))}
                className={`border-b border-white/5 last:border-0 cursor-pointer transition-colors ${selected === r.sym ? "bg-accent/[0.06]" : "hover:bg-white/[0.02]"}`}
              >
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/5 border border-white/10 grid place-items-center text-[10px] font-mono">{r.sym.slice(0, 3)}</div>
                    <div>
                      <div className="text-xs font-medium">{r.sym}</div>
                      <div className="text-[10px] text-muted-foreground">{r.name}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 ${r.side === "Long" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}>{r.side}</span>
                </td>
                <td className="py-3 text-right text-xs font-mono tabular-nums">{r.qty}</td>
                <td className="py-3 text-right text-xs font-mono tabular-nums hidden md:table-cell">${r.entry.toLocaleString()}</td>
                <td className="py-3 text-right text-xs font-mono tabular-nums">${r.mark.toLocaleString()}</td>
                <td className={`py-3 text-right text-xs font-mono ${r.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                  {r.pnl >= 0 ? "+" : ""}${r.pnl.toFixed(2)}
                  <div className="text-[10px] opacity-70">{r.pct >= 0 ? "+" : ""}{r.pct}%</div>
                </td>
                <td className="py-3 text-right hidden md:table-cell">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRows((arr) => arr.filter((x) => x.sym !== r.sym));
                    }}
                    className="text-[10px] px-2.5 py-1 bg-white/5 hover:bg-bear/15 hover:text-bear hover:border-bear/30 border border-white/10 cursor-pointer transition-colors flex items-center gap-1 ml-auto"
                  >
                    <X className="w-3 h-3" /> Close
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
