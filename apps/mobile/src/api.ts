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
};
