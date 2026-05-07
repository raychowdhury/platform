import { useState } from "react";
import { Link } from "react-router-dom";
import "../auth/auth.css";

const LogoMark = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const ENDPOINTS = [
  {
    id: "auth",
    section: "Authentication",
    items: [
      {
        method: "post" as const,
        path: "/v1/auth/login",
        desc: "Authenticate with email and password. Returns access_token, refresh_token, and requires_mfa if MFA is enabled.",
        example: `POST /v1/auth/login
Content-Type: application/json

{
  "email": "trader@example.com",
  "password": "your-password"
}

// Response
{
  "access_token": "eyJhbGci...",
  "refresh_token": "dGhpcyBp...",
  "expires_in": 900
}`,
      },
      {
        method: "post" as const,
        path: "/v1/auth/mfa",
        desc: "Complete MFA challenge with a TOTP code or recovery code. Returns access and refresh tokens.",
        example: `POST /v1/auth/mfa
Content-Type: application/json

{
  "mfa_token": "mfa_abc123...",
  "code": "847291"
}`,
      },
      {
        method: "post" as const,
        path: "/v1/auth/refresh",
        desc: "Exchange a refresh token for a new access token. Refresh tokens rotate on each use.",
        example: `POST /v1/auth/refresh
Content-Type: application/json

{ "refresh_token": "dGhpcyBp..." }`,
      },
    ],
  },
  {
    id: "market",
    section: "Market Data",
    items: [
      {
        method: "get" as const,
        path: "/v1/market/:symbol/quote",
        desc: "Latest NBBO quote for a symbol. Returns bid, ask, last, volume, and change.",
        example: `GET /v1/market/SPY/quote
Authorization: Bearer <token>

// Response
{
  "symbol": "SPY",
  "bid": 563.40,
  "ask": 563.42,
  "last": 563.41,
  "volume": 98412300,
  "change": 6.57,
  "change_pct": 1.18
}`,
      },
      {
        method: "get" as const,
        path: "/v1/market/:symbol/level2",
        desc: "Full order book snapshot up to 20 levels deep. depth param controls levels returned.",
        example: `GET /v1/market/SPY/level2?depth=5
Authorization: Bearer <token>

// Response
{
  "symbol": "SPY",
  "bids": [
    { "price": 563.40, "size": 1200 },
    { "price": 563.35, "size": 4800 }
  ],
  "asks": [
    { "price": 563.42, "size": 800 },
    { "price": 563.45, "size": 2200 }
  ]
}`,
      },
      {
        method: "get" as const,
        path: "/v1/market/:symbol/footprint",
        desc: "Footprint candle data — bid × ask volume at each price level per bar. Supports multiple timeframes.",
        example: `GET /v1/market/NVDA/footprint?tf=5m&bars=10
Authorization: Bearer <token>

// Response — one candle
{
  "time": 1746400200,
  "levels": [
    { "price": 878.50, "bid": 156, "ask": 67, "poc": true },
    { "price": 878.00, "bid": 89,  "ask": 34, "poc": false }
  ],
  "delta": 341,
  "volume": 12847
}`,
      },
      {
        method: "get" as const,
        path: "/v1/market/:symbol/dark-pool",
        desc: "Recent dark pool prints for a symbol. Filter by min_size to surface block-level prints.",
        example: `GET /v1/market/SPY/dark-pool?min_size=50000
Authorization: Bearer <token>

// Response
[
  {
    "time": 1746401022,
    "price": 563.10,
    "size": 85000,
    "exchange": "FINRA",
    "side": "buy"
  }
]`,
      },
    ],
  },
  {
    id: "stream",
    section: "WebSocket Streaming",
    items: [
      {
        method: "ws" as const,
        path: "wss://api.meridian.io/v1/stream/:token",
        desc: "Persistent WebSocket connection for real-time data. Subscribe to any channel after connecting.",
        example: `// Connect
const ws = new WebSocket(\`wss://api.meridian.io/v1/stream/\${token}\`);

// Subscribe to footprint + Level 2
ws.send(JSON.stringify({
  type: "subscribe",
  channel: "footprint",
  symbols: ["SPY", "NVDA", "QQQ"],
}));

// Receive events
ws.onmessage = ({ data }) => {
  const { type, symbol, levels, delta } = JSON.parse(data);
  // type: "footprint" | "quote" | "level2" | "dark_pool" | "gex"
};`,
      },
    ],
  },
  {
    id: "orders",
    section: "Orders",
    items: [
      {
        method: "post" as const,
        path: "/v1/orders",
        desc: "Place a market, limit, OCO bracket, or trailing stop order. Orders execute server-side and persist across network drops.",
        example: `POST /v1/orders
Authorization: Bearer <token>
Content-Type: application/json

// OCO bracket with trailing stop
{
  "symbol":      "NVDA",
  "side":        "buy",
  "type":        "limit",
  "qty":         100,
  "limit_price": 875.00,
  "take_profit": { "price": 920.00 },
  "stop_loss":   { "trail_pct": 2.5, "trailing": true }
}

// Response
{ "order_id": "ord_xyz", "status": "pending" }`,
      },
      {
        method: "get" as const,
        path: "/v1/orders",
        desc: "List all orders with optional status filter. Returns paginated results.",
        example: `GET /v1/orders?status=open&limit=50
Authorization: Bearer <token>`,
      },
    ],
  },
];

