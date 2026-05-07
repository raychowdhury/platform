import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./store";
import "./auth.css";

type Step = "email" | "password" | "mfa";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022"/>
    <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00"/>
    <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF"/>
    <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/>
  </svg>
);

const LogoMark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const setTokens = useAuth((s) => s.setTokens);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  function continueEmail(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.includes("@")) { setErr("Enter a valid email address."); return; }
    setStep("password");
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api.login(email, password);
      if (res.requires_mfa && res.mfa_token) {
        setMfaToken(res.mfa_token);
        setStep("mfa");
        return;
      }
      if (res.access_token && res.refresh_token) {
        setTokens(res as Required<typeof res>);
        navigate("/app", { replace: true });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign-in failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMFA(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setErr(null);
    setBusy(true);
    try {
      const tok = await api.loginMFA(mfaToken, code);
      setTokens(tok);
      navigate("/app", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Invalid code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-root">
      {/* ── Brand panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-noise"/>
        <Link to="/" className="auth-brand-logo">
          <div className="auth-brand-logo-icon"><LogoMark/></div>
          Meridian
        </Link>

        <div className="auth-brand-body">
          <h2 className="auth-brand-h2">Institutional intelligence.<br/>For every trader.</h2>
          <p className="auth-brand-sub">
            Bookmap order flow, footprint candlesticks, dark pool prints, and gamma
            exposure — the tools hedge funds pay millions for, at your fingertips.
          </p>
          <div className="auth-brand-points">
            {[
              { title:"Real-time Level 2 & Footprint",   desc:"Bid × ask at every price level, live." },
              { title:"Dark Pool & Options Flow",         desc:"Off-exchange prints streamed as they print." },
              { title:"Smart Money Indicators",           desc:"GEX, order blocks, CVD, and sweeps." },
            ].map(p => (
              <div key={p.title} className="auth-brand-point">
                <div className="auth-brand-point-dot"><CheckIcon/></div>
                <div className="auth-brand-point-text">
                  <h5>{p.title}</h5>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-brand-quote">
          <p>"The Bookmap heatmap changed how I read liquidity entirely. My win rate improved measurably in the first month."</p>
          <div className="auth-brand-quote-author">
            <div className="auth-brand-quote-avatar">MC</div>
            <div>
              <div className="auth-brand-quote-name">Marcus Chen</div>
              <div className="auth-brand-quote-role">Prop Desk Trader · Chicago</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-box">

          {step === "email" && (
            <>
              <div className="auth-step-label">Step 1 of 2</div>
              <h1>Welcome back</h1>
              <p className="auth-box-sub">Sign in to your Meridian account.</p>

              <div className="auth-oauth">
                <button className="auth-oauth-btn" onClick={() => window.location.href = "/api/auth/google"}>
                  <GoogleIcon/> Continue with Google
                </button>
                <button className="auth-oauth-btn" onClick={() => window.location.href = "/api/auth/microsoft"}>
                  <MicrosoftIcon/> Continue with Microsoft
                </button>
              </div>

              <div className="auth-divider">or continue with email</div>

              <form onSubmit={continueEmail}>
                <div className="auth-field">
                  <label htmlFor="email">Email address</label>
                  <input id="email" className="auth-input" type="email" value={email} required autoFocus
                         placeholder="you@example.com"
                         onChange={(e) => setEmail(e.target.value)} />
                </div>
                {err && <div className="auth-error">{err}</div>}
                <button className="auth-submit">Continue</button>
              </form>

              <div className="auth-footer-link">
                No account? <Link to="/signup">Create one free</Link>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              <button className="auth-back" onClick={() => { setStep("email"); setPassword(""); setErr(null); }}>
                ← {email}
              </button>
              <div className="auth-step-label">Step 2 of 2</div>
              <h1>Enter your password</h1>
              <p className="auth-box-sub">Signing in as <strong style={{color:"#fafafa"}}>{email}</strong></p>

              <form onSubmit={submitPassword}>
                <div className="auth-field">
                  <div className="auth-field-header">
                    <label htmlFor="password">Password</label>
                    <Link to="/forgot-password" className="auth-field-link">Forgot password?</Link>
                  </div>
                  <input id="password" className="auth-input" type="password" value={password} required minLength={12} autoFocus
                         placeholder="Your password"
                         onChange={(e) => setPassword(e.target.value)} />
                </div>
                {err && <div className="auth-error">{err}</div>}
                <button className="auth-submit" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          )}

          {step === "mfa" && (
            <>
              <button className="auth-back" onClick={() => { setStep("password"); setMfaToken(null); setCode(""); setErr(null); }}>
                ← Back
              </button>
              <h1>Two-factor verification</h1>
              <p className="auth-box-sub">
                Enter the 6-digit code from your authenticator app, or a recovery code.
              </p>

              <form onSubmit={submitMFA}>
                <div className="auth-field">
                  <label htmlFor="mfa-code">Authentication code</label>
                  <input id="mfa-code" className="auth-input" value={code} onChange={(e) => setCode(e.target.value)}
                         autoFocus required inputMode="numeric" autoComplete="one-time-code"
                         placeholder="000 000" style={{letterSpacing:"0.2em", fontSize:20, textAlign:"center"}}/>
                </div>
                {err && <div className="auth-error">{err}</div>}
                <button className="auth-submit" disabled={busy || code.length < 6}>
                  {busy ? "Verifying…" : "Verify"}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
