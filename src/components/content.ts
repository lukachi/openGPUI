// Content: TextContent, MarkDownRenderer, Text, BoldText, Label, Callout, Tag, Icon.
//
// Ported from react-ui at the pinned commit:
//   TextContent       genui-lib/TextContent/index.tsx, components/TextContentWrapper/*
//   MarkDownRenderer  genui-lib/MarkDownRenderer/index.tsx, components/MarkDownRenderer/*
//   Text, BoldText    genui-lib/{Text,BoldText}/index.tsx, components/TextBlock/{TextBlock.tsx,textBlock.scss}
//   Label             genui-lib/Label/index.tsx, components/Label/*
//   Callout           genui-lib/Callout/index.tsx, components/Callout/*
//   Tag               genui-lib/Tag/index.tsx, components/Tag/*
//   Icon              genui-lib/Icon/index.tsx, components/_shared/icons/IconWrapper.tsx
//
// Markdown is drawn by src/markdown (react-markdown's tree, react-ui's markdown
// styles); its file header lists where that differs from a browser.
import { div, type Color, type Element } from "gpui-kit";
import { markdownBlock, markdownInline } from "../markdown/render.ts";
import { optional, type Component, type RenderContext } from "../render/surface.ts";
import { restyle, textStyle, typography, type TextStyle, type Tokens, type TypographyGroup } from "../render/tokens.ts";

/**
 * genui TextContent points `--openui-text-body-default` at the chosen size. The
 * "wght" axis stays the Regular variation (font-variation-settings outlives the
 * font shorthand), so the heavy sizes draw at Regular weight in a browser too.
 */
const BODY_SIZES = {
  small: "small",
  default: "default",
  large: "large",
  "small-heavy": "small-heavy",
  "large-heavy": "large-heavy",
} as const;

export const TextContent: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const size = BODY_SIZES[props.size as keyof typeof BODY_SIZES] ?? "default";
    const body = restyle(t, typography(t, "body", size), { weight: typography(t, "body", "default").weight });
    const text = props.text == null ? "" : String(props.text);
    // TextContentWrapper: a column (gap xl) holding the markdown renderer.
    return div()
      .flex()
      .flex_col()
      .gap(t.spaceXl)
      .child(markdownBlock(ctx, "md", text, { profile: "content", body }));
  },
};

export const MarkDownRenderer: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const md = markdownBlock(ctx, "md", String(props.textMarkdown ?? ""), { profile: "plain" });
    switch (props.variant) {
      case "card":
        return md.bg(t.foreground).rounded(8).p(16);
      case "sunk":
        return md.bg(t.sunk).rounded(8).p(16);
      default:
        return md;
    }
  },
};

// ── TextBlock (Text, BoldText) ──

/** The TextBlock variants Text and BoldText produce (title-text variants are card-block only). */
type BlockVariant = "text" | "text-subtext" | "highlight-text" | "highlight-number" | "highlight-text-number-subtext" | "number";
type Typo = readonly [TypographyGroup, string];
type GapToken = "space3xs" | "spaceXs" | 0;

/**
 * textBlock.scss as data, in source order: [variants, size, type-number?, property, value].
 * The winning rule for a property is the most specific match (variant, size and
 * type each add a class), the later one on a tie, as in CSS.
 */
type Rule = readonly [variants: readonly BlockVariant[] | null, size: string | null, number: boolean, prop: "gap" | "primary" | "secondary", value: Typo | GapToken];

const T = (variants: BlockVariant | BlockVariant[] | null) => (variants == null ? null : Array.isArray(variants) ? variants : [variants]);
const SUB: BlockVariant[] = ["text-subtext", "highlight-text-number-subtext"];

