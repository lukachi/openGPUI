// Timeline (docs/diagram.md): the validator's problems through Session (what `opengpui check`
// and the pane report), the model a streaming file gives the renderer, and the layout's
// scale, ticks, bars and dependency arrows.
import { describe, expect, test } from "bun:test";
import type { ElementNode, OpenUIError } from "@openuidev/lang-core";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error built JavaScript ships no declarations; typed as src/headless.ts below
import * as built from "../dist/opengpui-headless.js";
import type * as headless from "../src/headless.ts";
import type { TimelineLayout, TimelineMetrics, TimelineModel } from "../src/headless.ts";
import { libraries, Session } from "./lib.ts";

const { timelineModel, validateTimeline, timelineLayout, parseWhen } = built as typeof headless;
const EXAMPLE = readFileSync(join(import.meta.dir, "..", "skills", "opengpui", "examples", "timeline.oui"), "utf8");
const CLI = join(import.meta.dir, "..", "herdr", "mods", "opengpui", "cli", "opengpui");

function session(text: string, streaming = false) {
  const s = new Session({ library: libraries.openui.library });
  s.setResponse(text, streaming);
  s.update();
  return s;
}

const problems = (text: string) => session(text).errors.map((e: OpenUIError) => `${e.code}: ${e.message}${e.hint ? ` (${e.hint})` : ""}`);
const program = (...lines: string[]) => ["root = Stack([t])", ...lines].join("\n") + "\n";

function timelines(root: unknown): ElementNode[] {
  const found: ElementNode[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object" && "typeName" in v && "props" in v) {
      const el = v as ElementNode;
      if (el.typeName === "Timeline") found.push(el);
      else Object.values(el.props).forEach(walk);
    }
  };
  walk(root);
  return found;
}

