// The shapes a Diagram passes between its parts (docs/diagram.md):
//
//   Diagram props → DiagramModel (model.ts) → validated (validate.ts, via Session)
//   DiagramModel + measured text → SizedGraph (the renderer) → ctx.layout(graph)
//   → the host's DiagramLayouter (Herdr: `opengpui layout` through exec; harness: its host)
//   → DiagramLayout (elk.ts) → drawn (components/diagram.ts)

export const NODE_KINDS = ["actor", "process", "module", "file", "store", "external", "decision", "start", "end", "event", "task", "service", "queue", "ui"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_STYLES = ["solid", "dashed"] as const;
export type EdgeStyle = (typeof EDGE_STYLES)[number];
export const EDGE_HEADS = ["arrow", "none", "triangle", "diamond"] as const;
export type EdgeHead = (typeof EDGE_HEADS)[number];
export const FIELD_KEYS = ["pk", "fk"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

/** One row of an Entity card: a column, an attribute, a method. */
export interface DiagramField {
  name: string;
  type?: string;
  key?: FieldKey;
}

export type Direction = "down" | "right";

export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
  sub?: string;
  /** The id of the Group it sits in. */
  group?: string;
  /** The Node's own action (replaces the default question), as lang-core evaluated it. */
  action?: unknown;
  /** Set when the box is an Entity (a card of fields); its kind is then unused. */
  fields?: DiagramField[];
}

export interface DiagramGroup {
  id: string;
  label: string;
}

export interface DiagramEdge {
  /** `from>to`. */
  id: string;
  from: string;
  to: string;
  label?: string;
  style: EdgeStyle;
  head: EdgeHead;
}

export interface DiagramStepModel {
  title: string;
  /** Markdown. */
  details: string;
  /** Node ids and edge ids (`from>to`). */
  highlight: string[];
  action?: unknown;
  /** False while the step's statement is still streaming: its highlight may hold a cut-off id. */
  complete: boolean;
}

/** One Diagram as the renderer and the validator see it. */
export interface DiagramModel {
  nodes: DiagramNode[];
  groups: DiagramGroup[];
  edges: DiagramEdge[];
  steps: DiagramStepModel[];
  direction: Direction;
}

/** What the layout engine gets: boxes with sizes, nothing about how they look. */
export interface SizedGraph {
  direction: Direction;
  nodes: { id: string; w: number; h: number; group?: string }[];
  groups: { id: string; titleW: number; titleH: number }[];
  edges: { id: string; from: string; to: string; labelW?: number; labelH?: number }[];
}

/** Where the layout engine put everything, in px at scale 1, origin at the top left. */
export interface DiagramLayout {
  width: number;
  height: number;
  /** Top-left corner of each node (its size is the SizedGraph's). */
  nodes: Record<string, { x: number; y: number }>;
  groups: Record<string, { x: number; y: number; w: number; h: number; titleX: number; titleY: number }>;
  /** Each edge as an orthogonal polyline from its source to its target; the label's top-left when it has one. */
  edges: Record<string, { points: [number, number][]; labelX?: number; labelY?: number }>;
}

/** The host's side: lay a graph out (Herdr: `opengpui layout` through exec). */
export type DiagramLayouter = (graph: SizedGraph) => Promise<DiagramLayout>;

export type LayoutState = { status: "loading" } | { status: "ready"; layout: DiagramLayout } | { status: "failed"; error: string };
