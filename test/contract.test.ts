// The agent contract (docs/agent-contract.md): where a shown file's events go, what
// `opengpui check` refuses, how `show`/`wait` keep the log, and how a component subset is
// closed. The CLI runs from the build, as an agent runs it; Herdr is a fake `herdr-app` on
// PATH that logs its calls.
import { describe, expect, test } from "bun:test";
import { appendFileSync, chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eventsPath } from "../herdr/src/contract.ts";
import { selectLibrary } from "./lib.ts";

const CLI = join(import.meta.dir, "..", "dist", "opengpui-cli.js");

describe("eventsPath", () => {
  test("files of one name in two folders keep separate logs", () => {
    expect(eventsPath("/h", "/work/a/review.oui")).not.toBe(eventsPath("/h", "/work/b/review.oui"));
  });

  test("follows the documented rule: sanitized stem, FNV-1a over UTF-16 code units", () => {
    expect(eventsPath("/h", "/work/a/review.oui")).toBe("/h/opengpui/events/review-01b964b1.jsonl");
    expect(eventsPath("/h", "/w/Révision plan.oui")).toBe("/h/opengpui/events/R_vision_plan-529ea2ad.jsonl");
  });
});

describe("opengpui check", () => {
  const dir = mkdtempSync(join(tmpdir(), "opengpui-check-"));
  const check = (name: string, text: string, ...flags: string[]) => {
    const file = join(dir, `${name}.oui`);
    writeFileSync(file, text);
    const run = Bun.spawnSync(["bun", CLI, "check", file, ...flags]);
    return { code: run.exitCode, out: run.stdout.toString() };
  };

  test("passes a complete program", () => {
    expect(check("good", 'root = Stack([a])\na = TextContent("hi")\n')).toMatchObject({ code: 0 });
  });

  test("fails what the pane would silently leave out or hold back", () => {
    expect(check("unresolved", 'root = Stack([a, b])\na = TextContent("hi")\n')).toMatchObject({ code: 1, out: expect.stringContaining("unresolved: b") });
    expect(check("orphan", 'root = Stack([a])\na = TextContent("hi")\nz = TextContent("x")\n')).toMatchObject({
      code: 1,
      out: expect.stringContaining("orphaned: z"),
    });
    expect(check("open", "root = Stack([\n")).toMatchObject({ code: 1, out: expect.stringContaining("incomplete") });
    expect(check("framed", ']]>openui:content\nroot = Stack([a])\na = TextContent("hi")\n')).toMatchObject({
      code: 1,
      out: expect.stringContaining("]]>openui:end"),
    });
  });

  test("fails a Query whose tool the pane won't have", () => {
    const text = 'root = Stack([t])\nd = Query("list_items", {}, {rows: []})\nt = TextContent("" + @Count(d.rows))\n';
    expect(check("notools", text)).toMatchObject({ code: 1, out: expect.stringContaining('Query("list_items")') });
    const tools = join(dir, "tools.json");
    writeFileSync(tools, JSON.stringify({ other: { command: "/bin/echo" } }));
    expect(check("wrongtool", text, "--tools", tools)).toMatchObject({ code: 1, out: expect.stringContaining("no such tool") });
    writeFileSync(tools, JSON.stringify({ list_items: { command: "/bin/echo" } }));
    expect(check("tool", text, "--tools", tools)).toMatchObject({ code: 0 });
  });
});

describe("show and wait", () => {
  // A home of its own (show takes only files under $HOME) with a fake herdr-app on PATH.
  const home = realpathSync(mkdtempSync(join(tmpdir(), "opengpui-home-")));
  const herdrHome = join(home, "herdr");
  const bin = join(home, "bin");
  const calls = join(home, "calls.log");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "herdr-app"),
    `#!/bin/sh\necho "$*" >> "${calls}"\ncase "$1 $2" in\n  "do tab.new") echo '{"tab":"tb1"}' ;;\n  "do pane.split") echo '{"pane":"p1"}' ;;\n  "ls ") echo '{"spaces":[]}' ;;\n  *) echo '{}' ;;\nesac\n`,
  );
  chmodSync(join(bin, "herdr-app"), 0o755);
  const env = { ...process.env, HOME: home, HERDR_APP_HOME: herdrHome, PATH: `${bin}:${process.env.PATH}`, HC_TERMINAL_ID: "" };
  const cli = (...args: string[]) => {
    const run = Bun.spawnSync(["bun", CLI, ...args], { env });
    return { code: run.exitCode, out: run.stdout.toString(), err: run.stderr.toString() };
  };
  const file = join(home, "review.oui");
  writeFileSync(file, 'root = Stack([b])\nb = Button("Go")\n');
  const log = eventsPath(herdrHome, file);
  const event = (message: string) => `${JSON.stringify({ type: "continue_conversation", message })}\n`;

  test("a new showing starts a new log, and replaces the earlier pane", () => {
    expect(cli("show", file, "--tab", "--no-reply")).toMatchObject({ code: 0 });
    appendFileSync(log, event("old"));
    expect(cli("show", file, "--no-reply")).toMatchObject({ code: 0 });
    expect(cli("events", file).out).toBe("");
    expect(readFileSync(calls, "utf8")).toContain('do tab.close {"id":"tb1"}');
  });

  test("wait prints each event once, including those written before it started", () => {
    cli("show", file, "--no-reply");
    appendFileSync(log, event("one") + event("two"));
    const first = cli("wait", file, "--timeout", "1");
    expect(first.code).toBe(0);
    expect(first.out.trim().split("\n").map((l) => JSON.parse(l).message)).toEqual(["one", "two"]);
    expect(cli("wait", file, "--timeout", "1")).toMatchObject({ code: 1, err: expect.stringContaining("opengpui:") });
    appendFileSync(log, `${event("three")}{"type":"cut`);
    expect(cli("wait", file, "--timeout", "1").out.trim()).toBe(event("three").trim());
  });

  test("close closes what show opened, and only that", () => {
    cli("show", file, "--down", "--no-reply");
    expect(cli("close", file)).toMatchObject({ code: 0 });
    expect(readFileSync(calls, "utf8").trim().split("\n").at(-1)).toBe('do pane.close {"pane":"p1"}');
    expect(cli("close", file)).toMatchObject({ code: 2 });
  });
});

describe("selectLibrary", () => {
  // A renderer's set, small enough to read; EditableTable is in it so the notes test has something to drop.
  const implemented = ["Stack", "Table", "Col", "Form", "FormControl", "Buttons", "Button", "Input", "TextArea", "EditableTable"];
  const names = (only: string[]) => Object.keys(selectLibrary("openui", implemented, only).library.components).sort();

  test("keeps the root and takes along the components a kept signature can only hold", () => {
    expect(names(["Table"])).toEqual(["Col", "Stack", "Table"]);
  });

  test("asks for one of the choices a required prop offers, and accepts any one", () => {
    expect(() => names(["Form"])).toThrow(/FormControl's input needs one of Input, TextArea/);
    expect(names(["Form", "TextArea"])).toEqual(["Button", "Buttons", "Form", "FormControl", "Stack", "TextArea"]);
  });

  test("rejects names the library doesn't have, and an empty list", () => {
    expect(() => names(["Table", "Nope"])).toThrow(/Nope/);
    expect(() => names([])).toThrow();
  });

  test("drops the notes about a component left out", () => {
    const { library, promptOptions } = selectLibrary("openui", implemented, ["Table"]);
    expect(library.prompt(promptOptions)).not.toContain("{ id, values }");
    expect(selectLibrary("openui", implemented).library.prompt(promptOptions)).toContain("{ id, values }");
  });
});
