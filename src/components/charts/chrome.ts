// The chart chrome every chart shares: the bottom legend and the hover tooltip.
//
// Ported from react-ui at the pinned commit:
//   DefaultLegend  shared/core/DefaultLegend/{DefaultLegend.tsx,defaultLegend.scss,hooks/useDefaultLegend.ts}
//   ChartTooltip   shared/core/PortalTooltip/{ChartTooltip.tsx,portalTooltip.scss,utils/index.ts}
//
// gpui differences: the tooltip is a gpui `Popup` at a position computed the
// way Floating UI places it: `right-start` (or `top`) with offset 20, flipped
// to the other side when it would cross the window edge, shifted to keep 8px
// clear. Its soft follow is a native spring on that position (TOOLTIP_SPRING),
// and it appears without the 120ms fade. The panel takes the pointer (upstream's has
// `pointer-events: none`): it hands its pointer moves to the chart under it (hover.ts
// `relay`); a wheel turned over it does not reach the chart, only the page.
import { h_flex, Popup, v_flex } from "gpui-base";
import { div, type Color, type Context, type Element } from "gpui-kit";
import { tooltipNumberFormatter } from "openui-charts/shared/core/PortalTooltip/utils";
import { optional, type RenderContext } from "../../render/surface.ts";
import { shadow, textStyle, typography } from "../../render/tokens.ts";
import { button } from "../buttons.ts";
import type { LegendItem, SeriesModel, TooltipPayload } from "./data.ts";
import { TOOLTIP_SPRING, type HoverState } from "./hover.ts";
import type { Measurer } from "./measure.ts";

const INDICATOR_WIDTH = 10;
const GAP_WIDTH = 12;

/** The text a legend item measures (useDefaultLegend.calculateItemWidth). */
const legendText = (item: LegendItem) =>
  item.percentage !== undefined ? `${item.label} (${item.percentage.toFixed(1)}%)` : item.label;

/** Strings the legend measures, for `Measurer.want`. */
export function legendStrings(items: LegendItem[]): string[] {
  return items.map(legendText);
}

/**
 * DefaultLegend below a chart: as many items as fit `containerWidth` on one
 * line, a "N more" / "Show Less" toggle for the rest, X-/Y-axis captions above
 * (the scrolling layouts only). Clicking an item toggles its series.
 */
