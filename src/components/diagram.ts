// Diagram: openGPUI's own component (docs/diagram.md), not a port of upstream.
//
// A Diagram's props become a model (diagram/model.ts). Its text is measured with the charts'
// Measurer, the sized graph goes to the host's layouter through ctx.layout (ELK, outside the
// pane), and the laid-out boxes and polylines are drawn here: groups as frames, nodes as boxes
// with a kind icon (start/end as pills), entities as cards of fields, edges as gpui paths
// (solid or dashed) with their heads, labels on plates. The viewport, pan,
// zoom, expand and the numbered steps are the shared diagram canvas (diagram/canvas.ts); the
// selected step lights its nodes and edges and dims the rest. Zoom redraws at another scale, so
// the edge paths are rebuilt per zoom level (not per pan).
//
// A click on a box (not a drag) asks the agent about it; each step has an ask button.
import { ACTION_STEPS, type OpenUIErrorCode } from "@openuidev/lang-core";
import { div, PathBuilder, type Color, type Element } from "gpui-kit";
import { diagramModel } from "../diagram/model.ts";
import type { DiagramEdge, DiagramLayout, DiagramModel, DiagramNode, EdgeHead, SizedGraph } from "../diagram/types.ts";
import { optional, type Component, type RenderContext } from "../render/surface.ts";
import { alpha, textStyle, typography, type TextStyle, type Tokens } from "../render/tokens.ts";
import { Measurer } from "./charts/measure.ts";
import { layer, type Painted } from "./charts/paint.ts";
import { canvas, canvasState, DIMMED, pointable, scaled, stepQuestion, type Box, type CanvasContent, type CanvasState } from "./diagram/canvas.ts";
import { KIND_ICON } from "./diagram/kinds.ts";

// ── Geometry (px at scale 1) ──

const NODE_PAD_X = 12;
/** start/end pills: their round ends need more room than a box's corners. */
const PILL_PAD_X = 16;
const NODE_PAD_Y = 8;
const NODE_ICON = 16;
const NODE_ICON_GAP = 8;
const NODE_MIN_W = 88;
const SUB_GAP = 2;
const EDGE_LABEL_PAD_X = 6;
const EDGE_LABEL_PAD_Y = 2;
const GROUP_TITLE_PAD_X = 8;
const GROUP_TITLE_PAD_Y = 4;
/** Each edge head's length along the line and half its width across. */
const HEAD_LEN: Record<EdgeHead, number> = { arrow: 8, none: 0, triangle: 11, diamond: 16 };
const HEAD_HALF: Record<EdgeHead, number> = { arrow: 4.5, none: 0, triangle: 6.5, diamond: 6 };
const DASH = [5, 4];
/** Entity cards: field rows, the key column (when any field has a key), the gap before a type. */
const ROW_PAD_Y = 3;
const ROWS_PAD_Y = 4;
const KEY_ICON = 12;
const KEY_GAP = 6;
const TYPE_GAP = 16;

interface Styles {
  label: TextStyle;
  sub: TextStyle;
  edge: TextStyle;
  title: TextStyle;
  field: TextStyle;
}

const styles = (t: Tokens): Styles => ({
  label: typography(t, "label", "heavy"),
  sub: typography(t, "body", "small"),
  edge: typography(t, "label", "small"),
  title: typography(t, "label", "small-heavy"),
  field: typography(t, "code", "small"),
});


interface Drawn {
  graph: SizedGraph;
  layout: DiagramLayout;
}

interface Local {
  /** What is drawn: the last graph laid out (kept while a changed graph lays out). */
  drawn: Drawn | null;
  /** Built paths per viewport ("in", "full"), for one zoom and highlight; a new layout drops them. */
  paths: Record<string, { key: string; painted: Painted[] }>;
  /** The layout failure already reported to the session. */
  reported: string | null;
}

// ── Sizing ──

interface Measurers {
  label: Measurer;
  sub: Measurer;
  edge: Measurer;
  title: Measurer;
  field: Measurer;
}

