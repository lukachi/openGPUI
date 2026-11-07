// Sequence: openGPUI's own sequence diagram (docs/diagram.md), on the shared diagram canvas.
//
// Its props become a model (diagram/sequence.ts); its text is measured with the charts'
// Measurer and laid out right here (diagram/sequenceLayout.ts: no ELK, no ctx.layout): header
// boxes like Diagram's nodes, dashed lifelines, message arrows as gpui paths (call: solid with a
// filled head, reply: dashed with an open head, async: solid with an open head), labels on
// plates, numbered badges like the steps list's, and block frames like Diagram's groups. The
// viewport, pan, zoom, expand and steps are the canvas's; the selected step lights its
// participants and messages and dims the rest. Paths are rebuilt per zoom level and highlight.
//
// A click on a participant or a message (not a drag) asks the agent about it.
import { ACTION_STEPS } from "@openuidev/lang-core";
import { div, PathBuilder, type Color, type Element } from "gpui-kit";
import { isMessageNumber, sequenceModel, type MessageStyle, type SequenceModel } from "../diagram/sequence.ts";
import {
  BLOCK_TITLE_PAD_X,
  HEAD_ICON,
  HEAD_ICON_GAP,
  HEAD_PAD_X,
  SUB_GAP,
  sequenceLayout,
  type SequenceLayout,
} from "../diagram/sequenceLayout.ts";
import { optional, type Component, type RenderContext } from "../render/surface.ts";
import { alpha, textStyle, typography, type TextStyle, type Tokens } from "../render/tokens.ts";
import { Measurer } from "./charts/measure.ts";
import { layer, type Painted } from "./charts/paint.ts";
import { widthsVersion } from "./charts/widths.ts";
import { canvas, canvasState, DIMMED, pointable, scaled, stepQuestion, type Box, type CanvasContent, type CanvasState } from "./diagram/canvas.ts";
import { KIND_ICON } from "./diagram/kinds.ts";

const ARROW_LEN = 8;
const ARROW_HALF = 4.5;
const DASH = [5, 4];
const LIFELINE_DASH = [4, 4];

interface Styles {
  label: TextStyle;
  sub: TextStyle;
  message: TextStyle;
  block: TextStyle;
  badge: TextStyle;
}

const styles = (t: Tokens): Styles => ({
  label: typography(t, "label", "heavy"),
  sub: typography(t, "body", "small"),
  message: typography(t, "label", "small"),
  block: typography(t, "label", "small-heavy"),
  badge: typography(t, "number", "extra-small-heavy"),
});

type Measurers = Record<keyof Styles, Measurer>;

function measurers(ctx: RenderContext, s: Styles, model: SequenceModel): Measurers {
  const m: Measurers = {
    label: new Measurer(ctx, s.label, "m-label"),
    sub: new Measurer(ctx, s.sub, "m-sub"),
    message: new Measurer(ctx, s.message, "m-message"),
    block: new Measurer(ctx, s.block, "m-block"),
    badge: new Measurer(ctx, s.badge, "m-badge"),
  };
  m.label.want(model.participants.map((p) => p.label));
  m.sub.want(model.participants.flatMap((p) => (p.sub ? [p.sub] : [])));
  m.message.want(model.messages.map((msg) => msg.label));
  m.block.want(model.blocks.map((b) => b.label));
  m.badge.want(model.messages.map((msg) => String(msg.n)));
  return m;
}

interface Drawn {
  model: SequenceModel;
  layout: SequenceLayout;
}

interface Local {
  /** What is drawn: the last model laid out (kept while new text is being measured). */
  drawn: Drawn | null;
  /** What `drawn` was laid out from: the props object and the widths it was measured with. */
  key: { props: unknown; widths: number } | null;
  /** Built paths per viewport ("in", "full"), for one zoom and highlight; a new layout drops them. */
  paths: Record<string, { key: string; painted: Painted[] }>;
}

// ── Highlight ──

interface Marks {
  /** A step is selected: what it doesn't light is dimmed. */
  active: boolean;
  participants: Set<string>;
  messages: Set<number>;
}

/** What a complete step's highlight ids (null: no step lit) and the hovered item light. */
function marks(model: SequenceModel, highlight: readonly string[] | null, hover: string | null): Marks {
  const participants = new Set<string>();
  const messages = new Set<number>();
  const ids = new Set(model.participants.map((p) => p.id));
  const lightMessage = (n: number) => {
    const msg = model.messages.find((x) => x.n === n);
    if (!msg) return;
    messages.add(n);
    participants.add(msg.from);
    participants.add(msg.to);
  };
  for (const id of highlight ?? []) {
    if (ids.has(id)) participants.add(id);
    else if (isMessageNumber(id, model.count)) lightMessage(Number(id));
  }
  // Hover ids keep participants ("p:<id>") and messages ("m:<n>") apart: a participant id may be a number.
  if (hover?.startsWith("p:")) {
    const id = hover.slice(2);
    participants.add(id);
    for (const msg of model.messages) if (msg.from === id || msg.to === id) messages.add(msg.n);
  } else if (hover?.startsWith("m:")) lightMessage(Number(hover.slice(2)));
  return { active: highlight !== null, participants, messages };
}

