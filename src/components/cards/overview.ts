// OverviewCardBlock, OverviewCardItem.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/OverviewCardBlock/{schema.ts,index.tsx}, genui-lib/cardActionUtils.ts,
//   components/OverviewCardBlock/{OverviewCardBlock.tsx,overviewCardBlock.scss},
//   components/_shared/cards/* (layout.ts)
//
// The metric is drawn by MetricIndicatorInline (misc.ts) from `value`, `subtext` and `trend` only,
// as upstream passes it.
import { isElementNode, type ElementNode } from "@openuidev/lang-core";
import { div, type Element } from "gpui-kit";
import { withItemContext } from "openui-card-action-utils";
import type { Component, RenderContext } from "../../render/surface.ts";
import { MetricIndicatorInline } from "../misc.ts";
import { cardBlock, chevron, clickableShadow, elementNodes, pressable, stringProp } from "./layout.ts";

/** `.openui-overview-card`: a top slot and chevron over an optional inline metric. */
function overviewCard(ctx: RenderContext, item: ElementNode, index: number, clickable: boolean, onClick: () => void): Element {
  const t = ctx.t;
  const { top, bottom } = item.props;
  const arrow = clickable ? chevron(ctx, 14) : null;

  // __slot--top: takes the row, min-height xl; __chevron: fixed, secondary.
  const topRow = div()
    .flex()
    .flex_row()
    .items_start()
    .justify_between()
    .gap(t.spaceS)
    .w_full()
    .min_w_0()
    .children(
      isElementNode(top)
        ? [
            div()
              .flex()
              .flex_row()
              .flex_1()
              .items_start()
              .justify_between()
              .gap(t.spaceS)
              .min_w_0()
              .min_h(t.spaceXl)
              .children(ctx.child(`top${index}`).children(top, "c")),
          ]
        : [],
    )
    .children(arrow ? [div().flex().flex_none().items_center().justify_center().text_color(t.textNeutralSecondary).child(arrow)] : []);

  // __slot--bottom: MetricIndicatorInline.
  const metric = isElementNode(bottom)
    ? div()
        .flex()
        .flex_col()
        .w_full()
        .min_w_0()
        .gap(t.space2xs)
        .child(
          MetricIndicatorInline.render(
            { value: bottom.props.value, subtext: bottom.props.subtext, trend: bottom.props.trend },
            ctx.child(`bottom${index}`),
            bottom,
          ) as Element,
        )
    : null;

  const box = div()
    .flex()
    .flex_col()
    .w_full()
    .min_w(158)
    .p(t.spaceSM)
    .border_1()
    .rounded(t.radius2xl)
    // __vertical: fills the card, the top at the top and the metric at the bottom, gap l.
    .child(div().flex().flex_col().flex_grow(1).justify_between().gap(t.spaceL).min_w_0().min_h_0().child(topRow).children(metric ? [metric] : []));
  if (!clickable) return box.bg(t.sunkLight).border_color(t.borderDefault);
  return pressable(ctx, clickableShadow(box.bg(t.foreground).border_color(t.borderInteractive), t.shadowM, t.foreground), index, onClick);
}

export const OverviewCardBlock: Component = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;

    const click = (item: ElementNode, index: number) => {
      if (!props.action || ctx.streaming) return;
      const { id, top, bottom } = item.props;
      const title = stringProp(top, "title") ?? stringProp(top, "value");
      ctx.trigger(
        title ?? (typeof id === "string" ? id : undefined) ?? `Overview card ${index + 1}`,
        withItemContext(props.action, {
          itemIndex: index,
          itemId: id,
          itemTitle: title,
          itemSubtitle: stringProp(top, "subtitle") ?? stringProp(top, "subtext"),
          itemMetricValue: isElementNode(bottom) ? bottom.props.value : undefined,
        }),
      );
    };

    const responsive = props.responsive !== false;
    return cardBlock(ctx, {
      count: items.length,
      layout: props.layout === "carousel" ? "carousel" : "grid",
      responsive,
      maxPerRow: 3,
      gap: props.gap,
      // `.openui-small-card-block--overview-card.--carousel` outranks the responsive rule: 15rem, 12.5rem at most 30rem.
      carouselWidth: (narrow) => (narrow ? 200 : 240),
      card: (i) => overviewCard(ctx, items[i]!, i, clickable, () => click(items[i]!, i)),
    });
  },
};

/** genui-lib Item components: `component: () => null`. */
export const OverviewCardItem: Component = { render: () => null };
