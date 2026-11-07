// The worked examples `opengpui examples` hands agents (skills/opengpui/examples/) must pass
// `opengpui check`: an agent copies them.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dir, "..", "skills", "opengpui", "examples");
const CLI = join(import.meta.dir, "..", "herdr", "mods", "opengpui", "cli", "opengpui");
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".oui"));

describe("diagram examples", () => {
  test.each(FILES)("%s passes check", (file) => {
    const run = spawnSync(CLI, ["check", join(DIR, file)], { encoding: "utf8" });
    expect(run.stdout + run.stderr).toStartWith("ok:");
    expect(run.status).toBe(0);
  });

  test("the CLI lists every example file and prints each", () => {
    const list = spawnSync(CLI, ["examples"], { encoding: "utf8" }).stdout;
    const names = FILES.map((f) => f.replace(/\.oui$/, ""));
    for (const name of names) expect(list).toMatch(new RegExp(`^${name} `, "m"));
    const one = spawnSync(CLI, ["examples", "sequence"], { encoding: "utf8" });
    expect(one.stdout).toContain("Sequence(");
    expect(spawnSync(CLI, ["examples", "nope"], { encoding: "utf8" }).status).toBe(2);
  });
});
