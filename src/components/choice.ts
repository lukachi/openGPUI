// Choice fields: CheckBoxGroup/CheckBoxItem, RadioGroup/RadioItem, SwitchGroup/SwitchItem,
// Chips/ChipItem.
//
// Ported from react-ui at the pinned commit:
//   CheckBoxGroup  genui-lib/CheckBoxGroup/{index.tsx,schema.ts}, components/{CheckBoxGroup,CheckBoxItem}/*
//   RadioGroup     genui-lib/RadioGroup/{index.tsx,schema.ts}, components/{RadioGroup,RadioItem}/*
//   SwitchGroup    genui-lib/SwitchGroup/{index.tsx,schema.ts}, components/{SwitchGroup,SwitchItem}/*
//   Chips          genui-lib/Chips/{index.tsx,schema.ts}, components/Chips/*
//   value handling selection.ts (genui-lib/selectionFieldUtils.ts, formDefaultValueUtils.ts)
// The Item components render nothing themselves: their group reads their props (as upstream's
// `component: () => null`).
//
// Where gpui differs:
//  - Radix draws nothing; gpui-base's unstyled Checkbox, Radio and Switch carry the behavior
//    (focus, keyboard, disabled) and the indicators are drawn here from upstream's sizes. The
//    checkbox / radio row is the native control, so a click on the label or description toggles it,
//    as upstream's wrapping `<label>` does. A switch toggles from its track or its label text only,
//    as upstream's `<label htmlFor>` does.
//  - The checkmark is `PathBuilder` geometry (10×8 box, 1.5 stroke) without the SVG's round caps and joins.
//  - The switch track's background and border switch at once: gpui can transition only opacity,
//    width, height, left and top, not color. The thumb travels with a 150ms ease-in-out `left`
//    transition (upstream: cubic-bezier(0.4, 0, 0.2, 1)).
//  - The thumb's shadow is one of gpui's presets.
//  - `overflow-wrap: anywhere` has no gpui form: a single word longer than the row is not broken.
//  - No focus ring on checkbox, radio and switch (the browser's default ring is not styled upstream).
//  - Chips: no `:focus-visible` outline, and none of the 0.15s border-color / background-color /
//    opacity transitions (gpui transitions none of those); hover and selection switch at once.
//  - The radio dot's hover uses `on_hover` and per-group local state, because the dot is a child of the
//    hovered box and gpui's `hover` style reaches only the element itself.
import { isElementNode, parseStructuredRules } from "@openuidev/lang-core";
import { Button as GButton, Checkbox, Radio, RadioGroup as GRadioGroup, Switch } from "gpui-base";
import { div, PathBuilder, type Element } from "gpui-kit";
import { optional, type Component, type Props, type RenderContext } from "../render/surface.ts";
import { shadow, textStyle, TRANSPARENT, typography, type Tokens } from "../render/tokens.ts";
import { booleanAggregate, selectionField, toggleBoolean } from "./selection.ts";

/** An Item component's props as its group reads them. */
function itemProps(items: unknown): Props[] {
  return (Array.isArray(items) ? items : []).flatMap((item) => (isElementNode(item) ? [item.props ?? {}] : []));
}

/** `genui-lib` Item components: `component: () => null`. */
const Item: Component = {
  render() {
    return null;
  },
};
export const CheckBoxItem = Item;
export const RadioItem = Item;
export const SwitchItem = Item;
export const ChipItem = Item;

type GroupVariant = "clear" | "card" | "sunk";

/** checkBoxGroup.scss / radioGroup.scss / switchGroup.scss (identical): a column with a 1px border. */
function groupFrame(t: Tokens, variant: GroupVariant): Element {
  const frame = div().flex().flex_col().gap(t.spaceXs).border_1().rounded(t.radiusXl);
  switch (variant) {
    case "card":
      return frame.border_color(t.borderDefault).p(t.spaceM);
    case "sunk":
      return frame.border_color(t.borderDefault).bg(t.sunk).p(t.spaceM);
    default:
      return frame.border_color(TRANSPARENT).bg(TRANSPARENT).p(t.space000);
  }
}

/** The label and description column every item shares: body default, primary and secondary text. */
function itemContent(t: Tokens, label: unknown, description: unknown): Element {
  const body = typography(t, "body", "default");
  return div()
    .flex()
    .flex_col()
    .min_w(0)
    .children(optional(label ? textStyle(div().text_color(t.textNeutralPrimary), body).child(String(label)) : null))
    .children(optional(description ? textStyle(div().text_color(t.textNeutralSecondary), body).child(String(description)) : null));
}

