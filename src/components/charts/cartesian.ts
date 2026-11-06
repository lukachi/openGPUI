// BarChart, LineChart, AreaChart: react-ui's condensed (fit) cartesian charts.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/Charts/{BarChartCondensed,LineChartCondensed,AreaChartCondensed}.ts (contract)
//   components/Charts/{BarChart/BarChart.tsx,LineChart/LineChart.tsx,AreaChart/AreaChart.tsx}
//     with condensed = true (the *Condensed wrappers), and their scss
//   BarChart/parts/{BarSeries,Crosshair}.tsx, LineChart/parts/LineSeries.tsx,
//   AreaChart/parts/{AreaSeries,GradientDefs}.tsx, shared/cartesian/LineDotCrosshair.tsx
//   shared/cartesian/layouts/CartesianChartLayout.tsx (FitBody), shared/cartesian/ClipDefs.tsx
//   hooks/cartesian/{useCartesianChartOrchestrator,useChartDimensions,useYAxisWidth,
//     useXAxisLabelLayout,useXBandScale,useXScale,useYScale,useStackedData}.ts
// Pure upstream helpers (domains, label layout, bar paths, curves, palettes,
// formatters) compile from the pin; d3-scale and d3-shape are upstream's.
//
// The layout (scales, label layout, built paths) is computed once per data,
// size and measured widths and kept in `ctx.local`; a hover redraw only
// places the followers and the tooltip (charts/hover.ts).
//
// gpui differences:
// - Geometry is painted with gpui paths (charts/paint.ts); text is placed
//   divs (charts/axes.ts). A chart whose characters were never measured draws
//   one frame without its plot while it measures them (charts/measure.ts).
// - Hover followers (the bar column band, the line/area active dots) glide
//   with native springs; active dots glide in a straight line between points
//   instead of along the curve (charts/hover.ts).
// - Line caps and joins are gpui's (upstream: round caps on the bar line).
import type { ScaleBand, ScalePoint } from "d3-scale";
import { scaleBand, scaleLinear, scalePoint } from "d3-scale";
import { stack, stackOffsetNone, stackOrderNone, type Series as StackSeries } from "d3-shape";
import { v_flex } from "gpui-base";
import { div, PathBuilder, type Element } from "gpui-kit";
import { roundedBarPath } from "openui-charts/shared/cartesian/roundedBarPath";
import { buildAreaD, buildAreaEdgeD, buildLineD, seriesCurve } from "openui-charts/shared/cartesian/seriesGeometry";
import { verticalBarRadii } from "openui-charts/BarChart/parts/verticalBarRadii";
import { stackOffsetDivergingZeroPreserving } from "openui-charts/hooks/cartesian/useStackedData";
import { BAND_PADDING_INNER, BAND_PADDING_OUTER } from "openui-charts/hooks/cartesian/useXBandScale";
import { CHART_MARGIN_TOP, DEFAULT_CHART_HEIGHT } from "openui-charts/utils/constants";
import { parseLineHeight } from "openui-charts/utils/labelWrap";
import { findBandIndex, findNearestDataIndex } from "openui-charts/utils/mouseUtils";
import { resolveShouldFitLegend } from "openui-charts/utils/resolveShouldFitLegend";
import { measureYAxisWidth, numberTickFormatter } from "openui-charts/utils/styleUtils";
import { layoutXAxisLabels, MAX_X_AXIS_HEIGHT_SHARE } from "openui-charts/utils/xAxisLabelLayout";
import { computeYDomain, type StackOffset } from "openui-charts/utils/yDomain";
import type { Component, Props, RenderContext } from "../../render/surface.ts";
import { alpha, cssColor, textStyle, typography, type Tokens } from "../../render/tokens.ts";
import { condensedXAxis, horizontalGrid, textItems, yAxisTicks, type TextItem } from "./axes.ts";
import { chartTooltip, legendStrings, legendView } from "./chrome.ts";
import { chart2DRows, memo, seriesModel, tooltipPayload, type ChartPaletteName, type ChartRow, type SeriesModel } from "./data.ts";
import { activeDot, follower, hoverState, shownIndex, trackWidth, withHover } from "./hover.ts";
import { Measurer } from "./measure.ts";
import { layer, verticalGradient, type Painted } from "./paint.ts";
import { svgPath } from "./pathData.ts";
import { widthsVersion } from "./widths.ts";

