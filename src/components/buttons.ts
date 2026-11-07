// Buttons: Button, Buttons, and the IconButton other components use.
//
// Ported from react-ui at the pinned commit:
//   Button      genui-lib/Button/index.tsx, components/Button/{Button.tsx,button.scss}
//   Buttons     genui-lib/Buttons/index.tsx, components/Buttons/{Buttons.tsx,buttons.scss}
//   IconButton  components/IconButton/{IconButton.tsx,iconButton.scss}; genui-lib/IconButton is in misc.ts
import { ACTION_STEPS } from "@openuidev/lang-core";
import { div, type Color, type Context, type Element } from "gpui-kit";
import { optional, type Component, type RenderContext } from "../render/surface.ts";
import { shadow, textStyle, TRANSPARENT, typography, type ShadowPreset, type Tokens } from "../render/tokens.ts";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "extra-small" | "small" | "medium" | "large";

interface Look {
  bg: Color;
  fg: Color;
  border: Color;
  shadow: ShadowPreset;
  hoverBg?: Color;
  hoverShadow?: ShadowPreset;
  activeBg?: Color;
  activeBorder?: Color;
  disabledBg?: Color;
  disabledFg?: Color;
  disabledBorder?: Color;
}

/** button.scss / iconButton.scss variant blocks (identical in both files). */
function look(t: Tokens, variant: ButtonVariant, destructive: boolean): Look {
  if (!destructive) {
    switch (variant) {
      case "primary":
        return {
          bg: t.interactiveAccentDefault,
          fg: t.textAccentPrimary,
          border: t.borderAccent,
          shadow: t.shadowM,
          hoverBg: t.interactiveAccentHover,
          hoverShadow: "none",
          activeBg: t.interactiveAccentPressed,
          disabledBg: t.interactiveAccentDisabled,
        };
      case "secondary":
        return {
          bg: TRANSPARENT,
          fg: t.textNeutralPrimary,
          border: t.borderInteractive,
          shadow: t.shadowM,
          hoverBg: t.highlight,
          hoverShadow: "none",
          activeBg: t.highlight,
          disabledBg: TRANSPARENT,
          disabledFg: t.textNeutralTertiary,
        };
      default:
        return {
          bg: TRANSPARENT,
          fg: t.textNeutralPrimary,
          border: TRANSPARENT,
          shadow: "none",
          hoverBg: t.highlight,
          activeBg: t.highlight,
          activeBorder: t.borderInteractive,
          disabledBg: TRANSPARENT,
          disabledFg: t.textNeutralTertiary,
          disabledBorder: t.borderDefault,
        };
    }
  }
  switch (variant) {
    case "primary":
      return {
        bg: t.interactiveDestructiveAccentDefault,
        fg: t.textDangerInvertedPrimary,
        border: t.borderAccent,
        shadow: "none",
        hoverBg: t.interactiveDestructiveAccentHover,
        activeBg: t.interactiveDestructiveAccentPressed,
        disabledBg: t.interactiveDestructiveAccentDisabled,
      };
    case "secondary":
      return {
        bg: t.interactiveDestructiveDefault,
        fg: t.textDangerPrimary,
        border: t.borderDanger,
        shadow: "none",
        hoverBg: t.interactiveDestructiveHover,
        activeBg: t.interactiveDestructiveHover,
        disabledBg: t.interactiveDestructiveDisabled,
        disabledFg: t.textDangerTertiary,
      };
    default:
      return {
        bg: TRANSPARENT,
        fg: t.textDangerPrimary,
        border: TRANSPARENT,
        shadow: "none",
        hoverBg: t.interactiveDestructiveHover,
        activeBg: t.interactiveDestructiveHover,
        activeBorder: t.borderDanger,
        disabledFg: t.textDangerTertiary,
      };
  }
}

function paint(el: Element, l: Look, disabled: boolean, onClick: ((cx: Context) => void) | undefined, bubble = false): Element {
  if (disabled) {
    return el
      .bg(l.disabledBg ?? l.bg)
      .text_color(l.disabledFg ?? l.fg)
      .border_color(l.disabledBorder ?? l.border);
  }
  let out = shadow(el.bg(l.bg).text_color(l.fg).border_color(l.border), l.shadow).cursor_pointer();
  out = out.hover((s) => {
    let h = l.hoverBg ? s.bg(l.hoverBg) : s;
    if (l.hoverShadow) h = shadow(h, l.hoverShadow);
    return h;
  });
  out = out.active((s) => {
    const a = l.activeBg ? s.bg(l.activeBg) : s;
    return l.activeBorder ? a.border_color(l.activeBorder) : a;
  });
  if (!onClick) return out;
  return out.on_click((_e, cx) => {
    if (!bubble) cx.stop_propagation();
    onClick(cx);
  });
}

export interface ButtonOptions {
  id: string;
  label: string;
  variant?: ButtonVariant;
  destructive?: boolean;
  size?: ButtonSize;
  disabled?: boolean;
  /** A lucide icon before the label (Button's `iconLeft`); `& svg { width: 1em }` sizes it to the label text. */
  iconLeft?: string;
  onClick: (cx: Context) => void;
  /** The click goes on to the parents (react-ui's Button never stops it: a card around it fires its own action too); default: it stops here. */
  bubble?: boolean;
}

