// API client with auto-refresh: stores access + refresh tokens, retries
// any 401 once after rotating the pair, and persists the new pair to
// SecureStore. Single in-flight refresh is serialized via refreshing.
import { clearAuth, loadAuth, saveAuth } from "./storage";

const DEFAULT_BASE = "http://localhost:8080";

interface State {
  base: string;
  access: string | null;
  refresh: string | null;
}

const state: State = { base: DEFAULT_BASE, access: null, refresh: null };
let refreshing: Promise<void> | null = null;

async function persist() {
  if (state.access && state.refresh) {
    await saveAuth({ access: state.access, refresh: state.refresh, base: state.base });
  }
}

async function rotate(): Promise<void> {
  if (!state.refresh) throw new Error("no refresh token");
  // Single-flight: if a refresh is already running, wait for it.
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const r = await fetch(`${state.base}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: state.refresh }),
    });
    if (!r.ok) {
      await clearAuth();
      state.access = null;
      state.refresh = null;
      throw new Error(`refresh ${r.status}`);
    }
    const j = await r.json();
    state.access = j.access_token;
    state.refresh = j.refresh_token;
    await persist();
  })();
  try { await refreshing; } finally { refreshing = null; }
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (state.access) headers.set("Authorization", `Bearer ${state.access}`);
  let r = await fetch(`${state.base}${path}`, { ...init, headers });
  if (r.status !== 401 || !state.refresh) return r;
  // 401 with a refresh on hand → rotate and retry once.
  try {
    await rotate();
  } catch {
    return r;
  }
  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("Authorization", `Bearer ${state.access}`);
  r = await fetch(`${state.base}${path}`, { ...init, headers: retryHeaders });
  return r;
}

export const api = {
  get base() { return state.base; },
  setBase(url: string) { state.base = url.replace(/\/$/, ""); },
  isAuthed() { return !!state.access; },

  // Hydrate from secure storage. Caller routes to home if hydrated.
  async hydrate(): Promise<boolean> {
    const a = await loadAuth();
    if (!a) return false;
    state.access = a.access;
    state.refresh = a.refresh;
    if (a.base) state.base = a.base;
    return true;
  },

  async login(email: string, password: string): Promise<void> {
    const r = await fetch(`${state.base}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error(`login ${r.status}`);
    const j = await r.json();
    state.access = j.access_token;
    state.refresh = j.refresh_token;
    await persist();
  },

  async logout(): Promise<void> {
    if (state.refresh) {
      // Best-effort revoke; ignore errors.
      try {
        await authedFetch("/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: state.refresh }),
        });
      } catch { /* ignore */ }
    }
    state.access = null;
    state.refresh = null;
    await clearAuth();
  },

  async account(): Promise<{ balance: number; locked: number; available: number }> {
    const r = await authedFetch("/v1/account");
    if (!r.ok) throw new Error(`account ${r.status}`);
    return r.json();
  },

  async symbols(): Promise<Array<{ symbol: string }>> {
    const r = await fetch(`${state.base}/v1/market/symbols`);
    if (!r.ok) throw new Error(`symbols ${r.status}`);
    return r.json();
  },

  async orders(limit = 50): Promise<Order[]> {
    const r = await authedFetch(`/v1/orders?limit=${limit}`);
    if (!r.ok) throw new Error(`orders ${r.status}`);
    return r.json();
  },

  async placeOrder(p: {
    symbol: string; side: "buy" | "sell"; type: "market" | "limit";
    qty: string; limit_price?: string;
  }): Promise<Order> {
    const r = await authedFetch("/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!r.ok) throw new Error(`place ${r.status}: ${await r.text()}`);
    return r.json();
  },

  async cancelOrder(id: string): Promise<void> {
    const r = await authedFetch(`/v1/orders/${id}`, { method: "DELETE" });
    if (!r.ok && r.status !== 200) throw new Error(`cancel ${r.status}`);
  },

  async alerts(): Promise<Alert[]> {
    const r = await authedFetch("/v1/alerts/");
    if (!r.ok) throw new Error(`alerts ${r.status}`);
    return r.json();
  },

  async createAlert(p: {
    symbol: string; condition: "price_above" | "price_below"; threshold: number;
  }): Promise<Alert> {
    const r = await authedFetch("/v1/alerts/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!r.ok) throw new Error(`alert ${r.status}: ${await r.text()}`);
    return r.json();
  },

  async deleteAlert(id: string): Promise<void> {
    const r = await authedFetch(`/v1/alerts/${id}`, { method: "DELETE" });
    if (!r.ok && r.status !== 204) throw new Error(`delete ${r.status}`);
  },

  async notifications(limit = 50): Promise<Notification[]> {
    const r = await authedFetch(`/v1/notifications/?limit=${limit}`);
    if (!r.ok) throw new Error(`notif ${r.status}`);
    return r.json();
  },

  async unreadCount(): Promise<number> {
    const r = await authedFetch("/v1/notifications/unread_count");
    if (!r.ok) return 0;
    const j = await r.json();
    return j.unread ?? 0;
  },

  async markRead(id: number): Promise<void> {
    await authedFetch(`/v1/notifications/${id}/read`, { method: "POST" });
  },

  async markAllRead(): Promise<void> {
    await authedFetch("/v1/notifications/read_all", { method: "POST" });
  },
};

export interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop_market";
  qty: number;
  filled_qty: number;
  limit_price?: number;
  avg_fill_price?: number;
  status: string;
  created_at: string;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: "price_above" | "price_below";
  threshold: number;
  status: "active" | "triggered" | "cancelled";
  triggered_at?: string;
  triggered_price?: number;
  created_at: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body?: string;
  read_at?: string;
  created_at: string;
}
