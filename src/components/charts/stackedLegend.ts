// StackedLegend: the list of rows beside (or under) a pie or radial chart, one
// per slice with its color, label and share.
//
// Ported from react-ui at the pinned commit:
//   shared/core/StackedLegend/{StackedLegendView.tsx,stackedLegend.scss,stackedLegendLayout.ts}
//   (the layout rules compile from the pin)
//
// Only what the Pie and Radial charts use is drawn: layout "auto" (the legend
// beside the chart scrolls, the one under it shows the first rows and a "Show
// more" button), percentages over the visible rows, no separators, a title.
//
// gpui differences: the list scrolls by an offset it owns (wheel, trackpad and
// the chevron buttons, which step one row with a 300ms slide in place of the
// browser's smooth scroll), with no scrollbar, as upstream hides it. The
// hover and active fills, the color square's scale (1.3 when active) and the
// text color change at once: gpui has no color or scale transitions.
import { h_flex, v_flex } from "gpui-base";
import { div, type Color, type Context, type Element, type ScrollWheelEvent } from "gpui-kit";
import {
  formatStackedValue,
  LEGEND_ITEM_LIMIT,
  resolveStackedLegendLayout,
} from "openui-charts/shared/core/StackedLegend/stackedLegendLayout";
import type { RenderContext } from "../../render/surface.ts";
import { textStyle, TRANSPARENT, typography } from "../../render/tokens.ts";
import { button, iconButton } from "../buttons.ts";

/** .openui-stacked-legend__item: a row's height. */
const STACKED_ROW_HEIGHT = 32;
/** Side by side, the chart and its legend share this height (.chart-with-stacked-legend--row). */
export const STACKED_ROW_LAYOUT_HEIGHT = 296;
/** IconButton "extra-small": the scroll buttons in the header. */
const SCROLL_BUTTON_SIZE = 28;

export interface StackedItem {
  key: string;
  label: string;
  color: Color;
  value: number;
}