/** The box around what a step's highlight lights: lit participants' headers, lit messages' rows. */
function revealBox(drawn: Drawn, highlight: readonly string[]): Box | null {
  const { layout, model } = drawn;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    box.x0 = Math.min(box.x0, x0);
    box.y0 = Math.min(box.y0, y0);
    box.x1 = Math.max(box.x1, x1);
    box.y1 = Math.max(box.y1, y1);
  };
  const ids = new Set(model.participants.map((p) => p.id));
  for (const id of highlight) {
    if (ids.has(id)) {
      const p = layout.participants.find((x) => x.id === id);
      if (p) add(p.x, p.y, p.x + p.w, p.y + p.h);
    } else if (isMessageNumber(id, model.count)) {
      const row = layout.messages.find((r) => r.n === Number(id));
      if (row) add(row.hit.x, row.hit.y, row.hit.x + row.hit.w, row.hit.y + row.hit.h);
    }
  }
  return box.x0 === Infinity ? null : box;
}

// ── Paths ──

type Class = "normal" | "dim" | "lit";

/** Lifelines and arrows as built paths: per class a dashed lifeline stroke, solid and dashed lines, filled and open heads. */
function paths(drawn: Drawn, z: number, m: Marks, color: Record<Class, Color>): Painted[] {
  const k = Math.max(z, 0.6);
  type Parts = { lifeline: PathBuilder; solid: PathBuilder; dashed: PathBuilder; open: PathBuilder; fill: PathBuilder; used: Set<string> };
  const builders = new Map<Class, Parts>();
  const get = (c: Class) => {
    let b = builders.get(c);
    if (!b) {
      const width = c === "lit" ? 2 : 1.25;
      b = {
        lifeline: PathBuilder.stroke(c === "lit" ? 1.5 : 1).dash_array(LIFELINE_DASH.map((v) => v * k)),
        solid: PathBuilder.stroke(width),
        dashed: PathBuilder.stroke(width).dash_array(DASH.map((v) => v * k)),
        open: PathBuilder.stroke(width),
        fill: PathBuilder.fill(),
        used: new Set(),
      };
      builders.set(c, b);
    }
    return b;
  };
  const classOf = (lit: boolean): Class => (lit ? "lit" : m.active ? "dim" : "normal");
  const { layout, model } = drawn;

  for (const p of layout.participants) {
    const b = get(classOf(m.participants.has(p.id)));
    b.used.add("lifeline");
    b.lifeline.move_to(p.cx * z, layout.lifeline.y0 * z).line_to(p.cx * z, layout.lifeline.y1 * z);
  }

  const styleOf = new Map<number, MessageStyle>(model.messages.map((msg) => [msg.n, msg.style]));
  for (const row of layout.messages) {
    const style = styleOf.get(row.n) ?? "call";
    const b = get(classOf(m.messages.has(row.n)));
    const line = style === "reply" ? b.dashed : b.solid;
    b.used.add(style === "reply" ? "dashed" : "solid");
    const y = row.y * z;
    // The last leg runs toward the tip in direction (dx, 0): leftward for a self message.
    let sx: number;
    if (row.self) {
      line.move_to(row.x0 * z, y).line_to(row.self.right * z, y).line_to(row.self.right * z, row.self.bottom * z);
      sx = row.self.right * z;
    } else {
      line.move_to(row.x0 * z, y);
      sx = row.x0 * z;
    }
    const ty = row.self ? row.self.bottom * z : y;
    const tx = row.x1 * z;
    const dx = Math.sign(tx - sx) || 1;
    const len = Math.min(ARROW_LEN * k, Math.abs(tx - sx));
    const half = ARROW_HALF * k;
    const bx = tx - dx * len;
    if (style === "call") {
      // A filled head: the line stops where it begins.
      line.line_to(bx, ty);
      b.used.add("fill");
      b.fill.add_polygon([[tx, ty], [bx, ty - half], [bx, ty + half]], true);
    } else {
      line.line_to(tx, ty);
      b.used.add("open");
      b.open.move_to(bx, ty - half).line_to(tx, ty).line_to(bx, ty + half);
    }
  }

  const out: Painted[] = [];
  // Dimmed under normal under lit.
  for (const c of ["dim", "normal", "lit"] as const) {
    const b = builders.get(c);
    if (!b) continue;
    for (const part of ["lifeline", "dashed", "solid", "open", "fill"] as const) if (b.used.has(part)) out.push({ path: b[part].build(), paint: color[c] });
  }
  return out;
}

