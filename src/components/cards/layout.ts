// Card blocks: the grid/carousel scaffolding and click wiring every block shares.
//
// Ported from react-ui at the pinned commit:
//   components/_shared/cards/{CardBlockLayout.tsx,smallCardBlock.scss,mediumCardBlock.scss}
//   components/_shared/cards/smallCardBlockUtils.ts   (getRowConfiguration, compiled as is: `openui-card-layout-utils`)
//   genui-lib/cardActionUtils.ts                      (withItemContext, compiled as is: `openui-card-action-utils`)
//   genui-lib/cardTagUtils.tsx                        (renderCardTag)
//
// The block is its own `container-type: inline-size`: its `@container` rules read the
// block's measured width (on_size_change), so a block is drawn once at the wide layout
// before the first measure settles.
//
// Where gpui differs:
// - The carousel's row scrolls by an offset the block owns (gpui-kit cannot scroll a div
//   from code): wheel, trackpad and shift-wheel move it; there is no scrollbar, matching
//   upstream's hidden one. The 48px edge fade (`mask-image`) is not drawn: gpui has no mask.
// - The clickable cards' `transform: scale(0.995)` on hover is not drawn (gpui cannot scale);
//   the hover keeps the shadow reset. The 2px focus ring is not drawn either.
import { div, type Element, type FocusHandle, type ScrollWheelEvent } from "gpui-kit";
import { isElementNode, type ElementNode } from "@openuidev/lang-core";
import { getRowConfiguration } from "openui-card-layout-utils";
import { type RenderContext } from "../../render/surface.ts";
import { shadow, type ShadowPreset, type Tokens } from "../../render/tokens.ts";
import { Tag } from "../content.ts";

/** `@container (max-width: 48rem)` and `(max-width: 30rem)`. */
const CONTAINER_MEDIUM = 768;
const CONTAINER_SMALL = 480;

// ── Props ──

/** The element nodes among `value`: an item that has not streamed in yet is not one. */
export function elementNodes(value: unknown): ElementNode[] {
  return (Array.isArray(value) ? value : []).filter(isElementNode);
}

/** A string prop of an element node, as the genui renderers' `getStringProp` reads it. */
export function stringProp(node: unknown, key: string): string | undefined {
  const value = isElementNode(node) ? node.props?.[key] : undefined;
  return typeof value === "string" ? value : undefined;
}

/** `node` with some props replaced (genui `withProps`): a copy, the evaluated tree is shared. */
export function withProps(node: ElementNode, overrides: Record<string, unknown>): ElementNode {
  return { ...node, props: { ...node.props, ...overrides } };
}

/** Child context whose descendants get the card text rules of `ctx.scope.cardText`. */
export function cardTextScope(ctx: RenderContext, suffix: string, cardText: NonNullable<RenderContext["scope"]["cardText"]>): RenderContext {
  return ctx.child(suffix, { ...ctx.scope, cardText });
}

/** genui-lib/cardTagUtils renderCardTag: a Tag at the small size, neutral by default; null without one. */
export function cardTag(ctx: RenderContext, tag: unknown, suffix: string): Element | null {
  if (!isElementNode(tag)) return null;
  const { text, variant, icon } = tag.props;
  const named = isElementNode(icon) && typeof icon.props?.name === "string" && icon.props.name !== "";
  return Tag.render({ text, variant: variant ?? "neutral", size: "sm", icon: named ? icon : undefined }, ctx.child(suffix), tag) as Element;
}

// ── Layout ──

/** `gap`: a number is px, a string any CSS length; falsy takes the block's default (space-m). */
function resolveGap(t: Tokens, gap: unknown): number {
  if (!gap) return t.spaceM;
  if (typeof gap === "number") return Math.max(0, gap);
  if (typeof gap !== "string") return 0;
  // `gap: var(--openui-*-card-gap)` is invalid at computed-value time for anything else: gap `normal`.
  const m = /^\s*(\d*\.?\d+)(px|rem|em)\s*$/i.exec(gap);
  if (!m) return 0;
  return Number(m[1]) * (m[2]!.toLowerCase() === "px" ? 1 : 16);
}

/** n items in rows of `per` (the responsive grid reflowing to 2 or 1 columns). */
function rowsOf(n: number, per: number): number[] {
  return Array.from({ length: Math.ceil(n / per) }, (_, i) => Math.min(per, n - i * per));
}

interface CarouselState {
  /** Horizontal scroll offset, px. */
  offset: number;
}

