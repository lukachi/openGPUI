// Axes, grids and positioned label text.
//
// Ported from react-ui at the pinned commit:
//   shared/cartesian/axes/{YAxis,CondensedXAxis,NumericXAxis}.tsx,
//   shared/cartesian/{Grid,VerticalGrid}.tsx, shared/cartesian/chartBase.scss
//   (svg-tick-label: label extra-small, text-neutral-secondary; dashed 3 3 grid
//   lines in border-default, a solid zero line when the domain spans negatives).
//
// Each axis is computed once per layout as data (`TextItem`s, `Painted`
// paths) that a chart caches; `textAt`/`textItems` draw the data on every
// render.
//
// gpui has no SVG text: a label is a div placed so its text sits where the
// SVG `<text>` would. `text-anchor` becomes a zero-width box the text
// overflows to one side or both; `dominant-baseline` an offset of the line
// box by Inter's metrics (where the browser puts that baseline). A truncated
// label's full text shows in gpui's own tooltip instead of react-ui's
// LabelTooltip.
import type { ScaleBand, ScaleLinear, ScalePoint } from "d3-scale";
import { div, PathBuilder, type Color, type Element } from "gpui-kit";
import { resolveTickCount } from "openui-charts/utils/constants";
import { truncateToWidth, wrapLabelLines } from "openui-charts/utils/labelWrap";
import { numberTickFormatter } from "openui-charts/utils/styleUtils";
import { X_AXIS_TOP_GAP } from "openui-charts/utils/xAxisLabelLayout";
import type { RenderContext } from "../../render/surface.ts";
import { textStyle, type Tokens } from "../../render/tokens.ts";
import type { Measurer } from "./measure.ts";
import { segment, type Painted } from "./paint.ts";

/**
 * Inter's vertical metrics (em): where a browser puts SVG baselines. The
 * hanging baseline of a font without a BASE table is 0.8 of the ascent above
 * the alphabetic one (Blink); `middle` is half the x-height above it.
 */
const INTER_ASCENT = 0.96875;
const INTER_DESCENT = 0.2421875;
const INTER_X_HEIGHT = 0.546;

export type Anchor = "start" | "middle" | "end";
export type Baseline = "hanging" | "middle" | "auto";

/** An SVG `<text x y text-anchor dominant-baseline>` with tspan lines `lineHeight` apart. */
export interface TextItem {
  x: number;
  y: number;
  anchor: Anchor;
  baseline: Baseline;
  lines: string[];
  /** A truncated label: its full text and the box that shows it on hover. */
  tooltip?: { text: string; x: number; y: number; w: number; h: number };
}

/** Draw a `TextItem` in the measurer's style. */
export function textAt(m: Measurer, color: Color, o: TextItem): Element {
  const size = m.style.size;
  // Line box top → alphabetic baseline: half-leading plus ascent.
  const baselineOffset = (m.lineHeight - (INTER_ASCENT + INTER_DESCENT) * size) / 2 + INTER_ASCENT * size;
  const raise =
    o.baseline === "hanging" ? 0.8 * INTER_ASCENT * size : o.baseline === "middle" ? (INTER_X_HEIGHT / 2) * size : 0;
  let box = div().absolute().left(o.x).top(o.y + raise - baselineOffset).w(0).flex().flex_col();
  box = o.anchor === "start" ? box.items_start() : o.anchor === "end" ? box.items_end() : box.items_center();
  return box.children(
    o.lines.map((line) => textStyle(div().flex_none().whitespace_nowrap().text_color(color), m.style).child(line)),
  );
}

/** Draw `items` (and the hover boxes of truncated ones). `part` keeps their ids apart. */
export function textItems(ctx: RenderContext, m: Measurer, color: Color, part: string, items: TextItem[]): Element[] {
  const out: Element[] = [];
  items.forEach((item, i) => {
    const tip = item.tooltip;
    if (tip) out.push(div().id(ctx.id(`${part}-${i}`)).absolute().left(tip.x).top(tip.y).w(tip.w).h(tip.h).tooltip(tip.text));
    out.push(textAt(m, color, item));
  });
  return out;
}

/** YAxis: tick values right-aligned 8px left of the plot, centered on their gridline. */
export function yAxisTicks(o: {
  scale: ScaleLinear<number, number>;
  width: number;
  chartHeight: number;
  top: number;
  tickCount?: number;
}): TextItem[] {
  return o.scale.ticks(resolveTickCount(o.chartHeight, o.tickCount)).map((tick) => ({
    x: o.width - 8,
    y: o.top + o.scale(tick),
    anchor: "end",
    baseline: "middle",
    lines: [numberTickFormatter(tick)],
  }));
}

