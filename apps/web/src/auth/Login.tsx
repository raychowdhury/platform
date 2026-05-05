import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./store";

export default function Login() {
  const navigate = useNavigate();
  const setTokens = useAuth((s) => s.setTokens);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api.login(email, password);
      if (res.requires_mfa && res.mfa_token) {
        setMfaToken(res.mfa_token);
        return;
      }
      if (res.access_token && res.refresh_token) {
        setTokens(res as Required<typeof res>);
        navigate("/", { replace: true });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onMFA(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setErr(null);
    setBusy(true);
    try {
      const tok = await api.loginMFA(mfaToken, code);
      setTokens(tok);
      navigate("/", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "invalid code");
    } finally {
      setBusy(false);
    }
  }

  if (mfaToken) {
    return (
      <div className="container">
        <h1>Two-factor code</h1>
        <p className="muted">Enter the 6-digit code from your authenticator app, or a recovery code.</p>
        <form onSubmit={onMFA}>
          <div className="field">
            <label>Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
          </div>
          {err && <div className="error">{err}</div>}
          <button disabled={busy}>{busy ? "Verifying..." : "Verify"}</button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          <button type="button" className="link" onClick={() => { setMfaToken(null); setCode(""); }}>
            ← back to email
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Log in</h1>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} required autoFocus
                 onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} required minLength={12}
                 onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="error">{err}</div>}
        <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        No account? <Link to="/signup">Create one</Link>
      </p>
    </div>
  );
}
