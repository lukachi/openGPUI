// Show a .oui file in the running Herdr window with this checkout's build, take
// a screenshot, and close it again. Several checkouts can preview at once: each
// installs its build as its own mod, and a lock keeps the window to one preview
// at a time.
//
//   bun scripts/preview.ts <file.oui> [options]
//     --look openui|herdr   whose colors to draw with (default openui)
//     --library openui|chat
//     --wait <ms>           how long the tab is drawn before the shot (default 1500;
//                           code blocks need ~4000 for highlighting)
//     --out <file.png>      default tmp/preview/<file>-<look>.png
//     --keep                leave the tab open (for a person to click through)
//     --mod <name>          mod folder to install as (default opengpui-<checkout folder>)
//
// It builds first. Fonts come from the installed `opengpui` mod (same family
// names), so `bun run install-herdr` must have run once on this machine.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = join(import.meta.dir, "..");
const herdrHome = process.env.HERDR_APP_HOME ?? join(homedir(), ".config", "herdr-app");
const args = process.argv.slice(2);

function option(name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args[i + 1];
  if (!value) throw new Error(`${name} needs a value`);
  args.splice(i, 2);
  return value;
}
function flag(name: string): boolean {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
}

const look = option("--look") ?? "openui";
const library = option("--library");
const waitMs = Number(option("--wait") ?? 1500);
const outOption = option("--out");
const modName = option("--mod") ?? `opengpui-${basename(root).toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
const keep = flag("--keep");
const fileArg = args.shift();
if (!fileArg || args.length) {
  console.error("usage: bun scripts/preview.ts <file.oui> [--look openui|herdr] [--library name] [--wait ms] [--out file.png] [--keep] [--mod name]");
  process.exit(2);
}
const file = resolve(fileArg);
if (!existsSync(file)) throw new Error(`${file} does not exist`);
if (modName === "opengpui") throw new Error("--mod opengpui is the installed mod; preview under another name");
const stem = basename(file).replace(/\.[^.]*$/, "");
const out = resolve(outOption ?? join(root, "tmp", "preview", `${stem}-${look}.png`));

function run(argv: string[]): string {
  const proc = Bun.spawnSync(argv, { cwd: root, stdout: "pipe", stderr: "pipe" });
  if (proc.exitCode !== 0) throw new Error(`${argv.join(" ")} failed:\n${proc.stderr.toString()}${proc.stdout.toString()}`);
  return proc.stdout.toString();
}
const herdr = (command: string, payload: object) => JSON.parse(run(["herdr-app", "do", command, JSON.stringify(payload)]) || "{}");

// Build and install this checkout's mod under its own name. Asset paths are
// rewritten the way Herdr's mod.clone does.
run(["bun", "scripts/build.ts"]);
const from = join(root, "herdr", "mods", "opengpui");
const to = join(herdrHome, "mods", modName);
mkdirSync(to, { recursive: true });
cpSync(join(from, "mod.json"), join(to, "mod.json"));
writeFileSync(join(to, "main.js"), readFileSync(join(from, "main.js"), "utf8").replaceAll("mods/opengpui/", `mods/${modName}/`));
rmSync(join(to, "icons"), { recursive: true, force: true });
cpSync(join(from, "icons"), join(to, "icons"), { recursive: true });
run(["herdr-app", "check", to]);

// One preview at a time in the shared window. A lock older than two minutes
// belongs to a preview that died.
const lock = join(herdrHome, "opengpui-preview.lock");
const started = Date.now();
for (;;) {
  try {
    mkdirSync(lock);
    break;
  } catch {
    try {
      if (Date.now() - statSync(lock).mtimeMs > 120_000) rmSync(lock, { recursive: true, force: true });
    } catch {}
    if (Date.now() - started > 15 * 60_000) throw new Error(`waited 15 min for ${lock}`);
    await Bun.sleep(500);
  }
}
let tab: string | undefined;
try {
  const before = JSON.parse(run(["herdr-app", "status"])).tab as string | undefined;
  const events = join(herdrHome, "opengpui", "events", `${modName}-${stem}.jsonl`);
  const props = { src: file, events, look, title: `${modName}: ${stem}`, ...(library ? { library } : {}) };
  tab = herdr("tab.new", { name: `${stem} (${modName})`, mod: modName, props }).tab;
  await Bun.sleep(waitMs);
  mkdirSync(join(out, ".."), { recursive: true });
  run(["herdr-app", "shot", out]);
  console.log(`shot   ${out}`);
  if (keep) {
    console.log(`tab    ${tab} left open; close with: herdr-app do tab.close '{"id":"${tab}"}'`);
    console.log(`events ${events}`);
    tab = undefined;
  } else if (before) {
    herdr("tab.select", { id: before });
  }
} finally {
  if (tab) herdr("tab.close", { id: tab });
  rmSync(lock, { recursive: true, force: true });
}