// ── Drawing ──

interface Draw {
  ctx: RenderContext;
  drawn: Drawn;
  local: Local;
  state: CanvasState;
  s: Styles;
  statementId: string;
}

/** The default question about a participant, or the Participant's own action. */
function askParticipant(d: Draw, id: string): void {
  const p = d.drawn.model.participants.find((x) => x.id === id);
  if (!p) return;
  const message = `Tell me more about ${p.label}`;
  d.ctx.trigger(message, p.action ?? { steps: [{ type: ACTION_STEPS.ToAssistant, message, context: { diagram: d.statementId, node: id } }] });
}

function askMessage(d: Draw, n: number): void {
  const msg = d.drawn.model.messages.find((x) => x.n === n);
  if (!msg) return;
  const message = `Tell me more about message ${n}: ${msg.label}`;
  d.ctx.trigger(message, { steps: [{ type: ACTION_STEPS.ToAssistant, message, context: { diagram: d.statementId, message: n } }] });
}

/** The drawing at scale z, its top-left at the origin of a relative box of its size. */
function drawing(o: RenderContext, d: Draw, z: number, part: string): Element {
  const t = o.t;
  const { drawn, local, state, s } = d;
  const { layout, model } = drawn;
  const step = state.step === null ? undefined : model.steps[state.step];
  const m = marks(model, step?.complete ? step.highlight : null, state.hover);
  const classOf = (lit: boolean): Class => (lit ? "lit" : m.active ? "dim" : "normal");

  const pathKey = `${z}|${m.active}|${[...m.participants].join(",")}|${[...m.messages].join(",")}`;
  let built = local.paths[part];
  if (built?.key !== pathKey) {
    const muted = t.textNeutralSecondary;
    built = { key: pathKey, painted: paths(drawn, z, m, { normal: muted, dim: alpha(muted, DIMMED), lit: t.interactiveAccentDefault }) };
    local.paths[part] = built;
  }

  const frames = layout.blocks.map((f) => {
    const lit = [...m.messages].some((n) => n >= f.first && n <= f.last);
    const frame = div()
      .absolute()
      .left(f.x * z)
      .top(f.y * z)
      .w(f.w * z)
      .h(f.h * z)
      .rounded(t.radiusM * z)
      .bg(t.sunkLight)
      .border_1()
      .border_color(t.borderDefault)
      .when(m.active && !lit, (el) => el.opacity(0.6));
    // Lifelines run over the frame, under its title: the tab's tint sits on an opaque plate.
    const title = div()
      .absolute()
      .left(f.x * z)
      .top(f.y * z)
      .rounded_tl(t.radiusM * z)
      .rounded_br(t.radiusM * z)
      .bg(t.foreground)
      .when(m.active && !lit, (el) => el.opacity(0.6))
      .child(
        textStyle(div().flex().items_center().whitespace_nowrap(), scaled(s.block, z))
          .h(f.titleH * z)
          .px(BLOCK_TITLE_PAD_X * z)
          .rounded_tl(t.radiusM * z)
          .rounded_br(t.radiusM * z)
          .bg(t.sunk)
          .border_r_1()
          .border_b_1()
          .border_color(t.borderDefault)
          .text_color(t.textNeutralSecondary)
          .child(f.label),
      );
    return { frame, title };
  });

  const labelOf = new Map(model.messages.map((msg) => [msg.n, msg.label]));
  const messages = layout.messages.map((row) => {
    const c = classOf(m.messages.has(row.n));
    const lit = c === "lit";
    // The plate hides the lifelines under the label; inside blocks it takes on their stacked tint
    // (translucent sunkLight over the opaque foreground), so it doesn't show as a patch.
    let label: Element = textStyle(div().size_full().flex().items_center().justify_center().whitespace_nowrap(), scaled(s.message, z))
      .text_color(lit ? t.interactiveAccentDefault : t.textNeutralSecondary)
      .child(labelOf.get(row.n) ?? "");
    for (let i = 0; i < row.depth; i++) label = div().size_full().bg(t.sunkLight).child(label);
    const plate = div()
      .absolute()
      .left((row.label.x - row.hit.x) * z)
      .top((row.label.y - row.hit.y) * z)
      .w(row.label.w * z)
      .h(row.label.h * z)
      .bg(t.foreground)
      .child(label);
    // On an opaque plate, so the lifeline it sits on doesn't show through.
    const badge = div()
      .absolute()
      .left((row.badge.x - row.hit.x) * z)
      .top((row.badge.y - row.hit.y) * z)
      .w(row.badge.w * z)
      .h(row.badge.h * z)
      .rounded(row.badge.h * z)
      .bg(t.foreground)
      .child(
        textStyle(div().size_full().flex().items_center().justify_center(), scaled(s.badge, z))
          .rounded(row.badge.h * z)
          .bg(lit ? t.interactiveAccentDefault : t.elevated)
          .border_1()
          .border_color(lit ? t.interactiveAccentDefault : t.borderDefault)
          .text_color(lit ? t.textWhite : t.textNeutralSecondary)
          .child(String(row.n)),
      );
    return pointable(
      div()
        .id(o.id(`${part}-msg-${row.n}`))
        .absolute()
        .left(row.hit.x * z)
        .top(row.hit.y * z)
        .w(row.hit.w * z)
        .h(row.hit.h * z)
        .when(c === "dim", (el) => el.opacity(DIMMED)),
      state,
      `m:${row.n}`,
      () => askMessage(d, row.n),
    ).children([plate, badge]);
  });

  const heads = layout.participants.flatMap((p) => {
    const info = model.participants.find((x) => x.id === p.id);
    if (!info) return [];
    const c = classOf(m.participants.has(p.id));
    const lit = c === "lit";
    const icon = o.icon(KIND_ICON[info.kind], { size: HEAD_ICON * z });
    const text = div()
      .flex()
      .flex_col()
      .min_w_0()
      .gap(SUB_GAP * z)
      .child(textStyle(div().whitespace_nowrap(), scaled(s.label, z)).text_color(t.textNeutralPrimary).child(info.label))
      .children(info.sub ? [textStyle(div().whitespace_nowrap(), scaled(s.sub, z)).text_color(t.textNeutralSecondary).child(info.sub)] : []);
    let box = pointable(
      div()
        .id(o.id(`${part}-p-${p.id}`))
        .absolute()
        .left(p.x * z)
        .top(p.y * z)
        .w(p.w * z)
        .h(p.h * z)
        .flex()
        .flex_row()
        .items_center()
        .gap(HEAD_ICON_GAP * z)
        .px(HEAD_PAD_X * z)
        .rounded(t.radiusM * z)
        .bg(lit ? t.highlightSubtle : t.elevated)
        .border_1()
        .border_color(lit ? t.interactiveAccentDefault : t.borderDefault)
        .text_color(lit ? t.interactiveAccentDefault : t.textNeutralSecondary),
      state,
      `p:${p.id}`,
      () => askParticipant(d, p.id),
    )
      .children(optional(icon))
      .child(text);
    if (info.kind === "external") box = box.border_dashed();
    if (c === "dim") box = box.opacity(DIMMED);
    return [box];
  });

  return div()
    .relative()
    .w(layout.width * z)
    .h(layout.height * z)
    .children(frames.map((f) => f.frame))
    .children(built.painted.map(layer))
    .children(frames.map((f) => f.title))
    .children(messages)
    .children(heads);
}

