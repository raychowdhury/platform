import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import "./auth.css";

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.includes("@")) { setErr("Enter a valid email address."); return; }
    setBusy(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setErr("Something went wrong. Please try again.");
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
          <h2 className="auth-brand-h2">Account recovery is simple and secure.</h2>
          <p className="auth-brand-sub">
            Enter your email and we'll send a secure reset link. The link expires in 15 minutes
            and can only be used once.
          </p>
          <div className="auth-brand-points">
            {[
              { title:"Secure reset link",   desc:"One-time link expires in 15 minutes." },
              { title:"No account revealed", desc:"We respond the same whether or not the email exists." },
              { title:"MFA preserved",       desc:"Two-factor settings remain active after reset." },
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
          <p>"Recovery was instant and painless. Back trading in under two minutes."</p>
          <div className="auth-brand-quote-author">
            <div className="auth-brand-quote-avatar" style={{background:"#22c55e"}}>OW</div>
            <div>
              <div className="auth-brand-quote-name">Oliver Westbrook</div>
              <div className="auth-brand-quote-role">Options Trader · New York</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-box">
          {sent ? (
            <>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1>Check your inbox</h1>
              <p className="auth-box-sub">
                If <strong style={{color:"#fafafa"}}>{email}</strong> is associated with a Meridian account,
                you'll receive a password reset link within a few minutes.
              </p>
              <p className="auth-box-sub" style={{marginTop: -16}}>
                Check your spam folder if you don't see it.
              </p>
              <div className="auth-footer-link" style={{marginTop: 32}}>
                <Link to="/login">← Back to sign in</Link>
              </div>
            </>
          ) : (
            <>
              <h1>Reset your password</h1>
              <p className="auth-box-sub">Enter your email and we'll send a reset link.</p>

              <form onSubmit={submit}>
                <div className="auth-field">
                  <label htmlFor="email">Email address</label>
                  <input id="email" className="auth-input" type="email" value={email} required autoFocus
                         placeholder="you@example.com"
                         onChange={(e) => setEmail(e.target.value)} />
                </div>
                {err && <div className="auth-error">{err}</div>}
                <button className="auth-submit" disabled={busy}>
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <div className="auth-footer-link">
                Remembered it? <Link to="/login">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
