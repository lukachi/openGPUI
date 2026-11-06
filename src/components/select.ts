// Select and SelectItem.
//
// Ported from react-ui at the pinned commit:
//   Select      genui-lib/Select/{schema.ts,index.tsx}, components/Select/{Select.tsx,select.scss}
//   SelectItem  genui-lib/Select/{schema.ts,index.tsx} (an option record: it draws nothing itself)
//   menu        components/_menu.scss, see menu.ts
//
// `selectControl` is the drawn control (components/Select: trigger, content,
// items), shared with SliderBlock, whose discrete variant is made of Selects.
//
// Where gpui differs from the browser (Radix Select):
// - The trigger's chevron turns 180deg in 0.2s when open; here it is drawn as
//   ChevronUp (the same glyph rotated) and swaps at once.
// - The menu opens through gpui-base's Select root + Popup: below the trigger,
//   left aligned, never flipped above it. Its entry animation (fade and scale
//   in 0.18s) is not drawn.
// - The menu is a virtual list of 32px rows, so a Slider step of 1 over a wide
//   range costs the same as ten items. Radix scrolls a viewport whose 4px
//   padding scrolls with the rows; here the 4px sits inside the menu, so rows
//   are clipped 4px inside its edge while scrolling. There is no scrollbar,
//   which matches Radix's hidden one.
// - The pointer's highlight and the keyboard's are two states (Radix focuses
//   the row under the pointer): the pointer row shows its hover background,
//   arrow keys move the keyboard row, and both can show at once.
// - A press on the trigger toggles the menu and a press outside it closes it,
//   written here as well as in the native root, so the result is the same
//   whichever of them the host delivers first.
import { isElementNode, parseStructuredRules, type ParsedRule } from "@openuidev/lang-core";
import { Popup, Select as GSelect, v_virtual_list, VirtualListScrollHandle } from "gpui-base";
import { div, type Anchor, type Context, type Element, type FocusHandle, type KeyEvent } from "gpui-kit";
import { optional, type Component, type Props, type RenderContext } from "../render/surface.ts";
import { textStyle, typography, type Tokens } from "../render/tokens.ts";
import { MENU_ROW_HEIGHT, menuGutter, menuRow, menuSurface } from "./menu.ts";

export type SelectSize = "sm" | "md" | "lg";

/** `.openui-select-content`: max-height. */
const MENU_MAX_HEIGHT = 372;

/** Radix `sideOffset={2}`: the gap between the trigger and the menu. */
const SIDE_OFFSET = 2;

/** Radix typeahead forgets what was typed after one second. */
const TYPEAHEAD_MS = 1000;

/** Which corner of the menu is pinned to the trigger: its top-left, so it opens below and left aligned. */
const MENU_ANCHOR: Anchor = "top_left";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectControl {
  ctx: RenderContext;
  /** Tells several controls of one node apart (SliderBlock draws two). */
  part?: string;
  value: string;
  items: SelectOption[];
  placeholder?: string;
  size?: SelectSize;
  disabled?: boolean;
  /** Radix `onValueChange`. */
  onChange(value: string, cx: Context): void;
  /** A fixed trigger box (SliderBlock: `button { width; height: 36px }`). */
  width?: number;
  height?: number;
  /** Controlled open state (Radix `open`): the owner decides, told through `onOpenChange`. */
  open?: boolean;
  /** Radix `onOpenChange`; with `open`, every open or close request goes here. */
  onOpenChange?(open: boolean, cx: Context): void;
  /** A text size the trigger's own size doesn't give (EditableTable: body small on an md trigger). */
  triggerText?: "small";
  /** Draw the trigger alone: no native state and no menu (EditableTable's cells that aren't selected). */
  inert?: boolean;
}

interface Native {
  trigger: FocusHandle;
  list: FocusHandle;
  scroll: VirtualListScrollHandle;
  release(): void;
}

interface Ui {
  open: boolean;
  /** The keyboard's row. */
  hi: number;
  /** First row the list last drew, to scroll the keyboard row into view. */
  start: number;
  triggerWidth: number;
  /** The pointer is over the trigger: a press there is the trigger's own, not "outside". */
  overTrigger: boolean;
  openAtPress: boolean;
  search: string;
  searchAt: number;
  scrollTo: number | null;
}