function measurers(ctx: RenderContext, s: Styles, model: DiagramModel): Measurers {
  const m: Measurers = {
    label: new Measurer(ctx, s.label, "m-label"),
    sub: new Measurer(ctx, s.sub, "m-sub"),
    edge: new Measurer(ctx, s.edge, "m-edge"),
    title: new Measurer(ctx, s.title, "m-title"),
    field: new Measurer(ctx, s.field, "m-field"),
  };
  m.label.want(model.nodes.map((n) => n.label));
  m.sub.want(model.nodes.flatMap((n) => (n.sub ? [n.sub] : [])));
  m.edge.want(model.edges.flatMap((e) => (e.label ? [e.label] : [])));
  m.title.want(model.groups.map((g) => g.label));
  m.field.want(model.nodes.flatMap((n) => (n.fields ?? []).flatMap((f) => (f.type ? [f.name, f.type] : [f.name]))));
  return m;
}

const ready = (m: Measurers) => m.label.ready && m.sub.ready && m.edge.ready && m.title.ready && m.field.ready;

const isPill = (n: DiagramNode) => !n.fields && (n.kind === "start" || n.kind === "end");
const padX = (n: DiagramNode) => (isPill(n) ? PILL_PAD_X : NODE_PAD_X);

/** An entity card's parts at scale 1: header height, row height, whether rows have a key column. */
function cardRows(n: DiagramNode, m: Measurers) {
  return {
    head: NODE_PAD_Y * 2 + m.label.lineHeight + (n.sub ? SUB_GAP + m.sub.lineHeight : 0),
    row: m.field.lineHeight + ROW_PAD_Y * 2,
    keys: (n.fields ?? []).some((f) => f.key),
  };
}

function nodeSize(n: DiagramNode, m: Measurers): { w: number; h: number } {
  const text = Math.max(m.label.width(n.label), n.sub ? m.sub.width(n.sub) : 0);
  if (!n.fields) {
    return {
      w: Math.max(NODE_MIN_W, Math.ceil(padX(n) * 2 + NODE_ICON + NODE_ICON_GAP + text)),
      h: NODE_PAD_Y * 2 + m.label.lineHeight + (n.sub ? SUB_GAP + m.sub.lineHeight : 0),
    };
  }
  const card = cardRows(n, m);
  const keyCol = card.keys ? KEY_ICON + KEY_GAP : 0;
  const rows = n.fields.map((f) => keyCol + m.field.width(f.name) + (f.type ? TYPE_GAP + m.field.width(f.type) : 0));
  // The 2 px are the card's border; the third its header divider.
  return {
    w: Math.max(NODE_MIN_W, Math.ceil(NODE_PAD_X * 2 + Math.max(text, ...rows) + 2)),
    h: card.head + (n.fields.length ? ROWS_PAD_Y * 2 + card.row * n.fields.length + 1 : 0) + 2,
  };
}

/** The model as boxes with sizes: what the layout engine gets. */
function sizedGraph(model: DiagramModel, m: Measurers): SizedGraph {
  const ids = new Set(model.nodes.map((n) => n.id));
  return {
    direction: model.direction,
    nodes: model.nodes.map((n) => {
      const { w, h } = nodeSize(n, m);
      return n.group ? { id: n.id, w, h, group: n.group } : { id: n.id, w, h };
    }),
    groups: model.groups.map((g) => ({
      id: g.id,
      titleW: Math.ceil(m.title.width(g.label) + GROUP_TITLE_PAD_X * 2),
      titleH: m.title.lineHeight + GROUP_TITLE_PAD_Y * 2,
    })),
    edges: model.edges
      .filter((e) => ids.has(e.from) && ids.has(e.to))
      .map((e) =>
        e.label
          ? {
              id: e.id,
              from: e.from,
              to: e.to,
              labelW: Math.ceil(m.edge.width(e.label) + EDGE_LABEL_PAD_X * 2),
              labelH: m.edge.lineHeight + EDGE_LABEL_PAD_Y * 2,
            }
          : { id: e.id, from: e.from, to: e.to },
      ),
  };
}


// ── Highlight ──

interface Marks {
  /** A step is selected: what it doesn't light is dimmed. */
  active: boolean;
  nodes: Set<string>;
  edges: Set<string>;
}

/** What a complete step's highlight ids (null: no step lit) and the hovered node light. */
function marks(model: DiagramModel, highlight: readonly string[] | null, hover: string | null): Marks {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const id of highlight ?? []) {
    const edge = model.edges.find((e) => e.id === id);
    if (edge) {
      edges.add(edge.id);
      nodes.add(edge.from);
      nodes.add(edge.to);
    } else nodes.add(id);
  }
  if (hover) {
    nodes.add(hover);
    for (const e of model.edges) if (e.from === hover || e.to === hover) edges.add(e.id);
  }
  return { active: highlight !== null, nodes, edges };
}

