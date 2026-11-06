// RadarChart: one polygon per series over a spider grid, one axis per category.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/Charts/RadarChart.ts (contract)
//   components/Charts/RadarChart/{RadarChart.tsx,radarChart.scss},
//   RadarChart/parts/{RadarGrid,RadarSeries,RadarAxisLabels}.tsx,
//   hooks/polar/useRadarChartOrchestrator.ts, shared/core/ChartShell.tsx,
//   utils/{polarUtils,radarLabelLayout}.ts (compiled from the pin)
//
// genui renders upstream's defaults: polygon grid of 5 levels, "line"
// variant (outlines, fill opacity 0), no vertex dots, active dots on hover.
// The layout (grid, polygons, labels) is computed once per data, width and
// measured widths and kept in `ctx.local`.
//
// gpui differences: hover follows upstream's hit area, the series polygons
// (their fill is painted at opacity 0, hit-tested nonzero like SVG fill);
// grid lines and labels, which also catch the pointer upstream, do not.
import { scaleLinear } from "d3-scale";
import { h_flex, v_flex } from "gpui-base";
import { div, PathBuilder, type Element } from "gpui-kit";
import { truncateToWidth, wrapLabelLines } from "openui-charts/utils/labelWrap";
import { radarAxisAngle } from "openui-charts/utils/polarUtils";
import { MIN_RADAR_LABEL_BUDGET, radarLabelLayout } from "openui-charts/utils/radarLabelLayout";
import type { Component } from "../../render/surface.ts";
import { typography, type Tokens } from "../../render/tokens.ts";
import { textItems, type Baseline, type TextItem } from "./axes.ts";
import { chartTooltip, legendStrings, legendView } from "./chrome.ts";
import { chart2DRows, memo, seriesModel, tooltipPayload, type ChartRow, type SeriesModel } from "./data.ts";
import { activeDot, hoverState, shownIndex, trackWidth, withHover } from "./hover.ts";
import { Measurer } from "./measure.ts";
import { layer, type Painted } from "./paint.ts";
import { widthsVersion } from "./widths.ts";

const GRID_LEVELS = 5;
const MAX_CHART_SIZE = 500;
const MIN_CHART_SIZE = 150;
const BASELINE: Record<"top" | "middle" | "bottom", Baseline> = { top: "hanging", middle: "middle", bottom: "auto" };

type Point = { x: number; y: number };

interface Layout {
  chartSize: number;
  center: number;
  painted: Painted[];
  /** Per series: its vertices around the center. */
  series: { key: string; vertices: Point[] }[];
  labels: TextItem[];
}

/** Nonzero winding test (SVG's default fill-rule), around the origin-relative `poly`. */
function inside(x: number, y: number, poly: Point[]): boolean {
  let winding = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!;
    const b = poly[i]!;
    const cross = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y);
    if (a.y <= y) {
      if (b.y > y && cross > 0) winding++;
    } else if (b.y <= y && cross < 0) winding--;
  }
  return winding !== 0;
}

