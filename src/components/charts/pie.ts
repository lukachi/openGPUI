// PieChart: slices sized by value, as a pie or a donut, full or half circle.
// Slice: a prop value; renders nothing.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/Charts/{PieChart,Slice}.ts (contract; the loading skeleton)
//   components/Charts/PieChart/{PieChart.tsx,pieChart.scss}, PieChart/parts/PieSlices.tsx
//   components/Skeleton/{Skeleton.tsx,skeleton.scss} (PieChartSkeleton)
//   and what charts/polar.ts lists (data, legend store, stacked legend, hover)
//
// genui renders upstream's defaults: slices sorted by value, no padding or
// corner radius (a donut keeps its 0.5° gap), the stacked legend, entrance
// animation off. The arcs come from d3-shape's pie and arc, replayed into gpui
// paths. A donut is a thin band in the slice colors over `sunk` track wedges
// around a hole; the whole thing is one hover area.
//
// gpui differences: see polar.ts (hover look, spring, hit test). The skeleton's
// pulse is a native opacity loop (1.2s ease-in-out, 0.3 to 0.85).
import { arc, pie, type PieArcDatum } from "d3-shape";
import { h_flex, v_flex } from "gpui-base";
import { div, PathBuilder, type Element } from "gpui-kit";
import type { Component, RenderContext } from "../../render/surface.ts";
import type { Tokens } from "../../render/tokens.ts";
import { layer } from "./paint.ts";
import { svgPath } from "./pathData.ts";
import { angleOf, polarChart, sliceRows, type Mark, type PolarShape, type PolarSlice } from "./polar.ts";

/** Where the colored band starts, as a share of the radius (the outer tenth). */
const DONUT_BAND_INNER = 0.9;
/** The center hole's radius, as a share of the band's inner radius. */
const DONUT_HOLE = 0.28;
/** Degrees between donut slices. */
const DONUT_PADDING_ANGLE = 0.5;
/** How far the hovered wedge pops out along its radial bisector (px). */
const PIE_HOVER_OFFSET = 8;

type Datum = PieArcDatum<PolarSlice>;

/** Outward direction of a slice (d3 angles start at 12 o'clock and run clockwise). */
function sliceOffset(startAngle: number, endAngle: number, distance: number) {
  // A near-full-circle slice has no meaningful bisector.
  if (endAngle - startAngle >= 2 * Math.PI - 1e-9) return { x: 0, y: 0 };
  const mid = (startAngle + endAngle) / 2;
  return { x: Math.sin(mid) * distance, y: -Math.cos(mid) * distance };
}

function pieShape(t: Tokens, slices: PolarSlice[], chartSize: number, o: { donut: boolean; semi: boolean }): PolarShape {
  const svgWidth = chartSize;
  const svgHeight = o.semi ? chartSize / 2 + 10 : chartSize;
  const cx = svgWidth / 2;
  const cy = o.semi ? svgHeight - 10 : svgHeight / 2;

  const outerRadius = chartSize * 0.45;
  const innerRadius = o.donut ? outerRadius * DONUT_BAND_INNER : 0;
  const holeRadius = innerRadius * DONUT_HOLE;
  const padAngle = o.donut ? DONUT_PADDING_ANGLE : 0;
  const startAngle = o.semi ? -Math.PI / 2 : 0;
  const endAngle = o.semi ? Math.PI / 2 : 2 * Math.PI;

  const arcs: Datum[] = pie<PolarSlice>()
    .value((d) => d.value)
    .sort(null)
    .startAngle(startAngle)
    .endAngle(endAngle)
    .padAngle((padAngle * Math.PI) / 180)(slices);
  // The donut's band and track share one pad radius, so each gap runs straight through both rings.
  const band = arc<unknown, Datum>().innerRadius(innerRadius).outerRadius(outerRadius).cornerRadius(0);
  const bandArc = o.donut ? band.padRadius(outerRadius) : band;
  const track = arc<unknown, Datum>().innerRadius(holeRadius).outerRadius(innerRadius).padRadius(outerRadius).cornerRadius(0);

  const fill = (d: string) => svgPath(PathBuilder.fill(), d, cx, cy).build();
  const marks: Mark[] = arcs.map((a, i) => {
    const bandD = bandArc(a);
    const trackD = o.donut ? track(a) : null;
    const fills: Mark["fills"] = [];
    if (trackD) fills.push({ path: fill(trackD), color: t.sunk });
    if (bandD) fills.push({ path: fill(bandD), color: slices[i]!.color });
    return { fills, pop: sliceOffset(a.startAngle, a.endAngle, PIE_HOVER_OFFSET) };
  });

  // The pointer's slice: the donut's hover area spans band and track (hole to outer).
  const hitInner = o.donut ? holeRadius : 0;
  // Both rings pad at the outer radius (the pie's default padRadius, √(r0²+r1²), is the same).
  const padRadius = outerRadius;
  return {
    width: svgWidth,
    height: svgHeight,
    marks,
    find(x, y) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r > outerRadius || r < hitInner) return null;
      let theta = angleOf(dx, dy);
      if (!o.semi && theta < 0) theta += 2 * Math.PI;
      for (let i = 0; i < arcs.length; i++) {
        const a = arcs[i]!;
        if (theta < a.startAngle || theta > a.endAngle) continue;
        // d3 keeps a constant-width gap of padRadius·sin(pad/2) beside each boundary.
        const gap = padRadius * Math.sin(a.padAngle / 2);
        const near = (delta: number) => delta < Math.PI / 2 && r * Math.sin(delta) < gap;
        if (gap > 0 && (near(theta - a.startAngle) || near(a.endAngle - theta))) continue;
        return i;
      }
      return null;
    },
  };
}