/** The box around the nodes a step's highlight lights (edges light their ends), or null. */
function revealBox(drawn: Drawn, model: DiagramModel, highlight: readonly string[]): Box | null {
  const lit = marks(model, highlight, null).nodes;
  const boxes = drawn.graph.nodes.filter((n) => lit.has(n.id) && drawn.layout.nodes[n.id]);
  if (!boxes.length) return null;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const n of boxes) {
    const p = drawn.layout.nodes[n.id]!;
    box.x0 = Math.min(box.x0, p.x);
    box.y0 = Math.min(box.y0, p.y);
    box.x1 = Math.max(box.x1, p.x + n.w);
    box.y1 = Math.max(box.y1, p.y + n.h);
  }
  return box;
}

// ── Paths ──

type EdgeClass = "normal" | "dim" | "lit";

/** The edges as built paths: per class a solid and a dashed stroke and a head fill. */
function edgePaths(drawn: Drawn, z: number, edgeOf: (id: string) => DiagramEdge | undefined, classOf: (id: string) => EdgeClass, color: Record<EdgeClass, Color>): Painted[] {
  const builders = new Map<EdgeClass, { solid: PathBuilder; dashed: PathBuilder; fill: PathBuilder; used: Set<"solid" | "dashed" | "fill"> }>();
  const k = Math.max(z, 0.6);
  const get = (c: EdgeClass) => {
    let b = builders.get(c);
    if (!b) {
      const width = c === "lit" ? 2 : 1.25;
      b = { solid: PathBuilder.stroke(width), dashed: PathBuilder.stroke(width).dash_array(DASH.map((v) => v * k)), fill: PathBuilder.fill(), used: new Set() };
      builders.set(c, b);
    }
    return b;
  };
  for (const e of drawn.graph.edges) {
    const route = drawn.layout.edges[e.id];
    if (!route || route.points.length < 2) continue;
    const edge = edgeOf(e.id);
    const head = edge?.head ?? "arrow";
    const style = edge?.style ?? "solid";
    const pts = route.points.map(([x, y]) => [x * z, y * z] as [number, number]);
    const [tx, ty] = pts[pts.length - 1]!;
    const [sx, sy] = pts[pts.length - 2]!;
    const len = Math.hypot(tx - sx, ty - sy) || 1;
    const dx = (tx - sx) / len;
    const dy = (ty - sy) / len;
    // The line stops where the head begins: a hollow triangle stays empty, a dash never pokes through.
    const headLen = Math.min(HEAD_LEN[head] * k, len);
    const half = HEAD_HALF[head] * k;
    const bx = tx - dx * headLen;
    const by = ty - dy * headLen;
    const b = get(classOf(e.id));
    const line = style === "dashed" ? b.dashed : b.solid;
    b.used.add(style);
    line.move_to(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length - 1; i++) line.line_to(pts[i]![0], pts[i]![1]);
    line.line_to(bx, by);
    if (head === "arrow") {
      b.used.add("fill");
      b.fill.add_polygon([[tx, ty], [bx - dy * half, by + dx * half], [bx + dy * half, by - dx * half]], true);
    } else if (head === "triangle") {
      b.used.add("solid");
      b.solid.add_polygon([[tx, ty], [bx - dy * half, by + dx * half], [bx + dy * half, by - dx * half]], true);
    } else if (head === "diamond") {
      const mx = tx - (dx * headLen) / 2;
      const my = ty - (dy * headLen) / 2;
      b.used.add("fill");
      b.fill.add_polygon([[tx, ty], [mx - dy * half, my + dx * half], [bx, by], [mx + dy * half, my - dx * half]], true);
    }
  }
  const out: Painted[] = [];
  // Dimmed under normal under lit.
  for (const c of ["dim", "normal", "lit"] as const) {
    const b = builders.get(c);
    if (!b) continue;
    for (const part of ["dashed", "solid", "fill"] as const) if (b.used.has(part)) out.push({ path: b[part].build(), paint: color[c] });
  }
  return out;
}


// ── Drawing ──

interface Draw {
  ctx: RenderContext;
  model: DiagramModel;
  drawn: Drawn;
  local: Local;
  state: CanvasState;
  s: Styles;
  m: Measurers;
  statementId: string;
}

/** The default question about a node, or the Node's own action. */
function askNode(d: Draw, id: string): void {
  const node = d.model.nodes.find((n) => n.id === id);
  if (!node) return;
  const message = `Tell me more about ${node.label}`;
  d.ctx.trigger(message, node.action ?? { steps: [{ type: ACTION_STEPS.ToAssistant, message, context: { diagram: d.statementId, node: id } }] });
}

