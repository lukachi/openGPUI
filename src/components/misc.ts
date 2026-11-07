// Misc: CodeBlock, TextCallout, InlineHeader, TagBlock, IconText, IconButton,
// MetricIndicatorInline, MetricIndicatorWithStrikethrough.
//
// Ported from react-ui at the pinned commit:
//   CodeBlock                       genui-lib/CodeBlock/index.tsx, components/CodeBlock/{CodeBlock.tsx,codeBlock.scss}
//                                   (drawn by src/markdown/code.ts, the same block markdown fences use)
//   TextCallout                     genui-lib/TextCallout/index.tsx, components/TextCallout/{TextCallout.tsx,textCallout.scss}
//   InlineHeader                    genui-lib/InlineHeader/index.tsx, components/InlineHeader/{InlineHeader.tsx,inlineHeader.scss}
//   TagBlock                        genui-lib/TagBlock/index.tsx, genui-lib/helpers.ts (asArray),
//                                   components/TagBlock/{TagBlock.tsx,tagBlock.scss}, components/Tag/* (Tag in content.ts)
//   IconText                        genui-lib/IconText/index.tsx, components/IconText/{IconText.tsx,iconText.scss},
//                                   components/IconTag/{IconTag.tsx,iconTag.scss}, components/TextBlock/* (textBlock in content.ts)
//   IconButton                      genui-lib/IconButton/index.tsx, components/IconButton/{IconButton.tsx,iconButton.scss}
//                                   (iconButton in buttons.ts)
//   MetricIndicatorInline,          genui-lib/MetricIndicator/index.tsx,
//   MetricIndicatorWithStrikethrough components/MetricIndicator/{MetricIndicator.tsx,metricIndicator.scss}
//
// None of these assume a parent: each draws its own box and takes the width its
// container gives it, so card blocks can hold them.
//
// Where gpui differs:
// - CodeBlock: highlighting starts about 3 s after the first code block shows (see src/markdown/code.ts);
//   the block scrolls sideways through gpui's overflow, without a scrollbar.
// - TextCallout, InlineHeader, MetricIndicator: text is one element per line; a long line wraps at
//   word boundaries gpui measures, which may differ by a word from a browser's.
// - MetricIndicatorInline aligns its items on the text baseline (`items_baseline`); a browser aligns
//   on the first line's baseline, gpui on the first line box's, which can differ by a pixel when the
//   items use different sizes.
// - IconButton: `transition: all 0.12s` is not drawn (no animated background); the disabled
//   `cursor: not-allowed` is not drawn.
// - TagBlock: a Tag's text ellipsizes through gpui's text_ellipsis, as in Tag.
import { div, type Color, type Element } from "gpui-kit";
import { codeBlock } from "../markdown/code.ts";
import { markdownInline } from "../markdown/render.ts";
import { optional, type Component, type RenderContext } from "../render/surface.ts";
import { textStyle, typography, type TextStyle, type Tokens } from "../render/tokens.ts";
import { iconButton, type ButtonVariant, type IconButtonSize } from "./buttons.ts";
import { Tag, textBlock } from "./content.ts";

/** An evaluated `Icon(...)` prop: its name and category, as upstream reads `props.icon.props`. */
function iconProps(icon: unknown): { name: string; category: string | undefined } {
  const p = (icon as { props?: { name?: unknown; category?: unknown } } | null | undefined)?.props;
  return {
    name: typeof p?.name === "string" ? p.name : "",
    category: typeof p?.category === "string" ? p.category : undefined,
  };
}

/** genui-lib/helpers asArray. */
function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

const text = (v: unknown): string => (v == null ? "" : String(v));

// ── CodeBlock ──

export const CodeBlock: Component = {
  render(props, ctx) {
    // components/CodeBlock passes no theme, so react-syntax-highlighter draws vscDarkPlus in any mode,
    // and no MarkDownRenderer rule changes its padding.
    return codeBlock(ctx, "code", text(props.codeString), text(props.language), typography(ctx.t, "body", "default").size, {
      theme: "dark",
      padding: "theme",
    });
  },
};

// ── TextCallout ──

type CalloutVariant = "neutral" | "info" | "warning" | "success" | "danger";

/** textCallout.scss: the variant's left border and text color. */
function calloutLook(t: Tokens, variant: CalloutVariant): { border: Color; color: Color } {
  switch (variant) {
    case "info":
      return { border: t.borderInfoEmphasis, color: t.textInfoPrimary };
    case "warning":
      return { border: t.borderAlertEmphasis, color: t.textAlertPrimary };
    case "success":
      return { border: t.borderSuccessEmphasis, color: t.textSuccessPrimary };
    case "danger":
      return { border: t.borderDangerEmphasis, color: t.textDangerPrimary };
    default:
      return { border: t.borderInteractiveSelected, color: t.textNeutralPrimary };
  }
}

