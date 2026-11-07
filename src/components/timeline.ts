// Timeline: openGPUI's own component (docs/diagram.md), tasks on a time axis.
//
// The props become a model (diagram/timeline.ts); the bar labels, lane titles and tick labels
// are measured with the charts' Measurer, and the layout is computed here in the pane
// (diagram/timelineLayout.ts: no ELK). Drawn on the shared diagram canvas (diagram/canvas.ts,
// the viewport, zoom, expand and the numbered steps): lanes as header bands, ticks as faint
// lines under the axis, tasks as bars colored by status (planned neutral, active accent, done
// muted, blocked error-tinted), milestones as diamonds, dependencies as gpui paths with
// arrowheads. The selected step lights its tasks (and the arrows between them) and dims the rest.
//
// A click on a task (not a drag) asks the agent about it; each step has an ask button.
import { ACTION_STEPS } from "@openuidev/lang-core";
import { div, PathBuilder, type Color, type Element } from "gpui-kit";
import { timelineModel, type TaskStatus, type TimelineModel, type TimelineTask } from "../diagram/timeline.ts";
import { timelineLayout, type TimelineBar, type TimelineLayout } from "../diagram/timelineLayout.ts";
import { optional, type Component, type RenderContext } from "../render/surface.ts";
import { alpha, over, textStyle, typography, type TextStyle, type Tokens } from "../render/tokens.ts";
import { Measurer } from "./charts/measure.ts";
import { layer, type Painted } from "./charts/paint.ts";
import { canvas, canvasState, DIMMED, pointable, scaled, stepQuestion, type Box, type CanvasState } from "./diagram/canvas.ts";

// ── Geometry (px at scale 1) ──

const ICON = 12;
const ICON_GAP = 5;
/** The lit ring's distance from the bar. */
const RING = 3;
/** A milestone diamond's half diagonal, as a share of the bar height. */
const DIAMOND = 0.42;
const ARROW_LEN = 7;
const ARROW_HALF = 4;

const STATUS_ICON: Partial<Record<TaskStatus, string>> = { done: "Check", blocked: "Ban" };

interface Styles {
  label: TextStyle;
  lane: TextStyle;
  tick: TextStyle;
}

const styles = (t: Tokens): Styles => ({
  label: typography(t, "label", "heavy"),
  lane: typography(t, "label", "small-heavy"),
  tick: typography(t, "label", "small"),
});

/**
 * A bar's (and a milestone's) look per status: fill, border, text, an outside label's color.
 * Planned is hollow; fills are opaque (over the viewport's color) so arrows passing under a bar
 * don't show through it.
 */
function look(t: Tokens, status: TaskStatus): { bg: Color; border: Color; fg: Color; outside: Color } {
  switch (status) {
    case "active":
      return { bg: t.interactiveAccentDefault, border: t.interactiveAccentDefault, fg: t.textAccentPrimary, outside: t.textNeutralPrimary };
    case "done":
      return { bg: over(t.sunk, t.foreground), border: t.borderInteractive, fg: t.textNeutralSecondary, outside: t.textNeutralSecondary };
    case "blocked":
      return { bg: over(t.dangerBackground, t.foreground), border: t.borderDanger, fg: t.textDangerPrimary, outside: t.textDangerPrimary };
    default:
      return { bg: t.foreground, border: t.borderInteractiveEmphasis, fg: t.textNeutralPrimary, outside: t.textNeutralPrimary };
  }
}

interface Local {
  /** The layout drawn, kept while an equal one is computed (its paths stay valid). */
  layout: TimelineLayout | null;
  key: string;
  /** Built paths per viewport ("in", "full"), for one zoom and highlight; a new layout drops them. */
  paths: Record<string, { key: string; painted: Painted[] }>;
}

// ── Highlight ──

interface Marks {
  /** A step is selected: what it doesn't light is dimmed. */
  active: boolean;
  tasks: Set<string>;
  arrows: Set<string>;
}

