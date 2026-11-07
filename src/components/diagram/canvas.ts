// The diagram canvas: what every diagram type shares (Diagram now; Sequence, Timeline next).
// A type brings its model, layout and drawing; this module gives it the viewport over that
// drawing, the camera, pointer and keys, the corner buttons, the expanded overlay and the
// numbered steps list. Nothing here knows about boxes, arrows or ids beyond strings.
//
// The view is a viewport over the drawing. Drag pans; ⌘/Ctrl + wheel zooms around the pointer;
// a plain wheel goes on to the page's scroll (gpui delivers it up the path unless stopped); the
// corner buttons zoom, fit and expand. Expanded, the drawing covers the whole surface (an
// overlay), and there a plain wheel pans too. Keys (the viewport takes focus on press): + = -
// zoom, 0 fits, arrows pan, [ ] walk the steps, escape closes the overlay. Zoom is a redraw at
// another scale: the content multiplies coordinates and text sizes (see `scaled`).
//
// Inline, the drawing fits by width (a tall one a little smaller, down to MIN_FIT_SHARE, then
// panned) and the viewport is as tall as that, at most MAX_VIEW_SHARE of the pane; expanded it
// fits whole. The camera follows the fit until the person zooms or pans.
//
// API, in render order:
//
//   const state = canvasState(ctx, steps.length);   // per-node UI state (ctx.local "canvas")
//   const content: CanvasContent | null = laidOut ? {
//     width, height,                                 // the drawing's size at scale 1, px
//     draw: (o, z, part) => Element,                 // the drawing at scale z (see below)
//     reveal: (highlight) => Box | null,             // the scale-1 box a step's ids cover
//   } : null;
//   return canvas(ctx, state, {
//     content,                                       // null: the placeholder instead
//     placeholder: "Laying out…", error: false,      // its text; error: shown even with content
//     steps,                                         // CanvasStep[] (DiagramStepModel fits)
//     askStep: (i) => stepQuestion(ctx, statementId, steps, i),
//     extra: probes,                                 // appended at the end (Measurer probes)
//   });
//
// - `draw(o, z, part)`: return a `div().relative()` of width*z × height*z with the drawing at
//   its origin. Draw with `o` (the overlay's context when expanded, else ctx); `part` is "in" or
//   "full", one per viewport: prefix element ids with it (`o.id(\`${part}-node-…\`)`) and key
//   per-viewport caches (built paths) by it. Called on every render that shows a viewport.
// - Highlight: `state.step` is the selected step's index (or null), `state.hover` the id the
//   pointer is on (or null). A selected step that is not `complete` lights nothing. Dim what a
//   lit step doesn't cover with DIMMED.
// - `pointable(el, state, id, onClick)`: makes a drawn item hoverable (sets `state.hover` to
//   `id`) and clickable; the release of a drag is no click, and a click doesn't reach the
//   viewport. Use it for every item that asks the agent.
// - `reveal(highlight)`: called when a complete step is selected; the camera pans to centre the
//   box when it isn't in view.
// - `stepQuestion`: the standard step ask ("Tell me more about step n: title", context
//   `{diagram, step, highlight}`), or the step's own action.
import { ACTION_STEPS } from "@openuidev/lang-core";
import { div, type Context, type Element, type FocusHandle, type KeyEvent, type ScrollWheelEvent } from "gpui-kit";
import { markdownBlock } from "../../markdown/render.ts";
import { optional, type RenderContext } from "../../render/surface.ts";
import { textStyle, typography, type TextStyle } from "../../render/tokens.ts";
import { button, iconButton } from "../buttons.ts";

/** Opacity of what a selected step doesn't light. */
export const DIMMED = 0.35;
/** Around the drawing inside the viewport. */
const PAD = 16;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 1.25;
/** A press that moves less than this is a click. */
const DRAG_SLOP = 4;
/** The inline viewport is at most this share of the pane's height. */
const MAX_VIEW_SHARE = 0.7;
/** The pane's height when the host never told. */
const FALLBACK_PANE_H = 800;
/** Fitting a tall drawing into the inline viewport never shrinks it below this share of the width fit. */
const MIN_FIT_SHARE = 0.75;
const KEY_PAN = 40;

