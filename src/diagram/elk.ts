// A sized graph → its layout, with elkjs's bundled build (ELK layered compiled to JS by GWT,
// no worker). CLI only (`opengpui layout`, docs/diagram.md): elkjs is about 3 MB and can pass
// gpui-shell's task budget, so it never goes into the pane's bundles (scripts/build.ts).
//
// The ELK graph: ungrouped nodes and groups at the root in the order the agent wrote them (a
// group where its first node was), each group a compound node whose top padding holds its title
// as a node label; every edge at the root, its label (if any) a sized edge label.
// `hierarchyHandling: INCLUDE_CHILDREN` lays groups out with the rest, and
// `json.shapeCoords/edgeCoords: ROOT` makes every coordinate absolute. An ELK label without
// text is left at (0, 0) unplaced, so labels carry their owner's id as text (ELK only uses the
// given size). The spacings and TUNED come from the layout spike (tmp/diagram-spike/layout):
// NETWORK_SIMPLEX placement, more crossing-minimization effort and high-degree treatment took
// its crossings from 4 / 3 / 0 to 1 / 3 / 0 on the story's three graphs with no edge through a
// node.
//
// Back edges: ELK enters a node only from its input side, so an edge it turns around to break a
// cycle loops over the whole drawing to reach its target's top. So the graph is laid out twice
// when the first layout has back edges (target wholly above its source; left of it going
// right): the second time with those edges given reversed, so they run with the flow, and drawn
// backwards (the arrow then ends on the target's bottom). The second layout is a new one, so it
// is kept only if it has no more crossings and no more edges through nodes than the first
// (`problems`, the spike's two hard faults). On the story's three graphs
// (tmp/diagram-spike/story, sizes from tmp/diagram-spike/layout/sized.json): big keeps its 1
// crossing, loses the loop of "types reply", total edge length 6184 → 5167 px, 700×1080 →
// 645×1055; pane's second layout has 9 crossings instead of 3, so it keeps the first (its
// "lang-core" detour is no cycle: shared.js sits in the top group while its one edge comes from
// the bottom group; only the markup can fix that); ship has no back edge.
// `cycleBreaking.strategy: MODEL_ORDER` is kept too: the same on the three graphs (alone, big
// −1 % edge length), but it reverses the edge back to the node written earlier, so a node the
// agent writes first stays on top (with ELK's greedy default, a Customer → API → DB → Customer
// loop drew the Customer at the bottom). Options tried on the same graphs and not kept:
//   - `considerModelOrder.strategy` NODES_AND_EDGES / PREFER_EDGES / PREFER_NODES: big 1 → 2
//     crossings and longer edges, pane and ship unchanged.
//   - `cycleBreaking.strategy` GREEDY_MODEL_ORDER, SCC_CONNECTIVITY, SCC_NODE_TYPE: as
//     MODEL_ORDER here. DEPTH_FIRST: big 2 crossings, 963 px wide. None of them alone shortens
//     the loop: the reversed edge still enters its target from the top.
//   - `feedbackEdges: true`: big 3 crossings, the loop longer still.
//   - `layering.strategy` LONGEST_PATH / COFFMAN_GRAHAM / INTERACTIVE: big 2 crossings or ship
//     longer. `mergeEdges: true`: pane 6 crossings.
//   - A second pass that keeps the first's order: INTERACTIVE crossing minimization is refused
//     with INCLUDE_CHILDREN (UnsupportedGraphException), `semiInteractive` changes nothing.
//
// The options are part of the layout: change them and bump LAYOUT_VERSION (src/render/surface.ts),
// or hosts keep serving layouts cached under the old key.
import ELK, { type ElkExtendedEdge, type ElkNode, type LayoutOptions } from "elkjs/lib/elk.bundled.js";
import type { DiagramLayout, SizedGraph } from "./types.ts";

/** Room around a group's nodes; the title adds its height (and TITLE_GAP) on top. */
const GROUP_PADDING = 12;
const TITLE_GAP = 8;

const TUNED: LayoutOptions = {
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.thoroughness": "40",
  "elk.layered.crossingMinimization.greedySwitch.type": "TWO_SIDED",
  "elk.layered.highDegreeNodes.treatment": "true",
};