export function stackedLegend(
  ctx: RenderContext,
  o: {
    items: StackedItem[];
    activeKey: string | null;
    hidden: ReadonlySet<string>;
    onEnter(key: string, cx: Context): void;
    onLeave(key: string, cx: Context): void;
    onToggle(key: string, cx: Context): void;
    /** Under the chart: the legend's width, which also decides "Show more". Beside it: undefined. */
    containerWidth?: number;
    /** Beside the chart: the box the legend fills; its list scrolls when taller. */
    height?: number;
  },
): Element {
  const t = ctx.t;
  const state = ctx.local({ offset: 0, smooth: false, showAll: false }, "stacked-legend");
  const small = typography(t, "label", "small");
  const { items } = o;

  const { isShowMore, isScrollable } = resolveStackedLegendLayout("auto", o.containerWidth, items.length);
  // Percentages re-normalize over the visible rows.
  const total = items.filter((it) => !o.hidden.has(it.key)).reduce((sum, it) => sum + it.value, 0);
  const shown = isShowMore && !state.showAll ? items.slice(0, LEGEND_ITEM_LIMIT) : items;

  const contentHeight = shown.length * STACKED_ROW_HEIGHT;
  const overflowing = o.height !== undefined && contentHeight > o.height;
  const showControls = isScrollable && overflowing;
  const headerHeight = SCROLL_BUTTON_SIZE + t.spaceXs;
  const viewport = o.height === undefined ? contentHeight : Math.min(contentHeight, o.height - (showControls ? headerHeight : 0));
  const maxOffset = Math.max(0, contentHeight - viewport);
  const offset = Math.min(Math.max(0, state.offset), maxOffset);
  const scrollTo = (next: number, smooth: boolean, cx: Context) => {
    state.offset = Math.min(Math.max(0, next), maxOffset);
    state.smooth = smooth;
    cx.notify();
  };

  const row = (item: StackedItem) => {
    const active = o.activeKey === item.key;
    const square = active ? 13 : 10;
    return h_flex()
      .id(ctx.id(`row-${items.indexOf(item)}-${item.key}`))
      .w_full()
      .h(STACKED_ROW_HEIGHT)
      .flex_none()
      .items_center()
      .justify_between()
      .gap(10)
      .px(8)
      .py(4)
      .rounded(t.radiusM)
      .bg(active ? t.sunk : TRANSPARENT)
      .opacity(o.hidden.has(item.key) ? 0.3 : 1)
      .cursor_pointer()
      .on_hover((hovered, cx) => (hovered ? o.onEnter(item.key, cx) : o.onLeave(item.key, cx)))
      .on_click((_e, cx) => o.onToggle(item.key, cx))
      .child(
        h_flex()
          .flex_1()
          .min_w_0()
          .h_full()
          .items_center()
          .gap(8)
          .child(
            div()
              .w(32)
              .h_full()
              .flex_none()
              .flex()
              .items_center()
              .justify_center()
              .child(div().w(square).h(square).flex_none().rounded(2).bg(item.color)),
          )
          .child(
            textStyle(div().text_color(t.textNeutralPrimary), small)
              .min_w_0()
              .overflow_hidden()
              .whitespace_nowrap()
              .text_ellipsis()
              .child(item.label),
          ),
      )
      .child(
        textStyle(div().text_color(t.textNeutralPrimary), small)
          .flex_none()
          .child(formatStackedValue(item.value, total, "percentage")),
      );
  };

  // .openui-stacked-legend: min-width 200, rows keep their height, the list scrolls.
  const list = o.height === undefined
    ? v_flex().min_w(200).w_full().children(shown.map(row))
    : div()
        .id(ctx.id("stacked-list"))
        .relative()
        .min_w(200)
        .w_full()
        .h(viewport)
        .flex_none()
        .overflow_hidden()
        .on_scroll_wheel((e: ScrollWheelEvent, cx) => {
          const next = Math.min(Math.max(0, offset - e.delta.y), maxOffset);
          if (next === offset) return; // at an end: the page scrolls
          cx.stop_propagation();
          scrollTo(next, false, cx);
        })
        .child(
          v_flex()
            .id(ctx.id("stacked-rows"))
            .absolute()
            .left(0)
            .top(-offset)
            .w_full()
            .when(state.smooth, (el) => el.transition("top", { duration: 300, easing: "ease-in-out" }))
            .children(shown.map(row)),
        );

  const scrollButton = (dir: "up" | "down", enabled: boolean) =>
    iconButton(ctx, {
      id: ctx.id(`stacked-scroll-${dir}`),
      icon: dir === "up" ? "ChevronUp" : "ChevronDown",
      variant: "secondary",
      size: "extra-small",
      disabled: !enabled,
      onClick: (cx) => scrollTo(offset + (dir === "up" ? -1 : 1) * STACKED_ROW_HEIGHT, true, cx),
    });

  const header = h_flex()
    .w_full()
    .flex_none()
    .items_center()
    .justify_between()
    .gap(10)
    .pl(t.spaceL)
    .pr(t.spaceXs)
    .pb(t.spaceXs)
    .child(textStyle(div().text_color(t.textNeutralSecondary), small).child(`${items.length} labels`))
    .child(
      h_flex()
        .items_center()
        .gap(t.spaceXs)
        .child(scrollButton("up", offset > 0))
        .child(scrollButton("down", offset < maxOffset - 1)),
    );

  const showMore =
    isShowMore && items.length > LEGEND_ITEM_LIMIT
      ? [
          button(ctx, {
            id: ctx.id("stacked-show-more"),
            label: state.showAll ? "Show less" : "Show more",
            variant: "secondary",
            size: "small",
            onClick: (cx) => {
              state.showAll = !state.showAll;
              cx.notify();
            },
          })
            .w_full()
            .justify_center()
            .mt(t.space2xs),
        ]
      : [];

  let container = v_flex().id(ctx.id("stacked-legend")).items_center();
  // width: 100% of its flex-row parent, as a grow: a percentage would count in a row's intrinsic width.
  container = o.containerWidth ? container.w(o.containerWidth) : container.flex_1().min_w_0();
  if (o.height !== undefined) container = container.h(o.height).justify_center();
  return container.children(showControls ? [header] : []).child(list).children(showMore);
}
