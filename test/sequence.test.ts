// Sequence diagrams (docs/diagram.md): the validator's problems as `opengpui check` and the pane
// report them, the model a streaming file gives the renderer, and the in-pane layout's promises
// (labels fit between their columns, rows in order, blocks around their messages).
import { describe, expect, test } from "bun:test";
import type { ElementNode, OpenUIError } from "@openuidev/lang-core";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error built JavaScript ships no declarations; typed as src/headless.ts below
import * as built from "../dist/opengpui-headless.js";
import type * as headless from "../src/headless.ts";
import type { SequenceMetrics, SequenceModel } from "../src/headless.ts";
import { libraries, Session } from "./lib.ts";

const { sequenceModel, validateSequence, sequenceLayout } = built as typeof headless;
const EXAMPLE = readFileSync(join(import.meta.dir, "..", "skills", "opengpui", "examples", "sequence.oui"), "utf8");
const CLI = join(import.meta.dir, "..", "herdr", "mods", "opengpui", "cli", "opengpui");

function session(text: string, streaming = false) {
  const s = new Session({ library: libraries.openui.library });
  s.setResponse(text, streaming);
  s.update();
  return s;
}

const problems = (text: string) => session(text).errors.map((e: OpenUIError) => `${e.code}: ${e.message}${e.hint ? ` (${e.hint})` : ""}`);

function sequences(root: unknown): ElementNode[] {
  const found: ElementNode[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object" && "typeName" in v && "props" in v) {
      const el = v as ElementNode;
      if (el.typeName === "Sequence") found.push(el);
      else Object.values(el.props).forEach(walk);
    }
  };
  walk(root);
  return found;
}

const program = (...lines: string[]) => ["root = Stack([s])", ...lines].join("\n") + "\n";
const PEOPLE = 'p = [Participant("user", "User", "actor"), Participant("api", "API", "service"), Participant("db", "DB", "store")]';
const MESSAGES = 'm = [Message("user", "api", "login"), Message("api", "db", "find"), Message("db", "api", "row", "reply"), Message("api", "user", "token", "reply")]';

