// Build:
//   dist/opengpui.js               the library (gpui-kit and gpui-base stay host imports)
//   herdr/mods/opengpui/main.js    the Herdr mod: opengpui's own code, loaded once per tab
//   herdr/mods/opengpui/shared.js  the packages it imports, loaded once per Herdr engine (bundleSplit)
//   herdr/mods/opengpui/{fonts,icons}  the assets it ships (bun scripts/assets.ts)
//   herdr/mods/opengpui/cli/opengpui.mjs  the agent CLI, for Node 18+ or Bun (cli/opengpui runs it)
//   harness/app/{main,shared}.js   the headless harness's script (tools/oui-harness), split the same
//                                  way, with its icons
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { BunPlugin } from "bun";
import { upstreamPlugin } from "./upstream-plugin.ts";

const root = join(import.meta.dir, "..");

function copyAssets(): void {
  const copies: [string, string][] = [
    ["fonts", join("herdr", "mods", "opengpui", "fonts")],
    ["icons", join("herdr", "mods", "opengpui", "icons")],
    ["icons", join("harness", "app", "icons")],
  ];
  for (const [dir, dest] of copies) {
    const from = join(root, ".upstream", "assets", dir);
    if (!existsSync(join(from, ".stamp.json"))) throw new Error(`.upstream/assets/${dir} is missing: run \`bun run sync\``);
    const to = join(root, dest);
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true, filter: (src) => !src.endsWith(".stamp.json") });
  }
}

