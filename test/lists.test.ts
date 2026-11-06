import { describe, expect, test } from "bun:test";
import { freshSectionOpenState, getRowConfiguration, syncSectionOpen, toggleSection } from "../src/components/lists-state.ts";

describe("getRowConfiguration (OptionCards rows)", () => {
  test("rows of three, with a two split so no card sits alone", () => {
    expect(getRowConfiguration(0, 3)).toEqual([]);
    expect(getRowConfiguration(1, 3)).toEqual([1]);
    expect(getRowConfiguration(2, 3)).toEqual([2]);
    expect(getRowConfiguration(3, 3)).toEqual([3]);
    expect(getRowConfiguration(4, 3)).toEqual([2, 2]);
    expect(getRowConfiguration(5, 3)).toEqual([3, 2]);
    expect(getRowConfiguration(7, 3)).toEqual([3, 2, 2]);
    // The two goes to the middle of the threes (splice at ceil(rows / 2)).
    expect(getRowConfiguration(8, 3)).toEqual([3, 2, 3]);
    expect(getRowConfiguration(11, 3)).toEqual([3, 3, 2, 3]);
  });

  test("every card is placed exactly once", () => {
    for (let n = 1; n <= 30; n++) expect(getRowConfiguration(n, 3).reduce((a, b) => a + b, 0)).toBe(n);
  });
});

describe("SectionBlock open sections", () => {
  const values = (...names: string[]) => names;

  test("a complete response opens the first section only", () => {
    const s = freshSectionOpenState();
    syncSectionOpen(s, values("a", "b", "c"), false);
    expect(s.open).toEqual(["a"]);
  });

  test("while streaming each arriving section opens", () => {
    const s = freshSectionOpenState();
    syncSectionOpen(s, values("a"), true);
    expect(s.open).toEqual(["a"]);
    syncSectionOpen(s, values("a", "b"), true);
    expect(s.open).toEqual(["a", "b"]);
    syncSectionOpen(s, values("a", "b", "c"), true);
    expect(s.open).toEqual(["a", "b", "c"]);
  });

  test("when streaming ends only the first stays open", () => {
    const s = freshSectionOpenState();
    syncSectionOpen(s, values("a", "b", "c"), true);
    syncSectionOpen(s, values("a", "b", "c"), false);
    expect(s.open).toEqual(["a"]);
  });

  test("a person's choice stops both the following and the final collapse", () => {
    const s = freshSectionOpenState();
    // The first pass over a whole response sees every section arrive, so only the last opens.
    syncSectionOpen(s, values("a", "b"), true);
    expect(s.open).toEqual(["b"]);
    toggleSection(s, "a");
    expect(s.open).toEqual(["b", "a"]);
    syncSectionOpen(s, values("a", "b", "c"), true);
    expect(s.open).toEqual(["b", "a"]);
    syncSectionOpen(s, values("a", "b", "c"), false);
    expect(s.open).toEqual(["b", "a"]);
  });

  test("with every section shut, a section arriving opens the first one even after a choice (upstream's else branch)", () => {
    const s = freshSectionOpenState();
    syncSectionOpen(s, values("a"), true);
    toggleSection(s, "a");
    expect(s.open).toEqual([]);
    syncSectionOpen(s, values("a", "b"), true);
    expect(s.open).toEqual(["a"]);
  });

  test("sections open and shut independently", () => {
    const s = freshSectionOpenState();
    syncSectionOpen(s, values("a", "b"), false);
    toggleSection(s, "b");
    expect(s.open).toEqual(["a", "b"]);
    toggleSection(s, "a");
    expect(s.open).toEqual(["b"]);
    // Shutting everything leaves it shut: the first section is not reopened.
    toggleSection(s, "b");
    syncSectionOpen(s, values("a", "b"), false);
    expect(s.open).toEqual([]);
  });

  test("the first section opens once it arrives, after a start with none", () => {
    const s = freshSectionOpenState();
    syncSectionOpen(s, values(), false);
    expect(s.open).toEqual([]);
    syncSectionOpen(s, values("a"), false);
    expect(s.open).toEqual(["a"]);
  });
});
