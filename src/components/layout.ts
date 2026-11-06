// Layout: Stack, Card, Separator.
import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import type { Component, Props } from "../render/surface.ts";
import { GAP } from "../render/tokens.ts";

/** Apply OpenUI FlexProps (direction, gap, align, justify, wrap) to a flex element. */
export function flex(props: Props, fallback: { direction?: string; gap?: string; align?: string } = {}) {
  const direction = props.direction ?? fallback.direction ?? "column";
  let el = direction === "row" ? h_flex() : v_flex();
  el = el.gap(GAP[String(props.gap ?? fallback.gap ?? "m")] ?? 12);
  switch (props.align ?? fallback.align) {
    case "start":
      el = el.items_start();
      break;
    case "center":
      el = el.items_center();
      break;
    case "end":
      el = el.items_end();
      break;
    case "baseline":
      el = el.items_baseline();
      break;
    case "stretch":
      el = el.items_stretch();
      break;
    default:
      // A column stretches its children like CSS flex does; a row's h_flex centers them.
      if (direction !== "row") el = el.items_stretch();
  }
  switch (props.justify) {
    case "center":
      el = el.justify_center();
      break;
    case "end":
      el = el.justify_end();
      break;
    case "between":
      el = el.justify_between();
      break;
    case "around":
      el = el.justify_around();
      break;
    case "evenly":
      el = el.justify_evenly();
      break;
    case "start":
      el = el.justify_start();
      break;
  }
  if (props.wrap) el = el.flex_wrap();
  return el;
}

export const Stack: Component = {
  render(props, ctx) {
    return flex(props).id(ctx.id()).w_full().children(ctx.children(props.children));
  },
};

export const Card: Component = {
  render(props, ctx) {
    const t = ctx.t;
    let el = flex(props, { direction: "column", gap: "m" }).id(ctx.id()).w_full().rounded(t.radius + 2);
    switch (props.variant ?? "card") {
      case "card":
        el = el.p(16).bg(t.surface).border_1().border_color(t.border);
        break;
      case "sunk":
        el = el.p(16).bg(t.sunk);
        break;
    }
    return el.children(ctx.children(props.children));
  },
};

export const Separator: Component = {
  render(props, ctx) {
    return props.orientation === "vertical"
      ? div().w(1).self_stretch().bg(ctx.t.border)
      : div().h(1).w_full().bg(ctx.t.border);
  },
};
