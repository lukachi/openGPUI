// Check out the pinned OpenUI commit into .upstream/openui.
//   bun scripts/sync-upstream.ts            -> the commit in upstream.json
//   bun scripts/sync-upstream.ts --to main  -> move the pin to that ref, then check it out
import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const pinFile = join(root, "upstream.json");
const pin = await Bun.file(pinFile).json();
const dir = join(root, ".upstream", "openui");

if (!existsSync(join(dir, ".git"))) {
  await $`git clone --filter=blob:none --no-checkout ${pin.repo} ${dir}`.quiet();
}
const toIndex = process.argv.indexOf("--to");
if (toIndex > 0) {
  const ref = process.argv[toIndex + 1];
  await $`git -C ${dir} fetch --quiet origin ${ref}`;
  pin.commit = (await $`git -C ${dir} rev-parse FETCH_HEAD`.text()).trim();
  await Bun.write(pinFile, JSON.stringify(pin, null, 2) + "\n");
} else {
  await $`git -C ${dir} fetch --quiet origin ${pin.commit}`.nothrow();
}
await $`git -C ${dir} -c advice.detachedHead=false checkout --quiet --force ${pin.commit}`;
console.log(`upstream openui at ${pin.commit}`);

// Type-checking reads the npm @openuidev/lang-core declarations while the build
// compiles the pinned source: they must be the same release.
const upstreamVersion = (await Bun.file(join(dir, "packages", "lang-core", "package.json")).json()).version;
const typesVersion = (await Bun.file(join(root, "node_modules", "@openuidev", "lang-core", "package.json")).json()).version;
if (upstreamVersion !== typesVersion) {
  console.error(
    `lang-core ${upstreamVersion} at the pin, but ${typesVersion} for types: run \`bun add -d @openuidev/lang-core@${upstreamVersion}\``,
  );
  process.exit(1);
}
