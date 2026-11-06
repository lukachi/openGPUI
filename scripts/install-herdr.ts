// Install the built mod into Herdr and put the `opengpui` CLI on PATH.
//   bun run build && bun scripts/install-herdr.ts
// Herdr hot-reloads the mod in place; open surfaces pick up the new build.
import { copyFileSync, existsSync, lstatSync, mkdirSync, symlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const herdrHome = process.env.HERDR_APP_HOME ?? join(homedir(), ".config", "herdr-app");
const from = join(root, "herdr", "mods", "opengpui");
const to = join(herdrHome, "mods", "opengpui");

if (!existsSync(join(from, "main.js"))) throw new Error("herdr/mods/opengpui/main.js is missing: bun run build first");
mkdirSync(to, { recursive: true });
for (const file of ["mod.json", "main.js"]) copyFileSync(join(from, file), join(to, file));
console.log(`mod      -> ${to}`);

const binDir = process.env.OPENGPUI_BIN_DIR ?? join(homedir(), ".local", "bin");
const link = join(binDir, "opengpui");
mkdirSync(binDir, { recursive: true });
if (existsSync(link) || isSymlink(link)) unlinkSync(link);
symlinkSync(join(root, "bin", "opengpui"), link);
console.log(`opengpui -> ${link}`);

function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}