// ── CheckBoxGroup ──

/** 10×8 checkmark: `M9 1L3.5 6.5L1 4`, 1.5 stroke, in the indicator's color. */
function checkmark(color: Tokens["textAccentPrimary"]): Element {
  const path = PathBuilder.stroke(1.5).move_to(9, 1).line_to(3.5, 6.5).line_to(1, 4).build();
  return window.paint_path(path, color).w(10).h(8).flex_none();
}

interface CheckBoxOptions {
  id: string;
  label: unknown;
  description: unknown;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

/** components/CheckBoxItem. */
function checkBoxItem(ctx: RenderContext, o: CheckBoxOptions): Element {
  const t = ctx.t;
  // .openui-checkbox-item-root: 16px square, radius xs, 1px interactive border, margin-top 2xs;
  // checked: accent fill with the accent-primary indicator; unchecked and enabled: sunk on hover.
  const root = div()
    .id(`${o.id}:box`)
    .flex()
    .flex_none()
    .items_center()
    .justify_center()
    .w(16)
    .h(16)
    .mt(t.space2xs)
    .rounded(t.radiusXs)
    .border_1()
    .border_color(t.borderInteractive)
    .when(o.checked, (el) => el.bg(t.interactiveAccentDefault).text_color(t.textAccentPrimary).child(checkmark(t.textAccentPrimary)))
    .when(!o.checked && !o.disabled, (el) => el.hover((s) => s.bg(t.sunk)))
    .when(o.disabled, (el) => el.cursor_not_allowed());
  // .openui-checkbox-item-container: the label wrapping root and content; gap s, padding 3xs 0.
  return Checkbox.new(o.id)
    .checked(o.checked)
    .disabled(o.disabled)
    .on_change((checked) => o.onChange(checked))
    .flex()
    .flex_row()
    .items_start()
    .gap(t.spaceS)
    .py(t.space3xs)
    .w_full()
    .max_w_full()
    .overflow_hidden()
    .cursor_pointer()
    .child(root)
    .child(itemContent(t, o.label, o.description));
}

export const CheckBoxGroup: Component = {
  render(props, ctx) {
    const items = itemProps(props.items);
    const session = ctx.session;
    const formName = ctx.formName;
    const name = String(props.name);
    const field = ctx.field<Record<string, boolean> | undefined>(name, props.value);
    const rules = parseStructuredRules(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming) form.registerField(name, rules, () => session.stateField(formName, name, props.value).value);
    // Upstream registers before it returns null for an empty group: a required empty group still blocks submit.
    if (!items.length) return null;
    const stored = field.value;
    const aggregate = booleanAggregate(items as { name: string; defaultChecked?: boolean }[], stored);
    return groupFrame(ctx.t, "clear").children(
      items.map((item, i) =>
        checkBoxItem(ctx, {
          id: ctx.id(`item${i}`),
          label: item.label,
          description: item.description || "",
          checked: aggregate[item.name] ?? item.defaultChecked ?? false,
          disabled: ctx.streaming,
          onChange: (checked) => {
            const current = session.stateField<Record<string, boolean> | undefined>(formName, name, props.value);
            const next = toggleBoolean(items as { name: string; defaultChecked?: boolean }[], current.value, item.name, checked);
            current.setValue(next);
            if (rules.length) form?.validateField(name, next, rules);
          },
        }),
      ),
    );
  },
};

// ── RadioGroup ──

interface RadioOptions {
  id: string;
  label: unknown;
  description: unknown;
  checked: boolean;
  disabled: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean, notify: () => void) => void;
}