/** A text style at drawing scale z. */
export const scaled = (s: TextStyle, z: number): TextStyle => ({ ...s, size: s.size * z });

/** One numbered step: DiagramStepModel's shape. */
export interface CanvasStep {
  title: string;
  /** Markdown. */
  details: string;
  /** Ids the content lights; the canvas only hands them to `reveal`. */
  highlight: readonly string[];
  action?: unknown;
  /** False while the step's statement is still streaming: it lights and reveals nothing. */
  complete: boolean;
}

/** A box in drawing px at scale 1. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Which viewport a drawing is for: inline or the expanded overlay. */
export type CanvasPart = "in" | "full";

/** The diagram type's side: its drawing and what a step covers. */
export interface CanvasContent {
  /** Size at scale 1, px. */
  readonly width: number;
  readonly height: number;
  /** The drawing at scale z, its top-left at the origin of a relative box of its size. */
  draw(o: RenderContext, z: number, part: CanvasPart): Element;
  /** The box to bring into view for a complete step's highlight ids, or null. */
  reveal(highlight: readonly string[]): Box | null;
}

export interface CanvasSpec {
  /** What is drawn; null before the first layout (the placeholder shows). */
  content: CanvasContent | null;
  /** The placeholder's text: shown instead of the inline viewport while content is null, or when `error`. */
  placeholder: string;
  /** A failure: the placeholder shows in the error color even when there is content. */
  error?: boolean;
  steps: readonly CanvasStep[];
  /** Step i's ask button. */
  askStep(i: number): void;
  /** Appended after the steps (e.g. Measurer probes). */
  extra?: readonly Element[];
}

/** One viewport's camera: zoom null follows the fit until the person zooms or pans. */
interface Camera {
  zoom: number | null;
  panX: number;
  panY: number;
  width: number;
  height: number;
}

