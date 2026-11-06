// Herdr's image loader: OpenUI image `src`s become files under the Herdr home,
// which is the asset root gpui's `image()` resolves against.
//
//   https:// http://   downloaded with curl (the mod `fetch` reads only text),
//                      cached by URL: opengpui/images/<sha256(url)>.<ext>
//   data:              decoded, cached by URI the same way
//   file://, /abs, ~/, relative (to the .oui file's folder)
//                      only files whose real path (symlinks resolved) is under
//                      $HOME; copied in, cached by content hash
//   //host/…           rejected: a protocol-relative URL has no page to take a scheme from
//
// Concurrent loads of one image share a job keyed by its cache key (the URL's
// hash, or the local file's real path). Intrinsic sizes come from the file
// header (src/render/imageHeader.ts). The cache keeps an index (index.json:
// file, size, bytes, last use), written by one save at a time, and stays under
// CACHE_BYTES, dropping the least recently used files first. Once per mod run,
// files the index doesn't list (a lost or torn index, a crash mid-download,
// another mod instance's entries) are deleted after an hour.
import { Buffer } from "buffer";
import { createHash } from "crypto";
import { exists, mkdir, readFile, readdir, unlink, writeFile } from "fs/promises";
import { appHome, exec, home } from "herdr";
import { join, resolve } from "path";
import { readImageHeader, type ImageLoader, type LoadedImage } from "../../src/index.ts";

/** Asset path of the cache folder, relative to the Herdr home. */
const CACHE = "opengpui/images";
const CACHE_BYTES = 256 * 1024 * 1024;
/** One image at most; curl refuses larger downloads, larger local files are refused before reading. */
const MAX_BYTES = 25 * 1024 * 1024;
/** Downloads at once; the rest wait. */
const PARALLEL = 4;
/** Unlisted files younger than this may belong to another instance's download in progress. */
const ORPHAN_MINUTES = 60;

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
  private saving: Promise<void> = Promise.resolve();
  private saveQueued = false;

  private entries(): Promise<Map<string, Entry>> {
    this.index ??= (async () => {
      await mkdir(this.dir, { recursive: true });
      let index: Map<string, Entry>;
      try {
        index = new Map(Object.entries(JSON.parse(await readFile(join(this.dir, "index.json"), "utf8")) as Record<string, Entry>));
      } catch {
        index = new Map();
      }
      await this.reconcile(index);
      return index;
    })();
    return this.index;
  }

  /** Drop entries whose file is gone; delete old files nothing lists (and stale `.part`s). */
  private async reconcile(index: Map<string, Entry>): Promise<void> {
    const files = new Set(await readdir(this.dir).catch(() => [] as string[]));
    for (const [key, e] of index) if (!files.has(e.file)) index.delete(key);
    const listed = new Set([...index.values()].map((e) => e.file));
    const old = await exec("find", [this.dir, "-maxdepth", "1", "-type", "f", "-mmin", `+${ORPHAN_MINUTES}`]).catch(() => null);
    for (const path of old?.code === 0 ? old.stdout.split("\n").filter(Boolean) : []) {
      const name = path.slice(path.lastIndexOf("/") + 1);
      if (name !== "index.json" && !listed.has(name)) await unlink(path).catch(() => {});
    }
  }

  load(src: string, base: string | null): Promise<LoadedImage> {
    const trimmed = src.trim();
    if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
      const key = sha256(trimmed);
      return this.once(key, () => this.remote(trimmed, key));
    }
    return this.local(trimmed, base);
  }

  /** One job per cache key at a time. */
  private once(key: string, run: () => Promise<LoadedImage>): Promise<LoadedImage> {
    let job = this.pending.get(key);
    if (!job) {
      job = run().finally(() => this.pending.delete(key));
      this.pending.set(key, job);
    }
    return job;
  }

  private async remote(src: string, key: string): Promise<LoadedImage> {
    const index = await this.entries();
    const hit = index.get(key);
    if (hit && (await exists(join(this.dir, hit.file)))) {
      hit.used = Date.now();
      this.save();
      return asset(hit);
    }
    return this.store(key, /^data:/i.test(src) ? dataUri(src) : await this.download(src, key));
  }

  private async local(src: string, base: string | null): Promise<LoadedImage> {
    const path = localPath(src, base);
    // Real paths (symlinks resolved, $HOME's own included) decide the $HOME rule; the size is checked before reading.
    const r = await exec("/bin/sh", ["-c", 'realpath -- "$1" && realpath -- "$2" && wc -c < "$1"', "sh", path, home()]);
    const [real, homeDir, size] = r.stdout.trim().split("\n");
    if (r.code !== 0 || !real || !homeDir) throw new Error(r.stderr.trim() || `can't read ${src}`);
    if (!real.startsWith(`${homeDir}/`)) throw new Error(`local images must be under ${home()}: ${src}`);
    if (Number(size) > MAX_BYTES) throw new Error(`image is larger than ${MAX_BYTES} bytes`);
    return this.once(`file:${real}`, async () => {
      const bytes = await readFile(real);
      return this.store(sha256(bytes), bytes);
    });
  }

  private async download(url: string, key: string): Promise<Uint8Array> {
    await this.acquire();
    const part = join(this.dir, `${key}.part`);
    try {
      const r = await exec("curl", [
        "-q", // first: ignore ~/.curlrc
        "--globoff",
        "--proto", "=http,https",
        "--proto-redir", "=http,https",
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
      this.release();
    }
  }

  /** A download slot: taken now, or handed over by a finishing download. */
  private async acquire(): Promise<void> {
    if (this.running < PARALLEL) {
      this.running++;
      return;
    }
    await new Promise<void>((go) => this.queue.push(go));
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) next();
    else this.running--;
  }

  /** Stores bytes under their cache key; one write per key at a time (two files with the same bytes share it). */
  private store(key: string, bytes: Uint8Array): Promise<LoadedImage> {
    return this.once(`store:${key}`, async () => {
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
    });
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
    this.save();
  }

  /** Writes the index after the running write, once for any number of requests meanwhile. */
  private save(): void {
    if (this.saveQueued) return;
    this.saveQueued = true;
    this.saving = this.saving
      .then(async () => {
        this.saveQueued = false;
        const index = await this.entries();
        await writeFile(join(this.dir, "index.json"), JSON.stringify(Object.fromEntries(index)));
      })
      .catch(() => {}); // a failed write must not stop later ones
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

/** A local `src` as an absolute path (not yet resolved through symlinks). */
function localPath(src: string, base: string | null): string {
  if (src.startsWith("//")) throw new Error(`protocol-relative URL without a page to resolve it: ${src}`);
  const raw = /^file:\/\//i.test(src) ? decodeURIComponent(src.slice(7)) : src;
  const path = raw.startsWith("~/") ? join(home(), raw.slice(2)) : raw.startsWith("/") ? resolve(raw) : base ? resolve(base, raw) : null;
  if (!path) throw new Error(`relative image path without a base folder: ${src}`);
  return path;
}

let shared: ImageCache | null = null;

/** The Surface `images` option for a view whose relative `src`s resolve against `base` (the .oui file's folder). */
export function herdrImages(base: string | null): ImageLoader {
  return (src) => (shared ??= new ImageCache()).load(src, base);
}
