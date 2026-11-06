// Layout: Stack, Card, CardHeader, Separator.
//
// Ported from react-ui at the pinned commit:
//   Stack       genui-lib/Stack/index.tsx
//   Card        genui-lib/Card/index.tsx, components/Card/{Card.tsx,card.scss}
//   CardHeader  genui-lib/CardHeader/index.tsx, components/CardHeader/{CardHeader.tsx,cardHeader.scss}
//   Separator   genui-lib/Separator/index.tsx, components/Separator/{Separator.tsx,separator.scss}
import { div, type Element } from "gpui-kit";
import type { Component, Props } from "../render/surface.ts";
import { shadow, textStyle, TRANSPARENT, typography, type Tokens } from "../render/tokens.ts";

/** genui-lib gapMap: FlexProps gap → --openui-space-*. */
function gap(t: Tokens, value: unknown): number {
  switch (value) {
    case "none":
      return 0;
    case "xs":
      return t.spaceXs;
    case "s":
      return t.spaceS;
    case "l":
      return t.spaceL;
    case "xl":
      return t.spaceXl;
    case "2xl":
      return t.space2xl;
    default:
      return t.spaceM;
  }
}

function alignItems(el: Element, value: unknown): Element {
  switch (value) {
    case "start":
      return el.items_start();
    case "center":
      return el.items_center();
    case "end":
      return el.items_end();
    case "stretch":
      return el.items_stretch();
    case "baseline":
      return el.items_baseline();
    default:
      return el; // CSS default: stretch
  }
}

function justifyContent(el: Element, value: unknown): Element {
  switch (value) {
    case "start":
      return el.justify_start();
    case "center":
      return el.justify_center();
    case "end":
      return el.justify_end();
    case "between":
      return el.justify_between();
    case "around":
      return el.justify_around();
    case "evenly":
      return el.justify_evenly();
    default:
      return el;
  }
}

/** A plain flex box: no gpui-base h_flex/v_flex, whose default alignment differs from CSS. */
export function flexBox(direction: unknown): Element {
  return direction === "row" ? div().flex().flex_row() : div().flex().flex_col();
}

export const Stack: Component = {
  render(props, ctx) {
    // Upstream: a wrapping row with justify "between" falls back to "start".
    const justify = props.wrap && props.justify === "between" ? "start" : props.justify;
    let el = flexBox(props.direction ?? "column").id(ctx.id()).gap(gap(ctx.t, props.gap));
    el = justifyContent(alignItems(el, props.align), justify);
    if (props.wrap) el = el.flex_wrap();
    return el.children(ctx.children(props.children));
  },
};

/** components/Card: base + variant classes; genui Card adds full width, flex 1 and its FlexProps. */
function cardFrame(t: Tokens, variant: unknown, props: Props): Element {
  let el = flexBox(props.direction ?? "column")
    .w_full()
    .flex_1()
    .min_w_0()
    .border_1()
    .border_color(TRANSPARENT)
    .text_color(t.textNeutralPrimary)
    .gap(gap(t, props.gap));
  el = textStyle(el, typography(t, "body", "default"));
  el = justifyContent(alignItems(el, props.align ?? "stretch"), props.justify ?? "start");
  el = props.wrap ? el.flex_wrap() : el.flex_nowrap();
  switch (variant) {
    case "clear":
      return el.px(t.spaceL).rounded(t.radius3xl);
    case "sunk":
      return shadow(el.p(t.spaceL).rounded(t.radius3xl).bg(t.sunk).border_color(t.borderDefault), t.shadowM);
    default: // "card": no surface of its own upstream
      return el;
  }
}

export const Card: Component = {
  render(props, ctx) {
    return cardFrame(ctx.t, props.variant ?? "card", props).id(ctx.id()).children(ctx.children(props.children));
  },
};

export const CardHeader: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const top = div()
      .flex()
      .flex_row()
      .justify_between()
      .items_center()
      .child(
        textStyle(div().flex().flex_row().items_center().gap(t.spaceXs).text_color(t.textNeutralPrimary), typography(t, "heading", "small"))
          .when(props.title != null && props.title !== "", (el) => el.child(String(props.title))),
      );
    return div()
      .flex()
      .flex_col()
      .gap(t.spaceXs)
      .mb(t.space2xs)
      .child(top)
      .when(!!props.subtitle, (el) =>
        el.child(textStyle(div().text_color(t.textNeutralSecondary), typography(t, "body", "default")).child(String(props.subtitle))),
      );
  },
};

export const Separator: Component = {
  render(props, ctx) {
    const line = div().flex_none().bg(ctx.t.borderDefault);
    return props.orientation === "vertical" ? line.w(1).h_full() : line.h(1).w_full();
  },
};