export default function ApiDocsPage() {
  const [active, setActive] = useState("auth");

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
          </div>
          <Link to="/signup"><button className="pub-btn">Get started</button></Link>
        </div>
      </nav>

      <div className="docs-layout">
        {/* Sidebar */}
        <aside className="docs-sidebar">
          <div className="docs-sidebar-section">
            <div className="docs-sidebar-heading">Overview</div>
            <a href="#" className="docs-sidebar-link" onClick={() => setActive("overview")}>Introduction</a>
            <a href="#" className="docs-sidebar-link" onClick={() => setActive("overview")}>Authentication</a>
            <a href="#" className="docs-sidebar-link" onClick={() => setActive("overview")}>Rate Limits</a>
            <a href="#" className="docs-sidebar-link" onClick={() => setActive("overview")}>Errors</a>
          </div>
          {ENDPOINTS.map(s => (
            <div key={s.id} className="docs-sidebar-section">
              <div className="docs-sidebar-heading">{s.section}</div>
              {s.items.map(e => (
                <a key={e.path} href="#"
                   className={`docs-sidebar-link${active === s.id ? " active" : ""}`}
                   onClick={() => setActive(s.id)}>
                  {e.path.split("/").slice(-1)[0] || e.path}
                </a>
              ))}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="docs-content">
          <div className="pub-label">API Reference</div>
          <h1 className="pub-h1" style={{fontSize:32}}>Meridian API</h1>
          <p className="pub-p">
            Base URL: <code style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"#818cf8"}}>https://api.meridian.io</code>
            <br/>All endpoints require a Bearer token unless noted. API keys can be used in place of tokens for server-to-server calls.
          </p>

          <div className="pub-h2" style={{marginTop:8}}>Authentication</div>
          <p className="pub-p">
            Include your access token in every request:{" "}
            <code style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#a1a1aa"}}>Authorization: Bearer &lt;access_token&gt;</code>
            <br/>
            API keys use the same header:{" "}
            <code style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#a1a1aa"}}>Authorization: Bearer pk_live_...</code>
          </p>

          <div className="pub-h2">Rate Limits</div>
          <p className="pub-p">
            Rate limits are enforced per API key and per account tier.
            Limits are returned in response headers: <code style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#a1a1aa"}}>X-RateLimit-Remaining</code>.
          </p>
          <div className="docs-endpoint" style={{marginBottom:32}}>
            <div className="docs-endpoint-body" style={{padding:"12px 20px"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'JetBrains Mono',monospace"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                    <th style={{textAlign:"left",padding:"6px 0",color:"#52525b",fontWeight:600}}>Plan</th>
                    <th style={{textAlign:"left",padding:"6px 0",color:"#52525b",fontWeight:600}}>REST (req/s)</th>
                    <th style={{textAlign:"left",padding:"6px 0",color:"#52525b",fontWeight:600}}>WebSocket</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Starter",     "5",        "1 connection"],
                    ["Pro",         "50",       "10 connections"],
                    ["Institutional","Unlimited","Dedicated cluster"],
                  ].map(([plan,rest,ws]) => (
                    <tr key={plan} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <td style={{padding:"8px 0",color:"#fafafa"}}>{plan}</td>
                      <td style={{padding:"8px 0",color:"#a1a1aa"}}>{rest}</td>
                      <td style={{padding:"8px 0",color:"#a1a1aa"}}>{ws}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {ENDPOINTS.map(section => (
            <div key={section.id}>
              <div className="pub-h2">{section.section}</div>
              {section.items.map(ep => (
                <div key={ep.path} className="docs-endpoint">
                  <div className="docs-endpoint-header">
                    <span className={`docs-method ${ep.method}`}>{ep.method.toUpperCase()}</span>
                    <span className="docs-path">{ep.path}</span>
                  </div>
                  <div className="docs-endpoint-body">
                    <p className="docs-endpoint-desc">{ep.desc}</p>
                    <div className="docs-code">
                      <pre>{ep.example}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="pub-divider"/>
          <p className="pub-p" style={{fontSize:13}}>
            Need help? <a href="mailto:api@meridian.io">api@meridian.io</a> or join our <a href="#">Discord</a>.
          </p>
        </main>
      </div>
    </div>
  );
}
