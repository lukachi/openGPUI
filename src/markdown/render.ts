// Markdown drawn the way react-ui's renderers style it.
//
// Ported from react-ui at the pinned commit:
//   components/MarkDownRenderer/{MarkDownRenderer.tsx,markDownRenderer.scss}
//   components/TextContentWrapper/textContentWrapper.scss (TextContent's extra rules)
//   components/InlineMarkdownRenderer/{InlineMarkdownRenderer.tsx,inlineMarkdownRenderer.scss}
//   components/Citation/TextContentCitation.tsx, components/Table/* (markdown tables)
//
// The tree is react-markdown's (parse.ts). Each element takes the scss rules
// for its tag, and what it doesn't set it inherits, as CSS does. OpenUI's docs
// install react-ui next to Tailwind, whose preflight zeroes every block margin
// and draws `hr` as a 1px rule in the text color: the margins below are the
// scss's on top of that. Sibling margins collapse to the larger, and a block's
// first and last children hand theirs out through blocks with no padding or
// border at that edge.
//
// gpui has no inline formatting context, so a run of inline content becomes a
// wrapping row of words: each word (with the space after it) is one element in
// its own style, and pieces of a word in different styles stay together.
// Lines therefore break at spaces only, as CSS does by default; a trailing
// space can push a word to the next line one space earlier than a browser.
// Text in these rows cannot be selected.
//
// Citations (`[1]`) render nothing, as TextContentCitation does without a
// CardSourceProvider. Images show their alt text: gpui loads only local files.
// Math stays TeX in a code block, which is what upstream shows until KaTeX loads.
//
// gpui-shell interrupts a long JS call (budget.ts): a text not parsed yet draws as
// its plain source text until a task has parsed it. A long block (blocks.ts
// virtualDecision) is drawn through gpui-kit's lazy `list` (virtualBlock): one row
// per top-level piece, a long list's items, a long fence's line groups and a long
// table's row groups, built only while on screen. The list is a scroll region as
// tall as the host's viewport, with its own scrollbar; the wheel scrolls the region
// and passes to the page at the region's ends. A row allows no handlers, so there
// links are gpui-base Links (only the word under the pointer underlines), code blocks
// have no copy button, and tables take column widths measured by a hidden, handled
// draw (of a long table, its first rows; its other rows' widths are estimated from
// their text). A fence or table cut into groups scrolls sideways one group at a time.
// A row whose source still passes ROW_CHARS (one huge paragraph or item) draws as
// its plain text. Past the per-render ceiling, a block too short to go virtual draws
// as its plain source text (blocks.ts RENDER_CHARS).
import type { ElementContent, Element as HastElement, Root, RootContent } from "hast";
import { div, type Color, type Element } from "gpui-kit";
import { Link } from "gpui-base";
import { tableText, tableView, type StaticTable, type TableCell } from "../components/tables.ts";
import type { RenderContext } from "../render/surface.ts";
import { alpha, restyle, textStyle, typography, type TextStyle } from "../render/tokens.ts";
import {
  BLOCK,
  blockItems,
  codeBlockLanguage,
  isElement,
  listItems,
  rowChars,
  tableRows,
  textOf,
  virtualRows,
  type BlockItem,
  type VirtualRow,
} from "./blocks.ts";
import { codeBlock } from "./code.ts";
import { blockDraw, markdownTree } from "./budget.ts";
import { edge, lazyRows } from "./lazy.ts";
import type { MarkdownProfile } from "./parse.ts";

/** What a run of text is drawn with: the inherited CSS that matters here. */
interface Css {
  font: TextStyle;
  color: Color;
  italic: boolean;
  strike: boolean;
  link: { key: string; href: string } | null;
  /** Inside a blockquote, whose `*` rule inherits color, font-style and line-height. */
  quote: boolean;
  lineHeight?: number;
}

interface Scope {
  /** A descendant of li/ul/ol: `li :last-child`, `ul :last-child` drop the last child's bottom margin. */
  inList: boolean;
  /** A descendant of li: `li ul`, `li ol`, `li li` get an 8px top margin. */
  inLi: boolean;
}

interface Laid {
  el: Element;
  mt: number;
  mb: number;
}

type Piece =
  | { kind: "text"; text: string; css: Css }
  | { kind: "atom"; el: Element }
  | { kind: "break"; css: Css }
  | { kind: "block"; el: Element };

