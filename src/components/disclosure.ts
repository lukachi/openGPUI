// Disclosure: Tabs, TabItem, Accordion, AccordionItem, Steps, StepsItem.
//
// Ported from react-ui at the pinned commit:
//   Tabs, TabItem            genui-lib/Tabs/{schema.ts,index.tsx}, components/Tabs/{Tabs.tsx,tabs.scss}
//   Accordion, AccordionItem genui-lib/Accordion/{schema.ts,index.tsx}, components/Accordion/{Accordion.tsx,accordion.scss}
//   Steps, StepsItem         genui-lib/Steps/{schema.ts,index.tsx}, components/Steps/{Steps.tsx,steps.scss}
//
// Where gpui differs from the browser (see also README "Where gpui differs"):
// - Tabs: the list scrolls by an offset the list owns (gpui-kit cannot scroll a
//   div from code): the wheel and trackpad move it, the chevron controls step it
//   120px, a clicked tab is centred, all with a sliding transition like the
//   browser's smooth scrollTo. The active-tab indicator sits inside the sliding
//   row, so it follows the scroll without the scroll handler upstream needs; it
//   moves between tabs with a 250ms ease-in-out slide (upstream's cubic-bezier
//   (0.4, 0, 0.2, 1)). Triggers are gpui-base's native `Tab` (controlled:
//   `selected` in, `on_click` out; it announces the selected state) in a plain
//   element that reports the trigger's width, since `Tab` takes no size
//   callback; the row is a plain element too, as it carries the sliding offset
//   and the indicator. gpui-base says a `Tab` hears presses but never keys, so
//   there is no Tab/Shift-Tab focus and no arrow-key roving between tabs
//   (Radix has both).
// - Accordion: only an open or close slides (300ms ease-in-out; upstream's
//   cubic-bezier(0.87, 0, 0.13, 1)), through `transition("height")` on a panel
//   whose content height is measured (on_size_change); a settled panel takes
//   its content's height at once, one frame late. A closed panel is unmounted
//   300ms after it starts closing, as Radix's Presence does. gpui cannot rotate
//   an element, so the open chevron (rotate(180deg) upstream) is lucide's
//   ChevronUp, which is the same drawing, and it flips without the 300ms turn.
//   The item announces itself as open until its panel is gone, so the expanded
//   state a screen reader hears lags the click by 300ms.
// - Per-node UI state (the chosen tab, the open item, a nested Tabs' choice)
//   lives in `ctx.local`, which is never cleared. Radix unmounts an inactive
//   TabsContent and a closed AccordionContent, so upstream resets a Tabs or
//   Accordion inside one when it comes back; here it keeps its choice.
// - Tabs: a hovered inactive tab keeps the clear variant's `shadow-s` upstream, which a
//   browser paints outside the transparent tab only; gpui would paint it under the whole
//   tab, so it gets none (README "Shadows").
// - Steps: the title inherits its font like upstream (`typography(title, default)`
//   names a group the typography map does not have, so the scss emits nothing).
import { Accordion as BaseAccordion, AccordionHeader, AccordionItem as BaseAccordionItem, AccordionPanel, AccordionTrigger, Tab } from "gpui-base";
import { div, type Context, type Element, type ScrollWheelEvent } from "gpui-kit";
import { markdownBlock } from "../markdown/render.ts";
import { optional, type Component, type Props } from "../render/surface.ts";
import { textStyle, TRANSPARENT, typography } from "../render/tokens.ts";
import { iconButton } from "./buttons.ts";
import { autoOpen, syncActive, toggled, type AccordionSelection, type SectionNode, type TabsSelection } from "./disclosure-state.ts";

// gpui-base types AccordionHeader as a constructor; the documented (and only working) call is `AccordionHeader.new(trigger)`.
const accordionHeader = (trigger: Element): Element => (AccordionHeader as unknown as { new: (trigger: Element) => Element }).new(trigger);

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** TabItem, AccordionItem and StepsItem are drawn by their parent; alone they render nothing (`component: () => null`). */
export const TabItem: Component = {
  render() {
    return null;
  },
};
export const AccordionItem: Component = TabItem;
export const StepsItem: Component = TabItem;

// ── Tabs ──

interface TabsState extends TabsSelection {
  /** Measured trigger widths by item index, px. */
  widths: Record<number, number>;
  /** The list's visible width, px. */
  viewport: number;
  /** Horizontal scroll offset, px. */
  offset: number;
  /** Whether the last offset change should slide. */
  smooth: boolean;
}