/** components/RadioItem. */
function radioItem(ctx: RenderContext, o: RadioOptions): Element {
  const t = ctx.t;
  // radioItem.scss' three paths in a 16px box: fill (r 7), 1px border (r 6.5), inner dot (r 4).
  // unchecked: foreground fill, interactive border, foreground dot (interactive on hover);
  // checked: accent fill, accent border, foreground dot.
  const dot = div()
    .w(8)
    .h(8)
    .rounded_full()
    .bg(!o.checked && o.hovered && !o.disabled ? t.borderInteractive : t.foreground);
  const circle = div()
    .flex()
    .items_center()
    .justify_center()
    .w(14)
    .h(14)
    .rounded_full()
    .border_1()
    .bg(o.checked ? t.interactiveAccentDefault : t.foreground)
    .border_color(o.checked ? t.borderAccent : t.borderInteractive)
    .child(dot);
  // .openui-radio-item-root: 16px, margin-top 2xs; disabled: opacity .5.
  const root = div()
    .id(`${o.id}:dot`)
    .flex()
    .flex_none()
    .items_center()
    .justify_center()
    .w(16)
    .h(16)
    .mt(t.space2xs)
    .when(o.disabled, (el) => el.opacity(0.5).cursor_not_allowed())
    .on_hover((hovered, cx) => o.onHover(hovered, () => cx.notify()))
    .child(circle);
  return Radio.new(o.id)
    .checked(o.checked)
    .disabled(o.disabled)
    .on_change((checked) => {
      if (checked) o.onSelect();
    })
    .flex()
    .flex_row()
    .items_start()
    .gap(t.spaceS)
    .py(t.space3xs)
    .w_full()
    .max_w_full()
    .overflow_hidden()
    .cursor_pointer()
    .child(root)
    .child(itemContent(t, o.label, o.description));
}

export const RadioGroup: Component = {
  render(props, ctx) {
    const items = itemProps(props.items);
    const session = ctx.session;
    const formName = ctx.formName;
    const name = String(props.name);
    const field = ctx.field<string | undefined>(name, props.value);
    const rules = parseStructuredRules(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming) form.registerField(name, rules, () => session.stateField(formName, name, props.value).value);
    // Upstream registers before it returns null for an empty group.
    if (!items.length) return null;
    const value = field.value ?? props.defaultValue ?? "";
    const hover = ctx.local({ item: -1 });
    return groupFrame(ctx.t, "clear").child(
      // RadioGroup.Root: role="radiogroup"; the frame above is its box.
      GRadioGroup.new(ctx.id("group"))
        .flex()
        .flex_col()
        .gap(ctx.t.spaceXs)
        .children(
          items.map((item, i) =>
            radioItem(ctx, {
              id: ctx.id(`item${i}`),
              label: item.label,
              description: item.description || "",
              checked: item.value === value,
              disabled: ctx.streaming,
              hovered: hover.item === i,
              onHover: (hovered, notify) => {
                const next = hovered ? i : hover.item === i ? -1 : hover.item;
                if (next === hover.item) return;
                hover.item = next;
                notify();
              },
              onSelect: () => {
                // Radix reports only changes; the selected radio re-clicked stores and validates nothing.
                if (item.value === value) return;
                const val = String(item.value);
                session.stateField<string | undefined>(formName, name, props.value).setValue(val);
                if (rules.length) form?.validateField(name, val, rules);
              },
            }),
          ),
        ),
    );
  },
};

// ── SwitchGroup ──

