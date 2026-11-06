// Measured text widths, per face and size: the part of charts/measure.ts that
// needs no gpui, so `bun test` can exercise it.

/** Widths drawn in one face at one size. */
export interface FontWidths {
  /** One character's advance (measured as the character repeated). */
  chars: Map<string, number>;
  /** Whole strings measured exactly. */
  strings: Map<string, number>;
}

/** Whole strings kept per font before the oldest are dropped (characters are kept). */
export const MAX_STRINGS = 2000;

const caches = new Map<string, FontWidths>();
let version = 0;

/** Bumps whenever a width is recorded: a layout keyed on it reruns with the new widths. */
export function widthsVersion(): number {
  return version;
}

export function fontWidths(key: string): FontWidths {
  let widths = caches.get(key);
  if (!widths) caches.set(key, (widths = { chars: new Map(), strings: new Map() }));
  return widths;
}

export function recordString(widths: FontWidths, text: string, width: number): void {
  if (widths.strings.get(text) === width) return;
  if (widths.strings.size >= MAX_STRINGS) {
    // Maps iterate in insertion order: drop the oldest.
    const oldest = widths.strings.keys().next().value;
    if (oldest !== undefined) widths.strings.delete(oldest);
  }
  widths.strings.set(text, width);
  version++;
}

export function recordChar(widths: FontWidths, ch: string, width: number): void {
  if (widths.chars.get(ch) === width) return;
  widths.chars.set(ch, width);
  version++;
}

/**
 * The width of `text`: exact when the string was measured whole, else the sum
 * of its characters' advances (kerning between them is lost), `fallback` for a
 * character not measured yet.
 */
export function textWidth(widths: FontWidths, text: string, fallback: number): number {
  const exact = widths.strings.get(text);
  if (exact !== undefined) return exact;
  let sum = 0;
  for (const ch of text) sum += widths.chars.get(ch) ?? fallback;
  return sum;
}

/** An element-id-safe key for `text`: ASCII letters and digits as is, anything else `_<code point base 36>_`. */
export function probeId(text: string): string {
  let out = "";
  for (const ch of text) out += /[A-Za-z0-9]/.test(ch) ? ch : `_${ch.codePointAt(0)!.toString(36)}_`;
  return out;
}
