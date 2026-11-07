// The update notice (docs/agent-contract.md, Updating): `show` and `--version` tell the agent
// when a newer openGPUI release is out, so it can offer the person the update the skill
// describes. At most one request a day to GitHub's API, its answer cached under the Herdr home;
// any failure is silent and never fails or noticeably slows a command. Nothing is downloaded or
// changed here: updating is the agent's job, with the person's consent.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const LATEST = "https://api.github.com/repos/lukachi/openGPUI/releases/latest";
const RELEASES = "https://github.com/lukachi/openGPUI/releases/latest";
const DAY_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 1500;

interface Checked {
  /** When the API was last asked (ms), answered or not: an offline machine asks once a day too. */
  checkedAt: number;
  /** The latest release's version without the `v`, and its tarball, from the last answer. */
  version?: string;
  url?: string;
}

/** a > b for `x.y.z` versions (missing parts are 0). */
export function newer(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

function read(path: string): Checked | null {
  try {
    const v = JSON.parse(readFileSync(path, "utf8")) as Checked;
    return typeof v.checkedAt === "number" ? v : null;
  } catch {
    return null;
  }
}

async function ask(previous: Checked | null): Promise<Checked> {
  const checked: Checked = { ...previous, checkedAt: Date.now() };
  try {
    const res = await fetch(LATEST, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return checked;
    const release = (await res.json()) as { tag_name?: string; assets?: { name?: string; browser_download_url?: string }[] };
    const tag = release.tag_name;
    if (!tag?.startsWith("v")) return checked;
    const tarball = release.assets?.find((a) => a.name?.endsWith(".tar.gz"))?.browser_download_url;
    return { checkedAt: checked.checkedAt, version: tag.slice(1), url: tarball ?? RELEASES };
  } catch {
    return checked;
  }
}

/**
 * The notice for the agent when a release newer than `current` is out, else null. `home` is the
 * Herdr home (the cache lives in its `opengpui/`), `modFolder` the folder this CLI ships in (the
 * one an update replaces). `OPENGPUI_NO_UPDATE_CHECK=1` turns it off.
 */
export async function updateNotice(home: string, current: string, modFolder: string): Promise<string | null> {
  if (process.env.OPENGPUI_NO_UPDATE_CHECK) return null;
  const cache = join(home, "opengpui", "update-check.json");
  let checked = read(cache);
  if (!checked || Date.now() - checked.checkedAt > DAY_MS) {
    checked = await ask(checked);
    try {
      mkdirSync(dirname(cache), { recursive: true });
      writeFileSync(cache, JSON.stringify(checked));
    } catch {
      // A read-only home only means asking again next time.
    }
  }
  if (!checked.version || !newer(checked.version, current)) return null;
  return [
    `opengpui ${checked.version} is out (this is ${current}). Tell the person; update only if they agree (\`opengpui skill\`, "Updating").`,
    `  release: ${checked.url ?? RELEASES}`,
    `  mod folder: ${modFolder}`,
  ].join("\n");
}