/** Set when the pieces are drawn in a lazy list's row; `unmeasured` is told when a table there lacks its column widths. */
interface Row {
  unmeasured: () => void;
}

const HEADING = /^h[1-6]$/;
const QUOTES = [
  ["\u201C", "\u201D"],
  ["\u2018", "\u2019"],
] as const;
const WEB = /^https?:\/\//i;
/** The scope of a block's top-level children. */
const TOP: Scope = { inList: false, inLi: false };

/** li::marker: a disc, or the item's number counted from the list's `start`. */
const listMarker = (node: HastElement, index: number) => (node.tagName === "ol" ? `${Number(node.properties.start ?? 1) + index}.\u00a0` : "\u2022\u00a0");

class Markdown {
  private n = 0;
  private quoteDepth = 0;
  private readonly hover: { link: string | null };

  constructor(
    private readonly ctx: RenderContext,
    private readonly part: string,
    private readonly profile: MarkdownProfile,
    /** `--openui-text-body-default` in this renderer: TextContent's size points it elsewhere. */
    private readonly body: TextStyle,
    /** Drawn in a lazy list's row: no handlers (virtualBlock). */
    private readonly row: Row | null = null,
  ) {
    this.hover = ctx.local<{ link: string | null }>({ link: null }, `${part}-hover`);
  }

  private get t() {
    return this.ctx.t;
  }

  private key(prefix: string): string {
    return `${this.part}-${prefix}${this.n++}`;
  }

  // ── Blocks ──

  /** A column of block children, spaced by collapsed margins. */
  blocks(nodes: ElementContent[], css: Css, scope: Scope, marks?: { open?: string; close?: string }): { els: Element[]; mt: number; mb: number } {
    const items = blockItems(nodes);
    const laid = items.map((it, i) =>
      this.item(it, css, scope, { open: i === 0 ? marks?.open : undefined, close: i === items.length - 1 ? marks?.close : undefined }),
    );
    const els = laid.map((b, i) => {
      const gap = i === 0 ? 0 : Math.max(laid[i - 1]!.mb, b.mt);
      return gap > 0 ? b.el.mt(gap) : b.el;
    });
    return { els, mt: laid[0]?.mt ?? 0, mb: laid.at(-1)?.mb ?? 0 };
  }

  /** One piece of a column (blocks.ts blockItems) with its own margins, before they collapse with its neighbours'. */
  item(it: BlockItem, css: Css, scope: Scope, marks: { open?: string; close?: string } = {}): Laid {
    if (it.kind === "inline") return { el: this.flow(it.nodes, css, marks), mt: 0, mb: 0 };
    return this.block(it.node, css, scope, { next: it.next, last: it.last, ...marks });
  }

  private column(els: Element[]): Element {
    return div().w_full().flex().flex_col().children(els);
  }

