"use client";
import { useMemo, useState } from "react";
import { Trophy, Crown, Medal, Award, ArrowUpDown, Search, Users } from "lucide-react";


type Row = {
  id: string;
  name: string;
  handle: string;
  country: string;
  pnl: number;
  win: number;
  trades: number;
  sharpe: number;
  followers: number;
};

const ROWS: Row[] = [
  { id: "u1", name: "Mira Tanaka", handle: "@miratrades", country: "JP", pnl: 184.6, win: 76, trades: 412, sharpe: 2.84, followers: 18420 },
  { id: "u2", name: "Lukas Schmitt", handle: "@lukasfx", country: "DE", pnl: 142.1, win: 71, trades: 318, sharpe: 2.41, followers: 14210 },
  { id: "u3", name: "Aria Volkov", handle: "@ariavol", country: "RU", pnl: 128.8, win: 68, trades: 287, sharpe: 2.18, followers: 11920 },
  { id: "u4", name: "Diego Marín", handle: "@diegomx", country: "MX", pnl: 112.4, win: 73, trades: 196, sharpe: 2.62, followers: 10840 },
  { id: "u5", name: "Priya Naidu", handle: "@priya_n", country: "IN", pnl: 98.2, win: 70, trades: 248, sharpe: 1.94, followers: 9120 },
  { id: "u6", name: "Olufemi Adeyemi", handle: "@olufemi", country: "NG", pnl: 88.6, win: 67, trades: 178, sharpe: 2.04, followers: 7840 },
  { id: "u7", name: "Sigrid Berg", handle: "@sigrid", country: "NO", pnl: 76.4, win: 74, trades: 142, sharpe: 2.31, followers: 6720 },
  { id: "u8", name: "Hassan Reza", handle: "@hassanr", country: "AE", pnl: 71.2, win: 65, trades: 312, sharpe: 1.72, followers: 5980 },
  { id: "u9", name: "Camille Roux", handle: "@camille", country: "FR", pnl: 64.8, win: 69, trades: 188, sharpe: 1.88, followers: 4920 },
  { id: "u10", name: "Marcus O'Brien", handle: "@marcus", country: "IE", pnl: 58.4, win: 66, trades: 224, sharpe: 1.74, followers: 4210 },
];

type SortKey = "pnl" | "win" | "sharpe" | "followers";
const PERIODS = ["24h", "7d", "30d", "All-time"] as const;

export default function LeaderboardPage() {
  const [sortKey, setSortKey] = useState<SortKey>("pnl");
  const [period, setPeriod] = useState<typeof PERIODS[number]>("30d");
  const [search, setSearch] = useState("");
  const [following, setFollowing] = useState<Record<string, boolean>>({ u2: true, u4: true });

  const sorted = useMemo(() =>
    [...ROWS].filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.handle.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number)),
    [sortKey, search]
  );

  const Header = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => setSortKey(k)} className={`flex items-center gap-1 text-[10px] uppercase tracking-wider ${sortKey === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {label} <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  const podium = sorted.slice(0, 3);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"><Trophy className="w-3 h-3" /> Intelligence</div>
          <h1 className="font-display text-3xl tracking-tight mt-1">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Top performing traders ranked by risk-adjusted returns.</p>
        </div>
        <div className="inline-flex border hairline p-0.5 text-xs">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-2.5 py-1.5 ${period === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <section className="grid md:grid-cols-3 gap-4">
        {podium.map((r, i) => {
          const Icon = i === 0 ? Crown : i === 1 ? Medal : Award;
          const tone = i === 0 ? "text-amber-500" : i === 1 ? "text-muted-foreground" : "text-amber-700";
          return (
            <article key={r.id} className={`glass p-5 flex flex-col gap-3 ${i === 0 ? "md:order-2 md:scale-[1.03]" : i === 1 ? "md:order-1" : "md:order-3"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${tone}`} />
                  <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Rank #{i + 1}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{r.country}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 grid place-items-center bg-muted border hairline font-display text-lg">{r.name[0]}</div>
                <div>
                  <div className="font-display text-lg leading-none">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{r.handle}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs border-t hairline pt-3">
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">PnL</div><div className="font-mono text-bull">+{r.pnl}%</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Win</div><div className="font-mono">{r.win}%</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Sharpe</div><div className="font-mono">{r.sharpe}</div></div>
              </div>
              <button onClick={() => setFollowing((p) => ({ ...p, [r.id]: !p[r.id] }))}
                className={`text-xs py-2 border ${following[r.id] ? "bg-foreground text-background border-foreground" : "hairline hover:bg-muted"}`}>
                {following[r.id] ? "Following" : "Follow"}
              </button>
            </article>
          );
        })}
      </section>

      {/* Filters */}
      <section className="glass p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trader…" className="w-full bg-transparent border hairline pl-9 pr-3 py-2 text-xs" />
        </div>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{sorted.length} traders</span>
      </section>

      {/* Table */}
      <section className="glass overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b hairline">
              <th className="text-left p-3 text-[10px] uppercase tracking-wider text-muted-foreground w-10">#</th>
              <th className="text-left p-3 text-[10px] uppercase tracking-wider text-muted-foreground">Trader</th>
              <th className="text-right p-3"><div className="flex justify-end"><Header k="pnl" label="PnL" /></div></th>
              <th className="text-right p-3"><div className="flex justify-end"><Header k="win" label="Win" /></div></th>
              <th className="text-right p-3 hidden md:table-cell">Trades</th>
              <th className="text-right p-3"><div className="flex justify-end"><Header k="sharpe" label="Sharpe" /></div></th>
              <th className="text-right p-3 hidden md:table-cell"><div className="flex justify-end"><Header k="followers" label="Followers" /></div></th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.id} className="border-b hairline last:border-0 hover:bg-muted/40 group">
                <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 grid place-items-center bg-muted border hairline text-xs font-display">{r.name[0]}</div>
                    <div>
                      <div className="leading-none">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{r.handle} · {r.country}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-right font-mono text-bull">+{r.pnl}%</td>
                <td className="p-3 text-right font-mono">{r.win}%</td>
                <td className="p-3 text-right font-mono hidden md:table-cell text-muted-foreground">{r.trades}</td>
                <td className="p-3 text-right font-mono">{r.sharpe}</td>
                <td className="p-3 text-right font-mono text-muted-foreground hidden md:table-cell">{r.followers.toLocaleString()}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setFollowing((p) => ({ ...p, [r.id]: !p[r.id] }))}
                    className={`text-[11px] px-2.5 py-1 border ${following[r.id] ? "bg-foreground text-background border-foreground" : "hairline hover:bg-muted opacity-60 group-hover:opacity-100"}`}>
                    {following[r.id] ? "Following" : "Follow"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
