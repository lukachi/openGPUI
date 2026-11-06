// Hover for every chart: which item the pointer is over, the followers that
// glide to it, and when to redraw.
//
// Ported from react-ui at the pinned commit:
//   hooks/core/useChartHover.ts, shared/core/spring/{FadeFollower.tsx,presets.ts,useSeededAim.ts}
//
// gpui differences: followers move with native springs on left/top, the
// upstream presets converted to a response period (2π/√stiffness) and damping
// ratio (damping / 2√stiffness). A follower lands on first show (upstream's
// seeded jump) by being drawn under a new id per hover session, so it shows
// without the fade-in; it keeps its last position while it fades out
// (FadeFollower ignores its target while hidden).
import { div, type Color, type Context, type Element, type MouseMoveEvent } from "gpui-kit";
import type { RenderContext } from "../../render/surface.ts";

/** springPresets.crosshair (stiffness 320, damping 26). */
export const CROSSHAIR_SPRING = { response: 351, damping: 0.73 };
/** springPresets.tooltip (stiffness 480, damping 38). */
export const TOOLTIP_SPRING = { response: 287, damping: 0.87 };
/** FadeFollower's fade. */
export const FADE_MS = 120;

export interface HoverState {
  /** The hovered item, or null. */
  index: number | null;
  /** The item last hovered: where followers stay while they fade out. */
  last: number;
  /** Pointer in the chart's local coordinates (the tooltip's anchor). */
  x: number;
  y: number;
  /** Pointer in window coordinates (the tooltip's flip). */
  wx: number;
  wy: number;
  /** Counts hovers: a follower drawn under a new session id lands instead of gliding. */
  session: number;
}

export function hoverState(ctx: RenderContext, part = "hover"): HoverState {
  return ctx.local<HoverState>({ index: null, last: 0, x: 0, y: 0, wx: 0, wy: 0, session: 0 }, part);
}

/**
 * useChartHover's handlers on `el`: `find` maps a pointer position in `el`'s
 * own coordinates to an item (or null); `origin` is `el`'s offset in the
 * chart's coordinates, for the tooltip. Redraws only when the item changes,
 * or the pointer moves while an item (and so a tooltip) is shown. A chart
 * whose tooltip does not follow the pointer passes `followPointer = false`:
 * it then redraws on item changes only.
 */
export function withHover<E extends Element>(
  el: E,
  state: HoverState,
  find: (x: number, y: number) => number | null,
  origin: { x: number; y: number } = { x: 0, y: 0 },
  followPointer = true,
): E {
  return el
    .on_mouse_move((e: MouseMoveEvent, cx: Context) => {
      const index = find(e.local_position.x, e.local_position.y);
      const x = origin.x + e.local_position.x;
      const y = origin.y + e.local_position.y;
      if (index === state.index && (index === null || !followPointer || (x === state.x && y === state.y))) return;
      if (state.index === null && index !== null) state.session++;
      state.index = index;
      if (index !== null) state.last = index;
      state.x = x;
      state.y = y;
      state.wx = e.position.x;
      state.wy = e.position.y;
      cx.notify();
    })
    .on_hover((hovered: boolean, cx: Context) => {
      if (hovered || state.index === null) return;
      state.index = null;
      cx.notify();
    });
}

/** The item followers show: the hovered one, else the last one while they fade out. */
export function shownIndex(state: HoverState, count: number): { index: number; visible: boolean } {
  const visible = state.index !== null && state.index < count;
  return { index: visible ? state.index! : Math.min(state.last, Math.max(0, count - 1)), visible };
}

/**
 * FadeFollower: an absolutely placed box springing to (`left`, `top`) and
 * fading in or out with `visible`. `springs` names the axes it glides on.
 */
export function follower(
  ctx: RenderContext,
  state: HoverState,
  part: string,
  o: { left: number; top: number; visible: boolean; springs?: ("left" | "top")[] },
): Element {
  let el = div()
    .id(ctx.id(`${part}-${state.session}`))
    .absolute()
    .left(o.left)
    .top(o.top)
    .opacity(o.visible ? 1 : 0)
    .transition("opacity", { duration: FADE_MS, easing: "ease-in-out" });
  for (const axis of o.springs ?? ["left", "top"]) el = el.spring(axis, CROSSHAIR_SPRING);
  return el;
}

/**
 * The active dot of LineDotCrosshair and RadarSeries: a foreground disc with a
 * border-default ring (r 4, stroke 1) around a series-color core (r 2).
 */
export function activeDot(ctx: RenderContext, state: HoverState, part: string, x: number, y: number, color: Color, visible: boolean): Element {
  const t = ctx.t;
  return follower(ctx, state, part, { left: x - 4.5, top: y - 4.5, visible })
    .w(9)
    .h(9)
    .rounded_full()
    .bg(t.foreground)
    .border_1()
    .border_color(t.borderDefault)
    .flex()
    .items_center()
    .justify_center()
    .child(div().w(4).h(4).rounded_full().bg(color));
}

/** Track a chart container's width in `state.width`, redrawing when it changes. */
export function trackWidth<E extends Element>(el: E, state: { width: number }): E {
  return el.on_size_change((size, cx) => {
    if (size.width === state.width) return;
    state.width = size.width;
    cx.notify();
  });
}
