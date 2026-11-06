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
// its plain source text until a task has parsed it, and once one render has drawn
// FORMATTED_CHARS of markdown formatted, top-level blocks that don't fit in what is
// left draw as their plain text (temporary, until long markdown is virtualized).
import type { Element as HastElement, ElementContent, Root, RootContent } from "hast";
import { div, type Color, type Element } from "gpui-kit";
import { tableText, tableView, type TableCell } from "../components/tables.ts";
import type { RenderContext } from "../render/surface.ts";
import { alpha, restyle, textStyle, typography, type TextStyle } from "../render/tokens.ts";
import { codeBlock, codeBlockLanguage, textOf } from "./code.ts";
import { formattedBlocks, markdownTree } from "./budget.ts";
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

const BLOCK = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "pre", "blockquote", "hr", "table", "section", "div"]);
const HEADING = /^h[1-6]$/;
const QUOTES = [
  ["\u201C", "\u201D"],
  ["\u2018", "\u2019"],
] as const;

const isElement = (n: RootContent | ElementContent): n is HastElement => n.type === "element";
const isBlank = (n: RootContent | ElementContent) => n.type === "text" && n.value.trim() === "";

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
    const items: ({ kind: "inline"; nodes: ElementContent[] } | { kind: "block"; node: HastElement })[] = [];
    let run: ElementContent[] = [];
    const flush = () => {
      if (run.some((n) => !isBlank(n))) items.push({ kind: "inline", nodes: run });
      run = [];
    };
    for (const node of nodes) {
      if (isElement(node) && BLOCK.has(node.tagName)) {
        flush();
        items.push({ kind: "block", node });
      } else run.push(node);
    }
    flush();

    const elements = items.flatMap((it) => (it.kind === "block" ? [it.node] : []));
    let at = -1;
    const laid: Laid[] = items.map((it, i) => {
      const open = i === 0 ? marks?.open : undefined;
      const close = i === items.length - 1 ? marks?.close : undefined;
      if (it.kind === "inline") return { el: this.flow(it.nodes, css, { open, close }), mt: 0, mb: 0 };
      at++;
      const next = elements[at + 1]?.tagName;
      const last = at === elements.length - 1;
      return this.block(it.node, css, scope, { next, last, open, close });
    });

    const els = laid.map((b, i) => {
      const gap = i === 0 ? 0 : Math.max(laid[i - 1]!.mb, b.mt);
      return gap > 0 ? b.el.mt(gap) : b.el;
    });
    return { els, mt: laid[0]?.mt ?? 0, mb: laid.at(-1)?.mb ?? 0 };
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
        const el = codeBlock(this.ctx, this.key("code"), textOf(code).trim(), language, css.font.size);
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
    const ordered = node.tagName === "ol";
    let number = Number(node.properties.start ?? 1);
    const items = node.children.filter(isElement).filter((c) => c.tagName === "li");
    const laid = items.map((li, i) => {
      const marker = ordered ? `${number++}.\u00a0` : "\u2022\u00a0";
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

  /** A markdown table: react-ui's Table parts (no ScrollableTable controls), cells on one line. */
  private table(node: HastElement): Element {
    const t = this.t;
    const rows = node.children
      .filter(isElement)
      .flatMap((section) => (section.tagName === "tr" ? [section] : section.children.filter(isElement).filter((r) => r.tagName === "tr")));
    const cells = (tr: HastElement, head: boolean): TableCell[] =>
      tr.children
        .filter(isElement)
        .filter((c) => c.tagName === "th" || c.tagName === "td")
        .map((c) => {
          const text = tableText(t, head);
          const align = c.properties.align;
          return {
            content: this.words(this.pieces(c.children, this.css(text.style, text.color), []), true),
            align: align === "left" || align === "center" || align === "right" ? align : undefined,
          };
        });
    const [head, ...body] = rows;
    return tableView(this.ctx, this.key("table"), {
      header: head ? cells(head, true) : [],
      rows: body.map((tr) => cells(tr, false)),
      controls: false,
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
            out.push({ kind: "block", el: codeBlock(this.ctx, this.key("code"), textOf(node).trim(), language, css.font.size) });
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
    let el = textStyle(div().whitespace_nowrap().text_color(css.color), css.font).child(text);
    if (css.lineHeight) el = el.line_height(css.lineHeight);
    if (css.italic) el = el.italic();
    if (css.strike) el = el.line_through();
    const link = css.link;
    if (!link) return el;
    // :hover underlines the whole link, however many words it spans.
    if (this.hover.link === link.key) el = el.underline();
    return el
      .id(this.ctx.id(this.key(`${link.key}-w`)))
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
  const tree = markdownTree(ctx, part, text, o.profile);
  // Until a long text is parsed (markdown/budget.ts): the text itself, in the block's style.
  if (!tree) return textStyle(div().w_full().flex().flex_col().text_color(ctx.t.textNeutralPrimary), body).child(div().child(text));
  const md = new Markdown(ctx, part, o.profile, body);
  const css = md.css(body, ctx.t.textNeutralPrimary);
  // Blocks past what one render can draw formatted (markdown/budget.ts, temporary) draw as their text.
  const nodes = tree.children;
  const formatted = formattedBlocks(ctx, nodes, (n) => (n.type === "doctype" ? 0 : textOf(n).length));
  if (formatted.every(Boolean)) {
    // `> *:first-child { margin-top: 0 }`, `> *:last-child { margin-bottom: 0 }`
    const inner = md.blocks(nodes as ElementContent[], css, { inList: false, inLi: false });
    return textStyle(div().w_full().flex().flex_col().text_color(css.color), body).children(inner.els);
  }
  // Runs of formatted and plain blocks, in order, a paragraph's margin (18px) apart.
  const runs: { formatted: boolean; nodes: Root["children"] }[] = [];
  nodes.forEach((node, i) => {
    const last = runs.at(-1);
    if (last && (last.formatted === formatted[i] || isBlank(node))) last.nodes.push(node);
    else runs.push({ formatted: formatted[i]!, nodes: [node] });
  });
  const els = runs.flatMap((run): Element[] => {
    if (run.formatted) return [div().w_full().flex().flex_col().children(md.blocks(run.nodes as ElementContent[], css, { inList: false, inLi: false }).els)];
    const plain = run.nodes.flatMap((n) => (n.type === "doctype" || isBlank(n) ? [] : [textOf(n)]));
    return plain.length ? [div().w_full().child(plain.join("\n\n"))] : [];
  });
  return textStyle(div().w_full().flex().flex_col().text_color(css.color), body).children(els.map((el, i) => (i ? el.mt(18) : el)));
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
