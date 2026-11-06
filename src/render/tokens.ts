// Design tokens a host hands to a Surface. Colors are hex strings: gpui-shell
// accepts nothing else. Hosts map their own theme onto these names (the Herdr
// adapter maps herdr's theme()); missing keys fall back to DEFAULT_TOKENS.
import type { Color } from "gpui-kit";

export interface Tokens {
  /** Page background. */
  background: Color;
  /** Raised card background. */
  surface: Color;
  /** Recessed background (sunk cards, code). */
  sunk: Color;
  foreground: Color;
  muted: Color;
  dim: Color;
  border: Color;
  /** Input borders. */
  input: Color;
  accent: Color;
  accentForeground: Color;
  /** Hover wash, usually translucent. */
  hover: Color;
  selected: Color;
  success: Color;
  warning: Color;
  danger: Color;
  info: Color;
  /** Corner radius of controls, px; cards add 2. */
  radius: number;
}

export const DEFAULT_TOKENS: Tokens = {
  background: "#ffffff",
  surface: "#f6f7f9",
  sunk: "#eef0f3",
  foreground: "#1f2328",
  muted: "#59636e",
  dim: "#8c959f",
  border: "#d1d9e0",
  input: "#d1d9e0",
  accent: "#0969da",
  accentForeground: "#ffffff",
  hover: "#0000000d",
  selected: "#0969da1a",
  success: "#1a7f37",
  warning: "#9a6700",
  danger: "#d1242f",
  info: "#0969da",
  radius: 8,
};

export function resolveTokens(tokens?: Partial<Tokens>): Tokens {
  const given = Object.entries(tokens ?? {}).filter(([, v]) => v != null);
  return { ...DEFAULT_TOKENS, ...Object.fromEntries(given) };
}

/** `gap` values of OpenUI's FlexProps, in px. */
export const GAP: Record<string, number> = { none: 0, xs: 4, s: 8, m: 12, l: 16, xl: 24, "2xl": 32 };

/** Append alpha (0..1) to a #rrggbb color; other forms pass through unchanged. */
export function alpha(hex: Color, a: number): Color {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const byte = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return `${hex}${byte.toString(16).padStart(2, "0")}`;
}

/** The color of a status-like variant name (success, warning, danger/error, info; else muted). */
export function toneColor(t: Tokens, variant: string | undefined): Color {
  switch (variant) {
    case "success":
      return t.success;
    case "warning":
      return t.warning;
    case "danger":
    case "error":
    case "destructive":
      return t.danger;
    case "info":
      return t.info;
    default:
      return t.muted;
  }
}
