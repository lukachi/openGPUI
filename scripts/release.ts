// Assemble a release from the build (bun run build first; `bun run release` does both):
//   gallery/opengpui/mods/opengpui/   the mod as herdr.dev's gallery serves it: an agent adding
//                                     herdr.dev/mods/lukachi/opengpui copies this folder
//   dist/opengpui-v<version>.tar.gz   the same folder for GitHub Releases:
//                                     tar -xzf opengpui-v<version>.tar.gz -C ~/.config/herdr-app/mods
// gallery/opengpui/RECIPE.md and preview.png are written by hand and kept as they are.
import { $ } from "bun";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const { version } = (await Bun.file(join(root, "package.json")).json()) as { version: string };
const built = join(root, "herdr", "mods", "opengpui");
const gallery = join(root, "gallery", "opengpui");
const mod = join(gallery, "mods", "opengpui");

const parts = ["mod.json", "main.js", "shared.js", "fonts", "cli"];
for (const part of parts) if (!existsSync(join(built, part))) throw new Error(`herdr/mods/opengpui/${part} is missing: bun run build first`);
for (const file of ["RECIPE.md", "preview.png"]) if (!existsSync(join(gallery, file))) throw new Error(`gallery/opengpui/${file} is missing`);

rmSync(mod, { recursive: true, force: true });
mkdirSync(mod, { recursive: true });
for (const part of parts) cpSync(join(built, part), join(mod, part), { recursive: true });
// openGPUI's license, OpenUI's, and lucide's (its icons are in shared.js); Inter's travels in fonts/.
mkdirSync(join(mod, "licenses"));
cpSync(join(root, "LICENSE"), join(mod, "licenses", "opengpui.txt"));
for (const name of ["openui", "lucide"]) cpSync(join(root, "licenses", `${name}.txt`), join(mod, "licenses", `${name}.txt`));
console.log(`gallery  ${mod}`);

const tarball = join(root, "dist", `opengpui-v${version}.tar.gz`);
mkdirSync(join(root, "dist"), { recursive: true });
// --no-xattrs/COPYFILE_DISABLE: no macOS metadata files in the archive.
await $`tar --no-xattrs -czf ${tarball} -C ${join(gallery, "mods")} opengpui`.env({ ...process.env, COPYFILE_DISABLE: "1" });
console.log(`tarball  ${tarball}`);
