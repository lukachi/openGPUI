// Pointer and keyboard input for this checkout's background preview window
// (scripts/preview.ts --keep), through tools/oui-poke (OuiPoke.app).
//
//   bun scripts/poke.ts build                       build and sign ~/Applications/OuiPoke.app
//   bun scripts/poke.ts info
//   bun scripts/poke.ts click <x> <y> [--count n] [--button right] [--cmd]
//   bun scripts/poke.ts hover <x> <y>
//   bun scripts/poke.ts drag <x1> <y1> <x2> <y2> [--steps n]
//   bun scripts/poke.ts scroll <x> <y> <dx> <dy> [--steps n]   (pixels; negative dy reveals what is below)
//   bun scripts/poke.ts key <keycode> [--cmd] [--shift] [--alt] [--ctrl]
//   bun scripts/poke.ts type <text>
//   --px    x/y are pixels of a `herdr-app shot` of the window (divided by its scale)
//
// Coordinates are window points from the window's top-left corner. Events go only to
// the preview window's process (OuiPoke refuses any other): the person's pointer,
// focus and window are untouched. OuiPoke.app needs Accessibility once (System
// Settings > Privacy & Security > Accessibility); it is signed with the
// OUI_POKE_IDENTITY code-signing identity (default: the first "Apple Development"
// one) so the grant survives rebuilds.
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";

const root = join(import.meta.dir, "..");
const src = join(root, "tools", "oui-poke");
const app = join(homedir(), "Applications", "OuiPoke.app");
const checkout = basename(root).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
const home = process.env.OPENGPUI_PREVIEW_HOME ?? join(homedir(), ".config", `herdr-preview-${checkout}`);

function run(argv: string[]): string {
  const proc = Bun.spawnSync(argv, { stdout: "pipe", stderr: "pipe" });
  if (proc.exitCode !== 0) throw new Error(`${argv.join(" ")} failed:\n${proc.stderr.toString()}${proc.stdout.toString()}`);
  return proc.stdout.toString();
}

function build(): void {
  const bin = join(app, "Contents", "MacOS", "oui-poke");
  const newest = Math.max(...["main.swift", "Info.plist"].map((f) => statSync(join(src, f)).mtimeMs));
  if (existsSync(bin) && statSync(bin).mtimeMs > newest) return;
  mkdirSync(join(app, "Contents", "MacOS"), { recursive: true });
  writeFileSync(join(app, "Contents", "Info.plist"), readFileSync(join(src, "Info.plist")));
  run(["xcrun", "swiftc", "-O", "-o", bin, join(src, "main.swift")]);
  const identities = run(["security", "find-identity", "-v", "-p", "codesigning"]);
  const wanted = process.env.OUI_POKE_IDENTITY ?? "Apple Development";
  const line = identities.split("\n").find((l) => l.includes(`"${wanted}`));
  const identity = line?.match(/\b([0-9A-F]{40})\b/)?.[1];
  if (!identity) throw new Error(`no code-signing identity matching "${wanted}" (set OUI_POKE_IDENTITY)`);
  run(["codesign", "--force", "--sign", identity, "--identifier", "dev.opengpui.oui-poke", app]);
  console.log(`built  ${app} (signed by ${line!.split('"')[1]})`);
}

/** The pid of this checkout's preview window: the Herdr process holding its home's socket. */
function previewPid(): number {
  const sock = join(home, "herdr-app.sock");
  const pids = run(["pgrep", "-f", "/Applications/Herdr.app/Contents/MacOS/Herdr"]).trim().split("\n").map(Number);
  for (const pid of pids) {
    const files = Bun.spawnSync(["lsof", "-a", "-p", String(pid), "-Fn"], { stdout: "pipe" }).stdout.toString();
    if (files.includes(sock)) return pid;
  }
  throw new Error(`no preview window for ${home}; open one with: bun scripts/preview.ts <file> --keep`);
}

function poke(pid: number, argv: string[]): string {
  const dir = join(tmpdir(), `oui-poke-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const outFile = join(dir, "out"), errFile = join(dir, "err");
  try {
    // Through LaunchServices, so the Accessibility grant is OuiPoke.app's, not the terminal's.
    const proc = Bun.spawnSync(["open", "-W", "-g", "-n", "--stdout", outFile, "--stderr", errFile, app, "--args", String(pid), ...argv]);
    const err = existsSync(errFile) ? readFileSync(errFile, "utf8").trim() : "";
    if (proc.exitCode !== 0 || err) throw new Error(err || `open exited ${proc.exitCode}`);
    return existsSync(outFile) ? readFileSync(outFile, "utf8").trim() : "";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
const px = args.includes("--px");
if (px) args.splice(args.indexOf("--px"), 1);
const action = args[0];
if (!action) {
  console.error("usage: bun scripts/poke.ts build|info|click|move|drag|scroll|key|type …");
  process.exit(2);
}
build();
if (action === "build") process.exit(0);
const pid = previewPid();
if (px) {
  // A shot is the window at the display's scale.
  const info = JSON.parse(poke(pid, ["info"])) as { width: number };
  const shot = join(tmpdir(), `oui-poke-scale-${process.pid}.png`);
  Bun.spawnSync(["herdr-app", "shot", shot], { env: { ...process.env, HERDR_APP_HOME: home } });
  const width = new DataView(readFileSync(shot).buffer).getUint32(16);
  rmSync(shot, { force: true });
  const scale = width / info.width;
  const coords = action === "drag" ? 4 : ["click", "hover", "down", "up", "scroll"].includes(action) ? 2 : 0;
  for (let i = 1; i <= coords; i++) args[i] = String(Number(args[i]) / scale);
}
const result = poke(pid, args);
if (result) console.log(result);
