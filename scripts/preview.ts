// Show .oui files with this checkout's build in a Herdr window of its own, take a
// screenshot of each, and close them again. For the Herdr integration only (props,
// events file, hc replies, --look herdr, pane chrome); to look at UI, use
// scripts/shot.ts, which draws offscreen without Herdr.
//
//   bun scripts/preview.ts <file.oui>... [options]
//     --look openui|herdr   whose colors to draw with (default openui)
//     --mode light|dark     the window's appearance; `light,dark` shoots both (default light)
//     --library openui|chat
//     --wait <ms>           the longest a tab may take to settle before its shot (default 15000)
//     --settle <ms>         without an idle signal (a build that writes none): how long the window
//                           must stay unchanged to count as settled (default 3000: code
//                           highlighting starts ~2 s after a window loads the mod)
//     --out <file.png>      one file and one mode only; default tmp/preview/<file>-<look>-<mode>.png
//     --keep                leave the tab open (for a person to click through); one file and mode
//     --mod <name>          mod folder to install as (default opengpui-<checkout folder>)
//
// Previews never touch the person's window. Each checkout gets a Herdr window of its
// own (home ~/.config/herdr-preview-<checkout>, or OPENGPUI_PREVIEW_HOME, and its own
// herdr-core session), started in the background on first use, so worktrees never
// wait for each other. A lock keeps two previews of the same checkout apart.
//
// A shot is taken once the tab reports itself idle (opengpui/status/<name>.json: no
// parse, highlight, image load or view left to draw) and the report stood for
// IDLE_SETTLE_MS, which covers layout's own redraws (measuring). A build that reports
// nothing is shot once the window has stopped changing for --settle ms instead.
//
// Herdr keeps every mod build it loads in its JS heap, so after a few builds a window
// fails mod loads with "out of memory"; the window is therefore restarted every
// RESTART_EVERY tabs, and when the appearance changes (it applies only at start).
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

const RESTART_EVERY = 2;
const SHOT_EVERY_MS = 250;
const pokeApp = join(homedir(), "Applications", "OuiPoke.app");
let nudgeAt: [number, number] | null | undefined;
/** How long an idle report must stand before the shot: redraws from measuring (on_size_change) settle in it. */
const IDLE_SETTLE_MS = 300;
/** How long a tab has to write its first status before the shot falls back to pixel settling. */
const STATUS_MS = 5000;
const STATUS_POLL_MS = 50;

const root = join(import.meta.dir, "..");
const checkout = basename(root).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
const home = process.env.OPENGPUI_PREVIEW_HOME ?? join(homedir(), ".config", `herdr-preview-${checkout}`);
// herdr-core's socket path has to fit in 103 bytes, so the session name stays short.
const session = `opv-${createHash("sha1").update(home).digest("hex").slice(0, 8)}`;
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
const modes = (option("--mode") ?? "light").split(",");
const library = option("--library");
const waitMs = Number(option("--wait") ?? 15_000);
const settleMs = Number(option("--settle") ?? 3000);
const outOption = option("--out");
const modName = option("--mod") ?? `opengpui-${checkout}`;
const keep = flag("--keep");
const files = args.map((f) => resolve(f));
const single = files.length === 1 && modes.length === 1;
if (!files.length || modes.some((m) => !["light", "dark"].includes(m)) || ((outOption || keep) && !single)) {
  console.error(
    "usage: bun scripts/preview.ts <file.oui>... [--look openui|herdr] [--mode light|dark|light,dark] [--library name] [--wait ms] [--settle ms] [--out file.png] [--keep] [--mod name]\n" +
      "       --out and --keep take one file and one mode",
  );
  process.exit(2);
}
for (const file of files) if (!existsSync(file)) throw new Error(`${file} does not exist`);
if (modName === "opengpui") throw new Error("--mod opengpui is the font carrier; preview under another name");

const env = { ...process.env, HERDR_APP_HOME: home };
function run(argv: string[]): string {
  const proc = Bun.spawnSync(argv, { cwd: root, env, stdout: "pipe", stderr: "pipe" });
  if (proc.exitCode !== 0) throw new Error(`${argv.join(" ")} failed:\n${proc.stderr.toString()}${proc.stdout.toString()}`);
  return proc.stdout.toString();
}
function tryRun(argv: string[]): string | null {
  const proc = Bun.spawnSync(argv, { cwd: root, env, stdout: "pipe", stderr: "pipe" });
  return proc.exitCode === 0 ? proc.stdout.toString() : null;
}
const herdr = (command: string, payload: object) => JSON.parse(run(["herdr-app", "do", command, JSON.stringify(payload)]) || "{}");
const status = () => {
  const text = tryRun(["herdr-app", "status"]);
  return text ? (JSON.parse(text) as { tab?: string; errors?: unknown[] }) : null;
};

run(["bun", "scripts/build.ts"]);
const from = join(root, "herdr", "mods", "opengpui");
mkdirSync(join(home, "mods"), { recursive: true });

