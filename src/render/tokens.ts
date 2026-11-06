// OpenUI's design tokens, resolved for gpui.
//
// Values come from react-ui's ThemeProvider/defaultTheme.ts at the pinned commit
// (oklch colors, a 2px spacing/radius grid, compound typography, shadows), and
// keep their upstream names, so a port reads the component's scss directly:
// `cssUtils.$space-s` is `t.spaceS`, `$text-neutral-secondary` is
// `t.textNeutralSecondary`, `typography(body, small)` is `typography(t, "body", "small")`.
//
// gpui-shell needs plain values: colors become #rrggbbaa, lengths px numbers,
// typography { size, lineHeight, weight, families }. Inter's "wght" axis
// becomes the weight; the optical size and -1% tracking live in the static
// cuts a host ships (render/fonts.ts) and picks through `Tokens.fonts`. What
// gpui cannot express is mapped to the nearest it can: custom box shadows
// become gpui's shadow presets (see README "Where gpui differs").
import type { Color, Element } from "gpui-kit";
import { defaultDarkTheme, defaultLightTheme } from "openui-theme";
import type { ChartPaletteKey, ColorTheme, EffectTheme, LayoutTheme, Theme, TypographyTheme } from "openui-theme-types";
import type { FontResolver } from "./fonts.ts";

export type Mode = "light" | "dark";

export interface TextStyle {
  /** px */
  size: number;
  /** multiplier of size */
  lineHeight: number;
  /** CSS weight, or the "wght" axis value where upstream sets one. */
  weight: number;
  /** The CSS font stack, e.g. ["Inter", "sans-serif"]. */
  families: readonly string[];
  /** The gpui family the host resolved the stack to; unset keeps the host's font. */
  face?: string;
}

/** gpui's box-shadow presets; OpenUI's shadows map to the nearest. */
export type ShadowPreset = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/** Color keys with defaults upstream (borderAccentSelected has none). */
export type ColorKey = Exclude<keyof ColorTheme, ChartPaletteKey | "borderAccentSelected">;

type TypographyValue<K> = K extends
  | `${string}LetterSpacing`
  | `letterSpacing${string}`
  | `fontVariation${string}`
  | `font${"Body" | "Code" | "Heading" | "Label" | "Numbers"}`
  ? string
  : K extends `text${string}`
    ? TextStyle
    : number;

export type Tokens = { mode: Mode; fonts?: FontResolver } & { [K in ColorKey]-?: Color } & {
  [K in keyof LayoutTheme]-?: number;
} & {
  [K in keyof TypographyTheme]-?: TypographyValue<K>;
} & { [K in keyof EffectTheme]-?: ShadowPreset };

// ── Conversions ──

/** oklch(L C H / A) → #rrggbbaa (sRGB, clamped). Hex passes through. */
export function toHex(value: string): Color {
  if (value.startsWith("#")) return value as Color;
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/.exec(value.trim());
  if (!m) throw new Error(`not an oklch color: ${value}`);
  const [L, C, H, A] = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const byte = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0");
  const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  return `#${linear.map((x) => byte(gamma(x))).join("")}${byte(A)}`;
}

const hexByte = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0");

/**
 * A CSS color as gpui takes it: hex (3/4/6/8 digits), rgb()/rgba(), hsl()/hsla(),
 * oklch() or `transparent`. Null for anything else (keywords such as `inherit`).
 */
