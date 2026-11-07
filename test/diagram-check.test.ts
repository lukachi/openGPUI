// Diagrams as `opengpui check` and the pane's error list see them (docs/diagram.md,
// Validation): the validator's problems through Session, and the model a streaming file gives
// the renderer.
import { describe, expect, test } from "bun:test";
import type { ElementNode, OpenUIError } from "@openuidev/lang-core";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error built JavaScript ships no declarations; typed as src/headless.ts below
import * as built from "../dist/opengpui-headless.js";
import type * as headless from "../src/headless.ts";
import { libraries, Session } from "./lib.ts";

const { diagramModel, validateDiagram } = built as typeof headless;
const STORY = readFileSync(join(import.meta.dir, "diagram-story.oui"), "utf8");
const BROKEN = join(import.meta.dir, "diagram-broken.oui");
const CLI = join(import.meta.dir, "..", "herdr", "mods", "opengpui", "cli", "opengpui");

function session(text: string, streaming = false) {
  const s = new Session({ library: libraries.openui.library });
  s.setResponse(text, streaming);
  s.update();
  return s;
}

/** The errors of a finished file, as `code: message (hint)`. */
const problems = (text: string) => session(text).errors.map((e: OpenUIError) => `${e.code}: ${e.message}${e.hint ? ` (${e.hint})` : ""}`);

function diagrams(root: unknown): ElementNode[] {
  const found: ElementNode[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object" && "typeName" in v && "props" in v) {
      const el = v as ElementNode;
      if (el.typeName === "Diagram") found.push(el);
      else Object.values(el.props).forEach(walk);
    }
  };
  walk(root);
  return found;
}

const program = (...lines: string[]) => ["root = Stack([d])", ...lines].join("\n") + "\n";
const NODES = 'n = [Node("api", "API"), g, Node("db", "Orders DB", "store")]\ng = Group("server", "Server", [Node("worker", "Worker")])';

