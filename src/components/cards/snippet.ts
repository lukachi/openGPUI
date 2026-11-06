// SnippetCardBlock, SnippetCardItem.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/SnippetCardBlock/{schema.ts,index.tsx}, genui-lib/cardActionUtils.ts,
//   components/SnippetCardBlock/{SnippetCardBlock.tsx,snippetCardBlock.scss},
//   components/_shared/cards/* (layout.ts)
//
// Where gpui differs:
// - The label and value are clipped to one line ending in "…" only when they are plain text
//   (gpui ellipsizes a single run of text); formatted text (`**bold**`) wraps instead.
// - TooltipWrapper (the heading/subtitle tooltip shown when a label or value is truncated) is not
//   drawn: gpui's tooltip takes a string only and a script cannot tell that text is cut.
import { isElementNode, type ElementNode } from "@openuidev/lang-core";
import { div, type Element } from "gpui-kit";
import { withItemContext } from "openui-card-action-utils";
import type { Component, RenderContext } from "../../render/surface.ts";
import { cardBlock, cardTextScope, chevron, clickableShadow, elementNodes, pressable, stringProp, withProps } from "./layout.ts";

/** `.openui-value-card`: label left, value (or a chevron when clickable) right. */
function snippetCard(ctx: RenderContext, item: ElementNode, index: number, clickable: boolean, onClick: () => void): Element {
  const t = ctx.t;
  const { lhs, rhs } = item.props;
  const lhsCtx = cardTextScope(ctx, `lhs${index}`, { ellipsis: true });
  const rhsCtx = cardTextScope(ctx, `rhs${index}`, { ellipsis: true, end: true });

  // __lhs: flex 1, items centred; its IconText/ImageText fills it and clips.
  const left = div()
    .flex()
    .flex_row()
    .items_center()
    .flex_1()
    .min_w_0()
    .child(div().w_full().min_w_0().overflow_hidden().children(lhsCtx.children(lhs, "c")));

  // __rhs: a row at the end with an extra m margin; Text/BoldText at the xs size, or the chevron.
  const value = isElementNode(rhs) ? rhsCtx.children(withProps(rhs, { size: "xs" }), "c") : [];
  const arrow = clickable ? chevron(ctx, 14) : null;
  const right = div()
    .flex()
    .flex_row()
    .flex_shrink(1)
    .items_center()
    .justify_end()
    .min_w_0()
    .ml(t.spaceM)
    .text_color(t.textNeutralPrimary)
    .children(
      value.length
        ? [div().flex().flex_row().justify_end().min_w_0().max_w_full().overflow_hidden().children(value)]
        : arrow
          ? [div().flex().items_center().justify_center().text_color(t.textNeutralSecondary).child(arrow)]
          : [],
    );

  const box = div()
    .flex()
    .flex_row()
    .items_center()
    .justify_between()
    .gap(t.spaceM)
    .w_full()
    .min_w_0()
    .p(t.spaceSM)
    .border_1()
    .rounded(t.radius2xl)
    .relative()
    .overflow_hidden()
    .child(left)
    .child(right);
  if (!clickable) return box.bg(t.sunkLight).border_color(t.borderDefault);
  return pressable(ctx, clickableShadow(box.bg(t.foreground).border_color(t.borderInteractive), t.shadowS), index, onClick);
}

export const SnippetCardBlock: Component = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;

    const click = (item: ElementNode, index: number) => {
      if (!props.action || ctx.streaming) return;
      const { id, lhs, rhs } = item.props;
      const label = stringProp(lhs, "title") ?? (typeof id === "string" ? id : undefined) ?? `Snippet card ${index + 1}`;
      void ctx.trigger(
        label,
        withItemContext(props.action, {
          itemIndex: index,
          itemId: id,
          itemTitle: stringProp(lhs, "title"),
          itemSubtitle: stringProp(lhs, "subtitle"),
          itemValue: stringProp(rhs, "value"),
        }),
      );
    };

    return cardBlock(ctx, {
      count: items.length,
      layout: "grid",
      responsive: props.responsive !== false,
      maxPerRow: 2,
      gap: props.gap,
      carouselWidth: () => 280,
      card: (i) => snippetCard(ctx, items[i]!, i, clickable, () => click(items[i]!, i)),
    });
  },
};

/** genui-lib Item components: `component: () => null`. */
export const SnippetCardItem: Component = { render: () => null };
