// Which retained views a new evaluated tree changes (render/surface.ts). Pure: no gpui.
//
// After each session update the surface indexes the evaluated tree once by value path
// (`root`, `root/children/2`, `root/children/2/content/0`), then compares, for each view,
// the node now at the view's path with the node it last drew. Equal values draw equal
// elements, so only views whose node changed by value are redrawn (and their ancestors,
// whose nodes contain it). lang-core hands static nodes over as the same objects, so most
// compares end at an identity check.

/** An evaluated tree indexed by the value path of each element node. */
export interface TreeIndex {
  /** The element node at each path. */
  readonly byPath: Map<string, object>;
  /** The first path each element node object is found at (a statement used twice is one object). */
  readonly pathOf: Map<object, string>;
}

/** Index `root` (an evaluated element node, or null) by the value path of each element node in it. */
export function indexTree(root: unknown): TreeIndex {
  const byPath = new Map<string, object>();
  const pathOf = new Map<object, string>();
  const walk = (value: unknown, path: string, depth: number): void => {
    if (value === null || typeof value !== "object" || depth > 256) return;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) walk(value[i], `${path}/${i}`, depth + 1);
      return;
    }
    if ("type" in value && value.type === "element" && "typeName" in value) {
      byPath.set(path, value);
      if (!pathOf.has(value)) pathOf.set(value, path);
      const props = "props" in value ? value.props : undefined;
      if (props && typeof props === "object") for (const [k, v] of Object.entries(props)) walk(v, `${path}/${k}`, depth + 1);
      return;
    }
    for (const [k, v] of Object.entries(value)) walk(v, `${path}/${k}`, depth + 1);
  };
  walk(root, "root", 0);
  return { byPath, pathOf };
}

/** Results of compares already made in one pass, by pair: nested views compare the same subtrees. */
export type CompareMemo = Map<object, Map<object, boolean>>;

/**
 * Deep equality of evaluated values, as a render sees them: primitives by `Object.is`,
 * functions by identity, arrays and plain objects by their entries, and element nodes by
 * their type and props only (the parser's bookkeeping on them, such as `partial`, flips
 * on every node of a streamed response at some chunks and draws nothing). `memo` keeps
 * object pairs already compared.
 */
export function sameValue(a: unknown, b: unknown, memo: CompareMemo = new Map()): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  let known = memo.get(a);
  const hit = known?.get(b);
  if (hit !== undefined) return hit;
  const result = compareObjects(a, b, memo);
  if (!known) memo.set(a, (known = new Map()));
  known.set(b, result);
  return result;
}

function compareObjects(a: object, b: object, memo: CompareMemo): boolean {
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!sameValue(a[i], b[i], memo)) return false;
    return true;
  }
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (isElementNode(a) && isElementNode(b)) return a.typeName === b.typeName && sameValue(a.props, b.props, memo);
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!sameValue(Reflect.get(a, k), Reflect.get(b, k), memo)) return false;
  }
  return true;
}

function isElementNode(v: object): v is { type: "element"; typeName: unknown; props: unknown } {
  return "type" in v && v.type === "element" && "typeName" in v;
}