describe("sequence validation", () => {
  test("a valid Sequence with steps and blocks has no problems; a participant id may be a number", () => {
    const text = program(
      "s = Sequence(p, m, st, b)",
      'p = [Participant("user", "User"), Participant("7", "Seven")]',
      'm = [Message("user", "7", "hi"), Message("7", "7", "think"), Message("7", "user", "bye", "async")]',
      'st = [DiagramStep("All", "x", ["user", "7", "1", "3"])]',
      'b = [Block("loop", 1, 3), Block("inner", 2, 2)]',
    );
    expect(problems(text)).toEqual([]);
  });

  test("a duplicate participant id", () => {
    const text = program("s = Sequence(p, [])", 'p = [Participant("api", "API"), Participant("api", "Again")]');
    expect(problems(text)).toContainEqual(expect.stringMatching(/^sequence-duplicate-id: participant id "api" is used twice/));
  });

  test("a message end that is no participant: did you mean, a self message reported once, no guess when far", () => {
    const text = program("s = Sequence(p, m)", PEOPLE, 'm = [Message("user", "apii", "login"), Message("dbb", "dbb", "loop"), Message("api", "elasticsearch", "index")]');
    expect(problems(text)).toEqual([
      'sequence-unknown-participant: message 1 "login": no participant "apii" (Did you mean "api"?)',
      'sequence-unknown-participant: message 2 "loop": no participant "dbb" (Did you mean "db"?)',
      'sequence-unknown-participant: message 3 "index": no participant "elasticsearch"',
    ]);
  });

  test("a block whose range is backwards, out of 1..N or not whole", () => {
    const text = program("s = Sequence(p, m, [], b)", PEOPLE, MESSAGES, 'b = [Block("back", 3, 2), Block("past", 2, 5), Block("zero", 0, 1), Block("half", 1.5, 2), Block("fine", 1, 4)]');
    expect(problems(text)).toEqual([
      'sequence-bad-block: block "back" (3..2): first is after last (first and last are message numbers in 1..4, first ≤ last.)',
      'sequence-bad-block: block "past" (2..5): messages run 1..4 (first and last are message numbers in 1..4, first ≤ last.)',
      'sequence-bad-block: block "zero" (0..1): messages run 1..4 (first and last are message numbers in 1..4, first ≤ last.)',
      'sequence-bad-block: block "half" (1.5..2): message numbers are whole (first and last are message numbers in 1..4, first ≤ last.)',
    ]);
  });

  test("a highlight that is neither participant nor message: did you mean, out of range, an edge-style id", () => {
    const text = program("s = Sequence(p, m, st)", PEOPLE, MESSAGES, 'st = [DiagramStep("Find", "x", ["apy", "5", "0", "03", "api>db", "db>user", "4"])]');
    expect(problems(text)).toEqual([
      'sequence-unknown-highlight: step 1 "Find": no participant or message "apy" (Did you mean "api"?)',
      'sequence-unknown-highlight: step 1 "Find": no participant or message "5" (Messages are numbered 1..4.)',
      'sequence-unknown-highlight: step 1 "Find": no participant or message "0" (Messages are numbered 1..4.)',
      'sequence-unknown-highlight: step 1 "Find": no participant or message "03" (Messages are numbered 1..4.)',
      'sequence-unknown-highlight: step 1 "Find": no participant or message "api>db" (Highlight messages by number: "2".)',
      'sequence-unknown-highlight: step 1 "Find": no participant or message "db>user" (Highlight messages by their number ("3"), not from>to.)',
    ]);
  });

  test("an empty Sequence, and one with participants but no messages", () => {
    expect(problems(program("s = Sequence([], [])"))).toEqual([expect.stringMatching(/^sequence-empty: the Sequence has no participants/)]);
    expect(problems(program("s = Sequence(p, [])", PEOPLE))).toEqual([expect.stringMatching(/^sequence-empty: the Sequence has no messages/)]);
  });

  test("over 12 participants or 40 messages is a warning, not a failure", () => {
    const people = Array.from({ length: 13 }, (_, i) => `Participant("p${i}", "P${i}")`).join(", ");
    const many = session(program("s = Sequence(p, m)", `p = [${people}]`, 'm = [Message("p0", "p1", "x")]')).errors;
    expect(many).toEqual([expect.objectContaining({ code: "sequence-too-big", severity: "warning", statementId: "s", component: "Sequence" })]);
    const messages = Array.from({ length: 41 }, (_, i) => `Message("user", "api", "m${i}")`).join(", ");
    expect(session(program("s = Sequence(p, m)", PEOPLE, `m = [${messages}]`)).errors).toEqual([expect.objectContaining({ code: "sequence-too-big", severity: "warning" })]);
    const forty = Array.from({ length: 40 }, (_, i) => `Message("user", "api", "m${i}")`).join(", ");
    expect(session(program("s = Sequence(p, m)", PEOPLE, `m = [${forty}]`)).errors).toEqual([]);
  });

  test("a Sequence inside a tab is checked too, named by its statement", () => {
    const text = ["root = Stack([t])", 't = Tabs([TabItem("a", "A", [s])])', 's = Sequence([Participant("api", "API")], [Message("api", "dbb", "x")])'].join("\n");
    expect(session(text).errors).toEqual([expect.objectContaining({ code: "sequence-unknown-participant", statementId: "s", component: "Sequence" })]);
  });

  test("opengpui check prints each problem and fails", () => {
    const file = join(mkdtempSync(join(tmpdir(), "oui-sequence-")), "broken.oui");
    writeFileSync(file, program("s = Sequence(p, m, st, b)", 'p = [Participant("a", "A"), Participant("a", "B")]', 'm = [Message("a", "bb", "x")]', 'st = [DiagramStep("S", "x", ["9"])]', 'b = [Block("B", 2, 1)]'));
    const run = Bun.spawnSync([CLI, "check", file]);
    const out = run.stdout.toString();
    expect(run.exitCode).toBe(1);
    for (const code of ["sequence-duplicate-id", "sequence-unknown-participant", "sequence-unknown-highlight", "sequence-bad-block"]) {
      expect(out).toContain(`${code} (Sequence, statement `);
    }
  });
});

describe("opengpui prompt", () => {
  test.each(["openui", "chat"])("the %s library teaches the Sequence signatures in contract order, and what a message click sends", (library) => {
    const run = Bun.spawnSync([CLI, "prompt", "--library", library]);
    const out = run.stdout.toString();
    expect(run.exitCode).toBe(0);
    expect(out).toMatch(/^Sequence\(participants: Participant\[\], messages: Message\[\], steps\?: DiagramStep\[\], blocks\?: Block\[\]\)/m);
    expect(out).toMatch(/^Participant\(id: string, label: string, kind\?: "actor" \| [^)]*"ui", sub\?: string, action\?: /m);
    expect(out).toMatch(/^Message\(from: string, to: string, label: string, style\?: "call" \| "reply" \| "async"\)/m);
    expect(out).toMatch(/^Block\(label: string, first: number, last: number\)/m);
    expect(out).toContain("Tell me more about message <n>: <label>");
  });

  test("a Sequence is admitted inside a Card", () => {
    const text = ["root = Stack([c])", "c = Card([s])", 's = Sequence([Participant("a", "A")], [Message("a", "a", "x")])'].join("\n");
    expect(problems(text)).toEqual([]);
  });
});