  private block(
    node: HastElement,
    css: Css,
    scope: Scope,
    at: { next?: string; last: boolean; open?: string; close?: string },
  ): Laid {
    const t = this.t;
    const tag = node.tagName;
    const content = this.profile === "content";
    const own = (mt: number, mb: number): { mt: number; mb: number } => ({ mt, mb: scope.inList && at.last ? 0 : mb });
    // A p, li or heading's font shorthand resets font-style; blockquote's `*` rule inherits it back.
    const reset = (font: TextStyle, color: Color = t.textNeutralPrimary): Css => ({
      ...css,
      font,
      color: css.quote ? css.color : color,
      italic: css.quote ? css.italic : false,
    });

    if (tag === "p") {
      const mb = at.next === "p" ? 18 : content && (at.next === "ol" || at.next === "ul") ? 8 : 0;
      return { el: this.flow(node.children, reset(this.body), at), ...own(0, mb) };
    }
    if (HEADING.test(tag)) {
      const mb = at.next === "p" ? 8 : 18;
      return { el: this.flow(node.children, reset(typography(t, "heading", "extra-small")), at), ...own(0, mb) };
    }
    if (tag === "ul" || tag === "ol") {
      const list = this.list(node, reset(this.body), scope);
      return { el: list.el, ...own(Math.max(scope.inLi ? 8 : 0, list.mt), Math.max(tag === "ul" ? 24 : 20, list.mb)) };
    }
    if (tag === "pre") {
      const code = node.children.find(isElement);
      const language = code?.tagName === "code" ? codeBlockLanguage(code) : null;
      if (code && language !== null) {
        // The highlighter's `margin-top: 8px !important` collapses out through the wrapper and pre.
        const el = codeBlock(this.ctx, this.key("code"), textOf(code).trim(), language, css.font.size, { static: !!this.row });
        return { el, ...own(8, 0) };
      }
      return { el: this.flow(node.children, css, at), ...own(0, 0) };
    }
    if (tag === "blockquote") {
      const depth = this.quoteDepth++;
      const [open, close] = QUOTES[Math.min(depth, 1)]!;
      const inner = this.blocks(node.children, { ...css, italic: true, quote: true, lineHeight: 1.625 }, scope, { open, close });
      this.quoteDepth--;
      // border-left: 4px color-mix(text-neutral-primary 70%, transparent); padding-left 16px.
      const rule = alpha(t.textNeutralPrimary, (parseInt(t.textNeutralPrimary.slice(7, 9) || "ff", 16) / 255) * 0.7);
      const el = div().w_full().flex().flex_col().border_l(4).border_color(rule).pl(16).text_color(css.color).children(inner.els);
      return { el, ...own(Math.max(25, inner.mt), Math.max(25, inner.mb)) };
    }
    if (tag === "hr") {
      // Preflight: height 0, a 1px top border in the text color.
      return { el: div().w_full().border_t_1().border_color(css.color), ...own(48, 48) };
    }
    if (tag === "table") {
      return { el: this.table(node), ...own(0, 20) };
    }
    if (tag === "li") {
      const item = this.listItem(node, css, scope, "");
      return { el: item.el, ...own(item.mt, item.mb) };
    }
    // section, div and anything else: a box around its children.
    const inner = this.blocks(node.children, css, scope);
    return { el: this.column(inner.els), ...own(inner.mt, inner.mb) };
  }

  /** ul/ol: 20px padding-left, disc or decimal markers in body text, neutral secondary. */
  private list(node: HastElement, css: Css, scope: Scope): { el: Element; mt: number; mb: number } {
    const items = listItems(node);
    const laid = items.map((li, i) => {
      const marker = listMarker(node, i);
      const item = this.listItem(li, css, { inList: true, inLi: scope.inLi }, marker);
      // li: margin-bottom 8 (none for the last child), `li li` margin-top 8.
      return { el: item.el, mt: Math.max(scope.inLi ? 8 : 0, item.mt), mb: i === items.length - 1 ? 0 : Math.max(8, item.mb) };
    });
    const els = laid.map((b, i) => {
      const gap = i === 0 ? 0 : Math.max(laid[i - 1]!.mb, b.mt);
      return gap > 0 ? b.el.mt(gap) : b.el;
    });
    return { el: div().w_full().flex().flex_col().pl(20).children(els), mt: laid[0]?.mt ?? 0, mb: laid.at(-1)?.mb ?? 0 };
  }

  /** Item `index` of a top-level ul/ol as a column of its own (a row of virtualBlock): the list's padding and marker. */
  listRow(node: HastElement, index: number, css: Css): Element {
    const reset: Css = { ...css, font: this.body, color: this.t.textNeutralPrimary, italic: false }; // block()'s reset(this.body), outside a quote
    const item = this.listItem(listItems(node)[index]!, reset, { inList: true, inLi: false }, listMarker(node, index));
    return div().w_full().flex().flex_col().pl(20).child(item.el);
  }

  private listItem(li: HastElement, css: Css, scope: Scope, marker: string): { el: Element; mt: number; mb: number } {
    const t = this.t;
    const itemCss: Css = { ...css, font: this.body, italic: css.quote ? css.italic : false };
    const inner = this.blocks(li.children, itemCss, { inList: true, inLi: true });
    // li::marker sits outside, its end at the item's start; body default, neutral secondary.
    const markerEl = textStyle(div().absolute().top(0).right("100%").whitespace_nowrap().text_color(t.textNeutralSecondary), this.body).child(marker);
    const el = div()
      .relative()
      .w_full()
      .flex()
      .flex_col()
      .children(inner.els)
      .when(marker !== "", (e) => e.child(markerEl));
    return { el, mt: inner.mt, mb: inner.mb };
  }

  /** A table row's cells: react-ui's TableHead/TableCell, content on one line. */
  private cells(tr: HastElement, head: boolean): TableCell[] {
    const text = tableText(this.t, head);
    return tr.children
      .filter(isElement)
      .filter((c) => c.tagName === "th" || c.tagName === "td")
      .map((c) => {
        const align = c.properties.align;
        return {
          content: this.words(this.pieces(c.children, this.css(text.style, text.color), []), true),
          align: align === "left" || align === "center" || align === "right" ? align : undefined,
        };
      });
  }