/** Grid: dashed horizontal lines at the y ticks; the zero line solid when the domain spans negatives. */
export function horizontalGrid(
  t: Tokens,
  o: { scale: ScaleLinear<number, number>; width: number; chartHeight: number; tickCount?: number; dy?: number },
): Painted[] {
  const ticks = o.scale.ticks(resolveTickCount(o.chartHeight, o.tickCount));
  const spansNegative = (o.scale.domain()[0] ?? 0) < 0;
  const dashed = PathBuilder.stroke(1).dash_array([3, 3]);
  const solid = PathBuilder.stroke(1);
  let dashes = 0;
  let solids = 0;
  const dy = o.dy ?? 0;
  for (const tick of ticks) {
    const y = o.scale(tick) + dy;
    if (spansNegative && tick === 0) {
      segment(solid, 0, y, o.width, y);
      solids++;
    } else {
      segment(dashed, 0, y, o.width, y);
      dashes++;
    }
  }
  return [
    ...(dashes ? [{ path: dashed.build(), paint: t.borderDefault }] : []),
    ...(solids ? [{ path: solid.build(), paint: t.borderDefault }] : []),
  ];
}

/** VerticalGrid: dashed vertical lines at the value ticks (~one per 60px). */
export function verticalGrid(t: Tokens, o: { scale: ScaleLinear<number, number>; chartWidth: number; height: number }): Painted | null {
  const ticks = o.scale.ticks(Math.max(2, Math.floor(o.chartWidth / 60)));
  if (!ticks.length) return null;
  const b = PathBuilder.stroke(1).dash_array([3, 3]);
  for (const tick of ticks) segment(b, o.scale(tick), 0, o.scale(tick), o.height);
  return { path: b.build(), paint: t.borderDefault };
}

/**
 * NumericXAxis: value ticks centered on their x (~one per 60px), vertically
 * centered in the band; `edgeAlign` anchors the first at its start and the
 * last at its end so neither clips.
 */
export function numericXAxis(o: { scale: ScaleLinear<number, number>; chartWidth: number; height: number; edgeAlign?: boolean }): TextItem[] {
  const ticks = o.scale.ticks(Math.max(2, Math.floor(o.chartWidth / 60)));
  return ticks.map((tick, i) => ({
    x: o.scale(tick),
    y: o.height / 2,
    anchor: o.edgeAlign ? (i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle") : "middle",
    baseline: "middle",
    lines: [numberTickFormatter(tick)],
  }));
}

/**
 * CondensedXAxis, horizontal labels: every `interval`-th category label,
 * centered under its category inside a `labelWidth` box cut at the plot's
 * ends, wrapped to `maxLines` or truncated with an ellipsis. Coordinates are
 * the axis band's (its top is the plot's bottom).
 */
export function condensedXAxis(
  m: Measurer,
  o: {
    scale: ScaleBand<string> | ScalePoint<string>;
    interval: number;
    labelWidth: number;
    maxLines: number;
    labelHeight: number;
    chartWidth: number;
  },
): TextItem[] {
  const band = "paddingInner" in o.scale ? (o.scale as ScaleBand<string>) : null;
  const out: TextItem[] = [];
  o.scale.domain().forEach((category, i) => {
    if (i % o.interval !== 0) return;
    const label = String(category);
    const cx = (o.scale(category) ?? 0) + (band ? band.bandwidth() / 2 : 0);
    const left = Math.max(0, cx - o.labelWidth / 2);
    const right = Math.min(o.chartWidth, cx + o.labelWidth / 2);
    const lines =
      o.maxLines > 1 ? wrapLabelLines(m.ctx, label, right - left, o.maxLines) : [truncateToWidth(m.ctx, label, right - left)];
    const truncated = lines.some((line) => line.endsWith("…"));
    const half = Math.max(...lines.map((line) => m.width(line))) / 2;
    out.push({
      x: Math.min(Math.max(cx, left + half), right - half),
      y: X_AXIS_TOP_GAP,
      anchor: "middle",
      baseline: "hanging",
      lines,
      ...(truncated ? { tooltip: { text: label, x: left, y: 0, w: right - left, h: o.labelHeight } } : {}),
    });
  });
  return out;
}
