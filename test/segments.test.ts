// SingleStackedBarChart's segment widths: what the browser's flex row makes of
// percent widths, gaps and a minimum width. Plain TypeScript, loaded from source.
import { describe, expect, test } from "bun:test";
import { MIN_SEGMENT, segmentWidths } from "../src/components/charts/segments.ts";

const sum = (widths: number[]) => widths.reduce((a, b) => a + b, 0);

describe("segmentWidths", () => {
  test("gaps shrink every segment in proportion, so the row ends exactly at the track", () => {
    const widths = segmentWidths([0.5, 0.3, 0.2], 1000, 2);
    expect(sum(widths) + 2 * 2).toBeCloseTo(1000, 6);
    expect(widths[0]! / widths[1]!).toBeCloseTo(0.5 / 0.3, 6);
  });

  test("a lone segment fills the track", () => {
    expect(segmentWidths([1], 400, 2)).toEqual([400]);
  });

  test("a segment under the minimum freezes at it and the others give up the difference", () => {
    const widths = segmentWidths([0.999, 0.0005, 0.0005], 1000, 1);
    expect(widths[1]).toBe(MIN_SEGMENT);
    expect(widths[2]).toBe(MIN_SEGMENT);
    expect(sum(widths) + 2).toBeCloseTo(1000, 6);
  });

  test("all-zero shares give every segment the minimum", () => {
    expect(segmentWidths([0, 0, 0], 600, 2)).toEqual([MIN_SEGMENT, MIN_SEGMENT, MIN_SEGMENT]);
  });

  test("a track too narrow for the minimums keeps them (the row overflows, as flex does)", () => {
    const widths = segmentWidths([0.5, 0.5], 3, 1);
    expect(widths).toEqual([MIN_SEGMENT, MIN_SEGMENT]);
  });
});