describe("a streaming Sequence", () => {
  const model = (text: string) => sequenceModel(sequences(session(text, true).root)[0]!.props, true);

  test("every cut of the example gives a model with nothing to report", () => {
    for (let cut = 1; cut < EXAMPLE.length; cut += 11) {
      const s = session(EXAMPLE.slice(0, cut), true);
      expect(s.errors).toEqual([]);
      for (const el of sequences(s.root)) {
        const found = validateSequence(sequenceModel(el.props, true), el.statementId).filter((e) => (e.code as string) !== "sequence-empty");
        expect({ cut, found }).toEqual({ cut, found: [] });
      }
    }
  });

  test("a message waits for both its participants; later messages keep their numbers", () => {
    const m = model(program("s = Sequence(p, m)", 'p = [Participant("api", "API"), Participant("db", "DB")]', 'm = [Message("api", "db", "a"), Message("api", "work", "b"), Message("db", "api", "c"), Message("api", "db", "d'));
    expect(m.messages.map((x) => [x.n, x.label])).toEqual([
      [1, "a"],
      [3, "c"],
      [4, "d"],
    ]);
  });

  test("a block waits until the messages it frames are written", () => {
    const head = program("s = Sequence(p, m, [], b)", 'p = [Participant("api", "API"), Participant("db", "DB")]', 'b = [Block("loop", 2, 3)]');
    expect(model(`${head}m = [Message("api", "db", "a"), Message("db", "api", "b"`).blocks).toEqual([]);
    expect(model(`${head}m = [Message("api", "db", "a"), Message("db", "api", "b"), Message("api", "db", "c"`).blocks).toEqual([{ label: "loop", first: 2, last: 3 }]);
  });

  test("the step being written is incomplete", () => {
    const m = model(program("s = Sequence(p, m, st)", PEOPLE, MESSAGES, 'st = [DiagramStep("One", "x", ["1"]), DiagramStep("Two", "y", ["2", "us'));
    expect(m.steps.map((s) => [s.highlight, s.complete])).toEqual([
      [["1"], true],
      [["2", "us"], false],
    ]);
  });
});

// ── Layout ──

/** Text 7px per character, lines 16px: enough to check what fits where. */
const metric = { width: (text: string) => text.length * 7, lineHeight: 16 };
const METRICS: SequenceMetrics = { label: metric, sub: metric, message: metric, block: metric, badge: metric };

function seq(participants: string[], messages: [string, string, string][], blocks: [string, number, number][] = []): SequenceModel {
  return {
    participants: participants.map((id) => ({ id, label: id.toUpperCase(), kind: "process" })),
    messages: messages.map(([from, to, label], i) => ({ n: i + 1, from, to, label, style: "call" })),
    count: messages.length,
    blocks: blocks.map(([label, first, last]) => ({ label, first, last })),
    steps: [],
  };
}

type Rect = { x: number; y: number; w: number; h: number };
const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

