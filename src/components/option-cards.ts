// OptionCards, OptionCard: a form field of selectable cards.
//
// Ported from react-ui at the pinned commit:
//   OptionCards  genui-lib/OptionCards/{schema.ts,index.tsx}, components/OptionCards/{OptionCards.tsx,optionCards.scss},
//                components/_shared/cards/smallCardBlockUtils.ts (getRowConfiguration, in lists-state.ts)
//   value handling selection.ts (`selectionField`: genui-lib/selectionFieldUtils.ts, formDefaultValueUtils.ts and
//                the renderer's state wiring), as Chips uses it. The form value is `name` → the selected `value`
//                (single) or an array of them (multiple), recorded as component type "OptionCards".
// OptionCard renders nothing itself: OptionCards reads its props (upstream's `component: () => null`).
//
// The cards' `topContent` (Icon or Image) draws through its own component (`ctx.children`, the Icon and Image
// renderers, which use `ctx.icon` and the host's image loader); an Image gets the 72px tile, an Icon the 32px one.
//
// Where gpui differs:
//  - The grid is flex rows: upstream's `grid-template-columns: repeat(n, 1fr)` rows (n from getRowConfiguration),
//    and its `@container` queries (at most 768px wide: two columns, an odd last card across both; at most 480px:
//    one column) read the field's own measured width (on_size_change), so a new response is drawn once in the wide
//    layout before the width is known.
//  - Cards are gpui-base's unstyled `Button` (press, focus, disabled). The 0.16s border / background / opacity
//    transitions switch at once, and there is no `:focus-visible` outline.
//  - `overflow-wrap: break-word` has no gpui form: a title or subtitle wraps at spaces (markdownInline's words).
import { isElementNode } from "@openuidev/lang-core";
import { Button as GButton } from "gpui-base";
import { div, type Element } from "gpui-kit";
import { markdownInline } from "../markdown/render.ts";
import { optional, type Component, type Props, type RenderContext } from "../render/surface.ts";
import { textStyle, TRANSPARENT, typography } from "../render/tokens.ts";
import { getRowConfiguration } from "./lists-state.ts";
import { selectionField } from "./selection.ts";

/** `component: () => null`. */
export const OptionCard: Component = { render: () => null };

/** genui OptionCards isImageTopContent: an element whose `src` is a string. */
function isImageTopContent(topContent: unknown): boolean {
  return isElementNode(topContent) && typeof topContent.props?.src === "string";
}

/** `@container (max-width: 768px)` and `(max-width: 480px)` of optionCards.scss. */
const TWO_COLUMNS_MAX = 768;
const ONE_COLUMN_MAX = 480;

/** The cards' indices by row. Width 0 (not measured yet) lays out as wide. */
function cardRows(count: number, width: number): number[][] {
  const indices = Array.from({ length: count }, (_, i) => i);
  if (width === 0 || width > TWO_COLUMNS_MAX) {
    let next = 0;
    return getRowConfiguration(count, 3).map((inRow) => indices.slice(next, (next += inRow)));
  }
  // Rows turn `display: contents`: one flat grid of 2 (or 1) columns; an odd last card spans both (`grid-column: 1 / -1`).
  const columns = width > ONE_COLUMN_MAX ? 2 : 1;
  const rows: number[][] = [];
  for (let i = 0; i < count; i += columns) rows.push(indices.slice(i, i + columns));
  return rows;
}

