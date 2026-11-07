// Calendar: the month grid DatePicker opens. Not an OpenUI Lang component itself.
//
// Ported from react-ui at the pinned commit:
//   Calendar  components/Calendar/{Calendar.tsx,calendar.scss,components/helperComponents.tsx,
//             components/calendarHelperComponents.scss,utils/{styles.tsx,calendarBaseStyle.scss}}
//   which is react-day-picker 9.14.0's DayPicker with dropdown captions (month and
//   year Selects over react-ui's Select: components/Select/{Select.tsx,select.scss},
//   components/_menu.scss). The date math is react-day-picker's own (date-logic.ts).
//   react-ui imports no react-day-picker stylesheet, so the layout is the plain
//   markup (block divs, a table) plus react-ui's scss; that is what is drawn here,
//   quirks included: an outside-month day that is selected or inside a range is a
//   blank highlighted cell, because nothing hides it.
//
// Where gpui differs from the browser:
// - The month and year lists are drawn inside the calendar's own clipped panel
//   (upstream portals Radix's Select content into the calendar container, whose
//   transformed ancestor does the same), over a transparent catcher that closes
//   the list on any press outside it, as Radix's modal select does. A list scrolls
//   with the wheel/trackpad through an offset the list owns (gpui-kit cannot
//   scroll a div from code), and opens with the selected item scrolled into view
//   (Radix: scrollIntoView nearest). Lists open on click, Radix opens on press.
// - Upstream's day buttons are real focusable buttons. Here the grid holds one
//   keyboard focus and a roving "focused day" (DayPicker's own key map: arrows,
//   shift+arrows, PageUp/Down, Home/End, Enter/Space to pick); the focus ring
//   shows after a key press, like :focus-visible. Month/year lists have no
//   arrow-key navigation or type-ahead.
// - Hover is gpui's `hover` style; the 0.12s color transitions are not drawn.
// - `overflow: hidden` clips to the box, not its rounded corners: the rounded surface
//   that owns the calendar (the framed Calendar, DatePicker's menu) paints the fill.
// - Sizes that depend on the browser's line boxes are fixed numbers (CAPTION_HEIGHT,
//   YEAR_COLUMN_WIDTH).
import { div, type Context, type Element, type FocusHandle } from "gpui-kit";
import { optional, type RenderContext } from "../render/surface.ts";
import { shadow, textStyle, typography } from "../render/tokens.ts";
import {
  buildCalendar,
  dateLib,
  dayKey,
  goToMonth,
  initialMonth,
  keyMove,
  moveFocus,
  selectRange,
  selectSingle,
  withMonth,
  withYear,
  type CalendarDay,
  type CalendarMode,
  type DateRange,
  type DateValue,
} from "./date-logic.ts";

/**
 * Popover binds Enter and Space to its own toggle, and a key binding runs before any key
 * handler: the grid hears the two keys only through bindings of its own, in its own key
 * context, which sit deeper than the popover's.
 */
const KEY_CONTEXT = "OpenGPUICalendar";
const ENTER_ACTION = "opengpui-calendar-enter";
const SPACE_ACTION = "opengpui-calendar-space";
let pickKeysBound = false;
function bindPickKeys(ctx: RenderContext): void {
  if (pickKeysBound) return;
  pickKeysBound = true;
  ctx.after((cx) =>
    cx.bind_keys([
      { keystroke: "enter", action: ENTER_ACTION, context: KEY_CONTEXT },
      { keystroke: "space", action: SPACE_ACTION, context: KEY_CONTEXT },
    ]),
  );
}

/** --openui-calendar-day-size: space-2xl + space-2xs. */
const DAY_SIZE = 40;
/** The caption row: two select triggers, 34px tall (label 20 + padding 12 + border 2). */
const CAPTION_HEIGHT = 34;
const CAPTION_GAP = 8; // .openui-calendar-month-caption margin-bottom: space-s
const PADDING = 18; // .openui-calendar-root padding: space-l
const SIDE_OFFSET = 4; // SelectContent sideOffset
const ITEM_HEIGHT = 32; // _menu.scss $row-height
const GUTTER = 4; // _menu.scss $gutter: the viewport's vertical padding
const LIST_CHROME = 10; // a list's 1px border and 4px padding on both sides
const YEAR_COLUMNS = 3; // .openui-calendar-select-viewport
const YEAR_GAP = 4; // space-2xs
const YEAR_COLUMN_WIDTH = 56; // 1fr tracks: the widest "2026" (≈40px) + the item's 2 × space-s
const YEAR_ALIGN_OFFSET = -75; // YearsDropdown alignOffset

