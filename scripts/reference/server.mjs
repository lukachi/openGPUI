// The reference server, started by `bun scripts/reference.ts serve` under Node.
// Builds scripts/reference/page against the .reference/ OpenUI checkout with
// react-ui's own Vite, serves it, and takes screenshots with Playwright:
//   GET /?file=&mode=&library=&width=        the live render
//   GET /source?file=<absolute .oui path>    the file the page renders
//   GET /shot?file=&mode=&library=&width=&wait=
//                                            PNG of #reference-frame at device
//                                            scale 2; header x-reference-errors
//                                            holds upstream's errors as JSON
// Every shot gets its own browser context, so parallel shots do not interact.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, join, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";

const config = JSON.parse(process.env.REFERENCE_CONFIG ?? "{}");
const { port, reactUi, tools, fonts, page, dist } = config;
const packages = dirname(reactUi);
const fromReactUi = createRequire(join(reactUi, "package.json"));

/** Import a package's ESM entry, resolved from `require`'s location. */
async function importEsm(require, name) {
  const manifest = require.resolve(`${name}/package.json`);
  const pkg = JSON.parse(readFileSync(manifest, "utf8"));
  let entry = pkg.exports?.["."] ?? pkg.exports ?? pkg.module ?? pkg.main;
  while (entry && typeof entry === "object") entry = entry.import ?? entry.default;
  return import(pathToFileURL(join(dirname(manifest), entry)).href);
}

/** Directory of the installed package `name` that `require` resolves. */
function packageDir(require, name) {
  const main = require.resolve(name);
  const marker = `${sep}node_modules${sep}${name}${sep}`;
  return main.slice(0, main.lastIndexOf(marker) + marker.length - 1);
}

/** `@openuidev/*` workspace packages compiled from source, as react-ui's
 *  Storybook (.storybook/main.ts) does for react-headless, react-lang and
 *  lang-core; they have no built dist/ here. */
function workspaceAliases() {
  const aliases = [];
  for (const dir of readdirSync(packages)) {
    const manifest = join(packages, dir, "package.json");
    if (!existsSync(manifest)) continue;
    const name = JSON.parse(readFileSync(manifest, "utf8")).name;
    const entry = ["index.ts", "index.tsx"].map((f) => join(packages, dir, "src", f)).find(existsSync);
    if (name?.startsWith("@openuidev/") && name !== "@openuidev/react-ui" && entry) {
      aliases.push({ find: new RegExp(`^${name.replace("/", "\\/")}$`), replacement: entry });
    }
  }
  return aliases;
}

// ── Build the page ──

const vite = await importEsm(fromReactUi, "vite");
const katex = packageDir(createRequire(fromReactUi.resolve("rehype-katex")), "katex");
const pageDir = join(reactUi, ".reference-page");
rmSync(pageDir, { recursive: true, force: true });
cpSync(page, pageDir, { recursive: true });
const buildStarted = Date.now();
await vite.build({
  root: pageDir,
  base: "/",
  configFile: false,
  // Upstream's own sass deprecations and "use client" directives are noise here.
  logLevel: "error",
  resolve: {
    alias: [
      ...workspaceAliases(),
      { find: "katex-css", replacement: join(katex, "dist", "katex.min.css") },
      { find: "@reference-fonts", replacement: fonts },
    ],
    dedupe: ["react", "react-dom"],
  },
  css: { preprocessorOptions: { scss: { quietDeps: true, logger: { warn() {} } } } },
  esbuild: { jsx: "automatic" },
  build: { outDir: dist, emptyOutDir: true, reportCompressedSize: false, chunkSizeWarningLimit: 100_000 },
});
console.log(`page built in ${((Date.now() - buildStarted) / 1000).toFixed(1)}s`);

// ── Browser ──

const { chromium } = createRequire(join(tools, "package.json"))("playwright-core");
let browserPromise;
function browser() {
  browserPromise ??= chromium.launch().then((b) => {
    b.on("disconnected", () => (browserPromise = undefined));
    return b;
  });
  return browserPromise;
}

async function shot(params) {
  const width = Number(params.get("width") ?? 720);
  const wait = Number(params.get("wait") ?? 500);
  const mode = params.get("mode") === "dark" ? "dark" : "light";
  const pageParams = new URLSearchParams(params);
  pageParams.delete("wait");
  const context = await (await browser()).newContext({
    viewport: { width: Math.ceil(width), height: 900 },
    deviceScaleFactor: 2,
    colorScheme: mode,
  });
  try {
    const tab = await context.newPage();
    const errors = [];
    tab.on("pageerror", (e) => errors.push(e.message));
    tab.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await tab.goto(`http://127.0.0.1:${port}/?${pageParams}`);
    await tab.waitForFunction(() => document.documentElement.dataset.referenceReady === "1", null, { timeout: 30_000 });
    if (wait > 0) await tab.waitForTimeout(wait);
    errors.unshift(...(await tab.evaluate(() => window.__referenceErrors)));
    const png = await tab.locator("#reference-frame").screenshot({ animations: "disabled", caret: "hide", timeout: 30_000 });
    return { png, errors };
  } finally {
    await context.close();
  }
}

// ── HTTP ──

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

/** The .oui file a request names, or an error message. */
function sourceFile(params) {
  const file = params.get("file") ?? "";
  if (!isAbsolute(file) || !file.endsWith(".oui")) return { error: `file must be an absolute .oui path, got "${file}"` };
  if (!existsSync(file) || !statSync(file).isFile()) return { error: `${file} does not exist` };
  return { file };
}

/** A header-safe JSON array (ASCII only). */
const headerJson = (list) =>
  JSON.stringify(list.slice(0, 50).map((e) => e.slice(0, 500))).replace(
    /[\u007f-\uffff]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const send = (status, type, body, headers = {}) => {
    res.writeHead(status, { "content-type": type, "cache-control": "no-store", ...headers });
    res.end(body);
  };
  try {
    if (url.pathname === "/health") return send(200, "text/plain", "ok");
    if (url.pathname === "/source") {
      const { file, error } = sourceFile(url.searchParams);
      if (error) return send(400, "text/plain; charset=utf-8", error);
      return send(200, "text/plain; charset=utf-8", await readFile(file));
    }
    if (url.pathname === "/shot") {
      const { file, error } = sourceFile(url.searchParams);
      if (error) return send(400, "text/plain; charset=utf-8", error);
      const started = Date.now();
      const { png, errors } = await shot(url.searchParams);
      console.log(`shot ${file} ${url.searchParams.get("mode") ?? "light"} ${Date.now() - started}ms${errors.length ? ` (${errors.length} errors)` : ""}`);
      return send(200, "image/png", png, { "x-reference-errors": headerJson(errors) });
    }
    const path = normalize(join(dist, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname)));
    if (!path.startsWith(dist + sep) || !existsSync(path) || !statSync(path).isFile()) return send(404, "text/plain", "not found");
    return send(200, TYPES[extname(path)] ?? "application/octet-stream", await readFile(path));
  } catch (error) {
    console.error(error);
    if (!res.headersSent) send(500, "text/plain; charset=utf-8", String(error?.stack ?? error));
  }
});

server.listen(port, "127.0.0.1", async () => {
  await browser();
  console.log(`reference renderer on http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await (await browserPromise)?.close();
    process.exit(0);
  });
}
