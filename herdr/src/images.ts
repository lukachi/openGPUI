// Herdr's image loader: OpenUI image `src`s become files under the Herdr home,
// which is the asset root gpui's `image()` resolves against.
//
//   https:// http://   downloaded with curl (the mod `fetch` reads only text),
//                      cached by URL: opengpui/images/<sha256(url)>.<ext>
//   data:              decoded, cached by URI the same way
//   file://, /abs, ~/, relative (to the .oui file's folder)
//                      only under $HOME; copied in, cached by content hash
//
// Intrinsic sizes come from the file header (src/render/imageHeader.ts). The
// cache keeps an index (index.json: file, size, bytes, last use) and stays
// under CACHE_BYTES, dropping the least recently used files first.
import { Buffer } from "buffer";
import { createHash } from "crypto";
import { exists, mkdir, readFile, unlink, writeFile } from "fs/promises";
import { appHome, exec, home } from "herdr";
import { join, resolve } from "path";
import { readImageHeader, type ImageLoader, type LoadedImage } from "../../src/index.ts";

/** Asset path of the cache folder, relative to the Herdr home. */
const CACHE = "opengpui/images";
const CACHE_BYTES = 256 * 1024 * 1024;
/** One image at most; curl refuses larger downloads. */
const MAX_BYTES = 25 * 1024 * 1024;
/** Downloads at once; the rest wait. */
const PARALLEL = 4;

interface Entry {
  file: string;
  width: number;
  height: number;
  bytes: number;
  used: number;
}

const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex") as string;

/** What `image()` draws for a cache entry. */
const asset = (e: Entry): LoadedImage => ({ path: `${CACHE}/${e.file}`, width: e.width, height: e.height });

/** One cache per mod instance: several panes share it and its index. */
class ImageCache {
  private readonly dir = join(appHome(), CACHE);
  private index: Promise<Map<string, Entry>> | null = null;
  private readonly pending = new Map<string, Promise<LoadedImage>>();
  private running = 0;
  private readonly queue: (() => void)[] = [];

  private entries(): Promise<Map<string, Entry>> {
    this.index ??= (async () => {
      await mkdir(this.dir, { recursive: true });
      try {
        return new Map(Object.entries(JSON.parse(await readFile(join(this.dir, "index.json"), "utf8")) as Record<string, Entry>));
      } catch {
        return new Map<string, Entry>();
      }
    })();
    return this.index;
  }

  load(src: string, base: string | null): Promise<LoadedImage> {
    const key = `${base ?? ""}\u0000${src}`;
    let job = this.pending.get(key);
    if (!job) {
      job = this.fetch(src.trim(), base).finally(() => this.pending.delete(key));
      this.pending.set(key, job);
    }
    return job;
  }

  private async fetch(src: string, base: string | null): Promise<LoadedImage> {
    const index = await this.entries();
    if (/^https?:\/\//i.test(src) || /^data:/i.test(src)) {
      const key = sha256(src);
      const hit = index.get(key);
      if (hit && (await exists(join(this.dir, hit.file)))) {
        hit.used = Date.now();
        await this.save(index);
        return asset(hit);
      }
      return this.store(key, /^data:/i.test(src) ? dataUri(src) : await this.download(src, key));
    }
    const bytes = await readFile(localPath(src, base));
    return this.store(sha256(bytes), bytes);
  }

  private async download(url: string, key: string): Promise<Uint8Array> {
    if (this.running >= PARALLEL) await new Promise<void>((go) => this.queue.push(go));
    this.running++;
    const part = join(this.dir, `${key}.part`);
    try {
      const r = await exec("curl", [
        "--fail", "--silent", "--show-error", "--location",
        "--max-time", "25",
        "--max-filesize", String(MAX_BYTES),
        "--user-agent", "opengpui (+https://github.com/lukachi/openGPUI)",
        "--output", part,
        url,
      ]);
      if (r.code !== 0) throw new Error(r.stderr.trim() || `curl exited with ${r.code}`);
      return await readFile(part);
    } finally {
      await unlink(part).catch(() => {});
      this.running--;
      this.queue.shift()?.();
    }
  }

  private async store(key: string, bytes: Uint8Array): Promise<LoadedImage> {
    if (bytes.length > MAX_BYTES) throw new Error(`image is larger than ${MAX_BYTES} bytes`);
    const header = readImageHeader(bytes);
    if (!header) throw new Error("not an image gpui can draw (png, jpeg, gif, webp, bmp, svg)");
    const index = await this.entries();
    const entry: Entry = { file: `${key}.${header.ext}`, width: header.width, height: header.height, bytes: bytes.length, used: Date.now() };
    const path = join(this.dir, entry.file);
    if (!index.has(key) || !(await exists(path))) await writeFile(path, bytes);
    index.set(key, entry);
    await this.prune(index, key);
    return asset(entry);
  }

  /** Least recently used files go until the cache is under its limit; `keep` (just stored) stays. */
  private async prune(index: Map<string, Entry>, keep: string): Promise<void> {
    let total = [...index.values()].reduce((sum, e) => sum + e.bytes, 0);
    const oldest = [...index.entries()].filter(([k]) => k !== keep).sort((a, b) => a[1].used - b[1].used);
    for (const [k, e] of oldest) {
      if (total <= CACHE_BYTES) break;
      await unlink(join(this.dir, e.file)).catch(() => {});
      index.delete(k);
      total -= e.bytes;
    }
    await this.save(index);
  }

  private async save(index: Map<string, Entry>): Promise<void> {
    await writeFile(join(this.dir, "index.json"), JSON.stringify(Object.fromEntries(index)));
  }
}

/** `data:[<type>][;base64],<data>` → bytes. */
function dataUri(src: string): Uint8Array {
  const comma = src.indexOf(",");
  if (comma < 0) throw new Error("malformed data: URI");
  const meta = src.slice(5, comma);
  const data = src.slice(comma + 1);
  return /;base64$/i.test(meta) ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data), "utf8");
}

/** A local `src` as an absolute path; only files under the home folder are served. */
function localPath(src: string, base: string | null): string {
  const raw = /^file:\/\//i.test(src) ? decodeURIComponent(src.slice(7)) : src;
  const homeDir = home();
  const path = raw.startsWith("~/") ? join(homeDir, raw.slice(2)) : raw.startsWith("/") ? resolve(raw) : base ? resolve(base, raw) : null;
  if (!path) throw new Error(`relative image path without a base folder: ${src}`);
  if (!path.startsWith(`${homeDir}/`)) throw new Error(`local images must be under ${homeDir}: ${src}`);
  return path;
}

let shared: ImageCache | null = null;

/** The Surface `images` option for a view whose relative `src`s resolve against `base` (the .oui file's folder). */
export function herdrImages(base: string | null): ImageLoader {
  return (src) => (shared ??= new ImageCache()).load(src, base);
}