describe("sequence layout", () => {
  test("each label fits between its columns, past the sender's badge, over a span of one or several columns", () => {
    const layout = sequenceLayout(
      seq(["a", "b", "c", "d"], [["a", "b", "a fairly long label between neighbours"], ["c", "a", "an even longer label that spans two whole gaps"], ["b", "d", "x"]]),
      METRICS,
    );
    for (const row of layout.messages) {
      const lo = Math.min(row.x0, row.x1);
      const hi = Math.max(row.x0, row.x1);
      expect({ n: row.n, fits: row.label.x >= lo && row.label.x + row.label.w <= hi }).toEqual({ n: row.n, fits: true });
      const badgeEnd = row.x1 > row.x0 ? row.badge.x + row.badge.w : row.badge.x;
      expect(row.x1 > row.x0 ? row.label.x >= badgeEnd : row.label.x + row.label.w <= badgeEnd).toBe(true);
    }
    // Headers never overlap.
    for (let i = 1; i < layout.participants.length; i++) {
      const [prev, next] = [layout.participants[i - 1]!, layout.participants[i]!];
      expect(next.x).toBeGreaterThan(prev.x + prev.w);
    }
  });

  test("a short label leaves the columns at what their headers need", () => {
    const narrow = sequenceLayout(seq(["a", "b"], [["a", "b", "x"]]), METRICS);
    const wide = sequenceLayout(seq(["a", "b"], [["a", "b", "x".repeat(60)]]), METRICS);
    const gap = (l: typeof narrow) => l.participants[1]!.cx - l.participants[0]!.cx;
    expect(gap(narrow)).toBeLessThan(gap(wide));
    expect(gap(narrow)).toBe(narrow.participants[0]!.w / 2 + narrow.participants[1]!.w / 2 + 32);
  });

  test("a self message loops right of its lifeline; on the last column the drawing widens for its label", () => {
    const layout = sequenceLayout(seq(["a", "b"], [["a", "b", "go"], ["b", "b", "a long thought about it all"]]), METRICS);
    const self = layout.messages[1]!;
    const b = layout.participants[1]!;
    expect(self.self).toBeDefined();
    expect(self.x1).toBe(b.cx);
    expect(self.self!.right).toBeGreaterThan(b.cx);
    expect(self.self!.bottom).toBeGreaterThan(self.y);
    expect(self.label.x).toBeGreaterThan(b.cx);
    expect(self.label.x + self.label.w).toBeLessThanOrEqual(layout.width);
  });

  test("rows go down in message order, a self message taking more room, all above the lifelines' end", () => {
    const layout = sequenceLayout(seq(["a", "b"], [["a", "b", "1"], ["b", "b", "2"], ["b", "a", "3"], ["a", "b", "4"]]), METRICS);
    const ys = layout.messages.map((r) => r.y);
    expect(ys).toEqual([...ys].sort((p, q) => p - q));
    const steps = ys.slice(1).map((y, i) => y - ys[i]!);
    expect(steps[1]).toBeGreaterThan(steps[0]!);
    expect(steps[2]).toBe(steps[0]);
    expect(layout.lifeline.y1).toBeGreaterThan(Math.max(...layout.messages.map((r) => r.hit.y + r.hit.h)));
    expect(layout.lifeline.y1).toBeLessThanOrEqual(layout.height);
  });

  test("a block frames its messages and the columns they touch, its title above the first", () => {
    const layout = sequenceLayout(seq(["a", "b", "c", "d"], [["a", "b", "1"], ["b", "c", "2"], ["c", "b", "3"], ["c", "d", "4"]], [["alt: miss", 2, 3]]), METRICS);
    const [frame] = layout.blocks;
    const [, b, c, d] = layout.participants;
    expect(frame).toMatchObject({ label: "alt: miss", first: 2, last: 3 });
    for (const row of layout.messages.slice(1, 3)) expect(inside(row.hit, frame!)).toBe(true);
    expect(frame!.x).toBeLessThan(b!.cx);
    expect(frame!.x + frame!.w).toBeGreaterThan(c!.cx);
    expect(frame!.x + frame!.w).toBeLessThan(d!.cx);
    expect(frame!.y + frame!.titleH).toBeLessThanOrEqual(layout.messages[1]!.label.y);
    expect(inside(layout.messages[0]!.hit, frame!)).toBe(false);
    expect(layout.messages[1]!.depth).toBe(1);
    expect(layout.messages[0]!.depth).toBe(0);
  });

  test("nested blocks, including two over the same messages, sit strictly inside each other", () => {
    const layout = sequenceLayout(
      seq(["a", "b"], [["a", "b", "1"], ["b", "a", "2"], ["a", "b", "3"]], [["outer", 1, 3], ["same", 1, 3], ["inner", 2, 2]]),
      METRICS,
    );
    const [outer, same, inner] = layout.blocks;
    const strictly = (a: Rect, b: Rect) => a.x > b.x && a.y > b.y && a.x + a.w < b.x + b.w && a.y + a.h < b.y + b.h;
    expect(strictly(same!, outer!)).toBe(true);
    expect(strictly(inner!, same!)).toBe(true);
    expect(layout.messages.map((r) => r.depth)).toEqual([2, 3, 2]);
  });

  test("a frame reaching left of the first header shifts the drawing into view", () => {
    const layout = sequenceLayout(seq(["a", "b"], [["a", "b", "1"]], [["l", 1, 1], ["m", 1, 1], ["n", 1, 1], ["o", 1, 1], ["p", 1, 1]]), METRICS);
    const all: Rect[] = [...layout.participants, ...layout.blocks, ...layout.messages.map((r) => r.hit)];
    for (const r of all) expect(inside(r, { x: 0, y: 0, w: layout.width, h: layout.height })).toBe(true);
  });

  test("what can't be drawn is left out: a duplicate participant, a message to no one, a block out of range", () => {
    const model = seq(["a", "b"], [["a", "b", "1"], ["a", "zz", "2"], ["b", "a", "3"]], [["bad", 3, 9], ["skips", 2, 2]]);
    model.participants.push({ id: "a", label: "Again", kind: "process" });
    const layout = sequenceLayout(model, METRICS);
    expect(layout.participants.map((p) => p.id)).toEqual(["a", "b"]);
    expect(layout.messages.map((r) => r.n)).toEqual([1, 3]);
    expect(layout.blocks).toEqual([]);
  });

  test("the example lays out from its streaming model at every cut without throwing", () => {
    for (let cut = 1; cut < EXAMPLE.length; cut += 23) {
      for (const el of sequences(session(EXAMPLE.slice(0, cut), true).root)) {
        const layout = sequenceLayout(sequenceModel(el.props, true), METRICS);
        expect(Number.isFinite(layout.width) && Number.isFinite(layout.height)).toBe(true);
      }
    }
  });
});
