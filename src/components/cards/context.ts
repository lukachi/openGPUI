// ContextCardBlock, ContextCardItem.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/ContextCardBlock/{schema.ts,index.tsx}, genui-lib/cardActionUtils.ts, genui-lib/cardTagUtils.tsx,
//   components/ContextCardBlock/{ContextCardBlock.tsx,contextCardBlock.scss},
//   components/_shared/utils/safeUrl.ts (toCssUrl: compiled as is, `openui-safe-url`),
//   components/_shared/cards/* (layout.ts)
//
// Pictures come through the host (render/images.ts: ctx.image).
//
// Where gpui differs:
// - The background image is placed by its intrinsic size and clipped by the card (`background-size:
//   cover`, no rounding of the picture): its corners stay square where the card's are rounded.
// - A tag over a picture has no `backdrop-filter: blur(2px)`: gpui has no filters.
import { isElementNode, type ElementNode } from "@openuidev/lang-core";
import { div, type Color, type Element } from "gpui-kit";
import { withItemContext } from "openui-card-action-utils";
import { safeUrl } from "openui-safe-url";
import { markdownInline } from "../../markdown/render.ts";
import { fitImage } from "../../render/images.ts";
import type { Component, RenderContext } from "../../render/surface.ts";
import { textStyle, typography, type Tokens } from "../../render/tokens.ts";
import { cardBlock, cardTag, chevron, elementNodes, pressable, stringProp } from "./layout.ts";

/** What a `--variant-*` card sets: its fill, text color, the title's color and opacity, and (image only) its tag's fill and text. */
interface Look {
  bg?: Color;
  color?: Color;
  titleColor?: Color;
  titleOpacity?: number;
  tagBg?: Color;
  tagColor?: Color;
}

// genui's `bgColor` enum is ["gray"]; the component's info/success/warning/danger tints can't be reached from OpenUI Lang.
function variantLook(t: Tokens, variant: "gray" | "image" | undefined): Look {
  switch (variant) {
    case "gray":
      return { bg: t.highlight, color: t.textNeutralPrimary };
    case "image":
      return { color: t.textWhite, titleColor: t.textWhite, titleOpacity: 0.6, tagBg: "#00000066", tagColor: t.textWhite };
    default:
      return {};
  }
}

/** `.openui-context-card`. */
function contextCard(ctx: RenderContext, item: ElementNode, index: number, clickable: boolean, onClick: () => void): Element {
  const t = ctx.t;
  const { title, body, bgColor, bgImageSrc } = item.props;
  const src = typeof bgImageSrc === "string" ? safeUrl(bgImageSrc) : undefined;
  const look = variantLook(t, src ? "image" : bgColor === "gray" ? "gray" : undefined);
  const size = ctx.local({ width: 0, height: 0 }, `card${index}`);

  // __title-text: body small, secondary (the variant's color, dimmed); a tag sits in its own full-width wrapper.
  const tag = cardTag(ctx, title, `tag${index}`);
  const titleEl = tag
    ? div()
        .flex()
        .flex_row()
        .items_center()
        .w_full()
        .child(tag.when(!!look.tagBg, (el) => el.bg(look.tagBg!)).when(!!look.tagColor, (el) => el.text_color(look.tagColor!)))
    : typeof title === "string" && title !== ""
      ? textStyle(div().text_color(look.titleColor ?? t.textNeutralSecondary), typography(t, "body", "small"))
          .when(look.titleOpacity !== undefined, (el) => el.opacity(look.titleOpacity!))
          .child(title)
      : null;
  const arrow = clickable ? chevron(ctx, 16) : null;

  // __slot--top: title (or tag) and chevron, at least xl high.
  const top = div()
    .flex()
    .flex_row()
    .items_start()
    .justify_between()
    .gap(t.spaceS)
    .w_full()
    .min_h(t.spaceXl)
    .children(titleEl ? [titleEl] : [])
    .children(arrow ? [div().flex().flex_none().items_center().justify_center().opacity(0.7).child(arrow)] : []);

  // __body-text: body heavy in the card's color, inline markdown.
  const font = typography(t, "body", "heavy");
  const color = look.color ?? t.textNeutralPrimary;
  const bottom =
    typeof body === "string" && body !== ""
      ? div()
          .flex()
          .flex_col()
          .w_full()
          .gap(t.space2xs)
          .child(textStyle(div().text_color(color), font).child(markdownInline(ctx, `body${index}`, body, { font, color })))
      : null;

  // __vertical: fills the card, the title at the top and the body at the bottom, gap l.
  const content = div()
    .flex()
    .flex_col()
    .flex_grow(1)
    .justify_between()
    .min_w_0()
    .h_full()
    .gap(t.spaceL)
    .child(top)
    .children(bottom ? [bottom] : []);

  // The picture and its overlay (`::before`, inset 0) sit under the content.
  const state = src ? ctx.image(src) : null;
  const layers: Element[] = [];
  if (src) {
    if (state?.status === "ready" && size.width > 0 && size.height > 0) {
      layers.push(div().absolute().top(0).left(0).size_full().child(fitImage(state, { width: size.width, height: size.height }, "cover")));
    }
    layers.push(div().absolute().top(0).left(0).size_full().bg(t.overlay));
  }

  const box = div()
    .id(ctx.id(`box-${index}`))
    .relative()
    .flex()
    .flex_row()
    .items_start()
    .justify_between()
    .w_full()
    .min_w(196)
    .p(t.spaceM)
    .rounded(t.radiusXl)
    .overflow_hidden()
    .bg(look.bg ?? (clickable ? t.highlight : t.highlightSubtle))
    .when(!!look.color, (el) => el.text_color(look.color!))
    .on_size_change((s, cx) => {
      if (size.width !== s.width || size.height !== s.height) {
        size.width = s.width;
        size.height = s.height;
        cx.notify();
      }
    })
    .children(layers)
    .child(content);
  return clickable ? pressable(ctx, box, index, onClick) : box;
}

export const ContextCardBlock: Component = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;

    const click = (item: ElementNode, index: number) => {
      if (!props.action || ctx.streaming) return;
      const { id, title, body, bgColor, bgImageSrc, bgImageAlt } = item.props;
      // getContextTitleText: a string title, or the Tag's text.
      const titleText = typeof title === "string" ? title : isElementNode(title) ? (stringProp(title, "text") ?? "") : "";
      void ctx.trigger(
        titleText || (typeof id === "string" ? id : "") || `Context card ${index + 1}`,
        withItemContext(props.action, {
          itemIndex: index,
          itemId: id,
          itemTitle: titleText,
          itemBody: body,
          itemBgColor: bgColor,
          itemBgImageSrc: bgImageSrc,
          itemBgImageAlt: bgImageAlt,
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
      carouselWidth: (narrow) => (responsive && narrow ? 240 : 280),
      card: (i) => contextCard(ctx, items[i]!, i, clickable, () => click(items[i]!, i)),
    });
  },
};

/** genui-lib Item components: `component: () => null`. */
export const ContextCardItem: Component = { render: () => null };
