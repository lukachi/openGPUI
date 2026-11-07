// Lists: EntityList, ListBlock/ListItem, FollowUpBlock/FollowUpItem, SectionBlock/SectionItem.
//
// Ported from react-ui at the pinned commit:
//   EntityList        genui-lib/EntityList/{schema.ts,index.tsx}, components/EntityList/{EntityList.tsx,entityList.scss}
//   ListBlock         genui-lib/ListBlock/index.tsx, components/ListBlock/{ListBlock.tsx,listBlock.scss}
//   ListItem          genui-lib/ListItem/index.tsx, components/ListItem/{ListItem.tsx,listItem.scss}
//   FollowUpBlock     genui-lib/FollowUpBlock/index.tsx, components/FollowUpBlock/{FollowUpBlock.tsx,followUpBlock.scss}
//   FollowUpItem      genui-lib/FollowUpItem/index.tsx, components/FollowUpItem/{FollowUpItem.tsx,followUpItem.scss}
//   SectionBlock      genui-lib/SectionBlock/index.tsx (SectionBlockRenderer, shared by the chat library),
//                     components/SectionBlock/{FoldableSection.tsx,SectionV2.tsx,foldableSection.scss,sectionV2.scss}
//   SectionItem       genui-lib/SectionItem/index.tsx, genui-lib/sectionContentUnion.ts (the content union is
//                     the schema's; the nodes it holds draw through `ctx.children`)
//   open-section state lists-state.ts
// The Item components render nothing themselves: their block reads their props (as upstream's
// `component: () => null`).
//
// Actions: ListBlock and FollowUpBlock call `triggerAction(label, undefined, action)` with no form name
// (not the enclosing form's), so the event carries the whole store, as upstream's does. A ListItem is
// clickable only with an `action`; its label is the item's title. A FollowUpItem has no action: it
// continues the conversation with its text.
//
// Where gpui differs:
//  - ListItem: the indicator's `scale: 1.1` while the item's wrapper is hovered is not drawn (gpui has no
//    transforms); its hover fill (`highlight-strong`) and the action label and icon turning primary are.
//    The 0.2s background transition switches at once. A clickable item is a div with a click handler and
//    a tab stop, like upstream's `role="button"` div (tabIndex 0): Tab reaches it and it draws its hover look
//    while focused, but it takes no keys (upstream's takes none either, so Enter does nothing). The focus look
//    is read when the item draws; gpui sends a script no focus-change event, so it can appear a redraw late.
//  - ListItem image: no object-fit; the picture is sized from its intrinsic size and clipped (fitImage), so
//    it keeps square corners where the indicator rounds them, and a broken image shows its alt text without
//    the browser's icon.
//  - SectionBlock: Radix draws no height animation here (the content mounts and unmounts), and neither do we;
//    gpui can't rotate, so the open trigger's ChevronRight (rotated 90deg upstream) is lucide's ChevronDown,
//    which is the same drawing. The chevron's 20px box leaves out the IconButton's `shadow-m`: gpui paints a
//    shadow under a transparent box, where a browser clips it, which filled the box grey. The trigger is
//    gpui-base's `AccordionTrigger` with a focusable div inside it that takes Tab and Enter/Space (base's
//    trigger is a click handler only; no arrow-key roving between triggers, which Radix has). The focused
//    trigger draws no focus ring (upstream's `<button>` gets the browser's default one), so a keyboard user
//    cannot see which section Enter will toggle. A chosen section survives its parent being hidden.
//  - EntityList: `text-align: right` is the cell's wrapped lines pushed to the right edge (each line is
//    right-aligned, as in a browser, but the words are laid out as markdownInline lays them).
//  - FollowUpBlock's "Related Queries" header sets no font upstream and inherits the page's; here it
//    inherits the host's body text.
import { Accordion as BaseAccordion, AccordionHeader, AccordionItem as BaseAccordionItem, AccordionPanel, AccordionTrigger, Button as GButton } from "gpui-base";
import { div, type Context, type Element, type FocusHandle } from "gpui-kit";
import { isElementNode } from "@openuidev/lang-core";
import { markdownInline } from "../markdown/render.ts";
import { fitImage } from "../render/images.ts";
import { optional, type Component, type Props, type RenderContext } from "../render/surface.ts";
import { textStyle, typography, type Tokens } from "../render/tokens.ts";
import { freshSectionOpenState, syncSectionOpen, toggleSection, type SectionOpenState } from "./lists-state.ts";

