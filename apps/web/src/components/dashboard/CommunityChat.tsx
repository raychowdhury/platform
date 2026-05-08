import { useState, useRef, useEffect } from "react";
import { Send, Smile } from "lucide-react";

type Msg = { who: string; t: string; time: string; me: boolean; color: string };

const SEED: Msg[] = [
  { who: "Rocky K.", t: "AAPL reclaiming 63K — momentum looks clean here.", time: "5:09 PM", me: false, color: "oklch(0.7 0.2 290)" },
  { who: "Azam K.", t: "MSFT/AAPL ratio still bleeding tho 👀", time: "5:11 PM", me: false, color: "oklch(0.78 0.19 150)" },
  { who: "You", t: "Watching for a 4H close above 63.5K to add.", time: "5:18 PM", me: true, color: "oklch(0.78 0.18 60)" },
  { who: "Mahin K.", t: "Loaded AMD longs at 182, target 195.", time: "5:24 PM", me: false, color: "oklch(0.75 0.18 220)" },
];

const REPLIES = ["Solid take 💯", "Watching too", "What's your stop?", "Agreed", "Loading more"];
const REPLIERS = [
  { who: "Rocky K.", color: "oklch(0.7 0.2 290)" },
  { who: "Azam K.", color: "oklch(0.78 0.19 150)" },
  { who: "Mahin K.", color: "oklch(0.75 0.18 220)" },
];

export function CommunityChat() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMsgs((m) => [...m, { who: "You", t, time, me: true, color: "oklch(0.78 0.18 60)" }]);
    setInput("");
    // Auto-reply
    setTimeout(() => {
      const r = REPLIERS[Math.floor(Math.random() * REPLIERS.length)];
      const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      setMsgs((m) => [...m, { who: r.who, t: reply, time, me: false, color: r.color }]);
    }, 900);
  };

  return (
    <section className="glass p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Community</div>
          <h3 className="font-display text-2xl mt-1">Trader chat</h3>
        </div>
        <div className="flex -space-x-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2 border-background"
              style={{ background: ["oklch(0.78 0.19 150)", "oklch(0.7 0.2 290)", "oklch(0.78 0.18 60)", "oklch(0.75 0.18 220)"][i] }}
            />
          ))}
          <div className="w-7 h-7 rounded-full border-2 border-background bg-white/10 grid place-items-center text-[10px]">+8</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-[240px] max-h-[360px] pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.me ? "flex-row-reverse" : ""}`}>
            <div className="w-7 h-7 rounded-full shrink-0 grid place-items-center text-[10px] font-display text-background" style={{ background: m.color }}>
              {m.who.charAt(0)}
            </div>
            <div className={`max-w-[75%] ${m.me ? "items-end" : ""} flex flex-col gap-1`}>
              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                <span>{m.who}</span>
                <span>·</span>
                <span>{m.time}</span>
              </div>
              <div className={`text-xs px-3 py-2 ${m.me ? "bg-accent/20 border border-accent/30" : "glass-soft"}`}>{m.t}</div>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 glass-soft p-1.5"
      >
        <button type="button" className="p-2 text-muted-foreground hover:text-foreground cursor-pointer">
          <Smile className="w-3.5 h-3.5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Share an idea…"
          className="flex-1 bg-transparent px-1 py-2 text-sm placeholder:text-muted-foreground outline-none cursor-text"
        />
        <button type="submit" className="p-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground cursor-pointer hover:brightness-110 transition-all">
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </section>
  );
}
