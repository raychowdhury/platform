"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, BellOff, Plus, Search, X, TrendingUp, TrendingDown, Activity,
  Newspaper, Bot, Trash2, Pencil, Mail, MessageSquare, Smartphone, ChevronDown,
} from "lucide-react";


type AlertItem = {
  id: number;
  sym: string;
  type: "Price" | "Indicator" | "News" | "AI signal";
  cond: string;
  channels: ("push" | "email" | "sms")[];
  active: boolean;
  triggered?: string;
};

const SEED: AlertItem[] = [
  { id: 1, sym: "AAPL", type: "Price", cond: "crosses above $65,000", channels: ["push", "email"], active: true },
  { id: 2, sym: "NVDA", type: "Indicator", cond: "RSI(14) < 30 on 1H", channels: ["push"], active: true, triggered: "2h ago" },
  { id: 3, sym: "TSLA", type: "Price", cond: "drops below $190", channels: ["push", "sms"], active: true },
  { id: 4, sym: "MSFT", type: "AI signal", cond: "any AI signal with score > 80", channels: ["push", "email", "sms"], active: false },
  { id: 5, sym: "AMD", type: "News", cond: "breaking headline detected", channels: ["push"], active: true, triggered: "Yesterday" },
  { id: 6, sym: "GOLD", type: "Indicator", cond: "MA(50) crosses MA(200)", channels: ["email"], active: true },
  { id: 7, sym: "AAPL", type: "Price", cond: "moves ±3% in 1h", channels: ["push"], active: true },
];

const TABS = ["All", "Active", "Triggered", "Paused"] as const;
const TYPES = ["Price", "Indicator", "News", "AI signal"] as const;

function typeIcon(t: AlertItem["type"]) {
  if (t === "Price") return TrendingUp;
  if (t === "Indicator") return Activity;
  if (t === "News") return Newspaper;
  return Bot;
}