// gpui-base types AccordionHeader as a constructor; the documented call is `AccordionHeader.new(trigger)`.
const accordionHeader = (trigger: Element): Element => (AccordionHeader as unknown as { new: (trigger: Element) => Element }).new(trigger);

/** genui-lib/helpers.ts asArray. */
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** A node's props, as the optional chaining on `item?.props?.x` reads them upstream (nothing for a non-element). */
const propsOf = (node: unknown): Props => (isElementNode(node) ? (node.props ?? {}) : {});

/** ListItem, FollowUpItem and SectionItem: `component: () => null`. */
const Item: Component = { render: () => null };
export const ListItem = Item;
export const FollowUpItem = Item;
export const SectionItem = Item;

// ── EntityList ──

type RowType = "header" | "body" | "footer";

/** components/EntityList EntityListRowView with entityList.scss. */
function entityRow(ctx: RenderContext, raw: unknown, rowType: RowType, size: "small" | "default", key: string, last: boolean): Element {
  const t = ctx.t;
  // Rows are plain objects ({ left, right, rightVariant }), not element nodes.
  const row: Props = raw !== null && typeof raw === "object" ? Object.fromEntries(Object.entries(raw)) : {};
  const right = row.rightVariant === "number" ? "number" : "text";
  const small = size === "small";

  // `--default`: left body default; right body heavy, number heavy, and large-heavy in the footer.
  // `--small`: left body small; right small-heavy, number small-heavy.
  const leftFont = typography(t, "body", small ? "small" : "default");
  const rightFont = small
    ? right === "number"
      ? typography(t, "number", "small-heavy")
      : typography(t, "body", "small-heavy")
    : rowType === "footer"
      ? right === "number"
        ? typography(t, "number", "large-heavy")
        : typography(t, "body", "large-heavy")
      : right === "number"
        ? typography(t, "number", "heavy")
        : typography(t, "body", "heavy");
  // `.openui-entity-list__row--header` cells: secondary text.
  const color = rowType === "header" ? t.textNeutralSecondary : t.textNeutralPrimary;

  const cell = (part: string, text: string, font: typeof leftFont, align?: "right") =>
    textStyle(div().flex_1().min_w(0).max_w("50%").text_color(color), font).children(
      text ? [markdownInline(ctx, `${key}-${part}`, text, { font, color, align })] : [],
    );

  // .openui-entity-list__row: space-between, align start, gap m, padding m 0, 1px bottom border (not on the last row).
  return div()
    .flex()
    .flex_row()
    .justify_between()
    .items_start()
    .gap(t.spaceM)
    .py(t.spaceM)
    .w_full()
    .text_color(t.textNeutralPrimary)
    .when(!last, (el) => el.border_b_1().border_color(t.borderDefault))
    .child(cell("left", String(row.left ?? ""), leftFont))
    .child(cell("right", String(row.right ?? ""), rightFont, "right"));
}

export const EntityList: Component = {
  render(props, ctx) {
    const size = props.size === "small" ? "small" : "default";
    const rows = asArray(props.rows);
    // Header and footer only draw at the default size.
    const showHeaderFooter = size === "default";
    const header = showHeaderFooter && props.header ? props.header : null;
    const footer = showHeaderFooter && props.footer ? props.footer : null;
    const all: { row: unknown; type: RowType }[] = [
      ...(header ? [{ row: header, type: "header" as const }] : []),
      ...rows.map((row) => ({ row, type: "body" as const })),
      ...(footer ? [{ row: footer, type: "footer" as const }] : []),
    ];
    return div()
      .flex()
      .flex_col()
      .w_full()
      .children(all.map((r, i) => entityRow(ctx, r.row, r.type, size, `row${i}`, i === all.length - 1)));
  },
};

// ── ListBlock ──

/** One ListItem as ListBlock hands it down (components/ListItem + listItem.scss). */
interface ListItemView {
  title: string;
  subtitle?: string;
  image?: { src: string; alt: string };
  actionLabel?: string;
  onClick?: () => void;
  variant: "number" | "image";
  size: "default" | "small";
  index: number;
  listHasSubtitle: boolean;
  last: boolean;
}

