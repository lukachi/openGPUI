import { describe, expect, test } from "bun:test";
import {
  canUseNative,
  dots,
  formatNumber,
  fromNative,
  hasMinStepBetween,
  holdApart,
  MAX_STEPS,
  stepCount,
  toNative,
  typedNumber,
  valueErrors,
} from "../src/components/slider-values.ts";

describe("formatNumber", () => {
  test("matches upstream's Intl compact short, lowercased", () => {
    const intl = (n: number) =>
      new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(n).toLowerCase();
    const samples = [
      1000, 1049, 1050, 1500, 1999, 2500, 9949, 9950, 9999, 10000, 10499, 12345, 99999, 100000, 999499, 999500, 999999,
      1000000, 1200000, 2500000, 99999999, 1e9, 1.5e9, 999999999999, 1e12, 7e12, 1234.5,
    ];
    for (const n of samples) expect(formatNumber(n)).toBe(intl(n));
  });

  test("below 1000 it is the plain number; undefined is empty", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(-5000)).toBe("-5000");
    expect(formatNumber(2.5)).toBe("2.5");
    expect(formatNumber(undefined)).toBe("");
  });
});

describe("valueErrors", () => {
  test("a single value is checked against the range", () => {
    expect(valueErrors([50], 0, 100)).toEqual({ min: "", max: "Invalid number" });
    expect(valueErrors([150], 0, 100).min).toBe("Value must be between 0 and 100");
    expect(valueErrors([-1], 0, 100).min).toBe("Value must be between 0 and 100");
    expect(valueErrors([Number.NaN], 0, 100).min).toBe("Invalid number");
  });

  test("a range reports each end, and an inverted pair as Min must be less than max", () => {
    expect(valueErrors([10, 90], 0, 100)).toEqual({ min: "", max: "" });
    expect(valueErrors([10, 200], 0, 100)).toEqual({ min: "", max: "Value must be between 0 and 100" });
    expect(valueErrors([80, 20], 0, 100)).toEqual({ min: "Min must be less than max", max: "" });
  });
});

describe("typedNumber", () => {
  test("anything Number() accepts, including an empty text as 0", () => {
    expect(typedNumber("42")).toBe(42);
    expect(typedNumber("-3.5")).toBe(-3.5);
    expect(typedNumber("")).toBe(0);
    expect(typedNumber("12a")).toBeUndefined();
  });
});

describe("dots", () => {
  test("one dot per step, lit up to a single value", () => {
    const d = dots(0, 10, 5, [5]);
    expect(d.map((x) => x.position)).toEqual([0, 50, 100]);
    expect(d.map((x) => x.active)).toEqual([true, true, false]);
  });

  test("a range lights the dots between its ends", () => {
    const d = dots(0, 10, 2, [2, 6]);
    expect(d.map((x) => x.active)).toEqual([false, true, true, true, false, false]);
  });

  test("a step that does not divide the range leaves the end without a dot", () => {
    expect(dots(0, 10, 4, [0]).map((x) => x.position)).toEqual([0, 40, 80]);
  });

  test("a step that cannot be drawn gives no dots instead of looping", () => {
    expect(dots(0, 10, 0, [0])).toEqual([]);
    expect(dots(0, 10, -1, [0])).toEqual([]);
    expect(dots(0, 10000, 0.001, [0])).toEqual([]);
  });
});

describe("stepCount", () => {
  test("counts the steps of a usable slider", () => {
    expect(stepCount(500, 10000, 500)).toBe(19);
    expect(stepCount(0, 10, 4)).toBe(2);
  });

  test("a span or step that props still streaming can leave behind is not a slider", () => {
    expect(stepCount(500, 100, 1)).toBeNull();
    expect(stepCount(0, 0, 1)).toBeNull();
    expect(stepCount(0, 10, 0)).toBeNull();
    expect(stepCount(0, Number.POSITIVE_INFINITY, 1)).toBeNull();
    expect(stepCount(0, 10, Number.NaN)).toBeNull();
    expect(stepCount(0, MAX_STEPS + 1, 1)).toBeNull();
    expect(stepCount(0, MAX_STEPS, 1)).toBe(MAX_STEPS);
  });
});

describe("the native slider's domain", () => {
  test("a native slider needs max > min and a positive step", () => {
    expect(canUseNative(500, 10000, 500)).toBe(true);
    expect(canUseNative(500, 100, 1)).toBe(false);
    expect(canUseNative(0, 100, 0)).toBe(false);
    expect(canUseNative(0, Number.NaN, 1)).toBe(false);
  });

  test("values are shifted to start at 0 and clamped to the range", () => {
    expect(toNative([2500], 500, 10000)).toEqual([2000]);
    expect(toNative([100, 800], 0, 1000)).toEqual([100, 800]);
    expect(toNative([150], 0, 100)).toEqual([100]);
    expect(toNative([-5, 3], 1, 10)).toEqual([0, 2]);
  });

  test("a drag reports upstream's value: shifted back and rounded to the step's decimals", () => {
    expect(fromNative([2000], 500, 10000, 500)).toEqual([2500]);
    // 0.1 + 2 * 0.1 is 0.30000000000000004; Radix reports 0.3.
    expect(fromNative([0.2], 0.1, 10, 0.1)).toEqual([0.3]);
    expect(fromNative([0.30000000000000004], 0, 10, 0.1)).toEqual([0.3]);
    expect(fromNative([0.9], 0.2, 10, 0.1)).toEqual([1.1]);
    expect(fromNative([5.1], 1.1, 10, 0.1)).toEqual([6.2]);
  });

  test("a drag value snaps to the step and stays in the range", () => {
    expect(fromNative([32], 0, 100, 5)).toEqual([30]);
    expect(fromNative([38], 0, 100, 5)).toEqual([40]);
    expect(fromNative([140], 10, 100, 5)).toEqual([100]);
  });
});

describe("hasMinStepBetween", () => {
  test("thumbs closer than one step are not a value (minStepsBetweenThumbs 1)", () => {
    expect(hasMinStepBetween([10, 20], 5)).toBe(true);
    expect(hasMinStepBetween([10, 15], 5)).toBe(true);
    expect(hasMinStepBetween([10, 12], 5)).toBe(false);
    expect(hasMinStepBetween([10, 10], 1)).toBe(false);
    expect(hasMinStepBetween([0.2, 0.3], 0.1)).toBe(true);
    expect(hasMinStepBetween([7], 1)).toBe(true);
  });
});

describe("holdApart", () => {
  test("a thumb that outran the other is held one step from it", () => {
    expect(holdApart([360, 360], [120, 360], 5, 500)).toEqual([355, 360]);
    expect(holdApart([120, 120], [120, 360], 5, 500)).toEqual([120, 125]);
  });
  test("nothing to hold when no single thumb moved or there is no room", () => {
    expect(holdApart([120, 360], [120, 360], 5, 500)).toBeNull();
    expect(holdApart([200, 300], [100, 400], 5, 500)).toBeNull();
    expect(holdApart([3, 3], [0, 3], 5, 500)).toBeNull();
  });
});
