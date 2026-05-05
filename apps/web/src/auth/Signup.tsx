import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./store";

export default function Signup() {
  const navigate = useNavigate();
  const setTokens = useAuth((s) => s.setTokens);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.signup(email, password);
      const res = await api.login(email, password);
      // newly-signed-up users have no MFA, so login returns tokens directly.
      if (res.access_token && res.refresh_token) {
        setTokens(res as Required<typeof res>);
        navigate("/", { replace: true });
      } else {
        throw new Error("unexpected login response");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h1>Create account</h1>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} required autoFocus
                 onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password (12+ chars)</label>
          <input type="password" value={password} required minLength={12}
                 onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="error">{err}</div>}
        <button disabled={busy}>{busy ? "Creating..." : "Create account"}</button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