/** Per-node UI state; content reads `step` and `hover`, `pointable` writes `hover`. */
export interface CanvasState {
  inline: Camera;
  full: Camera;
  /** Index of the selected step, or null. */
  step: number | null;
  /** The id of the item under the pointer, or null. */
  hover: string | null;
  drag: { x: number; y: number; panX: number; panY: number } | null;
  /** The last press moved past DRAG_SLOP: its release is no click. */
  moved: boolean;
  expanded: boolean;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

interface Canvas {
  ctx: RenderContext;
  state: CanvasState;
  content: CanvasContent;
  spec: CanvasSpec;
}

const camera = (): Camera => ({ zoom: null, panX: 0, panY: 0, width: 0, height: 0 });

/** This node's canvas state; a selected step past the end (a shorter list) is dropped. */
export function canvasState(ctx: RenderContext, stepCount: number): CanvasState {
  const state = ctx.local<CanvasState>(
    { inline: camera(), full: camera(), step: null, hover: null, drag: null, moved: false, expanded: false },
    "canvas",
  );
  if (state.step !== null && state.step >= stepCount) state.step = null;
  return state;
}

/** A drawn item to point at: hovering sets `state.hover`; a click (not a drag's release) runs onClick. */
export function pointable(el: Element, state: CanvasState, id: string, onClick: () => void): Element {
  return el
    .cursor_pointer()
    .on_hover((hovered, cx) => {
      const next = hovered ? id : state.hover === id ? null : state.hover;
      if (next === state.hover) return;
      state.hover = next;
      cx.notify();
    })
    .on_click((_e, cx) => {
      // The click stops the release before the viewport's mouse-up: end the press here, or the next move pans.
      state.drag = null;
      if (state.moved) return;
      cx.stop_propagation();
      onClick();
    });
}

/** The default question about step i, or the step's own action. */
export function stepQuestion(ctx: RenderContext, statementId: string, steps: readonly CanvasStep[], i: number): void {
  const step = steps[i];
  if (!step) return;
  const message = `Tell me more about step ${i + 1}: ${step.title}`;
  ctx.trigger(message, step.action ?? { steps: [{ type: ACTION_STEPS.ToAssistant, message, context: { diagram: statementId, step: i + 1, highlight: step.highlight } }] });
}

// ── Camera ──

/** The scale that fits the drawing: inline, by width (a tall drawing a little smaller, then panned); expanded, whole. */
function fitScale(cam: Camera, size: Size, expanded: boolean): number {
  const byWidth = Math.min(1, Math.max(0.01, cam.width - PAD * 2) / Math.max(1, size.width));
  const byHeight = Math.max(0.01, cam.height - PAD * 2) / Math.max(1, size.height);
  if (expanded) return Math.min(byWidth, byHeight);
  return byHeight >= byWidth ? byWidth : Math.max(byHeight, byWidth * MIN_FIT_SHARE);
}

/** Pan bounds on one axis: a drawing smaller than the viewport stays inside it, a larger one can't leave a gap past PAD. */
function clampPan(pan: number, view: number, content: number): number {
  const lo = Math.min(PAD, view - content - PAD);
  const hi = Math.max(PAD, view - content - PAD);
  return Math.min(hi, Math.max(lo, pan));
}

interface View {
  z: number;
  panX: number;
  panY: number;
}

function viewOf(cam: Camera, size: Size, expanded: boolean): View {
  if (cam.zoom === null) {
    const z = fitScale(cam, size, expanded);
    const w = size.width * z;
    const h = size.height * z;
    return { z, panX: (cam.width - w) / 2, panY: expanded ? (cam.height - h) / 2 : PAD };
  }
  const z = cam.zoom;
  return {
    z,
    panX: clampPan(cam.panX, cam.width, size.width * z),
    panY: clampPan(cam.panY, cam.height, size.height * z),
  };
}

/** Take the camera off the fit at what is shown now, before a zoom or pan changes it. */
function freeze(cam: Camera, size: Size, expanded: boolean): View {
  const v = viewOf(cam, size, expanded);
  cam.zoom = v.z;
  cam.panX = v.panX;
  cam.panY = v.panY;
  return v;
}

/** Zoom by `factor` keeping the drawing point under (px, py) (viewport px) in place. */
function zoomAt(cam: Camera, size: Size, expanded: boolean, factor: number, px: number, py: number): void {
  const v = freeze(cam, size, expanded);
  const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.z * factor));
  cam.panX = px - ((px - v.panX) * z) / v.z;
  cam.panY = py - ((py - v.panY) * z) / v.z;
  cam.zoom = z;
}

/** Pan so the box is in view (centred when it isn't). */
function reveal(cam: Camera, size: Size, box: Box | null, expanded: boolean): void {
  if (!box || cam.width <= 0) return;
  const v = viewOf(cam, size, expanded);
  const { x0, y0, x1, y1 } = box;
  const inView = v.panX + x0 * v.z >= 0 && v.panX + x1 * v.z <= cam.width && v.panY + y0 * v.z >= 0 && v.panY + y1 * v.z <= cam.height;
  if (inView) return;
  freeze(cam, size, expanded);
  cam.panX = cam.width / 2 - ((x0 + x1) / 2) * v.z;
  cam.panY = cam.height / 2 - ((y0 + y1) / 2) * v.z;
}

// ── Viewport ──

