// Build:
//   dist/opengpui.js               the library (gpui-kit and gpui-base stay host imports)
//   herdr/mods/opengpui/main.js    the Herdr mod, with the library bundled in
//   herdr/mods/opengpui/{fonts,icons}  the assets it ships (bun scripts/assets.ts)
//   harness/app/main.js            the headless harness's script (tools/oui-harness), with its icons
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
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
const runtimeBuiltins: BunPlugin = {
  name: "opengpui-runtime-builtins",
  setup(build) {
    build.onResolve({ filter: /^(fs\/promises|path|url|os|crypto|buffer|zlib|net|websocket|process)$/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

async function bundle(
  entry: string,
  out: string,
  options: { external?: string[]; target?: "browser" | "bun"; plugins?: BunPlugin[] },
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
  assertNoBrowserTimers(code, out);
  mkdirSync(join(root, out, ".."), { recursive: true });
  await Bun.write(join(root, out), code);
  return code.length;
}

const gpui = ["gpui-kit", "gpui-base", "gpui"];
const sizes = {
  "dist/opengpui.js": await bundle("src/index.ts", "dist/opengpui.js", { external: gpui }),
  "herdr/mods/opengpui/main.js": await bundle("herdr/src/main.ts", "herdr/mods/opengpui/main.js", {
    external: [...gpui, "herdr"],
    plugins: [runtimeBuiltins],
  }),
  "harness/app/main.js": await bundle("harness/src/main.ts", "harness/app/main.js", {
    external: [...gpui, "oui-harness"],
    plugins: [runtimeBuiltins],
  }),
  "dist/opengpui-headless.js": await bundle("src/headless.ts", "dist/opengpui-headless.js", { target: "bun" }),
  "dist/opengpui-cli.js": await bundle("bin/opengpui.ts", "dist/opengpui-cli.js", { target: "bun", plugins: [hostStubs] }),
};
for (const [file, size] of Object.entries(sizes)) console.log(`${file} ${(size / 1024).toFixed(0)} KiB`);
copyAssets();
