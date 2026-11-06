// The part Pie and Radial share: one value per label (genui's 1D data), sorted
// and colored the way useCategoricalChartData does, the chart beside its
// stacked legend, and the hover that ties wedge and legend row together.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/Charts/{PieChart,RadialChart}.ts (the data preamble), genui-lib/helpers.ts
//   hooks/core/{useCategoricalChartData,usePerElementHover}.ts,
//   hooks/polar/useCategoricalChartOrchestrator.ts,
//   shared/core/StackedLegend/ChartWithStackedLegend.tsx and its scss,
//   shared/core/legend/{legendStore,legendSelectors}.ts (the store is the chart's
//   own `ctx.local` state: the chart and its legend always share one),
//   utils/polarUtils.ts (sortByValueDescending, getSliceStyle: compiled from the pin),
//   shared/core/ChartShell.tsx, shared/cartesian/chartBase.scss (centered containers)
//
// A chart gives `polarChart` a `shape`: its marks (filled paths in the svg's
// pixels), its size and a hit test. Layout is computed once per data and size
// and kept in `ctx.local`; hover redraws reuse it.
//
// gpui differences: the hover look of a mark (getSliceStyle) is its opacity,
// fading over 200ms, and a color scaled by the brightness filter, which
// switches at once. A path has no pointer events, so the hit test is the
// marks' geometry. Wedges slide on a native spring tuned to upstream's
// popOut preset.
import { h_flex, v_flex } from "gpui-base";
import { div, type Color, type Context, type Element, type Path } from "gpui-kit";
import { getSliceStyle, sortByValueDescending } from "openui-charts/utils/polarUtils";
import { asArray, buildSliceData } from "openui-genui-helpers";
import type { Props, RenderContext } from "../../render/surface.ts";
import type { Tokens } from "../../render/tokens.ts";
import { chartTooltip } from "./chrome.ts";
import { chartColors, memo, type ChartPaletteName, type ChartRow } from "./data.ts";
import { hoverState, withHover } from "./hover.ts";
import { layer } from "./paint.ts";
import { stackedLegend, STACKED_ROW_LAYOUT_HEIGHT, type StackedItem } from "./stackedLegend.ts";

/** STACKED_LEGEND_ROW_BREAKPOINT: from this width the chart and legend sit side by side. */
const ROW_BREAKPOINT = 400;
/** .chart-with-stacked-legend: gap between chart and legend. */
const LAYOUT_GAP = 20;
/** springPresets.popOut (stiffness 400, damping 25) as a response period and damping ratio. */
const POP_SPRING = { response: 314, damping: 0.625 };
/** POLAR_HOVER_TRANSITION: the dim fades over 200ms. */
const DIM_MS = 200;

/**
 * genui's 1D preamble: `labels` and `values` arrays make one row per label
 * (a non-number value counts 0); failing that, `labels` may hold Slice
 * elements. Null: nothing to draw.
 */
export function sliceRows(props: Props): ChartRow[] | null {
  const labels = asArray(props.labels);
  const values = asArray(props.values);
  if (labels.length > 0 && values.length > 0) {
    return labels.map((category, i) => ({
      category: category as string,
      value: typeof values[i] === "number" ? (values[i] as number) : 0,
    }));
  }
  const slices = buildSliceData(props.labels);
  return slices.length ? slices : null;
}

/** One wedge or bar's data: CategoricalSlice. */
export interface PolarSlice {
  label: string;
  value: number;
  color: Color;
}

/** A drawn mark: filled paths in the svg box's pixels. */
export interface Mark {
  fills: { path: Path; color: Color }[];
  /** A wedge slides this far when highlighted. */
  pop?: { x: number; y: number };
}

export interface PolarShape {
  width: number;
  height: number;
  /** One per visible slice, in order. */
  marks: Mark[];
  /** The visible slice under (x, y) in the svg box, if any. */
  find(x: number, y: number): number | null;
}

