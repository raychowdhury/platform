import { useState } from "react";
import { Sparkles, ArrowDown, ArrowUp, Check } from "lucide-react";

const SEED = [
  { t: "08:42", coin: "AAPL", side: "Buy", price: "63,510", chg: "+1.01", vol: "1.1K", strat: "Dreamfire", conf: 92 },
  { t: "08:31", coin: "MSFT", side: "Buy", price: "3,062", chg: "+1.87", vol: "14.06K", strat: "Belaryon", conf: 88 },
  { t: "08:15", coin: "AMD", side: "Sell", price: "186.4", chg: "-1.83", vol: "1.84K", strat: "Dreamfire", conf: 76 },
  { t: "07:58", coin: "NVDA", side: "Buy", price: "1,128", chg: "+0.61", vol: "0.61K", strat: "Belaryon", conf: 81 },
  { t: "07:42", coin: "BNB", side: "Sell", price: "10,165", chg: "-2.74", vol: "2.74K", strat: "Belaryon", conf: 70 },
  { t: "07:30", coin: "AAPL", side: "Buy", price: "234.5", chg: "+0.89", vol: "5.2K", strat: "Dreamfire", conf: 84 },
];

const FILTERS = ["All", "Buy", "Sell"] as const;

export function AIAlerts() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All");
  const [taken, setTaken] = useState<Set<number>>(new Set());

  const rows = filter === "All" ? SEED : SEED.filter((a) => a.side === filter);

  return (
    <section className="glass p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent/15 border border-accent/30">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">AI Engine</div>
            <h3 className="font-display text-2xl mt-0.5">Entry alerts</h3>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 cursor-pointer transition-colors ${filter === f ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5">
              <th className="text-left font-normal py-2">Time</th>
              <th className="text-left font-normal py-2">Asset</th>
              <th className="text-left font-normal py-2">Side</th>
              <th className="text-right font-normal py-2">Price</th>
              <th className="text-right font-normal py-2 hidden md:table-cell">Δ%</th>
              <th className="text-right font-normal py-2 hidden lg:table-cell">Vol</th>
              <th className="text-left font-normal py-2 hidden md:table-cell">Strategy</th>
              <th className="text-right font-normal py-2">Conf.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const isTaken = taken.has(i);
              return (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer">
                  <td className="py-3 text-xs text-muted-foreground font-mono">{a.t}</td>
                  <td className="py-3 font-medium text-xs">{a.coin}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 ${a.side === "Buy" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}>
                      {a.side === "Buy" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {a.side}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-xs tabular-nums">${a.price}</td>
                  <td className={`py-3 text-right font-mono text-xs hidden md:table-cell ${parseFloat(a.chg) >= 0 ? "text-bull" : "text-bear"}`}>{a.chg}%</td>
                  <td className="py-3 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">{a.vol}</td>
                  <td className="py-3 text-xs hidden md:table-cell">
                    <span className="text-accent">{a.strat}</span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-accent to-primary" style={{ width: `${a.conf}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-6">{a.conf}</span>
                    </div>
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <button
                      onClick={() =>
                        setTaken((s) => {
                          const n = new Set(s);
                          n.has(i) ? n.delete(i) : n.add(i);
                          return n;
                        })
                      }
                      className={`text-[10px] px-2 py-1 border cursor-pointer transition-colors flex items-center gap-1 ${
                        isTaken ? "bg-bull/15 text-bull border-bull/30" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                      }`}
                    >
                      {isTaken ? <><Check className="w-3 h-3" /> Taken</> : "Take"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
