// A Diagram's evaluated props → its DiagramModel (types.ts), for the renderer and the
// validator. Pure: lang-core's ElementNodes in, plain data out.
//
// Streaming: lang-core marks no single statement as the one being written. While the last,
// still-written statement needs closing brackets, every element of the tree is `partial`;
// otherwise none is. The text is only ever cut at its end, so within a partial tree the step
// that may hold a cut-off highlight id is the last one written: the last inline DiagramStep of
// the list, or the last DiagramStep written as a statement of its own (statements arrive in
// order, and one not yet started is unresolved and absent). Those are `complete: false`;
// after the last step, until the stream ends, that may hold back a finished step for a while,
// never light a wrong id.
import { isElementNode, type ElementNode } from "@openuidev/lang-core";
import {
  EDGE_HEADS,
  EDGE_STYLES,
  FIELD_KEYS,
  NODE_KINDS,
  type DiagramEdge,
  type DiagramField,
  type DiagramGroup,
  type DiagramModel,
  type DiagramNode,
  type DiagramStepModel,
  type FieldKey,
} from "./types.ts";

const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const elements = (v: unknown, typeName: string): ElementNode[] =>
  Array.isArray(v) ? v.filter((x): x is ElementNode => isElementNode(x) && x.typeName === typeName) : [];
const oneOf = <T extends string>(values: readonly T[], v: unknown, fallback: T): T => ((values as readonly unknown[]).includes(v) ? (v as T) : fallback);
const isBox = (v: unknown): v is ElementNode => isElementNode(v) && (v.typeName === "Node" || v.typeName === "Entity");

function fields(v: unknown): DiagramField[] {
  return elements(v, "Field").flatMap((el) => {
    const name = text(el.props.name);
    if (name === undefined) return [];
    const type = text(el.props.type);
    const key = (FIELD_KEYS as readonly unknown[]).includes(el.props.key) ? (el.props.key as FieldKey) : undefined;
    return [{ name, ...(type ? { type } : {}), ...(key ? { key } : {}) }];
  });
}

/** The model of a Diagram whose evaluated props are `props`; `streaming` while the file is still being written. */
export function diagramModel(props: Record<string, unknown>, streaming: boolean): DiagramModel {
  const nodes: DiagramNode[] = [];
  const groups: DiagramGroup[] = [];
  const addNode = (el: ElementNode, group?: string) => {
    const id = text(el.props.id);
    if (!id) return;
    const sub = text(el.props.sub);
    const action = el.props.action;
    nodes.push({
      id,
      label: text(el.props.label) ?? "",
      kind: oneOf(NODE_KINDS, el.props.kind, "process"),
      ...(sub ? { sub } : {}),
      ...(group !== undefined ? { group } : {}),
      ...(action != null ? { action } : {}),
      ...(el.typeName === "Entity" ? { fields: fields(el.props.fields) } : {}),
    });
  };
  for (const item of Array.isArray(props.nodes) ? props.nodes.filter(isElementNode) : []) {
    if (item.typeName === "Node" || item.typeName === "Entity") addNode(item);
    else if (item.typeName === "Group") {
      const id = text(item.props.id);
      if (!id) continue;
      groups.push({ id, label: text(item.props.label) ?? "" });
      for (const node of Array.isArray(item.props.nodes) ? item.props.nodes.filter(isBox) : []) addNode(node, id);
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: DiagramEdge[] = [];
  for (const el of elements(props.edges, "Edge")) {
    const from = text(el.props.from);
    const to = text(el.props.to);
    if (from === undefined || to === undefined) continue;
    // An end that hasn't arrived yet (or is still being typed) draws nothing until it has.
    if (streaming && !(nodeIds.has(from) && nodeIds.has(to))) continue;
    const label = text(el.props.label);
    const style = oneOf(EDGE_STYLES, el.props.style, "solid");
    const head = oneOf(EDGE_HEADS, el.props.head, "arrow");
    edges.push({ id: `${from}>${to}`, from, to, ...(label ? { label } : {}), style, head });
  }

  return { nodes, groups, edges, steps: diagramSteps(props.steps, streaming), direction: props.direction === "right" ? "right" : "down" };
}

/** The DiagramSteps in a `steps` prop (any diagram type's), the one being written `complete: false`. */
export function diagramSteps(value: unknown, streaming: boolean): DiagramStepModel[] {
  const stepEls = elements(value, "DiagramStep");
  const cut = new Set<ElementNode>();
  if (streaming) {
    const lastInline = stepEls.findLast((s) => s.partial && !s.statementId);
    const lastStatement = stepEls.findLast((s) => s.partial && !!s.statementId);
    if (lastInline) cut.add(lastInline);
    if (lastStatement) cut.add(lastStatement);
  }
  return stepEls.map((el) => {
    const action = el.props.action;
    return {
      title: text(el.props.title) ?? "",
      details: text(el.props.details) ?? "",
      highlight: Array.isArray(el.props.highlight) ? el.props.highlight.filter((h): h is string => typeof h === "string") : [],
      ...(action != null ? { action } : {}),
      complete: !cut.has(el),
    };
  });
}
