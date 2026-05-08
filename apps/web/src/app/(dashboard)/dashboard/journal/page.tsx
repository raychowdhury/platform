"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Cell } from "recharts";
import {
  Plus, Search, Smile, Frown, Meh, TrendingUp, TrendingDown, X, Pencil,
  Tag, Calendar, BookOpen, ChevronRight,
} from "lucide-react";


type Mood = "great" | "neutral" | "bad";

type Entry = {
  id: number;
  date: string;
  sym: string;
  side: "Long" | "Short";
  pnl: number;
  pnlPct: number;
  rr: number;
  mood: Mood;
  tags: string[];
  thesis: string;
  outcome: string;
};

const SEED: Entry[] = [
  { id: 1, date: "May 8", sym: "AAPL", side: "Long", pnl: 1240, pnlPct: 4.2, rr: 2.8, mood: "great", tags: ["breakout", "ai-signal"], thesis: "Clean break above 4h resistance with rising RSI and high volume confirmation.", outcome: "Hit TP1 in 2h, scaled 50%, runner stopped at BE. Disciplined exit." },
  { id: 2, date: "May 7", sym: "TSLA", side: "Short", pnl: -480, pnlPct: -1.6, rr: 0.4, mood: "bad", tags: ["counter-trend", "earnings"], thesis: "Shorted into resistance pre-earnings hoping for fade.", outcome: "Stopped out at full size. Should have waited for confirmation." },
  { id: 3, date: "May 6", sym: "NVDA", side: "Long", pnl: 2180, pnlPct: 6.1, rr: 4.2, mood: "great", tags: ["earnings", "momentum"], thesis: "Earnings beat with raised guidance. Strong sector tailwind.", outcome: "Caught the gap-up, trailed stop and locked profit before midday fade." },
  { id: 4, date: "May 5", sym: "MSFT", side: "Long", pnl: 320, pnlPct: 1.1, rr: 1.2, mood: "neutral", tags: ["dca"], thesis: "Routine DCA accumulation.", outcome: "Small move up, held position." },
  { id: 5, date: "May 3", sym: "AMD", side: "Long", pnl: -180, pnlPct: -0.6, rr: 0.3, mood: "neutral", tags: ["scalp"], thesis: "Quick scalp on order block bounce.", outcome: "Got chopped at the open. Cut losses fast, no damage." },
  { id: 6, date: "May 2", sym: "AAPL", side: "Long", pnl: 740, pnlPct: 2.4, rr: 2.1, mood: "great", tags: ["pattern", "swing"], thesis: "Cup and handle on daily, entered on retest of breakout.", outcome: "Played out beautifully over 3 days." },
];

const ALL_TAGS = ["breakout", "ai-signal", "counter-trend", "earnings", "momentum", "dca", "scalp", "pattern", "swing"];

