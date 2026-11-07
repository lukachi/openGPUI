// Inter, the way OpenUI's browser theme draws it, as static fonts gpui can load.
//
// OpenUI sets Inter as a variable font (ThemeProvider/defaultTheme.ts, cssUtils
// `typography`): a "wght" axis per style (Regular 440 light / 420 dark, Medium
// 560, headings a fixed 600/700), the optical size following the font size
// (`font-optical-sizing: auto`), and -1% tracking on everything but code.
// gpui applies none of the variable axes and has no letter spacing, so the
// Herdr mod ships static cuts at exactly the (optical size, weight) pairs that
// typography uses, with the tracking baked into the glyph advances.
// scripts/sync.ts generates the cuts from this table; `interFace` picks one.
// This module is pure data: the build scripts import it too.

/** OpenUI's `letter-spacing` for non-code text (TRACKING), in em. */
export const INTER_TRACKING_EM = -0.01;

/** Inter's content area (hhea ascent + descent, 1984 + 494 of 2048 units), in em: what CSS paints an inline box's background over. */
export const INTER_CONTENT_EM = (1984 + 494) / 2048;

/** Inter's optical-size axis; a browser clamps the font size into it. */
export const INTER_OPSZ_MIN = 14;
export const INTER_OPSZ_MAX = 32;

/**
 * Optical size → weights. Text styles are 12–18px in Regular and Medium;
 * headings 16–28px at 600 and 32px at 600/700 (cssUtils `$typography`).
 */
export const INTER_CUTS: Readonly<Record<number, readonly number[]>> = {
  14: [420, 440, 560],
  16: [420, 440, 560, 600],
  18: [420, 440, 560, 600],
  24: [600],
  28: [600],
  32: [600, 700],
};

/**
 * Italic cuts, from Inter's italic variable font: body text in `em` and in
 * blockquotes (`font-style: italic`), and the 16–18px headings a blockquote
 * slants. They share the upright cut's family, so `.italic()` picks them.
 */
export const INTER_ITALIC_CUTS: Readonly<Record<number, readonly number[]>> = {
  14: [420, 440, 560],
  16: [420, 440, 560, 600],
  18: [420, 440, 560, 600],
};

/** The family name a cut is installed under. Never plain "Inter": that may be installed already. */
export function interFamily(opsz: number): string {
  return `OpenGPUI Inter ${opsz}`;
}

export interface Face {
  family: string;
  weight: number;
}

const CUTS = Object.entries(INTER_CUTS).map(([opsz, weights]) => ({ opsz: Number(opsz), weights }));

function nearest<T>(items: readonly T[], distance: (item: T) => number): T {
  return items.reduce((best, item) => (distance(item) < distance(best) ? item : best));
}

/**
 * The cut closest to what a browser draws for Inter at `size` px and `weight`:
 * the requested weight at the nearest optical size that has it, else the
 * nearest weight at the nearest optical size.
 */
export function interFace(size: number, weight: number): Face {
  const opsz = Math.min(INTER_OPSZ_MAX, Math.max(INTER_OPSZ_MIN, size));
  const withWeight = CUTS.filter((cut) => cut.weights.includes(weight));
  const cut = nearest(withWeight.length ? withWeight : CUTS, (c) => Math.abs(c.opsz - opsz));
  return { family: interFamily(cut.opsz), weight: nearest(cut.weights, (w) => Math.abs(w - weight)) };
}

/**
 * A host's choice of face for a CSS font stack at `size` px and `weight`, or
 * null to keep the host's own font (what a host without these fonts does).
 */
export type FontResolver = (families: readonly string[], size: number, weight: number) => Face | null;

/**
 * Resolve like a browser walking the stack: the first family the host has
 * wins. "Inter" means the shipped cuts; `has` answers for every other name.
 * The generic `monospace` is Menlo, the browser default on macOS.
 */
export function openuiFonts(has: (family: string) => boolean): FontResolver {
  const inter = has(interFamily(INTER_OPSZ_MIN));
  return (families, size, weight) => {
    for (const family of families) {
      if (family === "Inter") {
        if (inter) return interFace(size, weight);
      } else if (family === "monospace") {
        return { family: "Menlo", weight };
      } else if (has(family)) {
        return { family, weight };
      }
    }
    return null;
  };
}
