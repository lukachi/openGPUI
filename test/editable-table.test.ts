import { describe, expect, test } from "bun:test";
import { editableTableModel as m } from "./lib.ts";

const keys = ["name", "role", "start"];
const data = [
  { id: "1", values: ["Alex Kim", "eng", "2024-01-15"] },
  { id: "2", values: ["Jamie Lee", "design", "2024-03-02"] },
];

describe("rows and the stored value", () => {
  test("positional values round-trip through keyed rows; the row id wins over an `id` column", () => {
    const rows = m.toRows(keys, data);
    expect(rows[0]).toEqual({ id: "1", name: "Alex Kim", role: "eng", start: "2024-01-15" });
    expect(m.fromRows(keys, rows)).toEqual(data);
    const withId = m.toRows(["id", "name"], [{ id: "row", values: ["shadowed", "x"] }]);
    expect(m.fromRows(["id", "name"], withId)).toEqual([{ id: "row", values: ["row", "x"] }]);
  });

  test("short rows read missing values as undefined and save them positionally", () => {
    const rows = m.toRows(keys, [{ id: "1", values: ["only"] }]);
    expect(m.fromRows(keys, rows)).toEqual([{ id: "1", values: ["only", undefined, undefined] }]);
  });

  test("an edit replaces one cell in a copy; a missing row changes nothing", () => {
    const rows = m.toRows(keys, data);
    const next = m.updateData(rows, 1, "role", "eng")!;
    expect(next[1]!.role).toBe("eng");
    expect(rows[1]!.role).toBe("design");
    expect(m.updateData(rows, 5, "role", "eng")).toBeNull();
  });
});

describe("changed cells", () => {
  test("counts cells that differ from the baseline by identity, only for baseline rows", () => {
    const rows = m.toRows(keys, data);
    const baseline = m.baselineOf(rows);
    let next = m.updateData(rows, 0, "name", "Alex K")!;
    next = m.updateData(next, 1, "start", "2024-03-03T00:00:00.000Z")!;
    expect(m.changedCellCount(keys, next, baseline)).toBe(2);
    // Restoring a value un-counts it; the number 1 is not the string "1".
    expect(m.changedCellCount(keys, m.updateData(next, 0, "name", "Alex Kim")!, baseline)).toBe(1);
    const numeric = m.toRows(["n"], [{ id: "a", values: ["1"] }]);
    expect(m.changedCellCount(["n"], m.updateData(numeric, 0, "n", 1)!, m.baselineOf(numeric))).toBe(1);
  });

  test("nothing counts before a baseline exists (still streaming)", () => {
    const rows = m.updateData(m.toRows(keys, data), 0, "name", "X")!;
    expect(m.changedCellCount(keys, rows, undefined)).toBe(0);
  });
});

describe("cell values", () => {
  test("number cells save a finite float, else 0", () => {
    expect(m.parseNumber("7.5")).toBe(7.5);
    expect(m.parseNumber("12abc")).toBe(12);
    expect(m.parseNumber("")).toBe(0);
    expect(m.parseNumber("Infinity")).toBe(0);
  });

  test("date cells read ISO strings and numbers, nothing else", () => {
    expect(m.toDate("2024-01-15T00:00:00.000Z")?.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    expect(m.toDate(0)?.getTime()).toBe(0);
    expect(m.toDate("not a date")).toBeUndefined();
    expect(m.toDate(undefined)).toBeUndefined();
  });
});

describe("navigation", () => {
  const columns = keys.map((key) => ({ key }));
  test("moves one step and clamps at the grid's edges", () => {
    expect(m.navigate({ row: 0, column: "name" }, "left", columns, 2)).toEqual({ row: 0, column: "name" });
    expect(m.navigate({ row: 0, column: "name" }, "right", columns, 2)).toEqual({ row: 0, column: "role" });
    expect(m.navigate({ row: 1, column: "start" }, "right", columns, 2)).toEqual({ row: 1, column: "start" });
    expect(m.navigate({ row: 1, column: "start" }, "down", columns, 2)).toEqual({ row: 1, column: "start" });
    expect(m.navigate({ row: 1, column: "role" }, "up", columns, 2)).toEqual({ row: 0, column: "role" });
  });
});

describe("column layout", () => {
  test("between the sums, columns share the room above their minimums by their give", () => {
    // The browser's widths for all-types.oui at 682px: three text columns and two fixed fields.
    const { widths, scrollable } = m.columnLayout([86, 178.1, 162.8, 86, 100], [120, 120, 120, 120, 120], 682);
    expect(scrollable).toBe(false);
    expect(widths[1]).toBeCloseTo(178.1);
    expect(widths[2]).toBeCloseTo(162.8);
    expect(widths[0]).toBeCloseTo(112.7, 0);
    expect(widths[4]).toBeCloseTo(115.8, 0);
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(682);
  });

  test("a wider container stretches the declared widths in proportion", () => {
    expect(m.columnLayout([50, 50], [100, 300], 800)).toEqual({ widths: [200, 600], scrollable: false });
  });

  test("once scrollable, it stays scrollable until the declared widths fit", () => {
    expect(m.columnLayout([90, 100], [120, 300], 300, true)).toEqual({ widths: [120, 300], scrollable: true });
    expect(m.columnLayout([90, 100], [120, 300], 300, false).scrollable).toBe(false);
    expect(m.columnLayout([90, 100], [120, 300], 420, true).scrollable).toBe(false);
  });

  test("minimums past the container scroll at the declared (or minimum) widths", () => {
    expect(m.columnLayout([90, 250], [90, 120], 300)).toEqual({ widths: [90, 250], scrollable: true });
  });
});
