// Upstream's own rendering of a .oui file, as the oracle for side-by-side
// comparison with `scripts/preview.ts`. React-ui draws the file with
// react-lang's `Renderer` inside react-ui's `ThemeProvider`, on a page styled
// the way OpenUI's docs set it up (Tailwind preflight, then react-ui's
// stylesheet), in InterVariable, in headless Chromium.
//
//   bun scripts/reference.ts setup
//       Check out OpenUI at the upstream.json pin into .reference/openui and
//       install what react-ui needs from upstream's lockfile; install
//       Playwright and its headless Chromium into .reference/; unpack the
//       pinned InterVariable fonts into .reference/fonts.
//   bun scripts/reference.ts serve [--port <n>]
//       Build the page and serve it (default port 6106); takes the shots.
//   bun scripts/reference.ts shot <file.oui> [options]
//       --out <file.png>        default tmp/reference/<file>-<mode>.png
//       --mode light|dark       ThemeProvider mode (default light)
//       --library openui|chat   openuiLibrary or openuiChatLibrary (default openui)
//       --width <css px>        page width, including the frame's space-l padding
//                               (default 720)
//       --wait <ms>             settle time after mount and fonts (default 500)
//       --port <n>              server port (default 6106)
//     Asks the running server for a PNG (device scale 2) and prints the URL
//     that shows the same render live. Works from any checkout: only the
//     server needs a set-up .reference/.
//
// .upstream/openui is never installed into: our build compiles sources from
// there and must keep resolving bare imports to our own node_modules.
import { $ } from "bun";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const root = join(import.meta.dir, "..");
const reference = join(root, ".reference");
const openui = join(reference, "openui");
const tools = join(reference, "tools");
const browsers = join(reference, "browsers");
const fonts = join(reference, "fonts");
const DEFAULT_PORT = 6106;
// Upstream's lockfile has no headless browser; this is the one we add, in .reference/tools.
const PLAYWRIGHT_CORE = "1.65.0";

const args = process.argv.slice(2);
const command = args.shift();

function fail(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

function usage(): never {
  fail(
    "usage: bun scripts/reference.ts setup | serve [--port <n>] | shot <file.oui> [--out <file.png>] [--mode light|dark] [--library openui|chat] [--width <px>] [--wait <ms>] [--port <n>]",
    2,
  );
}

function option(name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith("--")) fail(`${name} needs a value`, 2);
  args.splice(i, 2);
  return value;
}

const port = Number(option("--port") ?? DEFAULT_PORT);
if (!Number.isInteger(port) || port <= 0) fail("--port takes a port number", 2);

if (command === "setup") await setup();
else if (command === "serve") await serve();
else if (command === "shot") await shot();
else usage();

// ── setup ──

async function setup(): Promise<void> {
  const pin = await Bun.file(join(root, "upstream.json")).json();
  mkdirSync(reference, { recursive: true });

  // OpenUI at the pin, as its own checkout.
  if (!existsSync(join(openui, ".git"))) {
    await $`git clone --quiet --filter=blob:none --no-checkout ${pin.repo} ${openui}`;
  }
  const head = (await $`git -C ${openui} rev-parse HEAD`.nothrow().quiet().text()).trim();
  if (head !== pin.commit) {
    await $`git -C ${openui} fetch --quiet origin ${pin.commit}`.nothrow();
    await $`git -C ${openui} -c advice.detachedHead=false checkout --quiet --force ${pin.commit}`;
  }
  console.log(`openui   ${openui} at ${pin.commit}`);

  // react-ui and its workspace dependencies, at upstream's lockfile, with the
  // pnpm upstream names. Lifecycle scripts stay off: react-ui's `prepare`
  // would run its whole build, and the page compiles from source instead.
  const packageManager = (await Bun.file(join(openui, "package.json")).json()).packageManager as string;
  const pnpm = ["npx", "--yes", packageManager.split("+")[0]!];
  const env = { ...process.env, CI: "1" };
  await $`${pnpm} install --frozen-lockfile --ignore-scripts --filter @openuidev/react-ui...`.cwd(openui).env(env);
  // cssUtils.scss is generated from the default theme (gitignored upstream).
  await $`${pnpm} --filter @openuidev/react-ui run generate:css-utils`.cwd(openui).env(env).quiet();
  console.log(`react-ui installed (${packageManager})`);

  // Headless Chromium through Playwright, both inside .reference/.
  mkdirSync(tools, { recursive: true });
  await Bun.write(
    join(tools, "package.json"),
    JSON.stringify({ private: true, dependencies: { "playwright-core": PLAYWRIGHT_CORE } }, null, 2) + "\n",
  );
  await $`npm install --silent --no-audit --no-fund`.cwd(tools);
  await $`node ${join(tools, "node_modules", "playwright-core", "cli.js")} install --only-shell chromium`.env({
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browsers,
  });
  console.log(`browser  playwright-core ${PLAYWRIGHT_CORE}, chromium headless shell in ${browsers}`);

  // InterVariable (wght and opsz axes) from the release scripts/assets.ts pins.
  const inter = pin.assets.inter as { version: string; url: string; sha256: string };
  const cached = join(root, ".upstream", "assets", "cache", `Inter-${inter.version}.zip`);
  const zip = join(reference, `Inter-${inter.version}.zip`);
  if (!existsSync(zip)) {
    const bytes = existsSync(cached) ? readFileSync(cached) : new Uint8Array(await (await fetch(inter.url)).arrayBuffer());
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== inter.sha256) throw new Error(`Inter ${inter.version}: sha256 ${digest}, pinned ${inter.sha256}`);
    await Bun.write(zip, bytes);
  }
  mkdirSync(fonts, { recursive: true });
  await $`unzip -q -o ${zip} InterVariable.ttf InterVariable-Italic.ttf LICENSE.txt -d ${fonts}`;
  console.log(`fonts    InterVariable ${inter.version} in ${fonts}`);
}

