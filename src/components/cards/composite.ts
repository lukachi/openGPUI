// CompositeCardBlock, CompositeCardItem.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/CompositeCardBlock/{schema.ts,index.tsx}, genui-lib/cardActionUtils.ts,
//   components/CompositeCardBlock/{CompositeCardBlock.tsx,compositeCardBlock.scss},
//   components/_shared/cards/* (layout.ts)
//
// A card holds other components, drawn through the registry with the props genui sets for a
// composite card (renderCompositeCardNode): Text and BoldText in the body at size xs, charts 180px
// high, ListBlock at size small, EntityList small without header and footer, TagBlock sm, Button small.
// The scope marks everything inside a composite card for its inline markdown rules
// (`strong`/`em` inherit the slot's font at the medium weight, `code` is code-sm).
//
// A clickable card's footer Button fires its own action and then the card's, as in React (react-ui's
// Button never stops the click; ours bubbles it: buttons.ts `bubble`).
import { isElementNode, type ElementNode } from "@openuidev/lang-core";
import { div, type Element } from "gpui-kit";
import { withItemContext } from "openui-card-action-utils";
import type { Component, RenderContext } from "../../render/surface.ts";
import { cardBlock, cardTextScope, clickableShadow, elementNodes, pressable, withProps } from "./layout.ts";

const CHART_HEIGHT = 180;

/** renderCompositeCardNode: the props genui overrides for `node` in the card's body or footer. */
function compositeProps(node: unknown, location: "body" | "footer"): unknown {
  if (!isElementNode(node)) return node;
  switch (node.typeName) {
    case "Text":
    case "BoldText":
      return location === "body" ? withProps(node, { size: "xs" }) : node;
    case "AreaChart":
    case "BarChart":
    case "LineChart":
      return withProps(node, { height: CHART_HEIGHT });
    case "ListBlock":
      return withProps(node, { size: "small" });
    case "EntityList":
      return withProps(node, { size: "small", header: undefined, footer: undefined });
    case "TagBlock":
      return withProps(node, { size: "sm" });
    case "Button":
      return withProps(node, { size: "small" });
    default:
      return node;
  }
}

/** The footer is a plain `{ price?, button? }` object, not an element. */
function footerParts(footer: unknown): { price: unknown; button: unknown } {
  if (typeof footer !== "object" || footer === null) return { price: undefined, button: undefined };
  return { price: "price" in footer ? footer.price : undefined, button: "button" in footer ? footer.button : undefined };
}

/** `.openui-composite-card`: header, stacked body, footer. */
function compositeCard(ctx: RenderContext, item: ElementNode, index: number, clickable: boolean, onClick: () => void): Element {
  const t = ctx.t;
  const { header, body, footer } = item.props;
  const inside = cardTextScope(ctx, `item${index}`, { composite: true });
  const bodyItems = Array.isArray(body) ? body : [];
  const { price, button } = footerParts(footer);

  const headerEls = header ? inside.children(header, "header") : [];
  const bodyEls = bodyItems.flatMap((node, i) => inside.children(compositeProps(node, "body"), `body${i}`));
  const priceEls = price ? inside.children(compositeProps(price, "footer"), "price") : [];
  const buttonEls = button ? inside.children(compositeProps(button, "footer"), "button") : [];

  const box = div()
    .flex()
    .flex_col()
    .gap(t.spaceM)
    .min_w(240)
    .h_full()
    .p(t.spaceM)
    .border_1()
    .rounded(t.radius3xl)
    .text_color(t.textNeutralPrimary)
    // __header: a column, gap m; __body: takes the free height, a column, gap m;
    // __footer: at the end, price over button, gap s.
    .children(headerEls.length ? [div().flex().flex_col().flex_none().gap(t.spaceM).children(headerEls)] : [])
    .children(bodyItems.length > 0 ? [div().flex().flex_col().flex_grow(1).min_h_0().gap(t.spaceM).children(bodyEls)] : [])
    .children(
      price || button
        ? [div().flex().flex_none().mt_auto().w_full().child(div().flex().flex_col().gap(t.spaceS).w_full().children(priceEls).children(buttonEls))]
        : [],
    );
  if (!clickable) return box.bg(t.sunkLight).border_color(t.borderDefault);
  return pressable(ctx, clickableShadow(box.bg(t.foreground).border_color(t.borderInteractive), t.shadowM), index, onClick);
}

/** getCompositeHeaderText: the header's first string among each of these props. */
function headerText(item: ElementNode): { title?: string; subtitle?: string; imageAlt?: string } {
  const header = item.props.header;
  if (!isElementNode(header)) return {};
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = header.props[key];
      if (typeof value === "string") return value;
    }
    return undefined;
  };
  return { title: pick("title", "value"), subtitle: pick("subtitle", "subtext"), imageAlt: pick("alt") };
}

export const CompositeCardBlock: Component = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;

    const click = (item: ElementNode, index: number) => {
      if (!props.action || ctx.streaming) return;
      const { title, subtitle, imageAlt } = headerText(item);
      const { id, body, footer } = item.props;
      const { price, button } = footerParts(footer);
      ctx.trigger(
        title || imageAlt || (typeof id === "string" ? id : "") || `Composite card ${index + 1}`,
        withItemContext(props.action, {
          itemIndex: index,
          itemId: id,
          itemHeaderTitle: title,
          itemHeaderSubtitle: subtitle,
          itemHeaderAlt: imageAlt,
          itemBodyCount: Array.isArray(body) ? body.length : 0,
          itemFooterPrice: isElementNode(price) && "value" in price.props ? price.props.value : undefined,
          itemFooterButtonLabel: isElementNode(button) ? button.props.label : undefined,
        }),
      );
    };

    const responsive = props.responsive !== false;
    return cardBlock(ctx, {
      count: items.length,
      layout: props.layout === "carousel" ? "carousel" : "grid",
      responsive,
      maxPerRow: 2,
      gap: props.gap,
      // medium: 20rem, 17.5rem at most 30rem wide.
      carouselWidth: (narrow) => (responsive && narrow ? 280 : 320),
      card: (i) => compositeCard(ctx, items[i]!, i, clickable, () => click(items[i]!, i)),
    });
  },
};

/** genui-lib Item components: `component: () => null`. */
export const CompositeCardItem: Component = { render: () => null };
