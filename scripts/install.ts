// Install the mod into Herdr and put its `opengpui` CLI on PATH, as a person who adds the mod
// from herdr.dev does: the same folder scripts/release.ts assembles for the gallery.
//   bun run install-herdr          (build, then this)
// Herdr hot-reloads the mod in place; open surfaces pick up the new build.
// Herdr loads a mod's fonts at start and on a look change, so new fonts are
// followed by a switch to the layout already showing. gpui keeps the faces it
// first found for a family, so changed cuts of fonts already loaded need a restart.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { assembleMod } from "./release.ts";

const root = join(import.meta.dir, "..");
const herdrHome = process.env.HERDR_APP_HOME ?? join(homedir(), ".config", "herdr-app");
const to = join(herdrHome, "mods", "opengpui");

const builtFonts = join(root, "herdr", "mods", "opengpui", "fonts");
const hadFonts = existsSync(join(to, "fonts")) && readdirSync(join(to, "fonts")).some((f) => f.endsWith(".ttf"));
const fontsChanged = existsSync(builtFonts) && !sameFiles(builtFonts, join(to, "fonts"));
assembleMod(to);
rmSync(join(to, "icons"), { recursive: true, force: true }); // from builds before icons travelled in shared.js
console.log(`mod      -> ${to}`);

if (fontsChanged) {
  const shared = join(herdrHome, "shared.json");
  const layout = existsSync(shared) ? (JSON.parse(readFileSync(shared, "utf8")).layout ?? "main") : "main";
  const proc = Bun.spawnSync(["herdr-app", "do", "layout.switch", JSON.stringify({ name: layout })], { stdout: "ignore", stderr: "pipe" });
  if (proc.exitCode !== 0) console.log("fonts    copied; restart Herdr to load them");
  else if (hadFonts) console.log("fonts    changed; restart Herdr: it keeps the faces it already loaded");
  else console.log(`fonts    loaded (look of "${layout}" reloaded)`);
}

const binDir = process.env.OPENGPUI_BIN_DIR ?? join(homedir(), ".local", "bin");
const link = join(binDir, "opengpui");
mkdirSync(binDir, { recursive: true });
if (existsSync(link) || isSymlink(link)) unlinkSync(link);
symlinkSync(join(to, "cli", "opengpui"), link);
console.log(`opengpui -> ${link}`);

function sameFiles(a: string, b: string): boolean {
  if (!existsSync(b)) return false;
  const names = readdirSync(a).sort();
  if (names.join("\n") !== readdirSync(b).sort().join("\n")) return false;
  return names.every((name) => readFileSync(join(a, name)).equals(readFileSync(join(b, name))));
}

function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}
