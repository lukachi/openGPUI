// Chart data as react-ui's hooks derive it: the rows a genui chart builds,
// series keys and their visibility, distributed palette colors, legend items,
// the tooltip payload for a hovered row.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/helpers.ts (buildChartData, compiled from the pin),
//   hooks/core/{useChartData,useSeriesVisibility,useTooltipPayload}.ts,
//   utils/{dataUtils,paletteUtils}.ts (compiled from the pin).
import type { Color, Context } from "gpui-kit";
import { buildChartData, hasAllProps } from "openui-genui-helpers";
import { getDataKeys } from "openui-charts/utils/dataUtils";
import { getDistributedColors, resolvePalette } from "openui-charts/utils/paletteUtils";
import type { Props, RenderContext } from "../../render/surface.ts";
import { cssColor } from "../../render/tokens.ts";
import { toggleHidden } from "./visibility.ts";

export type ChartRow = Record<string, string | number>;

/** ThemeProvider ChartColorPalette keys: the per-chart palette a chart asks for. */
export type ChartPaletteName =
  | "defaultChartPalette"
  | "barChartPalette"
  | "lineChartPalette"
  | "areaChartPalette"
  | "pieChartPalette"
  | "radarChartPalette"
  | "radialChartPalette"
  | "horizontalBarChartPalette";

/** The genui categorical key every chart passes as `categoryKey`. */
export const CATEGORY_KEY = "category";

/**
 * genui's 2D chart preamble: null (render nothing) until `labels` and `series`
 * are both present, and when they build no rows.
 */
export function chart2DRows(props: Props): ChartRow[] | null {
  if (!hasAllProps(props, "labels", "series")) return null;
  const rows = buildChartData(props.labels, props.series);
  return rows.length ? rows : null;
}

export interface LegendItem {
  key: string;
  label: string;
  color: Color;
  /** Pie/radial legends show a share. */
  percentage?: number;
}

export interface SeriesModel {
  catKey: string;
  /** Every series, in data order. */
  allDataKeys: string[];
  /** The series not hidden through the legend. */
  dataKeys: string[];
  hidden: ReadonlySet<string>;
  /** Series key → color, by its index among all series (toggling never recolors). */
  colorMap: Record<string, Color>;
  legendItems: LegendItem[];
  /** useSeriesVisibility's toggle: at least one series always stays visible. */
  toggle(key: string, cx: Context): void;
}

/**
 * Distributed colors for `count` series from the chart's palette. The theme
 * defines no chart palettes, so this is react-ui's OCEAN_DEFAULT ramp unless
 * `customPalette` is given.
 */
export function chartColors(paletteName: ChartPaletteName, count: number, customPalette?: string[]): Color[] {
  const ramp = resolvePalette({}, paletteName, customPalette);
  return getDistributedColors(ramp, count).map((c) => cssColor(c) ?? "#000000ff");
}

/** useChartData: keys, visibility, colors and legend items for row data. */
export function seriesModel(ctx: RenderContext, rows: ChartRow[], paletteName: ChartPaletteName): SeriesModel {
  const catKey = CATEGORY_KEY;
  const allDataKeys = getDataKeys(rows, catKey);
  const state = ctx.local<{ hidden: Set<string> }>({ hidden: new Set() }, "series");
  const dataKeys = allDataKeys.filter((k) => !state.hidden.has(k));
  const colors = chartColors(paletteName, allDataKeys.length);
  const colorMap: Record<string, Color> = {};
  allDataKeys.forEach((key, i) => (colorMap[key] = colors[i] ?? "#000000ff"));
  return {
    catKey,
    allDataKeys,
    dataKeys,
    hidden: state.hidden,
    colorMap,
    legendItems: allDataKeys.map((key) => ({ key, label: key, color: colorMap[key]! })),
    toggle(key, cx) {
      const next = toggleHidden(state.hidden, allDataKeys, key);
      if (!next) return;
      state.hidden = next;
      cx.notify();
    },
  };
}

/**
 * The same model for series that are named datasets rather than row columns
 * (ScatterChart: useScatterChartOrchestrator's colorMap and useSeriesVisibility
 * over the dataset names). Colors go by index among all names; a repeated name
 * is one series, as upstream keys everything by name.
 */
export function keyedSeriesModel(ctx: RenderContext, names: string[], paletteName: ChartPaletteName): SeriesModel {
  const state = ctx.local<{ hidden: Set<string> }>({ hidden: new Set() }, "series");
  const colors = chartColors(paletteName, names.length);
  const colorMap: Record<string, Color> = {};
  names.forEach((name, i) => (colorMap[name] = colors[i] ?? "#000000ff"));
  return {
    catKey: CATEGORY_KEY,
    allDataKeys: names,
    dataKeys: names.filter((k) => !state.hidden.has(k)),
    hidden: state.hidden,
    colorMap,
    legendItems: names.map((key) => ({ key, label: key, color: colorMap[key]! })),
    toggle(key, cx) {
      const next = toggleHidden(state.hidden, names, key);
      if (!next) return;
      state.hidden = next;
      cx.notify();
    },
  };
}

export interface TooltipItem {
  name: string;
  /** Numbers go through tooltipNumberFormatter; strings show as they are. */
  value: number | string;
  color: Color;
}

export interface TooltipPayload {
  label: string;
  items: TooltipItem[];
}

/** useTooltipPayload: the hovered row's label and one item per visible series. */
export function tooltipPayload(rows: ChartRow[], index: number | null, m: SeriesModel): TooltipPayload | null {
  if (index === null || index >= rows.length) return null;
  const row = rows[index]!;
  return {
    label: String(row[m.catKey]),
    items: m.dataKeys.map((key) => ({ name: key, value: Number(row[key]) || 0, color: m.colorMap[key]! })),
  };
}

/**
 * `compute()`, kept in `ctx.local` until `key` changes: what a chart derives
 * from its data and size (scales, label layout, built paths) is computed once,
 * not again on every hover redraw. While `ready` is false (e.g. text not
 * measured yet) it returns the last value, or null, instead of computing.
 */
export function memo<T>(ctx: RenderContext, part: string, key: string, compute: () => T, ready = true): T | null {
  const slot = ctx.local<{ key: string | null; value: T | null }>({ key: null, value: null }, part);
  if (slot.key !== key && ready) {
    slot.value = compute();
    slot.key = key;
  }
  return slot.value;
}
