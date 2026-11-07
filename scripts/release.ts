// The mod as people get it, from the build (bun run build first; `bun run release` does both):
//   gallery/opengpui/mods/opengpui/   the folder herdr.dev's gallery serves: an agent adding
//                                     herdr.dev/mods/lukachi/opengpui copies it into its mods/
//   dist/opengpui-v<version>.tar.gz   the same folder for GitHub Releases:
//                                     tar -xzf opengpui-v<version>.tar.gz -C ~/.config/herdr-app/mods
// gallery/opengpui/RECIPE.md and preview.png are written by hand and kept as they are.
// scripts/install.ts installs the same folder into a Herdr home (assembleMod).
import { $ } from "bun";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const built = join(root, "herdr", "mods", "opengpui");

/**
 * Write the mod into `to`: what the build made, and the licenses. Files are overwritten and
 * folders replaced; shared.js lands before main.js, which Herdr reloads on and which imports it.
 */
export function assembleMod(to: string): void {
  const parts = ["mod.json", "shared.js", "main.js", "fonts", "cli"];
  for (const part of parts) if (!existsSync(join(built, part))) throw new Error(`herdr/mods/opengpui/${part} is missing: bun run build first`);
  mkdirSync(to, { recursive: true });
  for (const part of parts) {
    if (!part.includes(".")) rmSync(join(to, part), { recursive: true, force: true });
    cpSync(join(built, part), join(to, part), { recursive: true });
  }
  // openGPUI's license, OpenUI's, lucide's (its icons are in shared.js) and elkjs's (in the CLI);
  // Inter's travels in fonts/.
  rmSync(join(to, "licenses"), { recursive: true, force: true });
  mkdirSync(join(to, "licenses"));
  cpSync(join(root, "LICENSE"), join(to, "licenses", "opengpui.txt"));
  for (const name of ["openui", "lucide", "elkjs"]) cpSync(join(root, "licenses", `${name}.txt`), join(to, "licenses", `${name}.txt`));
}

if (import.meta.main) {
  const { version } = (await Bun.file(join(root, "package.json")).json()) as { version: string };
  const gallery = join(root, "gallery", "opengpui");
  for (const file of ["RECIPE.md", "preview.png"]) if (!existsSync(join(gallery, file))) throw new Error(`gallery/opengpui/${file} is missing`);
  const mod = join(gallery, "mods", "opengpui");
  rmSync(mod, { recursive: true, force: true });
  assembleMod(mod);
  console.log(`gallery  ${mod}`);

  const tarball = join(root, "dist", `opengpui-v${version}.tar.gz`);
  mkdirSync(join(root, "dist"), { recursive: true });
  // --no-xattrs/COPYFILE_DISABLE: no macOS metadata files in the archive.
  await $`tar --no-xattrs -czf ${tarball} -C ${join(gallery, "mods")} opengpui`.env({ ...process.env, COPYFILE_DISABLE: "1" });
  console.log(`tarball  ${tarball}`);
}
