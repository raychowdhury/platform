import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ApiKey, ApiKeyCreated } from "../api/types";

const SCOPE_OPTIONS: { value: string; label: string }[] = [
  { value: "read",  label: "read"  },
  { value: "trade", label: "trade" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(() => new Set(["read"]));
  const [ipList, setIpList] = useState("");
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    try { setKeys(await api.listApiKeys()); } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => { reload(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const ips = ipList.split(",").map((s) => s.trim()).filter(Boolean);
      const k = await api.createApiKey({
        name,
        scopes: Array.from(scopes),
        ip_allowlist: ips.length > 0 ? ips : undefined,
      });
      setCreated(k);
      setName("");
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function revoke(k: ApiKey) {
    if (!window.confirm(`Revoke "${k.name}" (${k.prefix}...)? This cannot be undone.`)) return;
    try { await api.revokeApiKey(k.id); await reload(); } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  function toggleScope(s: string) {
    setScopes((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s); else next.add(s);
      if (next.size === 0) next.add("read");
      return next;
    });
  }

  return (
    <div className="plans-page">
      <header className="plans-header">
        <strong>API keys</strong>
        <span className="spacer" />
        <Link to="/" className="link">← back</Link>
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        {err && <div className="error">{err}</div>}

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-title">Create new key</div>
          <form onSubmit={submit}>
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. trading bot" required />
            </div>
            <div className="field">
              <label>Scopes</label>
              <div className="seg">
                {SCOPE_OPTIONS.map((s) => (
                  <button key={s.value} type="button"
                          className={scopes.has(s.value) ? "seg-on" : ""}
                          onClick={() => toggleScope(s.value)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>IP allowlist (comma-separated, optional)</label>
              <input value={ipList} onChange={(e) => setIpList(e.target.value)} placeholder="1.2.3.4, 5.6.7.8" />
            </div>
            <button disabled={busy || !name}>{busy ? "creating..." : "Create key"}</button>
          </form>
        </div>

        {created && (
          <div className="panel" style={{ marginBottom: 16, borderColor: "var(--accent)" }}>
            <div className="panel-title">New key — copy now (won't be shown again)</div>
            <pre style={{ background: "var(--bg)", padding: 12, fontSize: 13, wordBreak: "break-all" }}>{created.secret}</pre>
            <button className="link" onClick={() => setCreated(null)}>dismiss</button>
          </div>
        )}

        <div className="panel">
          <div className="panel-title">Existing keys</div>
          {keys.length === 0 ? (
            <div className="muted small empty">no keys</div>
          ) : (
            <table className="oms-table">
              <thead>
                <tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last used</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td><code style={{ fontSize: 12 }}>{k.prefix}…</code></td>
                    <td>{k.scopes.join(", ")}</td>
                    <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</td>
                    <td className={k.revoked_at ? "down" : "up"}>{k.revoked_at ? "revoked" : "active"}</td>
                    <td>{!k.revoked_at && <button className="link" onClick={() => revoke(k)}>revoke</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