// One preview of this checkout at a time. A lock older than three minutes belongs to a
// preview that died.
const lock = join(home, "opengpui-preview.lock");
const started = Date.now();
for (;;) {
  try {
    mkdirSync(lock);
    break;
  } catch {
    try {
      if (Date.now() - statSync(lock).mtimeMs > 180_000) rmSync(lock, { recursive: true, force: true });
    } catch {}
    if (Date.now() - started > 20 * 60_000) throw new Error(`waited 20 min for ${lock}`);
    await Bun.sleep(500);
  }
}

const to = join(home, "mods", modName);
const countPath = join(home, "opengpui-previews");
let tab: string | undefined;
try {
  // The fonts: any mod's fonts/ load for the whole window, so a copy of the plain
  // mod carries them (family names are the same in every build).
  const carrier = join(home, "mods", "opengpui");
  if (!existsSync(join(carrier, "fonts"))) {
    rmSync(carrier, { recursive: true, force: true });
    cpSync(from, carrier, { recursive: true });
  }
  // Install this build as its own mod, asset paths rewritten as Herdr's mod.clone does.
  mkdirSync(to, { recursive: true });
  cpSync(join(from, "mod.json"), join(to, "mod.json"));
  writeFileSync(join(to, "main.js"), readFileSync(join(from, "main.js"), "utf8").replaceAll("mods/opengpui/", `mods/${modName}/`));
  rmSync(join(to, "icons"), { recursive: true, force: true });
  cpSync(join(from, "icons"), join(to, "icons"), { recursive: true });
  run(["herdr-app", "check", to]);

  for (const mode of modes) {
    for (const file of files) {
      await ensureWindow(mode);
      const stem = basename(file).replace(/\.[^.]*$/, "");
      const out = resolve(outOption ?? join(root, "tmp", "preview", `${stem}-${look}-${mode}.png`));
      const events = join(home, "opengpui", "events", `${modName}-${stem}.jsonl`);
      // The host writes its idle state next to the events, under the events file's name.
      const statusPath = join(home, "opengpui", "status", `${modName}-${stem}.json`);
      rmSync(statusPath, { force: true });
      const props = { src: file, events, look, title: `${modName}: ${stem}`, ...(library ? { library } : {}) };
      tab = herdr("tab.new", { name: `${stem} (${modName})`, mod: modName, props }).tab;
      writeFileSync(countPath, String(count() + 1));
      mkdirSync(join(out, ".."), { recursive: true });
      const took = await shootSettled(out, statusPath);
      console.log(`shot   ${out} (${took})`);
      const errors = status()?.errors ?? [];
      if (errors.length) console.log(`errors ${JSON.stringify(errors)}`);
      if (keep) {
        console.log(`tab    left open in the preview window (HERDR_APP_HOME=${home})`);
        console.log(`       close: HERDR_APP_HOME=${home} herdr-app do tab.close '{"id":"${tab}"}'`);
        console.log(`events ${events}`);
        tab = undefined;
      } else {
        tryRun(["herdr-app", "do", "tab.close", JSON.stringify({ id: tab })]);
        tab = undefined;
      }
    }
  }
} finally {
  if (tab) tryRun(["herdr-app", "do", "tab.close", JSON.stringify({ id: tab })]);
  if (!keep) rmSync(to, { recursive: true, force: true });
  rmSync(lock, { recursive: true, force: true });
}

function count(): number {
  return existsSync(countPath) ? Number(readFileSync(countPath, "utf8")) || 0 : 0;
}

/** The tab's status report, and whether it says idle (a report caught mid-write says nothing). */
function readStatus(path: string): { text: string; idle: boolean } | null {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  try {
    return { text, idle: (JSON.parse(text) as { idle?: boolean }).idle === true };
  } catch {
    return { text, idle: false };
  }
}

/**
 * gpui stops drawing a window that is fully covered (its display link follows the
 * occlusion state), and a background preview window usually is: its last frame then
 * stays in `herdr-app shot` while the view changes underneath (seen: "Loading…" for
 * 10 s over a page that had long drawn), and its views don't render, so the surface
 * never turns idle. A click makes gpui draw a frame; a hover or a key does not. So
 * while waiting and before each shot this clicks the status bar's empty middle through
 * scripts/poke.ts (OuiPoke.app, which needs Accessibility). Without OuiPoke a covered
 * window's shots may be stale.
 */
function nudge(): void {
  if (nudgeAt === null || !existsSync(pokeApp)) return;
  const poke = (argv: string[]) =>
    Bun.spawnSync(["bun", join(root, "scripts", "poke.ts"), ...argv], {
      env: { ...process.env, OPENGPUI_PREVIEW_HOME: home },
      stdout: "pipe",
      stderr: "pipe",
    });
  if (nudgeAt === undefined) {
    const info = poke(["info"]);
    if (info.exitCode !== 0) {
      nudgeAt = null;
      console.log(`note   no poke (${info.stderr.toString().trim().split("\n").pop()}); shots of a covered window may be stale`);
      return;
    }
    const { width, height } = JSON.parse(info.stdout.toString()) as { width: number; height: number };
    nudgeAt = [Math.round(width * 0.6), height - 8];
  }
  poke(["click", String(nudgeAt[0]), String(nudgeAt[1])]);
}