/** The drawing at scale z, its top-left at the origin of a relative box of its size. */
function drawing(o: RenderContext, d: Draw, z: number, part: string): Element {
  const t = o.t;
  const { drawn, model, local, state, s } = d;
  const step = state.step === null ? undefined : model.steps[state.step];
  const m = marks(model, step?.complete ? step.highlight : null, state.hover);
  const nodeClass = (id: string) => (m.nodes.has(id) ? "lit" : m.active ? "dim" : "normal");
  const edgeClass = (id: string): EdgeClass => (m.edges.has(id) ? "lit" : m.active ? "dim" : "normal");

  // The edges' look rides in the key: restyling an edge keeps the layout.
  const pathKey = `${z}|${m.active}|${[...m.edges].join(",")}|${model.edges.map((e) => `${e.style}${e.head}`).join(",")}`;
  let built = local.paths[part];
  if (built?.key !== pathKey) {
    const muted = t.textNeutralSecondary;
    const byId = new Map(model.edges.map((e) => [e.id, e]));
    built = { key: pathKey, painted: edgePaths(drawn, z, (id) => byId.get(id), edgeClass, { normal: muted, dim: alpha(muted, DIMMED), lit: t.interactiveAccentDefault }) };
    local.paths[part] = built;
  }

  const groups = model.groups.flatMap((g) => {
    const box = drawn.layout.groups[g.id];
    if (!box) return [];
    const frame = div()
      .absolute()
      .left(box.x * z)
      .top(box.y * z)
      .w(box.w * z)
      .h(box.h * z)
      .rounded(t.radiusM * z)
      .bg(t.sunkLight)
      .border_1()
      .border_color(t.borderDefault)
      .when(m.active, (el) => el.opacity(0.6));
    const title = textStyle(div().absolute().whitespace_nowrap(), scaled(s.title, z))
      .left((box.titleX + GROUP_TITLE_PAD_X) * z)
      .top((box.titleY + GROUP_TITLE_PAD_Y) * z)
      .text_color(t.textNeutralSecondary)
      .child(g.label);
    return [frame, title];
  });

  const labels = drawn.graph.edges.flatMap((e) => {
    const route = drawn.layout.edges[e.id];
    const text = model.edges.find((x) => x.id === e.id)?.label;
    if (!route || route.labelX === undefined || route.labelY === undefined || !text || !e.labelW || !e.labelH) return [];
    const c = edgeClass(e.id);
    return [
      textStyle(div().absolute().flex().items_center().justify_center().whitespace_nowrap(), scaled(s.edge, z))
        .left(route.labelX * z)
        .top(route.labelY * z)
        .w(e.labelW * z)
        .h(e.labelH * z)
        .rounded(t.radiusS * z)
        .bg(t.foreground)
        .text_color(c === "lit" ? t.interactiveAccentDefault : t.textNeutralSecondary)
        .when(c === "dim", (el) => el.opacity(DIMMED))
        .child(text),
    ];
  });

  const nodes = drawn.graph.nodes.flatMap((g) => {
    const p = drawn.layout.nodes[g.id];
    const n = model.nodes.find((x) => x.id === g.id);
    if (!p || !n) return [];
    const c = nodeClass(n.id);
    const label = textStyle(div().whitespace_nowrap(), scaled(s.label, z)).text_color(t.textNeutralPrimary).child(n.label);
    const sub = n.sub ? [textStyle(div().whitespace_nowrap(), scaled(s.sub, z)).text_color(t.textNeutralSecondary).child(n.sub)] : [];
    let box = pointable(
      div()
        .id(o.id(`${part}-node-${n.id}`))
        .absolute()
        .left(p.x * z)
        .top(p.y * z)
        .w(g.w * z)
        .h(g.h * z)
        .flex()
        .rounded(isPill(n) ? (g.h * z) / 2 : t.radiusM * z)
        .bg(c === "lit" ? t.highlightSubtle : t.elevated)
        .border_1()
        .border_color(c === "lit" ? t.interactiveAccentDefault : t.borderDefault)
        .text_color(c === "lit" ? t.interactiveAccentDefault : t.textNeutralSecondary),
      state,
      n.id,
      () => askNode(d, n.id),
    );
    if (n.fields) {
      const card = cardRows(n, d.m);
      const rows = n.fields.map((f) =>
        textStyle(div().flex().flex_row().items_center().flex_none().h(card.row * z).px(NODE_PAD_X * z), scaled(s.field, z))
          .children(
            card.keys
              ? [
                  div()
                    .flex_none()
                    .w(KEY_ICON * z)
                    .mr(KEY_GAP * z)
                    .children(f.key ? optional(o.icon(f.key === "pk" ? "KeyRound" : "Link", { size: KEY_ICON * z })) : []),
                ]
              : [],
          )
          .child(div().flex_1().min_w_0().whitespace_nowrap().text_color(t.textNeutralPrimary).child(f.name))
          .children(f.type ? [div().flex_none().ml(TYPE_GAP * z).whitespace_nowrap().text_color(t.textNeutralSecondary).child(f.type)] : []),
      );
      box = box
        .flex_col()
        .overflow_hidden()
        .child(div().flex_none().h(card.head * z).flex().flex_col().justify_center().px(NODE_PAD_X * z).gap(SUB_GAP * z).child(label).children(sub))
        .children(
          rows.length
            ? [
                div()
                  .flex_1()
                  .flex()
                  .flex_col()
                  .py(ROWS_PAD_Y * z)
                  .border_t_1()
                  .border_color(c === "lit" ? t.interactiveAccentDefault : t.borderDefault)
                  .children(rows),
              ]
            : [],
        );
    } else {
      box = box
        .flex_row()
        .items_center()
        .gap(NODE_ICON_GAP * z)
        .px(padX(n) * z)
        .children(optional(o.icon(KIND_ICON[n.kind], { size: NODE_ICON * z })))
        .child(div().flex().flex_col().min_w_0().gap(SUB_GAP * z).child(label).children(sub));
      if (n.kind === "external") box = box.border_dashed();
    }
    if (c === "dim") box = box.opacity(DIMMED);
    return [box];
  });

  return div()
    .relative()
    .w(drawn.layout.width * z)
    .h(drawn.layout.height * z)
    .children(groups)
    .children(built.painted.map(layer))
    .children(labels)
    .children(nodes);
}

