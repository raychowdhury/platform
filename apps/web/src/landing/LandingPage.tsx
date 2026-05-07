import { useState, useEffect, useRef, ReactNode } from "react";
import { Link } from "react-router-dom";
import "./landing.css";

type Theme = "dark" | "light";

function FadeUp({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className="lp-fade-up" style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/* ─── Icons ──────────────────────────────────────────────────────────────────── */
const Icons = {
  Sun: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>),
  Moon: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>),
  Check: ({ color = "currentColor" }: { color?: string }) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  Star: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>),
  ArrowRight: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>),
  LogoMark: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
  Zap: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  BarChart2: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  Activity: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
  Shield: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  Code: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>),
  Layers: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  Globe: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>),
  TrendingUp: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>),
  Database: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>),
  Cpu: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>),
  Lock: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  Eye: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  Twitter: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>),
  Github: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>),
  Discord: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.128 18.116a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>),
};

/* ─── Hero chart — SPY price action ─────────────────────────────────────────── */
function HeroCandleChart({ theme }: { theme: Theme }) {
  const isDark = theme === "dark";
  const upColor = isDark ? "#22c55e" : "#16a34a";
  const downColor = isDark ? "#f87171" : "#dc2626";
  const lineColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const textColor = isDark ? "#52525b" : "#a1a1aa";
  const candles = [
    { o:538,h:541,l:536,c:540 },{ o:540,h:543,l:538,c:542 },{ o:542,h:545,l:540,c:541 },
    { o:541,h:543,l:537,c:538 },{ o:538,h:539,l:534,c:536 },{ o:536,h:538,l:533,c:537 },
    { o:537,h:541,l:535,c:540 },{ o:540,h:544,l:538,c:543 },{ o:543,h:547,l:541,c:546 },
    { o:546,h:549,l:544,c:548 },{ o:548,h:552,l:546,c:551 },{ o:551,h:553,l:547,c:549 },
    { o:549,h:551,l:545,c:547 },{ o:547,h:549,l:544,c:548 },{ o:548,h:553,l:547,c:552 },
    { o:552,h:556,l:550,c:555 },{ o:555,h:558,l:552,c:554 },{ o:554,h:557,l:552,c:556 },
    { o:556,h:561,l:554,c:560 },{ o:560,h:564,l:558,c:563 },
  ];
  const W=510,H=188,padL=6,padR=6,padT=10,padB=22;
  const priceRange={min:530,max:568};
  const toY=(p:number)=>padT+((priceRange.max-p)/(priceRange.max-priceRange.min))*(H-padT-padB);
  const cw=(W-padL-padR)/candles.length;
  const gridY=[535,545,555,565];
  const closePoints=candles.map((c,i)=>[padL+i*cw+cw/2,toY(c.c)] as [number,number]);
  const areaPath=`M${closePoints[0][0]},${toY(priceRange.min)} L${closePoints.map(([x,y])=>`${x},${y}`).join(" L")} L${closePoints[closePoints.length-1][0]},${toY(priceRange.min)} Z`;
  const linePath=`M${closePoints.map(([x,y])=>`${x},${y}`).join(" L")}`;
  return (
    <svg className="lp-svg-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="spyArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(99,102,241,0.18)"/>
          <stop offset="100%" stopColor="rgba(99,102,241,0)"/>
        </linearGradient>
      </defs>
      {gridY.map(p=>(
        <g key={p}>
          <line x1={padL} y1={toY(p)} x2={W-padR} y2={toY(p)} stroke={lineColor} strokeWidth="1"/>
          <text x={W-padR-2} y={toY(p)-3} textAnchor="end" fontSize="8.5" fill={textColor} fontFamily="JetBrains Mono, monospace">{p}</text>
        </g>
      ))}
      <path d={areaPath} fill="url(#spyArea)"/>
      <path d={linePath} fill="none" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {candles.map((c,i)=>{
        const isUp=c.c>=c.o;const clr=isUp?upColor:downColor;
        const x=padL+i*cw;const bx=x+cw*0.22,bw=cw*0.56;
        const by=toY(Math.max(c.o,c.c)),bh=Math.max(1.5,Math.abs(toY(c.o)-toY(c.c)));
        const mx=x+cw/2;
        return (<g key={i}><line x1={mx} y1={toY(c.h)} x2={mx} y2={toY(c.l)} stroke={clr} strokeWidth="1.1" opacity="0.75"/><rect x={bx} y={by} width={bw} height={bh} fill={clr} fillOpacity="0.9" rx="1"/></g>);
      })}
      <line x1={padL} y1={toY(563)} x2={W-padR} y2={toY(563)} stroke={upColor} strokeWidth="1" strokeDasharray="4 3" opacity="0.6"/>
      <rect x={W-padR-48} y={toY(563)-9} width={48} height={16} fill={upColor} rx="3"/>
      <text x={W-padR-24} y={toY(563)+3.5} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#fff" fontWeight="600">563.42</text>
    </svg>
  );
}

