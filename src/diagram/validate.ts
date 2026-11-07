// What lang-core can't see in a Diagram: ids that don't match up (docs/diagram.md,
// Validation). Reported as lang-core reports its own problems, so `opengpui check`, the pane's
// error list and the `errors` event carry them unchanged (through Session).
import type { OpenUIError, OpenUIErrorCode } from "@openuidev/lang-core";
import type { DiagramModel } from "./types.ts";

/** Over this many nodes a Diagram gets a warning: split it. */
const MAX_NODES = 30;

export type DiagramErrorCode =
  | "diagram-empty"
  | "diagram-duplicate-id"
  | "diagram-duplicate-field"
  | "diagram-unknown-node"
  | "diagram-duplicate-edge"
  | "diagram-unknown-highlight"
  | "diagram-too-big";

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]!;
      row[j] = Math.min(above + 1, row[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length]!;
}

/** The closest of `ids` to `id`, when it is close enough to be a typo (every diagram type's did-you-mean). */
export function closest(id: string, ids: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of ids) {
    const d = levenshtein(id, candidate);
    if (d < bestDistance) [best, bestDistance] = [candidate, d];
  }
  return bestDistance <= Math.max(2, id.length / 3) ? best : undefined;
}

/** The problems of the Diagram `model` written in statement `statementId`. */
export function validateDiagram(model: DiagramModel, statementId?: string): OpenUIError[] {
  const errors: OpenUIError[] = [];
  const report = (code: DiagramErrorCode, message: string, hint?: string, warning = false) =>
    errors.push({
      source: "parser",
      // lang-core's codes are a closed union; the pipeline carries any string through.
      code: code as unknown as OpenUIErrorCode,
      message,
      component: "Diagram",
      ...(statementId ? { statementId } : {}),
      ...(hint ? { hint } : {}),
      ...(warning ? { severity: "warning" as const } : {}),
    });
  const didYouMean = (id: string, ids: Iterable<string>) => {
    const match = closest(id, ids);
    return match ? `Did you mean "${match}"?` : undefined;
  };

  if (!model.nodes.length) {
    report("diagram-empty", "the Diagram has no nodes", "Give it Nodes or Entities (directly or in Groups), or remove it.");
    return errors;
  }

  const nodeIds = new Set(model.nodes.map((n) => n.id));
  const groupIds = new Set(model.groups.map((g) => g.id));
  const seen = new Set<string>();
  for (const id of [...model.groups.map((g) => g.id), ...model.nodes.map((n) => n.id)]) {
    if (seen.has(id)) report("diagram-duplicate-id", `id "${id}" is used twice`, "Nodes and groups share one id space per Diagram: rename one.");
    seen.add(id);
  }
  for (const n of model.nodes) {
    const names = new Set<string>();
    for (const f of n.fields ?? []) {
      if (names.has(f.name)) report("diagram-duplicate-field", `entity "${n.id}": field "${f.name}" is listed twice`, "Keep one Field per name in an Entity.");
      names.add(f.name);
    }
  }
  if (model.nodes.length > MAX_NODES) {
    report("diagram-too-big", `the Diagram has ${model.nodes.length} nodes`, `More than ${MAX_NODES} is hard to read: split it into several Diagrams.`, true);
  }

  const edgeIds = new Set<string>();
  for (const e of model.edges) {
    for (const end of [e.from, e.to]) {
      if (nodeIds.has(end)) continue;
      const hint = groupIds.has(end) ? `"${end}" is a group; edges connect nodes, so point it at one of the group's nodes.` : didYouMean(end, nodeIds);
      report("diagram-unknown-node", `edge "${e.id}": no node "${end}"`, hint);
    }
    if (edgeIds.has(e.id)) report("diagram-duplicate-edge", `edge "${e.id}" is written twice`, "Keep one Edge per pair and merge the labels.");
    edgeIds.add(e.id);
  }

  model.steps.forEach((step, i) => {
    if (!step.complete) return;
    for (const id of step.highlight) {
      if (nodeIds.has(id) || edgeIds.has(id)) continue;
      const [from, to, ...rest] = id.split(">");
      let hint: string | undefined;
      if (groupIds.has(id)) hint = `"${id}" is a group; highlight its nodes.`;
      else if (to !== undefined && !rest.length && edgeIds.has(`${to}>${from}`)) hint = `The edge goes the other way: "${to}>${from}".`;
      else hint = didYouMean(id, to === undefined ? nodeIds : edgeIds);
      report("diagram-unknown-highlight", `step ${i + 1} "${step.title}": no node or edge "${id}"`, hint);
    }
  });
  return errors;
}
