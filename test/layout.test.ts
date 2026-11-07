// `opengpui layout <in> <out>` (docs/diagram.md, internal): what a pane gets back for a sized
// graph. The CLI runs from the build through its launcher, as the pane runs it.
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DiagramLayout, SizedGraph } from "../src/diagram/types.ts";

const CLI = join(import.meta.dir, "..", "herdr", "mods", "opengpui", "cli", "opengpui");
const dir = mkdtempSync(join(tmpdir(), "opengpui-layout-"));

function layout(name: string, input: unknown) {
  const inPath = join(dir, `${name}.in.json`);
  const outPath = join(dir, `${name}.json`);
  writeFileSync(inPath, typeof input === "string" ? input : JSON.stringify(input));
  const run = Bun.spawnSync([CLI, "layout", inPath, outPath]);
  return {
    code: run.exitCode,
    err: run.stderr.toString(),
    layout: existsSync(outPath) ? (JSON.parse(readFileSync(outPath, "utf8")) as DiagramLayout) : null,
  };
}

// A cycle (db → user) and a group: the cases where ELK reroutes.
const graph: SizedGraph = {
  direction: "down",
  nodes: [
    { id: "user", w: 120, h: 32 },
    { id: "api", w: 96, h: 32, group: "server" },
    { id: "worker", w: 110, h: 32, group: "server" },
    { id: "db", w: 140, h: 48 },
  ],
  groups: [{ id: "server", titleW: 110, titleH: 24 }],
  edges: [
    { id: "user>api", from: "user", to: "api", labelW: 80, labelH: 16 },
    { id: "api>worker", from: "api", to: "worker", labelW: 64, labelH: 16 },
    { id: "api>db", from: "api", to: "db" },
    { id: "worker>db", from: "worker", to: "db", labelW: 56, labelH: 16 },
    { id: "db>user", from: "db", to: "user", labelW: 52, labelH: 16 },
  ],
};

/** On the border of `box` (within half a pixel), not inside it. */
function onBorder([x, y]: [number, number], box: { x: number; y: number; w: number; h: number }): boolean {
  const near = (a: number, b: number) => Math.abs(a - b) <= 0.5;
  const inX = x >= box.x - 0.5 && x <= box.x + box.w + 0.5;
  const inY = y >= box.y - 0.5 && y <= box.y + box.h + 0.5;
  return (inX && (near(y, box.y) || near(y, box.y + box.h))) || (inY && (near(x, box.x) || near(x, box.x + box.w)));
}

for (const direction of ["down", "right"] as const) {
  describe(`opengpui layout, ${direction}`, () => {
    const g = { ...graph, direction };
    const r = layout(direction, g);
    const box = (id: string) => {
      const n = g.nodes.find((n) => n.id === id)!;
      return { ...r.layout!.nodes[id]!, w: n.w, h: n.h };
    };

    test("succeeds and places every node, group and edge", () => {
      expect(r.code).toBe(0);
      expect(Object.keys(r.layout!.nodes).sort()).toEqual(g.nodes.map((n) => n.id).sort());
      expect(Object.keys(r.layout!.groups)).toEqual(["server"]);
      expect(Object.keys(r.layout!.edges).sort()).toEqual(g.edges.map((e) => e.id).sort());
    });

    test("every node lies inside the drawing, and a grouped one inside its group's frame, under its title", () => {
      const l = r.layout!;
      const frame = l.groups.server!;
      for (const n of g.nodes) {
        const b = box(n.id);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(l.width);
        expect(b.y + b.h).toBeLessThanOrEqual(l.height);
        const inside = b.x >= frame.x && b.y >= frame.y && b.x + b.w <= frame.x + frame.w && b.y + b.h <= frame.y + frame.h;
        expect(inside).toBe(n.group === "server");
        if (n.group) expect(b.y).toBeGreaterThanOrEqual(frame.titleY + 24);
      }
      expect(frame.titleX).toBeGreaterThanOrEqual(frame.x);
      expect(frame.titleY).toBeGreaterThanOrEqual(frame.y);
    });

    test("each edge is an orthogonal polyline from its source's border to its target's", () => {
      for (const e of g.edges) {
        const { points } = r.layout!.edges[e.id]!;
        expect(points.length).toBeGreaterThanOrEqual(2);
        expect(onBorder(points[0]!, box(e.from))).toBe(true);
        expect(onBorder(points[points.length - 1]!, box(e.to))).toBe(true);
        for (let i = 1; i < points.length; i++) {
          const [a, b] = [points[i - 1]!, points[i]!];
          expect(Math.abs(a[0] - b[0]) < 0.01 || Math.abs(a[1] - b[1]) < 0.01).toBe(true);
        }
      }
    });

    test("a labelled edge gets its label's top-left; an unlabelled one none", () => {
      for (const e of g.edges) {
        const { labelX, labelY } = r.layout!.edges[e.id]!;
        if (e.labelW) {
          expect(typeof labelX).toBe("number");
          expect(typeof labelY).toBe("number");
        } else {
          expect(labelX).toBeUndefined();
          expect(labelY).toBeUndefined();
        }
      }
    });
  });
}

describe("opengpui layout, bad input", () => {
  test.each([
    ["not JSON", "{"],
    ["a bad direction", { ...graph, direction: "up" }],
    ["an edge to a group", { ...graph, edges: [{ id: "user>server", from: "user", to: "server" }] }],
    ["a node in a missing group", { ...graph, nodes: [{ id: "a", w: 10, h: 10, group: "nope" }], edges: [] }],
    ["a duplicate id", { ...graph, nodes: [...graph.nodes, { id: "server", w: 10, h: 10 }] }],
    ["a size that isn't positive", { ...graph, nodes: [{ id: "a", w: 0, h: 10 }], edges: [] }],
  ])("%s exits 2 with one line", (_, input) => {
    const r = layout("bad", input);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/^opengpui: [^\n]+\n$/);
  });

  test("a missing input exits 2", () => {
    const run = Bun.spawnSync([CLI, "layout", join(dir, "missing.json"), join(dir, "out.json")]);
    expect(run.exitCode).toBe(2);
  });
});
