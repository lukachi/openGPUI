// Content: CardHeader, TextContent, Text, Label, Callout, Tag, MarkDownRenderer.
import { div } from "gpui-kit";
import { h_flex, v_flex, TextView } from "gpui-base";
import type { Component } from "../render/surface.ts";
import { alpha, toneColor } from "../render/tokens.ts";

const TEXT_CONTENT: Record<string, { size: number; heavy: boolean }> = {
  small: { size: 12, heavy: false },
  default: { size: 14, heavy: false },
  large: { size: 18, heavy: false },
  "small-heavy": { size: 12, heavy: true },
  "large-heavy": { size: 20, heavy: true },
};

export const CardHeader: Component = {
  render(props, ctx) {
    return v_flex()
      .gap(2)
      .when(!!props.title, (el) => el.child(div().text_size(16).font_semibold().child(props.title)))
      .when(!!props.subtitle, (el) => el.child(div().text_size(13).text_color(ctx.t.muted).child(props.subtitle)));
  },
};

export const TextContent: Component = {
  render(props, ctx) {
    const style = TEXT_CONTENT[String(props.size)] ?? TEXT_CONTENT.default!;
    return div()
      .text_size(style.size)
      .when(style.heavy, (el) => el.font_semibold())
      .child(String(props.text ?? ""));
  },
};

const TEXT_SIZE: Record<string, number> = { xs: 11, sm: 13, md: 15, lg: 18 };

/** Text and BoldText: a value with optional subtext; "metric" subtext is colored by sign. */
function textRenderer(bold: boolean): Component {
  return {
    render(props, ctx) {
      const t = ctx.t;
      const size = TEXT_SIZE[String(props.size ?? "sm")] ?? 13;
      const number = props.variant === "number";
      const subtext = props.subtext;
      let subColor = t.muted;
      if (props.subtextVariant === "metric" && typeof subtext === "string") {
        if (/^\s*\+/.test(subtext)) subColor = t.success;
        else if (/^\s*[-−]/.test(subtext)) subColor = t.danger;
      }
      return v_flex()
        .gap(1)
        .child(
          div()
            .text_size(size)
            .when(bold || number, (el) => el.font_semibold())
            .child(String(props.value ?? props.text ?? "")),
        )
        .when(subtext != null && subtext !== "", (el) =>
          el.child(div().text_size(Math.max(11, size - 2)).text_color(subColor).child(String(subtext))),
        );
    },
  };
}

export const Text = textRenderer(false);
export const BoldText = textRenderer(true);

export const Label: Component = {
  render(props, ctx) {
    return div().text_size(13).font_medium().text_color(ctx.t.foreground).child(String(props.text ?? ""));
  },
};

export const MarkDownRenderer: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const md = TextView.markdown(ctx.id("md"), String(props.textMarkdown ?? "")).selectable(true);
    switch (props.variant) {
      case "card":
        return div().w_full().p(14).rounded(t.radius + 2).bg(t.surface).border_1().border_color(t.border).child(md);
      case "sunk":
        return div().w_full().p(14).rounded(t.radius + 2).bg(t.sunk).child(md);
      default:
        return md;
    }
  },
};

export const Callout: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const field = ctx.field<boolean | string>("visible", props.visible);
    const visible = field.isReactive ? field.value === true || field.value === "true" : true;
    if (field.isReactive) {
      // Upstream: a bound callout dismisses itself 3 s after it shows.
      const local = ctx.local({ armed: false });
      if (visible && !local.armed) {
        local.armed = true;
        ctx.after((cx) => {
          cx.timer.after(3000, () => {
            local.armed = false;
            field.setValue(false);
          });
        });
      }
      if (!visible) return null;
    }
    const color = toneColor(t, props.variant === "neutral" ? "neutral" : props.variant);
    return v_flex()
      .gap(4)
      .px(14)
      .py(10)
      .rounded(t.radius)
      .border_1()
      .border_color(alpha(color, 0.35))
      .bg(alpha(color, 0.08))
      .child(div().text_size(14).font_semibold().text_color(color).child(String(props.title ?? "")))
      .when(!!props.description, (el) =>
        el.child(TextView.markdown(ctx.id("desc"), String(props.description)).selectable(true)),
      );
  },
};

const TAG_SIZE: Record<string, { h: number; px: number; text: number }> = {
  sm: { h: 20, px: 6, text: 11 },
  md: { h: 24, px: 8, text: 12 },
  lg: { h: 28, px: 10, text: 13 },
};

export const Tag: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const size = TAG_SIZE[String(props.size ?? "md")] ?? TAG_SIZE.md!;
    const color = toneColor(t, props.variant ?? "neutral");
    return h_flex()
      .flex_none()
      .h(size.h)
      .px(size.px)
      .gap(4)
      .items_center()
      .rounded(size.h / 2)
      .bg(alpha(color, 0.14))
      .text_color(color)
      .text_size(size.text)
      .font_medium()
      .children(ctx.children(props.icon, "icon"))
      .child(String(props.text ?? ""));
  },
};