function moodIcon(m: Mood) {
  return m === "great" ? Smile : m === "bad" ? Frown : Meh;
}
function moodColor(m: Mood) {
  return m === "great" ? "text-bull" : m === "bad" ? "text-bear" : "text-muted-foreground";
}

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>(SEED);
  const [selected, setSelected] = useState<Entry | null>(SEED[0]);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [filter, setFilter] = useState<"All" | "Wins" | "Losses">("All");
  const [creating, setCreating] = useState(false);

  // Draft for new entry
  const [draft, setDraft] = useState<Partial<Entry>>({
    sym: "", side: "Long", pnl: 0, pnlPct: 0, rr: 1, mood: "neutral", tags: [], thesis: "", outcome: "",
  });

  const filtered = entries
    .filter(e => filter === "All" || (filter === "Wins" ? e.pnl > 0 : e.pnl < 0))
    .filter(e => activeTags.length === 0 || activeTags.every(t => e.tags.includes(t)))
    .filter(e => e.sym.toLowerCase().includes(search.toLowerCase()) || e.thesis.toLowerCase().includes(search.toLowerCase()));

  const stats = useMemo(() => {
    const wins = entries.filter(e => e.pnl > 0);
    const losses = entries.filter(e => e.pnl < 0);
    const winRate = entries.length ? (wins.length / entries.length) * 100 : 0;
    const totalPnl = entries.reduce((s, e) => s + e.pnl, 0);
    const avgRR = entries.length ? entries.reduce((s, e) => s + e.rr, 0) / entries.length : 0;
    return { wins: wins.length, losses: losses.length, winRate, totalPnl, avgRR };
  }, [entries]);

  const toggleTag = (t: string) =>
    setActiveTags(arr => arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t]);

  const submit = () => {
    if (!draft.sym) return;
    const e: Entry = {
      id: Date.now(),
      date: "Today",
      sym: draft.sym!.toUpperCase(),
      side: draft.side as "Long" | "Short",
      pnl: Number(draft.pnl) || 0,
      pnlPct: Number(draft.pnlPct) || 0,
      rr: Number(draft.rr) || 1,
      mood: draft.mood as Mood,
      tags: draft.tags ?? [],
      thesis: draft.thesis ?? "",
      outcome: draft.outcome ?? "",
    };
    setEntries(arr => [e, ...arr]);
    setSelected(e);
    setCreating(false);
    setDraft({ sym: "", side: "Long", pnl: 0, pnlPct: 0, rr: 1, mood: "neutral", tags: [], thesis: "", outcome: "" });
  };

  const toggleDraftTag = (t: string) =>
    setDraft(d => ({ ...d, tags: d.tags?.includes(t) ? d.tags.filter(x => x !== t) : [...(d.tags ?? []), t] }));

  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Journal</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">
            Build your <em className="not-italic italic text-accent">edge</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {entries.length} entries · {stats.winRate.toFixed(0)}% win rate · {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toLocaleString()} P&L
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button className="px-3 py-2 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> May 2026
          </button>
          <button onClick={() => setCreating(true)}
            className="px-3 py-2 bg-accent/15 border border-accent/30 text-accent flex items-center gap-1.5 cursor-pointer hover:bg-accent/25 transition-colors">
            <Plus className="w-3 h-3" /> New entry
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Win rate</span>
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="font-display text-3xl">{stats.winRate.toFixed(0)}%</div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-bull">●{stats.wins} wins</span>
            <span className="text-bear">●{stats.losses} losses</span>
          </div>
        </div>
        <div className="glass p-5 flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total P&L</span>
          <div className={`font-display text-3xl ${stats.totalPnl >= 0 ? "text-bull" : "text-bear"}`}>
            {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground">all time</div>
        </div>
        <div className="glass p-5 flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg R:R</span>
          <div className="font-display text-3xl">{stats.avgRR.toFixed(1)}</div>
          <div className="text-[11px] text-muted-foreground">target 2.0+</div>
        </div>
        <div className="glass p-5 flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Performance</span>
          <div className="h-12 -mb-1">
            <ResponsiveContainer>
              <BarChart data={entries.slice().reverse()}>
                <Bar dataKey="pnl">
                  {entries.slice().reverse().map((e, i) => (
                    <Cell key={i} fill={e.pnl >= 0 ? "var(--bull)" : "var(--bear)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-muted-foreground">last {entries.length} trades</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-5 items-start">
        {/* List */}
        <section className="glass p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b hairline flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-1 text-[11px]">
              {(["All", "Wins", "Losses"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 border hairline cursor-pointer transition-colors ${filter === f ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries…"
                className="pl-9 pr-3 py-2 text-xs bg-white/[0.03] border hairline focus:outline-none focus:border-accent/40 w-56" />
            </div>
          </div>

          {/* Tag filter row */}
          <div className="px-4 py-3 border-b hairline flex flex-wrap gap-1.5 items-center">
            <Tag className="w-3 h-3 text-muted-foreground mr-1" />
            {ALL_TAGS.map(t => {
              const active = activeTags.includes(t);
              return (
                <button key={t} onClick={() => toggleTag(t)}
                  className={`text-[10px] px-2 py-1 border hairline cursor-pointer transition-colors ${active ? "bg-accent/15 border-accent/30 text-accent" : "text-muted-foreground hover:text-foreground"}`}>
                  #{t}
                </button>
              );
            })}
            {activeTags.length > 0 && (
              <button onClick={() => setActiveTags([])} className="text-[10px] text-muted-foreground hover:text-bear cursor-pointer ml-1 flex items-center gap-0.5">
                <X className="w-2.5 h-2.5" /> clear
              </button>
            )}
          </div>

          <div className="flex flex-col">
            {filtered.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No entries.</div>}
            {filtered.map(e => {
              const Mood = moodIcon(e.mood);
              const isSel = selected?.id === e.id;
              return (
                <button key={e.id} onClick={() => setSelected(e)}
                  className={`text-left grid grid-cols-[40px_64px_1fr_auto] gap-3 items-center px-4 py-3 border-b hairline cursor-pointer transition-colors ${isSel ? "bg-accent/[0.07] border-l-2 border-l-accent" : "hover:bg-white/[0.025]"}`}>
                  <Mood className={`w-5 h-5 ${moodColor(e.mood)}`} strokeWidth={1.5} />
                  <div>
                    <div className="text-sm font-mono">{e.sym}</div>
                    <div className={`text-[10px] uppercase tracking-wider ${e.side === "Long" ? "text-bull" : "text-bear"}`}>{e.side}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{e.thesis}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{e.date}</span>
                      {e.tags.map(t => (
                        <span key={t} className="text-[9px] uppercase tracking-wider text-muted-foreground border hairline px-1.5 py-0.5">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm ${e.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                      {e.pnl >= 0 ? "+" : ""}${Math.abs(e.pnl)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">R {e.rr.toFixed(1)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Detail / Create */}
        <aside className="glass p-6 flex flex-col gap-4 sticky top-[120px]">
          {creating ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl">New entry</h3>
                <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Symbol</label>
                  <input value={draft.sym} onChange={(e) => setDraft(d => ({ ...d, sym: e.target.value }))}
                    className="bg-white/[0.03] border hairline px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent/40" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Side</label>
                  <div className="flex gap-1">
                    {(["Long", "Short"] as const).map(s => (
                      <button key={s} onClick={() => setDraft(d => ({ ...d, side: s }))}
                        className={`flex-1 py-1.5 text-[11px] border hairline cursor-pointer ${draft.side === s ? (s === "Long" ? "bg-bull/15 border-bull/30 text-bull" : "bg-bear/15 border-bear/30 text-bear") : "text-muted-foreground"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">P&L $</label>
                  <input type="number" value={draft.pnl} onChange={(e) => setDraft(d => ({ ...d, pnl: Number(e.target.value) }))}
                    className="bg-white/[0.03] border hairline px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent/40" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">R:R</label>
                  <input type="number" step="0.1" value={draft.rr} onChange={(e) => setDraft(d => ({ ...d, rr: Number(e.target.value) }))}
                    className="bg-white/[0.03] border hairline px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent/40" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Mood</label>
                <div className="flex gap-1">
                  {(["great", "neutral", "bad"] as Mood[]).map(m => {
                    const I = moodIcon(m);
                    return (
                      <button key={m} onClick={() => setDraft(d => ({ ...d, mood: m }))}
                        className={`flex-1 py-2 border hairline cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${draft.mood === m ? "bg-white/[0.08] " + moodColor(m) : "text-muted-foreground"}`}>
                        <I className="w-4 h-4" /> <span className="text-[11px] capitalize">{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {ALL_TAGS.map(t => (
                    <button key={t} onClick={() => toggleDraftTag(t)}
                      className={`text-[10px] px-2 py-1 border hairline cursor-pointer ${draft.tags?.includes(t) ? "bg-accent/15 border-accent/30 text-accent" : "text-muted-foreground hover:text-foreground"}`}>
                      #{t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Thesis</label>
                <textarea value={draft.thesis} onChange={(e) => setDraft(d => ({ ...d, thesis: e.target.value }))} rows={3}
                  className="bg-white/[0.03] border hairline px-3 py-2 text-sm focus:outline-none focus:border-accent/40 resize-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Outcome</label>
                <textarea value={draft.outcome} onChange={(e) => setDraft(d => ({ ...d, outcome: e.target.value }))} rows={3}
                  className="bg-white/[0.03] border hairline px-3 py-2 text-sm focus:outline-none focus:border-accent/40 resize-none" />
              </div>

              <button onClick={submit}
                className="bg-primary/90 hover:bg-primary text-primary-foreground py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Save entry
              </button>
            </>
          ) : selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{selected.date}</div>
                  <h3 className="font-display text-3xl mt-1">
                    {selected.sym}{" "}
                    <span className={`text-base ${selected.side === "Long" ? "text-bull" : "text-bear"}`}>{selected.side}</span>
                  </h3>
                </div>
                <button className="text-muted-foreground hover:text-foreground cursor-pointer p-2 border hairline"><Pencil className="w-3.5 h-3.5" /></button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border hairline p-3">
                  <div className={`font-display text-xl ${selected.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                    {selected.pnl >= 0 ? "+" : ""}${Math.abs(selected.pnl)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">P&L</div>
                </div>
                <div className="border hairline p-3">
                  <div className={`font-display text-xl ${selected.pnlPct >= 0 ? "text-bull" : "text-bear"}`}>
                    {selected.pnlPct >= 0 ? "+" : ""}{selected.pnlPct}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Return</div>
                </div>
                <div className="border hairline p-3">
                  <div className="font-display text-xl">{selected.rr.toFixed(1)}R</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(() => { const I = moodIcon(selected.mood); return <I className={`w-5 h-5 ${moodColor(selected.mood)}`} />; })()}
                <span className={`text-sm capitalize ${moodColor(selected.mood)}`}>{selected.mood}</span>
                <span className="text-muted-foreground">·</span>
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map(t => (
                    <span key={t} className="text-[10px] uppercase tracking-wider text-muted-foreground border hairline px-1.5 py-0.5">#{t}</span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Thesis</div>
                <p className="text-sm leading-relaxed">{selected.thesis}</p>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Outcome</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{selected.outcome}</p>
              </div>

              <button className="mt-auto text-[11px] text-accent hover:text-foreground cursor-pointer flex items-center gap-1">
                Open chart at entry <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-12 text-sm">Select an entry to view details</div>
          )}
        </aside>
      </div>
    </>
  );
}