const TAB_SLIDE = { duration: 250, easing: "ease-in-out" } as const;
/** `scrollBy({ left: ±120 })` of the list's scroll buttons. */
const TAB_SCROLL_STEP = 120;

export const Tabs: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const items = (Array.isArray(props.items) ? props.items : []).filter((item: SectionNode | null) => item?.props?.value != null) as SectionNode[];
    const local = ctx.local<TabsState>({ active: "", interacted: false, sizes: {}, widths: {}, viewport: 0, offset: 0, smooth: false });
    syncActive(local, items);
    if (!items.length) return null;

    // Layout from last frame's measurements: where each trigger sits in the row. A trigger not measured yet counts 0 wide.
    const gap = t.spaceL; // .openui-tabs-clear .openui-tabs-list
    const widths = items.map((_, i) => local.widths[i]);
    const measured = local.viewport > 0;
    const lefts: number[] = [];
    let total = 0;
    widths.forEach((w, i) => {
      lefts.push(total);
      total += (w ?? 0) + (i < widths.length - 1 ? gap : 0);
    });
    const maxOffset = measured ? Math.max(0, total - local.viewport) : 0;
    const offset = clamp(local.offset, 0, maxOffset);

    const scrollTo = (next: number, cx: Context) => {
      local.offset = clamp(next, 0, maxOffset);
      local.smooth = true;
      cx.notify();
    };

    const trigger = (item: SectionNode, i: number): Element => {
      const value = String(item.props.value);
      const active = value === local.active;
      let el = Tab.new(ctx.id(`tab-${i}`))
        .selected(active)
        .flex()
        .flex_row()
        .flex_none()
        .items_center()
        .justify_center()
        .gap(t.spaceS)
        .py(t.spaceS)
        .cursor_pointer()
        .text_color(active ? t.textNeutralPrimary : t.textNeutralSecondary);
      el = textStyle(el, typography(t, "label", active ? "heavy" : "default"));
      // The clear variant's hover keeps the base rule's shadow-s: not drawn (see the header).
      if (!active) el = el.hover((s) => s.text_color(t.textNeutralPrimary));
      const tab = el
        .on_click((_e, cx) => {
          local.interacted = true;
          local.active = value;
          // The list centres the clicked trigger.
          const w = local.widths[i];
          if (measured && w !== undefined) scrollTo(lefts[i]! - local.viewport / 2 + w / 2, cx);
          else cx.notify();
        })
        .child(
          // .openui-tabs-trigger-content / -text: one nowrap line, 232px at most.
          div()
            .flex()
            .flex_col()
            .items_center()
            .gap(t.space3xs)
            .min_w(0)
            .child(div().max_w(232).overflow_hidden().whitespace_nowrap().text_ellipsis().child(String(item.props.trigger ?? ""))),
        );
      // The native Tab takes no size callback, so a plain wrapper reports the trigger's width.
      return div()
        .id(ctx.id(`tab-box-${i}`))
        .flex()
        .flex_none()
        .on_size_change((size, cx) => {
          if (local.widths[i] !== size.width) {
            local.widths[i] = size.width;
            cx.notify();
          }
        })
        .child(tab);
    };

    const active = items.findIndex((item) => String(item.props.value) === local.active);
    const row = div()
      .id(ctx.id("row"))
      .relative()
      .flex()
      .flex_row()
      .flex_none()
      .gap(gap)
      .when(maxOffset > 0, (el) => el.left(-offset))
      .when(local.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" }))
      .children(items.map(trigger))
      // .openui-tabs-indicator: 1.5px, drawn once the active trigger is measured.
      .when(widths[active] !== undefined && active >= 0, (el) =>
        el.child(
          div()
            .id(ctx.id("indicator"))
            .absolute()
            .bottom(0)
            .left(lefts[active]!)
            .w(widths[active]!)
            .h(1.5)
            .bg(t.borderInteractiveSelected)
            .transition("left", TAB_SLIDE)
            .transition("width", TAB_SLIDE),
        ),
      );

    const viewport = div()
      .id(ctx.id("list"))
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
          local.offset = clamp(local.offset - dx, 0, maxOffset); // from the live offset: several events can arrive between renders
          local.smooth = false;
          cx.notify();
        }),
      )
      .child(row);

    // .openui-tabs-scroll-button-container-*: a secondary small IconButton on the list's colour at either end.
    const scrollButton = (side: "left" | "right"): Element | null => {
      const canGo = side === "left" ? offset > 0 : offset < maxOffset - 1;
      if (!canGo) return null;
      return div()
        .absolute()
        .top(0)
        .h_full()
        .flex()
        .items_center()
        .justify_center()
        .bg(t.foreground)
        .when(side === "left", (el) => el.left(0).pr(4))
        .when(side === "right", (el) => el.right(0).pl(4))
        .child(
          iconButton(ctx, {
            id: ctx.id(`scroll-${side}`),
            icon: side === "left" ? "ChevronLeft" : "ChevronRight",
            size: "small",
            variant: "secondary",
            surface: t.foreground,
            onClick: (cx) => scrollTo(offset + (side === "left" ? -TAB_SCROLL_STEP : TAB_SCROLL_STEP), cx),
          }),
        );
    };

    // .openui-tabs-list-container: the list over a 1px border-default line at its bottom edge.
    const container = div()
      .id(ctx.id("list-container"))
      .relative()
      .flex()
      .flex_row()
      .items_center()
      .overflow_hidden()
      .child(div().absolute().bottom(0).left(0).right(0).h(1).bg(t.borderDefault))
      .child(viewport)
      .children([scrollButton("left"), scrollButton("right")].flatMap(optional));

    // .openui-tabs-clear .openui-tabs-content: padding 3xs 0; the inner column gaps l. Only the active content is mounted (Radix).
    const current = active >= 0 ? items[active]! : null;
    const content = current
      ? textStyle(div().id(ctx.id("content")).flex().flex_col().py(t.space3xs), typography(t, "body", "default"))
          .child(
            div()
              .flex()
              .flex_col()
              .gap(t.spaceL)
              .children(ctx.children(asArray(current.props.content), `tab-${String(current.props.value)}`)),
          )
      : null;

    return div()
      .id(ctx.id())
      .flex()
      .flex_col()
      .gap(t.spaceL)
      .child(container)
      .children(optional(content));
  },
};