function listItem(ctx: RenderContext, o: ListItemView, hover: { over: number }): Element {
  const t = ctx.t;
  const small = o.size === "small";
  const hasAction = !!o.onClick;
  // Upstream's clickable row has tabIndex 0, and `:hover, :focus` share one look: a focus handle stands for focus.
  const focus = hasAction
    ? ctx.retained<FocusHandle, null>(ctx.id(`item${o.index}:focus`), { kind: "focus", meta: null, create: (_entry, cx) => cx.focus_handle() })
    : null;
  const hovered = hasAction && (hover.over === o.index || focus?.is_focused() === true);
  const id = ctx.id(`item${o.index}`);

  // .openui-list-item-indicator: 40px sunk square, radius m, margin-top 2xs; `-no-subtitle` (no item of the
  // list has a subtitle): 24px, radius s, no margin. Small: 36px and 20px.
  const dim = o.listHasSubtitle ? (small ? 36 : 40) : small ? 20 : 24;
  const indicator = div()
    .flex()
    .flex_none()
    .items_center()
    .justify_center()
    .w(dim)
    .h(dim)
    .rounded(o.listHasSubtitle ? t.radiusM : t.radiusS)
    .overflow_hidden()
    .bg(hovered ? t.highlightStrong : t.sunk)
    .text_color(t.textNeutralSecondary)
    .when(o.listHasSubtitle, (el) => el.mt(t.space2xs));
  if (o.variant === "number") {
    // `-number`: label default (number small in the compact list), secondary.
    indicator.child(
      textStyle(div().text_color(t.textNeutralSecondary), small ? typography(t, "number", "small") : typography(t, "label", "default")).child(
        String(o.index + 1),
      ),
    );
  } else if (o.image && (o.image.src || o.image.alt)) {
    // `-image`: radius s, clips, fills the indicator; the <img> covers it.
    const state = ctx.image(o.image.src);
    const picture =
      state.status === "ready"
        ? fitImage(state, { width: dim, height: dim }, "cover")
        : state.status === "failed" && o.image.alt
          ? div().w(dim).h(dim).overflow_hidden().whitespace_nowrap().child(o.image.alt)
          : null;
    indicator.child(
      div().flex().items_center().justify_center().w_full().h_full().rounded(t.radiusS).overflow_hidden().children(optional(picture)),
    );
  }

  const bodyFont = typography(t, "body", small ? "small" : "default");
  const content = div()
    .flex()
    .flex_col()
    .flex_1()
    .min_w(0)
    .when(!!o.title, (el) => el.child(textStyle(div().text_color(t.textNeutralPrimary), bodyFont).child(o.title)))
    .when(!!o.subtitle, (el) => el.child(textStyle(div().text_color(t.textNeutralSecondary), bodyFont).child(o.subtitle!)));

  // .openui-list-item-action: label and ChevronRight(16), secondary; primary while the item is hovered.
  const actionColor = hovered ? t.textNeutralPrimary : t.textNeutralSecondary;
  const action = hasAction
    ? div()
        .flex()
        .flex_row()
        .flex_none()
        .items_center()
        .gap(t.space2xs)
        .text_color(actionColor)
        .children(
          optional(
            o.actionLabel ? textStyle(div().text_color(actionColor), bodyFont).child(o.actionLabel) : null,
          ),
        )
        .child(textStyle(div().text_color(actionColor), bodyFont).children(optional(ctx.icon("ChevronRight", { size: 16 }))))
    : null;

  // .openui-list-item: a row, align start (center when this item has no subtitle), gap m (s-m when small).
  const row = div()
    .id(id)
    .flex()
    .flex_row()
    .gap(small ? t.spaceSM : t.spaceM)
    .when(!!o.subtitle, (el) => el.items_start())
    .when(!o.subtitle, (el) => el.items_center())
    .child(indicator)
    .child(
      div()
        .flex()
        .flex_row()
        .items_start()
        .justify_between()
        .flex_1()
        .min_w(0)
        .child(content)
        .children(optional(action)),
    )
    .when(hasAction, (el) =>
      el
        .cursor_pointer()
        .tab_index(0)
        .when(!!focus, (e) => e.track_focus(focus!))
        .on_hover((over, cx) => {
          const next = over ? o.index : hover.over === o.index ? -1 : hover.over;
          if (next !== hover.over) {
            hover.over = next;
            cx.notify();
          }
        })
        .on_click(() => o.onClick!()),
    );

  // .openui-list-item-wrapper: a column, gap m (s when small); with an action, a bottom border and padding m,
  // both dropped on the last child.
  return div()
    .flex()
    .flex_col()
    .gap(small ? t.spaceS : t.spaceM)
    .w_full()
    .when(hasAction && !o.last, (el) => el.pb(t.spaceM).border_b_1().border_color(t.borderDefault))
    .child(row);
}

