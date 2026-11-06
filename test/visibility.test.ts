// The legend toggle rule shared by the cartesian and scatter charts: any series
// can be hidden and shown again, but never the last visible one.
import { describe, expect, test } from "bun:test";
import { toggleHidden } from "../src/components/charts/visibility.ts";

describe("toggleHidden", () => {
  test("hides a visible series and shows a hidden one again", () => {
    const hidden = toggleHidden(new Set(), ["a", "b", "c"], "b");
    expect([...hidden!]).toEqual(["b"]);
    expect(toggleHidden(hidden!, ["a", "b", "c"], "b")!.size).toBe(0);
  });

  test("refuses to hide the last visible series", () => {
    expect(toggleHidden(new Set(["a", "b"]), ["a", "b", "c"], "c")).toBeNull();
    expect(toggleHidden(new Set(), ["only"], "only")).toBeNull();
  });

  test("a hidden key that no longer exists does not count against the guard", () => {
    expect(toggleHidden(new Set(["gone"]), ["a", "b"], "a")!.has("a")).toBe(true);
  });

  test("never changes the set it was given", () => {
    const hidden = new Set(["a"]);
    toggleHidden(hidden, ["a", "b", "c"], "b");
    expect([...hidden]).toEqual(["a"]);
  });
});