/* ─── Bookmap — order flow heatmap ──────────────────────────────────────────── */
function BookmapSVG() {
  const COLS=16,ROWS=10,W=290,H=162;
  const cw=W/COLS,ch=H/ROWS;
  const data=[
    [0,0,0,0.05,0,0.1,0.15,0.2,0.3,0.45,0.6,0.75,0.85,0.9,0.95,0.95],
    [0,0,0.05,0,0.05,0.1,0.05,0.1,0.15,0.2,0.3,0.4,0.5,0.6,0.7,0.8],
    [0.05,0.1,0.05,0.15,0.1,0.05,0.15,0.1,0.15,0.1,0.05,0.1,0.15,0.1,0.15,0.1],
    [0.1,0.05,0.15,0.1,0.2,0.15,0.1,0.2,0.15,0.1,0.2,0.1,0.15,0.1,0.1,0.05],
    [0.05,0.1,0.1,0.15,0.1,0.15,0.2,0.15,0.2,0.15,0.15,0.2,0.15,0.2,0.15,0.1],
    [0.1,0.05,0.15,0.1,0.1,0.15,0.1,0.15,0.1,0.2,0.15,0.1,0.15,0.1,0.1,0.15],
    [0.05,0.1,0.05,0.1,0.15,0.1,0.1,0.15,0.1,0.1,0.15,0.1,0.1,0.15,0.1,0.05],
    [0.1,0.15,0.1,0.05,0.1,0.15,0.1,0.05,0.1,0.1,0.15,0.1,0.05,0.1,0.1,0.15],
    [0.95,0.9,0.88,0.85,0.8,0.75,0.7,0.65,0.55,0.45,0.35,0.2,0.1,0.05,0,0],
    [0.7,0.75,0.78,0.72,0.65,0.6,0.55,0.5,0.4,0.3,0.2,0.1,0.05,0,0,0],
  ];
  const path=[8,7,7,6,6,5,5,4,4,4,3,3,4,4,3,3];
  const getClr=(ri:number,v:number)=>{
    if(v<0.04)return null;
    if(ri<=1)return v<0.4?`rgba(251,146,60,${v*0.7})`:`rgba(239,68,68,${0.4+v*0.55})`;
    if(ri>=8)return v<0.4?`rgba(34,197,94,${v*0.6})`:`rgba(34,197,94,${0.35+v*0.55})`;
    return `rgba(99,102,241,${v*0.55})`;
  };
  const prices=["563.00","561.50","560.00","558.50","557.00","555.50","554.00","552.50","551.00","549.50"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:`${H}px`,display:"block"}}>
      <rect width={W} height={H} fill="#060608"/>
      {data.map((row,ri)=>row.map((v,ci)=>{
        const clr=getClr(ri,v);if(!clr)return null;
        return <rect key={`${ri}-${ci}`} x={ci*cw} y={ri*ch} width={cw-0.5} height={ch-0.5} fill={clr}/>;
      }))}
      <polyline points={path.map((ri,ci)=>`${ci*cw+cw/2},${ri*ch+ch/2}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={15*cw+cw/2} cy={path[15]*ch+ch/2} r="3" fill="#fff"/>
      <text x={W-3} y={0*ch+ch/2+3} textAnchor="end" fontSize="8" fill="rgba(239,68,68,0.95)" fontFamily="JetBrains Mono, monospace" fontWeight="700">ASK WALL</text>
      <text x={3} y={8*ch+ch/2+3} textAnchor="start" fontSize="8" fill="rgba(34,197,94,0.95)" fontFamily="JetBrains Mono, monospace" fontWeight="700">BID WALL</text>
      {[0,4,8].map(ri=>(
        <text key={ri} x={W-2} y={ri*ch+ch-2} textAnchor="end" fontSize="7.5" fill="rgba(255,255,255,0.2)" fontFamily="JetBrains Mono, monospace">{prices[ri]}</text>
      ))}
    </svg>
  );
}

/* ─── Footprint candlestick chart ────────────────────────────────────────────── */
function FootprintSVG({ theme }: { theme: Theme }) {
  const isDark = theme === "dark";
  const green = isDark ? "#22c55e" : "#16a34a";
  const red = isDark ? "#f87171" : "#dc2626";
  const amber = "#fbbf24";
  const W=290,H=162;
  const candles=[
    { up:true, levels:[{b:45,a:12,poc:false},{b:89,a:34,poc:false},{b:156,a:67,poc:true},{b:78,a:45,poc:false},{b:34,a:23,poc:false}], delta:341 },
    { up:false,levels:[{b:12,a:98,poc:false},{b:34,a:134,poc:true},{b:45,a:89,poc:false},{b:23,a:56,poc:false},{b:19,a:34,poc:false}], delta:-287 },
    { up:true, levels:[{b:67,a:23,poc:false},{b:123,a:45,poc:false},{b:198,a:78,poc:true},{b:145,a:56,poc:false},{b:89,a:34,poc:false}], delta:542 },
    { up:false,levels:[{b:23,a:78,poc:false},{b:45,a:112,poc:true},{b:34,a:89,poc:false},{b:28,a:67,poc:false},{b:19,a:45,poc:false}], delta:-189 },
    { up:true, levels:[{b:34,a:12,poc:false},{b:78,a:28,poc:false},{b:145,a:56,poc:true},{b:112,a:45,poc:false},{b:67,a:34,poc:false}], delta:421 },
  ];
  const cw=W/candles.length;
  const deltaH=22,bodyTop=6;
  const bodyH=H-deltaH-bodyTop-6;
  const levelH=bodyH/5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:`${H}px`,display:"block"}}>
      <rect width={W} height={H} fill="#060608"/>
      {candles.map((c,ci)=>{
        const x=ci*cw,bx=x+3,bw=cw-6;
        const color=c.up?green:red;
        const mx=x+cw/2;
        return (
          <g key={ci}>
            <line x1={mx} y1={bodyTop} x2={mx} y2={bodyTop+bodyH} stroke={color} strokeWidth="1" opacity="0.3"/>
            <rect x={bx} y={bodyTop} width={bw} height={bodyH} fill="rgba(0,0,0,0.5)" stroke={color} strokeWidth="0.75" rx="1"/>
            {c.levels.map((l,li)=>{
              const ly=bodyTop+li*levelH;
              const bg=l.poc?"rgba(251,191,36,0.18)":l.b>l.a?"rgba(34,197,94,0.08)":"rgba(248,113,113,0.08)";
              const tc=l.poc?amber:l.b>l.a?green:red;
              return (
                <g key={li}>
                  <rect x={bx} y={ly} width={bw} height={levelH-0.5} fill={bg}/>
                  {l.poc&&<rect x={bx} y={ly} width={bw} height={levelH-0.5} fill="none" stroke={amber} strokeWidth="0.5" opacity="0.5"/>}
                  <text x={bx+bw/2} y={ly+levelH/2+3} textAnchor="middle" fontSize="7.5" fontFamily="JetBrains Mono, monospace" fill={tc} fontWeight={l.poc?"700":"400"}>
                    {l.b}×{l.a}
                  </text>
                </g>
              );
            })}
            <rect x={bx} y={H-deltaH-2} width={bw} height={deltaH-4} fill={c.delta>0?"rgba(34,197,94,0.15)":"rgba(248,113,113,0.15)"} rx="1"/>
            <text x={bx+bw/2} y={H-deltaH+8} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono, monospace" fill={c.delta>0?green:red} fontWeight="700">
              {c.delta>0?"+":""}{c.delta}
            </text>
            <text x={bx+bw/2} y={H-3} textAnchor="middle" fontSize="6" fontFamily="JetBrains Mono, monospace" fill="rgba(255,255,255,0.25)">Δ</text>
          </g>
        );
      })}
      <text x={W/2} y={H/2} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0)" fontFamily="JetBrains Mono, monospace">BID × ASK · POC HIGHLIGHTED</text>
    </svg>
  );
}

/* ─── Volume Profile ─────────────────────────────────────────────────────────── */
function VolumeProfileSVG({ theme }: { theme: Theme }) {
  const isDark = theme === "dark";
  const green = isDark ? "#22c55e" : "#16a34a";
  const W=290,H=162,padL=52,padR=10,padT=8,padB=8;
  const barMaxW=W-padL-padR;
  const levels=[
    {price:"563.50",vol:28},{price:"563.00",vol:54},{price:"562.50",vol:96},
    {price:"562.00",vol:142},{price:"561.50",vol:198},{price:"561.00",vol:244},
    {price:"560.50",vol:218},{price:"560.00",vol:175},{price:"559.50",vol:128},
    {price:"559.00",vol:88},{price:"558.50",vol:54},{price:"558.00",vol:32},
  ];
  const maxVol=Math.max(...levels.map(l=>l.vol));
  const rowH=(H-padT-padB)/levels.length;
  const pocIdx=5;
  const vwapY=padT+6.8*rowH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:`${H}px`,display:"block"}}>
      <rect width={W} height={H} fill="#060608"/>
      {levels.map((l,i)=>{
        const y=padT+i*rowH;
        const bw=(l.vol/maxVol)*barMaxW;
        const isPOC=i===pocIdx;
        const isVA=i>=3&&i<=9;
        const barFill=isPOC?"rgba(251,191,36,0.8)":isVA?"rgba(99,102,241,0.55)":"rgba(99,102,241,0.28)";
        return (
          <g key={i}>
            {isVA&&!isPOC&&<rect x={padL} y={y} width={barMaxW} height={rowH-0.5} fill="rgba(99,102,241,0.04)"/>}
            <rect x={padL} y={y+2} width={bw} height={rowH-4} fill={barFill} rx="1"/>
            <text x={padL-4} y={y+rowH/2+3} textAnchor="end" fontSize="8" fontFamily="JetBrains Mono, monospace"
              fill={isPOC?"#fbbf24":"rgba(255,255,255,0.28)"} fontWeight={isPOC?"700":"400"}>
              {l.price}
            </text>
            {isPOC&&<text x={padL+bw+4} y={y+rowH/2+3} textAnchor="start" fontSize="7.5" fontFamily="JetBrains Mono, monospace" fill="#fbbf24" fontWeight="700">POC</text>}
          </g>
        );
      })}
      <line x1={padL} y1={vwapY} x2={W-padR} y2={vwapY} stroke={green} strokeWidth="1" strokeDasharray="3 3"/>
      <text x={padL+4} y={vwapY-3} fontSize="7.5" fontFamily="JetBrains Mono, monospace" fill={green} fontWeight="600">VWAP</text>
      <text x={padL} y={H-1} fontSize="6.5" fontFamily="JetBrains Mono, monospace" fill="rgba(255,255,255,0.15)">VOLUME PROFILE · VALUE AREA 70%</text>
    </svg>
  );
}

/* ─── Ticker ─────────────────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  { sym:"SPY",    price:"563.42",  chg:"+1.18%", up:true  },
  { sym:"QQQ",    price:"484.20",  chg:"+2.14%", up:true  },
  { sym:"NVDA",   price:"878.60",  chg:"+3.42%", up:true  },
  { sym:"AAPL",   price:"196.45",  chg:"+0.82%", up:true  },
  { sym:"TSLA",   price:"243.20",  chg:"-1.34%", up:false },
  { sym:"META",   price:"512.80",  chg:"+1.67%", up:true  },
  { sym:"AMZN",   price:"197.30",  chg:"+1.88%", up:true  },
  { sym:"GS",     price:"523.40",  chg:"+0.65%", up:true  },
  { sym:"JPM",    price:"214.80",  chg:"+0.43%", up:true  },
  { sym:"ES-H25", price:"5,432.00",chg:"+1.24%", up:true  },
];

/* ─── Code samples ───────────────────────────────────────────────────────────── */
const CODE_REST = `<span class="lp-tok-cmt">// Level 2 order book — SPY (20 levels)</span>
<span class="lp-tok-kw">const</span> book = <span class="lp-tok-kw">await</span> fetch(
  <span class="lp-tok-str">"/v1/market/SPY/level2?depth=20"</span>,
  { headers: { <span class="lp-tok-str">"Authorization"</span>: <span class="lp-tok-str">\`Bearer \${token}\`</span> } }
).<span class="lp-tok-fn">then</span>(r => r.<span class="lp-tok-fn">json</span>());

<span class="lp-tok-cmt">// OCO bracket — NVDA with trailing stop</span>
<span class="lp-tok-kw">const</span> order = <span class="lp-tok-kw">await</span> <span class="lp-tok-fn">placeOrder</span>({
  symbol:      <span class="lp-tok-str">"NVDA"</span>,
  side:        <span class="lp-tok-str">"buy"</span>,
  type:        <span class="lp-tok-str">"limit"</span>,
  qty:         <span class="lp-tok-num">100</span>,
  limit_price: <span class="lp-tok-num">875.00</span>,
  take_profit: { price: <span class="lp-tok-num">920.00</span> },
  stop_loss:   { trail_pct: <span class="lp-tok-num">2.5</span>, trailing: <span class="lp-tok-num">true</span> },
});`;

const CODE_WS = `<span class="lp-tok-cmt">// WebSocket — footprint + Level 2 stream</span>
<span class="lp-tok-kw">const</span> ws = <span class="lp-tok-kw">new</span> <span class="lp-tok-fn">WebSocket</span>(
  <span class="lp-tok-str">\`wss://api.meridian.io/v1/stream/\${token}\`</span>
);

ws.<span class="lp-tok-fn">send</span>(<span class="lp-tok-fn">JSON.stringify</span>({
  type:    <span class="lp-tok-str">"subscribe"</span>,
  channel: <span class="lp-tok-str">"footprint"</span>,
  symbols: [<span class="lp-tok-str">"SPY"</span>, <span class="lp-tok-str">"NVDA"</span>, <span class="lp-tok-str">"QQQ"</span>],
}));

ws.onmessage = ({ data }) => {
  <span class="lp-tok-kw">const</span> { symbol, levels, delta, poc } =
    <span class="lp-tok-fn">JSON.parse</span>(data);
  <span class="lp-tok-cmt">// bid×ask at each price level, real-time</span>
  <span class="lp-tok-fn">updateFootprint</span>(symbol, levels, delta);
};`;

const CODE_PYTHON = `<span class="lp-tok-cmt"># Python SDK — dark pool + options flow</span>
<span class="lp-tok-kw">import</span> asyncio
<span class="lp-tok-kw">from</span> meridian_sdk <span class="lp-tok-kw">import</span> Client

<span class="lp-tok-kw">async def</span> <span class="lp-tok-fn">main</span>():
    client = <span class="lp-tok-fn">Client</span>(api_key=<span class="lp-tok-str">"pk_live_..."</span>)

    <span class="lp-tok-kw">async with</span> client.<span class="lp-tok-fn">stream</span>() <span class="lp-tok-kw">as</span> s:
        <span class="lp-tok-kw">await</span> s.<span class="lp-tok-fn">subscribe</span>(
            symbols=[<span class="lp-tok-str">"SPY"</span>, <span class="lp-tok-str">"NVDA"</span>],
            channels=[<span class="lp-tok-str">"dark_pool"</span>, <span class="lp-tok-str">"options_flow"</span>, <span class="lp-tok-str">"gex"</span>],
        )
        <span class="lp-tok-kw">async for</span> msg <span class="lp-tok-kw">in</span> s:
            <span class="lp-tok-fn">print</span>(<span class="lp-tok-str">f"[{msg['type']}] {msg['symbol']}: \${msg['size']:,}"</span>)

asyncio.<span class="lp-tok-fn">run</span>(<span class="lp-tok-fn">main</span>())`;

/* ─── Main ───────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>(() => {
    const s = localStorage.getItem("lp-theme");
    return s === "light" ? "light" : "dark";
  });
  const [codeTab, setCodeTab] = useState<"rest"|"ws"|"python">("rest");
  useEffect(() => { localStorage.setItem("lp-theme", theme); }, [theme]);
  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const codeContent = codeTab === "rest" ? CODE_REST : codeTab === "ws" ? CODE_WS : CODE_PYTHON;

  return (
    <div className="lp" data-lp-theme={theme}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo">
            <div className="lp-logo-icon"><Icons.LogoMark/></div>
            Meridian
          </a>
          <ul className="lp-nav-links">
            <li><a href="#features">Charts</a></li>
            <li><a href="#smart-money">Smart Money</a></li>
            <li><a href="#api">API</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
          <div className="lp-nav-actions">
            <button className="lp-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Icons.Sun/> : <Icons.Moon/>}
            </button>
            <Link to="/login" className="lp-btn lp-btn-ghost">Sign in</Link>
            <Link to="/signup" className="lp-btn lp-btn-primary">Get started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="lp-hero" id="hero">
        <div className="lp-hero-img"/>
        <div className="lp-hero-noise"/>
        <div className="lp-hero-inner">
          <div>
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot"/>
              Live · SPY, QQQ, NVDA, AAPL and 240+ instruments
            </div>
            <h1 className="lp-hero-h1">
              See where the<br/>
              <span className="lp-accent-text">smart money</span><br/>
              is positioned.
            </h1>
            <p className="lp-hero-sub">
              Bookmap order flow, footprint candlesticks, Level 2 volume profile,
              dark pool prints, and gamma exposure — the full institutional picture,
              streaming in real time.
            </p>
            <div className="lp-hero-actions">
              <Link to="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
                Start free <Icons.ArrowRight/>
              </Link>
              <a href="#features" className="lp-btn lp-btn-outline-lg">See the charts</a>
            </div>
            <div className="lp-hero-trust">
              <span className="lp-hero-trust-item"><Icons.Check color="var(--lp-green)"/>No credit card</span>
              <span className="lp-hero-trust-sep">·</span>
              <span className="lp-hero-trust-item"><Icons.Check color="var(--lp-green)"/>NYSE + NASDAQ feeds</span>
              <span className="lp-hero-trust-sep">·</span>
              <span className="lp-hero-trust-item"><Icons.Check color="var(--lp-green)"/>SOC 2 ready</span>
            </div>
          </div>
          <div>
            <div className="lp-chart-card">
              <div className="lp-chart-header">
                <div className="lp-chart-symbol">
                  <div className="lp-chart-symbol-icon" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>S</div>
                  <div>
                    <div className="lp-chart-symbol-name">SPY · SPDR S&amp;P 500 ETF</div>
                    <div className="lp-chart-symbol-exch">NYSE Arca · Equity</div>
                  </div>
                </div>
                <div className="lp-chart-price">
                  <div className="lp-chart-price-val lp-mono">563.42</div>
                  <div className="lp-chart-price-chg up">+6.58 (+1.18%)</div>
                </div>
              </div>
              <div className="lp-chart-tabs">
                {["1m","5m","15m","1h","1D","1W"].map(t=>(
                  <button key={t} className={`lp-chart-tab${t==="1h"?" active":""}`}>{t}</button>
                ))}
              </div>
              <div className="lp-chart-body"><HeroCandleChart theme={theme}/></div>
              <div className="lp-chart-mini-stats">
                {[{label:"Open",val:"556.84"},{label:"High",val:"564.12"},{label:"Low",val:"555.20"},{label:"Vol",val:"98.4M"}].map(s=>(
                  <div key={s.label} className="lp-chart-stat">
                    <div className="lp-chart-stat-label">{s.label}</div>
                    <div className="lp-chart-stat-val">{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ticker ─────────────────────────────────────────────────────────── */}
      <div className="lp-ticker">
        <div className="lp-ticker-track">
          {[...TICKER_ITEMS,...TICKER_ITEMS].map((item,i)=>(
            <span key={i} className="lp-ticker-item">
              <span className="lp-ticker-sym">{item.sym}</span>
              <span className="lp-ticker-price">{item.price}</span>
              <span className={`lp-ticker-chg ${item.up?"up":"down"}`}>{item.chg}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="lp-stats">
        <div className="lp-container">
          <div className="lp-stats-grid">
            {[
              {num:"$12T+",  label:"Daily Institutional Flow",  sub:"Tracked across all instruments"},
              {num:"< 1ms",  label:"Tick-to-Screen Latency",    sub:"NYSE + NASDAQ + CME feeds"},
              {num:"99.99%", label:"Platform Uptime",           sub:"12-month trailing SLA"},
              {num:"240+",   label:"Chart Indicators",          sub:"Incl. smart money & order flow"},
            ].map(s=>(
              <div key={s.label} className="lp-stat-item">
                <div className="lp-stat-num">{s.num}</div>
                <div className="lp-stat-label">{s.label}</div>
                <div className="lp-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <FadeUp>
            <div className="lp-label"><Icons.BarChart2/> Chart Suite</div>
            <h2 className="lp-section-h2">Every chart a professional<br/>trader actually uses.</h2>
            <p className="lp-section-sub">
              From traditional candlesticks to Bookmap order flow heatmaps and footprint
              charts — the full institutional toolkit, rendered at 60fps with real exchange data.
            </p>
          </FadeUp>
          <div className="lp-features-grid">
            {[
              {icon:<Icons.Layers/>,    title:"Bookmap Order Flow",       desc:"Visualize the limit order book as a real-time heatmap. See where large resting orders create bid walls and ask walls — before price gets there."},
              {icon:<Icons.BarChart2/>, title:"Footprint Candlesticks",   desc:"Bid × ask volume printed at every price level inside each candle. Delta, POC, and volume imbalance visible at a glance. The closest view of market microstructure."},
              {icon:<Icons.Activity/>,  title:"Level 2 + Volume Profile", desc:"Full market depth with volume at each price level. POC, VWAP, and value area overlaid. Understand where the majority of institutional size transacted."},
              {icon:<Icons.Globe/>,     title:"Multi-Layout Split Screen", desc:"Up to 6 simultaneous chart panels with synchronized crosshairs. Compare SPY vs QQQ, run multi-timeframe analysis, or monitor a basket side-by-side."},
              {icon:<Icons.Shield/>,    title:"Hedge Fund Indicators",     desc:"Volume delta, cumulative delta, VWAP anchors, order blocks, fair value gaps, and market profile. The same indicators institutional desks run on Bloomberg Terminal."},
              {icon:<Icons.Code/>,      title:"API-First Architecture",   desc:"Every chart and data feed is REST and WebSocket-accessible. Build quant strategies, automate alerts, or construct a custom terminal with your own stack."},
            ].map((f,i)=>(
              <FadeUp key={f.title} delay={i*60}>
                <div className="lp-feature-card">
                  <div className="lp-feature-icon">{f.icon}</div>
                  <h3 className="lp-feature-h3">{f.title}</h3>
                  <p className="lp-feature-p">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Charts showcase ─────────────────────────────────────────────────── */}
      <section className="lp-section lp-section-alt" id="charts">
        <div className="lp-container">
          <FadeUp>
            <div className="lp-text-center">
              <div className="lp-label" style={{justifyContent:"center"}}><Icons.Eye/> Advanced Charts</div>
              <h2 className="lp-section-h2">Charts institutions use.<br/>Now accessible to everyone.</h2>
              <p className="lp-section-sub centered">
                Bookmap heatmaps, footprint delta, and volume profile — the same order flow
                tools used by prop desks and hedge funds, streaming live.
              </p>
            </div>
          </FadeUp>
          <div className="lp-charts-grid">
            <FadeUp delay={0}>
              <div className="lp-chart-showcase-card">
                <div className="lp-chart-showcase-header">
                  <span className="lp-chart-showcase-title">Bookmap · Order Flow Heatmap</span>
                  <span className="lp-chart-showcase-badge">Real-time</span>
                </div>
                <div className="lp-chart-showcase-body"><BookmapSVG/></div>
                <p className="lp-chart-showcase-sub">
                  Limit order book visualized over time. Bid walls and ask walls visible as color intensity — green = large resting bids, red = large resting asks.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <div className="lp-chart-showcase-card">
                <div className="lp-chart-showcase-header">
                  <span className="lp-chart-showcase-title">Footprint Candlestick</span>
                  <span className="lp-chart-showcase-badge rt">Delta Live</span>
                </div>
                <div className="lp-chart-showcase-body"><FootprintSVG theme={theme}/></div>
                <p className="lp-chart-showcase-sub">
                  Bid × ask volume at every price level inside each candle. POC highlighted in amber. Delta shows net aggressive buying or selling per bar.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={160}>
              <div className="lp-chart-showcase-card">
                <div className="lp-chart-showcase-header">
                  <span className="lp-chart-showcase-title">Volume Profile</span>
                  <span className="lp-chart-showcase-badge pro">Pro</span>
                </div>
                <div className="lp-chart-showcase-body"><VolumeProfileSVG theme={theme}/></div>
                <p className="lp-chart-showcase-sub">
                  Volume at each price level with VWAP overlay and value area (70%). POC marks the price with highest traded volume — key institutional reference.
                </p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Smart Money ─────────────────────────────────────────────────────── */}
      <section className="lp-section" id="smart-money">
        <div className="lp-container">
          <FadeUp>
            <div className="lp-label"><Icons.Eye/> Institutional Intelligence</div>
            <h2 className="lp-section-h2">See where the smart money<br/>is sitting — before it moves.</h2>
            <p className="lp-section-sub">
              Dark pool prints, options sweep detection, gamma exposure, and institutional order blocks.
              The signals hedge funds act on, streamed directly to your terminal.
            </p>
          </FadeUp>
          <div className="lp-features-grid" style={{marginTop:48}}>
            {[
              {
                icon:<Icons.Eye/>,
                title:"Dark Pool Prints",
                desc:"Off-exchange block trades printed in real-time. Filter by size, exchange, and ticker. Know when institutions transact away from the lit market — often a directional signal before it hits the tape.",
              },
              {
                icon:<Icons.Activity/>,
                title:"Options Flow & Unusual Sweeps",
                desc:"Large sweep detection across CBOE and PHLX. See when smart money bets on directional moves through calls or puts — before the underlying stock reacts.",
              },
              {
                icon:<Icons.BarChart2/>,
                title:"Gamma Exposure (GEX)",
                desc:"Live gamma exposure levels showing where options market makers must hedge. These gravity wells attract price at expiry. Know the call wall, put wall, and max pain before the session opens.",
              },
              {
                icon:<Icons.Shield/>,
                title:"Institutional Order Blocks",
                desc:"Automatically identified zones where large institutional orders were filled. These price areas become significant support and resistance levels referenced by every major desk.",
              },
              {
                icon:<Icons.TrendingUp/>,
                title:"Cumulative Volume Delta",
                desc:"Real-time net buy vs sell aggression accumulated across each session. Divergence between CVD and price is one of the most reliable early signals of trend exhaustion.",
              },
              {
                icon:<Icons.Zap/>,
                title:"Large Lot Detector",
                desc:"Cross-exchange sweep detection for block orders routing through multiple venues simultaneously. Spot when a large buyer or seller is aggressively filling across price levels.",
              },
            ].map((f,i)=>(
              <FadeUp key={f.title} delay={i*60}>
                <div className="lp-feature-card">
                  <div className="lp-feature-icon">{f.icon}</div>
                  <h3 className="lp-feature-h3">{f.title}</h3>
                  <p className="lp-feature-p">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── API Section ────────────────────────────────────────────────────── */}
      <section className="lp-section lp-section-alt" id="api">
        <div className="lp-container">
          <div className="lp-api-grid">
            <FadeUp>
              <div className="lp-code-block">
                <div className="lp-code-header">
                  <div className="lp-code-dot" style={{background:"#ef4444"}}/>
                  <div className="lp-code-dot" style={{background:"#f59e0b"}}/>
                  <div className="lp-code-dot" style={{background:"#22c55e"}}/>
                  <span className="lp-code-title">meridian-api · typescript</span>
                </div>
                <div className="lp-code-tabs">
                  {(["rest","ws","python"] as const).map(tab=>(
                    <button key={tab} className={`lp-code-tab${codeTab===tab?" active":""}`} onClick={()=>setCodeTab(tab)}>
                      {tab==="rest"?"REST":tab==="ws"?"WebSocket":"Python"}
                    </button>
                  ))}
                </div>
                <div className="lp-code-body">
                  <pre dangerouslySetInnerHTML={{__html:codeContent}}/>
                </div>
              </div>
            </FadeUp>
            <div>
              <FadeUp>
                <div className="lp-label"><Icons.Code/> Developer API</div>
                <h2 className="lp-section-h2">The API shaping the next generation of trading.</h2>
                <p className="lp-section-sub">
                  Every chart, feed, and signal available as REST and WebSocket endpoints.
                  Build quant strategies, automated alerts, or a custom terminal — with
                  the same data infrastructure institutional desks run on.
                </p>
              </FadeUp>
              <div className="lp-api-features">
                {[
                  {icon:<Icons.Zap/>,     title:"Footprint & Level 2 Streaming", desc:"Real-time bid×ask at every price level, volume delta, and full order book depth pushed via WebSocket in under 1ms."},
                  {icon:<Icons.Eye/>,     title:"Dark Pool & Options Flow API",   desc:"Off-exchange prints, unusual sweep detection, and GEX levels streamed as structured events. Filterable by size, ticker, and exchange."},
                  {icon:<Icons.Lock/>,    title:"HMAC API Key Auth",              desc:"Scoped keys with IP allowlisting, read/trade/admin permissions, and per-key rate limits. Rotate without downtime."},
                ].map((f,i)=>(
                  <FadeUp key={f.title} delay={i*80}>
                    <div className="lp-api-feat">
                      <div className="lp-api-feat-icon">{f.icon}</div>
                      <div className="lp-api-feat-text"><h4>{f.title}</h4><p>{f.desc}</p></div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Multi-layout ────────────────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-realtime-grid">
            <FadeUp>
              <div className="lp-latency-display" style={{padding:"32px 24px"}}>
                <svg viewBox="0 0 280 210" style={{width:"100%",display:"block"}}>
                  <rect width="280" height="210" fill="#060608" rx="8"/>
                  {(()=>{
                    const panels=[
                      {sym:"SPY",  price:"563.42",up:true},
                      {sym:"QQQ",  price:"484.20",up:true},
                      {sym:"NVDA", price:"878.60",up:true},
                      {sym:"TSLA", price:"243.20",up:false},
                    ];
                    const offsets:[[number,number],[number,number],[number,number],[number,number]]=[[0,0],[140,0],[0,105],[140,105]];
                    return offsets.map(([px,py],i)=>{
                      const {sym,price,up}=panels[i];
                      return (
                        <g key={i}>
                          <rect x={px+2} y={py+2} width="136" height="101" fill="rgba(99,102,241,0.04)" stroke="rgba(99,102,241,0.15)" strokeWidth="0.75" rx="3"/>
                          <text x={px+8} y={py+16} fontSize="8" fontFamily="JetBrains Mono, monospace" fill="rgba(255,255,255,0.5)" fontWeight="600">{sym}</text>
                          <text x={px+8} y={py+27} fontSize="7" fontFamily="JetBrains Mono, monospace" fill={up?"rgba(34,197,94,0.8)":"rgba(248,113,113,0.8)"}>{price}</text>
                          {[0,1,2,3,4,5,6,7].map(j=>{
                            const bh=20+Math.sin(j*0.9+i)*15;
                            const x2=px+12+j*14,y2=py+95-bh;
                            return <rect key={j} x={x2} y={y2} width="10" height={bh} fill={up?"rgba(34,197,94,0.5)":"rgba(248,113,113,0.5)"} rx="1"/>;
                          })}
                        </g>
                      );
                    });
                  })()}
                  <line x1="140" y1="2" x2="140" y2="208" stroke="rgba(99,102,241,0.2)" strokeWidth="1"/>
                  <line x1="2" y1="105" x2="278" y2="105" stroke="rgba(99,102,241,0.2)" strokeWidth="1"/>
                  <text x="140" y="206" textAnchor="middle" fontSize="7" fontFamily="JetBrains Mono, monospace" fill="rgba(255,255,255,0.2)">2×2 SPLIT · SYNCHRONIZED CROSSHAIR</text>
                </svg>
              </div>
            </FadeUp>
            <div>
              <FadeUp>
                <div className="lp-label"><Icons.Layers/> Multi-Layout</div>
                <h2 className="lp-section-h2">Six charts.<br/>One screen.</h2>
                <p className="lp-section-sub">
                  Run SPY vs QQQ side-by-side, stack Bookmap above footprint below, or
                  monitor a full basket across 6 panels — all synchronized on the same
                  crosshair and timestamp.
                </p>
              </FadeUp>
              <div className="lp-realtime-points" style={{marginTop:36}}>
                {[
                  {icon:<Icons.Layers/>,  title:"1×1 to 3×2 grid layouts",    desc:"Drag and drop panels into any arrangement. Save and recall named layouts instantly."},
                  {icon:<Icons.Activity/>,title:"Synchronized crosshair",      desc:"Hover on any panel — crosshair locks to the same timestamp across all charts simultaneously."},
                  {icon:<Icons.Globe/>,   title:"Mixed chart types per panel", desc:"Candlestick in panel 1, Bookmap in panel 2, Volume Profile in panel 3 — any combination."},
                ].map((p,i)=>(
                  <FadeUp key={p.title} delay={i*80}>
                    <div className="lp-realtime-point">
                      <div className="lp-realtime-point-icon">{p.icon}</div>
                      <div className="lp-realtime-point-text"><h4>{p.title}</h4><p>{p.desc}</p></div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Real-Time Infrastructure ────────────────────────────────────────── */}
      <section className="lp-section lp-section-alt" id="realtime">
        <div className="lp-container">
          <div className="lp-realtime-grid">
            <FadeUp>
              <div className="lp-latency-display">
                <div className="lp-latency-ring">
                  <div className="lp-latency-val">&lt;1</div>
                  <div className="lp-latency-unit">ms</div>
                </div>
                <div className="lp-latency-label">Exchange-to-screen latency</div>
                <div className="lp-realtime-specs">
                  {[{val:"NYSE",label:"Feed"},{val:"TSB",label:"TimescaleDB"},{val:"PUB",label:"Redis"}].map(s=>(
                    <div key={s.label} className="lp-realtime-spec">
                      <div className="lp-realtime-spec-val">{s.val}</div>
                      <div className="lp-realtime-spec-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
            <div>
              <FadeUp>
                <div className="lp-label"><Icons.Activity/> Infrastructure</div>
                <h2 className="lp-section-h2">Real-time data.<br/>No compromises.</h2>
                <p className="lp-section-sub">
                  Every tick flows from NYSE, NASDAQ, and CME through our ingestion pipeline,
                  into TimescaleDB hypertables, and out to your screen in under a millisecond.
                  No polling. No stale data.
                </p>
              </FadeUp>
              <div className="lp-realtime-points" style={{marginTop:36}}>
                {[
                  {icon:<Icons.Zap/>,     title:"Direct Exchange Feeds",      desc:"Native connections to NYSE, NASDAQ Level 2, CME Globex, and CBOE options. Ticks arrive before REST endpoints update."},
                  {icon:<Icons.Database/>,title:"TimescaleDB Hypertables",    desc:"Tick data auto-partitioned by time. Footprint, OHLCV, and order book snapshots computed continuously."},
                  {icon:<Icons.Cpu/>,     title:"Redis Fan-Out PubSub",       desc:"Each tick published to Redis, consumed by API servers, and pushed to every subscribed WebSocket session simultaneously."},
                ].map((p,i)=>(
                  <FadeUp key={p.title} delay={i*80}>
                    <div className="lp-realtime-point">
                      <div className="lp-realtime-point-icon">{p.icon}</div>
                      <div className="lp-realtime-point-text"><h4>{p.title}</h4><p>{p.desc}</p></div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Order Engine ────────────────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-container">
          <FadeUp>
            <div className="lp-text-center">
              <div className="lp-label" style={{justifyContent:"center"}}><Icons.Shield/> Order Engine</div>
              <h2 className="lp-section-h2">Institutional execution.<br/>For every market condition.</h2>
              <p className="lp-section-sub centered">All order types execute server-side and survive network drops.</p>
            </div>
          </FadeUp>
          <div className="lp-orders-grid">
            {[
              {icon:<Icons.TrendingUp/>,title:"Market & Limit Orders",   desc:"Full lifecycle with fill tracking, partial fills, and real-time status via WebSocket push.",tag:"INSTANT FILL"},
              {icon:<Icons.Shield/>,    title:"OCO Bracket Orders",      desc:"Take-profit and stop-loss as a single atomic pair. When one leg fills, the other cancels automatically.",tag:"ONE-CANCELS-OTHER"},
              {icon:<Icons.Activity/>,  title:"Trailing Stop",           desc:"Stop slides with favorable price movement. Configure in ticks or percent. Never miss a breakout.",tag:"ADAPTIVE"},
            ].map((o,i)=>(
              <FadeUp key={o.title} delay={i*100}>
                <div className="lp-order-card">
                  <div className="lp-order-card-icon">{o.icon}</div>
                  <h4>{o.title}</h4>
                  <p>{o.desc}</p>
                  <span className="lp-order-tag">{o.tag}</span>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Technology ──────────────────────────────────────────────────────── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <FadeUp>
            <div className="lp-text-center">
              <div className="lp-label" style={{justifyContent:"center"}}><Icons.Cpu/> Technology</div>
              <h2 className="lp-section-h2">Built on the fastest stack<br/>in market data.</h2>
            </div>
          </FadeUp>
          <div className="lp-tech-grid">
            {[
              {icon:<Icons.Database/>, name:"TimescaleDB",      desc:"Hypertable tick storage with continuous footprint and OHLCV aggregates"},
              {icon:<Icons.Activity/>, name:"NYSE + NASDAQ L2", desc:"Native Level 2 feeds from major exchanges, sub-millisecond delivery"},
              {icon:<Icons.Zap/>,      name:"Redis PubSub",     desc:"Fan-out to all subscribers in under 1ms across all data channels"},
              {icon:<Icons.Code/>,     name:"Go + Chi",         desc:"Zero-overhead HTTP router with goroutine-per-connection model"},
              {icon:<Icons.Shield/>,   name:"JWT + HMAC",       desc:"Short-lived access tokens with HMAC-signed, scoped API keys"},
              {icon:<Icons.BarChart2/>,name:"TradingView v5",   desc:"60fps WebGL-accelerated charts via lightweight-charts v5"},
              {icon:<Icons.Layers/>,   name:"React + Vite",     desc:"Instant HMR dev, tree-shaken bundle, multi-panel layout engine"},
              {icon:<Icons.Lock/>,     name:"TOTP MFA",         desc:"AES-256-GCM encrypted TOTP seed storage, MFA tiered by plan"},
            ].map((t,i)=>(
              <FadeUp key={t.name} delay={i*40}>
                <div className="lp-tech-item">
                  <div className="lp-tech-item-icon">{t.icon}</div>
                  <div className="lp-tech-name">{t.name}</div>
                  <div className="lp-tech-desc">{t.desc}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-container">
          <FadeUp>
            <div className="lp-text-center">
              <div className="lp-label" style={{justifyContent:"center"}}><Icons.Star/> Traders</div>
              <h2 className="lp-section-h2">Trusted by professional traders.</h2>
            </div>
          </FadeUp>
          <div className="lp-testimonials-grid">
            {[
              {
                quote:"The Bookmap heatmap changed how I read liquidity entirely. Watching bid walls form and dissolve in real time gave me context I simply didn't have on any other platform. My win rate improved measurably in the first month.",
                name:"Marcus Chen", role:"Prop Desk Trader · Chicago", avatar:"MC", color:"#6366f1",
              },
              {
                quote:"Footprint charts were always locked behind expensive desktop software. Having them live-streamed via API alongside dark pool prints means my algo can actually react to institutional order flow for the first time.",
                name:"Priya Rajan", role:"Quant Developer · London", avatar:"PR", color:"#8b5cf6",
              },
              {
                quote:"The GEX levels and options sweep detector together are absurdly useful on expiry days. I can see exactly where dealer hedging creates gravity on SPY and position around it. Nothing else I've used comes close.",
                name:"Oliver Westbrook", role:"Options Trader · New York", avatar:"OW", color:"#22c55e",
              },
            ].map((t,i)=>(
              <FadeUp key={t.name} delay={i*80}>
                <div className="lp-testimonial-card">
                  <div className="lp-testimonial-stars">{[...Array(5)].map((_,j)=><Icons.Star key={j}/>)}</div>
                  <p className="lp-testimonial-quote">"{t.quote}"</p>
                  <div className="lp-testimonial-author">
                    <div className="lp-testimonial-avatar" style={{background:t.color}}>{t.avatar}</div>
                    <div>
                      <div className="lp-testimonial-name">{t.name}</div>
                      <div className="lp-testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="lp-section lp-section-alt" id="pricing">
        <div className="lp-container">
          <FadeUp>
            <div className="lp-text-center">
              <div className="lp-label" style={{justifyContent:"center"}}><Icons.Zap/> Pricing</div>
              <h2 className="lp-section-h2">Simple, transparent pricing.</h2>
              <p className="lp-section-sub centered">Start free. Unlock the full institutional toolkit when you're ready.</p>
            </div>
          </FadeUp>
          <div className="lp-pricing-grid">
            <FadeUp delay={0}>
              <div className="lp-price-card">
                <div className="lp-price-tier">Starter</div>
                <div className="lp-price-amount"><span className="lp-price-currency">$</span><span className="lp-price-num">0</span><span className="lp-price-period">/mo</span></div>
                <p className="lp-price-sub">Free forever. No card needed.</p>
                <div className="lp-price-divider"/>
                <div className="lp-price-features">
                  {["Live data (5 symbols)","Candlestick + Volume charts","Market & limit orders","5 API calls / second","WebSocket (1 connection)"].map(f=>(<div key={f} className="lp-price-feat"><Icons.Check color="var(--lp-green)"/>{f}</div>))}
                  {["Footprint & Bookmap","Dark pool & options flow","Smart money indicators"].map(f=>(<div key={f} className="lp-price-feat dim"><Icons.Check color="var(--lp-text3)"/>{f}</div>))}
                </div>
                <Link to="/signup"><button className="lp-price-cta lp-price-cta-ghost">Get started free</button></Link>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <div className="lp-price-card featured">
                <div className="lp-price-badge">MOST POPULAR</div>
                <div className="lp-price-tier">Pro</div>
                <div className="lp-price-amount"><span className="lp-price-currency">$</span><span className="lp-price-num">79</span><span className="lp-price-period">/mo</span></div>
                <p className="lp-price-sub">The full institutional chart suite.</p>
                <div className="lp-price-divider"/>
                <div className="lp-price-features">
                  {["Live data · all 240+ symbols","Bookmap order flow heatmap","Footprint candlestick charts","Level 2 + Volume Profile","Dark pool & options sweeps","Gamma exposure (GEX) levels","OCO bracket + trailing stops","50 API calls / second","Multi-layout (up to 6 panels)"].map(f=>(<div key={f} className="lp-price-feat"><Icons.Check color="var(--lp-accent)"/>{f}</div>))}
                </div>
                <Link to="/signup"><button className="lp-price-cta lp-price-cta-primary">Start Pro trial</button></Link>
              </div>
            </FadeUp>
            <FadeUp delay={160}>
              <div className="lp-price-card">
                <div className="lp-price-tier">Institutional</div>
                <div className="lp-price-amount"><span className="lp-price-num" style={{fontSize:36}}>Custom</span></div>
                <p className="lp-price-sub">For funds, desks, and algos at scale.</p>
                <div className="lp-price-divider"/>
                <div className="lp-price-features">
                  {["Everything in Pro","Unlimited API throughput","Dedicated WebSocket cluster","SLA 99.99% uptime guarantee","Raw tick + footprint export","COT data integration","Dedicated account manager","SOC 2 / compliance reports"].map(f=>(<div key={f} className="lp-price-feat"><Icons.Check color="var(--lp-text3)"/>{f}</div>))}
                </div>
                <button className="lp-price-cta lp-price-cta-ghost">Contact sales</button>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="lp-cta-section">
        <div className="lp-container lp-cta-inner">
          <FadeUp>
            <h2 className="lp-cta-h2">Trade with the same data<br/>hedge funds pay millions for.</h2>
            <p className="lp-cta-sub">Bookmap, footprint, dark pool, GEX — the full institutional picture, starting free.</p>
            <div className="lp-cta-actions">
              <Link to="/signup" className="lp-btn lp-btn-primary lp-btn-lg">Create free account <Icons.ArrowRight/></Link>
              <a href="#api" className="lp-btn lp-btn-outline lp-btn-lg">Read the docs</a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <a href="/" className="lp-logo"><div className="lp-logo-icon"><Icons.LogoMark/></div>Meridian</a>
              <p>Institutional-grade market analysis for professional traders. Bookmap, footprint, dark pool, and smart money intelligence — real-time.</p>
            </div>
            {([
              {
                heading:"Platform",
                links:[
                  {label:"Markets",      to:"#features"},
                  {label:"Charts",       to:"#charts"},
                  {label:"Smart Money",  to:"#smart-money"},
                  {label:"Order Types",  to:"#api"},
                  {label:"Pricing",      to:"#pricing"},
                ],
              },
              {
                heading:"Developers",
                links:[
                  {label:"API Docs",        to:"/api-docs"},
                  {label:"REST Reference",  to:"/api-docs"},
                  {label:"WebSocket Guide", to:"/api-docs"},
                  {label:"SDK — Python",    to:"/api-docs"},
                  {label:"System Status",   to:"/status"},
                ],
              },
              {
                heading:"Company",
                links:[
                  {label:"About",    to:"/about"},
                  {label:"Security", to:"/security"},
                  {label:"Privacy",  to:"/privacy"},
                  {label:"Terms",    to:"/terms"},
                  {label:"Status",   to:"/status"},
                ],
              },
            ] as const).map(col=>(
              <div key={col.heading} className="lp-footer-col">
                <h5>{col.heading}</h5>
                <ul>{col.links.map(l=>(
                  <li key={l.label}>
                    {l.to.startsWith("/") ? <Link to={l.to}>{l.label}</Link> : <a href={l.to}>{l.label}</a>}
                  </li>
                ))}</ul>
              </div>
            ))}
          </div>
          <div className="lp-footer-bottom">
            <span>© 2026 Meridian Technologies, Inc. All rights reserved.</span>
            <div className="lp-footer-socials">
              {[{Icon:Icons.Twitter,label:"Twitter"},{Icon:Icons.Github,label:"GitHub"},{Icon:Icons.Discord,label:"Discord"}].map(({Icon,label})=>(
                <button key={label} className="lp-footer-social" aria-label={label}><Icon/></button>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
