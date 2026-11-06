// Date logic shared by DatePicker and Calendar, with no gpui in it.
//
// react-ui's DatePicker/Calendar are react-day-picker (9.14.0 at upstream's
// lockfile) plus date-fns (4.4.0). Their date math is plain TypeScript, so it is
// compiled, not copied: the build plugin (scripts/upstream-plugin.ts) aliases
//   openui-datepicker-helpers  components/DatePicker/helpers/utils/helperFn.tsx
//                              (the shown text: formatSingleDate, formatDateRange)
//   openui-rdp/<path>          react-day-picker's dist/esm/<path>, whose export map
//                              offers only the React entry: its DateLib wrapper,
//                              calendar grid, selection, focus movement and
//                              dropdown options
// and this file only recreates what DayPicker.tsx and its React hooks wire
// together from them.
import { toDate } from "date-fns";
import { formatDateRange, formatSingleDate } from "openui-datepicker-helpers";
import { CalendarDay, DateLib, type CalendarMonth } from "openui-rdp/classes/index.js";
import { createGetModifiers } from "openui-rdp/helpers/createGetModifiers.js";
import { calculateFocusTarget } from "openui-rdp/helpers/calculateFocusTarget.js";
import { getDates } from "openui-rdp/helpers/getDates.js";
import { getDisplayMonths } from "openui-rdp/helpers/getDisplayMonths.js";
import { getInitialMonth } from "openui-rdp/helpers/getInitialMonth.js";
import { getMonthOptions } from "openui-rdp/helpers/getMonthOptions.js";
import { getMonths } from "openui-rdp/helpers/getMonths.js";
import { getNavMonths } from "openui-rdp/helpers/getNavMonth.js";
import { getNextFocus } from "openui-rdp/helpers/getNextFocus.js";
import { getWeekdays } from "openui-rdp/helpers/getWeekdays.js";
import { getYearOptions } from "openui-rdp/helpers/getYearOptions.js";
import * as defaultFormatters from "openui-rdp/formatters/index.js";
import { addToRange } from "openui-rdp/utils/addToRange.js";
import { rangeIncludesDate } from "openui-rdp/utils/rangeIncludesDate.js";

export { CalendarDay, formatDateRange, formatSingleDate };

/** react-day-picker's DateRange: what a range DatePicker stores. */
export interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

export type CalendarMode = "single" | "range";

/** What the calendar draws and picks: a Date, a range, or nothing. (A stored string is read by asDate/asRange first.) */
export type DateValue = Date | DateRange | undefined;

/** The DateLib every calendar uses: DayPicker's default (English, weeks start on Sunday). */
export const dateLib = new DateLib();

// ── Values ──

/**
 * A stored date as a Date. Upstream hands the value to date-fns, which reads a
 * string or number through `new Date(...)`; the same here (`toDate`). Anything
 * that is not a valid date is no date.
 */
export function asDate(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) return undefined;
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * A stored value as a range. Upstream renders a restored range's string ends
 * with `from.toDateString()`, which throws; reading them as dates instead keeps
 * a value that went through JSON usable.
 */
export function asRange(value: unknown): DateRange | undefined {
  if (value == null || typeof value !== "object" || value instanceof Date) return undefined;
  const { from, to } = value as { from?: unknown; to?: unknown };
  return { from: asDate(from), to: asDate(to) };
}

/** FloatingDateInput: whether the shown text is a value rather than the placeholder. */
export function hasSelectedDate(mode: CalendarMode, date: Date | undefined, range: DateRange | undefined): boolean {
  return mode === "single" ? !!date : !!(range && range.from && range.to);
}

// ── Selection (react-day-picker's useSingle / useRange with DatePicker's props) ──

/** useSingle.select: picking the selected day again clears it. */
export function selectSingle(selected: Date | undefined, picked: Date): Date | undefined {
  return selected && dateLib.isSameDay(picked, selected) ? undefined : picked;
}

/**
 * useRange.select with no min, max, required or resetOnSelect: an empty range
 * becomes one day, then each pick grows or moves an end.
 */
export function selectRange(selected: DateRange | undefined, picked: Date): DateRange | undefined {
  return addToRange(picked, selected, undefined, undefined, undefined, dateLib);
}

// ── Calendar grid ──

/** DatePickerRenderer's bounds: startMonth 1900-01, endMonth 2100-12. */
export const DATE_PICKER_START_MONTH = new Date(1900, 0);
export const DATE_PICKER_END_MONTH = new Date(2100, 11);

export interface CalendarModel {
  today: Date;
  /** The first (only) displayed month. */
  month: CalendarMonth;
  navStart: Date;
  navEnd: Date;
  weekdays: string[];
  monthOptions: { value: number; label: string; disabled: boolean }[];
  yearOptions: { value: number; label: string; disabled: boolean }[];
  /** The day a keyboard enters the grid on, by DayPicker's priority: the selected day, else today, else the first focusable one. */
  focusTarget(selected: DateValue, mode: CalendarMode, lastFocused?: CalendarDay): CalendarDay | undefined;
  flags(day: CalendarDay, selected: DateValue, mode: CalendarMode): DayFlags;
}

export interface DayFlags {
  today: boolean;
  /** Outside the displayed month, or past the navigable months: drawn without a button. */
  hidden: boolean;
  /** aria-selected: a selected day, or inside a range (ends included). */
  selected: boolean;
  rangeStart: boolean;
  rangeMiddle: boolean;
  rangeEnd: boolean;
}