/** The root's options (but direction). */
const ROOT_OPTIONS: LayoutOptions = {
  "elk.algorithm": "layered",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.spacing.nodeNode": "24",
  "elk.layered.spacing.nodeNodeBetweenLayers": "40",
  "elk.spacing.edgeNode": "16",
  "elk.spacing.edgeEdge": "10",
  "elk.spacing.edgeLabel": "4",
  "elk.edgeLabels.inline": "false",
  "elk.json.edgeCoords": "ROOT",
  "elk.json.shapeCoords": "ROOT",
  ...TUNED,
  // A cycle is broken at an edge back to a node written earlier, so the nodes the agent
  // writes first stay on top (ELK's default greedy choice may sink them).
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
};

let elk: InstanceType<typeof ELK> | null = null;

export async function layoutGraph(graph: SizedGraph): Promise<DiagramLayout> {
  elk ??= new ELK();
  const first = fromElk(graph, await elk.layout(toElk(graph, new Set())), new Set());
  const back = backEdges(graph, first);
  if (!back.size) return first;
  // The same graph with the back edges turned around, so they run with the flow, then drawn
  // backwards: kept only if that crosses no more and hits no more nodes (it is a new layout).
  const second = fromElk(graph, await elk.layout(toElk(graph, back)), back);
  const [a, b] = [problems(graph, first), problems(graph, second)];
  return b.crossings <= a.crossings && b.throughNode <= a.throughNode ? second : first;
}

/** Edges the layout drew against the flow: their target sits wholly before their source (above it, or left of it going right). */
function backEdges(graph: SizedGraph, layout: DiagramLayout): Set<string> {
  const size = new Map(graph.nodes.map((n) => [n.id, n]));
  const right = graph.direction === "right";
  const back = new Set<string>();
  for (const e of graph.edges) {
    const from = layout.nodes[e.from]!;
    const to = layout.nodes[e.to]!;
    const toEnd = right ? to.x + size.get(e.to)!.w : to.y + size.get(e.to)!.h;
    if (toEnd <= (right ? from.x : from.y)) back.add(e.id);
  }
  return back;
}

type Box = { x: number; y: number; w: number; h: number };
type Point = [number, number];

/**
 * The spike's two hard faults (tmp/diagram-spike/layout/metrics.mjs) on orthogonal polylines:
 * edge crossings (strict, not within 6 px of a node both edges touch) and (edge, node) pairs
 * where an edge enters a node (shrunk 2 px) that is neither of its ends.
 */
function problems(graph: SizedGraph, layout: DiagramLayout): { crossings: number; throughNode: number } {
  const box = new Map(graph.nodes.map((n): [string, Box] => [n.id, { ...layout.nodes[n.id]!, w: n.w, h: n.h }]));
  const edges = graph.edges.map((e) => ({ ...e, points: layout.edges[e.id]!.points }));
  let crossings = 0;
  let throughNode = 0;
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i]!;
    for (let j = i + 1; j < edges.length; j++) {
      const b = edges[j]!;
      const shared = [a.from, a.to].filter((id) => id === b.from || id === b.to).map((id) => box.get(id)!);
      for (let s = 1; s < a.points.length; s++) {
        for (let t = 1; t < b.points.length; t++) {
          const p = crossing(a.points[s - 1]!, a.points[s]!, b.points[t - 1]!, b.points[t]!);
          if (p && !shared.some((n) => inside(p, n, 6))) crossings++;
        }
      }
    }
    for (const [id, n] of box) {
      if (id === a.from || id === a.to) continue;
      const shrunk = { x: n.x + 2, y: n.y + 2, w: n.w - 4, h: n.h - 4 };
      if (a.points.some((p, k) => k > 0 && segmentHits(a.points[k - 1]!, p, shrunk))) throughNode++;
    }
  }
  return { crossings, throughNode };
}

function crossing(a: Point, b: Point, c: Point, d: Point): Point | null {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0]! * s[1]! - r[1]! * s[0]!;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1]! - (c[1] - a[1]) * s[0]!) / den;
  const u = ((c[0] - a[0]) * r[1]! - (c[1] - a[1]) * r[0]!) / den;
  if (t <= 1e-6 || t >= 1 - 1e-6 || u <= 1e-6 || u >= 1 - 1e-6) return null;
  return [a[0] + t * r[0]!, a[1] + t * r[1]!];
}

