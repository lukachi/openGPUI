// Bun plugin that compiles OpenUI's lang-core and react-ui genui-lib from source
// without React: component schemas, names, descriptions, groups and prompt
// examples stay exactly upstream's, while everything React (renderers, hooks,
// icons, react itself) becomes an inert stub that is never called.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { BunPlugin } from "bun";

const root = join(import.meta.dir, "..");
const UP = join(root, ".upstream", "openui", "packages");
const LANG = join(UP, "lang-core", "src");
const REACT_UI = join(UP, "react-ui", "src");
const GENUI = join(REACT_UI, "genui-lib");
const THEME = join(REACT_UI, "components", "ThemeProvider");
const SHIM = join(root, "src", "upstream");

const isUnder = (path: string, dir: string) => path === dir || path.startsWith(dir + "/");

export function upstreamPlugin(): BunPlugin {
  if (!existsSync(GENUI)) throw new Error("Run `bun run sync` first: .upstream/openui is missing");
  return {
    name: "opengpui-upstream",
    setup(build) {
      build.onResolve({ filter: /^@openuidev\/lang-core$/ }, () => ({ path: join(LANG, "index.ts") }));
      build.onResolve({ filter: /^@openuidev\/react-lang$/ }, () => ({ path: join(SHIM, "react-lang.cjs") }));
      build.onResolve({ filter: /^openui-genui$/ }, () => ({ path: join(GENUI, "index.ts") }));
      // OpenUI's default light/dark design tokens (pure TS: swatches, no React).
      build.onResolve({ filter: /^openui-theme$/ }, () => ({
        path: join(THEME, "defaultTheme.ts"),
      }));

      // Bare imports from upstream sources: zod is real, everything else (react, lucide, …) is a stub.
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        if (!isUnder(args.importer, UP)) return undefined;
        if (/^zod(\/|$)/.test(args.path)) return undefined;
        if (args.path.startsWith("@openuidev/")) return undefined;
        return { path: args.path, namespace: "opengpui-stub" };
      });

      // Relative imports that leave genui-lib for react-ui's React components become stubs,
      // except schema modules (wire contracts) and the theme's pure token modules,
      // which load for real.
      build.onResolve({ filter: /^\./ }, (args) => {
        if (!isUnder(args.importer, GENUI) && !isUnder(args.importer, REACT_UI)) {
          if (isUnder(args.importer, LANG) && /telemetry\/runtime$/.test(args.path)) {
            return { path: join(SHIM, "telemetry-noop.ts") };
          }
          return undefined;
        }
        const target = resolve(dirname(args.importer), args.path);
        if (isUnder(target, GENUI)) return undefined;
        if (/\/schema(\.tsx?)?$/.test(target)) return undefined;
        if (isUnder(args.importer, THEME) && /\/(swatches|types)(\.ts)?$/.test(target)) return undefined;
        return { path: target, namespace: "opengpui-stub" };
      });

      // A stubbed directory that holds a schema module keeps that module's real exports.
      // (Bun does not hand pluginData to onLoad, so the schema is looked up here.)
      build.onLoad({ filter: /.*/, namespace: "opengpui-stub" }, (args) => {
        const stubPath = JSON.stringify(join(SHIM, "stub.cjs"));
        const schema = args.path.startsWith("/")
          ? [join(args.path, "schema.ts"), join(args.path, "schema.tsx")].find(existsSync)
          : undefined;
        const contents = schema
          ? `const stub = require(${stubPath});
             const real = require(${JSON.stringify(schema)});
             module.exports = new Proxy(real, { get: (t, k) => (k in t ? t[k] : stub) });`
          : `module.exports = require(${stubPath});`;
        return { contents, loader: "js" };
      });

      // lang-core's query refresh uses setInterval, which gpui-shell forbids: route it
      // through opengpui's scheduler, which runs on cx.timer.
      build.onLoad({ filter: /lang-core\/src\/runtime\/queryManager\.ts$/ }, (args) => {
        const source = readFileSync(args.path, "utf8")
          .replace(/\bsetInterval\(/g, "ogpuiSetInterval(")
          .replace(/\bclearInterval\(/g, "ogpuiClearInterval(");
        const header = `import { ogpuiSetInterval, ogpuiClearInterval } from ${JSON.stringify(join(SHIM, "timers.ts"))};\n`;
        return { contents: header + source, loader: "ts" };
      });
    },
  };
}