// gpui-shell throws on browser timers. Upstream React renderers (genui-lib
// component files) use them, but never run here; nothing else may.
function assertNoBrowserTimers(code: string, name: string): void {
  const offenders = code
    .split(/\n(?=\/\/ \S)/)
    .filter((section) => !/^\/\/ \S*react-ui\/src\/genui-lib\//.test(section))
    .filter((section) => /\b(setTimeout|setInterval)\(/.test(section))
    .map((section) => section.slice(0, section.indexOf("\n")));
  if (offenders.length) {
    throw new Error(`${name} calls timers gpui-shell forbids:\n${offenders.join("\n")}`);
  }
}

// The CLI runs under Bun, where gpui and herdr don't exist: it only reads the
// component table's names, so their modules become inert stubs there.
const hostStubs: BunPlugin = {
  name: "opengpui-host-stubs",
  setup(build) {
    build.onResolve({ filter: /^(gpui-kit|gpui-base|gpui|herdr)$/ }, () => ({
      path: join(root, "src", "upstream", "stub.cjs"),
    }));
  },
};

// gpui-shell provides node-like built-ins (fs/promises, path, …) of its own. A
// browser-target build would swap them for empty polyfills, so keep them imports.
const RUNTIME_BUILTINS = /^(fs\/promises|path|url|os|crypto|buffer|zlib|net|websocket|process)$/;
const runtimeBuiltins: BunPlugin = {
  name: "opengpui-runtime-builtins",
  setup(build) {
    build.onResolve({ filter: RUNTIME_BUILTINS }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

async function bundle(
  entry: string,
  out: string,
  options: { external?: string[]; target?: "browser" | "bun" | "node"; plugins?: BunPlugin[] },
): Promise<number> {
  const result = await Bun.build({
    entrypoints: [join(root, entry)],
    format: "esm",
    target: options.target ?? "browser",
    external: options.external ?? [],
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [...(options.plugins ?? []), upstreamPlugin()],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`build of ${entry} failed`);
  }
  const code = await result.outputs[0]!.text();
  // The CLI runs under Node or Bun, outside gpui-shell.
  if (options.target !== "node") assertNoBrowserTimers(code, out);
  mkdirSync(join(root, out, ".."), { recursive: true });
  await Bun.write(join(root, out), code);
  return code.length;
}

// Herdr runs every tab of a mod as a load of its own in one engine, whose heap
// (256 MiB) no load gives back: gpui-shell keeps every module it has evaluated
// until the engine ends. One whole bundle cost about 14 MiB of that per tab
// before drawing anything (bun scripts/shot.ts --shared-vm measures it), most
// of it the packages: zod and OpenUI's libraries, refractor's grammars,
// unified and micromark, d3, date-fns. So main.js holds opengpui's own code
// (OWN_CODE) and every package it imports, with SHARED_FILES, goes into
// shared.js. main.js first imports shared.js itself, unless an earlier load
// in the engine did: it keeps the modules on globalThis under shared.js's
// content hash, so every load of this build uses the one copy (a new build
// gets its own), as the components of a web page share their packages. The
// packages keep no state per view; markdown/grammars.ts is the refractor
// registration every load continues, upstream/timers.ts the scheduler that
// lang-core's Query refresh and surface.ts's pump must see as one module.
// The build fails if any module ends up in both scripts: two copies of a module
// with state (timers.ts was one) silently disagree.
//
// The cost: the loader's top-level await makes main.js an async module, and
// gpui-shell evaluates it with `promise.finish()`, which runs every promise job
// already queued, FIFO, inside the new tab's application scope. When loads
// follow each other without a frame between (oui-harness reproduces it), a
// job the previous load's init left runs as this tab's (the Herdr issue draft
// in notes/reports/2026-11-07-heap.md asks for a way around it).
const OWN_CODE = ["src", "herdr/src", "harness/src"].map((dir) => join(root, dir) + "/");
const SHARED_FILES = [join(root, "src", "markdown", "grammars.ts"), join(root, "src", "upstream", "timers.ts")];
const KEY_PLACEHOLDER = "@@OPENGPUI_SHARED_KEY@@";

/**
 * main.js's view of the shared modules: each bare import from OWN_CODE (but the host's
 * modules and the runtime's built-ins) and each SHARED_FILES import is collected into
 * `specs` and answered by `proxy(spec)`.
 */
function shareImports(entryPath: string, external: string[], specs: Set<string>, proxy: (spec: string) => string): BunPlugin {
  const entryFilter = new RegExp(`^${entryPath.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`);
  const key = JSON.stringify(KEY_PLACEHOLDER);
  return {
    name: "opengpui-share",
    setup(build) {
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        if (args.path === "opengpui-shared-loader") return { path: args.path, namespace: "opengpui-shared-loader" };
        if (!OWN_CODE.some((own) => args.importer.startsWith(own))) return undefined;
        if (external.includes(args.path) || RUNTIME_BUILTINS.test(args.path)) return undefined;
        specs.add(args.path);
        return { path: args.path, namespace: "opengpui-shared" };
      });
      build.onResolve({ filter: /^\./ }, (args) => {
        const path = resolve(dirname(args.importer), args.path);
        if (!SHARED_FILES.includes(path)) return undefined;
        const spec = `./${relative(root, path)}`;
        specs.add(spec);
        return { path: spec, namespace: "opengpui-shared" };
      });
      build.onLoad({ filter: /.*/, namespace: "opengpui-shared" }, (args) => ({ contents: proxy(args.path), loader: "js" }));
      // Runs before any other module of main.js: the entry imports it first. A failed
      // import, or a shared.js of another build, is not kept, so the next load tries again.
      build.onLoad({ filter: /.*/, namespace: "opengpui-shared-loader" }, () => ({
        contents: `const ready = Symbol.for(${key});
const loading = Symbol.for(${key} + " loading");
if (!globalThis[ready]) {
  const file = "./shared.js";
  globalThis[loading] ??= import(file).then((shared) => {
    if (shared.key !== ${key}) throw new Error("shared.js is not the one this main.js was built with: " + shared.key);
    return shared;
  }).catch((error) => {
    delete globalThis[loading];
    throw error;
  });
  globalThis[ready] = (await globalThis[loading]).modules;
}
`,
        loader: "js",
      }));
      build.onLoad({ filter: entryFilter }, async (args) => ({
        contents: `import "opengpui-shared-loader";\n${await Bun.file(args.path).text()}`,
        loader: "ts",
      }));
    },
  };
}

async function build(config: Parameters<typeof Bun.build>[0], what: string): Promise<{ code: string; inputs: string[] }> {
  const result = await Bun.build({ format: "esm", target: "browser", define: { "process.env.NODE_ENV": '"production"' }, metafile: true, ...config });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`build of ${what} failed`);
  }
  return { code: await result.outputs[0]!.text(), inputs: Object.keys(result.metafile?.inputs ?? {}) };
}

async function bundleSplit(entry: string, dir: string, external: string[]): Promise<{ main: number; shared: number }> {
  const entryPath = join(root, entry);
  const plugins = [runtimeBuiltins, upstreamPlugin()];
  // Which modules main.js shares: a first build, its output unused.
  const specs = new Set<string>();
  await build({ entrypoints: [entryPath], external, plugins: [shareImports(entryPath, external, specs, () => "module.exports = {};"), ...plugins] }, entry);
  const modules = [...specs].sort();

  const sharedEntry: BunPlugin = {
    name: "opengpui-shared-entry",
    setup(build) {
      build.onResolve({ filter: /^opengpui-shared-entry$/ }, () => ({ path: "entry", namespace: "opengpui-shared-entry" }));
      build.onLoad({ filter: /.*/, namespace: "opengpui-shared-entry" }, () => ({
        contents:
          modules.map((spec, i) => `import * as m${i} from ${JSON.stringify(spec)};\n`).join("") +
          `export const modules = {\n${modules.map((spec, i) => `  ${JSON.stringify(spec)}: m${i},\n`).join("")}};\n`,
        loader: "js",
        resolveDir: root,
      }));
    },
  };
  const shared = await build({ entrypoints: ["opengpui-shared-entry"], external, plugins: [sharedEntry, ...plugins] }, `the modules ${entry} shares`);
  const key = `opengpui shared ${new Bun.CryptoHasher("sha256").update(shared.code).digest("hex").slice(0, 16)}`;
  // The loader checks this before keeping the modules: a main.js read beside an older
  // shared.js (an install caught halfway) must not file the old modules under its key.
  const sharedCode = `${shared.code}export const key = ${JSON.stringify(key)};\n`;
  // What the engine keeps for every load must not belong to one: no host module in it.
  const host = external.find((name) => sharedCode.includes(`from "${name}"`));
  if (host) throw new Error(`a module ${entry} shares imports ${host}`);
  assertNoBrowserTimers(sharedCode, join(dir, "shared.js"));
  mkdirSync(join(root, dir), { recursive: true });
  const sharedPath = join(root, dir, "shared.js");
  await Bun.write(sharedPath, sharedCode);

  // Each shared module's export names, read off the bundle run here, so main.js's
  // imports of them are plain ES bindings.
  const loaded = (await import(sharedPath)).modules as Record<string, Record<string, unknown>>;
  const proxy = (spec: string) => {
    const names = Object.keys(loaded[spec]!);
    const named = names.filter((name) => name !== "default");
    const exported = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));
    return (
      `const m = globalThis[Symbol.for(${JSON.stringify(key)})][${JSON.stringify(spec)}];\n` +
      named.map((name, i) => `const e${i} = m[${JSON.stringify(name)}];\n`).join("") +
      `export { ${named.map((name, i) => `e${i} as ${exported(name)}`).join(", ")} };\n` +
      (names.includes("default") ? "export default m.default;\n" : "")
    );
  };
  const main = await build({ entrypoints: [entryPath], external, plugins: [shareImports(entryPath, external, new Set(), proxy), ...plugins] }, entry);
  const twice = main.inputs.filter((input) => !input.includes(":") && shared.inputs.includes(input));
  if (twice.length) throw new Error(`${entry}: in both main.js and shared.js (add to SHARED_FILES): ${twice.join(", ")}`);
  const mainCode = main.code.replaceAll(KEY_PLACEHOLDER, key);
  assertNoBrowserTimers(mainCode, join(dir, "main.js"));
  await Bun.write(join(root, dir, "main.js"), mainCode);
  return { main: mainCode.length, shared: sharedCode.length };
}

function prefixed(dir: string, sizes: { main: number; shared: number }): Record<string, number> {
  return { [`${dir}/main.js`]: sizes.main, [`${dir}/shared.js`]: sizes.shared };
}

const gpui = ["gpui-kit", "gpui-base", "gpui"];
const sizes = {
  "dist/opengpui.js": await bundle("src/index.ts", "dist/opengpui.js", { external: gpui }),
  ...prefixed("herdr/mods/opengpui", await bundleSplit("herdr/src/main.ts", "herdr/mods/opengpui", [...gpui, "herdr"])),
  ...prefixed("harness/app", await bundleSplit("harness/src/main.ts", "harness/app", [...gpui, "oui-harness"])),
  "dist/opengpui-headless.js": await bundle("src/headless.ts", "dist/opengpui-headless.js", { target: "bun" }),
  "herdr/mods/opengpui/cli/opengpui.mjs": await bundle("bin/opengpui.ts", "herdr/mods/opengpui/cli/opengpui.mjs", { target: "node", plugins: [hostStubs] }),
};
for (const [file, size] of Object.entries(sizes)) console.log(`${file} ${(size / 1024).toFixed(0)} KiB`);
copyAssets();