export function legendView(
  ctx: RenderContext,
  o: {
    items: LegendItem[];
    model?: SeriesModel;
    containerWidth: number;
    measurer: Measurer;
    xAxisLabel?: string;
    yAxisLabel?: string;
    /** Reports the legend's height, for charts that fit it into theirs. */
    onHeight?: (height: number, cx: Context) => void;
    /** No padding above the legend (SegmentedBar's `paddingTop: 0`). */
    flush?: boolean;
  },
): Element {
  const t = ctx.t;
  const state = ctx.local({ expanded: false, buttonWidth: 0 }, "legend");
  const xs = typography(t, "label", "extra-small");

  // useDefaultLegend: fit items into the width left beside the toggle button.
  let visibleItems = o.items;
  let hasMoreItems = false;
  if (o.containerWidth && o.items.length > 0) {
    const available = o.containerWidth - state.buttonWidth;
    let current = 0;
    let count = 0;
    for (const item of o.items) {
      const width = o.measurer.width(legendText(item)) + INDICATOR_WIDTH + GAP_WIDTH;
      const required = count > 0 ? width + GAP_WIDTH : width;
      if (current + required > available) break;
      current += required;
      count++;
    }
    if (count < o.items.length) {
      visibleItems = o.items.slice(0, Math.max(1, count));
      hasMoreItems = o.items.length > visibleItems.length;
    }
  }
  const displayItems = state.expanded ? o.items : visibleItems;
  const toggleText = state.expanded ? "Show Less" : `${o.items.length - visibleItems.length} more`;

  const item = (it: LegendItem) => {
    const isHidden = o.model?.hidden.has(it.key) ?? false;
    let el = h_flex()
      .id(ctx.id(`legend-${it.key}`))
      .flex_none()
      .gap(t.spaceXs)
      .opacity(isHidden ? 0.3 : 1)
      .child(div().w(INDICATOR_WIDTH).h(INDICATOR_WIDTH).flex_none().rounded(t.radius2xs).bg(it.color))
      .child(
        h_flex()
          .gap(t.space2xs)
          .child(textStyle(div().text_color(t.textNeutralPrimary), xs).child(it.label))
          .children(
            it.percentage !== undefined
              ? [textStyle(div().text_color(t.textNeutralSecondary), xs).child(`${it.percentage.toFixed(1)}%`)]
              : [],
          ),
      );
    if (o.model) {
      const model = o.model;
      el = el.cursor_pointer().on_click((_e, cx) => model.toggle(it.key, cx));
    }
    return el;
  };

  const toggle = () => {
    const el = button(ctx, {
      id: ctx.id("legend-toggle"),
      label: toggleText,
      variant: "tertiary",
      size: "small",
      onClick: (cx) => {
        state.expanded = !state.expanded;
        cx.notify();
      },
    });
    // .openui-chart-legend-toggle-button: label xs, primary, padding-left 2xs, right 3xs.
    return textStyle(el, xs)
      .text_color(t.textNeutralPrimary)
      .pl(t.space2xs)
      .pr(t.space3xs)
      .children(optional(ctx.icon(state.expanded ? "ChevronUp" : "ChevronDown", { size: xs.size })))
      .on_size_change((size, cx) => {
        if (size.width !== state.buttonWidth) {
          state.buttonWidth = size.width;
          cx.notify();
        }
      });
  };

  const axisLabel = (name: string, text: string) =>
    textStyle(h_flex().text_color(t.textNeutralSecondary), xs).child(`${name}:\u00a0`).child(div().text_color(t.textNeutralPrimary).child(text));

  const captions = [
    ...(o.xAxisLabel ? [axisLabel("X-Axis", o.xAxisLabel)] : []),
    ...(o.yAxisLabel ? [axisLabel("Y-Axis", o.yAxisLabel)] : []),
  ];

  let legend = h_flex().w_full().justify_center().gap(t.spaceM);
  legend = state.expanded || !hasMoreItems ? legend.flex_wrap() : legend.overflow_hidden();

  const paddingTop = o.flush ? 0 : t.spaceM;
  let container = v_flex()
    .id(ctx.id("legend"))
    .w_full()
    .items_center()
    .justify_center()
    .gap(t.spaceS)
    .pt(paddingTop);
  if (o.onHeight) {
    // useLegendHeight observes the content box (ResizeObserver's contentRect), which leaves out the top padding.
    const report = o.onHeight;
    container = container.on_size_change((size, cx) => report(size.height - paddingTop, cx));
  }
  return container
    .children(captions.length ? [h_flex().justify_center().flex_wrap().gap(t.spaceM).children(captions)] : [])
    .child(legend.children(displayItems.map(item)).children(hasMoreItems ? [toggle()] : []));
}

/**
 * ChartTooltip: the hovered category, a separator, and one row per item
 * (label and value side by side, or stacked for two items or fewer). Over ten
 * items show the first five and "Click to view all N".
 */
