import { useState } from "react";
import { ArrowDownUp, Zap, ChevronDown } from "lucide-react";

const PAIRS = [
  { sym: "AAPL", price: 63719.9, bal: 1.842, ico: "A" },
  { sym: "MSFT", price: 3077.93, bal: 18.2, ico: "M" },
  { sym: "AMD", price: 184.2, bal: 144, ico: "D" },
];

export function QuickTrade() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [pairIdx, setPairIdx] = useState(0);
  const [amount, setAmount] = useState("0.025");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const pair = PAIRS[pairIdx];
  const amt = parseFloat(amount) || 0;
  const total = amt * pair.price;
  const fee = total * 0.0005;

  const setPercent = (p: number) => {
    setAmount((pair.bal * p).toFixed(pair.bal < 1 ? 4 : 2));
  };

  return (
    <section className="glass p-6 flex flex-col gap-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/15 border border-primary/30">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Quick order</div>
            <h3 className="font-display text-2xl mt-0.5">One-tap trade</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 glass-soft">
        <button
          onClick={() => setSide("buy")}
          className={`py-2 text-sm font-medium cursor-pointer transition-colors ${side === "buy" ? "bg-bull/20 text-bull" : "text-muted-foreground hover:text-foreground"}`}
        >
          Buy / Long
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`py-2 text-sm font-medium cursor-pointer transition-colors ${side === "sell" ? "bg-bear/20 text-bear" : "text-muted-foreground hover:text-foreground"}`}
        >
          Sell / Short
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Pair</label>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="mt-1 w-full flex items-center justify-between glass-soft p-3 text-sm cursor-pointer hover:bg-white/[0.05]"
          >
            <span className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/30 grid place-items-center font-mono text-xs">{pair.ico}</div>
              {pair.sym}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{pair.price.toLocaleString()}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
            </span>
          </button>
          {pickerOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 glass z-20 flex flex-col">
              {PAIRS.map((p, i) => (
                <button
                  key={p.sym}
                  onClick={() => {
                    setPairIdx(i);
                    setPickerOpen(false);
                  }}
                  className={`flex items-center justify-between p-2.5 text-sm cursor-pointer hover:bg-white/[0.06] ${i === pairIdx ? "bg-white/[0.04]" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/5 grid place-items-center text-[10px] font-mono">{p.ico}</div>
                    {p.sym}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{p.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground flex justify-between">
            <span>Amount</span>
            <span>
              Balance: {pair.bal} {pair.sym.split("/")[0]}
            </span>
          </label>
          <div className="mt-1 flex glass-soft overflow-hidden">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 bg-transparent p-3 font-mono text-lg outline-none cursor-text" />
            <span className="px-4 text-xs text-muted-foreground border-l border-white/10 grid place-items-center">{pair.sym.split("/")[0]}</span>
          </div>
          <div className="flex gap-1 mt-2">
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <button
                key={p}
                onClick={() => setPercent(p)}
                className="flex-1 text-[10px] py-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                {p === 1 ? "Max" : `${p * 100}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated total</span>
            <span className="font-mono">${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee · 0.05%</span>
            <span className="font-mono">${fee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slippage</span>
            <span className="font-mono text-bull">0.02%</span>
          </div>
        </div>

        <button
          onClick={() => {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 1800);
          }}
          disabled={confirming || amt <= 0}
          className={`w-full py-3 font-medium text-sm cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
            confirming
              ? "bg-bull/20 text-bull border border-bull/30"
              : side === "buy"
                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:brightness-110"
                : "bg-gradient-to-r from-bear to-bear/80 text-white hover:brightness-110"
          }`}
        >
          <ArrowDownUp className="w-4 h-4" />
          {confirming ? `✓ ${side === "buy" ? "Buy" : "Sell"} order placed` : `${side === "buy" ? "Buy" : "Sell"} ${pair.sym.split("/")[0]}`}
        </button>
      </div>
    </section>
  );
}
