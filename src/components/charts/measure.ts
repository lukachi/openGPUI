// Text measurement for chart layout.
//
// react-ui sizes axes, label bands and legends with a canvas 2D context's
// `measureText` in the tick font (`hooks/core/useCanvasContextForLabelSize`).
// gpui has no text measurement a script can call, so widths come from the
// drawn text itself: a chart renders invisible probes in the same style, each
// reports its width through `on_size_change`, and the next frame lays out
// with them. Whole strings the chart knows it needs (labels, tick values,
// legend entries) are probed exactly; any other string (a truncation
// candidate, a wrapped line) is the sum of its characters' advances, each
// probed once as the character repeated eight times. Widths are cached per
// face and size for the life of the host (charts/widths.ts), so later charts
// lay out at once.
//
// A chart may lay out as soon as every character is known (`charsReady`): a
// string not probed whole yet measures as its character sum until its probe
// lands, which bumps `widthsVersion()` and refines the layout. Only a chart
// meeting characters no chart has measured draws one frame without its plot.
import { div, type Element } from "gpui-kit";
import type { RenderContext } from "../../render/surface.ts";
import { textStyle, type TextStyle } from "../../render/tokens.ts";
import { fontWidths, probeId, recordChar, recordString, textWidth, type FontWidths } from "./widths.ts";

/** What upstream's label helpers take in place of a CanvasRenderingContext2D. */
export interface TextMeasure {
  /** CSS font shorthand, for `parseLineHeight`. */
  font: string;
  measureText(text: string): { width: number };
}

const CHAR_REPEAT = 8;

/**
 * Widths of text in one style, measured by the host. Call `want()` with every
 * string the layout will measure, lay out once `charsReady`, pass `ctx` to
 * upstream helpers, and put `probes()` in the tree.
 */
export class Measurer {
  readonly ctx: TextMeasure;
  private readonly widths: FontWidths;
  private readonly missingStrings = new Set<string>();
  private readonly missingChars = new Set<string>();

  constructor(
    private readonly rc: RenderContext,
    readonly style: TextStyle,
    private readonly part = "measure",
  ) {
    this.widths = fontWidths(`${style.face ?? style.families.join(",")}|${style.size}|${style.weight}`);
    this.ctx = {
      font: `${style.weight} ${style.size}px/${style.lineHeight} ${style.families.join(", ")}`,
      measureText: (text: string) => ({ width: this.width(text) }),
    };
    // Upstream truncates with "…" and wraps at spaces.
    this.want(["…", " "]);
  }

  /** Strings the layout will measure: probed whole, and character by character. */
  want(texts: Iterable<string>): this {
    for (const text of texts) {
      if (!text) continue;
      if (!this.widths.strings.has(text)) this.missingStrings.add(text);
      for (const ch of text) if (!this.widths.chars.has(ch)) this.missingChars.add(ch);
    }
    return this;
  }

  /** Every wanted character has been measured: layout is possible. */
  get charsReady(): boolean {
    return this.missingChars.size === 0;
  }

  width(text: string): number {
    return textWidth(this.widths, text, this.style.size * 0.55);
  }

  /** Line height in px, as upstream's `parseLineHeight` derives it from the font. */
  get lineHeight(): number {
    return Math.ceil(this.style.size * this.style.lineHeight);
  }

  /** Invisible probes for what is not measured yet; null when nothing is missing. */
  probes(): Element | null {
    if (this.missingStrings.size === 0 && this.missingChars.size === 0) return null;
    const widths = this.widths;
    const probe = (key: string, text: string, store: (w: number) => void) =>
      textStyle(div(), this.style)
        .id(this.rc.id(`${this.part}-${key}`))
        .flex_none()
        .whitespace_nowrap()
        .on_size_change((size, cx) => {
          store(size.width);
          cx.notify();
        })
        .child(text);
    return div()
      .absolute()
      .top(0)
      .left(0)
      .opacity(0)
      .flex()
      .flex_col()
      .items_start()
      .children([
        ...[...this.missingStrings].map((s) => probe(`s${probeId(s)}`, s, (w) => recordString(widths, s, w))),
        // A space probes as no-break space, so it is never collapsed.
        ...[...this.missingChars].map((c) =>
          probe(`c${probeId(c)}`, (c === " " ? "\u00a0" : c).repeat(CHAR_REPEAT), (w) => recordChar(widths, c, w / CHAR_REPEAT)),
        ),
      ]);
  }
}
