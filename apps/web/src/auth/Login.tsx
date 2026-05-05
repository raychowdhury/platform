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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const tok = await api.login(email, password);
      setTokens(tok);
      navigate("/", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "login failed");
    } finally {
      setBusy(false);
    }
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