  /** A markdown table: react-ui's Table parts (no ScrollableTable controls), cells on one line. */
  private table(node: HastElement): Element {
    const [head, ...body] = tableRows(node);
    return tableView(this.ctx, this.key("table"), {
      header: head ? this.cells(head, true) : [],
      rows: body.map((tr) => this.cells(tr, false)),
      controls: false,
      static: this.row ? { unmeasured: this.row.unmeasured } : undefined,
    });
  }

  /**
   * Body rows `from`–`to` of a long table (a row of virtualBlock), drawn static (`fixed`) or,
   * to measure its widths, the header and first `measured` rows drawn with handlers. Every
   * group and the measuring draw share the table's state through one Markdown part.
   */
  tableGroup(node: HastElement, from: number, to: number, fixed: StaticTable | null, measured: number): Element {
    const [head, ...body] = tableRows(node);
    const rows = fixed ? body.slice(from, to) : body.slice(0, measured);
    return tableView(this.ctx, this.key("table"), {
      header: head ? this.cells(head, true) : [],
      rows: rows.map((tr) => this.cells(tr, false)),
      controls: false,
      static: fixed ?? undefined,
    });
  }

  // ── Inline ──

  css(font: TextStyle, color: Color): Css {
    return { font, color, italic: false, strike: false, link: null, quote: false };
  }

  /** Inline content as a wrapping row of words. */
  flow(nodes: ElementContent[], css: Css, marks: { open?: string; close?: string } = {}): Element {
    const pieces: Piece[] = [];
    if (marks.open) pieces.push({ kind: "atom", el: this.mark(marks.open, css, "open") });
    this.pieces(nodes, css, pieces);
    if (marks.close) pieces.push({ kind: "atom", el: this.mark(marks.close, css, "close") });
    return div().w_full().flex().flex_row().flex_wrap().items_baseline().children(this.words(pieces, false));
  }

  /** blockquote's ::before/::after quote, 0.2em from the text. */
  private mark(quote: string, css: Css, side: "open" | "close"): Element {
    const el = this.span(quote, { ...css, link: null });
    const space = 0.2 * css.font.size;
    return side === "open" ? el.mr(space) : el.ml(space);
  }

  /** Flatten inline content into styled text, atoms, breaks and (in inline mode) blocks. */
  pieces(nodes: ElementContent[], css: Css, out: Piece[]): Piece[] {
    const t = this.t;
    for (const node of nodes) {
      if (node.type === "text") {
        out.push({ kind: "text", text: node.value, css });
        continue;
      }
      if (node.type !== "element") continue;
      const tag = node.tagName;
      const props = node.properties;
      if (this.profile === "inline" && (tag === "p" || HEADING.test(tag) || tag === "ul" || tag === "ol" || tag === "li")) {
        this.pieces(node.children, css, out); // InlineMarkdownRenderer: these are Fragments
        continue;
      }
      switch (tag) {
        case "strong":
        case "b":
          // `strong`: body heavy, neutral primary; its font shorthand resets font-style. Inside a
          // CompositeCardBlock (compositeCardBlock.scss) `font: inherit` keeps the slot's font at the medium weight.
          this.pieces(
            node.children,
            this.ctx.scope.cardText?.composite
              ? { ...css, font: restyle(t, css.font, { weight: typography(t, "body", "heavy").weight }), color: css.quote ? css.color : t.textNeutralPrimary }
              : { ...css, font: typography(t, "body", "heavy"), color: css.quote ? css.color : t.textNeutralPrimary, italic: false },
            out,
          );
          break;
        case "em":
        case "i":
          this.pieces(node.children, { ...css, italic: true }, out);
          break;
        case "del":
        case "s":
          this.pieces(node.children, { ...css, strike: true }, out);
          break;
        case "a": {
          // .openui-markdown-renderer-link: info primary in body link type; in a blockquote, `*` inherits color and style.
          const href = typeof props.href === "string" ? props.href : "";
          const link = { key: this.key("link"), href };
          this.pieces(node.children, { ...css, font: this.body, color: css.quote ? css.color : t.textInfoPrimary, italic: css.quote ? css.italic : false, link }, out);
          break;
        }
        case "code": {
          const language = codeBlockLanguage(node);
          if (language !== null) {
            out.push({ kind: "block", el: codeBlock(this.ctx, this.key("code"), textOf(node).trim(), language, css.font.size, { static: !!this.row }) });
            break;
          }
          out.push({ kind: "atom", el: this.inlineCode(textOf(node), css) });
          break;
        }
        case "br":
          out.push({ kind: "break", css });
          break;
        case "sup":
        case "sub":
          this.pieces(node.children, { ...css, font: restyle(t, css.font, { size: css.font.size / 1.2 }) }, out); // font-size: smaller
          break;
        case "span":
          // remarkCitations sets `data-component-type` through hProperties, which keeps the key as written.
          if (props["data-component-type"] === "citation") break; // no CardSourceProvider: TextContentCitation renders null
          this.pieces(node.children, css, out);
          break;
        case "img":
          if (typeof props.alt === "string" && props.alt) out.push({ kind: "text", text: props.alt, css });
          break;
        case "input":
          if (props.type === "checkbox") out.push({ kind: "atom", el: this.checkbox(!!props.checked, css) });
          break;
        default:
          if (BLOCK.has(tag)) {
            const block = this.block(node, css, { inList: false, inLi: false }, { last: true });
            out.push({ kind: "block", el: block.el });
          } else this.pieces(node.children, css, out);
      }
    }
    return out;
  }

