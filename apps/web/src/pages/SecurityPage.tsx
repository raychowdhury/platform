import { Link } from "react-router-dom";
import "../auth/auth.css";

const LogoMark = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const icons: Record<string, JSX.Element> = {
  shield: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  lock:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  key:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  eye:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  server: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  zap:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};

const CARDS = [
  {
    icon: "lock",
    title: "JWT Authentication",
    body: "Short-lived access tokens (15-minute expiry) with refresh token rotation. Tokens are signed with RS256 and validated on every request. Sessions auto-expire and cannot be reused after logout.",
  },
  {
    icon: "key",
    title: "HMAC API Keys",
    body: "Scoped API keys with read, trade, and admin permission tiers. Keys are HMAC-SHA256 signed and can be restricted to specific IP allowlists. Rotate without any downtime.",
  },
  {
    icon: "shield",
    title: "TOTP Two-Factor Auth",
    body: "Time-based one-time passwords per RFC 6238. TOTP seeds are encrypted at rest with AES-256-GCM. Recovery codes are hashed with bcrypt. MFA is enforced on Pro and Institutional plans.",
  },
  {
    icon: "eye",
    title: "Encryption in Transit & at Rest",
    body: "All connections use TLS 1.3 with HSTS preloading. Database fields containing credentials and seeds are encrypted at the application layer before being written to disk.",
  },
  {
    icon: "server",
    title: "Infrastructure Isolation",
    body: "Market data ingestion, order execution, and client API services run in isolated processes with no shared state except Redis PubSub. A failure in one subsystem cannot cascade to others.",
  },
  {
    icon: "zap",
    title: "Rate Limiting & Abuse Detection",
    body: "Per-key rate limits enforced at the edge. Adaptive throttling on authentication endpoints. Automated lockout after repeated failed login attempts with CAPTCHA escalation.",
  },
];

export default function SecurityPage() {
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
            <Link to="/status">Status</Link>
          </div>
          <Link to="/signup"><button className="pub-btn">Get started</button></Link>
        </div>
      </nav>

      <div className="pub-container">
        <div className="pub-label">Security</div>
        <h1 className="pub-h1">Security at Meridian</h1>
        <p className="pub-lead">
          Our platform handles sensitive financial data and real-money order execution.
          Security is not a feature we add — it is how the system is architected from the ground up.
        </p>

        <div className="security-grid">
          {CARDS.map(c => (
            <div key={c.title} className="security-card">
              <div className="security-card-icon">{icons[c.icon]}</div>
              <h4>{c.title}</h4>
              <p>{c.body}</p>
            </div>
          ))}
        </div>

        <div className="pub-divider"/>

        <div className="pub-h2">SOC 2 Compliance</div>
        <p className="pub-p">
          We are currently working toward SOC 2 Type II certification, with an audit period
          beginning Q3 2026. Our controls are mapped to the Trust Services Criteria for
          Security, Availability, and Confidentiality. Institutional customers can request
          our current controls documentation under NDA.
        </p>

        <div className="pub-h2">Responsible Disclosure</div>
        <p className="pub-p">
          We operate a responsible disclosure program. If you discover a security vulnerability,
          please report it to <a href="mailto:security@meridian.io">security@meridian.io</a> before
          public disclosure. We aim to acknowledge reports within 24 hours and resolve critical
          issues within 72 hours. We do not pursue legal action against good-faith researchers.
        </p>

        <div className="pub-h2">Data Retention</div>
        <p className="pub-p">
          Tick data is retained for 7 years in compressed TimescaleDB hypertables. Account
          credentials and MFA seeds are deleted within 30 days of account closure. API keys
          are invalidated immediately upon revocation and cannot be recovered.
        </p>

        <div className="pub-divider"/>
        <p className="pub-p" style={{fontSize:13}}>
          Security questions: <a href="mailto:security@meridian.io">security@meridian.io</a>.
          For compliance reports contact <a href="mailto:compliance@meridian.io">compliance@meridian.io</a>.
        </p>
      </div>
    </div>
  );
}