export const ListBlock: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray(props.items);
    const variant = (props.variant as "number" | "image" | undefined) ?? "number";
    const size = (props.size as "default" | "small" | undefined) ?? "default";
    const listHasSubtitle = items.some((item) => !!propsOf(item).subtitle);
    const hover = ctx.local({ over: -1 }, "hover");

    // .openui-list-block: a column, gap l (m when small), items start, full width.
    return div()
      .flex()
      .flex_col()
      .items_start()
      .w_full()
      .gap(size === "small" ? t.spaceM : t.spaceL)
      .children(
        items.map((item, index) => {
          const p = propsOf(item);
          const title = String(p.title ?? "");
          const action = p.action;
          const hasAction = !!action;
          return listItem(
            ctx,
            {
              title,
              subtitle: p.subtitle ? String(p.subtitle) : undefined,
              image: variant === "image" ? (p.image as { src: string; alt: string } | undefined) : undefined,
              actionLabel: hasAction && p.actionLabel ? String(p.actionLabel) : undefined,
              onClick: hasAction ? () => ctx.action(title, undefined, action) : undefined,
              variant,
              size,
              index,
              listHasSubtitle,
              last: index === items.length - 1,
            },
            hover,
          );
        }),
      );
  },
};

// ── FollowUpBlock ──

export const FollowUpBlock: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray(props.items);
    // .openui-follow-up-block: a column; its header: secondary, 1px bottom border, padding s 0, margin-bottom m.
    return div()
      .flex()
      .flex_col()
      .child(
        div().text_color(t.textNeutralSecondary).py(t.spaceS).mb(t.spaceM).border_b_1().border_color(t.borderDefault).child("Related Queries"),
      )
      .children(
        items.map((item, i) => {
          const text = String(propsOf(item).text ?? "");
          // .openui-follow-up-item: body default, padding s 0, 1px bottom border (none on the last child), gap s,
          // space-between, full width, primary, left. The text takes the rest (flex 1) and breaks long words.
          return textStyle(
            GButton.new(ctx.id(`followup${i}`))
              .on_click(() => ctx.action(text, undefined))
              .flex()
              .flex_row()
              .items_center()
              .justify_between()
              .w_full()
              .gap(t.spaceS)
              .py(t.spaceS)
              .text_color(t.textNeutralPrimary)
              .text_left()
              .cursor_pointer()
              .when(i < items.length - 1, (el) => el.border_b_1().border_color(t.borderDefault)),
            typography(t, "body", "default"),
          ).children(text ? [div().flex_1().min_w(0).text_left().child(text)] : []);
        }),
      );
  },
};

// ── SectionBlock ──