/** The DayPicker props the Calendar passes: dropdown captions, nothing else that changes the grid. */
function dayPickerProps(today: Date, startMonth: Date, endMonth: Date) {
  return { today, numberOfMonths: 1, captionLayout: "dropdown" as const, startMonth, endMonth, showOutsideDays: false };
}

/** The month DayPicker opens on: today's (the DatePicker passes no month), kept inside the bounds. */
export function initialMonth(today: Date, startMonth: Date, endMonth: Date): Date {
  const props = dayPickerProps(today, startMonth, endMonth);
  const [navStart, navEnd] = getNavMonths(props, dateLib);
  return getInitialMonth(props, navStart, navEnd, dateLib);
}

/** useCalendar.goToMonth: a month, clamped to the navigable range. */
export function goToMonth(date: Date, startMonth: Date, endMonth: Date, today: Date): Date {
  const [navStart, navEnd] = getNavMonths(dayPickerProps(today, startMonth, endMonth), dateLib);
  let month = dateLib.startOfMonth(date);
  if (navStart && month < dateLib.startOfMonth(navStart)) month = dateLib.startOfMonth(navStart);
  if (navEnd && month > dateLib.startOfMonth(navEnd)) month = dateLib.startOfMonth(navEnd);
  return month;
}

/** DayPicker's `handleMonthChange` / `handleYearChange`. */
export function withMonth(shown: Date, month: number): Date {
  return dateLib.setMonth(dateLib.startOfMonth(shown), month);
}
export function withYear(shown: Date, year: number): Date {
  return dateLib.setYear(dateLib.startOfMonth(shown), year);
}

/** useCalendar + DayPicker's derived data for the month starting `firstMonth`. */
export function buildCalendar(today: Date, firstMonth: Date, startMonth: Date, endMonth: Date): CalendarModel {
  const props = dayPickerProps(today, startMonth, endMonth);
  const [navStart, navEnd] = getNavMonths(props, dateLib) as [Date, Date];
  const displayMonths = getDisplayMonths(firstMonth, navEnd, props, dateLib);
  const dates = getDates(displayMonths, dateLib.endOfMonth(endMonth), {}, dateLib);
  const months = getMonths(displayMonths, dates, {}, dateLib);
  const month = months[0]!;
  const days = months.flatMap((m) => m.weeks.flatMap((w) => w.days));
  const getModifiers = createGetModifiers(days, props, navStart, navEnd, dateLib);

  return {
    today,
    month,
    navStart,
    navEnd,
    weekdays: getWeekdays(dateLib, undefined, undefined, today).map((d) => defaultFormatters.formatWeekdayName(d, dateLib.options, dateLib)),
    monthOptions: getMonthOptions(month.date, navStart, navEnd, defaultFormatters, dateLib) ?? [],
    yearOptions: getYearOptions(navStart, navEnd, defaultFormatters, dateLib) ?? [],
    focusTarget(selected, mode, lastFocused) {
      return calculateFocusTarget(days, getModifiers, (date: Date) => isSelected(date, selected, mode), lastFocused);
    },
    flags(day, selected, mode) {
      const m = getModifiers(day);
      const flags: DayFlags = { today: !!m.today, hidden: !!m.hidden, selected: false, rangeStart: false, rangeMiddle: false, rangeEnd: false };
      flags.selected = isSelected(day.date, selected, mode);
      const range = mode === "range" ? (selected as DateRange | undefined) : undefined;
      if (range) {
        const { from, to } = range;
        flags.rangeStart = Boolean(from && to && dateLib.isSameDay(day.date, from));
        flags.rangeEnd = Boolean(from && to && dateLib.isSameDay(day.date, to));
        flags.rangeMiddle = rangeIncludesDate(range, day.date, true, dateLib);
      }
      return flags;
    },
  };
}

function isSelected(date: Date, selected: DateValue, mode: CalendarMode): boolean {
  if (mode === "single") return !!selected && dateLib.isSameDay(selected as Date, date);
  const range = selected as DateRange | undefined;
  return !!range && rangeIncludesDate(range, date, false, dateLib);
}

export type MoveBy = "day" | "week" | "month" | "year" | "startOfWeek" | "endOfWeek";

/** DayPicker's handleDayKeyDown key map (left to right text): the move a key makes, or null. */
export function keyMove(key: string, shift: boolean): { by: MoveBy; dir: "before" | "after" } | null {
  switch (key) {
    case "left":
      return { by: shift ? "month" : "day", dir: "before" };
    case "right":
      return { by: shift ? "month" : "day", dir: "after" };
    case "down":
      return { by: shift ? "year" : "week", dir: "after" };
    case "up":
      return { by: shift ? "year" : "week", dir: "before" };
    case "pageup":
      return { by: shift ? "year" : "month", dir: "before" };
    case "pagedown":
      return { by: shift ? "year" : "month", dir: "after" };
    case "home":
      return { by: "startOfWeek", dir: "before" };
    case "end":
      return { by: "endOfWeek", dir: "after" };
    default:
      return null;
  }
}

/** useFocus.moveFocus: the day focus lands on, clamped to the navigable months. */
export function moveFocus(from: CalendarDay, by: MoveBy, dir: "before" | "after", navStart: Date, navEnd: Date): CalendarDay | undefined {
  return getNextFocus(by, dir, from, navStart, navEnd, {}, dateLib);
}

export const dayKey = (date: Date): string => dateLib.format(date, "yyyy-MM-dd");
