// FibPrimitive draws a Fibonacci retracement between two (time, price)
// anchors. Levels are horizontal lines at standard ratios spanning [price1,
// price2]; the renderer also draws connecting verticals at each anchor so
// users can see the active range.
import type {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  ISeriesApi,
  IChartApi,
  UTCTimestamp,
} from "lightweight-charts";

interface BitmapScope {
  context: CanvasRenderingContext2D;
  horizontalPixelRatio: number;
  verticalPixelRatio: number;
  bitmapSize: { width: number; height: number };
}

export interface FibSpec {
  id: string;
  time1: number;   // unix seconds — left anchor (treated as 0% / 100% reference)
  price1: number;
  time2: number;
  price2: number;
  color: string;
}

const LEVELS: ReadonlyArray<readonly [number, string]> = [
  [0,     "rgba(255,255,255,0.55)"],
  [0.236, "#26a69a"],
  [0.382, "#26a69a"],
  [0.5,   "#f5c518"],
  [0.618, "#ef5350"],
  [0.786, "#ef5350"],
  [1,     "rgba(255,255,255,0.55)"],
];

class FibRenderer implements IPrimitivePaneRenderer {
  constructor(
    private spec: FibSpec,
    private chart: IChartApi,
    private series: ISeriesApi<"Candlestick">,
  ) {}

  draw(target: { useBitmapCoordinateSpace(cb: (s: BitmapScope) => void): void }): void {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr, bitmapSize } = scope;
      const ts = this.chart.timeScale();
      const x1 = ts.timeToCoordinate(this.spec.time1 as UTCTimestamp);
      const x2 = ts.timeToCoordinate(this.spec.time2 as UTCTimestamp);
      if (x1 == null || x2 == null) return;
      const left = Math.min(x1, x2) * hpr;
      // Extend each level to the right edge of the chart so old retracements
      // remain useful as price keeps moving.
      const drawTo = bitmapSize.width;

      ctx.save();
      ctx.font = `${10 * Math.max(hpr, vpr)}px ui-monospace, monospace`;
      ctx.textBaseline = "middle";
      const lo = Math.min(this.spec.price1, this.spec.price2);
      const hi = Math.max(this.spec.price1, this.spec.price2);
      // Convention: 100% at price1 anchor, 0% at price2 anchor.
      // Direction (up vs down retracement) is implied by which anchor is higher.
      const top = this.spec.price1 >= this.spec.price2 ? this.spec.price1 : this.spec.price2;
      const bot = this.spec.price1 >= this.spec.price2 ? this.spec.price2 : this.spec.price1;
      for (const [ratio, color] of LEVELS) {
        const price = top - (top - bot) * ratio;
        const y = this.series.priceToCoordinate(price);
        if (y == null) continue;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, Math.round(1 * hpr));
        ctx.beginPath();
        ctx.moveTo(left, y * vpr);
        ctx.lineTo(drawTo, y * vpr);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(`${(ratio * 100).toFixed(1)}%  ${price.toFixed(2)}`,
          left + 4 * hpr, y * vpr - 6 * vpr);
      }
      // anchor verticals: thin vertical line connecting top→bot at each anchor
      ctx.strokeStyle = this.spec.color;
      ctx.lineWidth = Math.max(1, Math.round(1 * hpr));
      const yTop = this.series.priceToCoordinate(hi);
      const yBot = this.series.priceToCoordinate(lo);
      if (yTop != null && yBot != null) {
        for (const x of [x1 * hpr, x2 * hpr]) {
          ctx.beginPath();
          ctx.moveTo(x, yTop * vpr);
          ctx.lineTo(x, yBot * vpr);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }
}

class FibPaneView implements IPrimitivePaneView {
  constructor(
    private spec: FibSpec,
    private chart: IChartApi,
    private series: ISeriesApi<"Candlestick">,
  ) {}
  zOrder(): "top" { return "top"; }
  renderer(): IPrimitivePaneRenderer {
    return new FibRenderer(this.spec, this.chart, this.series);
  }
}

export class FibPrimitive implements ISeriesPrimitive<Time> {
  constructor(
    public spec: FibSpec,
    private chart: IChartApi,
    private series: ISeriesApi<"Candlestick">,
  ) {}
  paneViews(): readonly IPrimitivePaneView[] {
    return [new FibPaneView(this.spec, this.chart, this.series)];
  }
}