interface CalState {
  epoch: number;
  /** The first (only) displayed month; null until the first render computes today's. */
  month: Date | null;
  /** The keyboard's day (ISO date), once a day was clicked or a key moved it. */
  focused: string | null;
  /** Whether the focused day shows its ring (after a key press, like :focus-visible). */
  ring: boolean;
  open: "month" | "year" | null;
  monthScroll: number;
  yearScroll: number;
  /** Width of the month trigger, which the year list is placed against. */
  monthTriggerWidth: number;
}

export interface CalendarOptions {
  mode: CalendarMode;
  selected: DateValue;
  onSelect(value: DateValue, cx: Context): void;
  startMonth: Date;
  endMonth: Date;
  /** The Calendar's own border and radius; DatePicker's floating menu supplies its own. */
  framed: boolean;
  /** A new epoch starts the calendar over (a closed and reopened DatePicker is a fresh mount). */
  epoch: number;
  /** What the keyboard goes to while the calendar is open; null until the owner has one. */
  focus: FocusHandle | null;
  /** The host's own answer to Enter on the focused day, instead of picking it (EditableTable moves down). */
  onEnter?(cx: Context): void;
}

const fresh = (epoch: number): CalState => ({
  epoch,
  month: null,
  focused: null,
  ring: false,
  open: null,
  monthScroll: 0,
  yearScroll: 0,
  monthTriggerWidth: 100,
});

/** Scroll offset that brings item `index` fully into view from the top, as scrollIntoView({ block: "nearest" }). */
function revealOffset(index: number, count: number, rowStride: number, viewportHeight: number, contentHeight: number): number {
  if (index <= 0) return 0;
  if (index >= count - 1) return Math.max(0, contentHeight - viewportHeight);
  const bottom = GUTTER + index * rowStride + ITEM_HEIGHT;
  return Math.max(0, bottom - viewportHeight);
}

