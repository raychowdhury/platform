import { api } from "../api/client";
import type { Order } from "../api/types";

interface Props {
  orders: Order[];
  onChanged: () => void;
}

export default function OrdersPanel({ orders, onChanged }: Props) {
  async function cancel(id: string) {
    try {
      await api.cancelOrder(id);
      onChanged();
    } catch {
      // ignore — refresh will reflect actual state
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">Orders</div>
      {orders.length === 0 ? (
        <div className="muted small empty">no orders</div>
      ) : (
        <table className="oms-table">
          <thead>
            <tr>
              <th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Price</th>
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.symbol}</td>
                <td className={o.side === "buy" ? "up" : "down"}>{o.side}</td>
                <td>{o.type}</td>
                <td>{o.qty}</td>
                <td>
                  {o.type === "limit" && o.limit_price != null
                    ? o.limit_price.toFixed(2)
                    : (o.avg_fill_price != null ? o.avg_fill_price.toFixed(2) : "—")}
                </td>
                <td>{o.status}</td>
                <td>
                  {o.status === "open" && (
                    <button className="link" onClick={() => cancel(o.id)}>cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
