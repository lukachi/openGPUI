// Buttons: Button, Buttons.
import { ACTION_STEPS } from "@openuidev/lang-core";
import { h_flex, v_flex } from "gpui-base";
import type { Context } from "gpui-kit";
import type { Component, RenderContext } from "../render/surface.ts";
import { alpha } from "../render/tokens.ts";

const SIZE: Record<string, { h: number; px: number; text: number }> = {
  "extra-small": { h: 22, px: 8, text: 11 },
  small: { h: 26, px: 10, text: 12 },
  medium: { h: 32, px: 14, text: 13 },
  large: { h: 38, px: 18, text: 14 },
};

/** Primary buttons validate their form first when the action leaves the UI (as upstream). */
function needsValidation(action: { steps?: { type: string; refType?: string }[] } | null | undefined): boolean {
  if (!action?.steps) return true;
  return action.steps.some(
    (s) =>
      s.type === ACTION_STEPS.ToAssistant ||
      s.type === "custom_action" ||
      (s.type === ACTION_STEPS.Run && s.refType === "mutation"),
  );
}

export interface ButtonOptions {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "tertiary";
  destructive?: boolean;
  size?: string;
  disabled?: boolean;
  onClick: (cx: Context) => void;
}

/** A drawn button. Exported for other renderers (table pagination, …). */
export function button(ctx: RenderContext, { id, label, variant = "primary", destructive = false, size = "medium", disabled = false, onClick }: ButtonOptions) {
  const t = ctx.t;
  const s = SIZE[size] ?? SIZE.medium!;
  const tone = destructive ? t.danger : t.accent;
  let el = h_flex()
    .id(id)
    .flex_none()
    .h(s.h)
    .px(s.px)
    .items_center()
    .justify_center()
    .rounded(t.radius - 2)
    .text_size(s.text)
    .font_medium();
  if (variant === "primary") {
    el = el.bg(tone).text_color(destructive ? "#ffffff" : t.accentForeground).hover((st) => st.opacity(0.9));
  } else if (variant === "secondary") {
    el = el
      .border_1()
      .border_color(destructive ? alpha(tone, 0.5) : t.border)
      .text_color(destructive ? tone : t.foreground)
      .hover((st) => st.bg(t.hover));
  } else {
    el = el.text_color(tone).hover((st) => st.bg(t.hover));
  }
  if (disabled) return el.opacity(0.5).child(label);
  return el
    .cursor_pointer()
    .on_click((_e, cx) => {
      cx.stop_propagation();
      onClick(cx);
    })
    .child(label);
}

const VARIANT: Record<string, ButtonOptions["variant"]> = { primary: "primary", secondary: "secondary", ghost: "tertiary", tertiary: "tertiary" };

export const Button: Component = {
  render(props, ctx) {
    const label = String(props.label ?? "");
    const variant = VARIANT[String(props.variant)] ?? "primary";
    return button(ctx, {
      id: ctx.id("btn"),
      label,
      variant,
      destructive: props.type === "destructive",
      size: props.size,
      disabled: ctx.streaming,
      onClick: () => {
        const form = ctx.form;
        if (form && variant === "primary" && needsValidation(props.action) && !form.validateForm()) return;
        ctx.trigger(label, props.action);
      },
    });
  },
};

export const Buttons: Component = {
  render(props, ctx) {
    const el = props.direction === "column" ? v_flex().items_start() : h_flex().flex_wrap();
    return el.gap(8).children(ctx.children(props.buttons, "b"));
  },
};