/** What a complete step's task ids (null: no step lit) and the hovered task light. */
function marks(layout: TimelineLayout, highlight: readonly string[] | null, hover: string | null): Marks {
  const tasks = new Set(highlight ?? []);
  const arrows = new Set(layout.arrows.filter((a) => tasks.has(a.from) && tasks.has(a.to)).map((a) => a.id));
  if (hover) {
    tasks.add(hover);
    for (const a of layout.arrows) if (a.from === hover || a.to === hover) arrows.add(a.id);
  }
  return { active: highlight !== null, tasks, arrows };
}

/** A bar with its outside label. */
const extent = (b: TimelineBar): Box => ({ x0: b.x0, y0: b.y, x1: b.inside ? b.x1 : b.labelX + b.labelW, y1: b.y + b.h });

/** The box around the tasks a step lights, or null. */
function revealBox(layout: TimelineLayout, highlight: readonly string[]): Box | null {
  const lit = layout.bars.filter((b) => highlight.includes(b.id));
  if (!lit.length) return null;
  return lit.map(extent).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
}

// ── Paths ──

type Class = "normal" | "dim" | "lit";

/** Arrows (one stroke and one arrowhead fill per class) and milestone diamonds (a fill per color, lit ones ringed), at scale z. */
function paths(d: Draw, z: number, m: Marks): Painted[] {
  const { t, layout, model } = d;
  const fills = new Map<Color, PathBuilder>();
  const strokes = new Map<string, { width: number; color: Color; b: PathBuilder }>();
  const fill = (c: Color) => fills.get(c) ?? (fills.set(c, PathBuilder.fill()), fills.get(c)!);
  const stroke = (c: Color, width: number) => {
    const key = `${c}|${width}`;
    let s = strokes.get(key);
    if (!s) strokes.set(key, (s = { width, color: c, b: PathBuilder.stroke(width) }));
    return s.b;
  };
  const muted = t.textNeutralSecondary;
  const arrowColor: Record<Class, Color> = { normal: muted, dim: alpha(muted, DIMMED), lit: t.interactiveAccentDefault };
  const out: Painted[] = [];

  // Dimmed under normal under lit.
  for (const c of ["dim", "normal", "lit"] as const) {
    const arrows = layout.arrows.filter((a) => (m.arrows.has(a.id) ? "lit" : m.active ? "dim" : "normal") === c);
    if (!arrows.length) continue;
    const line = PathBuilder.stroke(c === "lit" ? 2 : 1.25);
    const head = PathBuilder.fill();
    for (const a of arrows) {
      const pts = a.points.map(([x, y]) => [x * z, y * z] as [number, number]);
      const [tx, ty] = pts[pts.length - 1]!;
      const [sx, sy] = pts[pts.length - 2]!;
      const len = Math.hypot(tx - sx, ty - sy) || 1;
      const [dx, dy] = [(tx - sx) / len, (ty - sy) / len];
      const arrow = Math.min(ARROW_LEN * Math.max(z, 0.6), len);
      const half = ARROW_HALF * Math.max(z, 0.6);
      const [bx, by] = [tx - dx * arrow, ty - dy * arrow];
      line.move_to(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length - 1; i++) line.line_to(pts[i]![0], pts[i]![1]);
      line.line_to(bx, by);
      head.add_polygon([[tx, ty], [bx - dy * half, by + dx * half], [bx + dy * half, by - dx * half]], true);
    }
    out.push({ path: line.build(), paint: arrowColor[c] }, { path: head.build(), paint: arrowColor[c] });
  }

  for (const b of layout.bars) {
    if (!b.milestone) continue;
    const task = model.tasks.find((x) => x.id === b.id)!;
    const cx = ((b.x0 + b.x1) / 2) * z;
    const cy = (b.y + b.h / 2) * z;
    const r = b.h * DIAMOND * z;
    const diamond = (half: number): [number, number][] => [[cx, cy - half], [cx + half, cy], [cx, cy + half], [cx - half, cy]];
    const lit = m.tasks.has(b.id);
    const k = look(t, task.status);
    const fade = (c: Color) => (m.active && !lit ? alpha(c, DIMMED) : c);
    fill(fade(k.bg)).add_polygon(diamond(r), true);
    stroke(fade(k.border), 1.25).add_polygon(diamond(r), true);
    if (lit) stroke(t.interactiveAccentDefault, 2).add_polygon(diamond(r + RING * 1.5 * z), true);
  }
  for (const [c, b] of fills) out.push({ path: b.build(), paint: c });
  for (const s of strokes.values()) out.push({ path: s.b.build(), paint: s.color });
  return out;
}

