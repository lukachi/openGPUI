// Fetch, verify and build what the Herdr mod ships, into .upstream/assets:
//   fonts/          static Inter cuts at OpenUI's (optical size, weight) pairs,
//                   tracked -1% (src/render/fonts.ts says which), plus the OFL
//   icons/          lucide SVGs at the version react-ui depends on, plus the ISC license
//   lucide-map.js   lucide-react's icon name → file table, which upstream's
//                   icon resolver (components/_shared/icons) is compiled against
// Pins are upstream.json "assets". Font cutting runs fontTools' command-line
// tools through `uvx` (https://docs.astral.sh/uv/). Work is skipped when the
// output already matches the pins.
//   bun scripts/assets.ts
import { $ } from "bun";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { INTER_CUTS, INTER_ITALIC_CUTS, INTER_TRACKING_EM, interFamily } from "../src/render/fonts.ts";
import { LUCIDE_STROKE_WIDTHS, lucideFile } from "../src/render/lucide.ts";

const root = join(import.meta.dir, "..");
const out = join(root, ".upstream", "assets");
const cache = join(out, "cache");
const pins = (await Bun.file(join(root, "upstream.json")).json()).assets as {
  inter: { version: string; url: string; sha256: string };
  lucide: { version: string; staticIntegrity: string };
  fonttools: string;
};

// Latin with extensions, Greek, Cyrillic, punctuation, currency, arrows, math, shapes.
const UNICODES = "U+0000-024F,U+0300-036F,U+0370-03FF,U+0400-04FF,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF,U+2200-22FF,U+25A0-25FF";

mkdirSync(cache, { recursive: true });

/** Download `url` once into the cache, checking an SRI integrity or a sha256 hex digest. */
async function fetchPinned(url: string, file: string, check: { sha256: string } | { integrity: string }): Promise<string> {
  const path = join(cache, file);
  const bytes = existsSync(path) ? new Uint8Array(await Bun.file(path).arrayBuffer()) : await download(url);
  if ("sha256" in check) {
    const got = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
    if (got !== check.sha256) throw new Error(`${file}: sha256 ${got}, pinned ${check.sha256}`);
  } else {
    const [algo, want] = check.integrity.split("-", 2) as ["sha512", string];
    const got = new Bun.CryptoHasher(algo).update(bytes).digest("base64");
    if (got !== want) throw new Error(`${file}: ${algo} ${got}, pinned ${want}`);
  }
  if (!existsSync(path)) await Bun.write(path, bytes);
  return path;
}

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Rebuild `dir` only when `stamp` (what it was built from) changed. */
async function stale(dir: string, stamp: unknown): Promise<boolean> {
  const file = join(dir, ".stamp.json");
  const want = JSON.stringify(stamp);
  if (existsSync(file) && (await Bun.file(file).text()) === want) return false;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return true;
}

async function stampDone(dir: string, stamp: unknown): Promise<void> {
  await Bun.write(join(dir, ".stamp.json"), JSON.stringify(stamp));
}

// ── Icons ──

