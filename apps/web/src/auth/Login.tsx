import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./store";

type Step = "email" | "password" | "mfa";

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
    if (!email.includes("@")) { setErr("Enter a valid email."); return; }
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
        navigate("/", { replace: true });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign-in failed.");
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
      navigate("/", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h1>Sign in</h1>

      {step === "email" && (
        <form onSubmit={continueEmail}>
          <div className="auth-step-meta"><span className="crumb">1 of 2</span> Identify yourself</div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} required autoFocus
                   onChange={(e) => setEmail(e.target.value)} />
          </div>
          {err && <div className="error">{err}</div>}
          <button>Continue</button>
          <p className="muted" style={{ marginTop: 16 }}>
            No account? <Link to="/signup">Create one</Link>
          </p>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={submitPassword}>
          <div className="auth-step-meta">
            <button type="button" className="crumb-back" onClick={() => { setStep("email"); setPassword(""); setErr(null); }}>
              ← {email}
            </button>
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} required minLength={12} autoFocus
                   onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="error">{err}</div>}
          <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      )}

      {step === "mfa" && (
        <form onSubmit={submitMFA}>
          <div className="auth-step-meta">
            <button type="button" className="crumb-back" onClick={() => { setStep("password"); setMfaToken(null); setCode(""); setErr(null); }}>
              ← back
            </button>
          </div>
          <h2 style={{ margin: "8px 0 4px", fontSize: 16 }}>Two-factor code</h2>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Enter the 6-digit code from your authenticator app, or a recovery code.
          </p>
          <div className="field">
            <label>Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus required
                   inputMode="numeric" autoComplete="one-time-code" />
          </div>
          {err && <div className="error">{err}</div>}
          <button disabled={busy}>{busy ? "Verifying…" : "Verify"}</button>
        </form>
      )}
    </div>
  );
}
