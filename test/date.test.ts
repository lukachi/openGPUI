import { describe, expect, test } from "bun:test";
import { parseStructuredRules, validate } from "@openuidev/lang-core";
import { dateLogic } from "./lib.ts";

const {
  asDate,
  asRange,
  buildCalendar,
  DATE_PICKER_END_MONTH,
  DATE_PICKER_START_MONTH,
  dayKey,
  formatDateRange,
  formatSingleDate,
  goToMonth,
  hasSelectedDate,
  initialMonth,
  keyMove,
  moveFocus,
  selectRange,
  selectSingle,
  withMonth,
  withYear,
  forValidation,
  weeksInMonth,
} = dateLogic;

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const iso = (x: Date | undefined) => (x ? dayKey(x) : undefined);

describe("shown value", () => {
  test("single: placeholder, then 'MMM d, yyyy'", () => {
    expect(formatSingleDate(undefined)).toBe("Select a date");
    expect(formatSingleDate(d(2025, 3, 7))).toBe("Mar 7, 2025");
  });

  test("range: one end, a one-day range and a real range", () => {
    expect(formatDateRange(undefined)).toBe("Select a range");
    expect(formatDateRange({ from: undefined, to: undefined })).toBe("Select a range");
    expect(formatDateRange({ from: d(2025, 3, 7) })).toBe("Mar 7, 2025");
    expect(formatDateRange({ from: d(2025, 3, 7), to: d(2025, 3, 7) })).toBe("Mar 7, 2025");
    expect(formatDateRange({ from: d(2025, 3, 7), to: d(2025, 12, 31) })).toBe("Mar 7, 2025 - Dec 31, 2025");
  });

  test("the text is a value only for a date, or a range with both ends", () => {
    expect(hasSelectedDate("single", d(2025, 1, 1), undefined)).toBe(true);
    expect(hasSelectedDate("range", undefined, { from: d(2025, 1, 1) })).toBe(false);
    expect(hasSelectedDate("range", undefined, { from: d(2025, 1, 1), to: d(2025, 1, 2) })).toBe(true);
  });

  test("values that went through JSON read as dates; garbage is no date", () => {
    const when = d(2025, 6, 15);
    expect(asDate(JSON.parse(JSON.stringify(when)))?.getTime()).toBe(when.getTime());
    expect(asDate("not a date")).toBeUndefined();
    expect(asDate({})).toBeUndefined();
    const range = asRange(JSON.parse(JSON.stringify({ from: when, to: d(2025, 6, 20) })));
    expect(formatDateRange(range)).toBe("Jun 15, 2025 - Jun 20, 2025");
    expect(asRange("2025-01-01")).toBeUndefined();
  });
});

describe("selection", () => {
  test("single: picking the selected day again clears it", () => {
    expect(iso(selectSingle(undefined, d(2025, 5, 4)))).toBe("2025-05-04");
    expect(iso(selectSingle(d(2025, 5, 4), d(2025, 5, 9)))).toBe("2025-05-09");
    expect(selectSingle(d(2025, 5, 4), d(2025, 5, 4))).toBeUndefined();
  });

  test("range: the first pick is a one-day range, later picks move or grow an end", () => {
    let r = selectRange(undefined, d(2025, 5, 10));
    expect([iso(r?.from), iso(r?.to)]).toEqual(["2025-05-10", "2025-05-10"]);
    r = selectRange(r, d(2025, 5, 20));
    expect([iso(r?.from), iso(r?.to)]).toEqual(["2025-05-10", "2025-05-20"]);
    r = selectRange(r, d(2025, 5, 3)); // before the start: the start moves
    expect([iso(r?.from), iso(r?.to)]).toEqual(["2025-05-03", "2025-05-20"]);
    r = selectRange(r, d(2025, 5, 12)); // inside: the end moves
    expect([iso(r?.from), iso(r?.to)]).toEqual(["2025-05-03", "2025-05-12"]);
    r = selectRange(r, d(2025, 5, 3)); // the start again: collapses to one day
    expect([iso(r?.from), iso(r?.to)]).toEqual(["2025-05-03", "2025-05-03"]);
    expect(selectRange(r, d(2025, 5, 3))).toBeUndefined(); // that day again: cleared
  });

  test("range: from only (a restored half range) takes the next pick as the end, either side", () => {
    expect(selectRange({ from: d(2025, 5, 10) }, d(2025, 5, 15))).toEqual({ from: d(2025, 5, 10), to: d(2025, 5, 15) });
    expect(selectRange({ from: d(2025, 5, 10) }, d(2025, 5, 5))).toEqual({ from: d(2025, 5, 5), to: d(2025, 5, 10) });
  });
});