// ── serve ──

async function serve(): Promise<void> {
  const missing = [
    join(openui, "packages", "react-ui", "node_modules"),
    join(openui, "packages", "react-ui", "src", "cssUtils.scss"),
    join(tools, "node_modules", "playwright-core"),
    join(fonts, "InterVariable.ttf"),
  ].filter((p) => !existsSync(p));
  if (missing.length) fail(`not set up (missing ${missing.join(", ")}): run \`bun scripts/reference.ts setup\``);
  // Vite and Playwright run under Node, as upstream's toolchain does.
  const child = Bun.spawn(["node", join(import.meta.dir, "reference", "server.mjs")], {
    stdio: ["inherit", "inherit", "inherit"],
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsers,
      REFERENCE_CONFIG: JSON.stringify({
        port,
        reactUi: join(openui, "packages", "react-ui"),
        tools,
        fonts,
        page: join(import.meta.dir, "reference", "page"),
        dist: join(reference, "page-dist"),
      }),
    },
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
  process.exit(await child.exited);
}

// ── shot ──

async function shot(): Promise<void> {
  const mode = option("--mode") ?? "light";
  const library = option("--library") ?? "openui";
  const width = Number(option("--width") ?? 720);
  const wait = Number(option("--wait") ?? 500);
  const outOption = option("--out");
  const fileArg = args.shift();
  if (!fileArg || args.length) usage();
  if (mode !== "light" && mode !== "dark") fail(`--mode is light or dark, not ${mode}`, 2);
  if (library !== "openui" && library !== "chat") fail(`--library is openui or chat, not ${library}`, 2);
  if (!(width > 0) || !(wait >= 0)) fail("--width and --wait take positive numbers", 2);
  const file = resolve(fileArg);
  if (!existsSync(file)) fail(`${file} does not exist`);
  const stem = basename(file).replace(/\.[^.]*$/, "");
  const out = resolve(outOption ?? join(root, "tmp", "reference", `${stem}-${mode}.png`));

  const query = new URLSearchParams({ file, mode, library, width: String(width) });
  const base = `http://127.0.0.1:${port}`;
  let response: Response;
  try {
    response = await fetch(`${base}/shot?${query}&wait=${wait}`);
  } catch {
    fail(`no reference server on ${base}: start one with \`bun scripts/reference.ts serve\` in a checkout where setup ran`);
  }
  if (!response.ok) fail(`shot failed (${response.status}): ${await response.text()}`);
  mkdirSync(dirname(out), { recursive: true });
  await Bun.write(out, await response.arrayBuffer());
  for (const error of JSON.parse(response.headers.get("x-reference-errors") ?? "[]") as string[]) {
    console.error(`upstream error: ${error}`);
  }
  console.log(`shot   ${out}`);
  console.log(`live   ${base}/?${query}`);
}
