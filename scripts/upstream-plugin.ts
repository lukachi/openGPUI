// Bun plugin that compiles OpenUI's lang-core and react-ui genui-lib from source
// without React: component schemas, names, descriptions, groups and prompt
// examples stay exactly upstream's, while everything React (renderers, hooks,
// react itself) becomes an inert stub that is never called. Upstream's lucide
// icon-name resolver compiles for real, against the name → SVG file table
// scripts/assets.ts generates in place of lucide-react's import map.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { BunPlugin } from "bun";

const root = join(import.meta.dir, "..");
const UP = join(root, ".upstream", "openui", "packages");
const LANG = join(UP, "lang-core", "src");
const REACT_UI = join(UP, "react-ui", "src");
const GENUI = join(REACT_UI, "genui-lib");
const THEME = join(REACT_UI, "components", "ThemeProvider");
const ICONS = join(REACT_UI, "components", "_shared", "icons");
const LUCIDE_MAP = join(root, ".upstream", "assets", "lucide-map.js");
const SHIM = join(root, "src", "upstream");
const CHARTS = join(REACT_UI, "components", "Charts");
// react-ui chart modules that are plain TypeScript (no React, no DOM at call
// time): value formatting, palettes, domains, label layout, bar/series
// geometry. They compile for real, and so do their imports of each other.
const CHART_PURE =
  /^(utils\/[A-Za-z]+|shared\/cartesian\/(roundedBarPath|seriesGeometry)|BarChart\/parts\/(horizontalBarGeometry|verticalBarRadii)|shared\/core\/PortalTooltip\/utils|hooks\/cartesian\/(useStackedData|useXBandScale))$/;

function chartModule(path: string): string | undefined {
  return [`${path}.ts`, join(path, "index.ts")].find(existsSync);
}

const isUnder = (path: string, dir: string) => path === dir || path.startsWith(dir + "/");

/** Bare imports upstream sources keep real: a package name (a regex source), alone or with a subpath. */
const REAL_BARE_IMPORTS = ["zod", "unist-util-visit", "date-fns", "d3-scale", "d3-shape", "@openuidev/[^/]+"];
/** Any other bare specifier: `^` then a negative lookahead over REAL_BARE_IMPORTS. */
const REAL_BARE_FILTER = new RegExp(`^(?!(?:${REAL_BARE_IMPORTS.join("|")})(?:/|$))[^./]`);