describe("calendar grid", () => {
  const today = d(2026, 11, 6);

  test("opens on today's month; the grid starts on Sunday", () => {
    const first = initialMonth(today, DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH);
    expect(iso(first)).toBe("2026-11-01");
    const model = buildCalendar(today, first, DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH);
    expect(model.weekdays).toEqual(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
    expect(model.month.weeks.length).toBe(5); // Nov 1 2026 is a Sunday; Nov 30 a Monday
    expect(iso(model.month.weeks[0]!.days[0]!.date)).toBe("2026-11-01");
    expect(model.month.weeks.every((w) => w.days.length === 7)).toBe(true);
  });

  test("days outside the month are hidden; today is flagged", () => {
    const model = buildCalendar(today, d(2026, 10, 1), DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH);
    const days = model.month.weeks.flatMap((w) => w.days);
    const hidden = days.filter((x) => model.flags(x, undefined, "single").hidden).map((x) => iso(x.date));
    expect(hidden).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"]); // Oct 1 2026 is a Thursday; Oct 31 a Saturday
    expect(days.filter((x) => model.flags(x, undefined, "single").today)).toEqual([]);
  });

  test("a range flags its ends and middle, also on hidden days (upstream draws no hidden style)", () => {
    const model = buildCalendar(today, d(2026, 11, 1), DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH);
    const range = { from: d(2026, 11, 10), to: d(2026, 11, 12) };
    const flags = model.month.weeks.flatMap((w) => w.days).map((x) => [iso(x.date)!, model.flags(x, range, "range")] as const);
    const by = Object.fromEntries(flags);
    expect(by["2026-11-10"]).toMatchObject({ selected: true, rangeStart: true, rangeMiddle: false });
    expect(by["2026-11-11"]).toMatchObject({ selected: true, rangeStart: false, rangeMiddle: true, rangeEnd: false });
    expect(by["2026-11-12"]).toMatchObject({ selected: true, rangeEnd: true });
    expect(by["2026-11-13"]).toMatchObject({ selected: false });
  });

  test("dropdown options: every month of the shown year, years 1900 to 2100", () => {
    const model = buildCalendar(today, d(2026, 11, 1), DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH);
    expect(model.monthOptions.map((m) => m.label).slice(0, 2)).toEqual(["January", "February"]);
    expect(model.monthOptions.length).toBe(12);
    expect(model.yearOptions[0]?.value).toBe(1900);
    expect(model.yearOptions.at(-1)?.value).toBe(2100);
    expect(model.yearOptions.length).toBe(201);
  });

  test("month and year changes keep the other, and clamp to the bounds", () => {
    const shown = d(2026, 11, 1);
    expect(iso(withMonth(shown, 1))).toBe("2026-02-01");
    expect(iso(withYear(shown, 1999))).toBe("1999-11-01");
    expect(iso(goToMonth(d(1850, 3, 9), DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH, today))).toBe("1900-01-01");
    expect(iso(goToMonth(d(2200, 3, 9), DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH, today))).toBe("2100-12-01");
  });
});

describe("keyboard", () => {
  const model = buildCalendar(d(2026, 11, 6), d(2026, 11, 1), DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH);
  const start = model.month.weeks[0]!.days[3]!; // Wed Nov 4

  test("DayPicker's key map", () => {
    expect(keyMove("left", false)).toEqual({ by: "day", dir: "before" });
    expect(keyMove("down", true)).toEqual({ by: "year", dir: "after" });
    expect(keyMove("pageup", false)).toEqual({ by: "month", dir: "before" });
    expect(keyMove("home", false)).toEqual({ by: "startOfWeek", dir: "before" });
    expect(keyMove("a", false)).toBeNull();
  });

  test("moves by day, week, month and across the month edge", () => {
    const go = (by: Parameters<typeof moveFocus>[1], dir: "before" | "after") => iso(moveFocus(start, by, dir, model.navStart, model.navEnd)?.date);
    expect(go("day", "after")).toBe("2026-11-05");
    expect(go("week", "before")).toBe("2026-10-28");
    expect(go("month", "after")).toBe("2026-12-04");
    expect(go("startOfWeek", "before")).toBe("2026-11-01");
    expect(go("endOfWeek", "after")).toBe("2026-11-07");
  });

  test("stops at the last navigable day", () => {
    const end = buildCalendar(d(2026, 11, 6), d(2100, 12, 1), DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH);
    const last = end.month.weeks.at(-1)!.days.find((x) => iso(x.date) === "2100-12-31")!;
    expect(iso(moveFocus(last, "day", "after", end.navStart, end.navEnd)?.date)).toBe("2100-12-31");
  });

  test("the grid is entered on the selected day, else today, else the first day", () => {
    expect(iso(model.focusTarget(undefined, "single")?.date)).toBe("2026-11-06");
    expect(iso(model.focusTarget(d(2026, 11, 20), "single")?.date)).toBe("2026-11-20"); // selected outranks today
    const other = buildCalendar(d(2026, 11, 6), d(2026, 3, 1), DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH);
    expect(iso(other.focusTarget(d(2026, 3, 14), "single")?.date)).toBe("2026-03-14");
  });
});

describe("required on a picked day", () => {
  const required = parseStructuredRules({ required: true });
  test("a Date is empty to lang-core, its ISO string is a value", () => {
    const picked = d(2026, 11, 20);
    expect(validate(picked, required)).toBeDefined(); // upstream's bug: a Date has no own keys
    expect(validate(forValidation(picked), required)).toBeUndefined();
  });
  test("an invalid Date and a missing value stay empty; ranges and strings pass through", () => {
    expect(validate(forValidation(new Date(NaN)), required)).toBeDefined();
    expect(validate(forValidation(undefined), required)).toBeDefined();
    const range = { from: d(2026, 11, 1), to: d(2026, 11, 9) };
    expect(forValidation(range)).toBe(range);
    expect(forValidation("2026-11-20T00:00:00.000Z")).toBe("2026-11-20T00:00:00.000Z");
  });
});

describe("weeksInMonth", () => {
  test("4 to 6 rows, Sunday first, no fixed weeks", () => {
    expect(weeksInMonth(d(2026, 2, 1))).toBe(4); // Feb 2026 starts on a Sunday
    expect(weeksInMonth(d(2026, 11, 1))).toBe(5);
    expect(weeksInMonth(d(2025, 3, 1))).toBe(6); // Mar 2025 starts on a Saturday
  });
});