export const TextCallout: Component = {
  render(props, ctx) {
    const t = ctx.t;
    // `variant = "neutral"` defaults only an omitted prop: an explicit null (or an unknown name)
    // finds no class in variantMap, so the callout has no border and inherits its text color.
    const named = (["neutral", "info", "warning", "success", "danger"] as const).find((v) => v === props.variant);
    const look = props.variant === undefined ? calloutLook(t, "neutral") : named && calloutLook(t, named);
    const color = look?.color;
    const title = text(props.title);
    const description = text(props.description);
    // .openui-text-callout-content: a column of the two spans; the title takes the variant's color
    // (neutral sets it explicitly, the others inherit it), the description is always neutral primary.
    // min_w_0: a browser's flex item shrinks to its longest word, so the text wraps inside the row.
    const content = div()
      .flex()
      .flex_col()
      .min_w_0()
      .when(title !== "", (el) => {
        const titleEl = textStyle(div(), typography(t, "body", "heavy")).child(title);
        return el.child(color ? titleEl.text_color(color) : titleEl);
      })
      .when(description !== "", (el) =>
        el.child(textStyle(div().text_color(t.textNeutralPrimary), typography(t, "body", "default")).child(description)),
      );
    // width 100%, row, gap xs, padding 0 16px, 2px left border (variants only).
    return div()
      .flex()
      .flex_row()
      .w_full()
      .gap(t.spaceXs)
      .py(0)
      .px(16)
      .when(!!look, (el) => el.text_color(look!.color).border_l(2).border_color(look!.border))
      .child(content);
  },
};

// ── InlineHeader ──

export const InlineHeader: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const heading = text(props.heading);
    const description = text(props.description);
    if (!heading && !description) return null;
    const headingFont = typography(t, "body", "heavy");
    const descriptionFont = typography(t, "body", "default");
    return div()
      .flex()
      .flex_col()
      .items_start()
      .gap(t.space3xs)
      .when(heading !== "", (el) =>
        el.child(
          // .openui-inline-header-heading: a row (align center, gap xs) around InlineMarkdownRenderer. A browser
          // clamps a flex-start item's fit-content width to its container; max_w_full does that here, so a long
          // heading wraps instead of running past the pane.
          textStyle(div().flex().flex_row().items_center().gap(t.spaceXs).max_w_full().text_color(t.textNeutralPrimary), headingFont).child(
            markdownInline(ctx, "heading", heading, { font: headingFont, color: t.textNeutralPrimary }),
          ),
        ),
      )
      .when(description !== "", (el) =>
        el.child(
          textStyle(div().text_color(t.textNeutralSecondary), descriptionFont).child(
            markdownInline(ctx, "description", description, { font: descriptionFont, color: t.textNeutralSecondary }),
          ),
        ),
      );
  },
};

// ── TagBlock ──

export const TagBlock: Component = {
  render(props, ctx, node) {
    const size = props.size === "sm" || props.size === "md" || props.size === "lg" ? props.size : undefined;
    // tagBlock.scss: a wrapping row, gap s, at most the container's width.
    return div()
      .flex()
      .flex_row()
      .flex_wrap()
      .gap(ctx.t.spaceS)
      .max_w_full()
      .children(
        asArray(props.tags).map((tag, i) => Tag.render({ text: text(tag), size }, ctx.child(`t${i}`), node) as Element),
      );
  },
};

// ── IconText ──

type IconTagVariant = "neutral" | "info" | "success" | "warning" | "danger" | "inverted";

/** IconText.normalizeIconVariant: "filled" and "soft" draw as neutral. */
function normalizeIconVariant(variant: unknown): string {
  return variant === "filled" || variant === "soft" || variant == null ? "neutral" : String(variant);
}

/** iconTag.scss `--l` (the only size IconText uses) with the variant's colors. */
function iconTag(ctx: RenderContext, name: string, category: string | undefined, variant: string): Element | null {
  if (!name) return null;
  const t = ctx.t;
  const looks: Record<IconTagVariant, { bg: Color; fg: Color }> = {
    neutral: { bg: t.highlight, fg: t.textNeutralPrimary },
    info: { bg: t.infoBackground, fg: t.textInfoPrimary },
    success: { bg: t.successBackground, fg: t.textSuccessPrimary },
    warning: { bg: t.alertBackground, fg: t.textAlertPrimary },
    danger: { bg: t.dangerBackground, fg: t.textDangerPrimary },
    inverted: { bg: t.invertedBackground, fg: t.background },
  };
  // An unknown variant adds a class no rule styles: no background, inherited color.
  const look = (looks as Partial<Record<string, { bg: Color; fg: Color }>>)[variant];
  let el = div().flex().flex_none().items_center().justify_center().w(36).h(36).rounded(t.radiusM);
  if (look) el = el.bg(look.bg).text_color(look.fg);
  return el.children(optional(ctx.icon(name, { category, size: 16 })));
}

