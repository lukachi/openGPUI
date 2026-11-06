/// <reference path="./pinned.d.ts" />
// Charts: react-ui's 2D charts and the foundation later chart ports build on.
//
// Components (registered in components/index.ts under "Charts (2D)"):
//   BarChart, LineChart, AreaChart  cartesian.ts  (genui *Condensed: the fit layout)
//   HorizontalBarChart              horizontalBar.ts
//   RadarChart                      radar.ts
//   Series                          cartesian.ts  (a prop value; renders nothing)
//
// Foundation API, for Pie, Radial, SingleStackedBar, Scatter and the rest.
// The shape every chart follows (cartesian.ts is the full example):
//
//   rows → seriesModel → Measurer.want(strings) → memo(ctx, "layout", key,
//   computeLayout, measurer.charsReady && width > 0) → draw the cached layout
//   (built paths, text items) + followers and tooltip from the hover state.
//
// The key covers data, hidden series, size, `widthsVersion()` and the theme
// colors used, so a hover redraw reuses the layout and only places followers.
//
// - Upstream logic compiles from the pin, never copied: import react-ui's
//   pure chart modules as `openui-charts/<path under components/Charts>`
//   (allowed paths: CHART_PURE in scripts/upstream-plugin.ts; declare what you
//   use in pinned.d.ts) and genui's builders from `openui-genui-helpers`
//   (buildChartData, buildSliceData, hasAllProps). d3-scale and d3-shape are
//   real (upstream's lockfile versions). CHART_PURE admits whole files, but
//   some exports in them need React or the DOM and are stubs or dead here:
//   `paletteUtils.useChartPalette` (use `chartColors`), and
//   `colorLuminance.getColorLuminance`, which returns null without `document`.
//   For label contrast use `relativeLuminanceFromRgb` on the channels of a
//   `cssColor()` result, against LUMINANCE_TEXT_PIVOT.
// - data.ts: `chart2DRows(props)` (genui's 2D preamble: null renders nothing),
//   `seriesModel(ctx, rows, paletteName)` (keys, legend toggling with
//   useSeriesVisibility's rule, colors by series index), `chartColors()`
//   (getDistributedColors over the palette; the theme has no chart palettes,
//   so OCEAN_DEFAULT), `tooltipPayload()`, `memo()` (per-chart cache in
//   ctx.local), LegendItem/TooltipItem types.
// - measure.ts: `Measurer`, the canvas `measureText` stand-in. `want()` every
//   string the layout measures, lay out once `charsReady` (strings not probed
//   whole yet measure as character sums and refine when their probe lands,
//   via `widthsVersion()` in the layout key), pass `measurer.ctx` to upstream
//   helpers that take a CanvasRenderingContext2D, and put `measurer.probes()`
//   in the tree. widths.ts holds the gpui-free width cache.
// - pathData.ts: `svgPath(builder, d)` replays any SVG path data into a
//   PathBuilder (gpui-free, tested). paint.ts: `Painted` (a built Path, its
//   paint, an optional box), `layer()` draws one; `circle`, `segment`,
//   `verticalGradient` (a gradient spans the painted box, so give gradient
//   fills a box at the shape's bounds, as SVG's objectBoundingBox).
// - axes.ts: axes as data (`TextItem`, `Painted`): `yAxisTicks`,
//   `horizontalGrid`, `verticalGrid`, `numericXAxis`, `condensedXAxis`;
//   `textItems`/`textAt` draw SVG `<text>` (anchor, dominant-baseline) as
//   placed divs.
// - hover.ts: `hoverState`, `withHover(el, state, find)` (redraws only when
//   the item or, while shown, the pointer changes), `shownIndex` (the last
//   item while fading out), `follower` (FadeFollower), `activeDot`,
//   `trackWidth`, CROSSHAIR_SPRING / TOOLTIP_SPRING / FADE_MS.
// - chrome.ts: `legendView` (DefaultLegend with its fit and "N more" rules,
//   percentages for 1D charts, axis captions) and `chartTooltip` (ChartTooltip
//   in a Popup, `right-start` or `top`, flipped and shifted at window edges).
export { AreaChart, BarChart, LineChart, Series } from "./cartesian.ts";
export { HorizontalBarChart } from "./horizontalBar.ts";
export { RadarChart } from "./radar.ts";