async function icons(): Promise<void> {
  const { version } = pins.lucide;
  // react-ui must depend on this lucide release, and its lockfile vouches for lucide-react.
  const reactUi = await Bun.file(join(root, ".upstream", "openui", "packages", "react-ui", "package.json")).json();
  const wanted = String(reactUi.dependencies?.["lucide-react"] ?? reactUi.peerDependencies?.["lucide-react"] ?? "");
  if (wanted.replace(/^[\^~]/, "") !== version) {
    throw new Error(`react-ui wants lucide-react ${wanted}, upstream.json pins ${version}: update assets.lucide`);
  }
  const lock = await Bun.file(join(root, ".upstream", "openui", "pnpm-lock.yaml")).text();
  const lockIntegrity = new RegExp(`\\n  lucide-react@${version.replace(/\./g, "\\.")}:\\n    resolution: \\{integrity: (\\S+)\\}`).exec(lock)?.[1];
  if (!lockIntegrity) throw new Error(`lucide-react@${version} is not in upstream's pnpm-lock.yaml`);

  const stamp = { version, strokes: LUCIDE_STROKE_WIDTHS, v: 1 };
  const dir = join(out, "icons");
  if (!(await stale(dir, stamp)) && existsSync(join(out, "lucide-map.js"))) return;

  const reactTgz = await fetchPinned(
    `https://registry.npmjs.org/lucide-react/-/lucide-react-${version}.tgz`,
    `lucide-react-${version}.tgz`,
    { integrity: lockIntegrity },
  );
  const staticTgz = await fetchPinned(
    `https://registry.npmjs.org/lucide-static/-/lucide-static-${version}.tgz`,
    `lucide-static-${version}.tgz`,
    { integrity: pins.lucide.staticIntegrity },
  );
  const work = join(cache, `lucide-${version}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, "react"), { recursive: true });
  mkdirSync(join(work, "static"), { recursive: true });
  await $`tar xzf ${reactTgz} -C ${join(work, "react")} package/dist/esm/dynamicIconImports.js`;
  await $`tar xzf ${staticTgz} -C ${join(work, "static")} package/icons package/LICENSE`;

  // `"alarm-check": () => import('./icons/alarm-clock-check.js')` → alarm-check → alarm-clock-check
  const source = await Bun.file(join(work, "react", "package", "dist", "esm", "dynamicIconImports.js")).text();
  const entries = [...source.matchAll(/"([^"]+)": \(\) => import\('\.\/icons\/([^']+)\.js'\)/g)].map((m) => [m[1]!, m[2]!] as const);
  if (entries.length < 1000) throw new Error(`lucide-react ${version}: unexpected dynamicIconImports.js (${entries.length} icons)`);
  const files = new Set(entries.map(([, file]) => file));
  for (const file of files) {
    const svg = join(work, "static", "package", "icons", `${file}.svg`);
    if (!existsSync(svg)) throw new Error(`lucide-static ${version} has no ${file}.svg`);
    const source = await Bun.file(svg).text();
    if (!source.includes(`stroke-width="2"`)) throw new Error(`${file}.svg: no stroke-width="2" to restyle`);
    for (const stroke of LUCIDE_STROKE_WIDTHS) {
      await Bun.write(join(dir, `${lucideFile(file, stroke)}.svg`), source.replace(`stroke-width="2"`, `stroke-width="${stroke}"`));
    }
  }
  await Bun.write(join(dir, "LICENSE-lucide.txt"), Bun.file(join(work, "static", "package", "LICENSE")));
  // Upstream's resolver only asks whether a name has an import thunk; here the
  // thunk answers the SVG's file name instead of importing a React component.
  const map = entries.map(([name, file]) => `  ${JSON.stringify(name)}: () => ${JSON.stringify(file)},`).join("\n");
  await Bun.write(
    join(out, "lucide-map.js"),
    `// Generated by scripts/assets.ts from lucide-react ${version} dynamicIconImports.\nexport default {\n${map}\n};\n`,
  );
  rmSync(work, { recursive: true, force: true });
  await stampDone(dir, stamp);
  console.log(`icons    ${files.size} lucide ${version} SVGs × strokes ${LUCIDE_STROKE_WIDTHS.join(", ")}, ${entries.length} names`);
}

// ── Fonts ──

const fonttools = (tool: string) => ["uvx", "--quiet", "--from", `fonttools==${pins.fonttools}`, tool];

async function run(cmd: string[]): Promise<void> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
  if (code !== 0) throw new Error(`${cmd.slice(4).join(" ")} failed:\n${stderr}`);
}

/** Rename to the cut's own family and tighten every advance by `trackingUnits`. */
function editTables(ttx: string, opsz: number, weight: number, italic: boolean, trackingUnits: number): string {
  const family = interFamily(opsz);
  const style = italic ? " Italic" : "";
  const id = `OpenGPUIInter${opsz}-W${weight}${italic ? "Italic" : ""}`;
  const names: [number, string][] = [
    [1, family],
    [2, italic ? "Italic" : "Regular"],
    [3, `${id};${pins.inter.version}`],
    [4, `${family} W${weight}${style}`],
    [6, id],
    [16, family],
    [17, `W${weight}${style}`],
  ];
  const replaced = new Set([1, 2, 3, 4, 6, 16, 17, 21, 22, 25]);
  const records = names
    .map(([nameID, value]) => `    <namerecord nameID="${nameID}" platformID="3" platEncID="1" langID="0x409">\n      ${value}\n    </namerecord>`)
    .join("\n");
  return ttx
    .replace(/\s*<namerecord nameID="(\d+)"[^>]*>[\s\S]*?<\/namerecord>/g, (all, nameID) => (replaced.has(Number(nameID)) ? "" : all))
    .replace("</name>", `${records}\n  </name>`)
    .replace(/<mtx name="([^"]+)" width="(\d+)" lsb="(-?\d+)"\/>/g, (all, name, width, lsb) =>
      Number(width) > 0 ? `<mtx name="${name}" width="${Math.max(0, Number(width) + trackingUnits)}" lsb="${lsb}"/>` : all,
    );
}