/**
 * Shoots once the tab's idle report has stood for IDLE_SETTLE_MS and still stands after the
 * shot; without any report within STATUS_MS, once the window has looked the same for settleMs.
 * Gives up after waitMs, keeping the last shot.
 */
async function shootSettled(out: string, statusPath: string): Promise<string> {
  const begin = Date.now();
  let nudged = 0;
  while (Date.now() - begin < waitMs) {
    if (Date.now() - nudged >= SHOT_EVERY_MS) {
      nudge();
      nudged = Date.now();
    }
    const report = readStatus(statusPath);
    if (report === null) {
      if (Date.now() - begin >= STATUS_MS) return shootUnchanged(out, begin);
    } else if (report.idle) {
      await Bun.sleep(IDLE_SETTLE_MS);
      nudge();
      if (readStatus(statusPath)?.text !== report.text) continue;
      run(["herdr-app", "shot", out]);
      if (readStatus(statusPath)?.text === report.text) return `idle after ${Date.now() - begin} ms`;
      continue;
    }
    await Bun.sleep(STATUS_POLL_MS);
  }
  nudge();
  run(["herdr-app", "shot", out]);
  return `not idle after ${waitMs} ms`;
}

/** Shoots until the window has looked the same for settleMs (or waitMs passed); keeps the last shot. */
async function shootUnchanged(out: string, begin: number): Promise<string> {
  let last = "";
  let sameSince = Date.now();
  for (;;) {
    nudge();
    run(["herdr-app", "shot", out]);
    const hash = createHash("sha1").update(readFileSync(out)).digest("hex");
    const now = Date.now();
    if (hash !== last) {
      last = hash;
      sameSince = now;
    } else if (now - sameSince >= settleMs) {
      return `settled after ${now - begin} ms (no idle signal)`;
    }
    if (now - begin >= waitMs) return `still changing after ${waitMs} ms (no idle signal)`;
    await Bun.sleep(SHOT_EVERY_MS);
  }
}

/** A running window with this appearance and room for another tab. */
async function ensureWindow(mode: string): Promise<void> {
  const settingsPath = join(home, "settings.json");
  const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, "utf8")) : {};
  const appearanceChanged = settings.appearance !== mode;
  if (appearanceChanged || settings.sounds?.enabled !== false) {
    writeFileSync(settingsPath, JSON.stringify({ ...settings, appearance: mode, sounds: { enabled: false } }, null, 2) + "\n");
  }
  if (status() && (count() >= RESTART_EVERY || appearanceChanged)) await stopWindow();
  if (!status()) {
    await startWindow();
    writeFileSync(countPath, "0");
  }
}

async function startWindow(): Promise<void> {
  // A fresh home opens with the welcome and "What's new" over everything; mark both
  // seen, as finishing them would.
  const sharedPath = join(home, "shared.json");
  const shared = existsSync(sharedPath) ? JSON.parse(readFileSync(sharedPath, "utf8")) : {};
  if (shared["frame.welcomed"] !== "finished") {
    writeFileSync(sharedPath, JSON.stringify({ ...shared, "frame.welcomed": "finished" }, null, 2) + "\n");
  }
  const notesPath = join(home, "update-notes.json");
  if (!existsSync(notesPath)) {
    const plist = readFileSync("/Applications/Herdr.app/Contents/Info.plist", "utf8");
    const version = plist.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
    if (version) writeFileSync(notesPath, JSON.stringify({ last_run: version, presented: [version] }) + "\n");
  }
  // -n: a second instance beside the person's; -g: in the background, without focus.
  // HC_SESSION gives it its own herdr-core, so its spaces and tabs never show up in
  // the person's window.
  run(["open", "-n", "-g", "-a", "Herdr", "--env", `HERDR_APP_HOME=${home}`, "--env", `HC_SESSION=${session}`]);
  const deadline = Date.now() + 30_000;
  while (!status()) {
    if (Date.now() > deadline) throw new Error(`the preview window (HERDR_APP_HOME=${home}) did not start`);
    await Bun.sleep(300);
  }
  const spaces = JSON.parse(run(["herdr-app", "ls"])).spaces as unknown[];
  if (!spaces.length) herdr("space.new", { name: "previews", folder: root });
}

async function stopWindow(): Promise<void> {
  tryRun(["herdr-app", "do", "app.quit", "{}"]);
  const deadline = Date.now() + 15_000;
  while (status()) {
    if (Date.now() > deadline) throw new Error("the preview window did not quit");
    await Bun.sleep(300);
  }
  await Bun.sleep(500);
}
