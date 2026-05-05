import { useEffect, useRef } from "react";
import { getAuth } from "../auth/store";

interface OmsEvent {
  type: string; // "fill" | future: "order_update", "cancel", "reject"
  order_id?: string;
  symbol?: string;
  side?: string;
  price?: number;
  qty?: number;
  fee?: number;
  t?: number;
}

// Connects a WebSocket dedicated to oms:<userId> events. Reuses the same
// /v1/stream gateway as the market data feed but on its own connection so
// chart subscriptions don't interfere with order-event delivery.
export function useOmsStream(userId: string | null, onEvent: (e: OmsEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!userId) return;
    const { access } = getAuth();
    if (!access) return;

    let closed = false;
    let ws: WebSocket | null = null;
    let backoff = 500;
    let timer: number | undefined;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/v1/stream?token=${encodeURIComponent(access)}`;
    const channel = `oms:${userId}`;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);
      ws.onopen = () => {
        backoff = 500;
        ws?.send(JSON.stringify({ action: "subscribe", channels: [channel] }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { channel: string; data: unknown };
          if (msg.channel === channel) onEventRef.current(msg.data as OmsEvent);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        timer = window.setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 10_000);
      };
      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [userId]);
}