export function calendarView(ctx: RenderContext, part: string, o: CalendarOptions): Element {
  const t = ctx.t;
  const state = ctx.local<CalState>(fresh(o.epoch), part);
  if (state.epoch !== o.epoch) Object.assign(state, fresh(o.epoch));

  const today = dateLib.today();
  if (!state.month) state.month = initialMonth(today, o.startMonth, o.endMonth);
  const model = buildCalendar(today, state.month, o.startMonth, o.endMonth);
  const displayed = model.month.date;
  const selected = o.selected;
  const id = (suffix: string) => ctx.id(`${part}-${suffix}`);

  const target = model.focusTarget(selected, o.mode);
  const focusedDay: CalendarDay | undefined = state.focused
    ? model.month.weeks.flatMap((w) => w.days).find((d) => dayKey(d.date) === state.focused && !d.outside)
    : undefined;

  const goTo = (date: Date) => {
    state.month = goToMonth(date, o.startMonth, o.endMonth, dateLib.today());
  };

  const pick = (date: Date, cx: Context) => {
    o.onSelect(o.mode === "single" ? selectSingle(selected as Date | undefined, date) : selectRange(selected as DateRange | undefined, date), cx);
  };

  // ── Lists' geometry: both are sized from the months block (containerHeight - 45) ──

  const monthsHeight = CAPTION_HEIGHT + CAPTION_GAP + DAY_SIZE * (1 + model.month.weeks.length);
  const listHeight = monthsHeight - 45;
  const monthContentHeight = 2 * GUTTER + model.monthOptions.length * ITEM_HEIGHT;
  const monthListHeight = Math.min(listHeight, monthContentHeight + LIST_CHROME);
  const monthViewport = monthListHeight - LIST_CHROME;
  const yearRows = Math.ceil(model.yearOptions.length / YEAR_COLUMNS);
  const yearContentHeight = 2 * GUTTER + yearRows * ITEM_HEIGHT + (yearRows - 1) * YEAR_GAP;
  const yearViewport = listHeight - LIST_CHROME;
  const shownYearRow = Math.floor(Math.max(0, model.yearOptions.findIndex((y) => y.value === displayed.getFullYear())) / YEAR_COLUMNS);

  // ── Caption: month and year selects ──

  const trigger = (key: "month" | "year", label: string): Element => {
    const open = state.open === key;
    // .openui-calendar-select-trigger over .openui-select-trigger: label default, 6 × 8 padding,
    // 1px transparent border (interactive while hovered or open), radius s, gap 2xs, a 16px chevron.
    return textStyle(
      div()
        .id(id(`${key}-trigger`))
        .flex()
        .flex_row()
        .flex_none()
        .items_center()
        .gap(t.space2xs)
        .py(t.spaceXs)
        .px(t.spaceS)
        .border_1()
        .border_color("#00000000")
        .rounded(t.radiusS)
        .text_color(t.textNeutralPrimary)
        .cursor_pointer()
        .when(open, (el) => el.bg(t.highlightSubtle).border_color(t.borderInteractive))
        .hover((s) => s.bg(t.highlightSubtle).border_color(t.borderInteractive))
        .when(key === "month", (el) =>
          el.on_size_change((size, cx) => {
            if (Math.abs(size.width - state.monthTriggerWidth) > 0.5) {
              state.monthTriggerWidth = size.width;
              cx.notify();
            }
          }),
        )
        .on_click((_e, cx) => {
          cx.stop_propagation();
          if (open) {
            state.open = null;
          } else {
            state.open = key;
            if (key === "month") state.monthScroll = revealOffset(displayed.getMonth(), 12, ITEM_HEIGHT, monthViewport, monthContentHeight);
            else state.yearScroll = revealOffset(shownYearRow, yearRows, ITEM_HEIGHT + YEAR_GAP, yearViewport, yearContentHeight);
          }
          cx.notify();
        }),
      typography(t, "label", "default"),
    )
      .child(label)
      .children(optional(ctx.icon(open ? "ChevronUp" : "ChevronDown", { size: 16 })));
  };

  // ── Grid ──

  const weekdayStyle = typography(t, "label", "small");
  const dayStyle = typography(t, "label", "default");
  const weekdays = div()
    .flex()
    .flex_row()
    .children(
      model.weekdays.map((w) =>
        textStyle(div().w(DAY_SIZE).h(DAY_SIZE).flex_none().flex().items_center().justify_center().text_color(t.textNeutralSecondary), weekdayStyle).child(w),
      ),
    );

  const dayCell = (day: CalendarDay): Element => {
    const flags = model.flags(day, selected, o.mode);
    // The td: .openui-calendar-{single,range}-day plus the state classes.
    let cell = div().w(DAY_SIZE).h(DAY_SIZE).flex_none().text_color(t.textNeutralPrimary);
    if (o.mode === "single") {
      if (flags.selected) cell = cell.bg(t.interactiveAccentDefault).text_color(t.textAccentPrimary).rounded(t.radiusM);
    } else {
      if (flags.rangeMiddle) cell = cell.bg(t.highlight);
      if (flags.rangeStart) cell = cell.bg(t.interactiveAccentDefault).text_color(t.textAccentPrimary).rounded_l(t.radiusM);
      if (flags.rangeEnd) cell = cell.bg(t.interactiveAccentDefault).text_color(t.textAccentPrimary).rounded_r(t.radiusM);
    }
    // .openui-calendar-today[data-today]:not([aria-selected])
    if (flags.today && !flags.selected) cell = cell.bg(t.sunk).rounded(t.radiusM);
    if (flags.hidden) return cell;

    const focused = state.ring && focusedDay !== undefined && focusedDay.isEqualTo(day);
    // The day button: label default, 1px transparent border, radius m, hover highlight-subtle.
    const button = textStyle(
      div()
        .id(id(`day-${day.isoDate}`))
        .size_full()
        .relative()
        .flex()
        .items_center()
        .justify_center()
        .border_1()
        .border_color("#00000000")
        .rounded(t.radiusM)
        .cursor_pointer()
        .hover((s) => s.bg(t.highlightSubtle))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          state.focused = dayKey(day.date);
          state.ring = false;
          pick(day.date, cx);
          cx.notify();
        }),
      dayStyle,
    ).child(String(day.date.getDate()));
    // :focus-visible { outline: 2px solid border-accent; outline-offset: space-3xs }
    const ring = 2 + t.space3xs;
    return cell.child(
      focused
        ? button.child(
            div()
              .absolute()
              .top(-ring - 1)
              .left(-ring - 1)
              .size(DAY_SIZE + 2 * ring)
              .border_2()
              .border_color(t.borderAccent)
              .rounded(t.radiusM + ring),
          )
        : button,
    );
  };

  const weeks = model.month.weeks.map((week) => div().flex().flex_row().children(week.days.map(dayCell)));

  // ── Select lists (SelectContent) ──

  /** .openui-calendar-select-content-*: foreground, 1px interactive border, radius xl, shadow m, padding 2xs. */
  const listSurface = (
    key: string,
    width: number,
    height: number,
    scroll: "monthScroll" | "yearScroll",
    viewport: number,
    content: number,
    rows: Element[],
  ): Element => {
    const max = Math.max(0, content - viewport);
    const offset = Math.min(Math.max(0, state[scroll]), max);
    return shadow(
      div()
        .id(id(`${key}-list`))
        .absolute()
        .w(width)
        .h(height)
        .bg(t.foreground)
        .border_1()
        .border_color(t.borderInteractive)
        .rounded(t.radiusXl)
        .p(GUTTER)
        .overflow_hidden()
        .text_color(t.textNeutralPrimary)
        .on_scroll_wheel((e, cx) => {
          if (e.delta.y === 0) return;
          cx.stop_propagation();
          state[scroll] = Math.min(Math.max(0, offset - e.delta.y), max);
          cx.notify();
        })
        .child(div().h(viewport).overflow_hidden().child(div().relative().top(-offset).flex().flex_col().children(rows))),
      t.shadowM,
    );
  };

  const monthList = (): Element => {
    const items = model.monthOptions.map((opt) => {
      const checked = opt.value === displayed.getMonth();
      // A tick: .openui-select-item-check-wrapper, absolute at right 8px, 14 × 14, with a 16px icon.
      const icon = checked ? ctx.icon("Check", { size: 16 }) : null;
      return div()
        .id(id(`month-${opt.value}`))
        .relative()
        .flex()
        .flex_row()
        .items_center()
        .flex_none()
        .h(ITEM_HEIGHT)
        .pl(t.spaceML)
        .pr(t.spaceXl)
        .when(checked, (el) => el.bg(t.highlight))
        .when(opt.disabled, (el) => el.opacity(0.5))
        .when(!opt.disabled, (el) =>
          el
            .cursor_pointer()
            .hover((s) => s.bg(t.highlight))
            .on_click((_e, cx) => {
              cx.stop_propagation();
              goTo(withMonth(displayed, opt.value));
              state.open = null;
              cx.notify();
            }),
        )
        // The item text: body default, primary. select.scss gives .openui-select-item-text the secondary
        // color, but the pinned Radix (2.3.7) leaves SelectItemText's className off its span in the
        // rendered DOM, so that rule never matches and the text inherits the item's primary color.
        .child(textStyle(div().flex_1().text_color(t.textNeutralPrimary), typography(t, "body", "default")).child(opt.label))
        .children(icon ? [div().absolute().right(8).top((ITEM_HEIGHT - 14) / 2).w(14).h(14).child(icon)] : []);
    });
    // The Select viewport's own padding (menu.$gutter) above the first and below the last row.
    const rows = [div().h(GUTTER).flex_none(), ...items, div().h(GUTTER).flex_none()];
    return listSurface("month", 280, monthListHeight, "monthScroll", monthViewport, monthContentHeight, rows)
      .left(PADDING)
      .top(PADDING + CAPTION_HEIGHT + SIDE_OFFSET);
  };

  const yearList = (): Element => {
    const width = YEAR_COLUMNS * YEAR_COLUMN_WIDTH + (YEAR_COLUMNS - 1) * YEAR_GAP + LIST_CHROME;
    const years = model.yearOptions;
    const rows: Element[] = [div().h(GUTTER).flex_none()];
    for (let r = 0; r < yearRows; r++) {
      rows.push(
        div()
          .flex()
          .flex_row()
          .flex_none()
          .gap(YEAR_GAP)
          .h(ITEM_HEIGHT)
          .when(r < yearRows - 1, (el) => el.mb(YEAR_GAP))
          .children(
            years.slice(r * YEAR_COLUMNS, (r + 1) * YEAR_COLUMNS).map((opt) => {
              const checked = opt.value === displayed.getFullYear();
              // .openui-calendar-select-item: body default, padding xs × s, radius s, centered in its track.
              const item = textStyle(
                div()
                  .id(id(`year-${opt.value}`))
                  .flex()
                  .items_center()
                  .justify_center()
                  .h(ITEM_HEIGHT)
                  .px(t.spaceS)
                  .rounded(t.radiusS)
                  .text_color(t.textNeutralPrimary)
                  .when(checked, (el) => el.bg(t.highlight))
                  .cursor_pointer()
                  .hover((s) => s.bg(t.highlight))
                  .on_click((_e, cx) => {
                    cx.stop_propagation();
                    goTo(withYear(displayed, opt.value));
                    state.open = null;
                    cx.notify();
                  }),
                typography(t, "body", "default"),
              ).child(opt.label);
              return div().w(YEAR_COLUMN_WIDTH).h(ITEM_HEIGHT).flex_none().flex().items_center().justify_center().child(item);
            }),
          ),
      );
    }
    rows.push(div().h(GUTTER).flex_none());
    // alignOffset -75 from the year trigger's left edge, kept inside the calendar.
    const left = Math.max(0, Math.min(PADDING + state.monthTriggerWidth + YEAR_ALIGN_OFFSET, 2 * PADDING + 7 * DAY_SIZE - width));
    return listSurface("year", width, listHeight, "yearScroll", yearViewport, yearContentHeight, rows)
      .left(left)
      .top(PADDING + CAPTION_HEIGHT + SIDE_OFFSET);
  };

  // ── Root ──

  const content = div()
    .flex()
    .flex_col()
    .p(PADDING)
    .child(
      // The caption: the two dropdowns side by side at the start.
      div()
        .flex()
        .flex_row()
        .items_center()
        .h(CAPTION_HEIGHT)
        .mb(CAPTION_GAP)
        .child(trigger("month", model.monthOptions[displayed.getMonth()]?.label ?? ""))
        .child(trigger("year", String(displayed.getFullYear()))),
    )
    .child(weekdays)
    .children(weeks);

  const catcher = div()
    .id(id("catcher"))
    .absolute()
    .top(0)
    .left(0)
    .size_full()
    .on_click((_e, cx) => {
      cx.stop_propagation();
      state.open = null;
      cx.notify();
    });

  let panel = textStyle(
    div()
      .id(id("panel"))
      .relative()
      .w(2 * PADDING + 7 * DAY_SIZE)
      .text_color(t.textNeutralPrimary)
      .overflow_hidden(),
    typography(t, "body", "default"),
  )
    .child(content)
    .when(state.open !== null, (el) => el.child(catcher).child(state.open === "month" ? monthList() : yearList()));

  if (o.focus) {
    panel = panel
      .track_focus(o.focus)
      .key_context(KEY_CONTEXT)
      .on_action(ENTER_ACTION, (_e, cx) => {
        if (!focusedDay) return cx.propagate();
        cx.stop_propagation();
        state.ring = true;
        if (o.onEnter) o.onEnter(cx);
        else pick(focusedDay.date, cx);
        cx.notify();
      })
      .on_action(SPACE_ACTION, (_e, cx) => {
        if (!focusedDay) return cx.propagate();
        cx.stop_propagation();
        state.ring = true;
        pick(focusedDay.date, cx);
        cx.notify();
      })
      .on_key_down((e, cx) => {
        state.ring = true;
        const move = keyMove(e.key, e.modifiers.shift);
        if (!move) return;
        cx.stop_propagation();
        if (!focusedDay) {
          // The grid's keyboard entry: DayPicker's focus target (the selected day, else today).
          if (target) state.focused = dayKey(target.date);
        } else {
          const next = moveFocus(focusedDay, move.by, move.dir, model.navStart, model.navEnd);
          if (next) {
            state.focused = dayKey(next.date);
            if (!dateLib.isSameMonth(next.date, displayed)) goTo(next.date);
          }
        }
        cx.notify();
      });
    bindPickKeys(ctx);
  }

  // .openui-calendar-root's border and radius; inside DatePicker's menu they are overridden to none.
  return div()
    .when(o.framed, (el) => el.bg(t.foreground).border_1().border_color(t.borderInteractive).rounded(t.radius3xl).overflow_hidden())
    .child(panel);
}
