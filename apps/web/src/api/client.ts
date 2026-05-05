import { getAuth, useAuth } from "../auth/store";
import type {
  Account,
  Alert,
  AlertCreateRequest,
  Candle,
  Layout,
  LayoutSaveRequest,
  LoginResponse,
  MFASetupResponse,
  MFAStatus,
  Notification as AppNotification,
  Order,
  PlaceOrderRequest,
  Plan,
  Position,
  Subscription,
  Symbol as SymbolMeta,
  TokenPair,
  User,
} from "./types";

const BASE = ""; // same-origin via Vite proxy / nginx pass-through

let refreshing: Promise<TokenPair | null> | null = null;

async function refreshTokens(): Promise<TokenPair | null> {
  const { refresh } = getAuth();
  if (!refresh) return null;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) return null;
        const tok = (await res.json()) as TokenPair;
        useAuth.getState().setTokens(tok);
        return tok;
      } catch {
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { access } = getAuth();
  const headers = new Headers(init.headers);
  if (access) headers.set("Authorization", `Bearer ${access}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let res = await fetch(`${BASE}${input}`, { ...init, headers });
  if (res.status === 401 && access) {
    const tok = await refreshTokens();
    if (tok) {
      headers.set("Authorization", `Bearer ${tok.access_token}`);
      res = await fetch(`${BASE}${input}`, { ...init, headers });
    } else {
      useAuth.getState().clear();
    }
  }
  return res;
}

async function asJSON<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  signup: (email: string, password: string) =>
    fetch(`${BASE}/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then((r) => asJSON<{ user_id: string; email: string; verification_token?: string }>(r)),

  login: (email: string, password: string) =>
    fetch(`${BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then((r) => asJSON<LoginResponse>(r)),

  loginMFA: (mfa_token: string, code: string) =>
    fetch(`${BASE}/v1/auth/login/mfa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfa_token, code }),
    }).then((r) => asJSON<TokenPair>(r)),

  mfaStatus: () => authedFetch(`/v1/me/mfa`).then((r) => asJSON<MFAStatus>(r)),
  mfaSetup:  () =>
    authedFetch(`/v1/me/mfa/totp/setup`, { method: "POST" }).then((r) => asJSON<MFASetupResponse>(r)),
  mfaEnable: (code: string) =>
    authedFetch(`/v1/me/mfa/totp/enable`, { method: "POST", body: JSON.stringify({ code }) })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); }),
  mfaDisable: (code: string) =>
    authedFetch(`/v1/me/mfa/totp/disable`, { method: "POST", body: JSON.stringify({ code }) })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); }),

  logout: async () => {
    const { refresh } = getAuth();
    await authedFetch(`/v1/auth/logout`, {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    });
    useAuth.getState().clear();
  },

  me: () => authedFetch(`/v1/me/`).then((r) => asJSON<User>(r)),

  symbols: () => authedFetch(`/v1/market/symbols`).then((r) => asJSON<SymbolMeta[]>(r)),

  candles: (symbol: string, tf: string, from?: Date, to?: Date, limit = 500) => {
    const q = new URLSearchParams({ symbol, tf, limit: String(limit) });
    if (from) q.set("from", from.toISOString());
    if (to) q.set("to", to.toISOString());
    return authedFetch(`/v1/market/candles?${q}`).then((r) => asJSON<Candle[]>(r));
  },

  account: () => authedFetch(`/v1/account`).then((r) => asJSON<Account>(r)),

  positions: () => authedFetch(`/v1/positions`).then((r) => asJSON<Position[]>(r)),

  orders: (status?: string, limit = 50) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (status) q.set("status", status);
    return authedFetch(`/v1/orders?${q}`).then((r) => asJSON<Order[]>(r));
  },

  placeOrder: (req: PlaceOrderRequest) =>
    authedFetch(`/v1/orders`, {
      method: "POST",
      body: JSON.stringify(req),
    }).then((r) => asJSON<Order>(r)),

  cancelOrder: (id: string) =>
    authedFetch(`/v1/orders/${id}`, { method: "DELETE" }).then((r) => asJSON<Order>(r)),

  listPlans: () => authedFetch(`/v1/plans`).then((r) => asJSON<Plan[]>(r)),

  mySubscription: () =>
    authedFetch(`/v1/billing/subscription`).then((r) => asJSON<Subscription>(r)),

  // Returns subscription on success; in Stripe-enabled mode returns 501 because
  // the Stripe SDK wiring is intentionally a placeholder. The UI surfaces that.
  upgradePlan: (plan: string) =>
    authedFetch(`/v1/billing/upgrade`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    }).then((r) => asJSON<Subscription>(r)),

  listAlerts: () => authedFetch(`/v1/alerts/`).then((r) => asJSON<Alert[]>(r)),
  createAlert: (req: AlertCreateRequest) =>
    authedFetch(`/v1/alerts/`, { method: "POST", body: JSON.stringify(req) }).then((r) => asJSON<Alert>(r)),
  deleteAlert: (id: string) =>
    authedFetch(`/v1/alerts/${id}`, { method: "DELETE" })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); }),

  listNotifications: (limit = 50) =>
    authedFetch(`/v1/notifications/?limit=${limit}`).then((r) => asJSON<AppNotification[]>(r)),
  unreadCount: () =>
    authedFetch(`/v1/notifications/unread_count`).then((r) => asJSON<{ unread: number }>(r)),
  markNotificationRead: (id: number) =>
    authedFetch(`/v1/notifications/${id}/read`, { method: "POST" })
      .then((r) => { if (!r.ok && r.status !== 204) throw new Error(`${r.status}`); }),
  markAllNotificationsRead: () =>
    authedFetch(`/v1/notifications/read_all`, { method: "POST" })
      .then((r) => asJSON<{ updated: number }>(r)),

  listLayouts: () => authedFetch(`/v1/layouts/`).then((r) => asJSON<Layout[]>(r)),
  getLayout: (id: string) => authedFetch(`/v1/layouts/${id}`).then((r) => asJSON<Layout>(r)),
  createLayout: (req: LayoutSaveRequest) =>
    authedFetch(`/v1/layouts/`, { method: "POST", body: JSON.stringify(req) }).then((r) => asJSON<Layout>(r)),
  updateLayout: (id: string, req: LayoutSaveRequest) =>
    authedFetch(`/v1/layouts/${id}`, { method: "PUT", body: JSON.stringify(req) }).then((r) => asJSON<Layout>(r)),
  deleteLayout: (id: string) =>
    authedFetch(`/v1/layouts/${id}`, { method: "DELETE" })
      .then((r) => { if (!r.ok && r.status !== 204) throw new Error(`${r.status}`); }),
};