export function cssColor(value: string): Color | null {
  const v = value.trim().toLowerCase();
  if (v === "transparent") return "#00000000";
  if (v.startsWith("oklch(")) return toHex(v);
  const hex = /^#([0-9a-f]{3,8})$/.exec(v)?.[1];
  if (hex) {
    if (hex.length === 3 || hex.length === 4) return `#${[...hex].map((c) => c + c).join("")}`;
    if (hex.length === 6 || hex.length === 8) return `#${hex}`;
    return null;
  }
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
  if (!fn) return null;
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const num = (p: string, scale: number) => (p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p));
  const a = parts[3] === undefined ? 1 : num(parts[3], 1);
  if (fn[1]!.startsWith("rgb")) {
    return `#${hexByte(num(parts[0]!, 255))}${hexByte(num(parts[1]!, 255))}${hexByte(num(parts[2]!, 255))}${hexByte(a * 255)}`;
  }
  // hsl: saturation and lightness are percentages, with or without the sign.
  const h = (((parseFloat(parts[0]!) % 360) + 360) % 360) / 360;
  const s = parseFloat(parts[1]!) / 100;
  const l = parseFloat(parts[2]!) / 100;
  const k = (n: number) => (n + h * 12) % 12;
  const f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${hexByte(f(0) * 255)}${hexByte(f(8) * 255)}${hexByte(f(4) * 255)}${hexByte(a * 255)}`;
}

/** "500 14px/1.5 \"Inter\", sans-serif" → TextStyle. */
function toTextStyle(font: string): TextStyle {
  const m = /^(\d+)\s+([\d.]+)px\/([\d.]+)\s+(.+)$/.exec(font.trim());
  if (!m) throw new Error(`not a font shorthand: ${font}`);
  const families = m[4]!.split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));
  return { weight: Number(m[1]), size: Number(m[2]), lineHeight: Number(m[3]), families };
}

const SHADOWS: Record<keyof EffectTheme, ShadowPreset> = {
  shadow0: "none",
  shadowS: "xs",
  shadowM: "sm",
  shadowL: "md",
  shadowXl: "lg",
  shadow2xl: "xl",
  shadow3xl: "2xl",
};

function resolve(theme: Theme, mode: Mode): Tokens {
  const out: Record<string, unknown> = { mode };
  for (const [key, raw] of Object.entries(theme)) {
    if (typeof raw !== "string") continue; // chart palettes (string[]) have no defaults
    if (key in SHADOWS) out[key] = SHADOWS[key as keyof EffectTheme];
    else if (raw.startsWith("oklch(") || raw.startsWith("#")) out[key] = toHex(raw);
    else if (/^text[A-Z]/.test(key) && !key.endsWith("LetterSpacing")) out[key] = toTextStyle(raw);
    else if (/^(space|radius|fontSize|fontWeight|lineHeight)/.test(key)) out[key] = parseFloat(raw) || 0;
    else out[key] = raw;
  }
  return out as Tokens;
}

const RESOLVED = { light: resolve(defaultLightTheme, "light"), dark: resolve(defaultDarkTheme, "dark") };

/** OpenUI's default tokens for `mode`, with `overrides` (e.g. a host's colors) on top. */
export function resolveTokens(mode: Mode = "light", overrides: Partial<Tokens> = {}): Tokens {
  const given = Object.entries(overrides).filter(([, v]) => v != null);
  return { ...RESOLVED[mode], ...Object.fromEntries(given), mode };
}

/** Append alpha (0..1) to a #rrggbb or #rrggbbaa color, like upstream's withAlpha. */
export function alpha(hex: Color, a: number): Color {
  const rgb = hex.slice(0, 7);
  return `${rgb}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0")}` as Color;
}

// ── Styles ──

/**
 * react-ui cssUtils `$typography` map: group → variant → [token, "wght" axis].
 * The axis is the theme's Regular or Medium variation; null keeps the
 * shorthand's fixed weight (headings, code), as in the scss.
 */