  /** .openui-markdown-renderer-code: a bordered sunk chip in body link type. */
  private inlineCode(text: string, css: Css): Element {
    const t = this.t;
    const composite = !!this.ctx.scope.cardText?.composite;
    let el = textStyle(
      div()
        .flex_none()
        .max_w_full()
        .px(4)
        .py(2)
        .my(-3) // inline padding and border don't grow a line box
        .rounded(4)
        .bg(t.sunk)
        .border_1()
        .border_color(t.borderDefault)
        .text_color(css.quote ? css.color : t.textNeutralPrimary),
      // compositeCardBlock.scss: code-sm typography, line-height 1, inside a CompositeCardBlock.
      composite ? typography(t, "code", "small") : this.body,
    ).child(text.replace(/\s+/g, " "));
    if (composite) el = el.line_height(1);
    if (css.lineHeight) el = el.line_height(css.lineHeight);
    if (css.quote && css.italic) el = el.italic();
    return el;
  }

  /** A task list's disabled checkbox, as the browser's native control draws it. */
  private checkbox(checked: boolean, css: Css): Element {
    const t = this.t;
    const box = div()
      .size(13)
      .flex_none()
      .ml(4)
      .mr(3)
      .rounded(3)
      .border_1()
      .border_color(t.borderInteractive)
      .flex()
      .items_center()
      .justify_center()
      .self_center()
      .when(checked, (el) => el.bg(t.textNeutralTertiary).border_color(t.textNeutralTertiary));
    const icon = checked ? this.ctx.icon("check", { size: 11 }) : null;
    return icon ? box.text_color(t.background).child(icon) : box.text_color(css.color);
  }

  private span(text: string, css: Css): Element {
    const link = css.link;
    // One key per link word in either mode, so a row's tables and code keep the keys of a handled draw.
    const id = link ? this.ctx.id(this.key(`${link.key}-w`)) : "";
    // In a row (no handlers), gpui-base's Link opens an http(s) address itself.
    const native = !!this.row && !!link && WEB.test(link.href);
    let el = textStyle((native ? Link.new(id) : div()).whitespace_nowrap().text_color(css.color), css.font).child(text);
    if (css.lineHeight) el = el.line_height(css.lineHeight);
    if (css.italic) el = el.italic();
    if (css.strike) el = el.line_through();
    if (native) return el.href(link!.href).cursor_pointer().hover((s) => s.underline());
    if (!link || this.row) return el;
    // :hover underlines the whole link, however many words it spans.
    if (this.hover.link === link.key) el = el.underline();
    return el
      .id(id)
      .cursor_pointer()
      .on_hover((hovered, cx) => {
        const next = hovered ? link.key : this.hover.link === link.key ? null : this.hover.link;
        if (next !== this.hover.link) {
          this.hover.link = next;
          cx.notify();
        }
      })
      .on_click((_e, cx) => {
        if (link.href && !link.href.startsWith("#")) cx.open_url(link.href);
      });
  }

