import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { MFASetupResponse, MFAStatus } from "../api/types";

type EnrollStep = "intro" | "scan" | "code1" | "code2" | "done";

export default function MfaPage() {
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [setup, setSetup] = useState<MFASetupResponse | null>(null);
  const [enrollStep, setEnrollStep] = useState<EnrollStep>("intro");
  const [code1, setCode1] = useState("");
  const [code2, setCode2] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [recoveryAck, setRecoveryAck] = useState(false);

  async function reload() {
    try { setStatus(await api.mfaStatus()); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { reload(); }, []);

  async function startSetup() {
    setErr(null); setBusy(true);
    try {
      const s = await api.mfaSetup();
      setSetup(s);
      setEnrollStep("scan");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  function nextFromScan() {
    if (!recoveryAck) { setErr("Confirm you saved your recovery codes first."); return; }
    setErr(null);
    setEnrollStep("code1");
  }

  function nextFromCode1() {
    setErr(null);
    if (!/^\d{6}$/.test(code1)) { setErr("Enter the current 6-digit code."); return; }
    setMsg("Wait for your authenticator to advance to the next code (~30s), then enter it below.");
    setEnrollStep("code2");
  }

  async function confirmEnroll() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (!/^\d{6}$/.test(code2)) throw new Error("Enter the next 6-digit code.");
      if (code2 === code1) throw new Error("Same code — wait for it to roll over.");
      // Backend takes one code; the second proves the secret was saved + clock is in sync.
      await api.mfaEnable(code2);
      setSetup(null);
      setCode1(""); setCode2("");
      setRecoveryAck(false);
      setEnrollStep("done");
      setMsg("Authenticator enabled. Sign-in now requires a code.");
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Invalid code.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      await api.mfaDisable(disableCode);
      setDisableCode("");
      setMsg("Authenticator disabled.");
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Invalid code.");
    } finally { setBusy(false); }
  }

  const totpOn = !!status?.enabled;

  return (
    <div className="plans-page">
      <header className="plans-header">
        <strong>Two-factor authentication</strong>
        <span className="spacer" />
        <Link to="/" className="link">← back</Link>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
        <p className="muted small">
          Layer security factors. Each tier strengthens the one before it. Save this setup
          somewhere safe — losing every factor means losing your account.
        </p>

        {err && <div className="error">{err}</div>}
        {msg && !err && <div className="muted small">{msg}</div>}

        <div className="mfa-tiers">
          <div className="mfa-tier locked">
            <div className="mfa-tier-rank">L1</div>
            <div className="mfa-tier-body">
              <div className="mfa-tier-name">SMS / Email code</div>
              <div className="mfa-tier-desc">Weakest factor. Vulnerable to SIM-swap. Coming soon.</div>
              <span className="mfa-tier-status">unavailable</span>
            </div>
          </div>

          <div className={`mfa-tier ${totpOn ? "active" : ""}`}>
            <div className="mfa-tier-rank">L2</div>
            <div className="mfa-tier-body">
              <div className="mfa-tier-name">Authenticator app (TOTP)</div>
              <div className="mfa-tier-desc">Six-digit codes from Google Authenticator, 1Password, Authy, etc.</div>
              <span className={`mfa-tier-status ${totpOn ? "on" : ""}`}>
                {totpOn ? "enabled" : status?.pending ? "pending" : "off"}
              </span>
              {!totpOn && !setup && (
                <div style={{ marginTop: 8 }}>
                  <button className="mfa-tier-action" onClick={startSetup} disabled={busy}>
                    {busy ? "Generating…" : "Set up"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mfa-tier locked">
            <div className="mfa-tier-rank">L3</div>
            <div className="mfa-tier-body">
              <div className="mfa-tier-name">Security key (WebAuthn)</div>
              <div className="mfa-tier-desc">Hardware key (YubiKey, Touch ID). Strongest factor — phishing-resistant. Coming soon.</div>
              <span className="mfa-tier-status">unavailable</span>
            </div>
          </div>
        </div>

        {setup && (
          <div className="panel" style={{ marginTop: 20 }}>
            <div className="panel-title">Enroll authenticator</div>

            <div className="mfa-enroll-step">
              <span className={`dot ${enrollStep === "scan" ? "active" : "done"}`}>1</span>
              <span>Scan + save</span>
              <span className={`dot ${enrollStep === "code1" ? "active" : enrollStep === "scan" ? "" : "done"}`}>2</span>
              <span>First code</span>
              <span className={`dot ${enrollStep === "code2" ? "active" : ""}`}>3</span>
              <span>Next code</span>
            </div>

            {enrollStep === "scan" && (
              <>
                <p className="muted small">
                  Open your authenticator app and scan, or paste the secret manually.
                </p>
                <div className="mfa-warn">
                  Do not press Continue until your app shows a code for this account.
                </div>
                <div style={{ marginBottom: 8 }} className="muted small">otpauth URL</div>
                <div className="mfa-secret">{setup.otpauth_url}</div>
                <div style={{ margin: "10px 0 6px" }} className="muted small">Manual key</div>
                <div className="mfa-secret">{setup.secret}</div>

                <details style={{ marginTop: 12 }}>
                  <summary className="muted small">Recovery codes — save these now (shown once)</summary>
                  <pre style={{ background: "var(--bg)", padding: 10, marginTop: 6, borderRadius: 4, fontSize: 12 }}>
                    {setup.recovery_codes.join("\n")}
                  </pre>
                </details>

                <label className="muted small" style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
                  <input type="checkbox" checked={recoveryAck} onChange={(e) => setRecoveryAck(e.target.checked)} />
                  I saved my recovery codes in a safe place.
                </label>

                <button onClick={nextFromScan} disabled={busy}>Continue</button>
              </>
            )}

            {enrollStep === "code1" && (
              <>
                <p className="muted small">Enter the current 6-digit code your app shows.</p>
                <div className="field">
                  <label>Current code</label>
                  <input value={code1} onChange={(e) => setCode1(e.target.value)} autoFocus
                         inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
                </div>
                <button onClick={nextFromCode1} disabled={busy || !code1}>Continue</button>
              </>
            )}

            {enrollStep === "code2" && (
              <>
                <p className="muted small">
                  Wait for the code to refresh, then enter the next one. This proves the secret
                  was saved correctly and your device clock is in sync.
                </p>
                <div className="field">
                  <label>Next code</label>
                  <input value={code2} onChange={(e) => setCode2(e.target.value)} autoFocus
                         inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
                </div>
                <button onClick={confirmEnroll} disabled={busy || !code2}>
                  {busy ? "Verifying…" : "Enable authenticator"}
                </button>
              </>
            )}
          </div>
        )}

        {totpOn && (
          <div className="panel" style={{ marginTop: 20 }}>
            <div className="panel-title">Disable authenticator</div>
            <div className="mfa-warn">
              Disabling 2FA weakens your account. Only do this if you are about to switch
              to a different device.
            </div>
            <div className="field">
              <label>Current code or recovery code</label>
              <input value={disableCode} onChange={(e) => setDisableCode(e.target.value)}
                     inputMode="numeric" autoComplete="one-time-code" />
            </div>
            <button onClick={disable} disabled={busy || !disableCode} className="btn-sell">
              {busy ? "…" : "Disable"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