const TYPOGRAPHY = {
  body: {
    default: ["textBodyDefault", "regular"],
    heavy: ["textBodyDefaultHeavy", "medium"],
    small: ["textBodySm", "regular"],
    "small-heavy": ["textBodySmHeavy", "medium"],
    large: ["textBodyLg", "regular"],
    "large-heavy": ["textBodyLgHeavy", "medium"],
    link: ["textBodyDefault", "regular"],
    medium: ["textBodyDefault", "regular"],
  },
  label: {
    default: ["textLabelDefault", "regular"],
    heavy: ["textLabelDefaultHeavy", "medium"],
    large: ["textLabelLg", "regular"],
    "large-heavy": ["textLabelLgHeavy", "medium"],
    medium: ["textLabelDefault", "regular"],
    "medium-heavy": ["textLabelDefaultHeavy", "medium"],
    small: ["textLabelSm", "regular"],
    "small-heavy": ["textLabelSmHeavy", "medium"],
    "extra-small": ["textLabelXs", "regular"],
    "extra-small-heavy": ["textLabelXsHeavy", "medium"],
    "2-extra-small": ["textLabelXs", "regular"],
    "2-extra-small-heavy": ["textLabelXsHeavy", "medium"],
  },
  heading: {
    xl: ["textHeadingXl", null],
    large: ["textHeadingLg", null],
    medium: ["textHeadingMd", null],
    small: ["textHeadingSm", null],
    "extra-small": ["textHeadingXs", null],
  },
  number: {
    large: ["textNumbersLg", "regular"],
    "large-heavy": ["textNumbersLgHeavy", "medium"],
    heavy: ["textNumbersDefaultHeavy", "medium"],
    default: ["textNumbersDefault", "regular"],
    small: ["textNumbersSm", "regular"],
    "small-heavy": ["textNumbersSmHeavy", "medium"],
    "extra-small": ["textNumbersXs", "regular"],
    "extra-small-heavy": ["textNumbersXsHeavy", "medium"],
    heading: ["textNumbersHeadingLg", null],
    "heading-small": ["textNumbersHeadingSm", null],
    "heading-medium": ["textNumbersHeadingMd", null],
    title: ["textNumbersHeadingLg", null],
    "title-medium": ["textNumbersHeadingMd", null],
    "heading-large": ["textNumbersHeadingLg", null],
    "heading-xl": ["textNumbersHeadingXl", null],
  },
  code: {
    default: ["textCodeDefault", null],
    heavy: ["textCodeDefaultHeavy", null],
    small: ["textCodeSm", null],
    "small-heavy": ["textCodeSmHeavy", null],
  },
} as const satisfies Record<string, Record<string, readonly [keyof Tokens, "regular" | "medium" | null]>>;

export type TypographyGroup = keyof typeof TYPOGRAPHY;
export type TypographyVariant<G extends TypographyGroup> = keyof (typeof TYPOGRAPHY)[G];

/** `"wght" 440` → 440. */
function axis(variation: string): number {
  const m = /"wght"\s+([\d.]+)/.exec(variation);
  if (!m) throw new Error(`not a wght variation: ${variation}`);
  return Number(m[1]);
}

/** The text style scss `@include typography(group, variant)` applies, in the host's face. */
export function typography<G extends TypographyGroup>(t: Tokens, group: G, variant: TypographyVariant<G>): TextStyle {
  const [key, variation] = (TYPOGRAPHY[group] as Record<PropertyKey, readonly [keyof Tokens, "regular" | "medium" | null]>)[variant]!;
  const base = t[key] as TextStyle;
  const weight =
    variation === "regular" ? axis(t.fontVariationRegular) : variation === "medium" ? axis(t.fontVariationMedium) : base.weight;
  const face = t.fonts?.(base.families, base.size, weight);
  return face ? { ...base, weight: face.weight, face: face.family } : { ...base, weight };
}

/** Apply a text style; its face, when the host resolved one. */
export function textStyle<E extends Element>(el: E, style: TextStyle): E {
  const sized = el.text_size(style.size).line_height(style.lineHeight).font_weight(style.weight);
  return style.face ? sized.font_family(style.face) : sized;
}

/** `style` at another size or weight, its face resolved again (a variable axis or `font-size: smaller`). */
export function restyle(t: Tokens, style: TextStyle, patch: { size?: number; weight?: number }): TextStyle {
  const size = patch.size ?? style.size;
  const weight = patch.weight ?? style.weight;
  const face = t.fonts?.(style.families, size, weight);
  return face ? { ...style, size, weight: face.weight, face: face.family } : { ...style, size, weight, face: undefined };
}

/** Apply one of gpui's shadow presets. */
export function shadow<E extends Element>(el: E, preset: ShadowPreset): E {
  switch (preset) {
    case "xs":
      return el.shadow_xs();
    case "sm":
      return el.shadow_sm();
    case "md":
      return el.shadow_md();
    case "lg":
      return el.shadow_lg();
    case "xl":
      return el.shadow_xl();
    case "2xl":
      return el.shadow_2xl();
    default:
      return el.shadow_none();
  }
}

export const TRANSPARENT: Color = "#00000000";
