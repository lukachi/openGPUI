// Carousel.
//
// Ported from react-ui at the pinned commit:
//   Carousel  genui-lib/Carousel/index.tsx, components/Carousel/{Carousel.tsx,carousel.scss}
//
// Where gpui differs from the browser (see also docs/gpui-differences.md):
// - The row scrolls by an offset the carousel owns (gpui-kit cannot scroll a div
//   from code). The wheel and trackpad move it; after a pause (120ms) it snaps
//   to the nearest card edge, as `scroll-snap-type: x mandatory` does. The
//   arrows step one card with a 300ms ease-in-out slide, like `scrollTo({
//   behavior: "smooth" })`. There is no scrollbar, matching upstream's hidden one.
// - The 40px edge fade (`mask-image` on the scrolling row) cannot be drawn:
//   gpui has no mask and the page colour behind the carousel is unknown.
//   A card cut off at an edge shows hard instead of fading out.
// - The `@media (max-width: 400px)` rule (cards 248px wide) needs the window's
//   width, which a render cannot read: cards stay 280px.
import { div, type Context, type Element, type ScrollWheelEvent } from "gpui-kit";
import { optional, type Component } from "../render/surface.ts";
import { textStyle, typography } from "../render/tokens.ts";
import { iconButton } from "./buttons.ts";

/** `.openui-carousel-item` width. */
const ITEM_WIDTH = 280;
/** How long the wheel rests before the row snaps to a card edge. */
const SNAP_DELAY = 120;

interface CarouselState {
  /** The scrolling row's visible width, px. */
  viewport: number;
  /** Horizontal scroll offset, px. */
  offset: number;
  /** Whether the last offset change should slide. */
  smooth: boolean;
  /** Bumped by every wheel event: only the last one's snap runs. */
  wheel: number;
}

export const Carousel: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const items = Array.isArray(props.children) ? props.children : [];
    const variant = props.variant === "sunk" ? "sunk" : "card";
    const local = ctx.local<CarouselState>({ viewport: 0, offset: 0, smooth: false, wheel: 0 });

    // Card i starts at lefts[i]; the row is as wide as the cards and gaps.
    const gap = t.spaceM;
    const lefts = items.map((_, i) => i * (ITEM_WIDTH + gap));
    const total = items.length ? items.length * ITEM_WIDTH + (items.length - 1) * gap : 0;
    const maxOffset = local.viewport > 0 ? Math.max(0, total - local.viewport) : 0;
    const offset = Math.min(Math.max(0, local.offset), maxOffset);
    // The scroll handler's `canScrollLeft` / `canScrollRight`.
    const canPrev = offset > 0;
    const canNext = local.viewport > 0 && Math.ceil(offset) + local.viewport < total;

    const scrollTo = (next: number, smooth: boolean, cx: Context) => {
      local.offset = Math.min(Math.max(0, next), maxOffset);
      local.smooth = smooth;
      cx.notify();
    };

    /** Carousel's `scroll(direction)`: from the first card whose left edge is in view, one card on. */
    const step = (direction: "left" | "right", cx: Context) => {
      if (!items.length) return;
      const visible = lefts.findIndex((left) => left - offset >= -0.5);
      const current = visible === -1 ? items.length - 1 : visible;
      const target = direction === "left" ? Math.max(0, current - 1) : Math.min(items.length - 1, current + 1);
      scrollTo(lefts[target]!, true, cx);
    };

    // .openui-carousel-item: body default, column gap m, 280px, radius 2xl, padding m, 1px border default.
    const card = (item: unknown, i: number): Element =>
      textStyle(
        div()
          .id(ctx.id(`item-${i}`))
          .flex()
          .flex_col()
          .flex_none()
          .gap(t.spaceM)
          .w(ITEM_WIDTH)
          .rounded(t.radius2xl)
          .bg(variant === "sunk" ? t.highlightSubtle : t.foreground)
          .p(t.spaceM)
          .border_1()
          .border_color(t.borderDefault)
          .text_color(t.textNeutralPrimary),
        typography(t, "body", "default"),
      ).children(ctx.children(item, `item-${i}`));

    const row = div()
      .id(ctx.id("row"))
      .relative()
      .flex()
      .flex_row()
      .flex_none()
      .gap(gap)
      .when(maxOffset > 0, (el) => el.left(-offset))
      .when(local.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" }))
      .children(items.map(card));

    // .openui-carousel-content: the row's clip; scrolls sideways.
    const content = div()
      .id(ctx.id("content"))
      .flex()
      .flex_row()
      .flex_1()
      .min_w(0)
      .overflow_hidden()
      .on_size_change((size, cx) => {
        if (local.viewport !== size.width) {
          local.viewport = size.width;
          cx.notify();
        }
      })
      .when(maxOffset > 0, (el) =>
        el.on_scroll_wheel((e: ScrollWheelEvent, cx) => {
          const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
          if (dx === 0) return;
          cx.stop_propagation();
          const token = ++local.wheel;
          scrollTo(Math.min(Math.max(0, local.offset), maxOffset) - dx, false, cx); // from the live offset: several events can arrive between renders
          // scroll-snap-type: x mandatory: settle on the nearest card edge once the wheel rests.
          cx.timer.after(SNAP_DELAY, (cx) => {
            if (token !== local.wheel) return;
            const at = Math.min(Math.max(0, local.offset), maxOffset);
            const edges = lefts.map((l) => Math.min(l, maxOffset));
            const nearest = edges.reduce((best, e2) => (Math.abs(e2 - at) < Math.abs(best - at) ? e2 : best), edges[0] ?? 0);
            if (nearest !== at) scrollTo(nearest, true, cx);
          });
        }),
      )
      .child(row);

    // .openui-carousel-button: a secondary small square IconButton centred on the edge, 12px outside it.
    const arrow = (side: "left" | "right"): Element | null => {
      if (!(side === "left" ? canPrev : canNext)) return null;
      return div()
        .absolute()
        .top(0)
        .h_full()
        .flex()
        .items_center()
        .when(side === "left", (el) => el.left(-12))
        .when(side === "right", (el) => el.right(-12))
        .child(
          div()
            .flex()
            .items_center()
            .justify_center()
            .rounded(t.radiusS)
            .bg(t.foreground)
            .child(
              iconButton(ctx, {
                id: ctx.id(side),
                icon: side === "left" ? "ChevronLeft" : "ChevronRight",
                size: "small",
                variant: "secondary",
                surface: t.foreground, // .openui-carousel-button
                onClick: (cx) => step(side, cx),
              }),
            ),
        );
    };

    return div()
      .id(ctx.id())
      .relative()
      .flex()
      .flex_row()
      .child(content)
      .children([arrow("left"), arrow("right")].flatMap(optional));
  },
};
