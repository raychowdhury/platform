import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
// Aliased — the global DOM type `Notification` shadows our app type.
import type { Notification as AppNotification } from "../api/types";

interface Props {
  // refreshTrigger increments whenever an external WS event hints that
  // there may be new notifications (e.g. alert_triggered push).
  refreshTrigger: number;
}

export default function NotificationsBell({ refreshTrigger }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const { unread } = await api.unreadCount();
      setUnread(unread);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshList = useCallback(async () => {
    try {
      setItems(await api.listNotifications(50));
    } catch {
      /* ignore */
    }
  }, []);

  // poll count every 30s as a safety net (WS push handles the realtime case)
  useEffect(() => {
    refreshCount();
    const t = window.setInterval(refreshCount, 30_000);
    return () => window.clearInterval(t);
  }, [refreshCount]);

  // bump on external events (alert WS push hooks this)
  useEffect(() => {
    refreshCount();
    if (open) refreshList();
  }, [refreshTrigger, open, refreshCount, refreshList]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await refreshList();
  }

  async function markOne(id: number) {
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try { await api.markNotificationRead(id); } catch { /* ignore */ }
  }

  async function markAll() {
    setItems((cur) => cur.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    setUnread(0);
    try { await api.markAllNotificationsRead(); } catch { /* ignore */ }
  }

  return (
    <div ref={containerRef} className="bell">
      <button onClick={toggle} title="Notifications" className="bell-btn">
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="bell-pop">
          <div className="bell-head">
            <strong>Notifications</strong>
            <span className="spacer" />
            {unread > 0 && <button className="link" onClick={markAll}>mark all read</button>}
          </div>
          {items.length === 0 ? (
            <div className="muted small empty">no notifications</div>
          ) : (
            <ul className="bell-list">
              {items.map((n) => (
                <li key={n.id} className={n.read_at ? "read" : "unread"} onClick={() => !n.read_at && markOne(n.id)}>
                  <div className="bell-title">{n.title}</div>
                  {n.body && <div className="bell-body">{n.body}</div>}
                  <div className="bell-time muted small">{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
