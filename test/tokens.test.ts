import { describe, expect, test } from "bun:test";
import { resolveTokens, toHex } from "./lib.ts";

const channels = (hex: string) => [1, 3, 5, 7].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe("toHex", () => {
  test.each([
    ["oklch(1 0 89.876 / 1)", "#ffffffff"],
    ["oklch(0 0 0 / 1)", "#000000ff"],
    ["oklch(0.6279554 0.25768 29.2338 / 1)", "#ff0000ff"], // sRGB red
    ["oklch(0.145 0 0 / 1)", "#0a0a0aff"],
    ["oklch(0 0 0 / 0.4)", "#00000066"],
  ])("%s -> %s", (oklch, hex) => {
    const got = channels(toHex(oklch));
    channels(hex).forEach((c, i) => expect(Math.abs(got[i]! - c)).toBeLessThanOrEqual(1));
  });
});

describe("resolveTokens", () => {
  test("upstream values arrive as gpui values, overrides win", () => {
    const t = resolveTokens("light", { background: "#123456" });
    expect(t.spaceS).toBe(8);
    expect(t.radiusFull).toBe(9999);
    expect(t.textBodyDefaultHeavy).toEqual({ size: 16, lineHeight: 1.5, weight: 560, family: "Inter" });
    expect(t.shadowM).toBe("sm");
    expect(t.background).toBe("#123456");
    expect(t.foreground).toMatch(/^#[0-9a-f]{8}$/);
  });
});