/** `Color` scaled by a CSS `brightness()` factor: each channel times `factor`, clamped. */
function brighten(color: Color, factor: number): Color {
  const channel = (at: number) =>
    Math.min(255, Math.round(parseInt(color.slice(at, at + 2), 16) * factor))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}${color.slice(7, 9)}` as Color;
}

/** The angle of (dx, dy) from 12 o'clock, clockwise (d3's convention), in (-π, π]. */
export function angleOf(dx: number, dy: number): number {
  return Math.atan2(dx, -dy);
}

/**
 * The chart's own legend store (legendStore + useLegendBridge): hidden slices
 * and the highlighted one. The chart sorts by value, colors by that order
 * over all slices, and shows the visible ones.
 */
function categorical(ctx: RenderContext, rows: ChartRow[], palette: ChartPaletteName) {
  const sorted = sortByValueDescending(rows, "value");
  const colors = chartColors(palette, sorted.length);
  const slices: PolarSlice[] = sorted.map((row, i) => ({
    label: String(row["category"]),
    value: Number(row["value"]) || 0,
    color: colors[i] ?? "#000000ff",
  }));
  const state = ctx.local({ hidden: new Set<string>(), active: null as string | null, fromChart: false }, "polar");
  // publish(): drop hidden keys that no longer exist, never hide everything, drop a stale active key.
  const keys = new Set(slices.map((s) => s.label));
  let hidden = [...state.hidden].filter((k) => keys.has(k));
  if (hidden.length >= slices.length) hidden = [];
  if (hidden.length !== state.hidden.size) state.hidden = new Set(hidden);
  if (state.active !== null && !keys.has(state.active)) state.active = null;
  return {
    slices,
    state,
    visible: slices.filter((s) => !state.hidden.has(s.label)),
    /** toggle(): at least one slice stays visible. */
    toggle(key: string, cx: Context) {
      const next = new Set(state.hidden);
      if (next.has(key)) next.delete(key);
      else {
        if (slices.length - state.hidden.size <= 1) return;
        next.add(key);
      }
      state.hidden = next;
      cx.notify();
    },
  };
}

/** What `polarChart` needs from a chart. */
export interface PolarOptions {
  rows: ChartRow[];
  palette: ChartPaletteName;
  /** semiCircular charts size from twice the available height. */
  semi: boolean;
  /** Anything but the data and size the shape depends on. */
  shapeKey: string;
  shape(slices: PolarSlice[], chartSize: number, t: Tokens): PolarShape;
}

/** useCategoricalChartOrchestrator's chart size: no height given, so 300 available. */
export function polarChartSize(containerWidth: number, semi: boolean): number {
  const availableHeight = 300;
  return Math.max(150, Math.min(500, containerWidth || 300, semi ? availableHeight * 2 : availableHeight));
}

export function polarChart(ctx: RenderContext, o: PolarOptions): Element {
  const t = ctx.t;
  const model = categorical(ctx, o.rows, o.palette);
  const { state, visible } = model;
  const size = ctx.local({ width: 0, chartWidth: 0 }, "size");
  const hover = hoverState(ctx);
  const isRow = size.width >= ROW_BREAKPOINT;

  // A slice hover highlights its legend row; leaving clears it (the store's setActive).
  const hovered = hover.index !== null && hover.index < visible.length ? hover.index : null;
  if (hovered !== null) {
    state.active = visible[hovered]!.label;
    state.fromChart = true;
  } else if (state.fromChart) {
    state.active = null;
    state.fromChart = false;
  }
  // The pointer's slice wins; else the legend's (keyToIndex).
  const legendIndex = state.active === null ? -1 : visible.findIndex((s) => s.label === state.active);
  const highlighted = hovered ?? (legendIndex < 0 ? null : legendIndex);

  const chartSize = polarChartSize(size.chartWidth, o.semi);
  const shape = memo(
    ctx,
    "shape",
    JSON.stringify([visible, chartSize, o.shapeKey, t.mode, t.sunk]),
    () => o.shape(visible, chartSize, t),
    size.chartWidth > 0,
  );

  let svg: Element = div().relative().flex_none().w(300).h(300);
  if (shape) {
    const marks = shape.marks.map((mark, i) => {
      const style = getSliceStyle(i, highlighted);
      const factor = Number(/brightness\(([\d.]+)\)/.exec(style.filter ?? "")?.[1] ?? 1);
      const lifted = mark.pop && highlighted === i ? mark.pop : { x: 0, y: 0 };
      let el = div()
        .id(ctx.id(`mark-${i}-${visible[i]!.label}`))
        .absolute()
        .left(lifted.x)
        .top(lifted.y)
        .w(shape.width)
        .h(shape.height)
        .opacity(style.fillOpacity ?? 1)
        .transition("opacity", { duration: DIM_MS, easing: "ease-in-out" });
      if (mark.pop) el = el.spring("left", POP_SPRING).spring("top", POP_SPRING);
      return el.children(
        mark.fills.map((f) => layer({ path: f.path, paint: factor === 1 ? f.color : brighten(f.color, factor) })),
      );
    });
    svg = withHover(
      div().id(ctx.id("svg")).relative().w(shape.width).h(shape.height).flex_none(),
      hover,
      shape.find,
    )
      .child(div().absolute().left(0).top(0).size_full().overflow_hidden().children(marks))
      .children(
        hovered === null
          ? []
          : [
              chartTooltip(
                ctx,
                { label: visible[hovered]!.label, items: [{ name: visible[hovered]!.label, value: visible[hovered]!.value, color: visible[hovered]!.color }] },
                hover,
              ),
            ],
      );
  }

  const chart = v_flex()
    .id(ctx.id("chart"))
    .relative()
    .w_full()
    .items_center()
    .on_size_change((s, cx) => {
      if (s.width === size.chartWidth) return;
      size.chartWidth = s.width;
      cx.notify();
    })
    .child(h_flex().justify_center().child(svg));

  const items: StackedItem[] = model.slices.map((s) => ({ key: s.label, label: s.label, color: s.color, value: s.value }));
  const legend = (extra: { containerWidth?: number; height?: number }) =>
    stackedLegend(ctx, {
      items,
      activeKey: state.active,
      hidden: state.hidden,
      onEnter(key, cx) {
        state.active = key;
        state.fromChart = false;
        cx.notify();
      },
      onLeave(key, cx) {
        if (state.active !== key) return;
        state.active = null;
        cx.notify();
      },
      onToggle: model.toggle,
      ...extra,
    });

  const root = isRow
    ? h_flex()
        .w_full()
        .relative()
        .gap(LAYOUT_GAP)
        .items_center()
        .min_h(STACKED_ROW_LAYOUT_HEIGHT)
        .child(div().flex_1().min_w_0().child(chart))
        .child(
          div()
            .flex_1()
            .min_w_0()
            .h(STACKED_ROW_LAYOUT_HEIGHT)
            .flex()
            .items_center()
            .justify_center()
            .child(legend({ height: STACKED_ROW_LAYOUT_HEIGHT })),
        )
    : v_flex()
        .w_full()
        .relative()
        .gap(LAYOUT_GAP)
        .items_center()
        .child(div().w_full().min_w_0().child(chart))
        .child(div().w_full().flex().justify_center().items_start().child(legend({ containerWidth: size.width })));
  return root.id(ctx.id()).on_size_change((s, cx) => {
    if (s.width === size.width) return;
    size.width = s.width;
    cx.notify();
  });
}
