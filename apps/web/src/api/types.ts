export interface TokenPair {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  status: string;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface Symbol {
  symbol: string;
  exchange: string;
  base: string;
  quote: string;
  status: string;
  tick_size?: number;
  step_size?: number;
  min_qty?: number;
}

export interface Candle {
  time: string;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}

export interface StreamTick {
  symbol: string;
  trade_id: number;
  price: number;
  qty: number;
  t: number; // unix ms
  m: boolean; // is_buyer_maker
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "8h" | "1d" | "1w";

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "open" | "filled" | "cancelled" | "rejected";

export interface Order {
  id: string;
  user_id: string;
  client_order_id?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  limit_price?: number;
  qty: number;
  filled_qty: number;
  avg_fill_price?: number;
  status: OrderStatus;
  reject_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Position {
  user_id: string;
  symbol: string;
  qty: number;
  avg_cost: number;
  realized_pnl: number;
  updated_at: string;
}

export interface Account {
  user_id: string;
  balance: number;
  quote_currency: string;
  updated_at: string;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  limit_price?: number;
  client_order_id?: string;
}

export const TF_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "8h": 28800,
  "1d": 86400,
  "1w": 604800,
};