/** PieChartSkeleton: a pulsing disc (or ring, or half of either) and four legend rows. */
function pieSkeleton(ctx: RenderContext, donut: boolean, semi: boolean): Element {
  const t = ctx.t;
  const size = 200;
  const radius = size / 2;
  const pulse = <E extends Element>(el: E): E => el.loop("opacity", { from: 0.3, to: 0.85, period: 1200 });
  let shape: Element;
  if (semi) {
    // Rounded by `radius-full` on the top corners: a half disc, and for the donut a half ring
    // `space-xl` thick (gpui rounds corners circularly, to at most half the box, so it is drawn).
    const ring = t.spaceXl;
    const half = PathBuilder.fill().move_to(0, radius).arc_to(radius, radius, 0, false, true, size, radius);
    if (donut) half.line_to(size - ring, radius).arc_to(radius - ring, radius - ring, 0, false, false, ring, radius);
    shape = div()
      .relative()
      .w(size)
      .h(radius)
      .flex_none()
      .child(layer({ path: half.close().build(), paint: t.elevatedStrong }));
  } else {
    shape = div().w(size).h(size).flex_none().rounded_full();
    shape = donut ? shape.border(t.spaceXl).border_color(t.elevatedStrong) : shape.bg(t.elevatedStrong);
  }

  const legend = v_flex()
    .min_w(120)
    .gap(t.spaceS)
    .children(
      Array.from({ length: 4 }, (_, i) =>
        h_flex()
          .items_center()
          .gap(t.spaceS)
          .child(pulse(div().w(10).h(10).flex_none().rounded_full().bg(t.elevatedStrong)))
          .child(pulse(div().h(12).w((120 * (50 + ((i * 15) % 40))) / 100).bg(t.elevated).rounded(t.radiusS))),
      ),
    );
  return h_flex()
    .id(ctx.id("skeleton"))
    .w_full()
    .items_center()
    .justify_center()
    .gap(t.spaceM)
    .p(t.spaceM)
    .child(pulse(shape))
    .child(legend);
}

export const PieChart: Component = {
  render(props, ctx) {
    const donut = props.variant === "donut";
    const semi = props.appearance === "semiCircular";
    const rows = sliceRows(props);
    if (!rows) return ctx.queryLoading ? pieSkeleton(ctx, donut, semi) : null;
    return polarChart(ctx, {
      rows,
      palette: "pieChartPalette",
      semi,
      shapeKey: `${donut}|${semi}`,
      shape: (slices, chartSize) => pieShape(ctx.t, slices, chartSize, { donut, semi }),
    });
  },
};

/** Slice lives inside a chart's `labels` prop; alone it renders nothing (as upstream). */
export const Slice: Component = { render: () => null };