// ── Drawing ──

interface Draw {
  ctx: RenderContext;
  t: Tokens;
  model: TimelineModel;
  layout: TimelineLayout;
  local: Local;
  state: CanvasState;
  s: Styles;
  statementId: string;
}

/** The question about a task. */
function askTask(d: Draw, id: string): void {
  const task = d.model.tasks.find((x) => x.id === id);
  if (!task) return;
  const message = `Tell me more about ${task.label}`;
  d.ctx.trigger(message, { steps: [{ type: ACTION_STEPS.ToAssistant, message, context: { diagram: d.statementId, task: id } }] });
}

/** A task's status icon (done, blocked) and label, at scale z. */
function content(o: RenderContext, d: Draw, task: TimelineTask, z: number, color: Color): Element {
  const name = STATUS_ICON[task.status];
  return div()
    .flex()
    .flex_row()
    .items_center()
    .gap(ICON_GAP * z)
    .text_color(color)
    .children(name ? optional(o.icon(name, { size: ICON * z })) : [])
    .child(textStyle(div().whitespace_nowrap(), scaled(d.s.label, z)).child(task.label));
}

/** The drawing at scale z, its top-left at the origin of a relative box of its size. */
function drawing(o: RenderContext, d: Draw, z: number, part: string): Element {
  const t = o.t;
  const { layout, model, local, state, s } = d;
  const step = state.step === null ? undefined : model.steps[state.step];
  const m = marks(layout, step?.complete ? step.highlight : null, state.hover);
  const W = layout.width * z;

  const pathKey = `${z}|${m.active}|${[...m.tasks].join(",")}|${[...m.arrows].join(",")}`;
  let built = local.paths[part];
  if (built?.key !== pathKey) {
    built = { key: pathKey, painted: paths(d, z, m) };
    local.paths[part] = built;
  }

  // Tick lines under the lane bands (opaque), so each band reads as one separator.
  const lines = layout.ticks.map((tk) =>
    div()
      .absolute()
      .left(tk.x * z)
      .top(0)
      .w(1)
      .h(layout.height * z)
      .bg(t.borderDefault),
  );
  const tickLabels = layout.ticks.flatMap((tk) =>
    tk.label
      ? [
          textStyle(div().absolute().whitespace_nowrap(), scaled(s.tick, z))
            .left(tk.labelX * z)
            .top(layout.tickY * z)
            .text_color(t.textNeutralSecondary)
            .child(tk.label),
        ]
      : [],
  );
  const bands = layout.lanes.flatMap((l) => [
    div()
      .absolute()
      .left(0)
      .top(l.y * z)
      .w(W)
      .h(l.h * z)
      .bg(over(t.sunkLight, t.foreground))
      .border_t_1()
      .border_b_1()
      .border_color(t.borderDefault),
    textStyle(div().absolute().whitespace_nowrap(), scaled(s.lane, z))
      .left(l.labelX * z)
      .top(l.y * z)
      .h(l.h * z)
      .flex()
      .items_center()
      .text_color(t.textNeutralSecondary)
      .when(m.active, (el) => el.opacity(0.6))
      .child(l.label),
  ]);
  const axisLine = div()
    .absolute()
    .left(0)
    .top(layout.axisH * z - 1)
    .w(W)
    .h(1)
    .bg(t.borderDefault);

  const tasks = layout.bars.flatMap((b) => {
    const task = model.tasks.find((x) => x.id === b.id);
    if (!task) return [];
    const lit = m.tasks.has(b.id);
    const dim = m.active && !lit;
    const k = look(t, task.status);
    const items: Element[] = [];
    if (!b.milestone) {
      let bar = pointable(
        div()
          .id(o.id(`${part}-task-${b.id}`))
          .absolute()
          .left(b.x0 * z)
          .top(b.y * z)
          .w((b.x1 - b.x0) * z)
          .h(b.h * z)
          .flex()
          .items_center()
          .overflow_hidden()
          .rounded(t.radiusM * z)
          .bg(k.bg)
          .border_1()
          .border_color(k.border),
        state,
        b.id,
        () => askTask(d, b.id),
      );
      if (b.inside) bar = bar.pl((b.labelX - b.x0) * z).child(content(o, d, task, z, k.fg));
      if (dim) bar = bar.opacity(DIMMED);
      if (lit) {
        items.push(
          div()
            .absolute()
            .left((b.x0 - RING) * z)
            .top((b.y - RING) * z)
            .w((b.x1 - b.x0 + RING * 2) * z)
            .h((b.h + RING * 2) * z)
            .rounded((t.radiusM + RING) * z)
            .border_2()
            .border_color(t.interactiveAccentDefault),
        );
      }
      items.push(bar);
    } else {
      items.push(
        pointable(
          div()
            .id(o.id(`${part}-task-${b.id}`))
            .absolute()
            .left(b.x0 * z)
            .top(b.y * z)
            .w((b.x1 - b.x0) * z)
            .h(b.h * z),
          state,
          b.id,
          () => askTask(d, b.id),
        ),
      );
    }
    if (!b.inside) {
      let label = pointable(
        div()
          .id(o.id(`${part}-label-${b.id}`))
          .absolute()
          .left(b.labelX * z)
          .top(b.y * z)
          .h(b.h * z)
          .flex()
          .items_center()
          .child(content(o, d, task, z, lit ? t.interactiveAccentDefault : k.outside)),
        state,
        b.id,
        () => askTask(d, b.id),
      );
      if (dim) label = label.opacity(DIMMED);
      items.push(label);
    }
    return items;
  });

  return div()
    .relative()
    .w(W)
    .h(layout.height * z)
    .children(lines)
    .children(bands)
    .children(tickLabels)
    .child(axisLine)
    .children(built.painted.map(layer))
    .children(tasks);
}