async function cut(variable: string, dir: string, opsz: number, weight: number, italic: boolean): Promise<void> {
  const name = `OpenGPUIInter${opsz}-W${weight}${italic ? "Italic" : ""}`;
  const base = join(cache, `cut-${name}`);
  await run([...fonttools("fonttools"), "varLib.instancer", variable, `wght=${weight}`, `opsz=${opsz}`, "-q", "-o", `${base}-instance.ttf`]);
  await run([
    ...fonttools("fonttools"),
    "subset",
    `${base}-instance.ttf`,
    `--unicodes=${UNICODES}`,
    "--layout-features=*",
    "--name-IDs=*",
    "--name-languages=*",
    `--output-file=${base}-subset.ttf`,
  ]);
  await run([...fonttools("ttx"), "-q", "-t", "head", "-t", "name", "-t", "hmtx", "-o", `${base}.ttx`, `${base}-subset.ttf`]);
  const ttx = await Bun.file(`${base}.ttx`).text();
  const upem = Number(/<unitsPerEm value="(\d+)"\/>/.exec(ttx)?.[1]);
  if (!upem) throw new Error(`no unitsPerEm in ${base}.ttx`);
  await Bun.write(`${base}.ttx`, editTables(ttx, opsz, weight, italic, Math.round(INTER_TRACKING_EM * upem)));
  await run([...fonttools("ttx"), "-q", "-m", `${base}-subset.ttf`, "-o", join(dir, `${name}.ttf`), `${base}.ttx`]);
  for (const suffix of ["-instance.ttf", "-subset.ttf", ".ttx"]) rmSync(base + suffix, { force: true });
}

async function fonts(): Promise<void> {
  const stamp = {
    inter: pins.inter.version,
    fonttools: pins.fonttools,
    cuts: INTER_CUTS,
    italic: INTER_ITALIC_CUTS,
    tracking: INTER_TRACKING_EM,
    UNICODES,
    v: 1,
  };
  const dir = join(out, "fonts");
  if (!(await stale(dir, stamp))) return;
  if (!Bun.which("uvx")) throw new Error("cutting fonts needs `uvx`: install uv (https://docs.astral.sh/uv/)");

  const zip = await fetchPinned(pins.inter.url, `Inter-${pins.inter.version}.zip`, { sha256: pins.inter.sha256 });
  const work = join(cache, `inter-${pins.inter.version}`);
  await $`unzip -q -o ${zip} InterVariable.ttf InterVariable-Italic.ttf LICENSE.txt -d ${work}`;

  const jobs = [
    ...Object.entries(INTER_CUTS).flatMap(([opsz, weights]) => weights.map((weight) => [Number(opsz), weight, false] as const)),
    ...Object.entries(INTER_ITALIC_CUTS).flatMap(([opsz, weights]) => weights.map((weight) => [Number(opsz), weight, true] as const)),
  ];
  // A few cuts at a time: each is CPU-bound in its own process.
  for (let i = 0; i < jobs.length; i += 4) {
    await Promise.all(
      jobs
        .slice(i, i + 4)
        .map(([opsz, weight, italic]) =>
          cut(join(work, italic ? "InterVariable-Italic.ttf" : "InterVariable.ttf"), dir, opsz, weight, italic),
        ),
    );
  }
  await Bun.write(join(dir, "LICENSE-Inter.txt"), Bun.file(join(work, "LICENSE.txt")));
  await stampDone(dir, stamp);
  const count = readdirSync(dir).filter((f) => f.endsWith(".ttf")).length;
  console.log(`fonts    ${count} Inter ${pins.inter.version} cuts`);
}

await icons();
await fonts();
console.log(`assets   ${out}`);