export const Sequence: Component = {
  render(props, ctx, node) {
    const model = sequenceModel(props, ctx.streaming);
    const statementId = node.statementId ?? "";
    const local = ctx.local<Local>({ drawn: null, key: null, paths: {} });
    const state = canvasState(ctx, model.steps.length);

    const s = styles(ctx.t);
    const m = measurers(ctx, s, model);
    // Laid out once every character is known (a string not probed whole yet measures as its
    // characters, refined when its probe lands); until then the last layout stays.
    const ms = Object.values(m);
    if (model.participants.length && ms.every((x) => x.charsReady)) {
      const widths = widthsVersion();
      if (local.key?.props !== props || local.key.widths !== widths) {
        local.drawn = { model, layout: sequenceLayout(model, m) };
        local.key = { props, widths };
        local.paths = {};
      }
    } else if (!model.participants.length) local.drawn = null;

    const drawn = local.drawn;
    let content: CanvasContent | null = null;
    if (drawn) {
      // Steps and actions are the current model's; the drawing is the laid-out one.
      const current: Drawn = { model: { ...drawn.model, steps: model.steps }, layout: drawn.layout };
      const d: Draw = { ctx, drawn: current, local, state, s, statementId };
      content = {
        width: drawn.layout.width,
        height: drawn.layout.height,
        draw: (o, z, part) => drawing(o, d, z, part),
        reveal: (highlight) => revealBox(drawn, highlight),
      };
    }
    return canvas(ctx, state, {
      content,
      placeholder: model.participants.length ? "Measuring…" : "No participants yet",
      steps: model.steps,
      askStep: (i) => stepQuestion(ctx, statementId, model.steps, i),
      extra: ms.map((x) => x.probes()).filter((p): p is Element => p !== null),
    });
  },
};