const RULES: Rule[] = [
  [null, null, false, "gap", "space3xs"],
  [T("text-subtext"), null, false, "primary", ["body", "default"]],
  [T("text-subtext"), null, false, "secondary", ["body", "small"]],
  [T("highlight-text-number-subtext"), null, false, "gap", 0],
  [T("highlight-text-number-subtext"), null, false, "primary", ["body", "heavy"]],
  [T("highlight-text-number-subtext"), null, false, "secondary", ["body", "small"]],
  [T("text"), null, false, "primary", ["body", "default"]],
  [T("highlight-text"), null, false, "primary", ["body", "heavy"]],
  [T("number"), null, false, "primary", ["number", "heavy"]],
  [T("highlight-number"), null, false, "primary", ["number", "large-heavy"]],
  // xs
  [T("text"), "xs", false, "primary", ["body", "small"]],
  [T("text"), "xs", true, "primary", ["number", "small"]],
  [SUB, "xs", false, "gap", 0],
  [T("text-subtext"), "xs", false, "primary", ["body", "small"]],
  [T("text-subtext"), "xs", true, "primary", ["number", "small"]],
  [T("highlight-text-number-subtext"), "xs", false, "primary", ["body", "small-heavy"]],
  [T("highlight-text-number-subtext"), "xs", true, "primary", ["number", "small-heavy"]],
  [SUB, "xs", false, "secondary", ["body", "small"]],
  [T("highlight-text-number-subtext"), "xs", true, "secondary", ["number", "small"]],
  [T("number"), "xs", false, "primary", ["number", "small"]],
  [T("highlight-number"), "xs", false, "primary", ["number", "small-heavy"]],
  [T("highlight-text"), "xs", false, "primary", ["body", "small-heavy"]],
  // sm
  [T("text"), "sm", false, "primary", ["body", "default"]],
  [T("text"), "sm", true, "primary", ["number", "default"]],
  [SUB, "sm", false, "gap", 0],
  [T("text-subtext"), "sm", false, "primary", ["body", "default"]],
  [T("text-subtext"), "sm", true, "primary", ["number", "default"]],
  [T("highlight-text-number-subtext"), "sm", false, "primary", ["body", "heavy"]],
  [T("highlight-text-number-subtext"), "sm", true, "primary", ["number", "heavy"]],
  [SUB, "sm", false, "secondary", ["body", "small"]],
  [T("highlight-text-number-subtext"), "sm", true, "secondary", ["number", "small"]],
  [T("number"), "sm", false, "primary", ["number", "small"]],
  [T("highlight-number"), "sm", false, "primary", ["number", "heavy"]],
  [T("highlight-text"), "sm", false, "gap", 0],
  [T("highlight-text"), "sm", false, "secondary", ["body", "small"]],
  [T("highlight-text"), "sm", false, "primary", ["body", "heavy"]],
  // md
  [T(["text-subtext", "highlight-text", "highlight-text-number-subtext"]), "md", false, "gap", 0],
  [T("highlight-text"), "md", false, "secondary", ["body", "default"]],
  [T("highlight-text"), "md", false, "primary", ["body", "heavy"]],
  [T("text-subtext"), "md", false, "primary", ["body", "default"]],
  [T("text-subtext"), "md", true, "primary", ["number", "default"]],
  [T("highlight-text-number-subtext"), "md", false, "primary", ["body", "heavy"]],
  [T("highlight-text-number-subtext"), "md", true, "primary", ["number", "heavy"]],
  [SUB, "md", false, "secondary", ["body", "default"]],
  [T("text-subtext"), "md", true, "secondary", ["number", "default"]],
  [T("highlight-text-number-subtext"), "md", true, "secondary", ["number", "default"]],
  [T("text"), "md", true, "primary", ["number", "default"]],
  [T("number"), "md", false, "primary", ["number", "default"]],
  [T("highlight-number"), "md", false, "primary", ["number", "heavy"]],
  // lg
  [T("text"), "lg", false, "primary", ["body", "large"]],
  [T("text"), "lg", true, "primary", ["number", "large"]],
  [T(["text-subtext", "highlight-text", "highlight-text-number-subtext"]), "lg", false, "gap", 0],
  [T("highlight-text"), "lg", false, "secondary", ["body", "default"]],
  [T("highlight-text"), "lg", false, "primary", ["body", "large-heavy"]],
  [T("text-subtext"), "lg", false, "primary", ["body", "large"]],
  [T("text-subtext"), "lg", true, "primary", ["number", "large"]],
  [T("highlight-text-number-subtext"), "lg", false, "primary", ["body", "large-heavy"]],
  [T("highlight-text-number-subtext"), "lg", true, "primary", ["number", "large-heavy"]],
  [SUB, "lg", false, "secondary", ["body", "default"]],
  [T("text-subtext"), "lg", true, "secondary", ["number", "default"]],
  [T("highlight-text-number-subtext"), "lg", true, "secondary", ["number", "default"]],
  [T("number"), "lg", false, "primary", ["number", "large"]],
  [T("highlight-number"), "lg", false, "primary", ["number", "large-heavy"]],
];