/** components/Button: the drawn button, shared by Button and other renderers. */
export function button(ctx: RenderContext, o: ButtonOptions): Element {
  const t = ctx.t;
  // Base: label default, radius l, 1px transparent border, row with gap xs.
  let el = div().id(o.id).flex().flex_row().flex_none().items_center().gap(t.spaceXs).border_1().rounded(t.radiusL);
  el = textStyle(el, typography(t, "label", "default"));
  switch (o.size ?? "medium") {
    case "extra-small":
      el = textStyle(el.rounded(t.radiusS).py(t.spaceXs - 1.75).px(t.spaceS), typography(t, "label", "small"));
      break;
    case "small":
      el = textStyle(el.rounded(t.radiusS + 1).py(t.spaceS - 1.75).px(t.spaceSM), typography(t, "label", "small"));
      break;
    case "large":
      el = el.py(t.spaceSM - 1).px(t.spaceM);
      break;
    default:
      el = el.py(t.spaceS - 1).px(t.spaceSM).rounded(t.radiusM);
  }
  const textSize = typography(t, "label", o.size === "small" || o.size === "extra-small" ? "small" : "default").size;
  const icon = o.iconLeft ? ctx.icon(o.iconLeft, { size: textSize }) : null;
  return paint(el, look(t, o.variant ?? "primary", !!o.destructive), !!o.disabled, o.onClick, o.bubble)
    .children(optional(icon))
    .child(o.label);
}

export type IconButtonSize = "3-extra-small" | "2-extra-small" | "extra-small" | "small" | "medium" | "large";

/** iconButton.scss square sizes: box and icon px, radius. */
export const ICON_BUTTON: Record<IconButtonSize, { box: number; icon: number; radius: (t: Tokens) => number }> = {
  "3-extra-small": { box: 20, icon: 10, radius: (t) => t.radiusS },
  "2-extra-small": { box: 24, icon: 12, radius: (t) => t.radiusS - 1 },
  "extra-small": { box: 28, icon: 14, radius: (t) => t.radiusS },
  small: { box: 32, icon: 16, radius: (t) => t.radiusS + 1 },
  medium: { box: 36, icon: 16, radius: (t) => t.radiusM },
  large: { box: 40, icon: 16, radius: (t) => t.radiusL },
};

/**
 * components/IconButton: a lucide `icon` in a square or circle button. Upstream's
 * `.openui-icon-button-icon` sizes only the span around the svg, so the icon keeps the size
 * its caller gave it: `iconSize`, or (callers that pass none) the span's size.
 */
export function iconButton(
  ctx: RenderContext,
  o: {
    id: string;
    icon: string;
    category?: string;
    variant?: ButtonVariant;
    size?: IconButtonSize;
    shape?: "square" | "circle";
    iconSize?: number;
    disabled?: boolean;
    onClick: (cx: Context) => void;
    /** The click goes on to the parents (react-ui's genui IconButton never stops it); default: it stops here. */
    bubble?: boolean;
  },
): Element {
  const t = ctx.t;
  const size = ICON_BUTTON[o.size ?? "medium"];
  let el = div().id(o.id).flex().flex_none().items_center().justify_center().border_1().w(size.box).h(size.box);
  el = o.shape === "circle" ? el.rounded_full() : el.rounded(size.radius(t));
  return paint(el, look(t, o.variant ?? "primary", false), !!o.disabled, o.onClick, o.bubble).children(
    optional(ctx.icon(o.icon, { category: o.category, size: o.iconSize ?? size.icon })),
  );
}

/** genui Button: primary buttons validate their form first when the action leaves the UI. */
function needsValidation(action: { steps?: { type: string; refType?: string }[] } | null | undefined): boolean {
  if (!action?.steps) return true;
  return action.steps.some(
    (s) =>
      s.type === ACTION_STEPS.ToAssistant ||
      s.type === "custom_action" ||
      (s.type === ACTION_STEPS.Run && s.refType === "mutation"),
  );
}

/** genui Button's variantMap: "ghost" is an alias of tertiary. */
const VARIANT: Record<string, ButtonVariant> = { primary: "primary", secondary: "secondary", ghost: "tertiary", tertiary: "tertiary" };
const SIZES: ButtonSize[] = ["extra-small", "small", "medium", "large"];

export const Button: Component = {
  render(props, ctx) {
    const label = String(props.label ?? "");
    const variant = VARIANT[String(props.variant)] ?? "primary";
    const size = SIZES.find((s) => s === props.size) ?? "medium";
    return button(ctx, {
      id: ctx.id("btn"),
      label,
      variant,
      destructive: props.type === "destructive",
      size,
      disabled: ctx.streaming,
      bubble: true,
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
    // buttons.scss: full width, gap m; horizontal wraps, vertical stretches.
    const el = div().flex().w_full().gap(ctx.t.spaceM);
    const dir = props.direction === "column" ? el.flex_col() : el.flex_row().flex_wrap();
    return dir.children(ctx.children(props.buttons, "b"));
  },
};
