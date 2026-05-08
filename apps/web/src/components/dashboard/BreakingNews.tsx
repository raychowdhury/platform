import { useState } from "react";
import { Newspaper, Clock, ArrowUpRight, Bookmark } from "lucide-react";

const ITEMS = [
  { t: "Fed signals June pause; markets rally on dovish tone", src: "Reuters", time: "12m", tag: "Macro", hot: true },
  { t: "Apple Inc. breaks above $63K as ETF inflows resume", src: "Bloomberg", time: "28m", tag: "Futures", hot: true },
  { t: "NVIDIA earnings preview: $24B revenue expected", src: "Bloomberg", time: "1h", tag: "Equity" },
  { t: "EU antitrust chief: Big tech AI scrutiny intensifies", src: "FT", time: "2h", tag: "Policy" },
  { t: "Filecoin debuts on-chain virtual machine for storage", src: "TheBlock", time: "3h", tag: "Earnings" },
];

const TAGS = ["All", "Macro", "Futures", "Equity", "Policy", "Earnings"];

export function BreakingNews() {
  const [tag, setTag] = useState("All");
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const items = tag === "All" ? ITEMS : ITEMS.filter((i) => i.tag === tag);

  return (
    <section className="glass p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Breaking</div>
            <h3 className="font-display text-2xl mt-0.5">Market news</h3>
          </div>
        </div>
        <span className="text-[11px] text-bull flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" /> Live
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`text-[10px] px-2 py-1 cursor-pointer transition-colors border ${tag === t ? "bg-accent/15 border-accent/30 text-accent" : "border-white/10 text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-col">
        {items.map((it, i) => (
          <div key={i} className="group py-3 border-b border-white/5 last:border-0 cursor-pointer">
            <div className="flex items-start gap-3">
              <div className={`w-1 h-12 ${it.hot ? "bg-bear" : "bg-white/10"}`} style={{ borderRadius: 9999 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="text-accent">{it.tag}</span>
                  <span>·</span>
                  <span>{it.src}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {it.time}
                  </span>
                </div>
                <div className="text-sm mt-1.5 leading-snug group-hover:text-accent transition-colors flex items-start gap-1.5">
                  {it.t}
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 mt-0.5 shrink-0" />
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSaved((s) => {
                    const n = new Set(s);
                    n.has(i) ? n.delete(i) : n.add(i);
                    return n;
                  });
                }}
                className={`p-1.5 cursor-pointer transition-colors ${saved.has(i) ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${saved.has(i) ? "fill-accent" : ""}`} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No headlines for {tag}.</div>}
      </div>
    </section>
  );
}
