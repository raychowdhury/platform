// Thin API client. Mirrors the REST contract used by apps/web. Keeps a
// runtime-mutable base URL: real builds set it via app.json extra or env;
// the dev path uses a host-resolvable address so the simulator can reach
// the local API.
const DEFAULT_BASE = "http://localhost:8080";

export const api = {
  base: DEFAULT_BASE,

  setBase(url: string) { api.base = url.replace(/\/$/, ""); },

  async login(email: string, password: string): Promise<{ access: string; refresh: string }> {
    const r = await fetch(`${api.base}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error(`login ${r.status}`);
    const j = await r.json();
    return { access: j.access_token, refresh: j.refresh_token };
  },

  async account(token: string): Promise<{ balance: number; locked: number; available: number }> {
    const r = await fetch(`${api.base}/v1/account`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`account ${r.status}`);
    return r.json();
  },

  async symbols(): Promise<Array<{ symbol: string }>> {
    const r = await fetch(`${api.base}/v1/market/symbols`);
    if (!r.ok) throw new Error(`symbols ${r.status}`);
    return r.json();
  },
};
