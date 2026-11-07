# Development

## Setup

Needs [Bun](https://bun.sh), [uv](https://docs.astral.sh/uv/) (only to cut the fonts, see
[Fonts](#fonts)), herdr-app for the mod, and a Rust toolchain (`cargo`) on macOS for the headless
harness.

```sh
bun install
bun run sync           # scripts/sync.ts: pinned OpenUI checkout, Inter and lucide assets (upstream.json), gpui/herdr types from Herdr
bun run check          # typecheck, build, herdr-app check on the mod
bun run test           # build, then session/library/token tests against the built headless bundle
bun run install-herdr  # build, then install the release folder into ~/.config/herdr-app/mods/opengpui and link `opengpui` into ~/.local/bin
bun run release        # build, then gallery/opengpui/mods/opengpui and dist/opengpui-v<version>.tar.gz
```

Built against herdr-app 0.1.13 (gpui-shell 0.7.1), OpenUI lang-core 1.1.0, Inter 4.1,
lucide 0.562.0, and at upstream's lockfile versions date-fns 4.4.0, react-day-picker 9.14.0,
d3-scale 4.0.2 and d3-shape 3.2.0.

## Layout

| Path | What |
|---|---|
| `src/runtime/` | `Session`: one response's parse, `$state` store, queries/mutations, forms, validation, actions, errors. Framework-free port of react-lang's state hook. |
| `src/render/` | `Surface`: draws a session with gpui-kit as retained nested views (the root, each costly or stateful component, each overlay) and redraws only the views a change touches (`invalidate.ts`); owns the pump task that creates them and the retained native state (inputs, timers) outside `render`. `Tokens`: OpenUI's own design tokens, compiled from the pinned theme and resolved to gpui values. `fonts.ts`: the Inter cuts and how a stack resolves to them. `icons.ts`/`lucide.ts`: upstream's lucide lookup and the icons' SVG markup a host writes to files. |
| `src/markdown/` | Markdown as react-ui draws it: react-markdown's own pipeline (unified, remark, the plugins each renderer passes) into an HTML tree, drawn with react-ui's markdown styles; code blocks highlighted by the same Prism grammars and themes. |
| `src/components/` | One renderer per OpenUI component. `charts/` holds the chart renderers and their shared foundation (its `index.ts` documents the API). |
| `src/library.ts` | OpenUI's `openui` and `chat` libraries; `subsetLibrary()` to prompt only what is implemented, `selectLibrary()` for a host's choice of library and component subset. |
| `src/upstream/` | Stubs and shims that let upstream's code compile and run without React or the DOM. |
| `herdr/` | The Herdr mod (`herdr/src/main.ts` → `herdr/mods/opengpui/main.js` and `shared.js`); `contract.ts`: the events path rule and event shape the mod and the CLI share; `theme.ts` maps the Herdr theme onto OpenUI's color tokens. |
| `bin/opengpui.ts` | The agent CLI ([agent contract](agent-contract.md)), built for Node 18+ or Bun into the mod's `cli/opengpui.mjs`, next to its launcher `cli/opengpui`. The skill is built into it (`opengpui skill`). |
| `skills/opengpui/` | Agent skill: how an agent uses the CLI and the pane. |
| `gallery/opengpui/` | The mod as herdr.dev's gallery serves it: `RECIPE.md`, `preview.png`, and the release build in `mods/opengpui/`. |
| `scripts/` | The pipeline: `sync.ts` (pins → `.upstream/`, `types/`), `build.ts` with `upstream-plugin.ts` (compiles upstream without React), `release.ts` (the mod folder people get), `install.ts` (that folder into a Herdr home). |
| `tools/harness/` | The headless harness: `shot.ts` drives it, `host/` (Rust) runs `script/` (→ `app/main.js` and `shared.js`, the mod's content area without Herdr) offscreen on Herdr's gpui-shell, `checks/` holds its own regression check. |
| `tools/preview/` | Herdr-only checks: `preview.ts` (a preview Herdr window), `poke.ts` and `oui-poke/` (Swift: input for that window). |

Outputs:

- `herdr/mods/opengpui/`: the mod as it is installed: `main.js`, `shared.js` (with the lucide
  icons), `fonts/`, and the CLI in `cli/`.
- `dist/opengpui.js`: the library for gpui-shell hosts (`gpui-kit` and `gpui-base` stay imports).
- `dist/opengpui-headless.js`: libraries, prompts and `Session` without gpui, for Bun/Node.

## Looking at UI: the headless harness

```sh
bun run shot file.oui... [--mode light,dark] [--library chat] [--width 1280] [--height 820]
                         [--steps steps.json] [--tools tools.json] [--out dir] [--spec] [--jobs 4]
                         [--heap] [--shared-vm [--repeat n]]
```

It builds this checkout and draws each file offscreen, with the real core on the gpui-shell
runtime Herdr embeds, and writes `tmp/shots/<file>-<mode>.png` (2x) once the view has settled.
No window appears and nothing takes focus, so it runs beside the person's work and in parallel
(`--jobs`, default 4: about 250 shots take 30 s).

- `--steps` runs input after the first shot: click, hover, press, move and release an id or a
  point, drag, wheel (both axes), keys, typing, a window resize, simulated time, the clipboard's
  text, and a new text for the file (framed without its end line, it streams, as when an agent
  writes it). `{ "shot": "name" }` saves `<file>-<mode>-<name>.png`; the full list is in
  `tools/harness/shot.ts`. Each step runs until settled, or `"settle": ms` long to catch a short state.
- `--tools` answers Query/Mutation tools: `{ "<name>": { "result", "error", "delay" } }`.
- `--spec` writes the element description and the ids a step can name.
- Gpui-base's own animations draw their end state (reduced motion).
- Keys go to the focused element, and `tab` / `shift-tab` move focus as in Herdr, from where a
  click left it (see [Focus](gpui-differences.md#focus)): click a control first.
- After each frame the harness delivers the callbacks that frame queued for the next one
  (`request_animation_frame`), as Herdr's frame loop does: one pointer move into a chart item
  shows its tooltip.
- The actions the session sends and every error and runtime warning are printed. A file whose
  surface still reports itself busy when it settles (what Herdr's status file reports) is marked
  NOT IDLE, as is a step after which it does. `tools/harness/checks/idle-loop.oui` with its `.json`
  steps must report neither.

`--shared-vm` loads every file into one runtime, as Herdr runs every tab of a mod in one engine:
each window stays open like a tab, then all close in order as Herdr closes a tab (`--repeat n`
opens the list n times). It prints the script heap (QuickJS's own count, after a full
collection, against gpui-shell's 256 MiB limit) at start, after each load and after each close;
`--heap` prints it after each load of a normal run. Each measurement collects garbage, which
Herdr's engine keeps until its own GC threshold and counts against the limit, so later loads
start cleaner than in Herdr: read the "before GC" column for how close a window is to running
out.

The drawing comes from `tools/harness/host`, a Rust host on GPUI's headless app context
(simulated clock, Metal offscreen renderer) pinned to the herdr-app tag of the installed Herdr.
It refuses to run when Herdr's `~/.config/herdr-app/gpui-kit.d.ts` says Herdr's runtime has
moved (see its `Cargo.toml`).

## Herdr-only checks: preview and poke

```sh
bun run preview file.oui... [--mode light|dark|light,dark] [--look openui|herdr] [--wait ms] [--keep]
bun tools/preview/poke.ts click|hover|drag|scroll|key|type …
```

`preview.ts` is for the Herdr integration only (props, the events file, `hc` replies,
`--look herdr`, the pane chrome); use the harness to look at UI. It installs this checkout as
its own mod (`opengpui-<folder>`) in a background Herdr window of the checkout's own, shows each
file in a new tab, and saves a screenshot to `tmp/preview/` once the tab reports itself idle
(`opengpui/status/<name>.json`: nothing left to parse, highlight, load or draw on screen) and
stays so for 300 ms. Then it closes the tab. Checkouts never wait for each other.

`poke.ts` gives that preview window pointer and keyboard input (open it with `--keep`). A small
macOS helper, `tools/preview/oui-poke` built into `~/Applications/OuiPoke.app`, posts events straight to
the preview window's process, so the person's pointer, focus and own Herdr window are untouched;
it refuses any process that isn't a preview window.

- It needs Accessibility once (System Settings → Privacy & Security → Accessibility) and is
  signed with an "Apple Development" identity (`OUI_POKE_IDENTITY`) so the grant survives
  rebuilds.
- Clicks, drags, the wheel, keys and typing reach gpui; hover is sent as a drag event, because
  gpui takes plain mouse moves only from the real pointer.
- Coordinates are window points (`--px` takes pixels of a `herdr-app shot`).

## The Herdr mod

The mod is two scripts. Herdr loads a mod's `main.js` again for every tab, into the one engine
all mods share, and never frees a loaded module. So `main.js` holds only opengpui's own code
(about 1.7 MiB of that engine's 256 MiB per tab). The packages it imports (zod, OpenUI's
lang-core and libraries, refractor and its grammars, unified/micromark, d3, date-fns, …) are
`shared.js`: the first tab imports it and keeps it on `globalThis` under its content hash, and
later tabs of the same build use that copy (about 24 MiB once).

`scripts/build.ts` (`bundleSplit`) does the split, and fails when a module lands in both scripts
(a module with state, such as `src/upstream/timers.ts`, must be one copy: it is listed in
`SHARED_FILES`). The cost: the import is a top-level `await`, so gpui-shell finishes each load by
running every promise job already queued, in the new tab's scope. When loads follow each other
without a frame between, a job the previous tab's `init` queued runs as the new tab's.

The mod also ships `fonts/`, copied from `.upstream/assets` at build (see [Fonts](#fonts)); the
icons travel in `shared.js` (see [Icons](#icons)).

Markdown dependencies are pinned to the versions upstream's lockfile resolves (unified 11,
remark-parse 11, remark-gfm 4, remark-math 6, remark-breaks 4, remark-rehype 11, refractor 5,
react-syntax-highlighter 16 for its two Prism themes), so a markdown string parses to the tree
react-ui renders.

## Fonts

OpenUI draws Inter as a variable font: its `wght` axis is set per style, its optical size follows
the font size, and text is tracked −1%. gpui applies no variable axes and has no letter spacing,
so the mod ships static cuts of Inter instead, made by `scripts/sync.ts`:

1. Download the pinned Inter release (`upstream.json` `assets.inter`, checked by sha256) into
   `.upstream/assets/cache/`.
2. For each (optical size, weight) pair OpenUI's typography uses (`INTER_CUTS`, and
   `INTER_ITALIC_CUTS` for `em` and blockquotes, in `src/render/fonts.ts`), run fontTools:
   `varLib.instancer` fixes `wght` and `opsz`, `subset` keeps Latin, Greek and Cyrillic, and `ttx`
   bakes the −1% tracking into the glyph advances and names the face.
3. Write the cuts and Inter's license to `.upstream/assets/fonts/`, with a stamp of everything
   that went in (Inter and fontTools versions, the cut lists, tracking, the character set).

fontTools runs through `uvx` at the version `upstream.json` pins (`assets.fonttools`), so it needs
[uv](https://docs.astral.sh/uv/) and nothing installed into Python. `bun run sync` runs the
script; it cuts again only when the stamp no longer matches, so uv is needed on the first sync
and after one of these changes:

- a new Inter release or fontTools version in `upstream.json`;
- a type size and weight pair added to `INTER_CUTS` or `INTER_ITALIC_CUTS` (a new pair in a
  component's typography needs one, or text falls back to the nearest cut);
- the tracking or the character set in `src/render/fonts.ts` / `scripts/sync.ts`.

`bun run build` copies the cuts into the mod's `fonts/`. Herdr loads a mod's fonts at start and
on a look change; `install-herdr` reloads the look when they change. gpui keeps the faces it
first found for a family, so changed cuts of an installed font need a Herdr restart (the
installer says so). A host without the cuts keeps its own UI font.

## Icons

lucide's icons at the version react-ui depends on, checked against upstream's lockfile and
`upstream.json`. `scripts/sync.ts` turns them into `.upstream/assets/lucide/`: `svgs.json` (each
icon's markup inside the `<svg>` root they all share, about 340 KB), `map.js` (lucide-react's name
table, which upstream's own lookup with fuzzy matching and category fallbacks is compiled against)
and lucide's license.

The markup goes into `shared.js` as data (`src/render/lucide.ts`), so no build ships a file per
icon. gpui's `svg()` draws only files, so a host passes the Surface an `icons` writer: the first
time a surface draws an icon, `lucideSvg()` makes its SVG (at stroke width 2, or 2.5 where
react-ui's scss restyles it) and the writer puts it where `svg()` can draw it, named after its
content. Herdr writes them under `~/.config/herdr-app/opengpui/icons/` (`herdr/src/icons.ts`), the
harness into its scratch folder. Until the write lands, about a frame, the icon is an empty box
of its size.

## Updating OpenUI

`bun scripts/sync.ts --to main` moves the pin, then makes the assets for it. The sync fails if the
pinned `lang-core` version differs from the `@openuidev/lang-core` dev dependency used for types,
or if `upstream.json` no longer pins the lucide release react-ui depends on; bump those, then run
`bun run check` and the tests.

## Porting a component

Components are ports, not redesigns. Upstream's pure helpers are compiled from the pin through
`scripts/upstream-plugin.ts`, never copied. Each component comes from three upstream sources
under `.upstream/openui/packages/react-ui/src/`:

| Layer | Upstream | Here |
|---|---|---|
| Contract: name, props, prompt text | `genui-lib/<Name>/schema.ts` + `defineComponent` | compiled as is, never rewritten |
| Behavior: validation, actions, state, defaults | `genui-lib/<Name>/index.tsx` | ported line by line |
| Look: sizes, spacing, colors, typography | `components/<X>/<X>.tsx` + `*.scss` | ported value by value through `Tokens` |

1. Read all three. `Tokens` keeps upstream's token names, so scss reads across directly:
   `cssUtils.$space-s` → `t.spaceS`, `$border-default` → `t.borderDefault`,
   `@include typography(body, small)` → `textStyle(el, typography(t, "body", "small"))`. A
   lucide icon is `ctx.icon("ChevronLeft", { size: 16 })`; an scss `stroke-width` of 2.5 is
   `stroke: 2.5` (another width needs a `StrokeWidth` in `src/render/lucide.ts`). A new type size
   and weight pair needs its cut in `INTER_CUTS`.
2. Write the `Component` in `src/components/`, register it in `src/components/index.ts`, and
   name the upstream files it was ported from in the file header.
3. Where gpui can't do what the scss does, keep the closest gpui form and add the difference to
   the file header and to [gpui-differences.md](gpui-differences.md).
4. Retained native state (inputs, sliders) goes through `ctx.retained(...)`; work that needs a
   live phase through `ctx.after(...)` (the surface's pump runs it and redraws this component's
   view); actions through `ctx.trigger(...)` (the pump runs them). A render reads session state
   only through tracked accessors: `ctx.field`, `ctx.form`, `ctx.streaming`, `ctx.queryLoading`,
   `ctx.viewportHeight`, `ctx.image`, or `ctx.watch(() => …)` for anything else; never
   `ctx.session` directly (handlers and `ctx.after` work may). A view redraws when what it read
   changes, so an untracked read leaves it stale.
5. Give the component a view of its own (`view(...)` in `src/components/index.ts`, setting
   `Component.view`) when its render cost grows with its content or it owns state that redraws
   often (hover, measuring, typing, loads). Its render must then return one element or null, and
   its parent must place it without restyling or inspecting it. A component that restyles the
   nodes it renders directly (the card blocks) sets `inlineChildren`: those draw inside its view,
   what they hold in views as anywhere else. A costly piece that is not a node (a step's
   markdown) goes through `ctx.piece(part, input, draw)`; a page-level overlay through
   `ctx.overlay(part, draw)`.
6. `bun run check`, then look at `bun run shot file.oui --mode light,dark` against
   upstream's scss and its render on [openui.com](https://openui.com).
