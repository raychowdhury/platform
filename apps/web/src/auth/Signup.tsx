import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./store";
import "./auth.css";

type Step = "email" | "password";

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

export default function Signup() {
  const navigate = useNavigate();
  const setTokens = useAuth((s) => s.setTokens);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function continueEmail(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.includes("@")) { setErr("Enter a valid email address."); return; }
    setStep("password");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.signup(email, password);
      const res = await api.login(email, password);
      if (res.access_token && res.refresh_token) {
        setTokens(res as Required<typeof res>);
        navigate("/app", { replace: true });
      } else {
        throw new Error("Unexpected response after signup.");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign-up failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const pwStrong = password.length >= 12;

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
          <h2 className="auth-brand-h2">Start trading with institutional intelligence.</h2>
          <p className="auth-brand-sub">
            Join thousands of professional traders using Bookmap order flow, footprint
            charts, and smart money data to gain an edge in every session.
          </p>
          <div className="auth-brand-points">
            {[
              { title:"Free forever plan",               desc:"Live data on 5 symbols. No credit card required." },
              { title:"Full chart suite on Pro",         desc:"Bookmap, footprint, Level 2, dark pool, GEX." },
              { title:"API access from day one",         desc:"Every feed available as REST + WebSocket endpoints." },
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
          <p>"Footprint charts were always locked behind expensive desktop software. Having them streamed via API means my algo can react to institutional order flow for the first time."</p>
          <div className="auth-brand-quote-author">
            <div className="auth-brand-quote-avatar" style={{background:"#8b5cf6"}}>PR</div>
            <div>
              <div className="auth-brand-quote-name">Priya Rajan</div>
              <div className="auth-brand-quote-role">Quant Developer · London</div>
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
              <h1>Create your account</h1>
              <p className="auth-box-sub">Free forever. No credit card needed.</p>

              <div className="auth-oauth">
                <button className="auth-oauth-btn" onClick={() => window.location.href = "/api/auth/google"}>
                  <GoogleIcon/> Continue with Google
                </button>
                <button className="auth-oauth-btn" onClick={() => window.location.href = "/api/auth/microsoft"}>
                  <MicrosoftIcon/> Continue with Microsoft
                </button>
              </div>

              <div className="auth-divider">or sign up with email</div>

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
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              <button className="auth-back" onClick={() => { setStep("email"); setPassword(""); setErr(null); }}>
                ← {email}
              </button>
              <div className="auth-step-label">Step 2 of 2</div>
              <h1>Choose a password</h1>
              <p className="auth-box-sub">Use 12 or more characters for a strong password.</p>

              <form onSubmit={submit}>
                <div className="auth-field">
                  <label htmlFor="password">Password</label>
                  <input id="password" className="auth-input" type="password" value={password} required minLength={12} autoFocus
                         placeholder="12+ characters"
                         onChange={(e) => setPassword(e.target.value)} />
                  <div className={`auth-pw-hint${pwStrong ? " ok" : ""}`}>
                    {pwStrong ? "Looks good." : `${Math.max(0, 12 - password.length)} more character${12 - password.length === 1 ? "" : "s"} needed.`}
                  </div>
                </div>
                {err && <div className="auth-error">{err}</div>}
                <button className="auth-submit" disabled={busy || !pwStrong}>
                  {busy ? "Creating account…" : "Create account"}
                </button>
              </form>

              <div className="auth-terms">
                By creating an account you agree to our{" "}
                <Link to="/terms">Terms of Service</Link> and{" "}
                <Link to="/privacy">Privacy Policy</Link>.
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
