import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AdminAuditRow, AdminUser } from "../api/types";

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AdminAuditRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadUsers() {
    setErr(null);
    try { setUsers(await api.adminListUsers(q, 100)); } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  async function loadAudit() {
    try { setAudit(await api.adminListAudit(50)); } catch { /* ignore */ }
  }

  useEffect(() => { loadUsers(); loadAudit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function freeze(u: AdminUser) {
    const reason = window.prompt(`Freeze ${u.email}? Enter reason:`) ?? "";
    if (reason === "" && !window.confirm("freeze without reason?")) return;
    setBusy(u.id);
    try { await api.adminFreezeUser(u.id, reason); setMsg(`froze ${u.email}`); await loadUsers(); await loadAudit(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }
  async function unfreeze(u: AdminUser) {
    const reason = window.prompt(`Unfreeze ${u.email}? Enter reason:`) ?? "";
    setBusy(u.id);
    try { await api.adminUnfreezeUser(u.id, reason); setMsg(`unfroze ${u.email}`); await loadUsers(); await loadAudit(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }
  async function adjust(u: AdminUser) {
    const deltaStr = window.prompt(`Adjust balance for ${u.email} (+ or − amount):`);
    if (!deltaStr) return;
    const delta = parseFloat(deltaStr);
    if (!isFinite(delta) || delta === 0) { setErr("invalid delta"); return; }
    const reason = window.prompt("Reason:") ?? "";
    setBusy(u.id);
    try {
      const { balance } = await api.adminAdjustBalance(u.id, delta, reason);
      setMsg(`${u.email}: ${delta > 0 ? "+" : ""}${delta} → ${balance.toFixed(2)}`);
      await loadUsers(); await loadAudit();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  return (
    <div className="plans-page">
      <header className="plans-header">
        <strong>Admin</strong>
        <span className="spacer" />
        <Link to="/" className="link">← back</Link>
      </header>

      <div style={{ padding: "12px 24px" }}>
        {err && <div className="error">{err}</div>}
        {msg && <div className="muted small">{msg}</div>}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input placeholder="search by email…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, maxWidth: 320 }} />
          <button onClick={loadUsers} style={{ width: "auto" }}>search</button>
        </div>

        <table className="oms-table">
          <thead>
            <tr>
              <th>Email</th><th>Role</th><th>Status</th><th>Balance</th><th>Locked</th><th>Created</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td className={u.status === "active" ? "" : "down"}>{u.status}</td>
                <td>{u.balance.toFixed(2)}</td>
                <td>{u.locked.toFixed(2)}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  {u.status === "active"
                    ? <button className="link" disabled={busy === u.id} onClick={() => freeze(u)}>freeze</button>
                    : <button className="link" disabled={busy === u.id} onClick={() => unfreeze(u)}>unfreeze</button>}
                  {" · "}
                  <button className="link" disabled={busy === u.id} onClick={() => adjust(u)}>adjust</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ marginTop: 32 }}>Recent admin audit</h3>
        <table className="oms-table">
          <thead>
            <tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Metadata</th></tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.created_at).toLocaleString()}</td>
                <td>{a.actor_id.slice(0, 8)}</td>
                <td>{a.action}</td>
                <td>{a.target_id?.slice(0, 8) ?? "—"}</td>
                <td><code style={{ fontSize: 11 }}>{a.metadata ? JSON.stringify(a.metadata) : "—"}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