  /**
   * Words for a flex-wrap row: collapse white space as `white-space: normal`
   * does, keep the pieces of one word together, and end each word with its space.
   */
  words(pieces: Piece[], nowrap: boolean): Element[] {
    const out: Element[] = [];
    let group: Element[] = [];
    let space: Css | null = null;
    let lineStart = true;
    let lastWasBreak = false;
    const flush = (withSpace: boolean) => {
      if (withSpace && space && group.length) group.push(this.span(" ", space));
      if (group.length === 1) out.push(group[0]!);
      else if (group.length) out.push(div().flex().flex_row().flex_none().items_baseline().children(group));
      group = [];
      space = null;
    };
    for (const piece of pieces) {
      if (piece.kind === "text") {
        for (const token of piece.text.replace(/[ \t\n\r\f]+/g, " ").split(/( )/)) {
          if (token === "") continue;
          if (token === " ") {
            if (!lineStart) space = piece.css;
            continue;
          }
          if (space) flush(true);
          group.push(this.span(token, piece.css));
          lineStart = false;
          lastWasBreak = false;
        }
      } else if (piece.kind === "atom") {
        if (space) flush(true);
        group.push(piece.el);
        lineStart = false;
        lastWasBreak = false;
      } else if (piece.kind === "break") {
        flush(false);
        // A break on an empty line keeps the line's height, as a browser's line box does.
        if (lineStart && lastWasBreak) out.push(div().w_full().h(piece.css.font.size * (piece.css.lineHeight ?? piece.css.font.lineHeight)));
        if (!nowrap) out.push(div().w_full().h(0));
        lineStart = true;
        lastWasBreak = true;
      } else {
        flush(false);
        out.push(piece.el);
        lineStart = true;
        lastWasBreak = false;
      }
    }
    flush(false);
    return out;
  }
}

/** react-ui MarkDownRenderer / TextContentWrapper: a markdown block. */
export function markdownBlock(
  ctx: RenderContext,
  part: string,
  text: string,
  o: { profile: "plain" | "content"; body?: TextStyle },
): Element {
  const body = o.body ?? typography(ctx.t, "body", "default");
  const color = ctx.t.textNeutralPrimary;
  const tree = markdownTree(ctx, part, text, o.profile);
  // Until a long text is parsed (markdown/budget.ts), and for a short block past the render's
  // ceiling (blocks.ts RENDER_CHARS): the text itself, in the block's style.
  const draw = tree ? blockDraw(ctx, text.length) : "plain";
  if (!tree || draw === "plain") return textStyle(div().w_full().flex().flex_col().text_color(color), body).child(div().child(text));
  if (draw === "virtual") return virtualBlock(ctx, part, tree, o.profile, body, color);
  const md = new Markdown(ctx, part, o.profile, body);
  const css = md.css(body, color);
  // `> *:first-child { margin-top: 0 }`, `> *:last-child { margin-bottom: 0 }`
  const inner = md.blocks(tree.children as ElementContent[], css, { inList: false, inLi: false });
  return textStyle(div().w_full().flex().flex_col().text_color(css.color), body).children(inner.els);
}

/** Where a host never told its viewport height (Surface.setViewportHeight), a long block's region is this tall. */
const DEFAULT_VIEWPORT = 600;
/** How many frames a row's tables get to be measured before the row stops asking for redraws. */
const MEASURE_TRIES = 4;
/** How far a long block's rows may draw past its left side (the host's padding): a list clips its rows at its bounds. */
const BLEED = 16;
/**
 * A row with more source than this still (one huge paragraph or list item: the cuts in
 * blocks.ts virtualRows can't split it) draws as its plain text: built in full it would
 * cost a render's whole budget (about 2.7 ms per kilobyte) in one call.
 */
const ROW_CHARS = 12_000;
/**
 * Body rows of a long table its handled draw measures (in the render, about 8 ms); the
 * widths of the others are estimated from their text.
 */
const MEASURE_ROWS = 25;

/** Words enough for a line wider than any pane: a virtual block's intrinsic width hint. */
const WIDE_TEXT = "wide ".repeat(800);

/** A tree's rows (blocks.ts virtualRows), kept with the tree. */
const treeRows = new WeakMap<Root, VirtualRow[]>();
/** Per long table, a content width per column for the rows past MEASURE_ROWS: their longest text at about 0.6em a character. */
const tableEstimates = new WeakMap<HastElement, number[]>();

