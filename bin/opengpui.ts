// opengpui: the agent's side of the Herdr surface.
//
//   opengpui prompt [--library openui|chat]       the OpenUI Lang manual for what this build draws
//   opengpui check <file.oui> [--library …]        parse it like the surface will; print errors
//   opengpui show <file.oui> [options]             open it in Herdr, next to you
//       --tab | --down                             a new tab, or below instead of right
//       --title <text>  --library <name>  --tools <tools.json>
//       --look herdr|openui                        Herdr's colors (default) or OpenUI's own theme
//       --no-reply | --reply <terminal>            actions go to $HC_TERMINAL_ID (you) unless told otherwise
//   opengpui wait <file.oui> [--timeout <s>]       block until the person acts; print the event
//   opengpui events <file.oui>                     print every event so far (JSONL)
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { components } from "../src/components/index.ts";
import { libraries, subsetLibrary, type LibraryName } from "../src/library.ts";
import { Session } from "../src/runtime/session.ts";

const HERDR_HOME = process.env.HERDR_APP_HOME ?? join(homedir(), ".config", "herdr-app");

function usage(): never {
  const text = readFileSync(import.meta.path, "utf8");
  console.error(
    text
      .split("\n")
      .filter((l) => l.startsWith("//"))
      .map((l) => l.slice(3))
      .join("\n"),
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const command = args.shift() ?? usage();

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
  if (value === undefined) throw new Error(`${name} needs a value`);
  args.splice(i, 2);
  return value;
}

function librarySource(name: string | undefined) {
  const key = (name ?? "openui") as LibraryName;
  const source = libraries[key];
  if (!source) throw new Error(`unknown library ${name}: openui or chat`);
  return subsetLibrary(source, Object.keys(components));
}

/** The events file the surface writes for `file`: the same name rule as the mod. */
function eventsPath(file: string): string {
  const name = basename(file).replace(/\.[^.]*$/, "").replace(/[^\w.-]+/g, "_");
  return join(HERDR_HOME, "opengpui", "events", `${name}.jsonl`);
}

function fileArg(): string {
  const file = args.shift();
  if (!file) usage();
  return resolve(file);
}

async function herdr(commandName: string, payload: Record<string, unknown>): Promise<void> {
  const proc = Bun.spawn(["herdr-app", "do", commandName, JSON.stringify(payload)], { stdout: "inherit", stderr: "inherit" });
  if ((await proc.exited) !== 0) throw new Error(`herdr-app do ${commandName} failed`);
}

function readEvents(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean);
}

switch (command) {
  case "prompt": {
    const source = librarySource(option("--library"));
    console.log(source.library.prompt(source.promptOptions));
    break;
  }
  case "check": {
    const library = option("--library");
    const file = fileArg();
    const session = new Session({ library: librarySource(library).library });
    session.setResponse(readFileSync(file, "utf8"));
    session.update();
    if (!session.errors.length) {
      console.log(`ok: ${file}`);
    } else {
      for (const e of session.errors) {
        console.log(`${e.code}${e.component ? ` (${e.component})` : ""}: ${e.message}${e.hint ? `\n  hint: ${e.hint}` : ""}`);
      }
      process.exitCode = 1;
    }
    session.dispose();
    break;
  }
  case "show": {
    const place = flag("--tab") ? "tab" : flag("--down") ? "down" : "right";
    const noReply = flag("--no-reply");
    const replyTo = option("--reply");
    const title = option("--title");
    const library = option("--library");
    const tools = option("--tools");
    const look = option("--look");
    const file = fileArg();
    if (!existsSync(file)) throw new Error(`${file} does not exist yet: write it first`);
    const reply = noReply ? undefined : (replyTo ?? process.env.HC_TERMINAL_ID);
    const props = {
      src: file,
      events: eventsPath(file),
      ...(reply ? { reply } : {}),
      ...(title ? { title } : {}),
      ...(library ? { library } : {}),
      ...(tools ? { tools: resolve(tools) } : {}),
      ...(look ? { look } : {}),
    };
    if (place === "tab") await herdr("tab.new", { name: title ?? basename(file), mod: "opengpui", props });
    else await herdr("pane.split", { direction: place, mod: "opengpui", props });
    console.log(`showing ${file}`);
    console.log(`events: ${props.events}${reply ? ` (also sent to ${reply})` : ""}`);
    break;
  }
  case "events": {
    for (const line of readEvents(eventsPath(fileArg()))) console.log(line);
    break;
  }
  case "wait": {
    const timeout = Number(option("--timeout") ?? 600) * 1000;
    const path = eventsPath(fileArg());
    const seen = readEvents(path).length;
    const started = Date.now();
    for (;;) {
      const lines = readEvents(path);
      if (lines.length > seen) {
        for (const line of lines.slice(seen)) console.log(line);
        break;
      }
      if (Date.now() - started > timeout) {
        console.error(`no event within ${timeout / 1000}s`);
        process.exitCode = 1;
        break;
      }
      await Bun.sleep(300);
    }
    break;
  }
  default:
    usage();
}