type Kind = "bar" | "line" | "area";
type StackedData = StackSeries<ChartRow, string>[];

/** useYAxisWidth's width before anything is measured or with no series. */
const DEFAULT_Y_AXIS_WIDTH = 40;
/** ClipDefs: the plot clip reaches this far above the plot, for strokes at the top. */
const CLIP_OVERFLOW = 6;
/** BarSeries defaults (BarChart passes barRadius 4, internalLine true). */
const DEFAULT_MAX_BAR_WIDTH = 16;
const BAR_RADIUS = 4;
const MIN_BAR_HEIGHT_FOR_LINE = 8;
const LINE_PADDING = 6;
const INTERNAL_LINE_COLOR = cssColor("rgba(255, 255, 255, 0.3)")!;
/** GradientDefs stops. */
const GRADIENT_TOP_OPACITY = 0.6;
const GRADIENT_BOTTOM_OPACITY = 0;

const PALETTE: Record<Kind, ChartPaletteName> = { bar: "barChartPalette", line: "lineChartPalette", area: "areaChartPalette" };

/** Everything a chart draws that does not depend on hover. */
interface Layout {
  yAxisWidth: number;
  chartWidth: number;
  chartHeight: number;
  labelHeight: number;
  yTicks: TextItem[];
  xLabels: TextItem[];
  /** Grid and series, in the clip box's pixels (its top is CLIP_OVERFLOW above the plot). */
  plot: Painted[];
  /** Per category: the band's left edge (bar) or the point (line, area). */
  xs: number[];
  bandwidth: number;
  /** Line/area: each series' value edge per category, for the active dots. */
  edges: { key: string; ys: number[] }[];
  findIndex: (x: number) => number;
}

/** useStackedData: bars diverge by sign, areas keep one running total. */
function stackRows(rows: ChartRow[], keys: string[], offset: StackOffset): StackedData | null {
  if (keys.length === 0) return null;
  return stack<ChartRow>()
    .keys(keys)
    .order(stackOrderNone)
    .offset(offset === "none" ? stackOffsetNone : stackOffsetDivergingZeroPreserving)(rows);
}

/**
 * BarSeries: one fill path per series, each followed by its internal lines
 * (bars of one series never overlap; a later series paints over an earlier
 * one's bars and lines, as upstream's per-bar order does).
 */
function barSeries(o: {
  rows: ChartRow[];
  m: SeriesModel;
  xScale: ScaleBand<string>;
  y: (v: number) => number;
  stacked: StackedData | null;
  grouped: boolean;
  dy: number;
}): Painted[] {
  const { rows, m, xScale, y: yScale, dy } = o;
  const bandwidth = xScale.bandwidth();
  const fills = new Map<string, { fill: PathBuilder; lines: PathBuilder; lineCount: number }>();
  const bar = (key: string, x: number, y: number, w: number, h: number, radii: [number, number, number, number]) => {
    let s = fills.get(key);
    if (!s) fills.set(key, (s = { fill: PathBuilder.fill(), lines: PathBuilder.stroke(1), lineCount: 0 }));
    svgPath(s.fill, roundedBarPath(x, y, w, h, radii), 0, dy);
    if (h >= MIN_BAR_HEIGHT_FOR_LINE && w >= 3) {
      s.lines.move_to(x + w / 2, y + LINE_PADDING + dy).line_to(x + w / 2, y + h - LINE_PADDING + dy);
      s.lineCount++;
    }
  };

  if (o.stacked) {
    const cappedWidth = Math.min(bandwidth, DEFAULT_MAX_BAR_WIDTH);
    const offset = (bandwidth - cappedWidth) / 2;
    const lastPositive: number[] = new Array(rows.length).fill(-1);
    const lastNegative: number[] = new Array(rows.length).fill(-1);
    o.stacked.forEach((series, si) =>
      series.forEach((point, i) => {
        if (point[0] === point[1]) return;
        if (point[0] < 0) lastNegative[i] = si;
        else lastPositive[i] = si;
      }),
    );
    o.stacked.forEach((series, si) =>
      series.forEach((point, i) => {
        const barX = (xScale(String(rows[i]![m.catKey])) ?? 0) + offset;
        const y0 = yScale(point[0]);
        const y1 = yScale(point[1]);
        const isNegative = point[0] < 0;
        const rounded = isNegative ? si === lastNegative[i] : si === lastPositive[i];
        bar(series.key, barX, Math.min(y0, y1), cappedWidth, Math.abs(y0 - y1), verticalBarRadii(BAR_RADIUS, isNegative, rounded));
      }),
    );
  } else {
    // "grouped" splits the band per series and caps each bar. Any other value
    // (genui hands over an explicit null as is) skips both: every series draws
    // across the whole band, as BarSeries does without an inner scale.
    const inner = o.grouped ? scaleBand<string>().domain(m.dataKeys).range([0, bandwidth]).padding(0.05) : null;
    const barWidth = inner ? Math.min(inner.bandwidth(), DEFAULT_MAX_BAR_WIDTH) : bandwidth;
    const offset = inner ? (inner.bandwidth() - barWidth) / 2 : 0;
    for (const row of rows) {
      const groupX = xScale(String(row[m.catKey])) ?? 0;
      for (const key of m.dataKeys) {
        const value = Number(row[key]) || 0;
        const zeroY = yScale(0);
        const valueY = yScale(value);
        bar(
          key,
          groupX + (inner?.(key) ?? 0) + offset,
          Math.min(valueY, zeroY),
          barWidth,
          Math.abs(valueY - zeroY),
          verticalBarRadii(BAR_RADIUS, value < 0, true),
        );
      }
    }
  }
  return [...fills].flatMap(([key, s]) => [
    { path: s.fill.build(), paint: m.colorMap[key]! },
    ...(s.lineCount ? [{ path: s.lines.build(), paint: INTERNAL_LINE_COLOR }] : []),
  ]);
}

