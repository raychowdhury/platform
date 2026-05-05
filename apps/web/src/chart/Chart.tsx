import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  type LogicalRange,
  type UTCTimestamp,
} from "lightweight-charts";
import type { LinePoint, MACDSeries } from "./indicators";
import { TrendLinePrimitive, type TrendLineSpec } from "./trendline";
import { FibPrimitive, type FibSpec } from "./fib";

export interface CandleBar {
  time: number; // unix seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type IndicatorKey = "ma20" | "ma50" | "ema12" | "ema26";
export type OscillatorKey = "rsi" | "macd";

export interface PriceLineSpec {
  id: string;
  price: number;
  color: string;
  label?: string;
}

export interface ChartHandle {
  setHistory: (bars: CandleBar[]) => void;
  upsertBar: (bar: CandleBar) => void;
  setIndicator: (key: IndicatorKey, points: LinePoint[] | null) => void;
  setOscillator: (key: OscillatorKey | null, payload: LinePoint[] | MACDSeries | null) => void;
  setPriceLines: (lines: PriceLineSpec[]) => void;
  setTrendLines: (lines: TrendLineSpec[]) => void;
  setFibs: (fibs: FibSpec[]) => void;
  // priceFromY converts a pixel-y on the candle pane to a price using the
  // candlestick series' price scale. Returns null if outside the visible range.
  priceFromY: (y: number) => number | null;
  // syncCrosshair drives the candle pane's crosshair from an external source
  // (for /multi panel sync). price is required by lightweight-charts; callers
  // should pass the close at `time` from their own bar data so the crosshair
  // lands on the candle. null clears.
  syncCrosshair: (time: number, price: number) => void;
  clearCrosshair: () => void;
}

interface Props {
  onReady: (handle: ChartHandle) => void;
  onClick?: (price: number, y: number) => void;
  // Fires when the local user moves the crosshair over this chart. time is
  // the bar timestamp under the cursor (unix seconds), or null when the
  // cursor leaves the chart. Used by /multi to broadcast to peer panels.
  onCrosshairTime?: (time: number | null) => void;
}

const INDICATOR_COLORS: Record<IndicatorKey, string> = {
  ma20:  "#f5c518",
  ma50:  "#8e44ad",
  ema12: "#2962ff",
  ema26: "#26a69a",
};

const COMMON_OPTS = {
  layout: { background: { type: ColorType.Solid, color: "#0b0e14" }, textColor: "#d1d4dc" },
  grid: { vertLines: { color: "#1e222d" }, horzLines: { color: "#1e222d" } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: "#1e222d" },
  timeScale: { borderColor: "#1e222d", timeVisible: true, secondsVisible: false },
};

export default function Chart({ onReady, onClick, onCrosshairTime }: Props) {
  const mainHostRef = useRef<HTMLDivElement>(null);
  const oscHostRef = useRef<HTMLDivElement>(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const onCrosshairTimeRef = useRef(onCrosshairTime);
  onCrosshairTimeRef.current = onCrosshairTime;

  useEffect(() => {
    if (!mainHostRef.current || !oscHostRef.current) return;

    const main: IChartApi = createChart(mainHostRef.current, { ...COMMON_OPTS, autoSize: true });
    const osc: IChartApi = createChart(oscHostRef.current, {
      ...COMMON_OPTS,
      autoSize: true,
      timeScale: { ...COMMON_OPTS.timeScale, visible: false }, // main owns the time axis
    });

    const candles = main.addSeries(CandlestickSeries, {
      upColor: "#26a69a", downColor: "#ef5350",
      wickUpColor: "#26a69a", wickDownColor: "#ef5350",
      borderVisible: false,
    });
    const volume = main.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#26a69a55",
    });
    main.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }, borderVisible: false,
    });

    const indicatorSeries = new Map<IndicatorKey, ISeriesApi<"Line">>();

    // sync time scales: when main scrolls/zooms, propagate to osc.
    let syncing = false;
    const onMainRange = (range: LogicalRange | null) => {
      if (syncing || !range) return;
      syncing = true;
      try { osc.timeScale().setVisibleLogicalRange(range); } finally { syncing = false; }
    };
    const onOscRange = (range: LogicalRange | null) => {
      if (syncing || !range) return;
      syncing = true;
      try { main.timeScale().setVisibleLogicalRange(range); } finally { syncing = false; }
    };
    main.timeScale().subscribeVisibleLogicalRangeChange(onMainRange);
    osc.timeScale().subscribeVisibleLogicalRangeChange(onOscRange);

    // oscillator pane state
    let oscKey: OscillatorKey | null = null;
    let oscSeries: ISeriesApi<"Line" | "Histogram">[] = [];
    const clearOsc = () => {
      for (const s of oscSeries) osc.removeSeries(s);
      oscSeries = [];
    };

    // price lines (drawings)
    const priceLines = new Map<string, ReturnType<typeof candles.createPriceLine>>();

    // trendlines: id → primitive instance attached to candles
    const trendLines = new Map<string, TrendLinePrimitive>();

    // fib retracements: id → primitive
    const fibs = new Map<string, FibPrimitive>();

    // click → main-pane price
    main.subscribeClick((p) => {
      if (!onClickRef.current || !p.point) return;
      const price = candles.coordinateToPrice(p.point.y);
      if (price == null) return;
      onClickRef.current(Number(price), p.point.y);
    });

    // Crosshair publish: fires on move; we pass null when the cursor leaves
    // the data area (no time / no point) so peers can clear their crosshair.
    // Guarded by a flag so syncCrosshair() (programmatic) doesn't echo back.
    let applyingExternal = false;
    main.subscribeCrosshairMove((p) => {
      if (applyingExternal) return;
      const cb = onCrosshairTimeRef.current;
      if (!cb) return;
      if (!p.time || !p.point) { cb(null); return; }
      cb(Number(p.time));
    });

    onReady({
      setHistory: (bars) => {
        const data: CandlestickData<Time>[] = bars.map((b) => ({
          time: b.time as UTCTimestamp,
          open: b.open, high: b.high, low: b.low, close: b.close,
        }));
        candles.setData(data);
        const vol: HistogramData<Time>[] = bars.map((b) => ({
          time: b.time as UTCTimestamp,
          value: b.volume ?? 0,
          color: b.close >= b.open ? "#26a69a55" : "#ef535055",
        }));
        volume.setData(vol);
        main.timeScale().fitContent();
        osc.timeScale().fitContent();
      },
      upsertBar: (b) => {
        candles.update({
          time: b.time as UTCTimestamp,
          open: b.open, high: b.high, low: b.low, close: b.close,
        });
        volume.update({
          time: b.time as UTCTimestamp,
          value: b.volume ?? 0,
          color: b.close >= b.open ? "#26a69a55" : "#ef535055",
        });
      },
      setIndicator: (key, points) => {
        let s = indicatorSeries.get(key);
        if (points === null) {
          if (s) { main.removeSeries(s); indicatorSeries.delete(key); }
          return;
        }
        if (!s) {
          s = main.addSeries(LineSeries, {
            color: INDICATOR_COLORS[key],
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          indicatorSeries.set(key, s);
        }
        const data: LineData<Time>[] = points.map((p) => ({
          time: p.time as UTCTimestamp, value: p.value,
        }));
        s.setData(data);
      },
      setOscillator: (key, payload) => {
        if (key === null || payload === null) {
          clearOsc();
          oscKey = null;
          return;
        }
        if (oscKey !== key) {
          clearOsc();
          oscKey = key;
        }
        if (key === "rsi") {
          const points = payload as LinePoint[];
          let line = oscSeries[0] as ISeriesApi<"Line"> | undefined;
          if (!line) {
            line = osc.addSeries(LineSeries, {
              color: "#9b59b6", lineWidth: 2, priceLineVisible: false,
              lastValueVisible: true, crosshairMarkerVisible: false,
            });
            line.createPriceLine({ price: 70, color: "#ef5350", lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: "" });
            line.createPriceLine({ price: 30, color: "#26a69a", lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: "" });
            oscSeries.push(line);
          }
          line.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        } else if (key === "macd") {
          const m = payload as MACDSeries;
          let macdLine = oscSeries[0] as ISeriesApi<"Line"> | undefined;
          let signalLine = oscSeries[1] as ISeriesApi<"Line"> | undefined;
          let hist = oscSeries[2] as ISeriesApi<"Histogram"> | undefined;
          if (!macdLine) {
            macdLine = osc.addSeries(LineSeries, { color: "#2962ff", lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            oscSeries.push(macdLine);
          }
          if (!signalLine) {
            signalLine = osc.addSeries(LineSeries, { color: "#f5c518", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            oscSeries.push(signalLine);
          }
          if (!hist) {
            hist = osc.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false });
            oscSeries.push(hist);
          }
          macdLine.setData(m.macd.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          signalLine.setData(m.signal.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          hist.setData(m.hist.map((p) => ({
            time: p.time as UTCTimestamp,
            value: p.value,
            color: p.value >= 0 ? "#26a69a88" : "#ef535088",
          })));
        }
      },
      setFibs: (specs) => {
        const wantIDs = new Set(specs.map((f) => f.id));
        for (const [id, prim] of fibs) {
          if (!wantIDs.has(id)) {
            candles.detachPrimitive(prim);
            fibs.delete(id);
          }
        }
        for (const f of specs) {
          const existing = fibs.get(f.id);
          if (existing) {
            existing.spec = f;
            continue;
          }
          const prim = new FibPrimitive(f, main, candles);
          candles.attachPrimitive(prim);
          fibs.set(f.id, prim);
        }
      },
      setTrendLines: (lines) => {
        const wantIDs = new Set(lines.map((l) => l.id));
        for (const [id, prim] of trendLines) {
          if (!wantIDs.has(id)) {
            candles.detachPrimitive(prim);
            trendLines.delete(id);
          }
        }
        for (const l of lines) {
          const existing = trendLines.get(l.id);
          if (existing) {
            // Spec changed — replace by detach/attach to keep state consistent.
            existing.spec = l;
            continue;
          }
          const prim = new TrendLinePrimitive(l, main, candles);
          candles.attachPrimitive(prim);
          trendLines.set(l.id, prim);
        }
      },
      setPriceLines: (lines) => {
        const wantIDs = new Set(lines.map((l) => l.id));
        // remove dropped
        for (const [id, line] of priceLines) {
          if (!wantIDs.has(id)) {
            candles.removePriceLine(line);
            priceLines.delete(id);
          }
        }
        // add new
        for (const l of lines) {
          if (priceLines.has(l.id)) continue;
          const line = candles.createPriceLine({
            price: l.price,
            color: l.color,
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: l.label ?? "",
          });
          priceLines.set(l.id, line);
        }
      },
      priceFromY: (y) => {
        const v = candles.coordinateToPrice(y);
        return v == null ? null : Number(v);
      },
      syncCrosshair: (time, price) => {
        applyingExternal = true;
        try {
          main.setCrosshairPosition(price, time as UTCTimestamp, candles);
        } finally {
          applyingExternal = false;
        }
      },
      clearCrosshair: () => {
        applyingExternal = true;
        try { main.clearCrosshairPosition(); } finally { applyingExternal = false; }
      },
    });

    return () => {
      main.remove();
      osc.remove();
    };
  }, [onReady]);

  return (
    <div className="chart-stack">
      <div ref={mainHostRef} className="chart-host main" />
      <div ref={oscHostRef} className="chart-host osc" />
    </div>
  );
}