/** The corner buttons: zoom out, zoom in, fit, expand (or close, expanded). */
function controls(o: RenderContext, c: Canvas, cam: Camera, expanded: boolean, wake: () => void): Element {
  const { content } = c;
  const act = (fn: () => void) => (cx: Context) => {
    fn();
    cx.notify();
    wake();
  };
  const zoomBy = (f: number) => act(() => zoomAt(cam, content, expanded, f, cam.width / 2, cam.height / 2));
  const small = (id: string, icon: string, onClick: (cx: Context) => void) =>
    iconButton(o, { id: o.id(id), icon, variant: "tertiary", size: "2-extra-small", onClick });
  // On a plate of the viewport's color, so the buttons stay readable over the drawing.
  return div()
    .absolute()
    .top(8)
    .right(8)
    .flex()
    .flex_row()
    .gap(2)
    .p(2)
    .rounded(o.t.radiusM)
    .bg(o.t.foreground)
    .border_1()
    .border_color(o.t.borderDefault)
    .child(small(expanded ? "full-out" : "in-out", "Minus", zoomBy(1 / ZOOM_STEP)))
    .child(small(expanded ? "full-in" : "in-in", "Plus", zoomBy(ZOOM_STEP)))
    .child(small(expanded ? "full-fit" : "in-fit", "Scan", act(() => (cam.zoom = null))))
    .child(
      small(
        expanded ? "full-close" : "in-expand",
        expanded ? "Minimize2" : "Maximize2",
        act(() => {
          c.state.expanded = !expanded;
          c.state.full = camera();
        }),
      ),
    );
}

/** A viewport over the drawing: inline (sized by the drawing) or expanded (filling the overlay). */
function viewport(o: RenderContext, c: Canvas, expanded: boolean, focus: FocusHandle | null, wake: () => void): Element {
  const t = o.t;
  const { state, content } = c;
  const cam = expanded ? state.full : state.inline;
  const v = cam.width > 0 && (!expanded || cam.height > 0) ? viewOf(cam, content, expanded) : null;
  const redraw = (cx: Context) => {
    cx.notify();
    wake();
  };

  const onWheel = (e: ScrollWheelEvent, cx: Context) => {
    const zoom = e.modifiers.platform || e.modifiers.control;
    if (!zoom && !expanded) return; // a plain wheel scrolls the page
    cx.stop_propagation();
    if (zoom) {
      const p = e.local_position ?? { x: cam.width / 2, y: cam.height / 2 };
      zoomAt(cam, content, expanded, Math.exp(-e.delta.y * 0.01), p.x, p.y);
    } else {
      freeze(cam, content, expanded);
      cam.panX += e.delta.x;
      cam.panY += e.delta.y;
    }
    redraw(cx);
  };

  const onKey = (e: KeyEvent, cx: Context) => {
    const k = e.key;
    const center = () => zoomAt(cam, content, expanded, 1, cam.width / 2, cam.height / 2);
    if (k === "+" || k === "=") zoomAt(cam, content, expanded, ZOOM_STEP, cam.width / 2, cam.height / 2);
    else if (k === "-") zoomAt(cam, content, expanded, 1 / ZOOM_STEP, cam.width / 2, cam.height / 2);
    else if (k === "0") cam.zoom = null;
    else if (k === "left" || k === "right" || k === "up" || k === "down") {
      center();
      cam.panX += k === "left" ? KEY_PAN : k === "right" ? -KEY_PAN : 0;
      cam.panY += k === "up" ? KEY_PAN : k === "down" ? -KEY_PAN : 0;
    } else if (k === "[" || k === "]") selectStep(c, state.step === null ? (k === "]" ? 0 : c.spec.steps.length - 1) : state.step + (k === "]" ? 1 : -1), expanded);
    else if (k === "escape" && expanded) state.expanded = false;
    else return;
    cx.stop_propagation();
    redraw(cx);
  };

  const size = (sz: { width: number; height: number }, cx: Context) => {
    if (cam.width === sz.width && (!expanded || cam.height === sz.height)) return;
    cam.width = sz.width;
    if (expanded) cam.height = sz.height;
    cx.notify();
  };

  // Inline: as tall as the fitted drawing, at most a share of the pane.
  const paneH = o.viewportHeight ?? FALLBACK_PANE_H;
  if (!expanded && cam.width > 0) {
    cam.height = Math.max(120, paneH * MAX_VIEW_SHARE);
    const fit = fitScale(cam, content, false);
    cam.height = Math.min(content.height * fit + PAD * 2, paneH * MAX_VIEW_SHARE);
  }

  let el = div()
    .id(o.id(expanded ? "full" : "viewport"))
    .relative()
    .overflow_hidden()
    .w_full()
    .rounded(expanded ? 0 : t.radiusL)
    .border_1()
    .border_color(t.borderDefault)
    .bg(t.foreground)
    .when(state.drag !== null && state.moved, (e) => e.cursor_grabbing())
    .on_size_change(size)
    .on_scroll_wheel(onWheel)
    .on_mouse_down("left", (e, cx) => {
      focus?.focus();
      state.drag = { x: e.position.x, y: e.position.y, panX: 0, panY: 0 };
      state.moved = false;
    })
    .on_mouse_move((e, cx) => {
      const drag = state.drag;
      if (!drag) return;
      const dx = e.position.x - drag.x;
      const dy = e.position.y - drag.y;
      if (!state.moved) {
        if (Math.hypot(dx, dy) < DRAG_SLOP) return;
        const v0 = freeze(cam, content, expanded);
        drag.panX = v0.panX;
        drag.panY = v0.panY;
        state.moved = true;
      }
      cam.panX = drag.panX + dx;
      cam.panY = drag.panY + dy;
      redraw(cx);
    })
    .on_mouse_up("left", (_e, cx) => {
      if (!state.drag) return;
      state.drag = null;
      redraw(cx);
    })
    .on_hover((hovered, cx) => {
      if (hovered || !state.drag) return;
      state.drag = null;
      redraw(cx);
    })
    .on_key_down(onKey);
  if (focus) el = el.track_focus(focus);
  el = expanded ? el.size_full() : el.h(cam.width > 0 ? cam.height : 160);

  if (v) {
    el = el.child(div().absolute().left(v.panX).top(v.panY).child(content.draw(o, v.z, expanded ? "full" : "in")));
  }
  return el.child(controls(o, c, cam, expanded, wake));
}