function tableEstimate(ctx: RenderContext, table: HastElement): number[] {
  let estimate = tableEstimates.get(table);
  if (estimate) return estimate;
  const em = tableText(ctx.t, false).style.size;
  estimate = [];
  for (const tr of tableRows(table).slice(1 + MEASURE_ROWS)) {
    tr.children.filter(isElement).forEach((cell, ci) => (estimate![ci] = Math.max(estimate![ci] ?? 0, textOf(cell).length * em * 0.6)));
  }
  tableEstimates.set(table, estimate);
  return estimate;
}

interface VirtualState {
  /** Rows (by key) that lack table measurements: the frame that asked, and how many frames measured them. */
  measure: Map<string, { frame: number; tries: number }>;
  /** The tree the rows were last taken from. */
  tree: Root | null;
}

/**
 * A long markdown block: its rows (blocks.ts virtualRows) in gpui-kit's lazy `list`, built
 * only while on screen, in a scroll region as tall as the host's viewport (the page still
 * reads top to bottom: the region fills the pane when scrolled to). Margins collapse
 * between rows as blocks() collapses them. Rows run in layout, with no handlers: a table
 * there takes column widths from a handled draw of its row, made clipped to nothing behind
 * the list for the frames it is missing them.
 */
function virtualBlock(ctx: RenderContext, part: string, tree: Root, profile: "plain" | "content", body: TextStyle, color: Color): Element {
  let rows = treeRows.get(tree);
  if (!rows) treeRows.set(tree, (rows = virtualRows(tree, profile)));
  const pieces = rows;
  const local = ctx.local<VirtualState>({ measure: new Map(), tree: null }, `${part}-virtual`);
  if (local.tree !== tree) {
    // A new tree (the text grew): forget the state of rows that are gone.
    if (local.tree) {
      const keys = new Set(pieces.flatMap((r) => (r.kind === "table" ? [r.key, r.part] : [r.key])));
      ctx.pruneLocals(`${part}-`, (rest) => {
        const row = /^(?:\d+-\d+|i\d+)(?:-(?:li|c|t)\d+)?/.exec(rest)?.[0];
        return row === undefined || keys.has(row) || keys.has(row.replace(/-(?:li|c|t)\d+$/, ""));
      });
      for (const key of local.measure.keys()) if (!keys.has(key)) local.measure.delete(key);
    }
    local.tree = tree;
  }

  const askMeasure = (key: string) => {
    const asked = local.measure.get(key);
    // A table measured a while ago and missing widths again (its sizes were replaced) starts over.
    const tries = asked && asked.frame >= ctx.frame - 2 ? asked.tries : 0;
    local.measure.set(key, { frame: ctx.frame, tries });
    if (tries < MEASURE_TRIES) ctx.wake();
  };
  /** Row `k`, static (in the list) or with handlers (the measuring draw). */
  const draw = (k: number, fixed: boolean): Element => {
    const r = pieces[k]!;
    const ask: Row | null = fixed ? { unmeasured: () => askMeasure(r.key) } : null;
    if (rowChars(r) > ROW_CHARS) {
      const node = r.kind === "li" ? listItems(r.node)[r.index]! : r.kind === "item" && r.item.kind === "block" ? r.item.node : null;
      const text = node ? textOf(node) : r.kind === "item" && r.item.kind === "inline" ? r.item.nodes.map(textOf).join("") : "";
      return div().w_full().child(text);
    }
    if (r.kind === "code") return codeBlock(ctx, `${part}-${r.key}`, r.code, r.language, body.size, { static: true, edges: { top: r.first, bottom: r.last } });
    if (r.kind === "table") {
      const md = new Markdown(ctx, `${part}-${r.part}`, profile, body, ask);
      const groupOf: StaticTable | null = ask ? { unmeasured: ask.unmeasured, from: r.from, count: r.count, measured: MEASURE_ROWS, estimate: tableEstimate(ctx, r.node) } : null;
      return md.tableGroup(r.node, r.from, r.to, groupOf, MEASURE_ROWS);
    }
    const md = new Markdown(ctx, `${part}-${r.key}`, profile, body, ask);
    const css = md.css(body, color);
    return r.kind === "li" ? md.listRow(r.node, r.index, css) : md.item(r.item, css, TOP).el;
  };

  const n = pieces.length;
  const lazy = lazyRows(ctx, part, {
    count: n,
    key: (k) => pieces[k]!.key,
    left: BLEED,
    row: (k) => {
      const gap = k > 0 ? Math.max(pieces[k - 1]!.margins.mb, pieces[k]!.margins.mt) : 0;
      // The list reaches BLEED past the block's left side (rows padded back in), so what a full draw
      // lets overflow there, such as an ordered list's wide markers, isn't clipped.
      return textStyle(div().w_full().flex().flex_col().pl(BLEED).text_color(color), body)
        .when(gap > 0, (row) => row.pt(gap))
        .child(edge(draw(k, true), k, n));
    },
  });

  // Rows that asked last frame get their handled draw, which measures their tables.
  const measuring: Element[] = [];
  if (local.measure.size) {
    const index = new Map(pieces.map((r, k) => [r.key, k]));
    for (const [key, asked] of local.measure) {
      const k = index.get(key);
      if (k === undefined || asked.frame < ctx.frame - 1 || asked.tries >= MEASURE_TRIES) continue;
      asked.tries++;
      measuring.push(draw(k, false));
    }
  }

  // Callers style the block (MarkDownRenderer's card variant pads it): the region lives in its content box.
  const region = div()
    .relative()
    .flex_1()
    .min_h(0)
    .w_full()
    .child(lazy[0]!)
    .when(measuring.length > 0, (el) =>
      el.child(div().absolute().top(0).left(0).w_full().h(0).overflow_hidden().child(div().w_full().flex().flex_col().children(measuring))),
    )
    .children(lazy.slice(1));
  // The region's content is out of flow (the list, the measuring draw), so it has no width of its own.
  // A caller that sizes it to its content (Steps' details: an auto width in a column whose width
  // comes from its content) gets a long paragraph's intrinsic widths from a clipped line of
  // words (as wide as the container allows, a word at least), and self_stretch fills a column.
  return textStyle(
    div().id(ctx.id(`${part}-virtual`)).w_full().self_stretch().h(ctx.viewportHeight ?? DEFAULT_VIEWPORT).flex().flex_col().text_color(color),
    body,
  )
    .child(div().w_full().h(0).overflow_hidden().child(WIDE_TEXT))
    .child(region);
}

