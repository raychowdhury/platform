"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Hash, Search, Send, TrendingUp, MessageSquare, Heart,
  Repeat2, Pin, Plus, Image as ImageIcon, Smile, ArrowUpRight, Globe2, X
} from "lucide-react";


const ROOMS = [
  { id: "r1", name: "general", topic: "All-purpose floor talk", members: 12_840, online: 412 },
  { id: "r2", name: "btc-eth", topic: "Major coins discussion", members: 8_210, online: 318 },
  { id: "r3", name: "us-equities", topic: "Stocks & earnings", members: 6_540, online: 184 },
  { id: "r4", name: "macro", topic: "Rates, FX, geopolitics", members: 3_910, online: 92 },
  { id: "r5", name: "scalpers", topic: "Sub-1m setups", members: 2_180, online: 64 },
  { id: "r6", name: "alpha-leaks", topic: "Pro members only", members: 1_120, online: 41, pro: true },
];

const POSTS = [
  {
    id: "p1", user: "Mira Tanaka", handle: "@miratrades", time: "3m",
    text: "AAPL reclaimed 63.5k with conviction. Watching for retest of 64.8 — if held, we likely run to 67.",
    likes: 142, comments: 28, reposts: 14, tag: "AAPL", up: true, pinned: true,
  },
  {
    id: "p2", user: "Lukas Schmitt", handle: "@lukasfx", time: "11m",
    text: "EUR/USD looking heavy under 1.080. ECB doves + sticky US data = continuation lower.",
    likes: 86, comments: 19, reposts: 7, tag: "EURUSD", up: false,
  },
  {
    id: "p3", user: "Aria Volkov", handle: "@ariavol", time: "24m",
    text: "Nvidia options skew at 3-month highs. Market pricing in a big move into earnings — IV crush risk is real.",
    likes: 211, comments: 52, reposts: 38, tag: "NVDA", up: true,
  },
  {
    id: "p4", user: "Diego Marín", handle: "@diegomx", time: "41m",
    text: "Closed half my AMD long at 148. Trailing the rest with a stop at 142. Free trade from here.",
    likes: 64, comments: 11, reposts: 3, tag: "AMD", up: true,
  },
];

const TRENDING = [
  { tag: "NVDA", posts: "12.4k", change: "+18%" },
  { tag: "AAPL", posts: "9.8k", change: "+22%" },
  { tag: "Earnings", posts: "5.2k", change: "+12%" },
  { tag: "FOMC", posts: "4.1k", change: "+44%" },
  { tag: "AMD", posts: "3.6k", change: "+9%" },
  { tag: "EURUSD", posts: "2.9k", change: "−4%" },
];

