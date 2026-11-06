// ScatterChart: numeric x/y points, one color per dataset.
// ScatterSeries and Point: prop values; render nothing.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/Charts/{ScatterChart,ScatterSeries,Point}.ts (contract)
//   components/Charts/ScatterChart/{ScatterChart.tsx,scatterChart.scss,types.ts},
//   ScatterChart/parts/ScatterDots.tsx,
//   hooks/cartesian/useScatterChartOrchestrator.ts,
//   shared/cartesian/{Grid,VerticalGrid,axes/YAxis,axes/NumericXAxis}.tsx (charts/axes.ts),
//   shared/core/ChartShell.tsx, shared/cartesian/chartBase.scss
//
// genui renders upstream's defaults: both grids and the y-axis on, dot radius 4,
// the legend (it toggles datasets; genui passes no axis labels, so none show),
// entrance animation off, 296px tall. Both scales are linear over all datasets
// (hidden ones too, so toggling never rescales) and niced. The pointer snaps
// to the nearest visible dot within 30px; the tooltip lists X and Y.
//
// gpui differences: a dot is a `foreground` disc around the fill disc (the SVG
// circle's 1.5px stroke centered on its edge); a dataset's dots dim as a
// group (0.3) over 150ms, and the hovered dot grows to 1.5 times its radius at
// once, as gpui cannot animate `r`. The layout (scales, axes, grids, dot
// positions) is computed once per data and width and kept in `ctx.local`.
// Building a dot's two boxes costs about 4µs of script (12ms for 3000 dots,
// measured in Herdr), and a tooltip redraws on every pointer move; past
// DOT_BOXES_MAX dots a dataset's dots are instead two cached paths (fills, then
// 1.5px rings), where overlapping dots show their rings over each other's
// fills (upstream layers each dot whole), and only the hovered dot is a box.
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { v_flex } from "gpui-base";
import { div, PathBuilder, type Element } from "gpui-kit";
import { CHART_MARGIN_TOP, DEFAULT_CHART_HEIGHT } from "openui-charts/utils/constants";
import { measureYAxisWidth, numberTickFormatter } from "openui-charts/utils/styleUtils";
import { asArray, hasAllProps } from "openui-genui-helpers";
import type { Component, Props } from "../../render/surface.ts";
import { typography, type Tokens } from "../../render/tokens.ts";
import { horizontalGrid, numericXAxis, textItems, verticalGrid, yAxisTicks, type TextItem } from "./axes.ts";
import { chartTooltip, legendStrings, legendView } from "./chrome.ts";
import { keyedSeriesModel, memo, memoInPump, type SeriesModel } from "./data.ts";
import { hoverState, trackWidth, withHover } from "./hover.ts";
import { Measurer } from "./measure.ts";
import { circle, layer, type Painted } from "./paint.ts";
import { widthsVersion } from "./widths.ts";

const SNAP_RADIUS = 30;
const X_AXIS_HEIGHT = 28;
const DOT_RADIUS = 4;
/** .openui-scatter-chart-dot: stroke-width, in the foreground color. */
const DOT_RING = 1.5;
const HOVER_GROWTH = 1.5;
const DIM = 0.3;
/** More visible dots than this are drawn as cached paths. */
const DOT_BOXES_MAX = 1000;
/** Room around the plot a path layer keeps for dots on its edge. */
const PATH_PAD = 12;

interface Dataset {
  name: string;
  data: { x: number; y: number; z?: number }[];
}

/** genui's `unwrap`: an element's props, or the plain object. */
function unwrap(node: unknown): Record<string, unknown> | undefined {
  if (typeof node !== "object" || node === null) return undefined;
  const fields = node as { type?: unknown; props?: Record<string, unknown> };
  return fields.type === "element" ? fields.props : (node as Record<string, unknown>);
}

