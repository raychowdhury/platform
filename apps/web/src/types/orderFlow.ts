// OrderFlowLadderRow is the row shape consumed by the right-side
// BOOK / order-flow ladder panel. Optional fields are returned when the
// upstream feed (signals + ladder) carries the value; otherwise the
// renderer shows "--".
export interface OrderFlowLadderRow {
  price: number;
  cob?: number | null;        // current order-book size at price (L1 only on mbp-1 plan)
  svp?: number | null;        // session volume profile (qty traded at price over window)
  delta?: number | null;      // buy_volume − sell_volume at this price
  cqc?: number | null;        // cumulative quote count = trade count at price
  buyVolume?: number | null;
  sellVolume?: number | null;
  totalVolume?: number | null;
  isCurrentPrice?: boolean;
}

export interface OrderFlowLadderData {
  symbol: string;
  tf?: string | null;
  rows: OrderFlowLadderRow[];
  bestBid?: number | null;
  bestAsk?: number | null;
  midPrice?: number | null;
  orderBookImbPct?: number | null; // L1 book imbalance as %
  volumeSweepPct?: number | null;  // 5m sweep direction as %
  isLive?: boolean;                // signals cache populated → live L1 available
}