describe("timeline validation", () => {
  test("the example has no problems", () => {
    expect(problems(EXAMPLE)).toEqual([]);
  });

  test("a time that is no ISO day or number, with a hint for each way it goes wrong", () => {
    const text = program('t = Timeline([Task("a", "A", "2027-02-29", "3"), Task("b", "B", "2027-01-04T09:00"), Task("c", "C", "next week")])');
    expect(problems(text)).toEqual([
      'timeline-bad-date: task "a": start "2027-02-29" is no date or number ("2027-02-29" is no calendar day.)',
      'timeline-bad-date: task "a": end "3" is no date or number (Write the number without quotes: 3.)',
      'timeline-bad-date: task "b": start "2027-01-04T09:00" is no date or number (Use the calendar day alone: "2027-01-04".)',
      expect.stringMatching(/^timeline-bad-date: task "c": start "next week" is no date or number \(Write an ISO day/),
    ]);
  });

  test("dates and numbers mixed: the first task's start sets the unit", () => {
    const text = program('t = Timeline([Task("a", "A", 1, 2), Task("b", "B", "2027-01-04", "2027-01-08"), Task("c", "C", 3, "2027-01-08")])');
    expect(problems(text)).toEqual([
      expect.stringMatching(/^timeline-mixed-units: task "b": start "2027-01-04" is a date, but this Timeline uses numbers \(task "a" starts 1\)/),
      expect.stringMatching(/^timeline-mixed-units: task "c": end "2027-01-08" is a date, but this Timeline uses numbers/),
    ]);
  });

  test("an end before its start; an end on its start is one period", () => {
    expect(problems(program('t = Timeline([Task("a", "A", "2027-01-08", "2027-01-04")])'))).toEqual([
      'timeline-end-before-start: task "a": ends "2027-01-04" before it starts "2027-01-08" (Swap them; or leave end out for a milestone.)',
    ]);
    expect(problems(program('t = Timeline([Task("b", "B", 3, 3)])'))).toEqual([]);
  });

  test("a dependency that is no task: did you mean, or a lane named", () => {
    const text = program('t = Timeline([Task("spec", "Spec", 1, 2, "Design"), Task("api", "API", 3, 4, "Backend", ["spek", "Design", "elasticsearch"])])');
    expect(problems(text)).toEqual([
      'timeline-unknown-dependency: task "api": after "spek": no task "spek" (Did you mean "spec"?)',
      'timeline-unknown-dependency: task "api": after "Design": no task "Design" ("Design" is a lane; name the tasks it waits for.)',
      'timeline-unknown-dependency: task "api": after "elasticsearch": no task "elasticsearch"',
    ]);
  });

  test("a step highlight that is no task: did you mean, or a lane named", () => {
    const text = program(
      "t = Timeline(tasks, steps)",
      'tasks = [Task("spec", "Spec", 1, 2, "Design"), Task("api", "API", 3, 4, "Backend")]',
      'steps = [DiagramStep("Start", "x", ["spec", "apii", "Backend"])]',
    );
    expect(problems(text)).toEqual([
      'timeline-unknown-highlight: step 1 "Start": no task "apii" (Did you mean "api"?)',
      'timeline-unknown-highlight: step 1 "Start": no task "Backend" ("Backend" is a lane; highlight its tasks.)',
    ]);
  });

  test("a duplicate id, an empty Timeline", () => {
    expect(problems(program('t = Timeline([Task("a", "A", 1), Task("a", "Again", 2)])'))).toEqual([expect.stringMatching(/^timeline-duplicate-id: task id "a" is used twice/)]);
    expect(problems(program("t = Timeline([])"))).toEqual([expect.stringMatching(/^timeline-empty:/)]);
  });

  test("over 40 tasks is a warning, not a failure", () => {
    const tasks = Array.from({ length: 41 }, (_, i) => `Task("t${i}", "T${i}", ${i})`).join(", ");
    expect(session(program(`t = Timeline([${tasks}])`)).errors).toEqual([
      expect.objectContaining({ code: "timeline-too-big", severity: "warning", statementId: "t", component: "Timeline" }),
    ]);
  });

  test("a Timeline inside a tab is checked too, named by its statement", () => {
    const text = ["root = Stack([tabs])", 'tabs = Tabs([TabItem("a", "A", [t])])', 't = Timeline([Task("a", "A", 1, 2, null, ["b"])])'].join("\n");
    expect(session(text).errors).toEqual([expect.objectContaining({ code: "timeline-unknown-dependency", statementId: "t" })]);
  });

  test("opengpui check prints the Timeline problems and fails", () => {
    const file = join(mkdtempSync(join(tmpdir(), "opengpui-timeline-")), "broken.oui");
    writeFileSync(file, program('t = Timeline([Task("a", "A", "2027-01-04", 3, null, ["b"])])'));
    const run = Bun.spawnSync([CLI, "check", file]);
    const out = run.stdout.toString() + run.stderr.toString();
    expect(run.exitCode).toBe(1);
    for (const code of ["timeline-mixed-units", "timeline-unknown-dependency"]) expect(out).toContain(`${code} (Timeline, statement t)`);
  });
});

describe("timeline times", () => {
  test("ISO calendar days are UTC day numbers; leap days only in leap years", () => {
    expect(parseWhen("1970-01-02")).toEqual({ unit: "date", value: 1 });
    expect(parseWhen("2028-02-29")?.value).toBe(parseWhen("2028-03-01")!.value - 1);
    expect(parseWhen("2027-02-29")).toBeNull();
    expect(parseWhen("2027-1-4")).toBeNull();
    expect(parseWhen(2.5)).toEqual({ unit: "number", value: 2.5 });
    expect(parseWhen("3")).toBeNull();
  });
});

describe("a streaming Timeline", () => {
  test("every cut of the example gives a model with nothing to report", () => {
    for (let cut = 1; cut < EXAMPLE.length; cut += 23) {
      const s = session(EXAMPLE.slice(0, cut), true);
      expect(s.errors).toEqual([]);
      for (const el of timelines(s.root)) {
        const found = validateTimeline(timelineModel(el.props, true), el.statementId).filter((e) => (e.code as string) !== "timeline-empty");
        expect({ cut, found }).toEqual({ cut, found: [] });
      }
    }
  });

  const model = (text: string) => timelineModel(timelines(session(text, true).root)[0]!.props, true);

  test("a task whose end is cut short waits; a dependency on a task not written yet waits", () => {
    const m = model(program('t = Timeline([Task("a", "A", "2027-01-04", "2027-01-08"), Task("b", "B", "2027-01-11", "2027-01-1'));
    expect(m.tasks.map((x) => x.id)).toEqual(["a"]);
    const deps = model(program('t = Timeline([Task("a", "A", 1, 2, null, ["b"]), Task("b", "B", 3, 4, null, ["a"]), Task("c", "C", 5, 6, null, ["d'));
    expect(deps.tasks.map((x) => [x.id, x.after])).toEqual([
      ["a", ["b"]],
      ["b", ["a"]],
      ["c", []],
    ]);
  });
});

// ── Layout ──

/** 7 px a character, 20 px lines. */
const METRICS: TimelineMetrics = {
  content: (t) => t.label.length * 7,
  contentH: 20,
  lane: (s) => s.length * 7,
  laneH: 18,
  tick: (s) => s.length * 7,
  tickH: 18,
};

function laid(text: string): { layout: TimelineLayout; model: TimelineModel } {
  const model = timelineModel(timelines(session(text).root)[0]!.props, false);
  return { layout: timelineLayout(model, METRICS)!, model };
}

const bar = (l: TimelineLayout, id: string) => l.bars.find((b) => b.id === id)!;
const arrow = (l: TimelineLayout, id: string) => l.arrows.find((a) => a.id === id)!.points;

describe("timeline layout", () => {
  test("ticks by span: days, Monday weeks, months; the closing tick unlabelled unless a task starts there", () => {
    const days = laid(program('t = Timeline([Task("a", "A", "2027-03-29", "2027-04-02")])')).layout;
    expect(days.tickKind).toBe("day");
    expect(days.ticks.map((t) => t.label)).toEqual(["Mar 29", "30", "31", "Apr 1", "2", null]);

    const weeks = laid(program('t = Timeline([Task("a", "A", "2027-01-06", "2027-02-20"), Task("m", "M", "2027-03-01")])')).layout;
    expect(weeks.tickKind).toBe("week");
    // 2027-01-06 is a Wednesday: the axis starts on its Monday and ends on the milestone's.
    expect(weeks.ticks[0]!.label).toBe("Jan 4");
    expect(weeks.ticks.at(-1)!.label).toBe("Mar 1");

    const months = laid(program('t = Timeline([Task("a", "A", "2027-01-11", "2027-12-17")])')).layout;
    expect(months.tickKind).toBe("month");
    expect(months.ticks.map((t) => t.label)).toEqual(["Jan 2027", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", null]);
  });

  test("numbers: integer ticks, ends included, a milestone where its period begins", () => {
    const { layout } = laid(program('t = Timeline([Task("a", "Auth", 1, 2), Task("b", "Sync", 3, 3), Task("m", "Beta", 4)])'));
    expect(layout.tickKind).toBe("number");
    expect(layout.ticks.map((t) => t.label)).toEqual(["1", "2", "3", "4"]);
    const [x1, x3, x4] = [layout.ticks[0]!.x, layout.ticks[2]!.x, layout.ticks[3]!.x];
    expect([bar(layout, "a").x0, bar(layout, "a").x1]).toEqual([x1, x3]);
    expect(bar(layout, "b").x1).toBe(x4);
    const m = bar(layout, "m");
    expect(m.milestone).toBe(true);
    expect((m.x0 + m.x1) / 2).toBe(x4);
  });

  test("a label inside its bar when it fits, else right of it; the drawing is wide enough for it", () => {
    const { layout } = laid(program('t = Timeline([Task("a", "A", 1, 4), Task("b", "A very long label for one unit", 5, 5)])'));
    expect(bar(layout, "a").inside).toBe(true);
    const b = bar(layout, "b");
    expect(b.inside).toBe(false);
    expect(b.labelX).toBeGreaterThan(b.x1);
    expect(layout.width).toBeGreaterThanOrEqual(b.labelX + b.labelW);
  });

  test("lanes in first-appearance order with their tasks in written order; tasks of the other unit left out", () => {
    const { layout } = laid(program('t = Timeline([Task("a", "A", 1, 2, "Back"), Task("b", "B", 1, 2, "Front"), Task("c", "C", 3, 4, "Back"), Task("d", "D", "2027-01-04", "2027-01-05", "Front")])'));
    expect(layout.lanes.map((l) => l.label)).toEqual(["Back", "Front"]);
    expect(layout.bars.map((b) => b.id)).toEqual(["a", "c", "b"]);
    const [back, front] = layout.lanes;
    expect(bar(layout, "c").rowY).toBeLessThan(front!.y);
    expect(bar(layout, "b").rowY).toBeGreaterThan(front!.y);
    expect(back!.y).toBe(layout.axisH);
  });

  test("arrows run from the dependency's end into the task's start, whatever the gap", () => {
    const { layout } = laid(
      program(
        't = Timeline([Task("a", "Alpha", 1, 2), Task("far", "Far", 5, 6, null, ["a"]), Task("next", "Next", 3, 4, null, ["a"]), Task("over", "Over", 1, 4, null, ["a"]), Task("m", "M", 7, null, null, ["far"]), Task("same", "Same", 7, 8, null, ["m"])])',
      ),
    );
    const a = bar(layout, "a");
    const end = (id: string) => arrow(layout, id).at(-1)!;
    const midY = (id: string) => bar(layout, id).y + bar(layout, id).h / 2;

    // Room between them: out of the end, down, into the start.
    expect(arrow(layout, "a>far")[0]).toEqual([a.x1, a.y + a.h / 2]);
    expect(end("a>far")).toEqual([bar(layout, "far").x0, midY("far")]);
    // Abutting: down from under the end, into the start.
    expect(arrow(layout, "a>next")[0]![1]).toBe(a.y + a.h);
    expect(arrow(layout, "a>next")[0]![0]).toBeLessThan(a.x1);
    expect(end("a>next")).toEqual([bar(layout, "next").x0, midY("next")]);
    // Starting with it: straight down onto the task.
    const over = bar(layout, "over");
    expect(arrow(layout, "a>over")).toHaveLength(2);
    expect(end("a>over")[1]).toBe(over.y);
    // A milestone leaves from its tip; one starting with it is reached around its start.
    const m = bar(layout, "m");
    expect(arrow(layout, "m>same")[0]).toEqual([(m.x0 + m.x1) / 2, m.y + m.h]);
    expect(end("m>same")).toEqual([bar(layout, "same").x0, midY("same")]);
    expect(arrow(layout, "m>same").some(([x]) => x < bar(layout, "same").x0)).toBe(true);
  });

  test("the same model lays out the same", () => {
    const a = laid(EXAMPLE).layout;
    const b = laid(EXAMPLE).layout;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
