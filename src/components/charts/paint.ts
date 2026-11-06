// Drawing chart geometry with gpui paths.
//
// Upstream draws SVG: bars are `<path d>` strings from `roundedBarPath`, lines
// and areas `d` strings from d3-shape, grids `<line>`s, dots `<circle>`s. gpui
// paints a `Path` built with `PathBuilder`: `svgPath` (charts/pathData.ts)
// replays SVG path data into a builder, and a `layer` paints one built path
// over its parent's box, in the parent's local pixels like the SVG `<g>` it
// stands for. A built `Path` is immutable, so a chart builds its paths once
// per layout and paints the same ones on every render (hover included).
import { Background, type Color, type Element, type Path, type PathBuilder } from "gpui-kit";

/** A full circle at (cx, cy), as two arcs (SVG `<circle>`). */
export function circle(b: PathBuilder, cx: number, cy: number, r: number): PathBuilder {
  return b
    .move_to(cx + r, cy)
    .arc_to(r, r, 0, false, true, cx - r, cy)
    .arc_to(r, r, 0, false, true, cx + r, cy)
    .close();
}

/** A straight segment (SVG `<line>`). */
export function segment(b: PathBuilder, x1: number, y1: number, x2: number, y2: number): PathBuilder {
  return b.move_to(x1, y1).line_to(x2, y2);
}

/** What a chart paints: a built path, its fill or stroke, and where (a box, or the parent's whole box). */
export interface Painted {
  path: Path;
  paint: Color | Background;
  /** Box in the parent's pixels; the path's coordinates are the box's. Omitted: the whole parent. */
  box?: { x: number; y: number; w: number; h: number };
}

/** Draw a `Painted` into a `relative()` parent. */
export function layer(p: Painted): Element {
  const el = window.paint_path(p.path, p.paint).absolute();
  if (!p.box) return el.top(0).left(0).size_full();
  return el.left(p.box.x).top(p.box.y).w(Math.max(1, p.box.w)).h(Math.max(1, p.box.h));
}

/**
 * A vertical linear gradient over the painted box, as an SVG
 * `<linearGradient x1=0 y1=0 x2=0 y2=1>` (whose box is the shape's bounds,
 * `objectBoundingBox`) with stops at `fromPct`/`toPct` (0..100). `flip` runs
 * it bottom to top (y1=1, y2=0).
 */
export function verticalGradient(from: Color, to: Color, fromPct: number, toPct: number, flip = false): Background {
  return Background.linear_gradient(flip ? 0 : 180, Background.stop(from, fromPct / 100), Background.stop(to, toPct / 100));
}
