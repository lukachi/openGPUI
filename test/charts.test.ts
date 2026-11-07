// Chart logic opengpui wrote itself (upstream's chart math compiles from the
// pin and is upstream's to test). Both modules are plain TypeScript without
// gpui or upstream imports, so they load from source.
import { describe, expect, test } from "bun:test";
import { svgPath, type PathSink } from "../src/components/charts/pathData.ts";
import { ogpuiLocaleNumber } from "../src/upstream/locale.ts";
import { fontWidths, probeId, recordChar, recordString, textWidth } from "../src/components/charts/widths.ts";

/** A PathSink that records calls as strings, numbers rounded to 3 places. */
function recorder() {
  const calls: string[] = [];
  const r = (n: number) => Math.round(n * 1000) / 1000;
  const sink: PathSink = {
    move_to: (x, y) => calls.push(`M ${r(x)} ${r(y)}`),
    line_to: (x, y) => calls.push(`L ${r(x)} ${r(y)}`),
    curve_to: (x, y, cx, cy) => calls.push(`Q ${r(cx)} ${r(cy)} ${r(x)} ${r(y)}`),
    cubic_bezier_to: (x, y, ax, ay, bx, by) => calls.push(`C ${r(ax)} ${r(ay)} ${r(bx)} ${r(by)} ${r(x)} ${r(y)}`),
    arc_to: (rx, ry, rot, large, sweep, x, y) => calls.push(`A ${rx} ${ry} ${rot} ${+large} ${+sweep} ${r(x)} ${r(y)}`),
    close: () => calls.push("Z"),
  };
  return { sink, calls };
}

const replay = (d: string, dx = 0, dy = 0) => {
  const { sink, calls } = recorder();
  svgPath(sink, d, dx, dy);
  return calls;
};

describe("svgPath", () => {
  test("roundedBarPath output: absolute lines and arcs", () => {
    expect(replay("M 4,0 L 6,0 A 4,4 0 0 1 10,4 L 10,20 L 10,20 L 0,20 L 0,20 L 0,4 A 4,4 0 0 1 4,0 Z")).toEqual([
      "M 4 0",
      "L 6 0",
      "A 4 4 0 0 1 10 4",
      "L 10 20",
      "L 10 20",
      "L 0 20",
      "L 0 20",
      "L 0 4",
      "A 4 4 0 0 1 4 0",
      "Z",
    ]);
  });

  test("d3-shape output: compact numbers, cubic curves, offset applied", () => {
    expect(replay("M0,10C5,10,5,0,10,0L20,0", 100, 50)).toEqual(["M 100 60", "C 105 60 105 50 110 50", "L 120 50"]);
  });

  test("relative commands, implicit line-tos after M, H/V, exponents", () => {
    expect(replay("m10 10 5 0 0 5h-5v-5z l1e1 -2e-1")).toEqual([
      "M 10 10",
      "L 15 10",
      "L 15 15",
      "L 10 15",
      "L 10 10",
      "Z",
      "L 20 9.8",
    ]);
  });

  test("S and T reflect the previous control point", () => {
    expect(replay("M0 0 C0 10 10 10 10 0 S20 -10 20 0")).toEqual(["M 0 0", "C 0 10 10 10 10 0", "C 10 -10 20 -10 20 0"]);
    expect(replay("M0 0 Q5 10 10 0 T20 0")).toEqual(["M 0 0", "Q 5 10 10 0", "Q 15 -10 20 0"]);
  });

  test("malformed data stops instead of looping", () => {
    expect(replay("M0 0 L10 0 Z 5 5 L 1 1")).toEqual(["M 0 0", "L 10 0", "Z"]);
    expect(replay("1 2 3")).toEqual([]);
    expect(replay("M0 0 C1 2 3")).toEqual(["M 0 0"]);
  });
});

describe("text widths", () => {
  test("an exact string width wins; otherwise characters sum, with a fallback for unknown ones", () => {
    const w = fontWidths("test|12|440");
    recordChar(w, "a", 6);
    recordChar(w, "b", 7);
    recordString(w, "ab", 12.5);
    expect(textWidth(w, "ab", 5)).toBe(12.5);
    expect(textWidth(w, "ba", 5)).toBe(13);
    expect(textWidth(w, "abz", 5)).toBe(18);
  });

  test("probe ids are distinct for distinct strings", () => {
    expect(probeId("é1")).not.toBe(probeId("\u20c5"));
    expect(probeId("-1.0K")).toBe("_19_1_1a_0K");
  });
});

describe("ogpuiLocaleNumber", () => {
  // gpui-shell's engine has no locale data: chart tooltips need en-US grouping from this.
  test("groups thousands and keeps up to three fraction digits, as en-US", () => {
    for (const v of [0, 5, 999, 1000, 4400, 99999.5, 1234.5678, -1234, 0.5]) expect(ogpuiLocaleNumber(v)).toBe(v.toLocaleString("en-US"));
  });
});
