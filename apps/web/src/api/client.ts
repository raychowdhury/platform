import { getAuth, useAuth } from "../auth/store";
import type {
  Account,
  Candle,
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
    }).then((r) => asJSON<TokenPair>(r)),

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
};
