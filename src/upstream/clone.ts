// structuredClone for gpui-shell, which has none. mdast-util-to-hast clones
// node properties and `data.hProperties` with it; those are plain data (objects,
// arrays, strings, numbers, booleans, null), which is all this copies.
export function ogpuiStructuredClone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(ogpuiStructuredClone) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = ogpuiStructuredClone(v);
    return out as T;
  }
  return value;
}
