// Draw .oui files offscreen with the headless harness (tools/oui-harness) and
// write PNGs: the real core on the gpui-shell runtime Herdr embeds, with no
// window on screen, no focus change and no Herdr.
//
//   bun scripts/shot.ts <file.oui>... [options]
//     --mode light,dark     one shot per mode (default light)
//     --library openui|chat (default openui)
//     --width <px>          viewport, logical px; shots are 2x (default 1280)
//     --height <px>         (default 820)
//     --steps <steps.json>  input to run after the first shot, the same for every file:
//                             { "click" | "hover" | "down" | "move" | "up": "id" | [x, y] }
//                             { "drag": [x1, y1, x2, y2] }      button held over ten moves
//                             { "scroll": [x, y, dy] | [x, y, dy, dx] }   dy > 0 reads further down
//                             { "key": "cmd-a" }  { "type": "text" }
//                             { "resize": [width, height] }     as a pane resize
//                             { "wait": ms }                    simulated time, 16 ms frames
//                             { "clipboard": true }             prints the clipboard's text
//                             { "response": "file" }            the file's new text, as when an agent
//                                                               rewrites it (relative to the steps file);
//                                                               framed without its end line = streaming
//                             { "shot": "name" }
//                           Every step but shot/wait/clipboard runs until settled, or with
//                           "settle": ms on it for exactly that long (to catch a short state).
//                           ids are the gpui-base controls the harness observes
//                           (Accordion triggers, Buttons, Inputs, Tabs, …: --spec
//                           lists them with their bounds); aim at a script div
//                           with a point.
//     --out <dir>           default tmp/shots: <file>-<mode>.png, <file>-<mode>-<name>.png
//     --spec                also write <file>-<mode>.spec.txt: the element description after
//                           the last step, and the ids a step can name, with their bounds
//     --jobs <n>            harness processes in parallel (default 4)
//     --quiet <ms>          simulated time without a script render that counts as
//                           settled (default 2500: the core's watchdogs restart
//                           a stalled task about two seconds in)
//     --json                print the harness's JSON lines as they are
//
// Prints per-file timings, then every action the session emitted and every
// error, as the harness reported them (one JSON line each with --json).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const root = join(import.meta.dir, "..");
const args = process.argv.slice(2);

function option(name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args[i + 1];
  if (value == null || value.startsWith("--")) throw new Error(`${name} needs a value`);
  args.splice(i, 2);
  return value;
}

function flag(name: string): boolean {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
}

type Target = string | [number, number];
type Step = (
  | { click: Target }
  | { hover: Target }
  | { down: Target }
  | { move: Target }
  | { up: Target }
  | { drag: [number, number, number, number] }
  | { scroll: [number, number, number] | [number, number, number, number] }
  | { key: string }
  | { type: string }
  | { resize: [number, number] }
  | { wait: number }
  | { clipboard: true }
  | { response: string }
  | { shot: string }
) & { settle?: number };

const modes = (option("--mode") ?? "light").split(",");
const library = option("--library") ?? "openui";
const width = Number(option("--width") ?? 1280);
const height = Number(option("--height") ?? 820);
const stepsPath = option("--steps");
const outDir = resolve(option("--out") ?? join(root, "tmp", "shots"));
const jobs = Number(option("--jobs") ?? 4);
const quiet = option("--quiet");
const spec = flag("--spec");
const asJson = flag("--json");
const files = args.map((f) => resolve(f));
if (
  !files.length ||
  args.some((a) => a.startsWith("--")) ||
  modes.some((m) => !["light", "dark"].includes(m)) ||
  !["openui", "chat"].includes(library) ||
  !(width > 0 && height > 0 && jobs > 0 && (quiet == null || Number(quiet) >= 0))
) {
  console.error("usage: bun scripts/shot.ts <file.oui>... [--mode light,dark] [--library openui|chat] [--width 1280] [--height 820]");
  console.error("                          [--steps steps.json] [--out dir] [--spec] [--jobs 4] [--quiet 2500] [--json]");
  process.exit(2);
}
const steps: Step[] = stepsPath
  ? (JSON.parse(readFileSync(stepsPath, "utf8")) as Step[]).map((s) =>
      "response" in s ? { ...s, response: resolve(dirname(resolve(stepsPath)), s.response) } : s,
    )
  : [];
