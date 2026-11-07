// The Diagrams group as `opengpui prompt` teaches it, and how a component subset keeps or drops it.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const CLI = join(import.meta.dir, "..", "herdr", "mods", "opengpui", "cli", "opengpui");
const prompt = (...flags: string[]) => {
  const run = Bun.spawnSync([CLI, "prompt", ...flags]);
  return { code: run.exitCode, out: run.stdout.toString(), err: run.stderr.toString() };
};

const SIGNATURES = [
  /^Diagram\(nodes: \(Node \| Entity \| Group\)\[\], edges: Edge\[\], steps\?: DiagramStep\[\], direction\?: "down" \| "right"\)/m,
  /^Node\(id: string, label: string, kind\?: "actor" \| "process" \| "module" \| "file" \| "store" \| "external" \| "decision" \| "start" \| "end" \| "event" \| "task" \| "service" \| "queue" \| "ui", /m,
  /^Entity\(id: string, label: string, fields: Field\[\], sub\?: string, action\?: /m,
  /^Field\(name: string, type\?: string, key\?: "pk" \| "fk"\)/m,
  /^Group\(id: string, label: string, nodes: \(Node \| Entity\)\[\]\)/m,
  /^Edge\(from: string, to: string, label\?: string, style\?: "solid" \| "dashed", head\?: "arrow" \| "none" \| "triangle" \| "diamond"\)/m,
  /^DiagramStep\(title: string, details: string, highlight: string\[\], action\?: /m,
];

describe("opengpui prompt", () => {
  test.each(["openui", "chat"])("the %s library teaches the Diagram signatures and what a click sends", (library) => {
    const { code, out } = prompt("--library", library);
    expect(code).toBe(0);
    expect(out).toContain("### Diagrams");
    for (const signature of SIGNATURES) expect(out).toMatch(signature);
    expect(out).toContain("Tell me more about <label>");
  });

  test("a subset with a Diagram keeps the group and its notes", () => {
    const { code, out } = prompt("--components", "Diagram,Node,TextContent");
    expect(code).toBe(0);
    expect(out).toContain("### Diagrams");
    expect(out).toContain("Tell me more about <label>");
  });

  test("a subset without a Diagram has no Diagrams group", () => {
    const { code, out } = prompt("--components", "Table,TextContent");
    expect(code).toBe(0);
    expect(out).not.toContain("### Diagrams");
    expect(out).not.toMatch(/^Diagram\(/m);
    expect(out).not.toContain("Tell me more about <label>");
  });
});