function tooltipPanel(ctx: RenderContext, payload: TooltipPayload): Element {
  const t = ctx.t;
  const xs = typography(t, "label", "extra-small");
  const text = (color: Color) => textStyle(div().text_color(color), xs);
  const separator = () => div().w_full().h(1).flex_none().bg(t.borderDefault);
  const { items } = payload;
  const isGreaterThanTen = items.length > 10;
  const displayItems = isGreaterThanTen ? items.slice(0, 5) : items;
  const isTwoItemsLayout = items.length <= 2;

  const row = (item: TooltipPayload["items"][number], last: boolean) => {
    const indicator = div()
      .w(10)
      .h(10)
      .flex_none()
      .rounded(t.radius2xs)
      .bg(item.color)
      .when(isTwoItemsLayout, (el) => el.mt(2));
    const value = text(t.textNeutralPrimary)
      .whitespace_nowrap()
      .overflow_hidden()
      .text_ellipsis()
      .child(typeof item.value === "number" ? tooltipNumberFormatter(item.value) : item.value);
    const label = text(t.textNeutralSecondary).child(item.name);
    const wrapper = isTwoItemsLayout
      ? v_flex().flex_1().min_w_0().items_start().gap(t.space2xs)
      : h_flex().flex_1().min_w_0().justify_between().gap(t.spaceS);
    return div()
      .flex()
      .flex_row()
      .flex_wrap()
      .w_full()
      .gap(t.spaceXs)
      .when(isTwoItemsLayout, (el) => el.items_start())
      .when(!isTwoItemsLayout, (el) => el.items_center())
      .child(indicator)
      .child(wrapper.child(label).child(value))
      .children(last ? [] : [separator()]);
  };

  const panel = v_flex()
    .id(ctx.id("tooltip-panel"))
    .min_w(128)
    .max_w(240)
    .gap(t.spaceXs)
    .p(t.spaceXs)
    .rounded(t.radiusL)
    .border_1()
    .border_color(t.borderDefault)
    .bg(t.foreground)
    .child(text(t.textNeutralPrimary).child(payload.label))
    .child(separator())
    .child(v_flex().min_w(128).gap(t.spaceXs).children(displayItems.map((it, i) => row(it, i === displayItems.length - 1))))
    .children(
      isGreaterThanTen
        ? [separator(), text(t.textNeutralPrimary).child(`Click to view all ${items.length - 5}`)]
        : [],
    );
  return shadow(panel, t.shadowS, t.foreground);
}

/** Floating UI placements the charts use (ChartTooltip `placement`). */
export type TooltipPlacement = "right-start" | "top";

const OFFSET = 20;
const PADDING = 8;

/**
 * The hover tooltip for `payload` at the pointer in `hover`, in the local
 * coordinates of a `relative()` parent. Placed `right-start` (default) or
 * `top` with offset 20, flipped when the panel would leave the pane (the window where the
 * host never told its box), then
 * shifted 8px clear of its edges (Floating UI's offset/flip/shift). A new hover
 * session lands the panel; within one it springs.
 */
export function chartTooltip(
  ctx: RenderContext,
  payload: TooltipPayload,
  hover: HoverState,
  placement: TooltipPlacement = "right-start",
): Element {
  const size = ctx.local({ w: 0, h: 0 }, "tooltip-size");
  const view = window.viewport_size();
  // Floating UI keeps the tooltip inside the viewport, which is the pane when the host knows its box.
  const box = ctx.pane ?? { left: 0, top: 0, right: view.width, bottom: view.height };
  let dx: number;
  let dy: number;
  if (placement === "top") {
    dx = -size.w / 2;
    dy = -OFFSET - size.h;
    if (hover.wy + dy < box.top + PADDING) dy = OFFSET; // flip below
    dx = clamp(hover.wx + dx, box.left + PADDING, box.right - PADDING - size.w) - hover.wx;
  } else {
    dx = OFFSET;
    dy = 0;
    if (hover.wx + dx + size.w > box.right - PADDING) dx = -OFFSET - size.w; // flip left
    dy = clamp(hover.wy, box.top + PADDING, box.bottom - PADDING - size.h) - hover.wy;
  }
  const panel = tooltipPanel(ctx, payload)
    .on_size_change((s, cx) => {
      if (s.width === size.w && s.height === size.h) return;
      size.w = s.width;
      size.h = s.height;
      cx.notify();
    })
    // The panel takes the pointer; upstream's has `pointer-events: none`: the chart under it hears the move.
    .on_mouse_move((e, cx) => hover.relay?.(e, cx));
  return div()
    .id(ctx.id(`tooltip-pos-${hover.session}`))
    .absolute()
    .left(hover.x + dx)
    .top(hover.y + dy)
    .size(0)
    .spring("left", TOOLTIP_SPRING)
    .spring("top", TOOLTIP_SPRING)
    .child(Popup.new(ctx.id(`tooltip-${hover.session}`), div().size(0)).anchor("top_left").content(panel));
}

/** `v` kept inside [lo, hi]; `lo` wins when the range is empty. */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
