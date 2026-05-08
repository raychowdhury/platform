"use client";
import { useState } from "react";
import {
  GraduationCap, Play, Clock, BookOpen, Award, Search, Filter,
  CheckCircle2, Circle, Users, Star, ArrowRight, Trophy, BarChart3, Lock
} from "lucide-react";


type Course = {
  id: string;
  title: string;
  desc: string;
  category: "Foundations" | "Technical" | "Quant" | "Psychology" | "Macro";
  level: "Beginner" | "Intermediate" | "Advanced";
  lessons: number;
  hours: number;
  rating: number;
  enrolled: number;
  progress: number;
  pro?: boolean;
  instructor: string;
};

const COURSES: Course[] = [
  { id: "c1", title: "Markets 101: How They Really Work", desc: "Order books, market makers, liquidity, and why price moves the way it does.", category: "Foundations", level: "Beginner", lessons: 12, hours: 4.5, rating: 4.8, enrolled: 18420, progress: 100, instructor: "Mira Tanaka" },
  { id: "c2", title: "Reading Charts Like a Pro", desc: "Price action, support/resistance, candlestick patterns and volume profile.", category: "Technical", level: "Beginner", lessons: 18, hours: 6.2, rating: 4.9, enrolled: 14320, progress: 62, instructor: "Lukas Schmitt" },
  { id: "c3", title: "Risk & Position Sizing", desc: "The math of survival: Kelly, fixed-fractional, and dynamic sizing.", category: "Foundations", level: "Intermediate", lessons: 9, hours: 3.0, rating: 4.9, enrolled: 9_810, progress: 30, instructor: "Aria Volkov" },
  { id: "c4", title: "Building Your First Quant Strategy", desc: "From idea to backtest to live deployment with Python and Trevise.", category: "Quant", level: "Intermediate", lessons: 22, hours: 9.8, rating: 4.7, enrolled: 7_240, progress: 0, pro: true, instructor: "Diego Marín" },
  { id: "c5", title: "Mind Over Markets", desc: "FOMO, revenge trading, and the cognitive traps that drain accounts.", category: "Psychology", level: "Beginner", lessons: 8, hours: 2.4, rating: 4.6, enrolled: 11_120, progress: 0, instructor: "Priya Naidu" },
  { id: "c6", title: "Macro for Traders", desc: "Reading central banks, yield curves, and FX flows like a portfolio manager.", category: "Macro", level: "Advanced", lessons: 14, hours: 7.1, rating: 4.8, enrolled: 4_980, progress: 0, pro: true, instructor: "Atlas Macro" },
  { id: "c7", title: "Options: From Greeks to Income", desc: "Pricing, vol surface, and high-probability income strategies.", category: "Technical", level: "Advanced", lessons: 20, hours: 8.4, rating: 4.7, enrolled: 6_310, progress: 0, instructor: "Pyra Volatility" },
  { id: "c8", title: "Statistical Arbitrage", desc: "Cointegration, mean-reversion, and pairs trading at scale.", category: "Quant", level: "Advanced", lessons: 16, hours: 7.9, rating: 4.9, enrolled: 3_440, progress: 0, pro: true, instructor: "Helios Momentum" },
];

const PATHS = [
  { id: "p1", title: "Become a Discretionary Trader", courses: 5, weeks: 8, learners: 8_120, color: "from-primary/30 to-primary/10" },
  { id: "p2", title: "Become a Systematic Quant", courses: 7, weeks: 14, learners: 3_840, color: "from-bull/30 to-bull/10" },
  { id: "p3", title: "Master Risk Management", courses: 4, weeks: 6, learners: 6_240, color: "from-amber-500/30 to-amber-500/10" },
];

const CATS = ["All", "Foundations", "Technical", "Quant", "Psychology", "Macro"] as const;
const LEVELS = ["All levels", "Beginner", "Intermediate", "Advanced"] as const;

