// Types for react-ui's pure chart modules, compiled from the pin through the
// `openui-charts/<path>` alias (scripts/upstream-plugin.ts, CHART_PURE). Only
// what opengpui calls is declared; the signatures are upstream's. Functions
// that measure text take a canvas-like `TextMeasure` (charts/measure.ts).

declare module "openui-charts/utils/constants" {
  export const CHART_MARGIN_TOP: number;
  export const MIN_TICK_SPACING: number;
  export const DEFAULT_CHART_HEIGHT: number;
  export const SINGLE_LINE_BREAKPOINT: number;
  export function resolveTickCount(chartHeight: number, override?: number): number;
}

declare module "openui-charts/utils/yDomain" {
  export type StackOffset = "sign" | "none";
  export function computeYDomain(
    data: Array<Record<string, string | number>>,
    dataKeys: string[],
    stacked: boolean,
    stackOffset?: StackOffset,
  ): [number, number];
}

declare module "openui-charts/utils/labelWrap" {
  type TextMeasure = { font: string; measureText(text: string): { width: number } };
  export const MAX_LABEL_LINES: number;
  export function parseLineHeight(fontShorthand: string): number;
  export function truncateToWidth(ctx: TextMeasure, text: string, maxWidth: number): string;
  export function wrapLabelLines(ctx: TextMeasure, text: string, maxWidth: number, maxLines?: number): string[];
}

declare module "openui-charts/utils/xAxisLabelLayout" {
  type TextMeasure = { font: string; measureText(text: string): { width: number } };
  export const MAX_X_AXIS_HEIGHT_SHARE: number;
  export const X_AXIS_TOP_GAP: number;
  export const ANGLED_LABEL_ROTATION: number;
  export interface XAxisLabelLayout {
    angle: number;
    interval: number;
    labelWidth: number;
    maxLines: number;
    height: number;
    slotWidth: number;
  }
  export interface XAxisLabelLayoutOptions {
    variant: "singleLine" | "multiLine" | "angled";
    slotWidth: number;
    maxHeight: number;
    lineHeight: number;
    condensed: boolean;
    visibleWidth?: number;
    labelShare?: number;
  }
  export function layoutXAxisLabels(ctx: TextMeasure, labels: string[], options: XAxisLabelLayoutOptions): XAxisLabelLayout;
}

declare module "openui-charts/utils/styleUtils" {
  type TextMeasure = { font: string; measureText(text: string): { width: number } };
  export function numberTickFormatter(value: number): string;
  export function measureYAxisWidth(
    ticks: number[],
    context: TextMeasure,
    options?: { minWidth?: number; maxWidth?: number; padding?: number },
  ): number;
}

declare module "openui-charts/utils/paletteUtils" {
  export const OCEAN_DEFAULT: string[];
  export const DIVERGING_DEFAULT_LIGHT: string[];
  export const DIVERGING_DEFAULT_DARK: string[];
  export function getDistributedColors(colors: string[], dataLength: number): string[];
  export function resolvePalette(
    theme: Record<string, string[] | undefined>,
    themePaletteName: string,
    customPalette?: string[],
  ): string[];
}

declare module "openui-charts/utils/colorLuminance" {
  export const LUMINANCE_TEXT_PIVOT: number;
  export function relativeLuminanceFromRgb(r: number, g: number, b: number): number;
}

declare module "openui-charts/utils/resolveShouldFitLegend" {
  export function resolveShouldFitLegend(fitLegendInHeight: boolean | undefined, height: number | string | undefined): boolean;
}

declare module "openui-charts/utils/dataUtils" {
  export function getDataKeys(data: Array<Record<string, string | number>>, categoryKey: string): string[];
}

declare module "openui-charts/utils/mouseUtils" {
  import type { ScaleBand, ScalePoint } from "d3-scale";
  export function findNearestDataIndex(xScale: ScalePoint<string>, mouseX: number): number;
  export function findBandIndex(xScale: ScaleBand<string>, mouseX: number): number;
}

declare module "openui-charts/utils/polarUtils" {
  export function radarAxisAngle(index: number, total: number): number;
  export function radarLabelAnchor(angle: number): "start" | "middle" | "end";
  export function formatPercentage(value: number, total: number): string;
  export function sortByValueDescending<T extends Array<Record<string, string | number>>>(data: T, dataKey: string): T;
  /** The hover look of a wedge or radial bar: `fillOpacity` and a `brightness(n)` filter, as CSS. */
  export function getSliceStyle(index: number, hoveredIndex: number | null): { fillOpacity?: number; filter?: string };
}