/** foldableSection.scss `-trigger-content-wrapper`: the separator over the chevron button and the section's title. */
function sectionTrigger(ctx: RenderContext, t: Tokens, id: string, text: string, open: boolean, toggle: (cx: Context) => void): Element {
  const wrapper = div()
    .flex()
    .flex_col()
    .items_start()
    .justify_center()
    .gap(t.spaceL)
    .w_full()
    // `-content-separator`: a Separator with margin 3xs.
    .child(div().flex_none().w_full().h(1).bg(t.borderDefault).m(t.space3xs))
    .child(
      // `-content-icon-button-wrapper`: a row, centered, gap s. The 3-extra-small secondary IconButton is a span
      // (asChild): the trigger takes the press; ChevronRight turns 90deg when open, which is ChevronDown.
      // Its `shadow-m` is left out: gpui paints a shadow under a transparent box, where a browser clips it away.
      div()
        .flex()
        .flex_row()
        .items_center()
        .justify_start()
        .gap(t.spaceS)
        .w_full()
        .child(
          div()
            .id(`${id}-chevron`)
            .flex()
            .flex_none()
            .items_center()
            .justify_center()
            .w(20)
            .h(20)
            .border_1()
            .border_color(t.borderInteractive)
            .rounded(t.radiusS)
            .text_color(t.textNeutralPrimary)
            .hover((s) => s.bg(t.highlight))
            .children(optional(ctx.icon(open ? "ChevronDown" : "ChevronRight", { size: 10 }))),
        )
        // `-content-text`: heading small, grows, centered vertically.
        .child(textStyle(div().flex().flex_1().items_center().justify_start().text_color(t.textNeutralPrimary), typography(t, "heading", "small")).child(text)),
    );
  // `-trigger` is a Radix `<button>`: Tab reaches it and Enter/Space press it. gpui-base's unstyled
  // AccordionTrigger is a click handler that base keeps out of keyboard focus (`tab_index` does nothing on
  // it), so a focusable div inside it, over the whole trigger, is the tab stop (a click focuses it) and takes
  // the key press, which gpui does not turn into a click on a div.
  const focusable = div()
    .id(`${id}:key`)
    .w_full()
    .tab_index(0)
    .on_key_down((e, cx) => {
      if (e.key !== "enter" && e.key !== "space" && e.key !== " ") return;
      cx.stop_propagation();
      toggle(cx);
    })
    .child(wrapper);
  // `-trigger`: padding m 0 xs 0, full width, space-between, primary, pointer.
  return AccordionTrigger.new(id)
    .flex()
    .flex_row()
    .items_center()
    .justify_between()
    .w_full()
    .flex_1()
    .pt(t.spaceM)
    .pb(t.spaceXs)
    .text_color(t.textNeutralPrimary)
    .cursor_pointer()
    .on_change((_open, cx) => toggle(cx))
    .child(focusable);
}

export const SectionBlock: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray(props.sections);
    const isFoldable = props.isFoldable !== false;
    const local = ctx.local<SectionOpenState>(freshSectionOpenState());
    // useIsStreaming: react-lang sets it to `blocked` (streaming, or the response incomplete or in error).
    syncSectionOpen(local, items.map((item) => propsOf(item).value), ctx.streaming);

    if (!isFoldable) {
      // SectionV2 per section, stacked as siblings in the parent.
      return items.map((item, i) => {
        const p = propsOf(item);
        // .openui-section-v2: a column, gap xl, margin-top m; the wrapper: separator, header, content, gap xl.
        return div()
          .flex()
          .flex_col()
          .items_start()
          .justify_center()
          .gap(t.spaceXl)
          .mt(t.spaceM)
          .child(
            div()
              .flex()
              .flex_col()
              .items_start()
              .justify_center()
              .w_full()
              .gap(t.spaceXl)
              .child(div().flex_none().w_full().h(1).bg(t.borderDefault))
              .child(
                div()
                  .flex()
                  .flex_row()
                  .items_center()
                  .justify_start()
                  .gap(t.spaceS)
                  .mb(t.space2xs)
                  .child(textStyle(div().text_color(t.textNeutralPrimary), typography(t, "heading", "small")).child(String(p.trigger ?? ""))),
              )
              .child(div().flex().flex_col().w_full().gap(t.spaceXl).children(ctx.children(p.content, `section${i}`))),
          );
      });
    }

    // .openui-foldable-section-root: a column, gap l.
    return BaseAccordion.new(ctx.id())
      .flex()
      .flex_col()
      .gap(t.spaceL)
      .children(
        items.map((item, i) => {
          const p = propsOf(item);
          const value = String(p.value ?? i);
          const open = local.open.includes(value);
          const toggle = (cx: Context) => {
            toggleSection(local, value);
            cx.notify();
          };
          // -content: a column, gap xl, padding-left 28px; mounted only while open (Radix Presence, no animation here).
          const panel = div()
            .flex()
            .flex_col()
            .w_full()
            .gap(t.spaceXl)
            .pl(28)
            .children(ctx.children(p.content, `section${i}`));
          // -item: a column, gap l, full width.
          return BaseAccordionItem.new()
            .open(open)
            .flex()
            .flex_col()
            .gap(t.spaceL)
            .w_full()
            .header(accordionHeader(sectionTrigger(ctx, t, ctx.id(`trigger-${i}`), String(p.trigger ?? ""), open, toggle)).flex())
            .panel(AccordionPanel.new().child(open ? panel : div()));
        }),
      );
  },
};