// Files that share a name are told apart by their folder's name: modal/form.oui → modal-form.
const names = files.map((f) => basename(f).replace(/\.[^.]*$/, ""));
const stems = files.map((f, i) => (names.indexOf(names[i]!) === names.lastIndexOf(names[i]!) ? names[i]! : `${basename(dirname(f))}-${names[i]}`));
if (new Set(stems).size !== stems.length) throw new Error("two files share a name and a folder name; shoot them in separate runs");

function run(argv: string[]): void {
  const r = Bun.spawnSync(argv, { cwd: root, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`${argv.join(" ")} failed:\n${r.stdout}${r.stderr}`);
}

const began = Date.now();
run(["bun", "scripts/build.ts"]);
const crate = join(root, "tools", "oui-harness");
run(["cargo", "build", "--release", "--quiet", "--manifest-path", join(crate, "Cargo.toml")]);
const binary = join(crate, "target", "release", "oui-harness");
const built = Date.now() - began;

mkdirSync(outDir, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), "oui-harness-"));

const items = modes.flatMap((mode) =>
  files.map((src, i) => {
    const stem = `${stems[i]}-${mode}`;
    return {
      src,
      mode,
      library,
      ...(spec ? { spec: join(outDir, `${stem}.spec.txt`) } : {}),
      steps: [{ shot: join(outDir, `${stem}.png`) }, ...steps.map((s) => ("shot" in s ? { shot: join(outDir, `${stem}-${s.shot}.png`) } : s))],
    };
  }),
);

interface Line {
  type: string;
  src?: string;
  mode?: string;
  [key: string]: unknown;
}

const lines: Line[] = [];
const processes = Math.min(jobs, items.length);
const outcomes = await Promise.all(
  Array.from({ length: processes }, async (_, p) => {
    const job = {
      app: join(root, "harness", "app"),
      fonts: join(root, ".upstream", "assets", "fonts"),
      width,
      height,
      scratch,
      ...(quiet != null ? { quietMs: Number(quiet) } : {}),
      items: items.filter((_, i) => i % processes === p),
    };
    const jobPath = join(scratch, `job-${p}.json`);
    writeFileSync(jobPath, JSON.stringify(job));
    const child = Bun.spawn([binary, jobPath], { stdout: "pipe", stderr: "pipe" });
    const out = await new Response(child.stdout).text();
    const err = await new Response(child.stderr).text();
    for (const text of out.split("\n").filter(Boolean)) {
      try {
        lines.push(JSON.parse(text));
      } catch {
        lines.push({ type: "message", text });
      }
    }
    if (err.trim()) lines.push({ type: "stderr", text: err.trim() });
    return child.exited;
  }),
);
rmSync(scratch, { recursive: true, force: true });

if (asJson) {
  for (const line of lines) console.log(JSON.stringify(line));
} else {
  const rel = (p: unknown) => String(p).replace(`${root}/`, "");
  for (const l of lines.filter((l) => l.type === "settled")) {
    const done = lines.find((d) => d.type === "done" && d.src === l.src && d.mode === l.mode);
    console.log(
      `${rel(l.src)} ${l.mode}: load ${l.loadMs} ms, settled in ${l.settleMs} ms (${l.simulatedMs} ms simulated, ${l.renders} renders)` +
        `${l.timedOut ? " NOT SETTLED" : ""}, total ${done?.ms ?? "?"} ms`,
    );
  }
  for (const l of lines.filter((l) => l.type === "shot")) console.log(`shot   ${rel(l.path)} (${l.ms} ms)`);
  for (const l of lines.filter((l) => l.type === "spec")) console.log(`spec   ${rel(l.path)}`);
  for (const l of lines.filter((l) => l.type === "step")) console.log(`step   ${rel(l.src)} ${l.mode}: ${l.step} (${l.ms} ms${l.timedOut ? ", NOT SETTLED" : ""})`);
  // A warning repeats once per render that triggers it: each distinct line once per file and mode.
  const seen = new Set<string>();
  for (const l of lines.filter((l) => ["action", "clipboard", "errors", "error", "log", "fatal", "message", "stderr"].includes(l.type))) {
    const { type, src, mode, ...rest } = l;
    const text = `${type.padEnd(6)} ${src ? `${rel(src)} ${mode}: ` : ""}${JSON.stringify(rest)}`;
    if (type === "action" || type === "clipboard" || !seen.has(text)) console.log(text);
    seen.add(text);
  }
  console.log(`${items.length} file×mode in ${Date.now() - began} ms (build ${built} ms, ${processes} processes)`);
}

const failed = outcomes.some((code) => code !== 0) || lines.some((l) => ["error", "fatal"].includes(l.type));
process.exit(failed ? 1 : 0);