/** useChartDimensions (fit), the scales and the series geometry. */
function computeLayout(
  t: Tokens,
  kind: Kind,
  rows: ChartRow[],
  m: SeriesModel,
  measurer: Measurer,
  o: { variant: string | null | undefined; width: number; svgHeight: number; yDomain: [number, number]; stacked: boolean; stackOffset: StackOffset },
): Layout {
  const labels = rows.map((r) => String(r[m.catKey]));
  const yAxisWidth =
    m.dataKeys.length > 0 ? measureYAxisWidth(scaleLinear().domain(o.yDomain).nice().ticks(), measurer.ctx) : DEFAULT_Y_AXIS_WIDTH;
  const chartWidth = Math.max(0, o.width - yAxisWidth);
  const labelLayout = layoutXAxisLabels(measurer.ctx, labels, {
    variant: "singleLine",
    slotWidth: rows.length > 0 ? chartWidth / rows.length : 0,
    maxHeight: (o.svgHeight - CHART_MARGIN_TOP) * MAX_X_AXIS_HEIGHT_SHARE,
    lineHeight: parseLineHeight(measurer.ctx.font),
    condensed: true,
    labelShare: kind === "bar" ? 1 - BAND_PADDING_INNER : 1,
  });
  const chartHeight = Math.max(0, o.svgHeight - CHART_MARGIN_TOP - labelLayout.height);
  const yScale = scaleLinear().domain(o.yDomain).range([chartHeight, 0]).nice();
  const xBand =
    kind === "bar"
      ? scaleBand<string>().domain(labels).range([0, chartWidth]).paddingInner(BAND_PADDING_INNER).paddingOuter(BAND_PADDING_OUTER)
      : null;
  const xPoint: ScalePoint<string> | null = xBand
    ? null
    : scalePoint<string>()
        .domain(labels)
        .range([labelLayout.slotWidth / 2, chartWidth - labelLayout.slotWidth / 2])
        .padding(0);
  const xs = labels.map((l) => (xBand ? xBand(l) : xPoint!(l)) ?? 0);
  const stackedData = o.stacked ? stackRows(rows, m.dataKeys, o.stackOffset) : null;

  // Inside the clip box, whose top is CLIP_OVERFLOW above the plot.
  const dy = CLIP_OVERFLOW;
  const plot: Painted[] = horizontalGrid(t, { scale: yScale, width: chartWidth, chartHeight, dy });
  const edges: Layout["edges"] = [];
  if (xBand) {
    plot.push(
      ...barSeries({
        rows,
        m,
        xScale: xBand,
        y: yScale,
        stacked: stackedData,
        grouped: o.variant === undefined || o.variant === "grouped",
        dy,
      }),
    );
  } else {
    const curve = seriesCurve(o.variant ?? undefined);
    const series = stackedData
      ? stackedData.map((s) => ({ key: s.key, base: s.map((p) => yScale(p[0])), edge: s.map((p) => yScale(p[1])) }))
      : m.dataKeys.map((key) => ({
          key,
          base: rows.map(() => yScale(0)),
          edge: rows.map((row) => yScale(Number(row[key]) || 0)),
        }));
    for (const s of series) {
      const color = m.colorMap[s.key]!;
      if (kind === "area") {
        const values = new Float64Array(rows.length * 4);
        rows.forEach((_, i) => values.set([xs[i]!, s.base[i]!, s.edge[i]!, s.edge[i]!], i * 4));
        // All-negative unstacked bands flip their fade (never in a stacked chart).
        const flip = !stackedData && rows.every((row) => (Number(row[s.key]) || 0) <= 0);
        // The gradient spans the area's own bounds (SVG objectBoundingBox).
        const ys = [...s.base, ...s.edge];
        const left = xs[0] ?? 0;
        const top = Math.min(...ys);
        plot.push({
          path: svgPath(PathBuilder.fill(), buildAreaD(values, curve), -left, -top).build(),
          paint: verticalGradient(alpha(color, GRADIENT_TOP_OPACITY), alpha(color, GRADIENT_BOTTOM_OPACITY), 5, 95, flip),
          box: { x: left, y: top + dy, w: (xs[rows.length - 1] ?? left) - left, h: Math.max(...ys) - top },
        });
        plot.push({ path: svgPath(PathBuilder.stroke(2), buildAreaEdgeD(values, curve), 0, dy).build(), paint: color });
      } else {
        const values = new Float64Array(rows.length * 2);
        rows.forEach((_, i) => values.set([xs[i]!, s.edge[i]!], i * 2));
        plot.push({ path: svgPath(PathBuilder.stroke(2), buildLineD(values, curve), 0, dy).build(), paint: color });
      }
      edges.push({ key: s.key, ys: s.edge });
    }
  }

  return {
    yAxisWidth,
    chartWidth,
    chartHeight,
    labelHeight: labelLayout.height,
    yTicks: yAxisTicks({ scale: yScale, width: yAxisWidth, chartHeight, top: CHART_MARGIN_TOP }),
    xLabels: condensedXAxis(measurer, {
      scale: (xBand ?? xPoint)! as ScaleBand<string> | ScalePoint<string>,
      interval: labelLayout.interval,
      labelWidth: labelLayout.labelWidth,
      maxLines: labelLayout.maxLines,
      labelHeight: labelLayout.height,
      chartWidth,
    }),
    plot,
    xs,
    bandwidth: xBand?.bandwidth() ?? 0,
    edges,
    findIndex: (x) => (xBand ? findBandIndex(xBand, x) : findNearestDataIndex(xPoint!, x)),
  };
}