export default function AcademyPage() {
  const [cat, setCat] = useState<typeof CATS[number]>("All");
  const [level, setLevel] = useState<typeof LEVELS[number]>("All levels");
  const [search, setSearch] = useState("");
  const [enrolled, setEnrolled] = useState<Record<string, boolean>>({ c1: true, c2: true, c3: true });

  const filtered = COURSES.filter((c) =>
    (cat === "All" || c.category === cat) &&
    (level === "All levels" || c.level === level) &&
    (c.title.toLowerCase().includes(search.toLowerCase()) || c.desc.toLowerCase().includes(search.toLowerCase()))
  );

  const inProgress = COURSES.filter((c) => enrolled[c.id] && c.progress > 0 && c.progress < 100);
  const completed = COURSES.filter((c) => enrolled[c.id] && c.progress === 100);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"><GraduationCap className="w-3 h-3" /> Network</div>
          <h1 className="font-display text-3xl tracking-tight mt-1">Academy</h1>
          <p className="text-sm text-muted-foreground mt-1">Learn from working traders. Bite-sized lessons, full curriculum, real practice.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button className="px-3 py-1.5 border hairline hover:bg-muted flex items-center gap-1.5"><Trophy className="w-3 h-3" />Certifications</button>
          <button className="px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"><BarChart3 className="w-3 h-3" />My progress</button>
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {[
          { l: "Enrolled", v: Object.values(enrolled).filter(Boolean).length },
          { l: "In progress", v: inProgress.length },
          { l: "Completed", v: completed.length, s: "1 certificate" },
          { l: "Hours learned", v: "24.6h", s: "+3.2h this week" },
        ].map((s) => (
          <div key={s.l} className="bg-background p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.l}</div>
            <div className="font-display text-2xl mt-1">{s.v}</div>
            {s.s && <div className="text-[11px] text-muted-foreground mt-1">{s.s}</div>}
          </div>
        ))}
      </section>

      {/* Continue learning */}
      {inProgress.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">Continue learning</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {inProgress.map((c) => (
              <article key={c.id} className="glass p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.category} · {c.level}</div>
                    <h3 className="font-display text-lg mt-1">{c.title}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5">by {c.instructor}</div>
                  </div>
                  <button className="p-2 bg-primary text-primary-foreground hover:opacity-90 shrink-0"><Play className="w-3.5 h-3.5" /></button>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{Math.round(c.lessons * c.progress / 100)} of {c.lessons} lessons</span>
                    <span className="font-mono">{c.progress}%</span>
                  </div>
                  <div className="h-1 bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Learning paths */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl">Learning paths</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Curated curriculums to take you from zero to confident.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {PATHS.map((p) => (
            <article key={p.id} className="glass p-5 flex flex-col gap-4 cursor-pointer hover:border-foreground/20">
              <div className={`h-20 -mx-5 -mt-5 bg-gradient-to-br ${p.color} border-b hairline grid place-items-center`}>
                <Award className="w-8 h-8 text-foreground/60" />
              </div>
              <div>
                <h3 className="font-display text-lg">{p.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{p.courses} courses</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.weeks} weeks</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.learners.toLocaleString()}</span>
                </div>
              </div>
              <button className="text-xs py-2 border hairline hover:bg-muted flex items-center justify-center gap-1.5">
                Start path <ArrowRight className="w-3 h-3" />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl">All courses</h2>
        </div>
        <div className="glass p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses…" className="w-full bg-transparent border hairline pl-9 pr-3 py-2 text-xs" />
          </div>
          <div className="inline-flex border hairline p-0.5 text-xs">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`px-2.5 py-1.5 ${cat === c ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{c}</button>
            ))}
          </div>
          <select value={level} onChange={(e) => setLevel(e.target.value as any)} className="bg-background border hairline px-2.5 py-2 text-xs">
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const isEnrolled = !!enrolled[c.id];
            const isDone = c.progress === 100;
            return (
              <article key={c.id} className="glass p-4 flex flex-col gap-3 cursor-pointer hover:border-foreground/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{c.category}</span>
                    <span>·</span>
                    <span>{c.level}</span>
                  </div>
                  {c.pro && <span className="text-[10px] px-1.5 py-0.5 border border-primary/30 text-primary flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Pro</span>}
                </div>
                <h3 className="font-display text-lg leading-tight">{c.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.desc}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t hairline pt-3">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.lessons}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.hours}h</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" />{c.rating}</span>
                  <span className="flex items-center gap-1 ml-auto"><Users className="w-3 h-3" />{(c.enrolled / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">by {c.instructor}</span>
                  <button onClick={(e) => { e.stopPropagation(); setEnrolled((p) => ({ ...p, [c.id]: !p[c.id] })); }}
                    className={`text-[11px] px-2.5 py-1 border flex items-center gap-1 ${isEnrolled ? "bg-foreground text-background border-foreground" : "hairline hover:bg-muted"}`}>
                    {isDone ? <><CheckCircle2 className="w-3 h-3" />Completed</> : isEnrolled ? <><Circle className="w-3 h-3" />Enrolled</> : "Enroll"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="glass p-8 text-center text-sm text-muted-foreground">
            No courses match your filters.
          </div>
        )}
      </section>

      {/* Achievements / certifications */}
      <section className="glass p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 grid place-items-center bg-gradient-to-br from-amber-500/30 to-amber-500/10 border hairline">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="font-display text-lg">You're 3 lessons away from your next certificate</div>
            <div className="text-xs text-muted-foreground mt-0.5">Finish "Reading Charts Like a Pro" to unlock the Technical Analyst badge.</div>
          </div>
        </div>
        <button className="text-xs px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5">
          Resume course <Play className="w-3 h-3" />
        </button>
      </section>
    </>
  );
}
