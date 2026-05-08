package market

import "time"

type Symbol struct {
	Symbol     string  `json:"symbol"`
	Exchange   string  `json:"exchange"`
	Base       string  `json:"base"`
	Quote      string  `json:"quote"`
	TickSize   float64 `json:"tick_size,omitempty"`
	StepSize   float64 `json:"step_size,omitempty"`
	MinQty     float64 `json:"min_qty,omitempty"`
	Multiplier float64 `json:"multiplier,omitempty"`  // contract multiplier (50 for ES); spot symbols return 1
	AssetClass string  `json:"asset_class,omitempty"` // "futures" | "spot"
	Status     string  `json:"status"`
}

type Candle struct {
	Time   time.Time `json:"time"`
	Symbol string    `json:"symbol"`
	Open   float64   `json:"open"`
	High   float64   `json:"high"`
	Low    float64   `json:"low"`
	Close  float64   `json:"close"`
	Volume float64   `json:"volume"`
	Trades int64     `json:"trades"`
}

type Tick struct {
	Time         time.Time `json:"time"`
	Symbol       string    `json:"symbol"`
	TradeID      int64     `json:"trade_id"`
	Price        float64   `json:"price"`
	Qty          float64   `json:"qty"`
	IsBuyerMaker bool      `json:"is_buyer_maker"`
}
