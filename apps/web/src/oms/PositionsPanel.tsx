import type { Position } from "../api/types";

interface Props {
  positions: Position[];
  marks: Map<string, number>;
}

// Surrogate margin ratio: how far the mark has moved against entry, as a % of entry.
// Treat 100% loss-vs-entry as full liquidation. Pure UI signal — backend has no
// cross-margin engine yet, so this is intentionally a directional gauge, not a
// true maintenance-margin calculation.
function marginRatio(p: Position, mark: number | undefined): number | null {
  if (mark == null || p.qty === 0 || p.avg_cost === 0) return null;
  const pnlPct = ((mark - p.avg_cost) / p.avg_cost) * (p.qty > 0 ? 1 : -1);
  if (pnlPct >= 0) return 0;
  return Math.min(100, Math.abs(pnlPct) * 100);
}

function ratioClass(r: number): "safe" | "warn" | "danger" {
  if (r >= 70) return "danger";
  if (r >= 40) return "warn";
  return "safe";
}

export default function PositionsPanel({ positions, marks }: Props) {
  return (
    <div className="panel">
      <div className="panel-title">Positions</div>
      {positions.length === 0 ? (
        <div className="muted small empty">no open positions</div>
      ) : (
        <table className="oms-table">
          <thead>
            <tr>
              <th>Symbol</th><th>Qty</th><th>Lock</th>
              <th>Avg</th><th>Mark</th><th>uPnL</th><th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const mark = marks.get(p.symbol);
              const upnl = mark != null ? (mark - p.avg_cost) * p.qty : null;
              const cls = upnl == null ? "" : upnl > 0 ? "up" : upnl < 0 ? "down" : "";
              const r = marginRatio(p, mark);
              const rc = r != null ? ratioClass(r) : null;
              return (
                <tr key={p.symbol}>
                  <td>{p.symbol}</td>
                  <td>{p.qty.toFixed(6)}</td>
                  <td className={p.locked_qty > 0 ? "down" : "muted"}>{p.locked_qty.toFixed(6)}</td>
                  <td>{p.avg_cost.toFixed(2)}</td>
                  <td>{mark != null ? mark.toFixed(2) : "—"}</td>
                  <td className={cls}>{upnl != null ? upnl.toFixed(2) : "—"}</td>
                  <td style={{ minWidth: 110 }}>
                    {r != null && rc ? (
                      <div className="gauge" title={`Loss vs entry: ${r.toFixed(1)}%`}>
                        <div className="gauge-bar">
                          <div className={`gauge-fill ${rc}`} style={{ width: `${r}%` }} />
                        </div>
                        <span className={`gauge-val ${rc === "safe" ? "" : rc}`}>{r.toFixed(0)}%</span>
                      </div>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