function blockRule(variant: BlockVariant, size: string, number: boolean, prop: Rule[3]): Rule[4] | undefined {
  let best: { spec: number; value: Rule[4] } | undefined;
  for (const [variants, ruleSize, ruleNumber, ruleProp, value] of RULES) {
    if (ruleProp !== prop) continue;
    if (variants && !variants.includes(variant)) continue;
    if (ruleSize && ruleSize !== size) continue;
    if (ruleNumber && !number) continue;
    const spec = (variants ? 1 : 0) + (ruleSize ? 1 : 0) + (ruleNumber ? 1 : 0);
    if (!best || spec >= best.spec) best = { spec, value };
  }
  return best?.value;
}

function style(t: Tokens, typo: Rule[4] | undefined): TextStyle {
  const [group, variant] = (Array.isArray(typo) ? typo : ["body", "default"]) as Typo;
  return typography(t, group, variant as never);
}

/** genui-lib/Text getMetricSubtextTone: a leading +/- colors "metric" subtext. */
function secondaryColor(t: Tokens, subtextVariant: unknown, subtext: string): Color {
  if (subtextVariant !== "metric" || !subtext) return t.textNeutralSecondary;
  if (subtext.startsWith("+")) return t.textSuccessPrimary;
  if (subtext.startsWith("-")) return t.textDangerPrimary;
  return t.textNeutralSecondary;
}

/** components/TextBlock TextBlockView, for the variants Text and BoldText use. */
function textBlock(ctx: RenderContext, variant: BlockVariant, props: Record<string, unknown>): Element {
  const t = ctx.t;
  const size = String(props.size ?? "sm");
  const number = props.variant === "number";
  const gapToken = blockRule(variant, size, number, "gap");
  const subtext = props.subtext == null || props.subtext === "" ? "" : String(props.subtext);
  return div()
    .flex()
    .flex_col()
    .items_start()
    .gap(typeof gapToken === "string" ? t[gapToken] : 0)
    .child(textLine(ctx, "primary", String(props.value ?? ""), t.textNeutralPrimary, style(t, blockRule(variant, size, number, "primary"))))
    .when(subtext !== "", (el) =>
      el.child(textLine(ctx, "secondary", subtext, secondaryColor(t, props.subtextVariant, subtext), style(t, blockRule(variant, size, number, "secondary")))),
    );
}

/** A TextBlock line: InlineMarkdownRenderer in the line's font and color; nothing for empty content. */
function textLine(ctx: RenderContext, part: string, text: string, color: Color, font: TextStyle): Element {
  return textStyle(div().text_color(color), font).children(text ? [markdownInline(ctx, part, text, { font, color })] : []);
}

export const Text: Component = {
  render(props, ctx) {
    return textBlock(ctx, props.subtext ? "text-subtext" : "text", props);
  },
};

export const BoldText: Component = {
  render(props, ctx) {
    const variant: BlockVariant = props.subtext
      ? "highlight-text-number-subtext"
      : props.variant === "number"
        ? "highlight-number"
        : "highlight-text";
    return textBlock(ctx, variant, props);
  },
};