function computeLayout(t: Tokens, rows: ChartRow[], m: SeriesModel, measurer: Measurer, containerWidth: number): Layout {
  // useRadarChartOrchestrator: no height given, so the chart is at most 300px square.
  const chartSize = Math.max(MIN_CHART_SIZE, Math.min(MAX_CHART_SIZE, containerWidth || 300, 300));
  const center = chartSize / 2;
  const maxRadius = chartSize * 0.35;
  let maxValue = 0;
  for (const row of rows) for (const key of m.dataKeys) maxValue = Math.max(maxValue, Number(row[key]) || 0);
  const radialScale = scaleLinear().domain([0, maxValue || 1]).range([0, maxRadius]);
  const numAxes = rows.length;
  const angle = (i: number) => radarAxisAngle(i, numAxes);

  // RadarGrid: polygon rings and spokes in border-interactive.
  const grid = PathBuilder.stroke(1);
  for (let level = 1; level <= GRID_LEVELS; level++) {
    const r = (level / GRID_LEVELS) * maxRadius;
    grid.add_polygon(
      Array.from({ length: numAxes }, (_, i) => [center + r * Math.cos(angle(i)), center + r * Math.sin(angle(i))] as const),
      true,
    );
  }
  for (let i = 0; i < numAxes; i++) {
    grid.move_to(center, center).line_to(center + maxRadius * Math.cos(angle(i)), center + maxRadius * Math.sin(angle(i)));
  }

  const series = m.dataKeys.map((key) => ({
    key,
    vertices: rows.map((row, i) => {
      const r = radialScale(Number(row[key]) || 0);
      return { x: r * Math.cos(angle(i)), y: r * Math.sin(angle(i)) };
    }),
  }));
  // RadarSeries: outlines, stroke 2 (the "line" variant's fill is opacity 0).
  const painted: Painted[] = [
    { path: grid.build(), paint: t.borderInteractive },
    ...series.map((s) => ({
      path: PathBuilder.stroke(2)
        .add_polygon(s.vertices.map((v) => [center + v.x, center + v.y] as const), true)
        .build(),
      paint: m.colorMap[s.key]!,
    })),
  ];

  // RadarAxisLabels: budgets against the container, wrapped or truncated.
  const lineHeight = measurer.lineHeight;
  const labels: TextItem[] = [];
  rows.forEach((row, i) => {
    const label = String(row[m.catKey]);
    const layout = radarLabelLayout(i, numAxes, { chartSize, maxRadius, containerWidth, lineHeight });
    if (layout.maxWidth < MIN_RADAR_LABEL_BUDGET) return;
    const lines =
      layout.maxLines === 1
        ? [truncateToWidth(measurer.ctx, label, layout.maxWidth)]
        : wrapLabelLines(measurer.ctx, label, layout.maxWidth, layout.maxLines);
    const firstDy =
      layout.vAlign === "top" ? 0 : layout.vAlign === "bottom" ? -(lines.length - 1) * lineHeight : (-(lines.length - 1) / 2) * lineHeight;
    const x = center + layout.x;
    const y = center + layout.y;
    let tooltip: TextItem["tooltip"];
    if (lines.some((line) => line.endsWith("…"))) {
      const w = Math.max(...lines.map((line) => measurer.width(line)));
      const h = lines.length * lineHeight;
      tooltip = {
        text: label,
        x: layout.hAlign === "start" ? x : layout.hAlign === "end" ? x - w : x - w / 2,
        y: layout.vAlign === "top" ? y : layout.vAlign === "bottom" ? y - h : y - h / 2,
        w,
        h,
      };
    }
    labels.push({ x, y: y + firstDy, anchor: layout.hAlign, baseline: BASELINE[layout.vAlign], lines, ...(tooltip ? { tooltip } : {}) });
  });

  return { chartSize, center, painted, series, labels };
}

export const RadarChart: Component = {
  render(props, ctx) {
    const rows = chart2DRows(props);
    if (!rows) return null;
    const t = ctx.t;
    const m = seriesModel(ctx, rows, "radarChartPalette");
    const size = ctx.local({ width: 0 }, "size");
    const hover = hoverState(ctx);
    const measurer = new Measurer(ctx, typography(t, "label", "extra-small"));
    measurer.want(rows.map((r) => String(r[m.catKey]))).want(legendStrings(m.legendItems));

    const layout = memo(
      ctx,
      "layout",
      JSON.stringify([rows, [...m.hidden], size.width, widthsVersion(), t.mode, t.borderInteractive]),
      () => computeLayout(t, rows, m, measurer, size.width),
      measurer.charsReady && size.width > 0,
    );

    let svg: Element = div().relative().flex_none().w(300).h(300);
    if (layout) {
      const { center } = layout;
      const { index, visible } = shownIndex(hover, rows.length);
      const numAxes = rows.length;
      svg = withHover(
        div().id(ctx.id("radar-svg")).relative().w(layout.chartSize).h(layout.chartSize).flex_none(),
        hover,
        (px, py) => {
          const mx = px - center;
          const my = py - center;
          if (numAxes === 0 || !layout.series.some((s) => inside(mx, my, s.vertices))) return null;
          let a = Math.atan2(my, mx) + Math.PI / 2;
          if (a < 0) a += 2 * Math.PI;
          return Math.round(a / ((2 * Math.PI) / numAxes)) % numAxes;
        },
      )
        .children(layout.painted.map(layer))
        // The hovered axis gets an active dot where each series crosses it.
        .children(
          layout.series.map((s) => {
            const v = s.vertices[index] ?? { x: 0, y: 0 };
            return activeDot(ctx, hover, `dot-${s.key}`, center + v.x, center + v.y, m.colorMap[s.key]!, visible);
          }),
        )
        .children(textItems(ctx, measurer, t.textNeutralSecondary, "label", layout.labels));
      const payload = tooltipPayload(rows, hover.index, m);
      if (payload) svg = svg.child(chartTooltip(ctx, payload, hover));
    }

    const probes = measurer.probes();
    return trackWidth(v_flex().id(ctx.id()).relative().w_full().items_center(), size)
      .child(h_flex().w_full().justify_center().child(svg))
      .child(legendView(ctx, { items: m.legendItems, model: m, containerWidth: size.width, measurer }))
      .children(probes ? [probes] : []);
  },
};
