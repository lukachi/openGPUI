// Herdr's diagram layouter (docs/diagram.md): the pane can't run elkjs itself (no WebAssembly,
// and a layout can pass gpui-shell's task budget), so it hands each sized graph to the mod's own
// CLI, `cli/opengpui layout <in> <out>`, through `exec`, off the pane's thread.
//
//   opengpui/layout/<key>.json      a layout, named by layoutKey(graph): a hit is read at once
//   opengpui/layout/<key>.in.json   the graph while its layout runs, removed after
//
// The launcher is the one `opengpui show` passed as the `cli` prop, else the installed mod's.
// Panes of every tab and mod copy share the folder: the CLI writes `<key>.json` through a file of
// its own and a rename, so a reader never sees half of it; a run that fails while another pane
// writes the same key (its input rewritten or removed under it) looks for that pane's result and
// otherwise runs once more. Layouts of one graph asked by several panes of this load share a run.
// Once per mod load, layouts older than KEEP_DAYS go (a later ask lays the graph out again), and
// inputs and partial outputs older than an hour (a run that died).
import { exists, mkdir, readFile, unlink, writeFile } from "fs/promises";
import { appHome, exec } from "herdr";
import { join } from "path";
import { layoutKey, type DiagramLayout, type DiagramLayouter, type SizedGraph } from "../../src/index.ts";

/** The cache folder, under the Herdr home. */
const CACHE = "opengpui/layout";
const KEEP_DAYS = 30;
const PARTIAL_MINUTES = 60;

const running = new Map<string, Promise<DiagramLayout>>();
let pruned: Promise<void> | null = null;

/** The Surface `layout` option; `cli` is the `opengpui` launcher (the `cli` prop). */
export function herdrLayout(cli: string | undefined): DiagramLayouter {
  const launcher = cli ?? join(appHome(), "mods", "opengpui", "cli", "opengpui");
  return (graph) => {
    const key = layoutKey(graph);
    let job = running.get(key);
    if (!job) {
      job = layout(launcher, key, graph).finally(() => running.delete(key));
      running.set(key, job);
    }
    return job;
  };
}

async function layout(launcher: string, key: string, graph: SizedGraph): Promise<DiagramLayout> {
  const dir = join(appHome(), CACHE);
  const output = join(dir, `${key}.json`);
  const cached = await read(output);
  if (cached) return cached;
  await mkdir(dir, { recursive: true });
  await (pruned ??= prune(dir));
  const input = join(dir, `${key}.in.json`);
  try {
    for (let attempt = 1; ; attempt++) {
      await writeFile(input, JSON.stringify(graph));
      const r = await exec(launcher, ["layout", input, output]).catch((e: unknown) => {
        throw new Error(`can't run ${launcher}: ${e instanceof Error ? e.message : e}`);
      });
      const done = await read(output);
      if (done) return done;
      if (attempt === 2) throw new Error(r.stderr.trim() || `${launcher} layout exited with ${r.code}`);
    }
  } finally {
    await unlink(input).catch(() => {});
  }
}

/** A layout file, or null when it isn't there (or isn't one: then it goes). */
async function read(path: string): Promise<DiagramLayout | null> {
  if (!(await exists(path))) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as DiagramLayout;
  } catch {
    await unlink(path).catch(() => {});
    return null;
  }
}

async function prune(dir: string): Promise<void> {
  await exec("find", [
    dir, "-maxdepth", "1", "-type", "f",
    "(", "(", "-name", "*.in.json", "-o", "-name", "*.tmp", ")", "-mmin", `+${PARTIAL_MINUTES}`,
    "-o", "-name", "*.json", "-mtime", `+${KEEP_DAYS}`, ")",
    "-delete",
  ]).catch(() => null);
}