function chartRender(kind: Kind, props: Props, ctx: RenderContext): Element | null {
  const rows = chart2DRows(props);
  if (!rows) return null;
  const t = ctx.t;
  const m = seriesModel(ctx, rows, PALETTE[kind]);
  const size = ctx.local({ width: 0, legendHeight: 0 }, "size");
  const hover = hoverState(ctx);
  const tick = typography(t, "label", "extra-small");
  const measurer = new Measurer(ctx, tick);

  // genui forwards `variant` and `height` as given: an explicit null reaches
  // the chart and defeats its "grouped"/"natural" defaults (see barSeries), and
  // a null height still counts as pinned for the legend fit.
  const variant: string | null | undefined = props.variant;
  const height: number | null | undefined = props.height;
  const stacked = kind === "bar" ? variant === "stacked" : kind === "area";
  const stackOffset: StackOffset = kind === "area" ? "none" : "sign";
  const xAxisLabel: string | undefined = props.xLabel || undefined;
  const yAxisLabel: string | undefined = props.yLabel || undefined;

  // What the layout measures, per data: labels, the y-axis ticks useYAxisWidth sizes for, legend entries.
  const dataKey = JSON.stringify([rows, [...m.hidden], stacked]);
  const wanted = memo(ctx, "wanted", dataKey, () => {
    const yDomain = computeYDomain(rows, m.dataKeys, stacked, stackOffset);
    return {
      yDomain,
      strings: [
        ...rows.map((r) => String(r[m.catKey])),
        ...scaleLinear().domain(yDomain).nice().ticks().map(numberTickFormatter),
        ...legendStrings(m.legendItems),
      ],
    };
  })!;
  measurer.want(wanted.strings);

  // useChartDimensions, fit layout.
  const resolvedHeight = typeof height === "number" ? height : DEFAULT_CHART_HEIGHT;
  const fitLegend = resolveShouldFitLegend(undefined, height as number | undefined);
  const svgHeight = Math.max(0, fitLegend ? resolvedHeight - size.legendHeight : resolvedHeight);
  const layout = memo(
    ctx,
    "layout",
    JSON.stringify([dataKey, kind, variant, size.width, svgHeight, widthsVersion(), t.mode, t.borderDefault]),
    () => computeLayout(t, kind, rows, m, measurer, { variant, width: size.width, svgHeight, yDomain: wanted.yDomain, stacked, stackOffset }),
    // Until text is measured keep the previous layout (none on a chart's first frame).
    measurer.charsReady && size.width > 0,
  );

  const svg = div().relative().w_full().h(svgHeight).flex_none();
  let content: Element = svg;
  if (layout) {
    const { index, visible } = shownIndex(hover, rows.length);
    const x = layout.xs[index] ?? 0;
    const followers: Element[] = [];
    if (kind === "bar") {
      // Crosshair: the hovered column's band, under the bars.
      followers.push(
        follower(ctx, hover, "band", { left: x, top: CLIP_OVERFLOW, visible, springs: ["left"] })
          .w(layout.bandwidth)
          .h(layout.chartHeight)
          .rounded(4)
          .bg(alpha(t.textNeutralPrimary, 0.04)),
      );
    }
    const plot = div()
      .absolute()
      .left(0)
      .top(-CLIP_OVERFLOW)
      .w(layout.chartWidth)
      .h(layout.chartHeight + CLIP_OVERFLOW)
      .overflow_hidden()
      .children(followers)
      .children(layout.plot.map(layer))
      // LineDotCrosshair: activeDots on, crosshair and highlight off (genui's defaults).
      .children(
        layout.edges.map((e) =>
          activeDot(ctx, hover, `dot-${e.key}`, x, (e.ys[index] ?? 0) + CLIP_OVERFLOW, m.colorMap[e.key]!, visible),
        ),
      );
    const plotBox = withHover(
      div().id(ctx.id("plot")).absolute().left(layout.yAxisWidth).top(CHART_MARGIN_TOP).w(layout.chartWidth).h(layout.chartHeight),
      hover,
      (px) => layout.findIndex(px),
      { x: layout.yAxisWidth, y: CHART_MARGIN_TOP },
    ).child(plot);
    const payload = tooltipPayload(rows, hover.index, m);
    content = svg
      .children(textItems(ctx, measurer, t.textNeutralSecondary, "y", layout.yTicks))
      .child(plotBox)
      .child(
        div()
          .absolute()
          .left(layout.yAxisWidth)
          .top(CHART_MARGIN_TOP + layout.chartHeight)
          .w(layout.chartWidth)
          .h(layout.labelHeight)
          .children(textItems(ctx, measurer, t.textNeutralSecondary, "x", layout.xLabels)),
      )
      .children(payload ? [chartTooltip(ctx, payload, hover)] : []);
  }

  // .openui-cartesian-{y,x}-axis-label: label extra-small, secondary; y above (padding-bottom s), x centered below.
  const caption = (text: string) => textStyle(div().text_color(t.textNeutralSecondary), tick).child(text);
  const probes = measurer.probes();
  return trackWidth(v_flex().id(ctx.id()).relative().w_full().overflow_hidden(), size)
    .children(yAxisLabel ? [caption(yAxisLabel).pb(t.spaceS)] : [])
    .child(content)
    .children(xAxisLabel ? [caption(xAxisLabel).w_full().text_center()] : [])
    .child(
      legendView(ctx, {
        items: m.legendItems,
        model: m,
        containerWidth: size.width,
        measurer,
        onHeight: (h, cx) => {
          if (h === size.legendHeight) return;
          size.legendHeight = h;
          cx.notify();
        },
      }),
    )
    .children(probes ? [probes] : []);
}

export const BarChart: Component = { render: (props, ctx) => chartRender("bar", props, ctx) };
export const LineChart: Component = { render: (props, ctx) => chartRender("line", props, ctx) };
export const AreaChart: Component = { render: (props, ctx) => chartRender("area", props, ctx) };

/** Series lives inside a chart's `series` prop; alone it renders nothing (as upstream). */
export const Series: Component = { render: () => null };