export const IconText: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const horizontal = props.layout !== "vertical";
    const { name, category } = iconProps(props.icon);
    // `iconSize` is in the schema, but genui's IconTextRenderer does not pass it on: IconTag is always "l".
    const tag = iconTag(ctx, name, category, normalizeIconVariant(props.iconVariant));
    const subtitle = text(props.subtitle);
    // TextBlockView type "text", size xs (horizontal) or sm (vertical). iconText.scss's horizontal
    // `.openui-text-block__primary` rule (body small-heavy, specificity 0,2,0) is outranked by
    // textBlock.scss's `--size-xs.--variant .primary` (0,3,0): body small for the plain subtitle
    // variant, small-heavy for the bold one. textBlock() applies those winners.
    const content = div()
      .flex()
      .flex_col()
      .min_w_0()
      .child(
        textBlock(ctx, props.bold === true ? "highlight-text-number-subtext" : "text-subtext", {
          size: horizontal ? "xs" : "sm",
          value: text(props.title),
          subtext: subtitle,
        }),
      );
    // .openui-icon-text: gap m; horizontal rows start-aligned with the tag nudged down by 3xs.
    const root = div().flex().gap(t.spaceM).items_start();
    return horizontal
      ? root
          .flex_row()
          .children(optional(tag && div().mt(t.space3xs).child(tag)))
          .child(content)
      : root.flex_col().children(optional(tag)).child(content);
  },
};

// ── IconButton ──

const ICON_BUTTON_SIZES: IconButtonSize[] = ["extra-small", "small", "medium", "large"];
const ICON_BUTTON_VARIANTS: ButtonVariant[] = ["primary", "secondary", "tertiary"];

export const IconButton: Component = {
  render(props, ctx) {
    const { name, category } = iconProps(props.icon);
    const label = text(props.name);
    return iconButton(ctx, {
      id: ctx.id("icon-btn"),
      icon: name,
      category,
      // IconWrapper's own default size: the span around it does not resize the svg.
      iconSize: 14,
      variant: ICON_BUTTON_VARIANTS.find((v) => v === props.variant) ?? "secondary",
      size: ICON_BUTTON_SIZES.find((s) => s === props.size) ?? "medium",
      shape: props.shape === "circle" ? "circle" : "square",
      disabled: ctx.streaming,
      bubble: true,
      onClick: () => {
        ctx.trigger(label, props.action);
      },
    });
  },
};

// ── MetricIndicator ──

interface Trend {
  direction?: unknown;
  value?: unknown;
}

/** components/MetricIndicator MetricIndicatorBase. */
function metricIndicator(ctx: RenderContext, props: Record<string, unknown>, inline: boolean): Element {
  const t = ctx.t;
  const value = text(props.value);
  const subtext = text(props.subtext);
  const previousValue = text(props.previousValue);
  const trend = props.trend as Trend | null | undefined;
  const positive = trend?.direction === "up";

  const line = (color: Color, font: TextStyle, str: string) => textStyle(div().text_color(color), font).child(str);
  const subtextEl = () => line(t.textNeutralSecondary, typography(t, "body", "small"), subtext).min_w_0();

  // metricIndicator.scss: __row wraps; items at the bottom (baseline when inline), gap xs (2xs inline).
  let row = div().flex().flex_row().flex_wrap().min_w_0();
  row = inline ? row.items_baseline().gap(t.space2xs) : row.items_end().gap(t.spaceXs);
  row = row.child(line(t.textNeutralPrimary, typography(t, "number", "heavy"), value));
  if (!inline && previousValue) {
    row = row.child(line(t.textNeutralSecondary, typography(t, "number", "small"), previousValue).line_through().mb(1));
  }
  if (trend) {
    row = row.child(
      line(positive ? t.textSuccessPrimary : t.textDangerPrimary, typography(t, "number", "small"), `${positive ? "+" : "-"}${text(trend.value)}%`).mb(1),
    );
  }
  if (inline && subtext) row = row.child(subtextEl());
  // The root is a column, items stretched, gap 3xs (nothing but the row sits in it when inline).
  return div()
    .flex()
    .flex_col()
    .gap(t.space3xs)
    .child(row)
    .when(!inline && subtext !== "", (el) => el.child(subtextEl()));
}

export const MetricIndicatorWithStrikethrough: Component = {
  render: (props, ctx) => metricIndicator(ctx, props, false),
};

export const MetricIndicatorInline: Component = {
  render: (props, ctx) => metricIndicator(ctx, props, true),
};
