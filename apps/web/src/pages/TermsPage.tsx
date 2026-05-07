import { Link } from "react-router-dom";
import "../auth/auth.css";

const LogoMark = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export default function TermsPage() {
  return (
    <div className="pub-root">
      <nav className="pub-nav">
        <div className="pub-nav-inner">
          <Link to="/" className="pub-logo">
            <div className="pub-logo-icon"><LogoMark/></div>
            Meridian
          </Link>
          <div className="pub-nav-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/security">Security</Link>
          </div>
          <Link to="/signup"><button className="pub-btn">Get started</button></Link>
        </div>
      </nav>

      <div className="pub-container">
        <div className="pub-label">Legal</div>
        <h1 className="pub-h1">Terms of Service</h1>
        <p className="pub-updated">Last updated: May 1, 2026</p>
        <p className="pub-lead">
          These Terms of Service govern your use of Meridian Technologies, Inc. ("Meridian", "we", "us")
          products and services, including our web platform, API, and data feeds.
        </p>

        <div className="pub-h2">1. Acceptance of Terms</div>
        <p className="pub-p">
          By creating an account or accessing any Meridian service, you agree to these Terms and our
          Privacy Policy. If you do not agree, do not use the platform. Use of the platform by persons
          under 18 is not permitted.
        </p>

        <div className="pub-h2">2. Description of Service</div>
        <p className="pub-p">
          Meridian provides market data visualization, order flow analytics, and order execution
          infrastructure for equity and futures markets. The platform is provided as-is for informational
          and analytical purposes. Meridian is not a registered broker-dealer, investment adviser,
          or financial planner. Nothing on the platform constitutes financial advice.
        </p>

        <div className="pub-h2">3. Account Responsibilities</div>
        <p className="pub-p">You are responsible for:</p>
        <ul className="pub-ul">
          <li>Maintaining the confidentiality of your credentials and API keys.</li>
          <li>All activity that occurs under your account.</li>
          <li>Notifying us immediately at security@meridian.io if you suspect unauthorized access.</li>
          <li>Ensuring your use complies with applicable laws in your jurisdiction.</li>
        </ul>

        <div className="pub-h2">4. API Usage</div>
        <p className="pub-p">
          API usage is subject to the rate limits associated with your plan tier. You may not resell,
          sublicense, or redistribute raw market data received via the Meridian API without a separate
          data redistribution agreement. Automated strategies must comply with applicable exchange rules.
        </p>
        <p className="pub-p">
          We reserve the right to throttle or suspend API access that causes disproportionate load,
          violates rate limits, or is used in a manner inconsistent with these Terms.
        </p>

        <div className="pub-h2">5. Order Execution</div>
        <p className="pub-p">
          Orders placed through Meridian are routed to your connected broker account. Meridian does
          not hold or custody funds. We are not responsible for losses arising from order execution,
          slippage, partial fills, or broker outages. You assume all financial risk associated with
          trading activity.
        </p>

        <div className="pub-h2">6. Market Data</div>
        <p className="pub-p">
          Real-time market data is provided under license from NYSE, NASDAQ, and CME Group. Use of
          market data is restricted to your personal analysis. Redistribution, retransmission, or
          commercial use of raw data feeds without exchange approval is prohibited and may result in
          immediate account termination.
        </p>

        <div className="pub-h2">7. Prohibited Conduct</div>
        <p className="pub-p">You may not use Meridian to:</p>
        <ul className="pub-ul">
          <li>Engage in market manipulation, wash trading, or spoofing.</li>
          <li>Circumvent rate limits through credential sharing or distributed access.</li>
          <li>Reverse-engineer proprietary platform components or data processing systems.</li>
          <li>Violate any applicable securities, commodities, or exchange rules.</li>
        </ul>

        <div className="pub-h2">8. Intellectual Property</div>
        <p className="pub-p">
          All platform code, visual design, proprietary indicators, and documentation are the intellectual
          property of Meridian Technologies, Inc. Nothing in these Terms grants you a license to use our
          trademarks, logos, or brand assets without written permission.
        </p>

        <div className="pub-h2">9. Disclaimers and Limitation of Liability</div>
        <p className="pub-p">
          THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT
          PERMITTED BY LAW, MERIDIAN SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR TRADING LOSSES, ARISING
          FROM YOUR USE OF THE PLATFORM.
        </p>

        <div className="pub-h2">10. Termination</div>
        <p className="pub-p">
          We may suspend or terminate your account at any time for violation of these Terms. You may
          close your account at any time from your account settings. Upon termination, your right to
          access the platform ceases immediately. Data deletion follows our Privacy Policy retention schedule.
        </p>

        <div className="pub-h2">11. Changes to Terms</div>
        <p className="pub-p">
          We may update these Terms at any time. We will notify you via email or in-platform notice
          at least 14 days before material changes take effect. Continued use after the effective date
          constitutes acceptance of the revised Terms.
        </p>

        <div className="pub-h2">12. Governing Law</div>
        <p className="pub-p">
          These Terms are governed by the laws of the State of New York, without regard to conflict
          of law principles. Any disputes shall be resolved in the federal or state courts located
          in New York County.
        </p>

        <div className="pub-divider"/>
        <p className="pub-p" style={{fontSize:13}}>
          Questions about these Terms? Contact <a href="mailto:legal@meridian.io">legal@meridian.io</a>.
        </p>
      </div>
    </div>
  );
}
