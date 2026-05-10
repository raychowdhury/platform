// Browser-side API client. NEXT_PUBLIC_API_URL is baked at build time; falls
// back to localhost:8080 for local dev. All endpoints are public (no JWT) for
// the chart's read-only data path.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface ApiCandle {
  time: string; // ISO
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}

export interface ApiSymbol {
  symbol: string;
  exchange: string;
  base: string;
  quote: string;
  status: string;
  tick_size?: number;
  step_size?: number;
  min_qty?: number;
  multiplier?: number;
  asset_class?: "futures" | "spot";
}

export interface ApiSignal {
  symbol: string;
  time: string;
  best_bid: number;
  best_ask: number;
  best_bid_sz: number;
  best_ask_sz: number;
  spread_ticks: number;
  microprice: number;
  book_imb_l1: number;
  book_imb_l5: number;
  sweep_5m: number;
  sweep_5m_pct: number;
  support: number;
  resistance: number;
  stop_long: number;
  stop_short: number;
  liquidity: "good" | "wide" | "thin";
  best_fill_side: "bid" | "ask" | "either";
  micro_lean: number;
  conviction: "long" | "short" | "none" | "split";
  conviction_score: number;
}

// Map chart UI timeframe labels (mixed case) to backend codes (lowercase).
// Hours/days uppercase in UI ("1H", "4H", "1D", "1W") match lowercase on the API.
export function tfToApi(tf: string): string {
  return tf.toLowerCase();
}

export async function fetchSymbols(): Promise<ApiSymbol[]> {
  const r = await fetch(`${API_BASE}/v1/market/symbols`, { cache: "no-store" });
  if (!r.ok) throw new Error(`symbols ${r.status}`);
  return r.json();
}

export async function fetchCandles(
  symbol: string,
  tf: string,
  limit = 500,
): Promise<ApiCandle[]> {
  const q = new URLSearchParams({
    symbol,
    tf: tfToApi(tf),
    limit: String(limit),
  });
  const r = await fetch(`${API_BASE}/v1/market/candles?${q}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`candles ${r.status}`);
  const data = (await r.json()) as ApiCandle[] | null;
  return data ?? [];
}

export async function fetchSignal(symbol: string): Promise<ApiSignal | null> {
  const r = await fetch(
    `${API_BASE}/v1/market/signals/${encodeURIComponent(symbol)}`,
    { cache: "no-store" },
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`signals ${r.status}`);
  // Backend returns 200 + JSON null when no live cache (closed market).
  const body = await r.json();
  return body as ApiSignal | null;
}

export interface ApiLadderRow {
  price: number;
  volume: number;
  trades: number;
  buy_volume: number;
  sell_volume: number;
  bid_size?: number;
  ask_size?: number;
}

export interface ApiLadder {
  symbol: string;
  window_mins: number;
  best_bid: number;
  best_ask: number;
  rows: ApiLadderRow[] | null;
}

export async function fetchLadder(symbol: string, mins = 1440): Promise<ApiLadder> {
  const r = await fetch(
    `${API_BASE}/v1/market/ladder/${encodeURIComponent(symbol)}?mins=${mins}`,
    { cache: "no-store" },
  );
  if (!r.ok) throw new Error(`ladder ${r.status}`);
  return r.json();
}

export interface ApiFPLevel {
  price: number;
  buy_volume: number;
  sell_volume: number;
}

export interface ApiFPBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  levels: ApiFPLevel[];
}

export async function fetchFootprint(symbol: string, tf = "5m", limit = 30): Promise<ApiFPBar[]> {
  const q = new URLSearchParams({ tf, limit: String(limit) });
  const r = await fetch(
    `${API_BASE}/v1/market/footprint/${encodeURIComponent(symbol)}?${q}`,
    { cache: "no-store" },
  );
  if (!r.ok) throw new Error(`footprint ${r.status}`);
  return (await r.json()) ?? [];
}

export interface ApiCvdBar {
  time: string;
  buy_volume: number;
  sell_volume: number;
  delta: number;
  volume: number;
  trades: number;
  cum: number;
}

export async function fetchCvd(symbol: string, tf = "1m", limit = 200): Promise<ApiCvdBar[]> {
  const q = new URLSearchParams({ tf, limit: String(limit) });
  const r = await fetch(
    `${API_BASE}/v1/market/cvd/${encodeURIComponent(symbol)}?${q}`,
    { cache: "no-store" },
  );
  if (!r.ok) throw new Error(`cvd ${r.status}`);
  return (await r.json()) ?? [];
}

export interface ApiTpoLevel {
  price: number;
  periods: number[];
  volume: number;
}

export interface ApiTpo {
  symbol: string;
  day: string;
  period_mins: number;
  session_start: string;
  levels: ApiTpoLevel[] | null;
}

export async function fetchTpo(symbol: string, day?: string, periodMins = 30): Promise<ApiTpo> {
  const q = new URLSearchParams({ period_mins: String(periodMins) });
  if (day) q.set("day", day);
  const r = await fetch(
    `${API_BASE}/v1/market/tpo/${encodeURIComponent(symbol)}?${q}`,
    { cache: "no-store" },
  );
  if (!r.ok) throw new Error(`tpo ${r.status}`);
  return r.json();
}
