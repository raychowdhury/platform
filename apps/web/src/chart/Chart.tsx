import { useEffect, useRef } from "react";
import {
  createChart,
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

export interface ChartHandle {
  setHistory: (bars: CandleBar[]) => void;
  upsertBar: (bar: CandleBar) => void;
  setIndicator: (key: IndicatorKey, points: LinePoint[] | null) => void;
  setOscillator: (key: OscillatorKey | null, payload: LinePoint[] | MACDSeries | null) => void;
}

interface Props {
  onReady: (handle: ChartHandle) => void;
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

export default function Chart({ onReady }: Props) {
  const mainHostRef = useRef<HTMLDivElement>(null);
  const oscHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mainHostRef.current || !oscHostRef.current) return;

    const main: IChartApi = createChart(mainHostRef.current, { ...COMMON_OPTS, autoSize: true });
    const osc: IChartApi = createChart(oscHostRef.current, {
      ...COMMON_OPTS,
      autoSize: true,
      timeScale: { ...COMMON_OPTS.timeScale, visible: false }, // main owns the time axis
    });

    const candles = main.addCandlestickSeries({
      upColor: "#26a69a", downColor: "#ef5350",
      wickUpColor: "#26a69a", wickDownColor: "#ef5350",
      borderVisible: false,
    });
    const volume = main.addHistogramSeries({
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
          s = main.addLineSeries({
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
            line = osc.addLineSeries({
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
            macdLine = osc.addLineSeries({ color: "#2962ff", lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            oscSeries.push(macdLine);
          }
          if (!signalLine) {
            signalLine = osc.addLineSeries({ color: "#f5c518", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            oscSeries.push(signalLine);
          }
          if (!hist) {
            hist = osc.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
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
