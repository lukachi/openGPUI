// RadialChart: one concentric bar per slice, each sweeping a share of the
// circle by its value against the largest.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/Charts/RadialChart.ts (contract)
//   components/Charts/RadialChart/{RadialChart.tsx,radialChart.scss},
//   RadialChart/parts/RadialBars.tsx
//   and what charts/polar.ts lists (data, legend store, stacked legend, hover)
//
// genui renders upstream's defaults: the circular variant, bars rounded by a
// corner radius of 10, a 2px gap between bars, no grid, the stacked legend,
// entrance animation off. The arcs come from d3-shape's arc, replayed into gpui
// paths. A bar's hover area is its sweep and ring (its rounded corners count
// as inside).
//
// gpui differences: see polar.ts (hover look, hit test).
import { arc } from "d3-shape";
import { PathBuilder } from "gpui-kit";
import type { Component } from "../../render/surface.ts";
import { angleOf, polarChart, sliceRows, type Mark, type PolarShape, type PolarSlice } from "./polar.ts";
import { svgPath } from "./pathData.ts";

const BAR_GAP = 2;
const CORNER_RADIUS = 10;

function radialShape(slices: PolarSlice[], chartSize: number): PolarShape {
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const maxRadius = chartSize * 0.45;
  const minRadius = maxRadius * 0.25;
  const sweepOf = 2 * Math.PI;
  const maxValue = Math.max(...slices.map((s) => s.value), 0);
  const thickness = (maxRadius - minRadius) / slices.length;

  const bars = slices.map((slice, i) => {
    const inner = minRadius + i * thickness + BAR_GAP;
    const outer = minRadius + (i + 1) * thickness;
    const sweep = maxValue > 0 ? (slice.value / maxValue) * sweepOf : 0;
    const d = arc<null>().innerRadius(inner).outerRadius(outer).startAngle(0).endAngle(sweep).cornerRadius(CORNER_RADIUS)(null);
    return { inner, outer, sweep, d };
  });
  const marks: Mark[] = bars.map((bar, i) => ({
    fills: bar.d ? [{ path: svgPath(PathBuilder.fill(), bar.d, cx, cy).build(), color: slices[i]!.color }] : [],
  }));

  return {
    width: chartSize,
    height: chartSize,
    marks,
    find(x, y) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      const theta = angleOf(dx, dy);
      const turn = theta < 0 ? theta + sweepOf : theta;
      const index = bars.findIndex((bar) => {
        if (r < bar.inner || r > bar.outer) return false;
        // A negative value sweeps counterclockwise from 12 o'clock.
        const lo = Math.min(0, bar.sweep);
        const hi = Math.max(0, bar.sweep);
        return (turn >= lo && turn <= hi) || (turn - sweepOf >= lo && turn - sweepOf <= hi);
      });
      return index < 0 ? null : index;
    },
  };
}

export const RadialChart: Component = {
  render(props, ctx) {
    const rows = sliceRows(props);
    if (!rows) return null;
    return polarChart(ctx, {
      rows,
      palette: "radialChartPalette",
      semi: false,
      shapeKey: "",
      shape: radialShape,
    });
  },
};
