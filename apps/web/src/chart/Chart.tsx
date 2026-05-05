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
  type UTCTimestamp,
} from "lightweight-charts";
import type { LinePoint } from "./indicators";

export interface CandleBar {
  time: number; // unix seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type IndicatorKey = "ma20" | "ma50" | "ema12" | "ema26";

export interface ChartHandle {
  setHistory: (bars: CandleBar[]) => void;
  upsertBar: (bar: CandleBar) => void;
  setIndicator: (key: IndicatorKey, points: LinePoint[] | null) => void;
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

export default function Chart({ onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const chart: IChartApi = createChart(hostRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0e14" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#1e222d" },
        horzLines: { color: "#1e222d" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1e222d" },
      timeScale: { borderColor: "#1e222d", timeVisible: true, secondsVisible: false },
      autoSize: true,
    });
    const candles = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: false,
    });

    // Volume histogram lives on its own overlay price scale, sized to the
    // bottom 20% of the chart so it doesn't squash the candles.
    const volume = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#26a69a55",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      borderVisible: false,
    });

    const indicatorSeries = new Map<IndicatorKey, ISeriesApi<"Line">>();

    onReady({
      setHistory: (bars) => {
        const data: CandlestickData<Time>[] = bars.map((b) => ({
          time: b.time as UTCTimestamp,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }));
        candles.setData(data);
        const vol: HistogramData<Time>[] = bars.map((b) => ({
          time: b.time as UTCTimestamp,
          value: b.volume ?? 0,
          color: b.close >= b.open ? "#26a69a55" : "#ef535055",
        }));
        volume.setData(vol);
        chart.timeScale().fitContent();
      },
      upsertBar: (b) => {
        candles.update({
          time: b.time as UTCTimestamp,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
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
          if (s) {
            chart.removeSeries(s);
            indicatorSeries.delete(key);
          }
          return;
        }
        if (!s) {
          s = chart.addLineSeries({
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
          time: p.time as UTCTimestamp,
          value: p.value,
        }));
        s.setData(data);
      },
    });

    return () => {
      chart.remove();
    };
  }, [onReady]);

  return <div ref={hostRef} className="chart-host" />;
}