export default function CommunityPage() {
  const router = useRouter();
  const [room, setRoom] = useState(ROOMS[0]);
  const [feed, setFeed] = useState<"trending" | "following" | "live">("trending");
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState(POSTS);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [reposted, setReposted] = useState<Record<string, boolean>>({});
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ id: string; user: string; text: string; time: string; me?: boolean }[]>([
    { id: "m1", user: "miratrades", text: "Anyone else watching that NVDA tape? Insane absorption.", time: "10:42" },
    { id: "m2", user: "lukasfx", text: "Yep, dealers got short gamma. Could squeeze.", time: "10:43" },
    { id: "m3", user: "ariavol", text: "Long calls into close 🚀", time: "10:44" },
    { id: "m4", user: "diegomx", text: "Sized in at 1124. Stop 1086.", time: "10:46" },
  ]);
  const chatRef = useRef<HTMLDivElement>(null);

  const submitComment = (postId: string) => {
    const text = commentDraft[postId]?.trim();
    if (!text) return;
    setPosts((p) => p.map((post) => post.id === postId ? { ...post, comments: post.comments + 1 } : post));
    setCommentDraft((d) => ({ ...d, [postId]: "" }));
    setCommentOpen((c) => ({ ...c, [postId]: false }));
  };

  const createRoom = () => {
    if (!newRoomName.trim()) return;
    setNewRoomName("");
    setShowRoomModal(false);
  };

  const submitPost = () => {
    if (!draft.trim()) return;
    setPosts((p) => [{ id: `p${Date.now()}`, user: "You", handle: "@you", time: "now", text: draft, likes: 0, comments: 0, reposts: 0, tag: "", up: true }, ...p]);
    setDraft("");
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const id = `m${Date.now()}`;
    setMessages((m) => [...m, { id, user: "you", text: chatInput, time: "now", me: true }]);
    setChatInput("");
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"><Users className="w-3 h-3" /> Network</div>
          <h1 className="font-display text-3xl tracking-tight mt-1">Community</h1>
          <p className="text-sm text-muted-foreground mt-1">Talk to 28,000+ traders. Share ideas, follow the tape, learn out loud.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border hairline">
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
            <span className="text-muted-foreground">1,142 online</span>
          </div>
          <button onClick={() => setShowRoomModal(true)} className="px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"><Plus className="w-3 h-3" />New room</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr_320px] gap-4">
        {/* Rooms sidebar */}
        <aside className="glass p-3 flex flex-col gap-3 h-fit">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-2">Rooms</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input placeholder="Search rooms…" className="w-full bg-transparent border hairline pl-9 pr-3 py-2 text-xs" />
          </div>
          <div className="flex flex-col gap-0.5">
            {ROOMS.map((r) => (
              <button key={r.id} onClick={() => setRoom(r)}
                className={`flex items-center gap-2 px-2 py-2 text-left text-[13px] ${room.id === r.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
                <Hash className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 truncate">{r.name}</span>
                {r.pro && <span className="text-[9px] uppercase tracking-wider text-primary">Pro</span>}
                <span className="text-[10px] font-mono text-muted-foreground">{r.online}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Feed */}
        <section className="flex flex-col gap-4 min-w-0">
          {/* Composer */}
          <div className="glass p-4 flex flex-col gap-3">
            <textarea
              value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="Share an idea, post a chart, ask a question…"
              rows={2}
              className="w-full bg-transparent border hairline px-3 py-2 text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-muted-foreground">
                <button className="p-1.5 hover:text-foreground hover:bg-muted"><ImageIcon className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 hover:text-foreground hover:bg-muted"><Smile className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 hover:text-foreground hover:bg-muted"><Hash className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={submitPost} disabled={!draft.trim()}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                <Send className="w-3 h-3" /> Post
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="inline-flex border hairline p-0.5 text-xs self-start">
            {(["trending", "following", "live"] as const).map((t) => (
              <button key={t} onClick={() => setFeed(t)} className={`px-3 py-1.5 capitalize ${feed === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
            ))}
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-3">
            {posts.map((p) => {
              const isLiked = !!liked[p.id];
              const isRepost = !!reposted[p.id];
              return (
                <article key={p.id} className="glass p-4 flex flex-col gap-3">
                  {p.pinned && (
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Pin className="w-3 h-3" /> Pinned
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 grid place-items-center bg-muted border hairline font-display shrink-0">{p.user[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="font-medium">{p.user}</span>
                        <span className="text-muted-foreground text-xs">{p.handle}</span>
                        <span className="text-muted-foreground text-xs">· {p.time}</span>
                        {p.tag && (
                          <span className={`text-[10px] px-1.5 py-0.5 border ${p.up ? "border-bull/30 text-bull bg-bull/10" : "border-bear/30 text-bear bg-bear/10"}`}>${p.tag}</span>
                        )}
                      </div>
                      <p className="text-sm mt-2 leading-relaxed">{p.text}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                        <button onClick={() => setLiked((s) => ({ ...s, [p.id]: !s[p.id] }))} className={`flex items-center gap-1.5 hover:text-bear ${isLiked ? "text-bear" : ""}`}>
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} /> {p.likes + (isLiked ? 1 : 0)}
                        </button>
                        <button onClick={() => setCommentOpen((c) => ({ ...c, [p.id]: !c[p.id] }))} className={`flex items-center gap-1.5 hover:text-foreground ${commentOpen[p.id] ? "text-foreground" : ""}`}>
                          <MessageSquare className="w-3.5 h-3.5" /> {p.comments}
                        </button>
                        <button onClick={() => setReposted((s) => ({ ...s, [p.id]: !s[p.id] }))} className={`flex items-center gap-1.5 hover:text-bull ${isRepost ? "text-bull" : ""}`}>
                          <Repeat2 className="w-3.5 h-3.5" /> {p.reposts + (isRepost ? 1 : 0)}
                        </button>
                      </div>
                      {commentOpen[p.id] && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            value={commentDraft[p.id] ?? ""}
                            onChange={(e) => setCommentDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && submitComment(p.id)}
                            placeholder="Write a comment…"
                            className="flex-1 bg-transparent border hairline px-3 py-1.5 text-xs"
                            autoFocus
                          />
                          <button onClick={() => submitComment(p.id)} className="p-2 bg-primary text-primary-foreground hover:opacity-90"><Send className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Right rail */}
        <aside className="flex flex-col gap-4">
          {/* Live chat */}
          <div className="glass flex flex-col h-[420px]">
            <div className="px-4 py-3 border-b hairline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                <span className="font-medium text-sm">{room.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{room.online} online</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 text-xs">
              {messages.map((m) => (
                <div key={m.id} className="flex gap-2">
                  <div className="w-6 h-6 grid place-items-center bg-muted border hairline text-[10px] font-display shrink-0">{m.user[0].toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`font-medium ${m.me ? "text-primary" : ""}`}>{m.user}</span>
                      <span className="text-[10px] text-muted-foreground">{m.time}</span>
                    </div>
                    <div className="leading-relaxed">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="p-3 border-t hairline flex items-center gap-2">
              <input
                value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Message #${room.name}…`}
                className="flex-1 bg-transparent border hairline px-3 py-1.5 text-xs"
              />
              <button type="submit" className="p-2 bg-primary text-primary-foreground hover:opacity-90"><Send className="w-3.5 h-3.5" /></button>
            </form>
          </div>

          {/* Trending */}
          <div className="glass p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Trending</h3>
              <span className="text-[10px] text-muted-foreground">last 4h</span>
            </div>
            <div className="flex flex-col">
              {TRENDING.map((t, i) => (
                <button key={t.tag} className="flex items-center justify-between py-2 border-b hairline last:border-0 hover:bg-muted/40 -mx-2 px-2 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                    <div>
                      <div className="text-sm">${t.tag}</div>
                      <div className="text-[10px] text-muted-foreground">{t.posts} posts</div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-mono ${t.change.startsWith("+") ? "text-bull" : "text-bear"}`}>{t.change}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggested */}
          <div className="glass p-4 flex flex-col gap-3">
            <h3 className="font-display text-base flex items-center gap-2"><Globe2 className="w-4 h-4" />Suggested traders</h3>
            {[
              { name: "Sigrid Berg", handle: "@sigrid", pnl: "+76.4%" },
              { name: "Hassan Reza", handle: "@hassanr", pnl: "+71.2%" },
              { name: "Camille Roux", handle: "@camille", pnl: "+64.8%" },
            ].map((s) => (
              <div key={s.handle} className="flex items-center gap-3">
                <div className="w-8 h-8 grid place-items-center bg-muted border hairline text-xs font-display">{s.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-none">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{s.handle} · <span className="text-bull">{s.pnl}</span></div>
                </div>
                <button
                  onClick={() => setFollowed((f) => ({ ...f, [s.handle]: !f[s.handle] }))}
                  className={`text-[11px] px-2.5 py-1 border transition-colors ${followed[s.handle] ? "bg-foreground text-background border-foreground" : "hairline hover:bg-muted"}`}>
                  {followed[s.handle] ? "Following" : "Follow"}
                </button>
              </div>
            ))}
            <button onClick={() => router.push("/dashboard/leaderboard")} className="text-[11px] text-primary mt-1 flex items-center gap-1 hover:gap-1.5 transition-all">
              See leaderboard <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </aside>
      </div>

      {showRoomModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowRoomModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="glass max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Create room</h3>
              <button onClick={() => setShowRoomModal(false)} className="p-1 hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Room name</label>
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                placeholder="e.g. crypto-options"
                className="bg-transparent border hairline px-3 py-2 text-sm focus:outline-none focus:border-accent/40"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">Lowercase, no spaces (use hyphens)</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRoomModal(false)} className="px-4 py-2 text-xs border hairline hover:bg-muted">Cancel</button>
              <button onClick={createRoom} disabled={!newRoomName.trim()} className="px-4 py-2 text-xs bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
