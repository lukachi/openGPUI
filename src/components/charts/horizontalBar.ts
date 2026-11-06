// HorizontalBarChart: one labeled row per category, bars growing from the
// value-zero line, a fixed value axis below a vertically scrolling body.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/Charts/HorizontalBarChart.ts (contract)
//   components/Charts/BarChart/{HorizontalBarChart.tsx,horizontalBarChart.scss}
//   BarChart/parts/{HorizontalBarChartImpl,HorizontalBarSeries,HorizontalCrosshair}.tsx,
//   BarChart/parts/horizontalBarGeometry.ts (compiled from the pin),
//   hooks/cartesian/useHorizontalBarChartOrchestrator.ts,
//   shared/cartesian/{VerticalGrid,axes/NumericXAxis}.tsx,
//   shared/cartesian/ScrollButtonsVertical/{ScrollButtonsVertical.tsx,scrollButtonsVertical.scss}
//
// The layout (rows, scale, built paths) is computed once per data and width
// and kept in `ctx.local`; hover and scroll redraws reuse it.
//
// gpui differences: the body's vertical scroll is an offset the chart owns
// (gpui-kit cannot scroll a div from code): wheel and trackpad move it, the
// chevrons step it row by row with a 300ms ease-in-out slide (upstream's
// smooth `scrollTo`), and there is no scrollbar, as upstream hides it. At
// either end the wheel passes on to the page, as a browser chains it.
import { scaleLinear } from "d3-scale";
import { h_flex, v_flex } from "gpui-base";
import { div, PathBuilder, type Context, type Element, type ScrollWheelEvent } from "gpui-kit";
import {
  BAR_GAP,
  BAR_HEIGHT,
  BAR_RADIUS,
  barValue,
  contentHeight as computeContentHeight,
  groupHeight as computeGroupHeight,
  LINE_PADDING,
  nearestSnap,
  radiusArray,
  rowOffsets as computeRowOffsets,
  showInternalLine,
  snapPositions as computeSnapPositions,
  stackSegments,
  valueDomain,
  verticalPadding,
  X_AXIS_HEIGHT,
} from "openui-charts/BarChart/parts/horizontalBarGeometry";
import { roundedBarPath } from "openui-charts/shared/cartesian/roundedBarPath";
import { DEFAULT_CHART_HEIGHT } from "openui-charts/utils/constants";
import { parseLineHeight } from "openui-charts/utils/labelWrap";
import type { Component } from "../../render/surface.ts";
import { alpha, cssColor, textStyle, typography, type Tokens } from "../../render/tokens.ts";
import { iconButton } from "../buttons.ts";
import { numericXAxis, textItems, verticalGrid, type TextItem } from "./axes.ts";
import { chartTooltip, legendStrings, legendView } from "./chrome.ts";
import { chart2DRows, memo, seriesModel, type ChartRow, type SeriesModel, type TooltipItem } from "./data.ts";
import { follower, hoverState, shownIndex, trackWidth, withHover } from "./hover.ts";
import { Measurer } from "./measure.ts";
import { layer, type Painted } from "./paint.ts";
import { svgPath } from "./pathData.ts";

/** Small left/right inset so the zero line isn't flush with the container. */
const AXIS_PAD = 2;
/** .openui-chart-vertical-scroll-buttons-container: 36px wide, 44px shorter than the chart. */
const SCROLL_COLUMN_WIDTH = 36;
const SCROLL_COLUMN_INSET = 44;

type Variant = "grouped" | "stacked";

interface Layout {
  chartWidth: number;
  groupHeight: number;
  svgHeight: number;
  offsets: number[];
  snaps: number[];
  grid: Painted | null;
  /** Per row: its bars and internal lines (dimmed together on hover). */
  rows: Painted[][];
  axis: TextItem[];
}

