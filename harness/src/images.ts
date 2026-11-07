// The harness's image loader and icon writer. Shots must not depend on the network, so
// only local files and data: URIs load; http(s) images fail the way an offline Herdr
// pane's would. `image()` and `svg()` get absolute paths, which the harness's asset
// source serves from disk; icons are written to the scratch folder, as Herdr writes
// them under its home.
//
//   file://, /abs, ~/, relative (to the .oui file's folder)   read in place
//   data:                     decoded into the harness's scratch folder
import { Buffer } from "buffer";
import { createHash } from "crypto";
import { exists, mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { readImageHeader, type IconWriter, type ImageLoader, type LoadedImage } from "../../src/index.ts";

/** The Surface `icons` option: each icon's SVG goes into `scratch`/icons, which parallel harness processes share. */
export function harnessIcons(scratch: string): IconWriter {
  return async (name, svg) => {
    const path = join(scratch, "icons", `${name}.svg`);
    if (await exists(path)) return path;
    await mkdir(join(scratch, "icons"), { recursive: true });
    // Another process writing the same icon at once can make this write fail after its own landed.
    await writeFile(path, svg).catch(async (e) => {
      if (!(await exists(path))) throw e;
    });
    return path;
  };
}

function sized(path: string, bytes: Uint8Array, src: string): LoadedImage {
  const header = readImageHeader(bytes);
  if (!header) throw new Error(`not an image gpui draws: ${src}`);
  return { path, width: header.width, height: header.height };
}

/** `data:[<type>][;base64],<data>` → bytes. */
function dataUri(src: string): Uint8Array {
  const comma = src.indexOf(",");
  if (comma < 0) throw new Error("malformed data: URI");
  const meta = src.slice(5, comma);
  const data = src.slice(comma + 1);
  return /;base64$/i.test(meta) ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data), "utf8");
}

/** The Surface `images` option: relative `src`s resolve against `base`, `~/` against `home`; data: URIs land in `scratch`. */
export function harnessImages(base: string, home: string, scratch: string): ImageLoader {
  return async (raw) => {
    const src = raw.trim();
    if (/^https?:\/\//i.test(src)) throw new Error(`the harness does not fetch remote images: ${src}`);
    if (src.startsWith("//")) throw new Error(`protocol-relative URL without a page to resolve it: ${src}`);
    if (/^data:/i.test(src)) {
      const bytes = dataUri(src);
      const path = join(scratch, createHash("sha256").update(src).digest("hex") as string);
      await mkdir(scratch, { recursive: true });
      await writeFile(path, bytes);
      return sized(path, bytes, src.slice(0, 40));
    }
    const local = /^file:\/\//i.test(src) ? decodeURIComponent(src.slice(7)) : src;
    const path = local.startsWith("~/") ? join(home, local.slice(2)) : resolve(base, local);
    return sized(path, await readFile(path), src);
  };
}