declare module "openui-charts/utils/radarLabelLayout" {
  export const MIN_RADAR_LABEL_BUDGET: number;
  export interface RadarLabelLayout {
    x: number;
    y: number;
    hAlign: "start" | "middle" | "end";
    vAlign: "top" | "middle" | "bottom";
    maxWidth: number;
    maxLines: 1 | 2;
  }
  export function radarLabelPadding(chartSize: number, lineHeight: number): number;
  export function radarLabelLayout(
    index: number,
    numAxes: number,
    geom: { chartSize: number; maxRadius: number; containerWidth: number; lineHeight: number },
  ): RadarLabelLayout;
}

declare module "openui-charts/shared/cartesian/roundedBarPath" {
  export const MIN_BAR_WIDTH: number;
  export function roundedBarPath(x: number, y: number, w: number, h: number, radii: [number, number, number, number]): string;
}

declare module "openui-charts/shared/cartesian/seriesGeometry" {
  import type { CurveFactory } from "d3-shape";
  export const LINE_STRIDE: number;
  export const AREA_STRIDE: number;
  export function seriesCurve(variant: string | undefined): CurveFactory;
  export function buildLineD(values: ArrayLike<number>, curve: CurveFactory): string;
  export function buildAreaD(values: ArrayLike<number>, curve: CurveFactory): string;
  export function buildAreaEdgeD(values: ArrayLike<number>, curve: CurveFactory): string;
}

declare module "openui-charts/BarChart/parts/verticalBarRadii" {
  export function verticalBarRadii(radius: number, isNegative: boolean, rounded: boolean): [number, number, number, number];
}

declare module "openui-charts/BarChart/parts/horizontalBarGeometry" {
  type Variant = "grouped" | "stacked";
  export const BAR_HEIGHT: number;
  export const BAR_GAP: number;
  export const GROUP_PADDING: number;
  export const SINGLE_ROW_MIN: number;
  export const X_AXIS_HEIGHT: number;
  export const BAR_RADIUS: number;
  export const MIN_LINE_DIMENSION: number;
  export const LINE_PADDING: number;
  export interface StackSegment {
    key: string;
    value: number;
    isNegative: boolean;
    isFirst: boolean;
    isLast: boolean;
  }
  export function groupHeight(seriesCount: number, variant: Variant, labelHeight: number): number;
  export function contentHeight(rowCount: number, groupHeight: number): number;
  export function verticalPadding(contentHeight: number, bodyHeight: number): { top: number; bottom: number };
  export function rowOffsets(rowCount: number, groupHeight: number, topPad: number): number[];
  export function snapPositions(rowCount: number, groupHeight: number): number[];
  export function nearestSnap(positions: number[], current: number, dir: "up" | "down"): number;
  export function barValue(raw: unknown): number;
  export function valueDomain(
    data: Array<Record<string, string | number>>,
    dataKeys: string[],
    variant: Variant,
  ): [number, number];
  export function stackSegments(
    rowValues: Record<string, string | number>,
    dataKeys: string[],
  ): { positives: StackSegment[]; negatives: StackSegment[] };
  export function radiusArray(
    variant: Variant,
    radius: number,
    isFirst: boolean,
    isLast: boolean,
    isNegative: boolean,
  ): [number, number, number, number];
  export function showInternalLine(barWidth: number): boolean;
}

declare module "openui-charts/shared/core/PortalTooltip/utils" {
  export function tooltipNumberFormatter(value: number): string;
}

declare module "openui-charts/hooks/cartesian/useStackedData" {
  import type { Series } from "d3-shape";
  export function stackOffsetDivergingZeroPreserving(
    series: Series<Record<string, string | number>, string>[],
    order: Iterable<number>,
  ): void;
}

declare module "openui-charts/shared/core/StackedLegend/stackedLegendLayout" {
  export type StackedLegendLayout = "auto" | "showMore" | "scrollable";
  export const LEGEND_ITEM_LIMIT: number;
  export const SHOW_MORE_BREAKPOINT: number;
  export function resolveStackedLegendLayout(
    layout: StackedLegendLayout,
    containerWidth: number | undefined,
    itemCount: number,
  ): { isShowMore: boolean; isScrollable: boolean };
  export function formatStackedValue(value: number, total: number, format: "percentage" | "number"): string;
}

declare module "openui-charts/SegmentedBar/parts/segmentedBarGeometry" {
  export function segmentValue(raw: string | number | undefined): number;
  export function segmentShare(value: number, total: number): number;
}

declare module "openui-charts/hooks/cartesian/useXBandScale" {
  export const BAND_PADDING_INNER: number;
  export const BAND_PADDING_OUTER: number;
}

// genui-lib/helpers.ts: how a genui chart turns `labels` + `series` into rows.
declare module "openui-genui-helpers" {
  export function hasAllProps(obj: Record<string, unknown>, ...keys: string[]): boolean;
  export function asArray(v: unknown): unknown[];
  export function buildChartData(labels: unknown, series: unknown): Record<string, string | number>[];
  export function buildSliceData(slices: unknown): Record<string, string | number>[];
}
