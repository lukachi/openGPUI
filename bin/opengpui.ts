// opengpui: the agent's side of the Herdr surface. The contract it implements (commands,
// events, replies, exit codes) is docs/agent-contract.md; keep the two in step.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createParser, type OpenUIError, type PromptOptions } from "@openuidev/lang-core";
import { eventsPath } from "../herdr/src/contract.ts";
import { components } from "../src/components/index.ts";
import { selectLibrary } from "../src/library.ts";
import { isStreamingResponse, parseResponseBundle } from "../src/runtime/response.ts";
import { Session } from "../src/runtime/session.ts";
import SKILL from "../skills/opengpui/SKILL.md" with { type: "text" };
import { EXAMPLES } from "./examples.ts";
import { version } from "../package.json";

const USAGE = `opengpui: show OpenUI Lang in a Herdr pane and get the person's actions back

  opengpui prompt [--library openui|chat] [--components A,B,…] [--tools tools.json]
      the OpenUI Lang manual for the components the pane draws
  opengpui check <file.oui> [--library …] [--components …] [--tools tools.json]
      parse it as the pane will; print each problem; exit 1 if there is one
  opengpui show <file.oui> [--right|--down|--tab] [--title <text>] [--library …]
                [--components …] [--tools tools.json] [--look herdr|openui]
                [--no-reply | --reply <terminal>]
      open it in Herdr beside your terminal ($HC_TERMINAL_ID's pane, else the
      focused one), closing what an earlier show of the file opened; actions are
      sent to $HC_TERMINAL_ID unless --reply names another terminal or --no-reply none
  opengpui wait <file.oui> [--timeout <seconds>]
      print the events \`wait\` has not printed yet, blocking until there is one
      (default 110 s, 0: no limit); exit 1 on timeout: run it again
  opengpui events <file.oui>
      print every event since \`show\` (JSONL)
  opengpui close <file.oui>
      close the pane or tab \`show\` opened
  opengpui skill
      print the agent skill: how to use opengpui and the pane
  opengpui examples [name]
      list the worked diagram examples, or print one (OpenUI Lang)
  opengpui --version

Exit codes: 0 ok, 1 check found problems or wait timed out, 2 bad usage,
3 Herdr failed (not installed, not running, or the opengpui mod missing).`;

class CliError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

const usage = (message: string) => new CliError(2, `${message}\n\n${USAGE}`);

const HERDR_HOME = process.env.HERDR_APP_HOME ?? join(homedir(), ".config", "herdr-app");

/**
 * The mod `show` opens: the folder this CLI ships in (`mods/<name>/cli/opengpui.mjs`), so a copy
 * installed under another name (Herdr renames a mod whose name is taken) opens itself.
 */
const MOD = basename(dirname(dirname(fileURLToPath(import.meta.url))));

/** The launcher next to this CLI (`cli/opengpui`): `show` hands it to the pane, which runs `layout` with it. */
const LAUNCHER = join(dirname(fileURLToPath(import.meta.url)), "opengpui");

/** Set by commands that load elkjs, which keeps Bun's event loop alive after the work is done. */
let exitWhenDone = false;

const args = process.argv.slice(2);

function flag(name: string): boolean {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}

function option(name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith("--")) throw usage(`${name} needs a value`);
  args.splice(i, 2);
  return value;
}

/**
 * The one positional argument, after every option has been taken: an absolute path with
 * symlinks resolved once the file exists, so a file is the same file however it is named.
 */
function fileArg(): string {
  const unknown = args.find((a) => a.startsWith("--"));
  if (unknown) throw usage(`unknown option ${unknown}`);
  if (args.length !== 1) throw usage(args.length ? `one file only, got ${args.join(" ")}` : "which .oui file?");
  const file = resolve(args[0]!);
  return existsSync(file) ? realpathSync(file) : file;
}

function noMoreArgs(): void {
  if (args.length) throw usage(`unexpected ${args.join(" ")}`);
}

