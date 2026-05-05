// TrendLinePrimitive draws a straight line between two (time, price) anchors
// on the candlestick price scale. Uses the lightweight-charts v5
// ISeriesPrimitive API: paneViews → IPrimitivePaneView → IPrimitivePaneRenderer.
import type {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  ISeriesApi,
  IChartApi,
  UTCTimestamp,
} from "lightweight-charts";

// fancy-canvas (LWC's renderer) doesn't re-export BitmapCoordinatesRenderingScope
// from "lightweight-charts" in v5; the inline shape below matches what we use.
interface BitmapScope {
  context: CanvasRenderingContext2D;
  horizontalPixelRatio: number;
  verticalPixelRatio: number;
  bitmapSize: { width: number; height: number };
}

export interface TrendLineSpec {
  id: string;
  time1: number; // unix seconds
  price1: number;
  time2: number;
  price2: number;
  color: string;
}

class TrendLineRenderer implements IPrimitivePaneRenderer {
  constructor(
    private spec: TrendLineSpec,
    private chart: IChartApi,
    private series: ISeriesApi<"Candlestick">,
  ) {}

  draw(target: { useBitmapCoordinateSpace(cb: (scope: BitmapScope) => void): void }): void {
    target.useBitmapCoordinateSpace((scope: BitmapScope) => {
      const { context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr } = scope;
      const ts = this.chart.timeScale();
      const x1 = ts.timeToCoordinate(this.spec.time1 as UTCTimestamp);
      const x2 = ts.timeToCoordinate(this.spec.time2 as UTCTimestamp);
      const y1 = this.series.priceToCoordinate(this.spec.price1);
      const y2 = this.series.priceToCoordinate(this.spec.price2);
      if (x1 == null || x2 == null || y1 == null || y2 == null) return;
      ctx.save();
      ctx.strokeStyle = this.spec.color;
      ctx.lineWidth = Math.max(1, Math.round(1.5 * hpr));
      ctx.beginPath();
      ctx.moveTo(x1 * hpr, y1 * vpr);
      ctx.lineTo(x2 * hpr, y2 * vpr);
      ctx.stroke();
      // anchor dots
      const r = 3 * Math.max(hpr, vpr);
      ctx.fillStyle = this.spec.color;
      ctx.beginPath();
      ctx.arc(x1 * hpr, y1 * vpr, r, 0, Math.PI * 2);
      ctx.arc(x2 * hpr, y2 * vpr, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

class TrendLinePaneView implements IPrimitivePaneView {
  constructor(
    private spec: TrendLineSpec,
    private chart: IChartApi,
    private series: ISeriesApi<"Candlestick">,
  ) {}
  zOrder(): "top" { return "top"; }
  renderer(): IPrimitivePaneRenderer {
    return new TrendLineRenderer(this.spec, this.chart, this.series);
  }
}

export class TrendLinePrimitive implements ISeriesPrimitive<Time> {
  constructor(
    public spec: TrendLineSpec,
    private chart: IChartApi,
    private series: ISeriesApi<"Candlestick">,
  ) {}
  paneViews(): readonly IPrimitivePaneView[] {
    return [new TrendLinePaneView(this.spec, this.chart, this.series)];
  }
}