describe("diagram validation", () => {
  test("a valid story has no problems", () => {
    expect(problems(STORY)).toEqual([]);
  });

  test("a duplicate id, shared between nodes and groups", () => {
    const text = program("d = Diagram(n, [])", 'n = [Node("api", "API"), Node("api", "Again"), Group("worker", "W", [Node("worker", "Worker")])]');
    expect(problems(text)).toEqual([
      expect.stringMatching(/^diagram-duplicate-id: id "api" is used twice/),
      expect.stringMatching(/^diagram-duplicate-id: id "worker" is used twice/),
    ]);
  });

  test("an edge end that is no node: did you mean, or a group named", () => {
    const text = program("d = Diagram(n, e)", NODES, 'e = [Edge("api", "dbb"), Edge("api", "server")]');
    expect(problems(text)).toEqual([
      'diagram-unknown-node: edge "api>dbb": no node "dbb" (Did you mean "db"?)',
      expect.stringMatching(/^diagram-unknown-node: edge "api>server": no node "server" \("server" is a group/),
    ]);
  });

  test("a duplicate edge", () => {
    const text = program("d = Diagram(n, e)", NODES, 'e = [Edge("api", "db", "writes"), Edge("api", "db", "reads")]');
    expect(problems(text)).toEqual([expect.stringMatching(/^diagram-duplicate-edge: edge "api>db" is written twice/)]);
  });

  test("a highlight that is neither node nor edge: did you mean, reversed edge, group", () => {
    const text = program(
      "d = Diagram(n, e, s)",
      NODES,
      'e = [Edge("api", "db"), Edge("api", "worker")]',
      's = [DiagramStep("Write", "It writes.", ["api>db", "wroker", "db>api", "api>dbb", "server"])]',
    );
    expect(problems(text)).toEqual([
      'diagram-unknown-highlight: step 1 "Write": no node or edge "wroker" (Did you mean "worker"?)',
      'diagram-unknown-highlight: step 1 "Write": no node or edge "db>api" (The edge goes the other way: "api>db".)',
      'diagram-unknown-highlight: step 1 "Write": no node or edge "api>dbb" (Did you mean "api>db"?)',
      expect.stringMatching(/^diagram-unknown-highlight: step 1 "Write": no node or edge "server" \("server" is a group/),
    ]);
  });

  test("an id far from every other gets no guess", () => {
    const text = program("d = Diagram(n, e)", NODES, 'e = [Edge("api", "elasticsearch")]');
    expect(problems(text)).toEqual(['diagram-unknown-node: edge "api>elasticsearch": no node "elasticsearch"']);
  });

  test("an empty Diagram", () => {
    expect(problems(program("d = Diagram([], [])"))).toEqual([expect.stringMatching(/^diagram-empty:/)]);
  });

  test("over 30 nodes is a warning, not a failure", () => {
    const nodes = Array.from({ length: 31 }, (_, i) => `Node("n${i}", "N${i}")`).join(", ");
    const errors = session(program("d = Diagram(n, [])", `n = [${nodes}]`)).errors;
    expect(errors).toEqual([expect.objectContaining({ code: "diagram-too-big", severity: "warning", statementId: "d", component: "Diagram" })]);
  });

  test("ids are per Diagram: two Diagrams may reuse them", () => {
    const text = [
      "root = Stack([a, b])",
      'a = Diagram([Node("api", "API"), Node("db", "DB")], [Edge("api", "db")])',
      'b = Diagram([Node("api", "API"), Node("db", "DB")], [Edge("db", "api")])',
    ].join("\n");
    expect(problems(text)).toEqual([]);
  });

  test("a Diagram inside a tab is checked too, named by its statement", () => {
    const text = [
      "root = Stack([t])",
      't = Tabs([TabItem("a", "A", [d])])',
      'd = Diagram([Node("api", "API")], [Edge("api", "dbb")])',
    ].join("\n");
    expect(session(text).errors).toEqual([expect.objectContaining({ code: "diagram-unknown-node", statementId: "d" })]);
  });

  test("entities share the node ids: edges and highlights reach them, a repeated field is reported", () => {
    const text = program(
      "d = Diagram(n, e, s)",
      'n = [Node("api", "API"), g, Entity("api", "Again", [])]',
      'g = Group("db", "Database", [Entity("customer", "customer", [Field("id", "uuid", "pk"), Field("email", "text"), Field("id", "int")])])',
      'e = [Edge("api", "customer"), Edge("api", "custmer")]',
      's = [DiagramStep("Reads", "x", ["api>customer", "customer", "custmer"])]',
    );
    expect(problems(text)).toEqual([
      expect.stringMatching(/^diagram-duplicate-id: id "api" is used twice/),
      'diagram-duplicate-field: entity "customer": field "id" is listed twice (Keep one Field per name in an Entity.)',
      'diagram-unknown-node: edge "api>custmer": no node "custmer" (Did you mean "customer"?)',
      'diagram-unknown-highlight: step 1 "Reads": no node or edge "custmer" (Did you mean "customer"?)',
    ]);
  });

  test("the same field name in two entities is fine", () => {
    const text = program("d = Diagram(n, [])", 'n = [Entity("a", "A", [Field("id")]), Entity("b", "B", [Field("id")])]');
    expect(problems(text)).toEqual([]);
  });

  test("opengpui check reports a repeated field, named by its statement", () => {
    const file = join(tmpdir(), `diagram-field-${process.pid}.oui`);
    writeFileSync(file, program('d = Diagram([Entity("t", "T", [Field("id"), Field("id")])], [])'));
    const run = Bun.spawnSync([CLI, "check", file]);
    expect(run.exitCode).toBe(1);
    expect(run.stdout.toString()).toContain("diagram-duplicate-field (Diagram, statement d)");
  });

  test("opengpui check prints each problem and fails; the story passes", () => {
    const broken = Bun.spawnSync([CLI, "check", BROKEN]);
    const out = broken.stdout.toString();
    expect(broken.exitCode).toBe(1);
    for (const code of ["diagram-duplicate-id", "diagram-unknown-node", "diagram-duplicate-edge", "diagram-unknown-highlight", "diagram-empty"]) {
      expect(out).toContain(`${code} (Diagram, statement `);
    }
    const story = Bun.spawnSync([CLI, "check", join(import.meta.dir, "diagram-story.oui")]);
    expect({ code: story.exitCode, out: story.stdout.toString() }).toMatchObject({ code: 0, out: expect.stringContaining("ok:") });
  });
});

describe("a Diagram's model", () => {
  const model = (text: string) => diagramModel(diagrams(session(text).root)[0]!.props, false);

  test("an edge is solid with an arrow unless it says otherwise; its id stays from>to", () => {
    const m = model(program('d = Diagram([Node("a", "A"), Node("b", "B")], e)', 'e = [Edge("a", "b"), Edge("b", "a", null, "dashed", "triangle"), Edge("a", "a", "self", "solid", "diamond")]'));
    expect(m.edges.map((e) => [e.id, e.label, e.style, e.head])).toEqual([
      ["a>b", undefined, "solid", "arrow"],
      ["b>a", undefined, "dashed", "triangle"],
      ["a>a", "self", "solid", "diamond"],
    ]);
  });

  test("an entity is a box with fields, in its group like a node; a plain node has none", () => {
    const m = model(
      program(
        "d = Diagram(n, [])",
        'n = [Node("api", "API", "service"), Group("db", "DB", [Entity("order", "order", [Field("id", "uuid", "pk"), Field("customer_id", "uuid", "fk"), Field("save()")], "table")])]',
      ),
    );
    expect(m.nodes).toEqual([
      { id: "api", label: "API", kind: "service" },
      {
        id: "order",
        label: "order",
        kind: "process",
        sub: "table",
        group: "db",
        fields: [{ name: "id", type: "uuid", key: "pk" }, { name: "customer_id", type: "uuid", key: "fk" }, { name: "save()" }],
      },
    ]);
  });
});

describe("a streaming Diagram", () => {
  test("every cut of the story gives a model with nothing to report", () => {
    for (let cut = 1; cut < STORY.length; cut += 37) {
      const s = session(STORY.slice(0, cut), true);
      expect(s.errors).toEqual([]);
      for (const el of diagrams(s.root)) {
        const found = validateDiagram(diagramModel(el.props, true), el.statementId).filter((e) => (e.code as string) !== "diagram-empty");
        expect({ cut, found }).toEqual({ cut, found: [] });
      }
    }
  });

  const model = (text: string) => diagramModel(diagrams(session(text, true).root)[0]!.props, true);

  test("an edge waits for both its ends", () => {
    const m = model(program('d = Diagram([Node("api", "API"), Node("db", "DB")], e)', 'e = [Edge("api", "db"), Edge("api", "work'));
    expect(m.edges.map((e) => e.id)).toEqual(["api>db"]);
  });

  test("the step being written is incomplete, the ones before it complete", () => {
    const head = program('d = Diagram([Node("api", "API"), Node("db", "DB")], [Edge("api", "db")], s)');
    const inline = model(`${head}s = [DiagramStep("One", "x", ["api"]), DiagramStep("Two", "y", ["api>d`);
    expect(inline.steps.map((s) => [s.highlight, s.complete])).toEqual([
      [["api"], true],
      [["api>d"], false],
    ]);
    const statements = model(`${head}s = [s1, s2]\ns1 = DiagramStep("One", "x", ["api"])\ns2 = DiagramStep("Two", "y", ["db`);
    expect(statements.steps.map((s) => s.complete)).toEqual([true, false]);
  });
});