// ── Steps ──

/** Select step i (again: deselect) and bring what it lights into view. */
function selectStep(c: Canvas, i: number, expanded: boolean): void {
  const { state, spec, content } = c;
  if (i < 0 || i >= spec.steps.length) return;
  state.step = state.step === i ? null : i;
  if (state.step === null) return;
  const step = spec.steps[state.step]!;
  if (!step.complete) return;
  reveal(expanded ? state.full : state.inline, content, content.reveal(step.highlight), expanded);
}

/** The numbered steps under the viewport, in OpenUI's Steps look, with the selected one marked. */
function steps(ctx: RenderContext, c: Canvas): Element | null {
  const t = ctx.t;
  const { state, spec } = c;
  if (!spec.steps.length) return null;
  const n = spec.steps.length;
  const nav = div()
    .flex()
    .flex_row()
    .items_center()
    .gap(t.spaceS)
    .child(
      button(ctx, {
        id: ctx.id("prev"),
        label: "Previous",
        variant: "secondary",
        size: "extra-small",
        disabled: state.step === null || state.step === 0,
        onClick: (cx) => {
          if (state.step !== null) selectStep(c, state.step - 1, false);
          cx.notify();
        },
      }),
    )
    .child(
      button(ctx, {
        id: ctx.id("next"),
        label: state.step === null ? "Start" : "Next",
        variant: "secondary",
        size: "extra-small",
        disabled: state.step === n - 1,
        onClick: (cx) => {
          selectStep(c, state.step === null ? 0 : state.step + 1, false);
          cx.notify();
        },
      }),
    )
    .child(
      textStyle(div(), typography(t, "label", "small"))
        .text_color(t.textNeutralTertiary)
        .child(state.step === null ? `${n} steps` : `Step ${state.step + 1} of ${n}`),
    );

  const list = spec.steps.map((step, i) => {
    const selected = state.step === i;
    const last = i === n - 1;
    const connector = div()
      .flex()
      .flex_col()
      .items_center()
      .child(
        div()
          .flex()
          .items_center()
          .justify_center()
          .py(t.space2xs)
          .child(
            textStyle(
              div()
                .flex()
                .items_center()
                .justify_center()
                .w(24)
                .h(24)
                .rounded(12)
                .bg(selected ? t.interactiveAccentDefault : t.elevated)
                .text_color(selected ? t.textWhite : t.textNeutralSecondary)
                .border_1()
                .border_color(selected ? t.interactiveAccentDefault : t.borderDefault),
              typography(t, "label", "small"),
            ).child(String(i + 1)),
          ),
      )
      .when(!last, (el) => el.child(div().w(1).flex_1().bg(t.sunk)));
    const head = div()
      .flex()
      .flex_row()
      .items_center()
      .gap(t.spaceXs)
      .child(div().flex_1().min_w_0().text_color(selected ? t.textNeutralPrimary : t.textNeutralSecondary).child(step.title))
      .child(
        iconButton(ctx, {
          id: ctx.id(`ask-${i}`),
          icon: "MessageCircleQuestion",
          variant: "tertiary",
          size: "2-extra-small",
          onClick: () => spec.askStep(i),
        }),
      );
    const details = step.details
      ? [ctx.piece(`step${i}`, step.details, (o, text) => markdownBlock(o, `step${i}`, text, { profile: "plain" }).w_auto())]
      : [];
    const content = div()
      .flex()
      .flex_col()
      .flex_1()
      .min_w_0()
      .gap(t.space3xs)
      .pt(t.space2xs)
      .mb(last ? 0 : t.spaceL)
      .child(head)
      .child(textStyle(div().flex().flex_col().gap(t.spaceM + 2), typography(t, "body", "default")).children(details));
    return div()
      .id(ctx.id(`step-${i}`))
      .flex()
      .flex_row()
      .gap(t.spaceM)
      .rounded(t.radiusM)
      .cursor_pointer()
      .on_click((_e, cx) => {
        selectStep(c, i, false);
        cx.notify();
      })
      .child(connector)
      .child(content);
  });
  return div().flex().flex_col().gap(t.spaceM).child(nav).child(div().flex().flex_col().children(list));
}