/** Radix `getNextMatch`: the next label starting with `search`, wrapping, or -1. */
function nextMatch(labels: string[], search: string, current: number): number {
  const repeated = search.length > 1 && [...search].every((c) => c === search[0]);
  const query = (repeated ? search[0]! : search).toLowerCase();
  const start = Math.max(current, 0);
  let order = labels.map((_, i) => (start + i) % labels.length);
  if (query.length === 1) order = order.filter((i) => i !== current);
  const found = order.find((i) => labels[i]!.toLowerCase().startsWith(query));
  return found !== undefined && found !== current ? found : -1;
}

/** Trigger metrics per size: select.scss `-sm`, `-md`, `-lg`. */
function triggerBox(t: Tokens, size: SelectSize): { py: number; px: number; radius: number } {
  switch (size) {
    case "sm":
      return { py: t.spaceXs - 1.5, px: t.spaceS, radius: t.radiusS + 1 };
    case "lg":
      return { py: t.spaceS - 1, px: t.spaceM, radius: t.radiusL };
    default:
      return { py: t.spaceXs - 1, px: t.spaceM - 1, radius: t.radiusM };
  }
}

/** components/Select: a Select with its trigger and content, as `<Select><SelectTrigger/><SelectContent/></Select>`. */
export function selectControl(o: SelectControl): Element {
  const { ctx, items } = o;
  const t = ctx.t;
  const size = o.size ?? "md";
  const part = o.part ?? "";
  const key = ctx.id(`select${part ? `:${part}` : ""}`);
  const ui = ctx.local<Ui>(
    { open: false, hi: -1, start: 0, triggerWidth: 0, overTrigger: false, openAtPress: false, search: "", searchAt: 0, scrollTo: null },
    `select${part}`,
  );
  const selected = items.findIndex((i) => i.value === o.value);
  const shown = selected >= 0 ? items[selected]!.label : "";
  // Radix: data-placeholder while the value is empty.
  const placeholder = o.value === "";

  const body = typography(t, "body", size === "sm" || o.triggerText === "small" ? "small" : "default");
  const box = triggerBox(t, size);
  let focusList = false;
  if (o.open !== undefined && o.open !== ui.open) {
    // Controlled: opened from outside starts on the selected item, as setOpen does, and the list
    // takes the keyboard (base moves it only when it opens the list itself).
    ui.open = o.open;
    if (o.open) {
      ui.hi = selected >= 0 ? selected : 0;
      ui.scrollTo = ui.hi;
      focusList = true;
    }
  }
  const open = ui.open && !o.disabled && !o.inert;
  const native = o.inert
    ? null
    : ctx.retained<Native, object>(`select:${key}`, {
        kind: "select",
        meta: {},
        create(_entry, cx) {
          const trigger = cx.focus_handle();
          const list = cx.focus_handle();
          const scroll = VirtualListScrollHandle.new();
          return {
            trigger,
            list,
            scroll,
            release() {
              trigger.release();
              list.release();
              scroll.release();
            },
          };
        },
      });

  // ── The trigger ──
  let trigger = textStyle(
    div()
      .id(`${key}:trigger`)
      .flex()
      .flex_row()
      .items_center()
      .justify_between()
      .gap(t.spaceS)
      .border_1()
      .py(box.py)
      .px(box.px)
      .rounded(box.radius)
      .when(o.width !== undefined, (e) => e.w(o.width!))
      .when(o.width === undefined, (e) => e.w_full())
      .when(o.height !== undefined, (e) => e.h(o.height!)),
    body,
  );
  const valueText = div().child(placeholder ? (o.placeholder ?? "") : shown);
  const chevron = ctx.icon(open ? "ChevronUp" : "ChevronDown", { size: 16 });
  trigger = trigger.child(valueText).children(optional(chevron));
  if (o.disabled) {
    // `:disabled`, then `[data-placeholder]` (later in the scss, so it wins over it).
    return trigger
      .bg(t.highlightSubtle)
      .border_color(t.borderDefault)
      .text_color(placeholder ? t.textNeutralSecondary : t.textNeutralTertiary)
      .cursor_not_allowed();
  }
  trigger = trigger
    .bg(open ? t.highlight : t.highlightSubtle)
    .border_color(open ? t.borderInteractive : t.borderDefault)
    .text_color(placeholder ? t.textNeutralSecondary : t.textNeutralPrimary)
    .cursor_pointer()
    .hover((s) => s.bg(t.highlight).border_color(t.borderInteractive));
  if (!native) return trigger;
  if (focusList) ctx.after(() => native.list.focus());

  // ── Behavior ──
  const setOpen = (next: boolean, cx: Context) => {
    if (ui.open === next) return;
    if (o.onOpenChange) {
      o.onOpenChange(next, cx);
      cx.notify();
      if (o.open !== undefined) return;
    }
    ui.open = next;
    if (next) {
      ui.hi = selected >= 0 ? selected : 0;
      ui.scrollTo = ui.hi;
    }
    cx.notify();
  };
  const choose = (index: number, cx: Context) => {
    const item = items[index];
    if (!item) return;
    o.onChange(item.value, cx);
    // Radix calls onOpenChange(false) after a pick; a controlled owner hears it.
    if (o.open !== undefined) setOpen(false, cx);
    else ui.open = false;
    native.trigger.focus();
    cx.notify();
  };
  /** Radix: a search is running until a second passes without a key. */
  const typing = () => ui.search !== "" && Date.now() - ui.searchAt <= TYPEAHEAD_MS;
  const typeahead = (e: KeyEvent, current: number): number => {
    const char = e.key_char;
    if (!char || e.modifiers.control || e.modifiers.alt || e.modifiers.platform) return -1;
    // Space is a search character only inside a search; on its own it opens or selects.
    if (char === " " && !typing()) return -1;
    ui.search = typing() ? ui.search + char : char;
    ui.searchAt = Date.now();
    return nextMatch(
      items.map((i) => i.label),
      ui.search,
      current,
    );
  };
  const reveal = (index: number, visible: number) => {
    if (index < ui.start) native.scroll.scroll_to_item(index, "top");
    else if (index >= ui.start + visible) native.scroll.scroll_to_item(index - visible + 1, "top");
  };

  const triggerEl = trigger
    .track_focus(native.trigger)
    .tab_index(0)
    .on_hover((hovered, _cx) => {
      ui.overTrigger = hovered;
    })
    .on_size_change((size, cx) => {
      if (Math.abs(size.width - ui.triggerWidth) > 0.5) {
        ui.triggerWidth = size.width;
        cx.notify();
      }
    })
    .on_mouse_down("left", () => {
      ui.openAtPress = ui.open;
    })
    .on_click((_e, cx) => {
      cx.stop_propagation();
      setOpen(!ui.openAtPress, cx);
    })
    .on_key_down((e, cx) => {
      // Radix trigger: Space, Enter, ArrowUp, ArrowDown open (Enter and ArrowDown also reach
      // the native root); any other character picks the next matching item without opening.
      if (ui.open) return;
      if ((e.key === "space" && !typing()) || e.key === "up") {
        cx.stop_propagation();
        setOpen(true, cx);
        return;
      }
      const match = typeahead(e, selected);
      if (match >= 0) {
        cx.stop_propagation();
        o.onChange(items[match]!.value, cx);
        cx.notify();
      }
    });

  // ── The content ──
  const rows = items.length;
  // `max-height: 372px` bounds the whole menu: its gutters and its 1px ring come out of the list's share.
  const listHeight = Math.min(rows * MENU_ROW_HEIGHT, MENU_MAX_HEIGHT - 2 * menuGutter(t) - 2);
  const visible = Math.max(1, Math.floor(listHeight / MENU_ROW_HEIGHT));
  const longest = items.reduce((best, item, i) => (item.label.length > items[best]!.label.length ? i : best), 0);
  const itemText = typography(t, "body", size === "sm" ? "small" : "default");

  if (open && ui.scrollTo !== null) {
    const target = ui.scrollTo;
    ui.scrollTo = null;
    ctx.after(() => native.scroll.scroll_to_item(target, "center"));
  }

  // Built only while open: a closed Radix Select mounts no content either.
  const buildMenu = (): Element => {
    const list = v_virtual_list(
      `${key}:list`,
      rows,
      MENU_ROW_HEIGHT,
      (i) => String(i),
      (range) => {
        ui.start = range.start;
        const out: Element[] = [];
        for (let i = range.start; i < range.end; i++) {
          const item = items[i]!;
          const isSelected = i === selected;
          // components/Select SelectItem: label in item-text (secondary), the check on the trailing edge.
          const row = textStyle(
            menuRow(t, div().w_full().justify_between().relative().pr(t.spaceXl), {
              highlighted: isSelected || i === ui.hi,
              first: i === 0,
              last: i === rows - 1,
            }),
            itemText,
          )
            .cursor_default()
            .hover((s) => s.bg(t.highlight))
            .child(div().flex_1().whitespace_nowrap().text_color(t.textNeutralSecondary).child(item.label));
          out.push(
            isSelected
              ? row.child(div().absolute().right(6).top(9).child(ctx.icon("Check", { size: 16 })!))
              : row,
          );
        }
        return out;
      },
    )
      .track_scroll(native.scroll)
      .when(rows > 0, (e) => e.with_item_to_measure_index(longest))
      .h(listHeight)
      .on_item_click((k, cx) => choose(Number(k), cx));

    return menuSurface(t, div().id(`${key}:menu`))
      .min_w(Math.max(o.width ?? 0, ui.triggerWidth))
      .mt(SIDE_OFFSET)
      .track_focus(native.list)
      .on_mouse_down_out((_e, cx) => {
        // The trigger's own press toggles through its click; anything else is outside.
        if (!ui.overTrigger) setOpen(false, cx);
      })
      .on_key_down((e, cx) => {
        if (!rows) return;
        const move = (index: number) => {
          ui.hi = Math.max(0, Math.min(rows - 1, index));
          reveal(ui.hi, visible);
          cx.stop_propagation();
          cx.notify();
        };
        switch (e.key) {
          case "down":
            return move(ui.hi + 1);
          case "up":
            return move(ui.hi - 1);
          case "home":
            return move(0);
          case "end":
            return move(rows - 1);
          case "space":
            // Radix: Space selects, unless it continues a typeahead search.
            if (!typing()) {
              cx.stop_propagation();
              choose(ui.hi, cx);
              return;
            }
        }
        const match = typeahead(e, ui.hi);
        if (match >= 0) move(match);
      })
      .child(list);
  };

  return GSelect.new(key)
    .flex()
    .flex_col()
    .open(open)
    .track_focus(native.trigger)
    .content_focus_handle(native.list)
    .on_open_change((next, cx) => setOpen(next, cx))
    .on_confirm((_e, cx) => choose(ui.hi, cx))
    .child(Popup.new(`${key}:popup`, triggerEl).anchor(MENU_ANCHOR).when(open, (el) => el.content(buildMenu())));
}