// ── Sizing ──

interface Measurers {
  label: Measurer;
  lane: Measurer;
  tick: Measurer;
}

/** Every character a tick label has: tick labels are measured as the sum of their characters. */
const TICK_CHARS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec -0123456789";

export const Timeline: Component = {
  render(props, ctx, node) {
    const t = ctx.t;
    const model = timelineModel(props, ctx.streaming);
    const statementId = node.statementId ?? "";
    const local = ctx.local<Local>({ layout: null, key: "", paths: {} });
    const state = canvasState(ctx, model.steps.length);

    const s = styles(t);
    const m: Measurers = {
      label: new Measurer(ctx, s.label, "m-label").want(model.tasks.map((x) => x.label)),
      lane: new Measurer(ctx, s.lane, "m-lane").want(model.tasks.flatMap((x) => (x.lane ? [x.lane] : []))),
      tick: new Measurer(ctx, s.tick, "m-tick").want([TICK_CHARS]),
    };
    if (m.label.ready && m.lane.ready && m.tick.charsReady) {
      const laid = timelineLayout(model, {
        content: (task) => m.label.width(task.label) + (STATUS_ICON[task.status] ? ICON + ICON_GAP : 0),
        contentH: m.label.lineHeight,
        lane: (label) => m.lane.width(label),
        laneH: m.lane.lineHeight,
        tick: (label) => m.tick.width(label),
        tickH: m.tick.lineHeight,
      });
      const key = laid ? JSON.stringify(laid) : "";
      if (key !== local.key) {
        local.layout = laid;
        local.key = key;
        local.paths = {};
      }
    }

    const probes = [m.label.probes(), m.lane.probes(), m.tick.probes()].filter((p): p is Element => p !== null);
    const layout = local.layout;
    const d: Draw | null = layout && { ctx, t, model, layout, local, state, s, statementId };
    const n = model.tasks.length;
    return canvas(ctx, state, {
      content: d && {
        width: d.layout.width,
        height: d.layout.height,
        draw: (o, z, part) => drawing(o, { ...d, t: o.t }, z, part),
        reveal: (highlight) => revealBox(d.layout, highlight),
      },
      placeholder: n ? `Laying out ${n} tasks…` : "No tasks yet",
      steps: model.steps,
      askStep: (i) => stepQuestion(ctx, statementId, model.steps, i),
      extra: probes,
    });
  },
};

/** Task: a value a Timeline reads; drawn only through it. */
export const TimelinePart: Component = {
  render() {
    return null;
  },
};
