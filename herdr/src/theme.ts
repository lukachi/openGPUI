// OpenUI tokens for a Herdr pane.
//
// "openui": OpenUI's own light/dark theme, as its React renderer draws it.
// "herdr":  the same tokens with colors taken from the Herdr theme, computed with
//           upstream's own formulas (ThemeProvider/defaultTheme.ts createColorTheme):
//           text tints and overlays are the theme's foreground at upstream's
//           alphas; semantic colors come from the terminal palette. Spacing,
//           radii, typography and shadows stay OpenUI's.
// Both draw text in the Inter cuts the mod ships (mods/opengpui/fonts) once
// Herdr has loaded them; until then, in Herdr's UI font.
import type { Color } from "gpui-kit";
import { fonts, settings, theme } from "herdr";
import { alpha, openuiFonts, resolveTokens, type Tokens } from "../../src/index.ts";

export type Look = "herdr" | "openui";

const isHex = (v: unknown): v is Color => typeof v === "string" && v.startsWith("#");

/** The tokens last made, and what they were made from. */
let last: { key: string; tokens: Tokens } | null = null;

/**
 * The tokens for `look` in Herdr's current settings, theme and fonts. The same object while
 * none of those changed, so a host can hand them to Surface.setTokens on every render: new
 * tokens redraw every view (and a font resolver, being a function, never compares equal).
 */
export function herdrTokens(look: Look): Tokens {
  const dark = settings().dark;
  const installed = fonts();
  const h = look === "herdr" ? theme() : null;
  const key = JSON.stringify([look, dark, installed, h]);
  if (last?.key !== key) last = { key, tokens: makeTokens(look, dark === false ? "light" : "dark", new Set(installed), h) };
  return last.tokens;
}

function makeTokens(look: Look, mode: "light" | "dark", installed: Set<string>, h: ReturnType<typeof theme> | null): Tokens {
  const base = { fonts: openuiFonts((family) => installed.has(family)) };
  if (look === "openui" || !h) return resolveTokens(mode, base);
  const pick = (...names: string[]): Color | undefined => names.map((n) => h[n]).find(isHex);
  const fg = pick("foreground");
  const bg = pick("background");
  if (!fg || !bg) return resolveTokens(mode, base);
  const dark = mode === "dark";
  const brand = pick("accent") ?? fg;
  const info = pick("ansi4") ?? brand;
  const success = pick("ansi2") ?? fg;
  const alert = pick("ansi3") ?? fg;
  const danger = pick("ansi1") ?? fg;
  const purple = pick("ansi5") ?? brand;
  const pink = pick("ansi13", "ansi5") ?? brand;
  return resolveTokens(mode, {
    ...base,
    // Surface
    background: bg,
    foreground: pick("surface", "raised") ?? bg,
    popoverBackground: pick("popover", "surface") ?? bg,
    sunkLight: alpha(fg, 0.02),
    sunk: alpha(fg, 0.04),
    sunkDeep: alpha(fg, 0.08),
    elevatedLight: alpha(fg, 0.04),
    elevated: alpha(fg, 0.08),
    elevatedStrong: alpha(fg, 0.16),
    elevatedIntense: alpha(fg, 0.32),
    highlightSubtle: alpha(fg, 0.02),
    highlight: alpha(fg, 0.04),
    highlightStrong: alpha(fg, 0.08),
    highlightIntense: alpha(fg, dark ? 0.3 : 0.32),
    invertedBackground: fg,
    infoBackground: alpha(info, 0.12),
    successBackground: alpha(success, 0.12),
    alertBackground: alpha(alert, 0.16),
    dangerBackground: alpha(danger, 0.12),
    purpleBackground: alpha(purple, 0.12),
    pinkBackground: alpha(pink, 0.12),
    // Text
    textNeutralPrimary: fg,
    textNeutralSecondary: alpha(fg, 0.6),
    textNeutralTertiary: alpha(fg, 0.2),
    textNeutralLink: fg,
    textBrand: brand,
    textAccentPrimary: pick("accent_foreground") ?? bg,
    textAccentSecondary: alpha(pick("accent_foreground") ?? bg, 0.5),
    textAccentTertiary: alpha(pick("accent_foreground") ?? bg, 0.2),
    textSuccessPrimary: success,
    textAlertPrimary: alert,
    textDangerPrimary: danger,
    textDangerSecondary: alpha(danger, 0.8),
    textDangerTertiary: alpha(danger, 0.5),
    textInfoPrimary: info,
    textPinkPrimary: pink,
    textPurplePrimary: purple,
    // Interactive
    interactiveAccentDefault: brand,
    interactiveAccentHover: alpha(brand, 0.8),
    interactiveAccentDisabled: alpha(brand, 0.4),
    interactiveAccentPressed: brand,
    interactiveDestructiveDefault: alpha(danger, 0.02),
    interactiveDestructiveHover: alpha(danger, 0.08),
    interactiveDestructiveDisabled: alpha(danger, 0.02),
    interactiveDestructivePressed: alpha(danger, 0.1),
    interactiveDestructiveAccentDefault: danger,
    interactiveDestructiveAccentHover: alpha(danger, 0.9),
    interactiveDestructiveAccentPressed: danger,
    interactiveDestructiveAccentDisabled: alpha(danger, 0.4),
    // Border
    borderDefault: alpha(fg, 0.06),
    borderInteractive: alpha(fg, 0.12),
    borderInteractiveEmphasis: alpha(fg, dark ? 0.4 : 0.3),
    borderInteractiveSelected: fg,
    borderAccent: alpha(brand, dark ? 0.2 : 0.08),
    borderAccentEmphasis: alpha(brand, dark ? 0.4 : 0.3),
    borderInfo: alpha(info, 0.08),
    borderInfoEmphasis: info,
    borderAlert: alpha(alert, 0.08),
    borderAlertEmphasis: alert,
    borderSuccess: alpha(success, 0.08),
    borderSuccessEmphasis: success,
    borderDanger: alpha(danger, 0.08),
    borderDangerEmphasis: danger,
  });
}
