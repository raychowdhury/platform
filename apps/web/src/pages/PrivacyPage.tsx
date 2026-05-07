import { Link } from "react-router-dom";
import "../auth/auth.css";

const LogoMark = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export default function PrivacyPage() {
  return (
    <div className="pub-root">
      <nav className="pub-nav">
        <div className="pub-nav-inner">
          <Link to="/" className="pub-logo">
            <div className="pub-logo-icon"><LogoMark/></div>
            Meridian
          </Link>
          <div className="pub-nav-links">
            <Link to="/terms">Terms</Link>
            <Link to="/security">Security</Link>
          </div>
          <Link to="/signup"><button className="pub-btn">Get started</button></Link>
        </div>
      </nav>

      <div className="pub-container">
        <div className="pub-label">Legal</div>
        <h1 className="pub-h1">Privacy Policy</h1>
        <p className="pub-updated">Last updated: May 1, 2026</p>
        <p className="pub-lead">
          This Privacy Policy explains how Meridian Technologies, Inc. collects, uses, and
          protects your personal information when you use our platform.
        </p>

        <div className="pub-h2">1. Information We Collect</div>
        <div className="pub-h3">Account information</div>
        <p className="pub-p">
          When you create an account: email address, password hash (bcrypt), and optionally
          a display name. If you sign in via Google or Microsoft, we receive your name and
          email from the OAuth provider — no password is stored on our side.
        </p>
        <div className="pub-h3">Usage data</div>
        <p className="pub-p">
          We log API requests (timestamp, endpoint, response code, latency) and WebSocket
          session events for security monitoring, rate limit enforcement, and debugging.
          Individual tick-level data you view is not linked to your identity in logs.
        </p>
        <div className="pub-h3">Payment information</div>
        <p className="pub-p">
          Billing is processed by Stripe. We store only a Stripe customer ID and subscription
          status — never raw card numbers or banking details.
        </p>

        <div className="pub-h2">2. How We Use Your Information</div>
        <ul className="pub-ul">
          <li>Authenticate your identity and protect your account.</li>
          <li>Deliver market data, WebSocket streams, and order execution.</li>
          <li>Calculate and enforce plan-based rate limits.</li>
          <li>Send transactional emails: password resets, billing receipts, security alerts.</li>
          <li>Monitor for abuse, unauthorized access, and terms violations.</li>
          <li>Improve platform performance and reliability.</li>
        </ul>
        <p className="pub-p">
          We do not sell your personal information. We do not use your trading activity to
          train machine learning models, nor share it with any third party for advertising.
        </p>

        <div className="pub-h2">3. Data Sharing</div>
        <p className="pub-p">We share data only with:</p>
        <ul className="pub-ul">
          <li><strong style={{color:"#fafafa"}}>Stripe</strong> — payment processing.</li>
          <li><strong style={{color:"#fafafa"}}>AWS / Cloudflare</strong> — infrastructure hosting and DDoS mitigation.</li>
          <li><strong style={{color:"#fafafa"}}>Exchange operators</strong> — required for data licensing compliance (aggregate usage, not individual identity).</li>
          <li><strong style={{color:"#fafafa"}}>Law enforcement</strong> — only when required by valid legal process.</li>
        </ul>

        <div className="pub-h2">4. Data Retention</div>
        <p className="pub-p">
          Account data is retained for the life of your account plus 30 days after closure.
          API request logs are retained for 90 days. Tick data (market feed) is retained for
          7 years in TimescaleDB for historical analysis functionality. You may request
          deletion of your personal data at any time — see Section 7.
        </p>

        <div className="pub-h2">5. Cookies</div>
        <p className="pub-p">
          We use strictly necessary cookies for session management (HttpOnly, Secure flags set).
          We do not use advertising, tracking, or analytics cookies. We do not use third-party
          pixel tracking.
        </p>

        <div className="pub-h2">6. Security</div>
        <p className="pub-p">
          See our <Link to="/security">Security page</Link> for a full description of our
          technical controls. All data is encrypted in transit (TLS 1.3) and sensitive fields
          are encrypted at rest (AES-256-GCM).
        </p>

        <div className="pub-h2">7. Your Rights</div>
        <p className="pub-p">Depending on your jurisdiction, you may have the right to:</p>
        <ul className="pub-ul">
          <li>Access a copy of your personal data.</li>
          <li>Correct inaccurate information.</li>
          <li>Request deletion of your personal data.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Data portability (export of your account and API usage data).</li>
        </ul>
        <p className="pub-p">
          Submit requests to <a href="mailto:privacy@meridian.io">privacy@meridian.io</a>.
          We respond within 30 days. EU/UK residents may also lodge a complaint with their
          local supervisory authority.
        </p>

        <div className="pub-h2">8. International Transfers</div>
        <p className="pub-p">
          Our servers are located in the United States. If you access the platform from the
          EU or UK, your data is transferred to the US under Standard Contractual Clauses
          (SCCs). By using the platform, you acknowledge this transfer.
        </p>

        <div className="pub-h2">9. Changes to This Policy</div>
        <p className="pub-p">
          We will notify you via email at least 14 days before material changes to this policy.
          The updated policy will be effective from the date shown at the top of this page.
        </p>

        <div className="pub-divider"/>
        <p className="pub-p" style={{fontSize:13}}>
          Privacy questions: <a href="mailto:privacy@meridian.io">privacy@meridian.io</a>.
          DPA requests: <a href="mailto:dpa@meridian.io">dpa@meridian.io</a>.
        </p>
      </div>
    </div>
  );
}