// ── Canvas ──

/** Before the first layout, or when it failed. */
function placeholder(ctx: RenderContext, text: string, error: boolean): Element {
  const t = ctx.t;
  return textStyle(div(), typography(t, "body", "small"))
    .flex()
    .items_center()
    .justify_center()
    .w_full()
    .h(120)
    .rounded(t.radiusL)
    .border_1()
    .border_color(t.borderDefault)
    .bg(t.sunkLight)
    .text_color(error ? t.textDangerPrimary : t.textNeutralTertiary)
    .child(text);
}

/** The whole view: the inline viewport (or the placeholder), the steps, and the expanded overlay. */
export function canvas(ctx: RenderContext, state: CanvasState, spec: CanvasSpec): Element {
  const t = ctx.t;
  const wake = ctx.waker();
  const c: Canvas | null = spec.content ? { ctx, state, content: spec.content, spec } : null;
  const focus = ctx.retained<FocusHandle, null>(ctx.id("focus"), { kind: "diagram-focus", meta: null, create: (_entry, cx) => cx.focus_handle() });

  if (c && state.expanded) {
    ctx.overlay("expanded", (o) => {
      const ofocus = o.retained<FocusHandle, null>(o.id("full-focus"), { kind: "diagram-focus", meta: null, create: (_entry, cx) => cx.focus_handle() });
      if (!state.expanded) return null;
      return { el: div().size_full().bg(o.t.foreground).child(viewport(o, c, true, ofocus, wake)), focus: ofocus };
    });
  }

  return div()
    .id(ctx.id())
    .relative()
    .w_full()
    .flex()
    .flex_col()
    .gap(t.spaceM)
    .child(c && !spec.error ? viewport(ctx, c, false, focus, wake) : placeholder(ctx, spec.placeholder, !!spec.error))
    .children(optional(c ? steps(ctx, c) : null))
    .children(spec.extra ?? []);
}