function card(ctx: RenderContext, item: Props, i: number, selected: boolean, disabled: boolean, onToggle: () => void): Element {
  const t = ctx.t;
  const hasTop = item.topContent != null;
  const image = isImageTopContent(item.topContent);

  // .openui-option-card__top: `--icon` a 2rem sunk tile (radius s, primary text); `--image` a 4.5rem clipped one (radius m).
  const top = hasTop
    ? image
      ? div().flex_none().self_start().w(72).h(72).rounded(t.radiusM).overflow_hidden().children(ctx.children(item.topContent, `card${i}:top`))
      : div()
          .flex()
          .flex_none()
          .self_start()
          .items_center()
          .justify_center()
          .w(32)
          .h(32)
          .rounded(t.radiusS)
          .bg(t.sunk)
          .text_color(t.textNeutralPrimary)
          .children(ctx.children(item.topContent, `card${i}:top`))
    : null;

  // __title: body heavy, primary; __subtitle: body small, secondary; tertiary on a disabled card.
  const titleFont = typography(t, "body", "heavy");
  const titleColor = disabled ? t.textNeutralTertiary : t.textNeutralPrimary;
  const subtitleFont = typography(t, "body", "small");
  const subtitleColor = disabled ? t.textNeutralTertiary : t.textNeutralSecondary;
  const subtitle = item.subtitle ? String(item.subtitle) : "";
  const text = div()
    .flex()
    .flex_col()
    .gap(t.space3xs)
    .min_w(0)
    .child(
      textStyle(div().text_color(titleColor), titleFont).child(
        markdownInline(ctx, `card${i}-title`, String(item.title ?? ""), { font: titleFont, color: titleColor }),
      ),
    )
    .children(
      subtitle
        ? [
            textStyle(div().text_color(subtitleColor), subtitleFont).child(
              markdownInline(ctx, `card${i}-subtitle`, subtitle, { font: subtitleFont, color: subtitleColor }),
            ),
          ]
        : [],
    );

  // __content: a column, align start, gap m.
  const content = div().flex().flex_col().items_start().justify_start().gap(t.spaceM).w_full().children(optional(top)).child(text);

  // .openui-option-card: padding s-m, 1px interactive border, radius 2xl, transparent; selected: sunk and the
  // selected border; hover (neither selected nor disabled): emphasis border; disabled: opacity .5.
  const el = GButton.new(ctx.id(`card${i}`))
    .selected(selected)
    .disabled(disabled)
    .on_click(onToggle)
    .flex()
    .flex_row()
    .items_start()
    .justify_start()
    .flex_1()
    .w_full()
    .p(t.spaceSM)
    .border_1()
    .rounded(t.radius2xl)
    .child(content);
  const styled = selected
    ? el.border_color(t.borderInteractiveSelected).bg(t.sunk)
    : el
        .border_color(t.borderInteractive)
        .bg(TRANSPARENT)
        .when(!disabled, (b) => b.hover((s) => s.border_color(t.borderInteractiveEmphasis)));
  // `--disabled` is a class of its own: it dims a selected card too.
  return disabled ? styled.opacity(0.5).cursor_not_allowed() : styled.cursor_pointer();
}

export const OptionCards: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const selection = selectionField(
      ctx,
      "OptionCards",
      { name: String(props.name), type: props.type, rules: props.rules, defaultValue: props.defaultValue },
      "single",
    );
    // Items without a value have no identity to select by (genui filters, then the component again).
    const items = (Array.isArray(props.items) ? props.items : []).flatMap((item): Props[] => (isElementNode(item) ? [item.props ?? {}] : [])).filter((p) => p.value);

    const size = ctx.local({ width: 0 }, "size");
    const rows = cardRows(items.length, size.width);

    // .openui-option-cards__grid: a column, gap m; each row a gap-m grid of equal columns, stretching its cards.
    return div()
      .id(ctx.id("size"))
      .flex()
      .flex_col()
      .gap(t.spaceM)
      .w_full()
      .on_size_change((s, cx) => {
        if (size.width !== s.width) {
          size.width = s.width;
          cx.notify();
        }
      })
      .children(
        rows.map((row) =>
          div()
            .flex()
            .flex_row()
            .gap(t.spaceM)
            .w_full()
            .children(
              row.map((index) => {
                const item = items[index]!;
                const i = index;
                const selected = selection.selected.includes(String(item.value));
                const disabled = selection.disabled || item.disabled === true;
                return div()
                  .flex()
                  .flex_col()
                  .flex_1()
                  .min_w(0)
                  .child(card(ctx, item, i, selected, disabled, () => selection.toggle(String(item.value))));
              }),
            ),
        ),
      );
  },
};