interface SwitchOptions {
  id: string;
  label: unknown;
  description: unknown;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

/** components/SwitchItem. */
function switchItem(ctx: RenderContext, o: SwitchOptions): Element {
  const t = ctx.t;
  // Thumb: 10px circle, `space3xs` (the track's padding) from the track's inner edge (taffy measures
  // insets inside the border, as CSS does from the padding box), 8px further when checked, centered.
  const thumb = shadow(
    div()
      .id(`${o.id}:thumb`)
      .absolute()
      .top(t.space3xs)
      .left(o.checked ? t.space3xs + 8 : t.space3xs)
      .w(10)
      .h(10)
      .rounded_full()
      .bg(t.foreground)
      .transition("left", { duration: 150, easing: "ease-in-out" }),
    t.shadowS,
  );
  // .openui-switch-item-root: 24×16, margin-top 2xs, 1px border (default; accent when checked),
  // sunk fill (accent when checked); unchecked and enabled: interactive border on hover;
  // disabled: opacity .5.
  const track = Switch.new(o.id)
    .checked(o.checked)
    .disabled(o.disabled)
    .on_change((checked) => o.onChange(checked))
    .relative()
    .flex_none()
    .w(24)
    .h(16)
    .mt(t.space2xs)
    .rounded_full()
    .border_1()
    .border_color(o.checked ? t.borderAccent : t.borderDefault)
    .bg(o.checked ? t.interactiveAccentDefault : t.sunk)
    .when(o.disabled, (el) => el.opacity(0.5).cursor_not_allowed())
    .when(!o.disabled, (el) => el.cursor_pointer())
    .when(!o.checked && !o.disabled, (el) => el.hover((s) => s.border_color(t.borderInteractive)))
    .child(thumb);
  const body = typography(t, "body", "default");
  // The label text is `<label htmlFor>`: a click on it toggles the switch. The description is not. A
  // `<label>` keeps the browser's default cursor (switchItem.scss gives it no `cursor`), unlike the track's pointer.
  const label = o.label
    ? textStyle(div().id(`${o.id}:label`).text_color(t.textNeutralPrimary), body)
        .when(!o.disabled, (el) => el.on_click((_e, cx) => {
          cx.stop_propagation();
          o.onChange(!o.checked);
        }))
        .child(String(o.label))
    : null;
  const content = div()
    .flex()
    .flex_col()
    .min_w(0)
    .children(optional(label))
    .children(optional(o.description ? textStyle(div().text_color(t.textNeutralSecondary), body).child(String(o.description)) : null));
  // .openui-switch-item-container: row, gap s, padding 3xs 0, full width.
  return div().flex().flex_row().items_start().gap(t.spaceS).py(t.space3xs).w_full().max_w_full().overflow_hidden().child(track).child(content);
}

export const SwitchGroup: Component = {
  render(props, ctx) {
    const items = itemProps(props.items);
    if (!items.length) return null;
    const session = ctx.session;
    const formName = ctx.formName;
    const name = String(props.name);
    const field = ctx.field<Record<string, boolean> | undefined>(name, props.value);
    const variant = (["clear", "card", "sunk"] as const).find((v) => v === props.variant) ?? "clear";
    const aggregate = booleanAggregate(items as { name: string; defaultChecked?: boolean }[], field.value);
    return groupFrame(ctx.t, variant).children(
      items.map((item, i) =>
        switchItem(ctx, {
          id: ctx.id(`item${i}`),
          label: item.label,
          description: item.description || "",
          checked: aggregate[item.name] ?? item.defaultChecked ?? false,
          disabled: ctx.streaming,
          onChange: (checked) => {
            const current = session.stateField<Record<string, boolean> | undefined>(formName, name, props.value);
            current.setValue(toggleBoolean(items as { name: string; defaultChecked?: boolean }[], current.value, item.name, checked));
          },
        }),
      ),
    );
  },
};

// ── Chips ──

export const Chips: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const selection = selectionField(
      ctx,
      "Chips",
      { name: String(props.name), type: props.type, rules: props.rules, defaultValue: props.defaultValue },
      "multiple",
    );
    // Items without a value have no identity to select by (genui filters, then Chips again).
    const items = itemProps(props.items).filter((item) => item.value);
    const label = typography(t, "label", "default");
    return div()
      .flex()
      .flex_row()
      .flex_wrap()
      .gap(t.spaceS)
      .w_full()
      .children(
        items.map((item, i) => {
          const selected = selection.selected.includes(item.value);
          const disabled = selection.disabled || item.disabled === true;
          // .openui-chip-item: label default, padding xs s, 1px interactive border, radius m, gap xs.
          // selected: selected border and strong highlight; unchecked and enabled: sunk-light and
          // default border on hover; disabled: opacity .6.
          let chip = textStyle(
            GButton.new(ctx.id(`chip${i}`))
              .selected(selected)
              .disabled(disabled)
              .on_click(() => selection.toggle(item.value))
              .flex()
              .flex_row()
              .items_center()
              .gap(t.spaceXs)
              .py(t.spaceXs)
              .px(t.spaceS)
              .border_1()
              .rounded(t.radiusM)
              .text_color(t.textNeutralPrimary),
            label,
          );
          chip = selected
            ? chip.border_color(t.borderInteractiveSelected).bg(t.highlightStrong)
            : chip.border_color(t.borderInteractive).bg(TRANSPARENT);
          chip = disabled
            ? chip.opacity(0.6).cursor_not_allowed()
            : chip.cursor_pointer().when(!selected, (el) => el.hover((s) => s.border_color(t.borderDefault).bg(t.sunkLight)));
          // .openui-chip-item__icon: 14px; __text: one line, ellipsis.
          return chip
            .children(item.icon ? [div().flex().items_center().w(14).h(14).children(ctx.children(item.icon, `chip${i}:icon`))] : [])
            .child(div().min_w(0).overflow_hidden().whitespace_nowrap().text_ellipsis().child(String(item.label ?? "")));
        }),
      );
  },
};
