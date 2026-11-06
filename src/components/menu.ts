// The shared menu look: the dropdown of Select now, dropdown menus later.
//
// Ported from react-ui at the pinned commit: components/_menu.scss (`surface`,
// `item`, `label`, `separator` mixins and their variables).
//
// A menu is a rounded surface with a hairline ring, 32px rows that run edge to
// edge with a plain square highlight, a 16px content inset, and 4px of padding
// above and below the rows. The first and last row take a corner of
// (menu radius - gutter) so a highlight never pokes past the menu's corners.
//
// Where gpui differs from the scss:
// - The ring is a 1px inside border in the ring color, not a box-shadow
//   spread: gpui-shell exposes shadow presets only. Over the opaque menu
//   fill the two look alike; the menu is 2px larger in each direction.
// - The two soft layered shadows are gpui's `md` preset (the nearest to
//   `0 4px 12px -2px / 0 16px 32px -8px` at 5% and 8%).
// - color-mix(in oklch, ...) is computed here from the resolved hex tokens.
import type { Color, Element } from "gpui-kit";
import { alpha, restyle, shadow, textStyle, toHex, typography, type Tokens } from "../render/tokens.ts";

/** `$row-height`. */
export const MENU_ROW_HEIGHT = 32;

/** `$gutter`: the menu's vertical padding. */
export const menuGutter = (t: Tokens): number => t.space2xs;

/** `$inset-x`: a row's horizontal padding. */
export const menuInsetX = (t: Tokens): number => t.spaceML;

/** `$edge-row-radius`: the corner of the first and last row. */
export const menuEdgeRowRadius = (t: Tokens): number => t.radius2xl - menuGutter(t);

// ── color-mix(in oklch) ──

interface Oklch {
  l: number;
  c: number;
  h: number;
  a: number;
}

function hexToOklch(hex: Color): Oklch {
  const byte = (i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
  const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [linear(byte(0)), linear(byte(1)), linear(byte(2))];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: (h + 360) % 360, a: hex.length >= 9 ? byte(3) : 1 };
}

/**
 * `color-mix(in oklch, a, b <percent>%)`: premultiplied L and C, hue along the
 * shorter arc, an achromatic color taking the other's hue (CSS "powerless" hue).
 */
export function colorMix(a: Color, b: Color, percent: number): Color {
  const p = percent / 100;
  const x = hexToOklch(a);
  const y = hexToOklch(b);
  const alphaOut = x.a * (1 - p) + y.a * p;
  if (alphaOut === 0) return toHex("oklch(0 0 0 / 0)");
  const mix = (u: number, v: number) => (u * x.a * (1 - p) + v * y.a * p) / alphaOut;
  let hx = x.h;
  let hy = y.h;
  if (x.c < 1e-4) hx = hy;
  else if (y.c < 1e-4) hy = hx;
  let delta = hy - hx;
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;
  const h = (hx + delta * p + 360) % 360;
  const fixed = (v: number) => Math.max(0, v).toFixed(6);
  return toHex(`oklch(${fixed(mix(x.l, y.l))} ${fixed(mix(x.c, y.c))} ${h.toFixed(4)} / ${alphaOut.toFixed(4)})`);
}

/** The menu fill: `color-mix(in oklch, $foreground, $text-white 6%)`. */
export const menuBackground = (t: Tokens): Color => colorMix(t.foreground, t.textWhite, 6);

/** The ring: `$text-neutral-primary` at 6% over transparent. */
export const menuRing = (t: Tokens): Color => colorMix(t.textNeutralPrimary, "#00000000", 94);

// ── Mixins ──

/** `@mixin surface`: fill, radius, ring, shadow, vertical padding, clipped to its radius. */
export function menuSurface<E extends Element>(t: Tokens, el: E): E {
  return shadow(
    el
      .flex()
      .flex_col()
      .bg(menuBackground(t))
      .text_color(t.textNeutralPrimary)
      .rounded(t.radius2xl)
      .border_1()
      .border_color(menuRing(t))
      .overflow_hidden()
      .py(menuGutter(t)),
    "md",
  );
}

export interface MenuRowOptions {
  /** The row's own background: `$highlight` when highlighted or selected. */
  highlighted?: boolean;
  /** The menu's very first / last row: it takes the edge radius on that side. */
  first?: boolean;
  last?: boolean;
}

/** `@mixin item`: a 32px row, 16px inset, square highlight; edge rows rounded. */
export function menuRow<E extends Element>(t: Tokens, el: E, o: MenuRowOptions = {}): E {
  const edge = menuEdgeRowRadius(t);
  return el
    .flex()
    .flex_row()
    .items_center()
    .h(MENU_ROW_HEIGHT)
    .px(menuInsetX(t))
    .bg(o.highlighted ? t.highlight : "#00000000")
    .when(o.first, (e) => e.rounded_t(edge))
    .when(o.last, (e) => e.rounded_b(edge)) as E;
}

/** `@mixin label` over body default typography: padding space-s 16 space-2xs, 12px/12px text at 60% of the primary color. */
export function menuLabel<E extends Element>(t: Tokens, el: E): E {
  const style = { ...restyle(t, typography(t, "body", "default"), { size: 12 }), lineHeight: 1 };
  return textStyle(el, style)
    .pt(t.spaceS)
    .px(menuInsetX(t))
    .pb(t.space2xs)
    .text_color(alpha(t.textNeutralPrimary, 0.6 * hexToOklch(t.textNeutralPrimary).a)) as E;
}

/**
 * `@mixin separator` is only `margin: $gutter 0`; the 1px border-default line comes from
 * select.scss's `.openui-select-separator`, which a Select-like menu repeats. Both are here.
 */
export function menuSeparator<E extends Element>(t: Tokens, el: E): E {
  return el.my(menuGutter(t)).h(1).bg(t.borderDefault) as E;
}