// ── Accordion ──

interface AccordionState extends AccordionSelection {
  /** Measured content heights by item value, px. */
  heights: Record<string, number>;
  /** Items whose panel is in the tree: open, or sliding shut. */
  mounted: Record<string, boolean>;
  /** Items first drawn open: they appear without sliding. */
  initiallyOpen: Record<string, boolean>;
  /** Whether each item was open on the last render: a change starts a slide. */
  wasOpen: Record<string, boolean>;
  /** Items whose panel is sliding open or shut. */
  sliding: Record<string, boolean>;
  /** Per item, bumped by every open/close: only the latest unmount timer acts. */
  gen: Record<string, number>;
}

const ACCORDION_SLIDE = { duration: 300, easing: "ease-in-out" } as const;

export const Accordion: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray(props.items) as SectionNode[];
    const local = ctx.local<AccordionState>({
      open: "",
      interacted: false,
      prevCount: 0,
      heights: {},
      mounted: {},
      initiallyOpen: {},
      wasOpen: {},
      sliding: {},
      gen: {},
    });

    // Auto-open: only when a new item arrives during streaming (a whole response opens its last item).
    autoOpen(local, items);
    if (!items.length) return null;

    const rows = items.map((item, i) => {
      const value = String(item.props.value);
      const open = local.open === value;
      if (local.initiallyOpen[value] === undefined) {
        local.initiallyOpen[value] = open;
        local.wasOpen[value] = open;
        if (open) local.mounted[value] = true;
      } else if (local.wasOpen[value] !== open) {
        // Radix Presence: the panel stays while its slideUp runs. A newer flip makes an older timer stale.
        local.wasOpen[value] = open;
        const gen = (local.gen[value] = (local.gen[value] ?? 0) + 1);
        local.sliding[value] = true;
        if (open) local.mounted[value] = true;
        ctx.after((cx) => {
          cx.timer.after(ACCORDION_SLIDE.duration, (cx) => {
            if (local.gen[value] !== gen) return;
            local.sliding[value] = false;
            if (local.open !== value) {
              local.mounted[value] = false;
              delete local.heights[value]; // the next open measures afresh and slides in from 0
            }
            cx.notify();
          });
        });
      }
      const mounted = local.mounted[value] === true;
      const first = i === 0;
      const last = i === items.length - 1;

      const toggle = (cx: Context) => {
        local.interacted = true;
        local.open = toggled(local.open, value); // type "single" collapsible
        cx.notify();
      };

      // .openui-accordion-trigger (clear): body default, padding l 0 (0 on top for the first item), space between.
      const trigger = textStyle(
        AccordionTrigger.new(ctx.id(`trigger-${i}`))
          .flex()
          .flex_row()
          .items_center()
          .justify_between()
          .w_full()
          .text_center() // a <button> centres its text
          .text_color(t.textNeutralPrimary)
          .pt(first ? 0 : t.spaceL)
          .pb(t.spaceL)
          .cursor_pointer()
          .on_change((_open, cx) => toggle(cx)),
        typography(t, "body", "default"),
      )
        .child(div().flex().flex_row().items_center().gap(t.spaceXs).text_color(t.textNeutralPrimary).child(String(item.props.trigger ?? "")))
        .children(optional(ctx.icon(open ? "ChevronUp" : "ChevronDown", { size: 16 })));

      // Only an open or close slides (Radix runs slideDown/slideUp on the data-state flip); a settled panel follows its content at once.
      const sliding = local.sliding[value] === true;
      const measured = local.heights[value];
      const height = !open ? 0 : (measured ?? (sliding ? 0 : undefined)); // first open from shut: measure at 0, then slide in
      const panel = div()
        .id(ctx.id(`panel-${i}`))
        .overflow_hidden()
        .when(height !== undefined, (el) => el.h(height!))
        .when(sliding, (el) => el.transition("height", ACCORDION_SLIDE))
        .child(
          // .openui-accordion-content-wrapper (clear): column, gap m, padding-bottom l.
          textStyle(
            div()
              .id(ctx.id(`panel-inner-${i}`))
              .flex()
              .flex_col()
              .flex_none()
              .w_full()
              .gap(t.spaceM)
              .pb(t.spaceL)
              .text_color(t.textNeutralPrimary)
              .on_size_change((size, cx) => {
                if (local.heights[value] !== size.height) {
                  local.heights[value] = size.height;
                  cx.notify();
                }
              }),
            typography(t, "body", "default"),
          ).children(ctx.children(asArray(item.props.content), `item-${value}`)),
        );

      // .openui-accordion-item: overflow hidden, border-bottom 1px border-default; the last one's is transparent (clear).
      return BaseAccordionItem.new()
        .open(mounted)
        .flex()
        .flex_col()
        .overflow_hidden()
        .border_b_1()
        .border_color(last ? TRANSPARENT : t.borderDefault)
        .header(accordionHeader(trigger).flex())
        .panel(AccordionPanel.new().child(mounted ? panel : div()));
    });

    // .openui-accordion-clear: a transparent 1px border, no padding.
    return BaseAccordion.new(ctx.id()).flex().flex_col().border_1().border_color(TRANSPARENT).children(rows);
  },
};

