// DatePicker.
//
// Ported from react-ui at the pinned commit:
//   DatePicker  genui-lib/DatePicker/{index.tsx,schema.ts}, genui-lib/rules.ts,
//               components/DatePicker/{DatePicker.tsx,helpers/components/{FloatingDatePickerRenderer.tsx,
//               DatePickerRenderer.tsx,floatingDatePickerRenderer.scss,datePickerRenderer.scss},
//               helpers/context/DatePickerContext.tsx,helpers/utils/helperFn.tsx}
//   and the Calendar it opens (calendar.ts).
//
// Contract, as upstream: props are `name`, `mode` ("single" default | "range"),
// `rules` and `value` (a literal default or a `$binding`). The form value is
// whatever the calendar picks: a Date in single mode (or undefined once the picked
// day is picked again), a { from, to } range of Dates in range mode. A form
// submission carries them through JSON, so a Date arrives as its ISO string.
// A string or number value (an agent's default, a restored state) is read as
// date-fns reads one. There are no min/max/disabled props upstream: the calendar
// spans January 1900 to December 2100 and nothing else is disabled. Picking a day
// does not close the calendar; a press outside it, or on the field, does.
// `rules` register with the enclosing form and validate on every change, as upstream.
//
// Deliberate deviations (upstream behaviour kept out on purpose):
// - Upstream's DatePicker.tsx keeps an internal copy of the value that it updates only
//   while the parent value is empty, and shows `parent ?? internal`. Clearing a pick
//   (the same day again; a one-day range again) stores undefined, yet upstream keeps
//   showing and highlighting the first pick, and a `required` rule fails meanwhile.
//   Here the field and the calendar show the form value, so a cleared pick reads
//   "Select a date" / "Select a range" and nothing is selected, as the submitted
//   value says. Form values are identical to upstream's.
// - Upstream crashes when a range's ends are strings (`from.toDateString is not a
//   function`: the picker disappears), which is what a range restored from JSON is.
//   String and number ends are read as dates here (asDate/asRange in date-logic.ts).
//
// Where gpui differs from the browser:
// - The calendar opens in gpui-kit's Popover, which also closes on Escape (upstream
//   has no key handling for the field, which is not focusable) and draws below the
//   field without floating-ui's flip: near the window's bottom it is only clamped
//   into the window. The field itself takes no keyboard focus.
// - The menu's 0.18s scale/fade-in and the chevron's 0.2s turn are not animated;
//   the chevron swaps to its upside-down twin.
// - Only the box shadow preset closest to shadow-s is available.
import { parseStructuredRules } from "@openuidev/lang-core";
import { Popover } from "gpui-base";
import { div, type FocusHandle } from "gpui-kit";
import { optional, type Component } from "../render/surface.ts";
import { shadow, textStyle, typography } from "../render/tokens.ts";
import { calendarView } from "./calendar.ts";
import {
  asDate,
  asRange,
  DATE_PICKER_END_MONTH,
  DATE_PICKER_START_MONTH,
  formatDateRange,
  formatSingleDate,
  hasSelectedDate,
  type DateValue,
} from "./date-logic.ts";

interface PickerState {
  open: boolean;
  /** Counts openings: the calendar mounts fresh each time, as upstream's does. */
  epoch: number;
}

export const DatePicker: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const session = ctx.session;
    const name = String(props.name ?? "");
    const formName = ctx.formName;
    const mode = props.mode === "range" ? "range" : "single";
    const field = ctx.field<unknown>(name, props.value);
    const rules = parseStructuredRules(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming) {
      form.registerField(name, rules, () => session.stateField(formName, name, props.value).value);
    }

    const state = ctx.local<PickerState>({ open: false, epoch: 0 });
    // The keyboard's place while the calendar is open; released with the view.
    const focus = ctx.retained<FocusHandle, null>(ctx.id("focus"), { kind: "focus", meta: null, create: (_entry, cx) => cx.focus_handle() });

    const single = mode === "single" ? asDate(field.value) : undefined;
    const range = mode === "range" ? asRange(field.value) : undefined;
    const selected: DateValue = mode === "single" ? single : range;
    const hasValue = hasSelectedDate(mode, single, range);

    // .openui-date-picker-renderer-floating-input-container: body default, 1px default border,
    // radius m, sunk fill, padding s × m, shadow s; interactive border while open or hovered.
    const chevron = ctx.icon(state.open ? "ChevronUp" : "ChevronDown", { size: 16 });
    const input = shadow(
      textStyle(
        div()
          .id(ctx.id("input"))
          .flex()
          .flex_row()
          .items_center()
          .justify_between()
          .w_full()
          .border_1()
          .border_color(state.open ? t.borderInteractive : t.borderDefault)
          .rounded(t.radiusM)
          .bg(t.sunk)
          .px(t.spaceM)
          .py(t.spaceS)
          .text_color(hasValue ? t.textNeutralPrimary : t.textNeutralSecondary)
          .cursor_pointer()
          .when(!state.open, (el) => el.hover((s) => s.border_color(t.borderInteractive))),
        typography(t, "body", "default"),
      )
        .child(
          div()
            .min_w_0()
            .overflow_hidden()
            .whitespace_nowrap()
            .child(mode === "single" ? formatSingleDate(single) : formatDateRange(range)),
        )
        .children(optional(chevron)),
      t.shadowS,
    );

    // handleChange: set the value, then validate it when the field has rules.
    const onSelect = (next: DateValue) => {
      field.setValue(next);
      if (rules.length) form?.validateField(name, next, rules);
    };

    // .openui-date-picker-renderer-floating-menu: foreground, radius 2xl, shadow s, 1px interactive
    // border; floating-ui offset(5) between the field and the menu. Upstream renders the menu only
    // while open (FloatingDatePicker returns null otherwise): so does this.
    const menu = () => div().pt(5).child(
      shadow(
        div().bg(t.foreground).border_1().border_color(t.borderInteractive).rounded(t.radius2xl).overflow_hidden(),
        t.shadowS,
      ).child(
        calendarView(ctx, "cal", {
          mode,
          selected,
          onSelect: (next, cx) => {
            onSelect(next);
            cx.notify();
          },
          startMonth: DATE_PICKER_START_MONTH,
          endMonth: DATE_PICKER_END_MONTH,
          framed: false,
          epoch: state.epoch,
          focus,
        }),
      ),
    );

    const popover = Popover.new(ctx.id("popover"))
      .open(state.open)
      .on_open_change((open, cx) => {
        if (open && !state.open) state.epoch += 1;
        state.open = open;
        cx.notify();
      })
      .trigger(input)
      .when(state.open, (el) => el.content(menu()));
    return div()
      .w_full()
      .child(focus ? popover.track_focus(focus) : popover);
  },
};
