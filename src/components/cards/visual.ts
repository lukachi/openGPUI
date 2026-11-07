// VisualCardBlock, VisualCardItem.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/VisualCardBlock/{schema.ts,index.tsx}, genui-lib/cardActionUtils.ts, genui-lib/cardTagUtils.tsx,
//   components/VisualCardBlock/{VisualCardBlock.tsx,visualCardBlock.scss},
//   components/_shared/utils/safeUrl.ts (toCssUrl: compiled as is, `openui-safe-url`),
//   components/_shared/cards/* (layout.ts)
//
// Pictures come through the host (render/images.ts: ctx.image).
//
// Where gpui differs:
// - The photo is placed by its intrinsic size and clipped by the card (`background-size: cover`): a
//   clipping box does not round its children, so the photo's corners stay square where the card's are
//   rounded. The gradient over it is a rounded path and follows the card.
// - The tag and the chevron badge are filled rgb(0 0 0 / 40%) without `backdrop-filter: blur(2px)`.
// - The hover zoom (`scale(1.04)` on the photo) grows the picture's box about its center instead of a
//   transform; the card's own `scale(0.995)` is not drawn.
import { isElementNode, type ElementNode } from "@openuidev/lang-core";
import { Background, PathBuilder, div, type Element } from "gpui-kit";
import { withItemContext } from "openui-card-action-utils";
import { safeUrl } from "openui-safe-url";
import { fitImage } from "../../render/images.ts";
import type { Component, RenderContext } from "../../render/surface.ts";
import { alpha } from "../../render/tokens.ts";
import { layer } from "../charts/paint.ts";
import { cardBlock, cardTag, chevron, clickableShadow, elementNodes, pressable, stringProp } from "./layout.ts";

/** A rounded rectangle as a fill path, in its own pixels (`::after`'s box with the card's inner radius). */
function roundedRect(w: number, h: number, radius: number) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return PathBuilder.fill()
    .move_to(r, 0)
    .line_to(w - r, 0)
    .arc_to(r, r, 0, false, true, w, r)
    .line_to(w, h - r)
    .arc_to(r, r, 0, false, true, w - r, h)
    .line_to(r, h)
    .arc_to(r, r, 0, false, true, 0, h - r)
    .line_to(0, r)
    .arc_to(r, r, 0, false, true, r, 0)
    .close()
    .build();
}

/** `rgb(0 0 0 / 40%)`, the tag's and the chevron badge's fill. */
const SCRIM = "#00000066";

interface CardState {
  width: number;
  height: number;
  hover: boolean;
}

/** `.openui-visual-first-card`. */
function visualCard(ctx: RenderContext, item: ElementNode, index: number, clickable: boolean, onClick: () => void): Element {
  const t = ctx.t;
  const { tag, body, bgImageSrc } = item.props;
  const src = typeof bgImageSrc === "string" ? safeUrl(bgImageSrc) : undefined;
  const state = src ? ctx.image(src) : null;
  const local = ctx.local<CardState>({ width: 0, height: 0, hover: false }, `card${index}`);
  // The layers fill the padding box: the card less its 1px border.
  const inner = { width: Math.max(0, local.width - 2), height: Math.max(0, local.height - 2) };

  const layers: Element[] = [];
  if (state?.status === "ready" && inner.width > 0 && inner.height > 0) {
    // ::before: the photo, `cover`, zooming on a clickable card's hover.
    layers.push(
      div()
        .absolute()
        .top(0)
        .left(0)
        .size_full()
        .child(fitImage(state, inner, "cover", { zoom: clickable && local.hover ? 1.04 : 1, transition: 250 })),
    );
  }
  if (inner.width > 0 && inner.height > 0) {
    // ::after: linear-gradient(180deg, rgb(0 0 0 / 12%) 0%, rgb(0 0 0 / 56%) 100%).
    layers.push(
      layer({
        path: roundedRect(inner.width, inner.height, t.radius3xl - 1),
        paint: Background.linear_gradient(180, Background.stop(alpha("#000000ff", 0.12), 0), Background.stop(alpha("#000000ff", 0.56), 1)),
      }),
    );
  }

  // __top: the tag (white on a scrim) and, when clickable, the chevron badge.
  const tagEl = cardTag(ctx, tag, `tag${index}`)?.bg(SCRIM).text_color(t.textWhite);
  const arrow = clickable ? chevron(ctx, 16) : null;
  const top = div()
    .relative()
    .flex()
    .flex_row()
    .items_start()
    .justify_between()
    .min_h(24)
    .p(t.spaceM)
    .child(div().min_w_0().children(tagEl ? [tagEl] : []))
    .children(
      arrow
        ? [div().flex().flex_none().items_center().justify_center().bg(SCRIM).text_color(t.textWhite).rounded(t.radiusS).p(t.space2xs).child(arrow)]
        : [],
    );

  // __bottom: the body panel, at the end of the card with an m margin.
  const bodyEl = isElementNode(body) ? ctx.child(`body${index}`).children(body, "c") : [];
  const bottom = bodyEl.length
    ? div()
        .relative()
        .mx(t.spaceM)
        .mb(t.spaceM)
        .px(t.spaceSM)
        .py(t.spaceS)
        .bg(t.foreground)
        .border_1()
        .border_color(t.borderDefault)
        .rounded(t.radiusL)
        .children(bodyEl)
    : null;

  let box = div()
    .id(ctx.id(`box-${index}`))
    .relative()
    .flex()
    .flex_col()
    .min_h(280)
    .h_full()
    .rounded(t.radius3xl)
    .overflow_hidden()
    .bg(t.highlightSubtle)
    .border_1()
    .border_color(clickable ? t.borderInteractive : t.borderDefault)
    .on_size_change((s, cx) => {
      if (local.width !== s.width || local.height !== s.height) {
        local.width = s.width;
        local.height = s.height;
        cx.notify();
      }
    });
  if (clickable) {
    box = clickableShadow(box, t.shadowS).on_hover((hovered, cx) => {
      if (local.hover !== hovered) {
        local.hover = hovered;
        cx.notify();
      }
    });
  }
  box = box.children(layers).child(top).child(div().flex_1()).children(bottom ? [bottom] : []);
  return clickable ? pressable(ctx, box, index, onClick) : box;
}

export const VisualCardBlock: Component = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;

    const click = (item: ElementNode, index: number) => {
      if (!props.action || ctx.streaming) return;
      const { id, body, tag, bgImageSrc, bgImageAlt } = item.props;
      const bodyValue = stringProp(body, "value");
      const tagText = stringProp(tag, "text");
      ctx.trigger(
        bodyValue || tagText || (typeof id === "string" ? id : "") || `Visual card ${index + 1}`,
        withItemContext(props.action, {
          itemIndex: index,
          itemId: id,
          itemTag: tagText,
          itemBody: bodyValue,
          itemBodySubtext: isElementNode(body) ? body.props.subtext : undefined,
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
      // medium: 20rem, 17.5rem at most 30rem wide.
      carouselWidth: (narrow) => (responsive && narrow ? 280 : 320),
      card: (i) => visualCard(ctx, items[i]!, i, clickable, () => click(items[i]!, i)),
    });
  },
};

/** genui-lib Item components: `component: () => null`. */
export const VisualCardItem: Component = { render: () => null };