function libraryFrom(library: string | undefined, only: string[] | undefined) {
  try {
    return selectLibrary(library, Object.keys(components), only);
  } catch (e) {
    throw new CliError(2, (e as Error).message);
  }
}

const componentsOption = () =>
  option("--components")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

interface ToolEntry {
  command: string;
  args?: string[];
  cwd?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

/** A tools file, checked for the shape the pane runs. */
function readTools(path: string): Record<string, ToolEntry> {
  let tools: unknown;
  try {
    tools = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new CliError(2, `can't read tools file ${path}: ${(e as Error).message}`);
  }
  if (!tools || typeof tools !== "object" || Array.isArray(tools)) throw new CliError(2, `${path}: expected { "name": { "command": … } }`);
  for (const [name, spec] of Object.entries(tools)) {
    if (!spec || typeof (spec as ToolEntry).command !== "string") throw new CliError(2, `${path}: tool "${name}" needs a "command" string`);
  }
  return tools as Record<string, ToolEntry>;
}

/** The tools section of the prompt: a bare name, `name: description`, or a full ToolSpec when schemas are given. */
function promptTools(tools: Record<string, ToolEntry>): NonNullable<PromptOptions["tools"]> {
  return Object.entries(tools).map(([name, t]) =>
    t.inputSchema || t.outputSchema
      ? { name, description: t.description, inputSchema: t.inputSchema ?? {}, outputSchema: t.outputSchema ?? {} }
      : t.description
        ? `${name}: ${t.description}`
        : name,
  );
}

/** The manual's first paragraph: upstream's is for a chat model answering in openui-lang. */
const PREAMBLE =
  "You write openui-lang, a declarative UI language, into a .oui file. A Herdr pane (openGPUI) draws the file " +
  "with native elements and redraws it whenever the file changes. The file holds openui-lang only: no markdown " +
  "fences and no prose around it. What the person does in the pane (a button, a submitted form) comes back to " +
  "you as an event.";

function underHome(path: string, what: string): void {
  const home = realpathSync(homedir());
  if (!path.startsWith(`${home}/`)) throw new CliError(2, `${what} ${path} is outside your home folder: Herdr mods read only under ${home}`);
}

/** Runs herdr-app; a CliError (exit 3) when it isn't on PATH. */
function herdrApp(argv: string[]): { code: number | null; out: string; err: string } {
  const proc = spawnSync("herdr-app", argv, { encoding: "utf8" });
  if (proc.error) throw new CliError(3, "herdr-app is not on PATH: opengpui shows UI in the Herdr app (https://herdr.dev)");
  return { code: proc.status, out: proc.stdout.trim(), err: proc.stderr.trim() };
}

/** Runs a Herdr command; its JSON answer, or a CliError with Herdr's own words. */
function herdr(command: string, payload: Record<string, unknown>): Record<string, unknown> {
  const { code, out, err } = herdrApp(["do", command, JSON.stringify(payload)]);
  let answer: Record<string, unknown> = {};
  try {
    answer = out ? JSON.parse(out) : {};
  } catch {}
  if (code !== 0 || typeof answer.error === "string") {
    const why = (typeof answer.error === "string" ? answer.error : err || out) || `exit ${code}`;
    throw new CliError(3, `herdr-app do ${command} failed: ${why}`);
  }
  return answer;
}

/** The space and pane of the Herdr window that hold hc terminal `terminal`, if the window shows it. */
function agentPane(terminal: string | undefined): { space: string; pane: string } | null {
  if (!terminal) return null;
  try {
    const { spaces } = JSON.parse(herdrApp(["ls"]).out) as { spaces: { id: string; tabs: { terminals: { terminal: string; pane: string }[] }[] }[] };
    for (const space of spaces)
      for (const tab of space.tabs) for (const t of tab.terminals) if (t.terminal === terminal) return { space: space.id, pane: t.pane };
  } catch {}
  return null;
}

/** Event lines written so far; a line still being written (no newline yet) waits for the next read. */
function readEvents(path: string): string[] {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  return text.slice(0, text.lastIndexOf("\n") + 1).split("\n").filter(Boolean);
}

/** Next to the events file: how many lines `wait` has printed, and what `show` opened. */
const cursorPath = (events: string) => events.replace(/\.jsonl$/, ".cursor");
const shownPath = (events: string) => events.replace(/\.jsonl$/, ".shown.json");

/** What `show` opened for a file, or null when nothing (or a record without a target) is there. */
function readShown(events: string): { place: string; target: string } | null {
  try {
    const record: unknown = JSON.parse(readFileSync(shownPath(events), "utf8"));
    if (!record || typeof record !== "object" || !("place" in record) || !("target" in record)) return null;
    const { place, target } = record;
    return typeof place === "string" && typeof target === "string" && target ? { place, target } : null;
  } catch {
    return null;
  }
}

/** Closes what `show` opened; an empty target would make Herdr close the current pane or tab: the agent's own. */
function closeShown(shown: { place: string; target: string }): void {
  if (shown.place === "tab") herdr("tab.close", { id: shown.target });
  else herdr("pane.close", { pane: shown.target });
}

/** The pane reads at most this much of a file. */
const MAX_FILE_BYTES = 1024 * 1024;

function formatError(e: OpenUIError): string {
  const where = [e.component, e.statementId && `statement ${e.statementId}`].filter(Boolean).join(", ");
  const hint = e.hint && !(e.hint.startsWith("Available components") && e.message.includes("Available components")) ? `\n  hint: ${e.hint}` : "";
  return `${e.code}${where ? ` (${where})` : ""}: ${e.message}${hint}`;
}

async function main(): Promise<void> {
  const command = args.shift();
  switch (command) {
    case "prompt": {
      const library = option("--library");
      const only = componentsOption();
      const toolsFile = option("--tools");
      noMoreArgs();
      const source = libraryFrom(library, only);
      const tools = toolsFile ? promptTools(readTools(resolve(toolsFile))) : undefined;
      console.log(
        source.library.prompt({
          ...source.promptOptions,
          preamble: PREAMBLE,
          // The pane keeps $state, @Set and @Reset itself; Query/Mutation need the tools the pane runs.
          bindings: true,
          toolCalls: !!tools?.length,
          ...(tools?.length ? { tools } : {}),
        }),
      );
      return;
    }
    case "check": {
      const source = libraryFrom(option("--library"), componentsOption());
      const toolsFile = option("--tools");
      const file = fileArg();
      if (!existsSync(file)) throw new CliError(2, `${file} does not exist`);
      const tools = toolsFile ? readTools(resolve(toolsFile)) : null;
      const text = readFileSync(file, "utf8");
      const { library } = source;
      const problems: string[] = [];
      const warnings: string[] = [];
      const bytes = Buffer.byteLength(text);
      if (bytes > MAX_FILE_BYTES) problems.push(`too large: ${bytes} bytes; the pane reads at most ${MAX_FILE_BYTES}`);
      if (!text.trim()) problems.push("empty: the file has no statements");
      else {
        if (isStreamingResponse(text)) {
          problems.push("streaming: the file starts with ]]>openui:content but has no ]]>openui:end line yet; the pane holds inputs and buttons until it does");
        }
        const session = new Session({ library });
        session.setResponse(text);
        session.update();
        for (const e of session.errors) (e.severity === "warning" ? warnings : problems).push(formatError(e));
        session.dispose();
        // What the pane draws around silently, but a finished file shouldn't have (upstream's own validity test).
        const result = createParser(library.toJSONSchema(), library.root).parse(parseResponseBundle(text, false).program);
        const { meta } = result;
        if (meta.incomplete) problems.push("incomplete: a string, bracket or statement is still open at the end of the file");
        for (const name of meta.unresolved) problems.push(`unresolved: ${name} is used but never defined, so it draws nothing`);
        for (const name of meta.orphaned) problems.push(`orphaned: ${name} is defined but root never reaches it, so it isn't drawn`);
        // Query/Mutation run only tools the pane is given (show --tools).
        for (const [kind, statements] of [
          ["Query", result.queryStatements],
          ["Mutation", result.mutationStatements],
        ] as const) {
          for (const { statementId, toolAST } of statements) {
            if (toolAST?.k !== "Str") continue;
            const tool = String(toolAST.v);
            if (!tools) problems.push(`tool: ${statementId} = ${kind}("${tool}") needs a tools file (--tools); the pane has no tools without one`);
            else if (!(tool in tools)) problems.push(`tool: ${statementId} = ${kind}("${tool}"): no such tool in ${toolsFile} (${Object.keys(tools).join(", ")})`);
          }
        }
      }
      for (const w of warnings) console.log(`warning ${w}`);
      for (const p of problems) console.log(p);
      if (problems.length) process.exitCode = 1;
      else console.log(`ok: ${file}`);
      return;
    }
    case "show": {
      const tab = flag("--tab");
      const down = flag("--down");
      const right = flag("--right");
      if (+tab + +down + +right > 1) throw usage("one of --right, --down, --tab");
      const noReply = flag("--no-reply");
      const replyTo = option("--reply");
      if (noReply && replyTo) throw usage("--reply or --no-reply, not both");
      const title = option("--title");
      const library = option("--library");
      const only = componentsOption();
      const toolsFile = option("--tools");
      const look = option("--look");
      if (look && look !== "herdr" && look !== "openui") throw usage(`--look herdr or openui, not ${look}`);
      const file = fileArg();
      libraryFrom(library, only);
      if (!existsSync(file)) throw new CliError(2, `${file} does not exist yet: write it first`);
      underHome(file, "the file");
      const tools = toolsFile ? resolve(toolsFile) : undefined;
      if (tools) {
        readTools(tools);
        underHome(realpathSync(tools), "the tools file");
      }
      const reply = noReply ? undefined : (replyTo ?? process.env.HC_TERMINAL_ID);
      const events = eventsPath(HERDR_HOME, file);
      const props = {
        src: file,
        events,
        ...(reply ? { reply } : {}),
        ...(title ? { title } : {}),
        ...(library ? { library } : {}),
        ...(only ? { components: only } : {}),
        ...(tools ? { tools } : {}),
        ...(look ? { look } : {}),
        ...(existsSync(LAUNCHER) ? { cli: LAUNCHER } : {}),
      };
      // One pane per file: two would append to one log and both answer.
      const earlier = readShown(events);
      if (earlier) {
        try {
          closeShown(earlier);
          console.log(`closed the earlier ${earlier.place === "tab" ? "tab" : "pane"} of ${file}`);
        } catch {
          // Already closed by the person.
        }
      }
      // A new showing starts a new log, cleared before the pane exists so nothing it writes is lost.
      mkdirSync(dirname(events), { recursive: true });
      for (const path of [events, cursorPath(events), shownPath(events)]) rmSync(path, { force: true });
      const place = tab ? "tab" : down ? "down" : "right";
      // Beside the agent's own terminal ($HC_TERMINAL_ID), wherever the person's focus is; else Herdr's focused pane.
      const near = agentPane(process.env.HC_TERMINAL_ID);
      const opened =
        place === "tab"
          ? herdr("tab.new", { name: title ?? basename(file), mod: MOD, props, ...(near ? { space: near.space } : {}) })
          : herdr("pane.split", { direction: place, mod: MOD, props, ...(near ? { pane: near.pane } : {}) });
      const target = place === "tab" ? opened.tab : opened.pane;
      if (typeof target !== "string" || !target) throw new CliError(3, `herdr-app answered without a ${place === "tab" ? "tab" : "pane"} id: ${JSON.stringify(opened)}`);
      writeFileSync(shownPath(events), JSON.stringify({ place, target }));
      console.log(`showing ${file} (${place === "tab" ? "new tab" : place})`);
      console.log(`events: ${events}`);
      console.log(reply ? `replies: sent to terminal ${reply}` : "replies: none; use opengpui wait");
      return;
    }
    case "events": {
      const file = fileArg();
      for (const line of readEvents(eventsPath(HERDR_HOME, file))) console.log(line);
      return;
    }
    case "wait": {
      // Under the 2-minute limit common agent shell tools put on a command.
      const seconds = Number(option("--timeout") ?? 110);
      if (!Number.isFinite(seconds) || seconds < 0) throw usage("--timeout takes seconds (0: no limit)");
      const file = fileArg();
      const events = eventsPath(HERDR_HOME, file);
      if (!readShown(events)) throw new CliError(2, `nothing shows ${file}: run opengpui show first`);
      const cursor = cursorPath(events);
      const printed = existsSync(cursor) ? Number(readFileSync(cursor, "utf8")) || 0 : 0;
      const started = Date.now();
      for (;;) {
        const lines = readEvents(events);
        if (lines.length > printed) {
          for (const line of lines.slice(printed)) console.log(line);
          writeFileSync(cursor, String(lines.length));
          return;
        }
        if (seconds > 0 && Date.now() - started > seconds * 1000) throw new CliError(1, `no event within ${seconds}s; run wait again`);
        await new Promise((done) => setTimeout(done, 250));
      }
    }
    case "close": {
      const file = fileArg();
      const events = eventsPath(HERDR_HOME, file);
      const shown = readShown(events);
      if (!shown) throw new CliError(2, `nothing shows ${file}`);
      rmSync(shownPath(events), { force: true });
      closeShown(shown);
      console.log(`closed ${file}`);
      return;
    }
    case "skill":
      noMoreArgs();
      process.stdout.write(SKILL);
      return;
    case "examples": {
      const [name] = args.splice(0, 1);
      noMoreArgs();
      if (!name) {
        const width = Math.max(...EXAMPLES.map((e) => e.name.length));
        for (const e of EXAMPLES) console.log(`${e.name.padEnd(width)}  ${e.about}`);
        console.log(`\nopengpui examples <name> prints one.`);
        return;
      }
      const example = EXAMPLES.find((e) => e.name === name);
      if (!example) throw usage(`no example "${name}"; there are: ${EXAMPLES.map((e) => e.name).join(", ")}`);
      process.stdout.write(example.source);
      return;
    }
    // Internal (docs/agent-contract.md): the pane lays a Diagram out through it, not the agent.
    case "layout": {
      const [input, output] = args.splice(0, 2);
      noMoreArgs();
      if (!input || !output) throw new CliError(2, "layout <in.json> <out.json>");
      let graph;
      try {
        graph = JSON.parse(readFileSync(input, "utf8")) as unknown;
      } catch (e) {
        throw new CliError(2, `can't read a sized graph from ${input}: ${e instanceof Error ? e.message : e}`);
      }
      exitWhenDone = true;
      // Loaded only here (the bundle evaluates it lazily): elkjs is 3 MB of script no other command needs.
      const { layoutGraph, parseSizedGraph } = await import("../src/diagram/elk.ts");
      let layout;
      try {
        layout = await layoutGraph(parseSizedGraph(graph));
      } catch (e) {
        throw new CliError(2, `${input}: ${(e instanceof Error ? e.message : String(e)).split("\n")[0]}`);
      }
      // Through a file of its own, so a pane reading `output` never sees half of it.
      const partial = `${output}.${process.pid}.tmp`;
      writeFileSync(partial, JSON.stringify(layout));
      renameSync(partial, output);
      return;
    }
    case "--version":
      noMoreArgs();
      console.log(`opengpui ${version}`);
      return;
    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log(USAGE);
      return;
    default:
      throw usage(`unknown command ${command}`);
  }
}

try {
  await main();
} catch (e) {
  if (!(e instanceof CliError)) throw e;
  console.error(`opengpui: ${e.message}`);
  process.exitCode = e.code;
}
if (exitWhenDone) process.exit();
