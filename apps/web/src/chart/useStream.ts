import { useEffect, useRef } from "react";
import type { StreamTick } from "../api/types";

type Status = "connecting" | "open" | "closed";

interface ServerMsg {
  channel: string;
  data: unknown;
}

// useStream subscribes to one ticks channel for the lifetime of the component.
// onTick fires for each tick; onStatus reports lifecycle.
export function useStream(
  symbol: string,
  onTick: (t: StreamTick) => void,
  onStatus?: (s: Status) => void,
) {
  const onTickRef = useRef(onTick);
  const onStatusRef = useRef(onStatus);
  onTickRef.current = onTick;
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!symbol) return;
    let closed = false;
    let ws: WebSocket | null = null;
    let backoff = 500;
    let reconnectTimer: number | undefined;

    const url = (() => {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${location.host}/v1/stream`;
    })();

    const channel = `ticks:${symbol}`;

    const connect = () => {
      if (closed) return;
      onStatusRef.current?.("connecting");
      ws = new WebSocket(url);
      ws.onopen = () => {
        backoff = 500;
        onStatusRef.current?.("open");
        ws?.send(JSON.stringify({ action: "subscribe", channels: [channel] }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as ServerMsg;
          if (msg.channel === channel) onTickRef.current(msg.data as StreamTick);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        onStatusRef.current?.("closed");
        if (closed) return;
        reconnectTimer = window.setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 10_000);
      };
      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [symbol]);
}
