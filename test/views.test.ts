import { describe, expect, test } from "bun:test";
import { indexTree, libraries, sameValue, Session } from "./lib.ts";

/** Element paths of `after` whose node differs by value from the one at the same path of `before`. */
function changed(before: unknown, after: unknown): string[] {
  const old = indexTree(before);
  const memo = new Map();
  return [...indexTree(after).byPath].filter(([path, node]) => !sameValue(old.byPath.get(path), node, memo)).map(([path]) => path);
}

function session(text: string, streaming = false): Session {
  const s = new Session({ library: libraries.openui.library });
  s.setResponse(text, streaming);
  s.update();
  return s;
}

describe("retained views: which nodes a new tree changes", () => {
  test("a stream chunk that grows one text changes that node and its ancestors, not its siblings", () => {
    const head = 'root = Stack([intro, body, outro])\nintro = TextContent("Intro")\noutro = TextContent("Outro")\nbody = TextContent("The body grows';
    const s = session(head, true);
    const before = s.root;
    s.setResponse(`${head} by a chunk`, true);
    s.update();
    expect(changed(before, s.root)).toEqual(["root", "root/children/1"]);
  });

  test("an update that changes nothing changes no node", () => {
    const text = '$name = "A"\nroot = Stack([TextContent($name), Card([b])])\nb = TextContent("B")';
    const s = session(text);
    const before = s.root;
    s.store.set("$unrelated", 1);
    s.update();
    expect(changed(before, s.root)).toEqual([]);
  });

  test("a $variable change changes only the nodes that read it, and their ancestors", () => {
    const s = session('$name = "Ada"\nroot = Stack([Card([TextContent($name)]), Card([TextContent("fixed")])])');
    const before = s.root;
    s.store.set("$name", "Grace");
    s.update();
    expect(changed(before, s.root)).toEqual(["root", "root/children/0", "root/children/0/children/0"]);
  });

  test("a statement used twice is found at both places", () => {
    const s = session('root = Stack([shared, Card([shared])])\nshared = TextContent("twice")');
    const { byPath } = indexTree(s.root);
    const first = byPath.get("root/children/0");
    const second = byPath.get("root/children/1/children/0");
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(sameValue(first, second)).toBe(true);
  });

  test("a node whose streaming bookkeeping alone flips is not a change; a new type or prop is", () => {
    const s = session('root = Stack([Card([TextContent("A")])])');
    const node = s.root!;
    // Every element node, nested ones too, with the parser's bookkeeping changed.
    const relabel = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(relabel);
      if (!v || typeof v !== "object") return v;
      const out = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, relabel(x)]));
      return "typeName" in v ? { ...out, partial: true, statementId: "other" } : out;
    };
    expect(sameValue(node, relabel(node))).toBe(true);
    expect(sameValue(node, { ...node, typeName: "Card" })).toBe(false);
    expect(sameValue(node, { ...node, props: { ...node.props, gap: "l" } })).toBe(false);
  });
});