function computeLayout(
  t: Tokens,
  rows: ChartRow[],
  m: SeriesModel,
  o: { variant: Variant; chartWidth: number; labelHeight: number; bodyHeight: number },
): Layout {
  const { variant, chartWidth, labelHeight } = o;
  const groupHeight = computeGroupHeight(m.dataKeys.length, variant, labelHeight);
  const contentHeight = computeContentHeight(rows.length, groupHeight);
  const pad = verticalPadding(contentHeight, o.bodyHeight);
  const offsets = computeRowOffsets(rows.length, groupHeight, pad.top);
  const svgHeight = pad.top + contentHeight + pad.bottom;
  const [domainMin, domainMax] = valueDomain(rows, m.dataKeys, variant);
  const valueScale = scaleLinear()
    .domain([domainMin, domainMax])
    .nice()
    .range([AXIS_PAD, Math.max(AXIS_PAD, chartWidth - AXIS_PAD)]);
  const zeroX = valueScale(0);
  const internalLineColor = cssColor(t.mode === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)")!;

  const rowPaths = rows.map((row, i): Painted[] => {
    const barsTop = (offsets[i] ?? 0) + labelHeight;
    const fills = new Map<string, PathBuilder>();
    const lines = PathBuilder.stroke(1);
    let lineCount = 0;
    const bar = (key: string, x: number, y: number, width: number, radii: [number, number, number, number]) => {
      let b = fills.get(key);
      if (!b) fills.set(key, (b = PathBuilder.fill()));
      svgPath(b, roundedBarPath(x, y, width, BAR_HEIGHT, radii));
      if (showInternalLine(width)) {
        lines.move_to(x + LINE_PADDING, y + BAR_HEIGHT / 2).line_to(x + width - LINE_PADDING, y + BAR_HEIGHT / 2);
        lineCount++;
      }
    };
    if (variant === "stacked") {
      const { positives, negatives } = stackSegments(row, m.dataKeys);
      for (const group of [positives, negatives]) {
        let cumulative = 0;
        for (const seg of group) {
          const start = valueScale(cumulative);
          cumulative += seg.value;
          const end = valueScale(cumulative);
          bar(seg.key, Math.min(start, end), barsTop, Math.abs(end - start), radiusArray("stacked", BAR_RADIUS, seg.isFirst, seg.isLast, seg.isNegative));
        }
      }
    } else {
      m.dataKeys.forEach((key, j) => {
        const value = barValue(row[key]);
        const valueX = valueScale(value);
        bar(key, Math.min(zeroX, valueX), barsTop + j * (BAR_HEIGHT + BAR_GAP), Math.abs(valueX - zeroX), radiusArray("grouped", BAR_RADIUS, false, false, value < 0));
      });
    }
    return [
      ...[...fills].map(([key, b]) => ({ path: b.build(), paint: m.colorMap[key]! })),
      ...(lineCount ? [{ path: lines.build(), paint: internalLineColor }] : []),
    ];
  });

  return {
    chartWidth,
    groupHeight,
    svgHeight,
    offsets,
    snaps: computeSnapPositions(rows.length, groupHeight),
    grid: verticalGrid(t, { scale: valueScale, chartWidth, height: svgHeight }),
    rows: rowPaths,
    axis: numericXAxis({ scale: valueScale, chartWidth, height: X_AXIS_HEIGHT, edgeAlign: true }),
  };
}