export default function AlertsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AlertItem[]>(SEED);
  const [tab, setTab] = useState<typeof TABS[number]>("All");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editItem, setEditItem] = useState<AlertItem | null>(null);

  const [draftSym, setDraftSym] = useState("AAPL");
  const [draftType, setDraftType] = useState<AlertItem["type"]>("Price");
  const [draftDir, setDraftDir] = useState<"above" | "below" | "crosses">("above");
  const [draftValue, setDraftValue] = useState("65000");
  const [draftChannels, setDraftChannels] = useState<AlertItem["channels"]>(["push"]);

  const filtered = items
    .filter(i => tab === "All" ||
      (tab === "Active" && i.active) ||
      (tab === "Paused" && !i.active) ||
      (tab === "Triggered" && i.triggered))
    .filter(i => i.sym.toLowerCase().includes(search.toLowerCase()) || i.cond.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: number) => setItems(arr => arr.map(i => i.id === id ? { ...i, active: !i.active } : i));
  const remove = (id: number) => setItems(arr => arr.filter(i => i.id !== id));

  const submit = () => {
    setItems(arr => [{
      id: Date.now(),
      sym: draftSym.toUpperCase(),
      type: draftType,
      cond: `${draftDir} $${draftValue}`,
      channels: draftChannels,
      active: true,
    }, ...arr]);
    setCreating(false);
  };

  const toggleChannel = (c: "push" | "email" | "sms") =>
    setDraftChannels((arr) => arr.includes(c) ? arr.filter(x => x !== c) : [...arr, c]);

  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Alerts</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">
            Never miss a <em className="not-italic italic text-accent">move</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {items.filter(i => i.active).length} active · {items.filter(i => i.triggered).length} triggered today
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button onClick={() => router.push("/dashboard/settings")} className="px-3 py-2 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground cursor-pointer">Settings</button>
          <button onClick={() => setCreating(true)}
            className="px-3 py-2 bg-accent/15 border border-accent/30 text-accent flex items-center gap-1.5 cursor-pointer hover:bg-accent/25 transition-colors">
            <Plus className="w-3 h-3" /> New alert
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Active alerts", v: items.filter(i => i.active).length, c: "of " + items.length, i: Bell },
          { l: "Triggered (24h)", v: items.filter(i => i.triggered).length, c: "+2 vs yesterday", i: TrendingUp },
          { l: "Avg latency", v: "1.4s", c: "P95 3.2s", i: Activity },
          { l: "Channels", v: 3, c: "Push · Email · SMS", i: Mail },
        ].map(k => (
          <div key={k.l} className="glass p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</span>
              <k.i className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.4} />
            </div>
            <div className="font-display text-3xl tabular-nums">{k.v}</div>
            <span className="text-[11px] text-muted-foreground">{k.c}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* List */}
        <section className="glass p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b hairline flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-1 text-[11px]">
              {TABS.map(t => {
                const count = t === "All" ? items.length :
                  t === "Active" ? items.filter(i => i.active).length :
                  t === "Triggered" ? items.filter(i => i.triggered).length :
                  items.filter(i => !i.active).length;
                return (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1.5 border hairline cursor-pointer transition-colors ${tab === t ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {t} <span className="ml-1 font-mono text-[10px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alerts…"
                className="pl-9 pr-3 py-2 text-xs bg-white/[0.03] border hairline focus:outline-none focus:border-accent/40 w-56" />
            </div>
          </div>

          <div className="flex flex-col">
            {filtered.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">No alerts match.</div>
            )}
            {filtered.map((a) => {
              const Icon = typeIcon(a.type);
              return (
                <div key={a.id} className="grid grid-cols-[40px_1fr_auto] md:grid-cols-[40px_70px_1fr_auto_auto] gap-3 items-center px-4 py-3 border-b hairline hover:bg-white/[0.025] transition-colors group">
                  <div className={`w-9 h-9 grid place-items-center border hairline ${
                    a.active ? "text-accent bg-accent/10 border-accent/30" : "text-muted-foreground"
                  }`}>
                    <Icon className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div className="hidden md:block">
                    <div className="text-sm font-mono">{a.sym}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.type}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="md:hidden text-[10px] text-muted-foreground uppercase tracking-wider">{a.sym} · {a.type}</div>
                    <div className="text-sm truncate">{a.cond}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {a.channels.map(c => (
                        <span key={c} className="text-[9px] uppercase tracking-wider text-muted-foreground border hairline px-1.5 py-0.5 flex items-center gap-1">
                          {c === "push" && <Smartphone className="w-2.5 h-2.5" />}
                          {c === "email" && <Mail className="w-2.5 h-2.5" />}
                          {c === "sms" && <MessageSquare className="w-2.5 h-2.5" />}
                          {c}
                        </span>
                      ))}
                      {a.triggered && (
                        <span className="text-[9px] uppercase tracking-wider text-accent">⚡ Triggered {a.triggered}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => toggle(a.id)}
                    className={`relative w-10 h-5 transition-colors cursor-pointer ${a.active ? "bg-accent" : "bg-white/10"}`}
                    style={{ borderRadius: 9999 }}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-foreground transition-all`} style={{ borderRadius: 9999, left: a.active ? "calc(100% - 18px)" : "2px" }} />
                  </button>
                  <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditItem(a)} className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(a.id)} className="p-1.5 text-muted-foreground hover:text-bear cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Create panel */}
        <aside className={`glass p-5 flex flex-col gap-4 transition-opacity ${creating ? "" : "opacity-90"}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">New alert</h3>
            {creating && (
              <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Symbol</label>
            <input value={draftSym} onChange={(e) => setDraftSym(e.target.value)}
              className="bg-white/[0.03] border hairline px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent/40" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Alert type</label>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {TYPES.map(t => (
                <button key={t} onClick={() => setDraftType(t)}
                  className={`py-2 border hairline cursor-pointer transition-colors ${draftType === t ? "bg-accent/15 border-accent/30 text-accent" : "text-muted-foreground hover:text-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Condition</label>
            <div className="flex gap-1">
              {(["above", "below", "crosses"] as const).map(d => (
                <button key={d} onClick={() => setDraftDir(d)}
                  className={`flex-1 py-2 text-[11px] border hairline capitalize cursor-pointer ${draftDir === d ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {d}
                </button>
              ))}
            </div>
            <input value={draftValue} onChange={(e) => setDraftValue(e.target.value)}
              placeholder="65000"
              className="bg-white/[0.03] border hairline px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent/40" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notify via</label>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              {([
                { c: "push" as const, i: Smartphone, l: "Push" },
                { c: "email" as const, i: Mail, l: "Email" },
                { c: "sms" as const, i: MessageSquare, l: "SMS" },
              ]).map(({ c, i: I, l }) => (
                <button key={c} onClick={() => toggleChannel(c)}
                  className={`py-2 border hairline cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${draftChannels.includes(c) ? "bg-accent/15 border-accent/30 text-accent" : "text-muted-foreground hover:text-foreground"}`}>
                  <I className="w-3 h-3" /> {l}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-soft p-3 text-[11px] text-muted-foreground">
            Notify me when <span className="text-foreground">{draftSym.toUpperCase() || "?"}</span>{" "}
            <span className="text-foreground">{draftDir}</span>{" "}
            <span className="text-foreground font-mono">${draftValue || "?"}</span>
            {" "}via{" "}
            <span className="text-accent">{draftChannels.join(", ") || "no channels"}</span>.
          </div>

          <button onClick={submit}
            className="bg-primary/90 hover:bg-primary text-primary-foreground py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create alert
          </button>
        </aside>
      </div>
      {editItem && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditItem(null)}>
          <div onClick={e => e.stopPropagation()} className="glass max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Edit alert</h3>
              <button onClick={() => setEditItem(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Symbol</label>
              <input defaultValue={editItem.sym} onChange={e => setEditItem(x => x ? { ...x, sym: e.target.value } : x)}
                className="bg-white/[0.03] border hairline px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Condition</label>
              <input defaultValue={editItem.cond} onChange={e => setEditItem(x => x ? { ...x, cond: e.target.value } : x)}
                className="bg-white/[0.03] border hairline px-3 py-2 text-sm focus:outline-none focus:border-accent/40" />
            </div>
            <div className="flex gap-2 text-[11px]">
              <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 border hairline hover:bg-white/5">Cancel</button>
              <button onClick={() => {
                setItems(arr => arr.map(i => i.id === editItem.id ? { ...i, sym: editItem.sym, cond: editItem.cond } : i));
                setEditItem(null);
              }} className="flex-1 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
