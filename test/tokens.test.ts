import { describe, expect, test } from "bun:test";
import { cssColor, interFace, openuiFonts, resolveTokens, toHex, typography } from "./lib.ts";

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

describe("cssColor", () => {
  test.each([
    ["hsl(0, 100%, 50%)", "#ff0000ff"],
    ["hsl(120, 100%, 25%)", "#008000ff"],
    ["hsla(230, 8%, 24%, 0.5)", "#383a4280"],
    ["#d4d4d4", "#d4d4d4"],
    ["#abc", "#aabbcc"],
    ["rgba(0, 0, 0, 0.2)", "#00000033"],
    ["inherit", null],
  ])("%s -> %s", (css, hex) => {
    expect(cssColor(css)).toBe(hex as never);
  });
});

describe("resolveTokens", () => {
  test("upstream values arrive as gpui values, overrides win", () => {
    const t = resolveTokens("light", { background: "#123456" });
    expect(t.spaceS).toBe(8);
    expect(t.radiusFull).toBe(9999);
    expect(t.textBodyDefaultHeavy).toEqual({ size: 16, lineHeight: 1.5, weight: 560, families: ["Inter", "sans-serif"] });
    expect(t.shadowM).toBe("sm");
    expect(t.background).toBe("#123456");
    expect(t.foreground).toMatch(/^#[0-9a-f]{8}$/);
  });
});

describe("typography", () => {
  test("Regular and Medium styles take the theme's wght axis; headings and code keep fixed weights", () => {
    const light = resolveTokens("light");
    const dark = resolveTokens("dark");
    expect(typography(light, "body", "default").weight).toBe(440);
    expect(typography(dark, "body", "default").weight).toBe(420);
    expect(typography(dark, "label", "small-heavy").weight).toBe(560);
    expect(typography(light, "heading", "xl").weight).toBe(700);
    expect(typography(light, "code", "default").weight).toBe(400);
  });

  test("without a font resolver the host keeps its own face", () => {
    expect(typography(resolveTokens("light"), "body", "small").face).toBeUndefined();
  });

  test("with the shipped cuts, Inter resolves by size and weight and code walks its stack", () => {
    const installed = new Set(["OpenGPUI Inter 14", "Menlo"]);
    const t = resolveTokens("light", { fonts: openuiFonts((f) => installed.has(f)) });
    expect(typography(t, "body", "small")).toMatchObject({ face: "OpenGPUI Inter 14", weight: 440 });
    expect(typography(t, "heading", "large")).toMatchObject({ face: "OpenGPUI Inter 28", weight: 600 });
    expect(typography(t, "code", "default")).toMatchObject({ face: "Menlo", weight: 400 });
  });

  test("a host without the cuts falls through Inter's stack to its own font", () => {
    const t = resolveTokens("light", { fonts: openuiFonts(() => false) });
    expect(typography(t, "body", "default").face).toBeUndefined();
  });
});

describe("interFace", () => {
  test.each([
    [12, 440, "OpenGPUI Inter 14", 440], // below the axis: clamped to opsz 14
    [16, 560, "OpenGPUI Inter 16", 560],
    [20, 600, "OpenGPUI Inter 18", 600], // nearest optical size that has the weight
    [24, 440, "OpenGPUI Inter 18", 440], // no Regular display cut: nearest that has one
    [36, 700, "OpenGPUI Inter 32", 700],
    [16, 500, "OpenGPUI Inter 16", 440], // weight with no cut anywhere: nearest weight at that size
  ])("%dpx at %d -> %s %d", (size, weight, family, cutWeight) => {
    expect(interFace(size, weight)).toEqual({ family, weight: cutWeight });
  });
});