/** The text of nodes that are only text (inside a paragraph, which InlineMarkdownRenderer unwraps), else null. */
function plainText(nodes: (RootContent | ElementContent)[]): string | null {
  let out = "";
  for (const n of nodes) {
    if (n.type === "text") out += n.value;
    else if (n.type === "element" && n.tagName === "p") {
      const inner = plainText(n.children);
      if (inner === null) return null;
      out += inner;
    } else return null;
  }
  return out;
}

/**
 * react-ui InlineMarkdownRenderer: markdown inside a line of text that sets the font and color.
 * `align: "right"` is the parent's `text-align: right` (each wrapped line is pushed to the right edge).
 */
export function markdownInline(
  ctx: RenderContext,
  part: string,
  text: string,
  root: { font: TextStyle; color: Color; align?: "right" },
): Element {
  const tree = markdownTree(ctx, part, text, "inline");
  // Until a long text is parsed (markdown/budget.ts): the text itself, in the line's font and color
  // (one clipped line in a card slot that clips).
  if (!tree) {
    const el = textStyle(div().text_color(root.color).when(root.align === "right", (e) => e.text_right()), root.font);
    return ctx.scope.cardText?.ellipsis
      ? el.min_w_0().max_w_full().overflow_hidden().whitespace_nowrap().text_ellipsis().child(text.replace(/\s+/g, " "))
      : el.child(text);
  }
  const md = new Markdown(ctx, part, "inline", typography(ctx.t, "body", "default"));
  const css = md.css(root.font, root.color);
  // A card's clipped slot (ctx.scope.cardText.ellipsis: SnippetCardBlock) is one nowrap line ending in "…".
  // gpui can only ellipsize a single run of text, so that holds for a plain string; formatted text wraps.
  const plain = ctx.scope.cardText?.ellipsis ? plainText(tree.children) : null;
  if (plain !== null) {
    // white-space: nowrap folds a soft line break ("\n") into a space.
    return textStyle(div().min_w_0().max_w_full().overflow_hidden().whitespace_nowrap().text_ellipsis().text_color(root.color), root.font).child(plain.replace(/\s+/g, " "));
  }
  return div()
    .flex()
    .flex_row()
    .flex_wrap()
    .items_baseline()
    .when(root.align === "right", (el) => el.justify_end())
    .children(md.words(md.pieces(tree.children as ElementContent[], css, []), false));
}