/** ScatterChart's genui preamble: the datasets as the component takes them. Null: nothing to draw. */
function datasets(props: Props): Dataset[] | null {
  if (!hasAllProps(props, "datasets")) return null;
  const data = asArray(props.datasets).map((ds) => {
    const dsProps = unwrap(ds);
    return {
      name: String(dsProps?.["name"] ?? ""),
      data: asArray(dsProps?.["points"]).map((pt) => {
        const ptProps = unwrap(pt);
        return {
          x: Number(ptProps?.["x"]),
          y: Number(ptProps?.["y"]),
          ...(ptProps?.["z"] != null ? { z: Number(ptProps["z"]) } : {}),
        };
      }),
    };
  });
  return data.length ? data : null;
}

/**
 * datasets() and its JSON (the memo key), kept per evaluated `datasets` value: for
 * thousands of points both cost several milliseconds, on every hover redraw, of the
 * ~50 ms gpui-shell lets a render run. The session evaluates a new value when its data changes.
 */
const parsed = new WeakMap<object, { data: Dataset[] | null; dataJson: string }>();
function parsedDatasets(props: Props): { data: Dataset[] | null; dataJson: string } {
  const source: unknown = props.datasets;
  const cached = typeof source === "object" && source !== null ? parsed.get(source) : undefined;
  if (cached) return cached;
  const data = datasets(props);
  const entry = { data, dataJson: data ? JSON.stringify(data) : "" };
  if (typeof source === "object" && source !== null) parsed.set(source, entry);
  return entry;
}

/** A visible, finite dot: where it is in the plot, and what it says. */
interface Dot {
  dataset: number;
  name: string;
  /** Its index among its dataset's points. */
  index: number;
  x: number;
  y: number;
  /** The point's values. */
  vx: number;
  vy: number;
}

interface Layout {
  yAxisWidth: number;
  chartWidth: number;
  chartHeight: number;
  svgHeight: number;
  grid: Painted[];
  yTicks: TextItem[];
  xTicks: TextItem[];
  /** Visible datasets' dots, in drawing order (the hover index counts these). */
  dots: Dot[];
  /** The same dots per visible dataset; `painted` (past DOT_BOXES_MAX dots) is the dataset's cached fills and rings. */
  groups: { dataset: number; dots: Dot[]; painted?: Painted[] }[];
}

function computeLayout(t: Tokens, data: Dataset[], m: SeriesModel, measurer: Measurer, width: number): Layout {
  // Domain from all datasets, so toggling one never rescales.
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const ds of data) {
    for (const pt of ds.data) {
      if (pt.x < xMin) xMin = pt.x;
      if (pt.x > xMax) xMax = pt.x;
      if (pt.y < yMin) yMin = pt.y;
      if (pt.y > yMax) yMax = pt.y;
    }
  }
  if (!isFinite(xMin)) {
    xMin = 0;
    xMax = 100;
    yMin = 0;
    yMax = 100;
  }

  const yAxisWidth = measureYAxisWidth(scaleLinear().domain([yMin, yMax]).nice().ticks(), measurer.ctx);
  // No height is given, so the chart is DEFAULT_CHART_HEIGHT tall and the legend sits below it.
  const chartHeight = Math.max(0, DEFAULT_CHART_HEIGHT - CHART_MARGIN_TOP - X_AXIS_HEIGHT);
  const chartWidth = Math.max(0, width - yAxisWidth);
  const xScale: ScaleLinear<number, number> = scaleLinear().domain([xMin, xMax]).range([0, chartWidth]).nice();
  const yScale: ScaleLinear<number, number> = scaleLinear().domain([yMin, yMax]).range([chartHeight, 0]).nice();

  const grid: Painted[] = [];
  if (chartWidth > 0) {
    grid.push(...horizontalGrid(t, { scale: yScale, width: chartWidth, chartHeight }));
    const vertical = verticalGrid(t, { scale: xScale, chartWidth, height: chartHeight });
    if (vertical) grid.push(vertical);
  }

  const dots: Dot[] = [];
  const groups: Layout["groups"] = [];
  data.forEach((ds, dataset) => {
    if (m.hidden.has(ds.name)) return;
    const own: Dot[] = [];
    ds.data.forEach((pt, index) => {
      const x = xScale(pt.x);
      const y = yScale(pt.y);
      // A dot at NaN draws nothing (and is never nearest).
      if (Number.isFinite(x) && Number.isFinite(y)) own.push({ dataset, name: ds.name, index, x, y, vx: pt.x, vy: pt.y });
    });
    for (const dot of own) dots.push(dot);
    groups.push({ dataset, dots: own });
  });
  if (dots.length > DOT_BOXES_MAX) {
    // Fills, then the 1.5px rings over them, each one path per dataset in a box with room for edge dots.
    const box = { x: -PATH_PAD, y: -PATH_PAD, w: chartWidth + 2 * PATH_PAD, h: chartHeight + 2 * PATH_PAD };
    for (const group of groups) {
      const fill = PathBuilder.fill();
      const ring = PathBuilder.stroke(DOT_RING);
      for (const dot of group.dots) {
        circle(fill, dot.x + PATH_PAD, dot.y + PATH_PAD, DOT_RADIUS);
        circle(ring, dot.x + PATH_PAD, dot.y + PATH_PAD, DOT_RADIUS);
      }
      group.painted = [
        { path: fill.build(), paint: m.colorMap[data[group.dataset]!.name]!, box },
        { path: ring.build(), paint: t.foreground, box },
      ];
    }
  }

  return {
    yAxisWidth,
    chartWidth,
    chartHeight,
    svgHeight: CHART_MARGIN_TOP + chartHeight + X_AXIS_HEIGHT,
    grid,
    yTicks: yAxisTicks({ scale: yScale, width: yAxisWidth, chartHeight, top: CHART_MARGIN_TOP }),
    xTicks: numericXAxis({ scale: xScale, chartWidth, height: X_AXIS_HEIGHT }),
    dots,
    groups,
  };
}