export const Label: Component = {
  render(props, ctx) {
    return textStyle(div().text_color(ctx.t.textNeutralPrimary), typography(ctx.t, "body", "default")).child(String(props.text ?? ""));
  },
};

/** genui Callout maps "error" to the warning look, as upstream does. */
const CALLOUT_VARIANT: Record<string, "info" | "warning" | "success" | "neutral"> = {
  info: "info",
  warning: "warning",
  success: "success",
  error: "warning",
  neutral: "neutral",
};

export const Callout: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const field = ctx.field<boolean | string>("visible", props.visible);
    const bound = field.isReactive;
    const visible = bound ? field.value === true || field.value === "true" : true;
    if (bound) {
      // genui Callout: a $visible callout sets it false 3 s after it shows.
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
    }
    if (!visible) return null;
    const variant = CALLOUT_VARIANT[String(props.variant)] ?? "info";
    const { border, title } = {
      info: { border: t.borderInfoEmphasis, title: t.textInfoPrimary },
      warning: { border: t.borderAlertEmphasis, title: t.textAlertPrimary },
      success: { border: t.borderSuccessEmphasis, title: t.textSuccessPrimary },
      neutral: { border: t.borderInteractiveSelected, title: t.textNeutralPrimary },
    }[variant];
    return div()
      .flex()
      .flex_col()
      .items_start()
      .py(t.space000)
      .px(t.spaceM + 2)
      .border_l(2)
      .border_color(border)
      .when(!!props.title, (el) => el.child(textStyle(div().text_color(title), typography(t, "body", "heavy")).child(String(props.title))))
      // .openui-callout-description: body default, neutral primary, around a MarkDownRenderer.
      .when(!!props.description, (el) => el.child(markdownBlock(ctx, "desc", String(props.description), { profile: "plain" })));
  },
};

export const Tag: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const size = props.size === "sm" || props.size === "lg" ? props.size : "md";
    const looks: Record<string, { bg: Color; fg: Color }> = {
      neutral: { bg: t.sunk, fg: t.textNeutralPrimary },
      info: { bg: t.infoBackground, fg: t.textInfoPrimary },
      success: { bg: t.successBackground, fg: t.textSuccessPrimary },
      warning: { bg: t.alertBackground, fg: t.textAlertPrimary },
      danger: { bg: t.dangerBackground, fg: t.textDangerPrimary },
    };
    const { bg, fg } = looks[String(props.variant ?? "neutral")] ?? looks.neutral!;
    let el = div().flex().flex_row().flex_none().items_center().overflow_hidden().max_w_full().bg(bg).text_color(fg);
    el = textStyle(el, typography(t, "label", "small"));
    if (size === "sm") el = el.py(t.space2xs).px(t.spaceXs).rounded(t.radiusS).h(24).gap(t.space2xs);
    else if (size === "md") el = el.py(t.spaceXs).px(t.spaceS).rounded(t.radiusS).h(32).gap(t.spaceXs);
    else el = el.py(t.spaceS).px(t.spaceM).rounded(t.radiusM).h(36).gap(t.spaceXs);
    // `icon` is an Icon element: its name/category go through upstream's lucide lookup.
    // .openui-tag-icon svg: 14px at stroke-width 2.5.
    const icon = props.icon as { props?: { name?: unknown; category?: unknown } } | undefined;
    const name = typeof icon?.props?.name === "string" ? icon.props.name : "";
    const category = typeof icon?.props?.category === "string" ? icon.props.category : undefined;
    return el
      .children(name !== "" ? optional(ctx.icon(name, { category, size: 14, stroke: 2.5 })) : [])
      .child(div().overflow_hidden().whitespace_nowrap().text_ellipsis().child(String(props.text ?? "")));
  },
};

export const Icon: Component = {
  render(props, ctx) {
    // IconRenderer: nothing without a name; IconWrapper draws it 14px in the text color.
    if (typeof props.name !== "string" || props.name === "") return null;
    return ctx.icon(props.name, { category: typeof props.category === "string" ? props.category : undefined });
  },
};
