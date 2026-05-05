import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { MFASetupResponse, MFAStatus } from "../api/types";

export default function MfaPage() {
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [setup, setSetup] = useState<MFASetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    try {
      setStatus(await api.mfaStatus());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => { reload(); }, []);

  async function startSetup() {
    setErr(null); setBusy(true);
    try {
      const s = await api.mfaSetup();
      setSetup(s);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function confirm() {
    setErr(null); setBusy(true);
    try {
      await api.mfaEnable(code);
      setSetup(null);
      setCode("");
      setMsg("MFA enabled.");
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "invalid code");
    } finally { setBusy(false); }
  }

  async function disable() {
    setErr(null); setBusy(true);
    try {
      await api.mfaDisable(code);
      setCode("");
      setMsg("MFA disabled.");
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "invalid code");
    } finally { setBusy(false); }
  }

  return (
    <div className="plans-page">
      <header className="plans-header">
        <strong>Two-factor authentication</strong>
        <span className="spacer" />
        <Link to="/" className="link">← back</Link>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
        <p className="muted small">
          Status: {status == null ? "—" : status.enabled ? "ENABLED" : status.pending ? "PENDING" : "DISABLED"}
        </p>

        {err && <div className="error">{err}</div>}
        {msg && <div className="muted small">{msg}</div>}

        {!status?.enabled && !setup && (
          <button onClick={startSetup} disabled={busy}>
            {busy ? "Generating..." : "Set up authenticator"}
          </button>
        )}

        {setup && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-title">Scan or paste in your authenticator app</div>
            <div className="muted small" style={{ wordBreak: "break-all", marginBottom: 8 }}>
              <strong>Secret:</strong> {setup.secret}
            </div>
            <div className="muted small" style={{ wordBreak: "break-all", marginBottom: 8 }}>
              <strong>otpauth URL:</strong> {setup.otpauth_url}
            </div>
            <details>
              <summary className="muted small">Recovery codes (save now — shown once)</summary>
              <pre style={{ background: "var(--bg)", padding: 8, marginTop: 4 }}>
                {setup.recovery_codes.join("\n")}
              </pre>
            </details>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Enter current 6-digit code to confirm</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            </div>
            <button onClick={confirm} disabled={busy || !code}>
              {busy ? "Verifying..." : "Enable"}
            </button>
          </div>
        )}

        {status?.enabled && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-title">Disable MFA</div>
            <div className="field">
              <label>Current 6-digit or recovery code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <button onClick={disable} disabled={busy || !code} className="btn-sell">
              {busy ? "..." : "Disable"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