export interface CardBlockOptions {
  count: number;
  layout: "grid" | "carousel";
  responsive: boolean;
  /** 2 or 3 cards per row in the wide layout. */
  maxPerRow: 2 | 3;
  gap: unknown;
  /** A carousel card's width; `narrow` is the container at most 30rem wide. */
  carouselWidth: (narrow: boolean) => number;
  /** The card at `index`: it fills its cell. */
  card: (index: number) => Element;
}

/** CardBlockLayout: the grid of rows (or the carousel) of `card`s. */
export function cardBlock(ctx: RenderContext, o: CardBlockOptions): Element {
  const t = ctx.t;
  const gap = resolveGap(t, o.gap);
  const size = ctx.local({ width: 0 }, "block");
  const scroll = ctx.local<CarouselState>({ offset: 0 }, "scroll");
  const root = div()
    .id(ctx.id())
    .w_full()
    .on_size_change((s, cx) => {
      if (size.width !== s.width) {
        size.width = s.width;
        cx.notify();
      }
    });

  if (o.layout === "carousel") {
    const width = o.carouselWidth(size.width > 0 && size.width <= CONTAINER_SMALL);
    const total = o.count > 0 ? o.count * width + (o.count - 1) * gap : 0;
    const maxOffset = size.width > 0 ? Math.max(0, total - size.width) : 0;
    const offset = Math.min(Math.max(0, scroll.offset), maxOffset);
    // __carousel: scrolls sideways, clipped; __carousel-track: a row at its content's width, padding 2xs 0.
    const track = div()
      .id(ctx.id("track"))
      .relative()
      .flex()
      .flex_row()
      .flex_none()
      .gap(gap)
      .py(t.space2xs)
      .when(maxOffset > 0, (el) => el.left(-offset))
      .children(Array.from({ length: o.count }, (_, i) => div().id(ctx.id(`cell-${i}`)).flex().flex_col().flex_none().w(width).child(o.card(i).flex_grow(1))));
    return root.child(
      div()
        .id(ctx.id("carousel"))
        .flex()
        .flex_row()
        .w_full()
        .overflow_hidden()
        .when(maxOffset > 0, (el) =>
          el.on_scroll_wheel((e: ScrollWheelEvent, cx) => {
            const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
            if (dx === 0) return;
            cx.stop_propagation();
            // From the live offset: several events can arrive between renders.
            scroll.offset = Math.min(Math.max(0, scroll.offset - dx), maxOffset);
            cx.notify();
          }),
        )
        .child(track),
    );
  }

  // __grid: rows in a column. Responsive: at most 48rem the rows dissolve into a two-column grid (a lone last
  // card spans both), at most 30rem into one column.
  const flat = o.responsive && size.width > 0 ? (size.width <= CONTAINER_SMALL ? 1 : size.width <= CONTAINER_MEDIUM ? 2 : 0) : 0;
  const rows = flat > 0 ? rowsOf(o.count, flat) : getRowConfiguration(o.count, o.maxPerRow);
  let next = 0;
  return root.child(
    div()
      .flex()
      .flex_col()
      .gap(gap)
      .w_full()
      .children(
        rows.map((perRow, r) => {
          const start = next;
          next += perRow;
          return div()
            .id(ctx.id(`row-${r}`))
            .flex()
            .flex_row()
            .gap(gap)
            .w_full()
            .children(Array.from({ length: perRow }, (_, c) => div().id(ctx.id(`cell-${start + c}`)).flex().flex_col().flex_1().min_w_0().child(o.card(start + c).flex_grow(1))));
        }),
      ),
  );
}

// ── Cards ──

/** What makes a card a `role="button"`: pointer, `tabIndex=0`, Enter and Space (cardKeyDownHandler). */
export function pressable(ctx: RenderContext, el: Element, index: number, onActivate: () => void): Element {
  const id = ctx.id(`card-${index}`);
  const focus = ctx.retained<FocusHandle, null>(id, { kind: "card-focus", meta: null, create: (_entry, cx) => cx.focus_handle() });
  const box = el.id(id).cursor_pointer().tab_index(0);
  return (focus ? box.track_focus(focus) : box)
    .on_click((_e, cx) => {
      cx.stop_propagation();
      onActivate();
    })
    .on_key_down((e, cx) => {
      if (e.key !== "enter" && e.key !== "space") return;
      cx.stop_propagation();
      onActivate();
    });
}

/** A clickable card's resting shadow, reset on hover (`&:hover { box-shadow: none }`). */
export function clickableShadow(el: Element, preset: ShadowPreset): Element {
  return shadow(el, preset).hover((s) => shadow(s, "none"));
}

/** The chevron a clickable card shows: `size` px in the surrounding text color. */
export function chevron(ctx: RenderContext, size: number): Element | null {
  return ctx.icon("ChevronRight", { size });
}