export function upstreamPlugin(): BunPlugin {
  if (!existsSync(GENUI)) throw new Error("Run `bun run sync` first: .upstream/openui is missing");
  if (!existsSync(LUCIDE_MAP)) throw new Error("Run `bun run sync` first: .upstream/assets/lucide-map.js is missing");
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
      // Lucide icon lookup by name, with upstream's fuzzy matching and category fallbacks.
      build.onResolve({ filter: /^openui-icons$/ }, () => ({ path: join(ICONS, "dynamicIconImports.ts") }));
      build.onResolve({ filter: /^openui-icon-fallbacks$/ }, () => ({ path: join(ICONS, "categoryFallbacks.ts") }));
      // The remark plugin react-ui's markdown renderers share (citation markers).
      build.onResolve({ filter: /^openui-remark-citations$/ }, () => ({
        path: join(REACT_UI, "components", "_shared", "remark", "remarkCitations.ts"),
      }));
      // The pure selection helpers Chips and OptionCards share (single/multiple normalizing and toggling).
      build.onResolve({ filter: /^openui-selection-utils$/ }, () => ({ path: join(GENUI, "selectionFieldUtils.ts") }));
      // DatePicker's value formatting (plain TypeScript over date-fns), and react-day-picker's
      // React-free modules (its export map only offers the React entry): `openui-rdp/<path under dist/esm>`.
      build.onResolve({ filter: /^openui-datepicker-helpers$/ }, () => ({
        path: join(REACT_UI, "components", "DatePicker", "helpers", "utils", "helperFn.tsx"),
      }));
      build.onResolve({ filter: /^openui-rdp\// }, (args) => ({
        path: join(root, "node_modules", "react-day-picker", "dist", "esm", args.path.slice("openui-rdp/".length)),
      }));
      // react-ui's pure chart helpers (see CHART_PURE), and genui's chart data builder.
      build.onResolve({ filter: /^openui-charts\// }, (args) => {
        const rel = args.path.slice("openui-charts/".length);
        const path = CHART_PURE.test(rel) ? chartModule(join(CHARTS, rel)) : undefined;
        if (!path) throw new Error(`${args.path} is not a pure react-ui chart module`);
        return { path };
      });
      build.onResolve({ filter: /^openui-genui-helpers$/ }, () => ({ path: join(GENUI, "helpers.ts") }));

      // micromark decodes character references through the DOM in browser builds;
      // gpui-shell has no DOM, so take the package's table-based build.
      build.onResolve({ filter: /^decode-named-character-reference$/ }, () => ({
        path: join(root, "node_modules", "decode-named-character-reference", "index.js"),
      }));

      // Bare imports from upstream sources: the packages in REAL_BARE_IMPORTS load for real (zod,
      // the unist walker, date-fns for DatePicker's helperFn.tsx, d3-scale and d3-shape for the
      // charts, the rest of @openuidev/*),
      // everything else (react, lucide, …) is a stub.
      // They are left out of the filter itself, not just answered with `undefined`: Bun treats a
      // module reached through a hop a plugin matched as possibly having side effects, even when
      // the plugin declines, so a package's `sideEffects: false` would be ignored and its whole
      // barrel bundled (date-fns: 367 modules for the few functions used). Add a real import to
      // the list, not to the callback.
      build.onResolve({ filter: REAL_BARE_FILTER }, (args) => {
        if (!isUnder(args.importer, UP)) return undefined;
        return { path: args.path, namespace: "opengpui-stub" };
      });

      // Relative imports that leave genui-lib for react-ui's React components become stubs,
      // except schema modules (wire contracts) and the theme's pure token modules,
      // which load for real.
      build.onResolve({ filter: /^\./ }, (args) => {
        if (isUnder(args.importer, ICONS)) {
          return /lucideDynamicImports\.mjs$/.test(args.path) ? { path: LUCIDE_MAP } : undefined;
        }
        if (!isUnder(args.importer, GENUI) && !isUnder(args.importer, REACT_UI)) {
          if (isUnder(args.importer, LANG) && /telemetry\/runtime$/.test(args.path)) {
            return { path: join(SHIM, "telemetry-noop.ts") };
          }
          return undefined;
        }
        const target = resolve(dirname(args.importer), args.path);
        if (isUnder(target, GENUI)) return undefined;
        if (isUnder(args.importer, CHARTS) && isUnder(target, CHARTS) && CHART_PURE.test(target.slice(CHARTS.length + 1))) {
          const path = chartModule(target);
          if (path) return { path };
        }
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

      // mdast-util-to-hast copies node data with structuredClone, which gpui-shell lacks.
      build.onLoad({ filter: /node_modules\/mdast-util-to-hast\/lib\/.*\.js$/ }, (args) => {
        const source = readFileSync(args.path, "utf8");
        if (!source.includes("structuredClone(")) return undefined;
        const header = `import { ogpuiStructuredClone } from ${JSON.stringify(join(SHIM, "clone.ts"))};\n`;
        return { contents: header + source.replace(/\bstructuredClone\(/g, "ogpuiStructuredClone("), loader: "js" };
      });

      // gpui-shell freezes the built-in prototypes, so assigning a `constructor`
      // or `toString` an object inherits from them throws (the "override
      // mistake"); d3-color does so at import. Define the own property first;
      // the assignment then works as in a browser. Only the d3-color, d3-format
      // and d3-time-format files that do this, and only plain-identifier targets.
      build.onLoad(
        { filter: /node_modules\/(d3-color\/src\/define|d3-format\/src\/(formatSpecifier|locale)|d3-time-format\/src\/locale)\.js$/ },
        (args) => {
          const source = readFileSync(args.path, "utf8");
          const patched = source.replace(
            /(?<![\w$.)\]])([A-Za-z_$][\w$.]*)\.(toString|constructor)\s*=(?!=)/g,
            'Object.defineProperty($1, "$2", { writable: true, configurable: true, enumerable: true, value: undefined }).$2 =',
          );
          return patched === source ? undefined : { contents: patched, loader: "js" };
        },
      );

      // refractor/all registers ~300 Prism grammars at import, too slow for gpui-shell
      // to load a mod. This lists the same grammars in the same order (later ones
      // extend earlier ones), for opengpui to register in the background.
      build.onResolve({ filter: /^opengpui-prism-all$/ }, () => ({
        path: join(root, "node_modules", "refractor", "lib", "all.js"),
        namespace: "opengpui-prism-all",
      }));
      build.onLoad({ filter: /.*/, namespace: "opengpui-prism-all" }, (args) => {
        const source = readFileSync(args.path, "utf8");
        const order = [...source.matchAll(/^refractor\.register\((\S+)\)$/gm)].map((m) => m[1]!);
        if (order.length < 200) throw new Error(`unexpected refractor/lib/all.js (${order.length} registrations)`);
        const imports = [...source.matchAll(/^import (\S+) from '\.\.\/lang\/([^']+)'$/gm)].map(
          (m) => `import ${m[1]} from ${JSON.stringify(join(dirname(args.path), "..", "lang", m[2]!))};`,
        );
        return { contents: `${imports.join("\n")}\nexport const syntaxes = [${order.join(", ")}];\n`, loader: "js" };
      });
    },
  };
}
