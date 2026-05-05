import type { Position } from "../api/types";

interface Props {
  positions: Position[];
  marks: Map<string, number>;
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
            <tr><th>Symbol</th><th>Qty</th><th>Avg</th><th>Mark</th><th>uPnL</th></tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const mark = marks.get(p.symbol);
              const upnl = mark != null ? (mark - p.avg_cost) * p.qty : null;
              const cls = upnl == null ? "" : upnl > 0 ? "up" : upnl < 0 ? "down" : "";
              return (
                <tr key={p.symbol}>
                  <td>{p.symbol}</td>
                  <td>{p.qty.toFixed(6)}</td>
                  <td>{p.avg_cost.toFixed(2)}</td>
                  <td>{mark != null ? mark.toFixed(2) : "—"}</td>
                  <td className={cls}>{upnl != null ? upnl.toFixed(2) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