/** genui Select: `name`, `items` (SelectItem records), `placeholder`, `rules`, `value`, `size`. */
export const Select: Component = {
  render(props: Props, ctx) {
    const name = String(props.name ?? "");
    const field = ctx.field<string | undefined>(name, props.value);
    const rules: ParsedRule[] = parseStructuredRules(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming) {
      const formName = ctx.formName;
      form.registerField(name, rules, () => ctx.session.stateField<string | undefined>(formName, name, props.value).value);
    }
    const items: SelectOption[] = ((props.items ?? []) as unknown[])
      .filter((item): item is { props: { value: string; label?: string } } => isElementNode(item) && !!item.props?.value)
      .map((item) => ({ value: String(item.props.value), label: String(item.props.label || item.props.value) }));
    return selectControl({
      ctx,
      value: field.value ?? "",
      items,
      placeholder: String(props.placeholder || "Select..."),
      size: ({ small: "sm", medium: "md", large: "lg" } as const)[props.size as string] ?? "md",
      disabled: ctx.streaming,
      onChange(value) {
        field.setValue(value);
        if (rules.length && form) form.validateField(name, value, rules);
      },
    });
  },
};

/** genui SelectItem: `component: () => null`; Select reads its props. */
export const SelectItem: Component = {
  render() {
    return null;
  },
};