export const HorizontalBarChart: Component = {
  render(props, ctx) {
    const rows = chart2DRows(props);
    if (!rows) return null;
    const t = ctx.t;
    const m = seriesModel(ctx, rows, "barChartPalette");
    // A null or unknown variant takes the grouped branches, as upstream's.
    const variant: Variant = props.variant === "stacked" ? "stacked" : "grouped";
    const size = ctx.local({ width: 0 }, "size");
    const scroll = ctx.local({ offset: 0, smooth: false }, "scroll");
    const hover = hoverState(ctx);
    const xs = typography(t, "label", "extra-small");
    const measurer = new Measurer(ctx, xs).want(legendStrings(m.legendItems));
    const xAxisLabel: string | undefined = props.xLabel || undefined;
    const yAxisLabel: string | undefined = props.yLabel || undefined;

    // Orchestrator geometry. genui passes no height: the chart is 296px and the legend sits below.
    const labelHeight = Math.max(Math.ceil(parseLineHeight(measurer.ctx.font)) + 8, 24);
    const chartHeight = DEFAULT_CHART_HEIGHT;
    const bodyHeight = Math.max(0, chartHeight - X_AXIS_HEIGHT);
    const needsScroll =
      computeContentHeight(rows.length, computeGroupHeight(m.dataKeys.length, variant, labelHeight)) > bodyHeight;
    // The measured inner body sits left of the scroll-buttons column.
    const chartWidth = Math.max(0, size.width - (needsScroll ? SCROLL_COLUMN_WIDTH : 0));
    const layout = memo(
      ctx,
      "layout",
      JSON.stringify([rows, [...m.hidden], variant, chartWidth, t.mode, t.borderDefault]),
      () => computeLayout(t, rows, m, { variant, chartWidth, labelHeight, bodyHeight }),
      size.width > 0,
    );

    // What the body shows: the chart less the axis band (40px, its 1px border and 2xs padding).
    const visibleBody = Math.max(0, chartHeight - X_AXIS_HEIGHT - 1 - t.space2xs);
    const maxOffset = layout ? Math.max(0, layout.svgHeight - visibleBody) : 0;
    const offset = Math.min(Math.max(0, scroll.offset), maxOffset);
    const scrollTo = (next: number, smooth: boolean, cx: Context) => {
      scroll.offset = Math.min(Math.max(0, next), maxOffset);
      scroll.smooth = smooth;
      cx.notify();
    };

    const inner: Element[] = [];
    if (layout) {
      const { index, visible } = shownIndex(hover, rows.length);
      const hovered = hover.index !== null && hover.index < rows.length ? hover.index : null;
      if (layout.grid) inner.push(layer(layout.grid));
      // HorizontalCrosshair: the hovered row's band, behind the rows.
      inner.push(
        follower(ctx, hover, "band", { left: 0, top: layout.offsets[index] ?? 0, visible, springs: ["top"] })
          .w(layout.chartWidth)
          .h(layout.groupHeight)
          .rounded(4)
          .bg(alpha(t.textNeutralPrimary, 0.04)),
      );
      rows.forEach((row, i) => {
        // .openui-horizontal-bar-chart-category-label: secondary label xs, ellipsis, padding-left m; never dimmed.
        inner.push(
          textStyle(div(), xs)
            .absolute()
            .left(0)
            .top(layout.offsets[i] ?? 0)
            .w(layout.chartWidth)
            .h(labelHeight)
            .flex()
            .items_center()
            .pl(t.spaceM)
            .text_color(t.textNeutralSecondary)
            .overflow_hidden()
            .whitespace_nowrap()
            .text_ellipsis()
            .child(String(row[m.catKey])),
        );
        // Hover dims the other rows' bars and lines to 0.4.
        const opacity = hovered === null || hovered === i ? 1 : 0.4;
        inner.push(...(layout.rows[i] ?? []).map((p) => layer(p).opacity(opacity)));
      });
    }

    const content = div()
      .id(ctx.id("hbar-content"))
      .relative()
      .w(layout?.chartWidth ?? 0)
      .h(layout?.svgHeight ?? 0)
      .top(-offset)
      .when(scroll.smooth, (el) => el.transition("top", { duration: 300, easing: "ease-in-out" }))
      .children(inner);

    const body = withHover(
      div()
        .id(ctx.id("hbar-body"))
        .relative()
        .w_full()
        .flex_1()
        .min_h_0()
        .overflow_hidden()
        .on_scroll_wheel((e: ScrollWheelEvent, cx) => {
          const next = Math.min(Math.max(0, offset - e.delta.y), maxOffset);
          if (next === offset) return; // at an end: the page scrolls
          cx.stop_propagation();
          scrollTo(next, false, cx);
        }),
      hover,
      (_x, y) => {
        if (!layout) return null;
        const my = y + offset;
        const found = layout.offsets.findIndex((top) => my >= top && my < top + layout.groupHeight);
        return found < 0 ? null : found;
      },
    ).child(content);

    const axis = div()
      .relative()
      .w_full()
      .flex_none()
      .border_t_1()
      .border_color(t.borderDefault)
      .pt(t.space2xs)
      .child(
        div()
          .relative()
          .w_full()
          .h(X_AXIS_HEIGHT)
          .children(layout ? textItems(ctx, measurer, t.textNeutralSecondary, "axis", layout.axis) : []),
      );

    const canUp = offset > 0;
    const canDown = offset < maxOffset - 1;
    const scrollButton = (dir: "up" | "down", enabled: boolean) => {
      const el = iconButton(ctx, {
        id: ctx.id(`hbar-scroll-${dir}`),
        icon: dir === "up" ? "ChevronUp" : "ChevronDown",
        variant: "secondary",
        size: "extra-small",
        disabled: !enabled,
        onClick: (cx) => scrollTo(layout ? (layout.snaps[nearestSnap(layout.snaps, offset, dir)] ?? 0) : 0, true, cx),
      }).bg(t.foreground);
      return enabled ? el : el.invisible();
    };
    const scrollColumn =
      needsScroll && (canUp || canDown)
        ? [
            v_flex()
              .w(SCROLL_COLUMN_WIDTH)
              .h(chartHeight - SCROLL_COLUMN_INSET)
              .flex_none()
              .justify_between()
              .items_center()
              .pl(t.space2xs)
              .child(scrollButton("up", canUp))
              .child(scrollButton("down", canDown)),
          ]
        : [];

    const hoveredRow = hover.index !== null ? rows[hover.index] : undefined;
    const items: TooltipItem[] = hoveredRow
      ? m.dataKeys.map((key) => ({ name: key, value: barValue(hoveredRow[key]), color: m.colorMap[key]! }))
      : [];
    const probes = measurer.probes();
    return trackWidth(v_flex().id(ctx.id()).relative().w_full(), size)
      .child(
        h_flex()
          .relative()
          .w_full()
          .h(chartHeight)
          .items_start()
          .overflow_hidden()
          .child(v_flex().relative().flex_1().min_w_0().h_full().child(body).child(axis))
          .children(scrollColumn)
          .children(hoveredRow ? [chartTooltip(ctx, { label: String(hoveredRow[m.catKey]), items }, hover)] : []),
      )
      .child(legendView(ctx, { items: m.legendItems, model: m, containerWidth: chartWidth, measurer, xAxisLabel, yAxisLabel }))
      .children(probes ? [probes] : []);
  },
};