// ── Steps ──

export const Steps: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray(props.items) as { props: Props }[];
    const list = items.map((item, i) => {
      const last = i === items.length - 1;
      const details = item.props.details;
      // genui Steps: a string is drawn by components/MarkDownRenderer (in a view of its own, as
      // a MarkDownRenderer node would be), anything else is rendered as a node.
      const body =
        typeof details === "string"
          ? [ctx.piece(`step${i}`, details, (o, text) => markdownBlock(o, `step${i}`, text, { profile: "plain" }).w_auto())]
          : ctx.children(details, `step${i}`);

      // .openui-step-connector: number (24px circle, padding 2xs 0) over a 1px line that grows to the next step.
      const connector = div()
        .flex()
        .flex_col()
        .items_center()
        .child(
          div()
            .flex()
            .items_center()
            .justify_center()
            .py(t.space2xs)
            .child(
              textStyle(
                div()
                  .flex()
                  .items_center()
                  .justify_center()
                  .w(24)
                  .h(24)
                  .rounded(12)
                  .bg(t.elevated)
                  .text_color(t.textNeutralSecondary)
                  .border_1()
                  .border_color(t.borderDefault),
                typography(t, "label", "small"),
              ).child(String(i + 1)),
            ),
        )
        .when(!last, (el) => el.child(div().w(1).flex_1().bg(t.sunk)));

      // .openui-step-content: padding-top 2xs, column gap 3xs, margin-bottom l (none on the last).
      const content = div()
        .flex()
        .flex_col()
        .gap(t.space3xs)
        .pt(t.space2xs)
        .mb(last ? 0 : t.spaceL)
        .child(div().text_color(t.textNeutralSecondary).child(String(item.props.title ?? "")))
        // .openui-step-details: column, items centred, gap m+2, body default.
        .child(textStyle(div().flex().flex_col().items_center().gap(t.spaceM + 2), typography(t, "body", "default")).children(body));

      return div().id(ctx.id(`step-${i}`)).flex().flex_row().gap(t.spaceM).child(connector).child(content);
    });
    // .openui-steps-container: width 100%, min-width 280px.
    return div().id(ctx.id()).w_full().min_w(280).flex().flex_col().children(list);
  },
};
