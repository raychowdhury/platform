import { Link } from "react-router-dom";
import "../auth/auth.css";

const LogoMark = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

type StatusLevel = "operational" | "degraded" | "outage";

const SERVICES: { name: string; desc: string; status: StatusLevel }[] = [
  { name: "Market Data — NYSE / NASDAQ L2", desc: "Tick-level order book and trade feed", status: "operational" },
  { name: "Market Data — CME Globex",       desc: "Futures and options tick feed",         status: "operational" },
  { name: "WebSocket Streaming",            desc: "Real-time push to client sessions",      status: "operational" },
  { name: "REST API",                       desc: "HTTP endpoints for data and orders",      status: "operational" },
  { name: "Order Execution Engine",         desc: "Market, limit, OCO, and trailing stops", status: "operational" },
  { name: "Footprint & Bookmap Engine",     desc: "Real-time bid×ask aggregation",          status: "operational" },
  { name: "Dark Pool Feed",                 desc: "Off-exchange print detection",            status: "operational" },
  { name: "Options Flow & GEX",             desc: "Sweep detection and gamma exposure",     status: "operational" },
  { name: "Authentication",                 desc: "Login, MFA, and session management",     status: "operational" },
  { name: "TimescaleDB Storage",            desc: "Historical tick and OHLCV storage",      status: "operational" },
  { name: "Web Application",                desc: "React frontend CDN delivery",             status: "operational" },
];

const HISTORY = [
  {
    date: "2026-04-28",
    title: "Resolved: Elevated WebSocket latency",
    body: "A Redis PubSub misconfiguration caused 3–4× latency spikes on the WebSocket streaming cluster between 09:32–09:51 ET. All sessions reconnected automatically. No data was lost.",
  },
  {
    date: "2026-04-10",
    title: "Resolved: NYSE feed reconnection",
    body: "NYSE SIP feed disconnected briefly during planned exchange maintenance. Reconnected within 47 seconds. No order execution was affected.",
  },
  {
    date: "2026-03-22",
    title: "Scheduled maintenance complete",
    body: "TimescaleDB hypertable recompression and index rebuild completed successfully. Read latency improved by ~18% for historical footprint queries.",
  },
];

const LABEL_TEXT: Record<StatusLevel, string> = {
  operational: "Operational",
  degraded:    "Degraded",
  outage:      "Outage",
};

export default function StatusPage() {
  const allOk = SERVICES.every(s => s.status === "operational");

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
            <Link to="/about">About</Link>
            <Link to="/api-docs">API Docs</Link>
          </div>
          <Link to="/signup"><button className="pub-btn">Get started</button></Link>
        </div>
      </nav>

      <div className="pub-container-wide" style={{maxWidth: 760}}>
        <div className="pub-label">System Status</div>
        <h1 className="pub-h1">Platform Status</h1>
        <p className="pub-lead">
          Real-time health of all Meridian services. Uptime is tracked on a 30-day trailing window.
        </p>

        <div className={`status-header-badge${allOk ? "" : ""}`}
             style={allOk ? {} : {background:"rgba(251,191,36,0.08)", borderColor:"rgba(251,191,36,0.2)", color:"#fbbf24"}}>
          <div className="status-dot"/>
          {allOk ? "All systems operational" : "Some systems degraded"}
        </div>

        <div className="status-grid">
          {SERVICES.map(s => (
            <div key={s.name} className="status-row">
              <div>
                <div className="status-row-name">{s.name}</div>
                <div className="status-row-desc">{s.desc}</div>
              </div>
              <div className={`status-badge ${s.status}`}>
                <div className="status-dot"/>
                {LABEL_TEXT[s.status]}
              </div>
            </div>
          ))}
        </div>

        <div className="pub-h2">Incident History</div>
        <p className="pub-p">Past 90 days. All times are Eastern Time (ET).</p>

        <div className="status-history">
          {HISTORY.map(h => (
            <div key={h.date} className="status-history-item">
              <div className="status-history-dot"/>
              <div>
                <div className="status-history-date">{h.date}</div>
                <div className="status-history-title">{h.title}</div>
                <div className="status-history-body">{h.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="pub-divider"/>
        <p className="pub-p" style={{fontSize:13}}>
          Subscribe to status updates at <a href="mailto:status@meridian.io">status@meridian.io</a>.
          For urgent issues contact <a href="mailto:support@meridian.io">support@meridian.io</a>.
        </p>
      </div>
    </div>
  );
}