export const Diagram: Component = {
  render(props, ctx, node) {
    const t = ctx.t;
    const model = diagramModel(props, ctx.streaming);
    const statementId = node.statementId ?? "";
    const local = ctx.local<Local>({ drawn: null, paths: {}, reported: null });
    const state = canvasState(ctx, model.steps.length);

    const s = styles(t);
    const m = measurers(ctx, s, model);
    let error: string | null = null;
    if (model.nodes.length && ready(m)) {
      const graph = sizedGraph(model, m);
      const laid = ctx.layout(graph);
      if (laid.status === "ready" && local.drawn?.layout !== laid.layout) {
        local.drawn = { graph, layout: laid.layout };
        local.paths = {};
      } else if (laid.status === "failed") {
        error = laid.error;
        if (local.reported !== error) {
          local.reported = error;
          const failure = error;
          ctx.after(() =>
            ctx.session.reportRenderError({
              source: "runtime",
              // lang-core's codes are a closed union; the pipeline carries any string through.
              code: "diagram-layout-failed" as unknown as OpenUIErrorCode,
              message: `Diagram layout failed: ${failure}`,
              component: "Diagram",
              statementId,
            }),
          );
        }
      }
    }

    const probes = [m.label.probes(), m.sub.probes(), m.edge.probes(), m.title.probes(), m.field.probes()].filter((p): p is Element => p !== null);
    const drawn = local.drawn;
    let content: CanvasContent | null = null;
    if (drawn) {
      const d: Draw = { ctx, model, drawn, local, state, s, m, statementId };
      content = {
        width: drawn.layout.width,
        height: drawn.layout.height,
        draw: (o, z, part) => drawing(o, d, z, part),
        reveal: (highlight) => revealBox(drawn, model, highlight),
      };
    }
    const n = model.nodes.length;
    return canvas(ctx, state, {
      content,
      placeholder: error ? `Diagram layout failed: ${error}` : n ? `Laying out ${n} boxes…` : "No boxes yet",
      error: error !== null,
      steps: model.steps,
      askStep: (i) => stepQuestion(ctx, statementId, model.steps, i),
      extra: probes,
    });
  },
};

/** Node, Entity, Field, Group, Edge, DiagramStep: values a Diagram reads; drawn only through it. */
export const DiagramPart: Component = {
  render() {
    return null;
  },
};