const inside = (p: Point, b: Box, pad = 0) => p[0] > b.x - pad && p[0] < b.x + b.w + pad && p[1] > b.y - pad && p[1] < b.y + b.h + pad;

function segmentHits(a: Point, b: Point, n: Box): boolean {
  if (inside(a, n) || inside(b, n)) return true;
  const c: Point[] = [
    [n.x, n.y],
    [n.x + n.w, n.y],
    [n.x + n.w, n.y + n.h],
    [n.x, n.y + n.h],
  ];
  return c.some((p, i) => crossing(a, b, p, c[(i + 1) % 4]!) !== null);
}

function toElk(graph: SizedGraph, reversed: Set<string>): ElkNode {
  const node = (n: SizedGraph["nodes"][number]): ElkNode => ({ id: n.id, width: n.w, height: n.h });
  const groups = new Map(
    graph.groups.map((g): [string, ElkNode] => [
      g.id,
      {
        id: g.id,
        labels: [{ text: g.id, width: g.titleW, height: g.titleH }],
        layoutOptions: {
          "elk.padding": `[top=${g.titleH + TITLE_GAP},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
          "elk.nodeLabels.placement": "[H_LEFT, V_TOP, INSIDE]",
        },
        children: [],
      },
    ]),
  );
  const children: ElkNode[] = [];
  const placed = new Set<string>();
  for (const n of graph.nodes) {
    const group = n.group === undefined ? undefined : groups.get(n.group);
    if (!group) {
      children.push(node(n));
      continue;
    }
    group.children!.push(node(n));
    if (!placed.has(group.id)) {
      placed.add(group.id);
      children.push(group);
    }
  }
  for (const group of groups.values()) if (!placed.has(group.id)) children.push(group);
  return {
    id: "root",
    layoutOptions: { ...ROOT_OPTIONS, "elk.direction": graph.direction === "right" ? "RIGHT" : "DOWN" },
    children,
    edges: graph.edges.map(
      (e): ElkExtendedEdge => ({
        id: e.id,
        sources: [reversed.has(e.id) ? e.to : e.from],
        targets: [reversed.has(e.id) ? e.from : e.to],
        labels: e.labelW && e.labelH ? [{ text: e.id, width: e.labelW, height: e.labelH }] : [],
      }),
    ),
  };
}

function fromElk(graph: SizedGraph, root: ElkNode, reversed: Set<string>): DiagramLayout {
  const layout: DiagramLayout = { width: root.width ?? 0, height: root.height ?? 0, nodes: {}, groups: {}, edges: {} };
  const groupIds = new Set(graph.groups.map((g) => g.id));
  const walk = (parent: ElkNode) => {
    for (const c of parent.children ?? []) {
      const x = c.x ?? 0;
      const y = c.y ?? 0;
      if (!groupIds.has(c.id)) {
        layout.nodes[c.id] = { x, y };
        continue;
      }
      const title = c.labels?.[0];
      layout.groups[c.id] = {
        x,
        y,
        w: c.width ?? 0,
        h: c.height ?? 0,
        titleX: title?.x ?? x + GROUP_PADDING,
        titleY: title?.y ?? y + GROUP_PADDING / 2,
      };
      walk(c);
    }
  };
  walk(root);
  const collect = (parent: ElkNode) => {
    for (const e of parent.edges ?? []) {
      const points: [number, number][] = [];
      const add = (p: { x: number; y: number }) => {
        const last = points[points.length - 1];
        if (!last || last[0] !== p.x || last[1] !== p.y) points.push([p.x, p.y]);
      };
      for (const s of orderSections(e)) {
        add(s.startPoint);
        for (const b of s.bendPoints ?? []) add(b);
        add(s.endPoint);
      }
      if (reversed.has(e.id)) points.reverse();
      straighten(points);
      const label = e.labels?.[0];
      layout.edges[e.id] = label?.x !== undefined && label.y !== undefined ? { points, labelX: label.x, labelY: label.y } : { points };
    }
    for (const c of parent.children ?? []) collect(c);
  };
  collect(root);
  return layout;
}

/**
 * Where an edge crosses a group's border ELK can leave a jog of a fraction of a pixel
 * (143 → 143.33): each point of such a segment takes its predecessor's coordinate, from the
 * source on. The next segment runs across that axis, so it keeps its direction, and the target
 * end moves under a pixel along the side of the node it ends on.
 */
function straighten(points: [number, number][]): void {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    for (const [axis, across] of [
      [0, 1],
      [1, 0],
    ] as const) {
      const d = Math.abs(a[axis] - b[axis]);
      if (d > 0 && d < 1 && Math.abs(a[across] - b[across]) >= 1) b[axis] = a[axis];
    }
  }
}

/** An edge's sections from its source to its target (ELK gives one per edge here, but a hierarchy-crossing edge may be split). */
function orderSections(e: ElkExtendedEdge): NonNullable<ElkExtendedEdge["sections"]> {
  const sections = e.sections ?? [];
  if (sections.length < 2) return sections;
  const byId = new Map(sections.map((s) => [s.id, s]));
  const ordered = [];
  let s = sections.find((s) => !s.incomingSections?.length);
  while (s && ordered.length < sections.length) {
    ordered.push(s);
    s = s.outgoingSections?.length ? byId.get(s.outgoingSections[0]!) : undefined;
  }
  return ordered.length === sections.length ? ordered : sections;
}

/** A SizedGraph from untrusted JSON, or an Error saying what is wrong with it (one line). */
export function parseSizedGraph(value: unknown): SizedGraph {
  const fail = (message: string): never => {
    throw new Error(message);
  };
  const record = (v: unknown, at: string): Record<string, unknown> =>
    v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(`${at} must be an object`);
  const list = (v: unknown, at: string): unknown[] => (Array.isArray(v) ? v : fail(`${at} must be an array`));
  const id = (v: unknown, at: string): string => (typeof v === "string" && v ? v : fail(`${at} must be a non-empty string`));
  const size = (v: unknown, at: string, positive: boolean): number =>
    typeof v === "number" && Number.isFinite(v) && (positive ? v > 0 : v >= 0) ? v : fail(`${at} must be a ${positive ? "positive" : "non-negative"} number`);

  const g = record(value, "the graph");
  const direction = g.direction === "down" || g.direction === "right" ? g.direction : fail(`direction must be "down" or "right"`);
  const ids = new Set<string>();
  const unique = (v: string, at: string) => {
    if (ids.has(v)) fail(`${at}: duplicate id ${JSON.stringify(v)}`);
    ids.add(v);
  };
  const groups = list(g.groups, "groups").map((raw, i) => {
    const at = `groups[${i}]`;
    const o = record(raw, at);
    const group = { id: id(o.id, `${at}.id`), titleW: size(o.titleW, `${at}.titleW`, false), titleH: size(o.titleH, `${at}.titleH`, false) };
    unique(group.id, at);
    return group;
  });
  const groupIds = new Set(groups.map((x) => x.id));
  const nodes = list(g.nodes, "nodes").map((raw, i) => {
    const at = `nodes[${i}]`;
    const o = record(raw, at);
    const node: SizedGraph["nodes"][number] = { id: id(o.id, `${at}.id`), w: size(o.w, `${at}.w`, true), h: size(o.h, `${at}.h`, true) };
    unique(node.id, at);
    if (o.group !== undefined) {
      const group = id(o.group, `${at}.group`);
      if (!groupIds.has(group)) fail(`${at}.group: no group ${JSON.stringify(group)}`);
      node.group = group;
    }
    return node;
  });
  const nodeIds = new Set(nodes.map((x) => x.id));
  const edgeIds = new Set<string>();
  const edges = list(g.edges, "edges").map((raw, i) => {
    const at = `edges[${i}]`;
    const o = record(raw, at);
    const edge: SizedGraph["edges"][number] = { id: id(o.id, `${at}.id`), from: id(o.from, `${at}.from`), to: id(o.to, `${at}.to`) };
    if (edgeIds.has(edge.id)) fail(`${at}: duplicate edge id ${JSON.stringify(edge.id)}`);
    edgeIds.add(edge.id);
    for (const end of ["from", "to"] as const) if (!nodeIds.has(edge[end])) fail(`${at}.${end}: no node ${JSON.stringify(edge[end])}`);
    if (o.labelW !== undefined || o.labelH !== undefined) {
      edge.labelW = size(o.labelW, `${at}.labelW`, false);
      edge.labelH = size(o.labelH, `${at}.labelH`, false);
    }
    return edge;
  });
  return { direction, nodes, groups, edges };
}
