import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./store";

type Step = "email" | "password";

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
    if (!email.includes("@")) { setErr("Enter a valid email."); return; }
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
        navigate("/", { replace: true });
      } else {
        throw new Error("Unexpected login response.");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  }

  const pwStrong = password.length >= 12;

  return (
    <div className="container">
      <h1>Create account</h1>

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
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={submit}>
          <div className="auth-step-meta">
            <button type="button" className="crumb-back" onClick={() => { setStep("email"); setPassword(""); setErr(null); }}>
              ← {email}
            </button>
          </div>
          <div className="field">
            <label>Password (12+ characters)</label>
            <input type="password" value={password} required minLength={12} autoFocus
                   onChange={(e) => setPassword(e.target.value)} />
            <span className="muted small" style={{ marginTop: 4, display: "block" }}>
              {pwStrong ? "Length looks good." : `${Math.max(0, 12 - password.length)} more to go.`}
            </span>
          </div>
          {err && <div className="error">{err}</div>}
          <button disabled={busy || !pwStrong}>{busy ? "Creating…" : "Create account"}</button>
        </form>
      )}
    </div>
  );
}
