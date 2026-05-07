import { Link } from "react-router-dom";
import "../auth/auth.css";

const LogoMark = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const TEAM = [
  { initials:"AK", name:"Alex Kim",       role:"CEO & Co-founder",           color:"#6366f1" },
  { initials:"SR", name:"Sofia Reyes",    role:"CTO & Co-founder",           color:"#8b5cf6" },
  { initials:"JT", name:"James Turner",   role:"Head of Market Data",        color:"#22c55e" },
  { initials:"NP", name:"Nora Park",      role:"Head of Product",            color:"#f59e0b" },
  { initials:"DW", name:"Daniel Wu",      role:"Lead Infrastructure Eng.",   color:"#06b6d4" },
  { initials:"EM", name:"Elena Moreau",   role:"Head of Quant Research",     color:"#ec4899" },
];

const STATS = [
  { num:"2022",   label:"Founded" },
  { num:"$12T+",  label:"Daily flow tracked" },
  { num:"<1ms",   label:"Tick latency" },
  { num:"99.99%", label:"Uptime SLA" },
];

export default function AboutPage() {
  return (
    <div className="pub-root">
      <nav className="pub-nav">
        <div className="pub-nav-inner">
          <Link to="/" className="pub-logo">
            <div className="pub-logo-icon"><LogoMark/></div>
            Meridian
          </Link>
          <div className="pub-nav-links">
            <Link to="/">Home</Link>
            <Link to="/status">Status</Link>
            <Link to="/api-docs">API</Link>
          </div>
          <Link to="/signup"><button className="pub-btn">Get started</button></Link>
        </div>
      </nav>

      <div className="pub-container">
        <div className="pub-label">About</div>
        <h1 className="pub-h1">Built by traders,<br/>for traders.</h1>
        <p className="pub-lead">
          Meridian was founded in 2022 by a team of prop desk traders and quant engineers
          who were frustrated that institutional-grade market tools — Bookmap, footprint charts,
          dark pool feeds — were locked behind six-figure Bloomberg terminals or clunky
          desktop apps. We built the platform we wished existed.
        </p>

        <div className="about-stat-grid">
          {STATS.map(s => (
            <div key={s.label} className="about-stat">
              <div className="about-stat-num">{s.num}</div>
              <div className="about-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="pub-divider"/>

        <div className="pub-h2">Our mission</div>
        <p className="pub-p">
          Democratize institutional market intelligence. The same order flow data, dark pool
          prints, and gamma exposure models that hedge funds spend millions sourcing — accessible
          via a clean API and a 60fps web terminal, starting free.
        </p>
        <p className="pub-p">
          We are exchange-feed-first. Every tick flows from NYSE, NASDAQ, and CME Globex
          directly into our pipeline — no third-party data aggregators, no delayed tapes.
          If a large resting bid forms in the SPY order book, you see it in under a millisecond.
        </p>

        <div className="pub-divider"/>

        <div className="pub-h2">The team</div>
        <p className="pub-p">
          We're a small, focused team of engineers, traders, and data scientists based in
          New York, Chicago, and London.
        </p>

        <div className="about-team">
          {TEAM.map(m => (
            <div key={m.name} className="about-team-card">
              <div className="about-avatar" style={{background: m.color}}>{m.initials}</div>
              <div className="about-name">{m.name}</div>
              <div className="about-role">{m.role}</div>
            </div>
          ))}
        </div>

        <div className="pub-divider"/>

        <div className="pub-h2">How we're built</div>
        <p className="pub-p">
          Our stack prioritizes raw throughput: native exchange connections over TCP, tick
          data stored in TimescaleDB hypertables, footprint aggregation computed in Go
          micro-services, and fan-out via Redis PubSub to WebSocket sessions. The web terminal
          runs on React with WebGL-accelerated charts via TradingView's lightweight-charts v5.
        </p>
        <p className="pub-p">
          Security is built in, not bolted on: JWT access tokens with 15-minute expiry,
          HMAC-signed API keys with per-scope permissions, AES-256-GCM TOTP seed storage,
          and MFA tiered by plan. We're working toward SOC 2 Type II.
        </p>

        <div className="pub-divider"/>
        <p className="pub-p" style={{fontSize:13}}>
          Questions? Reach us at <a href="mailto:hello@meridian.io">hello@meridian.io</a>.
        </p>
      </div>
    </div>
  );
}
