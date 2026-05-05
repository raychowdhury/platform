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
export type OrderType = "market" | "limit" | "stop_market";
export type OrderStatus = "open" | "pending" | "filled" | "cancelled" | "rejected";

export interface Order {
  id: string;
  user_id: string;
  client_order_id?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  limit_price?: number;
  stop_price?: number;
  qty: number;
  filled_qty: number;
  avg_fill_price?: number;
  reserved_cost: number;
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
  locked: number;
  available: number;
  quote_currency: string;
  updated_at: string;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  limit_price?: number;
  stop_price?: number;
  client_order_id?: string;
}

export interface Plan {
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: string;
  max_alerts: number;
  max_layouts: number;
  max_indicators: number;
  history_days: number;
}

export interface Subscription {
  user_id: string;
  plan_code: string;
  status: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse extends Partial<TokenPair> {
  requires_mfa?: boolean;
  mfa_token?: string;
}

export interface MFAStatus {
  enabled: boolean;
  pending: boolean;
}

export interface MFASetupResponse {
  secret: string;
  otpauth_url: string;
  recovery_codes: string[];
}

export type AlertCondition = "price_above" | "price_below";
export type AlertStatus = "active" | "triggered" | "disabled";

export interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  status: AlertStatus;
  note?: string;
  triggered_at?: string;
  triggered_price?: number;
  created_at: string;
  updated_at: string;
}

export interface AlertCreateRequest {
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  note?: string;
}

export interface Notification {
  id: number;
  user_id: string;
  alert_id?: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  read_at?: string;
  created_at: string;
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
