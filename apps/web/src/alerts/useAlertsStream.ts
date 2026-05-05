import { useEffect, useRef } from "react";
import { getAuth } from "../auth/store";

export interface AlertEvent {
  type: "alert_triggered";
  alert_id: string;
  symbol: string;
  condition: "price_above" | "price_below";
  threshold: number;
  price: number;
  t: number;
}

// Dedicated WS for alerts:<userId>. Mirrors useOmsStream — separate connection
// so fan-out is independent of chart and OMS subscriptions.
export function useAlertsStream(userId: string | null, onEvent: (e: AlertEvent) => void) {
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
    const channel = `alerts:${userId}`;

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
          if (msg.channel === channel) onEventRef.current(msg.data as AlertEvent);
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