export const ScatterChart: Component = {
  render(props, ctx) {
    const { data, dataJson } = parsedDatasets(props);
    if (!data) return null;
    const t = ctx.t;
    const m = keyedSeriesModel(
      ctx,
      data.map((ds) => ds.name),
      "defaultChartPalette",
    );
    const size = ctx.local({ width: 0 }, "size");
    const hover = hoverState(ctx);
    const measurer = new Measurer(ctx, typography(t, "label", "extra-small"));

    // What the layout measures: the y ticks useScatterChartOrchestrator sizes the axis for, and the legend.
    const wanted = memo(ctx, "wanted", dataJson, () => {
      let yMin = Infinity;
      let yMax = -Infinity;
      for (const ds of data) {
        for (const pt of ds.data) {
          if (pt.y < yMin) yMin = pt.y;
          if (pt.y > yMax) yMax = pt.y;
        }
      }
      if (!isFinite(yMin)) {
        yMin = 0;
        yMax = 100;
      }
      return scaleLinear().domain([yMin, yMax]).nice().ticks().map(numberTickFormatter);
    })!;
    measurer.want(wanted).want(legendStrings(m.legendItems));

    // Laying out and building paths for thousands of dots, on top of drawing them, ran past
    // the ~50 ms gpui-shell lets a render run (scatter-3k was interrupted): past DOT_BOXES_MAX
    // dots it happens in the pump, and meanwhile the previous layout shows only if it is
    // of the same data (another width, hidden set or theme). Smaller charts lay out here.
    const layoutKey = `${dataJson}|${[...m.hidden].join("\u0000")}|${size.width}|${widthsVersion()}|${t.mode}|${t.borderDefault}|${t.foreground}`;
    const layoutReady = measurer.charsReady && size.width > 0;
    const compute = () => computeLayout(t, data, m, measurer, size.width);
    const large = data.reduce((n, ds) => n + ds.data.length, 0) > DOT_BOXES_MAX;
    const layout = large ? memoInPump(ctx, "layout-pump", layoutKey, dataJson, compute, layoutReady) : memo(ctx, "layout", layoutKey, compute, layoutReady);

    let svg: Element = div().relative().w_full().h(DEFAULT_CHART_HEIGHT).flex_none();
    if (layout) {
      const hovered = hover.index !== null ? layout.dots[hover.index] : undefined;
      const dotBox = (dot: Dot) => {
        // The SVG circle with its stroke: a ring in the foreground color, centered on radius r, around the fill.
        // Upstream keys the grow by dataset name and point index, so datasets sharing a name grow together.
        const r = hovered && hovered.name === dot.name && hovered.index === dot.index ? DOT_RADIUS * HOVER_GROWTH : DOT_RADIUS;
        const outer = r + DOT_RING / 2;
        const inner = r - DOT_RING / 2;
        return div()
          .absolute()
          .left(dot.x - outer)
          .top(dot.y - outer)
          .w(2 * outer)
          .h(2 * outer)
          .rounded_full()
          .bg(t.foreground)
          .flex()
          .items_center()
          .justify_center()
          .child(div().w(2 * inner).h(2 * inner).flex_none().rounded_full().bg(m.colorMap[dot.name]!));
      };
      // ScatterDots: a group per visible dataset; the others dim while a dot is hovered. A dataset with
      // cached paths draws only its hovered dot as boxes.
      const groups = layout.groups.map(({ dataset, dots, painted }) => {
        const dim = hovered && hovered.name !== data[dataset]!.name ? DIM : 1;
        const grown = hovered && hovered.name === data[dataset]!.name ? dots.find((dot) => dot.index === hovered.index) : undefined;
        return div()
          .id(ctx.id(`dots-${dataset}`))
          .absolute()
          .left(0)
          .top(0)
          .size_full()
          .opacity(dim)
          .transition("opacity", { duration: 150, easing: "ease-in-out" })
          .children(painted ? painted.map(layer) : dots.map(dotBox))
          .children(painted && grown ? [dotBox(grown)] : []);
      });

      const plot = withHover(
        div().id(ctx.id("plot")).absolute().left(layout.yAxisWidth).top(CHART_MARGIN_TOP).w(layout.chartWidth).h(layout.chartHeight),
        hover,
        (x, y) => {
          let best = -1;
          let nearest = Infinity;
          layout.dots.forEach((dot, i) => {
            const dist = Math.hypot(x - dot.x, y - dot.y);
            if (dist < nearest) {
              nearest = dist;
              best = i;
            }
          });
          return best >= 0 && nearest <= SNAP_RADIUS ? best : null;
        },
        { x: layout.yAxisWidth, y: CHART_MARGIN_TOP },
      )
        .children(layout.grid.map(layer))
        .children(groups);

      svg = svg
        .children(textItems(ctx, measurer, t.textNeutralSecondary, "y", layout.yTicks))
        .child(plot)
        .child(
          div()
            .absolute()
            .left(layout.yAxisWidth)
            .top(CHART_MARGIN_TOP + layout.chartHeight)
            .w(layout.chartWidth)
            .h(X_AXIS_HEIGHT)
            .children(textItems(ctx, measurer, t.textNeutralSecondary, "x", layout.xTicks)),
        )
        .children(
          hovered
            ? [
                chartTooltip(
                  ctx,
                  {
                    label: hovered.name,
                    items: [
                      { name: "X", value: hovered.vx, color: m.colorMap[hovered.name]! },
                      { name: "Y", value: hovered.vy, color: m.colorMap[hovered.name]! },
                    ],
                  },
                  hover,
                ),
              ]
            : [],
        );
    }

    const probes = measurer.probes();
    return trackWidth(v_flex().id(ctx.id()).relative().w_full().items_center(), size)
      .child(svg)
      .child(legendView(ctx, { items: m.legendItems, model: m, containerWidth: size.width, measurer }))
      .children(probes ? [probes] : []);
  },
};

/** ScatterSeries lives inside ScatterChart's `datasets`; alone it renders nothing (as upstream). */
export const ScatterSeries: Component = { render: () => null };

/** Point lives inside a ScatterSeries; alone it renders nothing (as upstream). */
export const Point: Component = { render: () => null };
