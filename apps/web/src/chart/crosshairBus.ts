// CrosshairBus syncs crosshair position across /multi panels.
// Source panel publishes the bar timestamp under its cursor; receivers map
// the time to their own latest close at that bar and drive the crosshair
// programmatically. Echo from programmatic moves is suppressed inside
// Chart.tsx.
export type CrosshairListener = (time: number | null, sourceId: string) => void;

export interface CrosshairBus {
  publish: (time: number | null, sourceId: string) => void;
  subscribe: (l: CrosshairListener) => () => void;
}

export function createCrosshairBus(): CrosshairBus {
  const listeners = new Set<CrosshairListener>();
  return {
    publish(time, sourceId) {
      for (const l of listeners) l(time, sourceId);
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
