// Markdown → HTML tree (hast), exactly as react-ui's renderers get it.
//
// react-markdown 10.1.0 runs `unified().use(remarkParse).use(remarkPlugins)
// .use(remarkRehype, { allowDangerousHtml: true })`, then (lib/index.js `post`)
// turns raw HTML into literal text and passes every URL attribute through
// `defaultUrlTransform`. The same packages at the versions upstream's lockfile
// resolves are used here, with each renderer's own plugin list:
//   plain    components/MarkDownRenderer        (genui MarkDownRenderer, Callout): none
//   content  components/TextContentWrapper      (TextContent): GFM without single-tilde
//            strikethrough, math without single-dollar inline math, remark-breaks, citations
//   inline   components/InlineMarkdownRenderer  (Text, BoldText): citations, remark-breaks, GFM
//
// Two shortcuts give the same trees for less work in gpui-shell's engine (see
// budget.ts): a string that can only be one paragraph of literal text skips the
// pipeline (plainParagraph), and a long text can be parsed in pieces cut where no
// construct spans the cut (MarkdownParse); test/markdown.test.ts pins both.
import type { Nodes, Root } from "hast";
import type { Point } from "unist";
import type {} from "mdast-util-to-hast"; // declares hast's `raw` node (allowDangerousHtml)
import { urlAttributes } from "html-url-attributes";
import { remarkCitations } from "openui-remark-citations";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type PluggableList } from "unified";
import { visit } from "unist-util-visit";

export type MarkdownProfile = "plain" | "content" | "inline";

const PLUGINS: Record<MarkdownProfile, PluggableList> = {
  plain: [],
  content: [[remarkGfm, { singleTilde: false }], [remarkMath, { singleDollarTextMath: false }], [remarkBreaks], remarkCitations],
  inline: [remarkCitations, [remarkBreaks], [remarkGfm, { singleTilde: false }]],
};

type Processor = ReturnType<typeof makeProcessor>;
const processors: Partial<Record<MarkdownProfile, Processor>> = {};

function makeProcessor(profile: MarkdownProfile) {
  return unified().use(remarkParse).use(PLUGINS[profile]).use(remarkRehype, { allowDangerousHtml: true }).freeze();
}

const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;

/** react-markdown `defaultUrlTransform`: relative URLs and safe protocols pass, others become "". */
export function defaultUrlTransform(value: string): string {
  const colon = value.indexOf(":");
  const questionMark = value.indexOf("?");
  const numberSign = value.indexOf("#");
  const slash = value.indexOf("/");
  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value;
  }
  return "";
}

const cache = new Map<string, Root>();
const CACHE_SIZE = 200;

function remember(key: string, tree: Root): Root {
  cache.set(key, tree);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return tree;
}

/** The full pipeline on `text`, with react-markdown's `post`; uncached and without the fast path. */
export function runPipeline(text: string, profile: MarkdownProfile): Root {
  const processor = (processors[profile] ??= makeProcessor(profile));
  const tree = processor.runSync(processor.parse(text)) as Root;
  // react-markdown `post`: raw HTML becomes its own text; URLs are made safe.
  visit(tree, (node, index, parent) => {
    if (node.type === "raw" && parent && typeof index === "number") {
      parent.children[index] = { type: "text", value: node.value };
      return index;
    }
    if (node.type === "element") {
      for (const [attr, tags] of Object.entries(urlAttributes)) {
        if (Object.hasOwn(node.properties, attr) && (tags === null || tags.includes(node.tagName))) {
          node.properties[attr] = defaultUrlTransform(String(node.properties[attr] || ""));
        }
      }
    }
    return undefined;
  });
  return tree;
}

/**
 * The tree for a string every profile reads as one paragraph of literal text, built
 * without unified (most labels are such strings, and the pipeline costs about a
 * millisecond per call in gpui-shell's engine); null when `text` might hold markup.
 * It rejects what could start or change a construct: markdown punctuation, line
 * endings and tabs, edge whitespace (trimmed or a hard break), a block marker at the
 * start, GFM autolink literals (`www.`, `://`, `@`), `$$` math in TextContent.
 * test/markdown.test.ts pins it to the pipeline's tree.
 */
export function plainParagraph(text: string, profile: MarkdownProfile): Root | null {
  if (
    /[\x00-\x1f\x7f\\`*_~[\]<>&|\uFEFF\uD800-\uDFFF]|^\s|\s$|^([#>=]|[-+](\s|$)|--|\d{1,9}[.)](\s|$))|:\/\/|@|www\./i.test(text) ||
    (profile === "content" && text.includes("$$"))
  ) {
    return null;
  }
  const position = () => ({ start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: text.length + 1, offset: text.length } });
  if (!text) return { type: "root", children: [], position: position() };
  // remark-rehype keeps a text's position; remarkCitations (TextContent, Text) replaces every text node with a copy without one.
  const value = profile === "plain" ? { type: "text" as const, value: text, position: position() } : { type: "text" as const, value: text };
  return { type: "root", children: [{ type: "element", tagName: "p", properties: {}, children: [value], position: position() }], position: position() };
}

/** The tree for `text` if it costs no parse: cached, or plain text (plainParagraph). Callers must not mutate it. */
export function readyMarkdown(text: string, profile: MarkdownProfile): Root | undefined {
  return cache.get(`${profile}\u0000${text}`) ?? plainParagraph(text, profile) ?? undefined;
}

/**
 * The hast tree react-ui's renderer for `profile` would turn into React elements.
 * Trees are cached by text (a hover redraws every markdown block); callers must not mutate them.
 */
export function parseMarkdown(text: string, profile: MarkdownProfile): Root {
  const ready = readyMarkdown(text, profile);
  if (ready) return ready;
  return remember(`${profile}\u0000${text}`, runPipeline(text, profile));
}

/** HTML block kinds 1–5 (CommonMark 4.6): they run past blank lines, to the first line holding their end. */
const HTML_SPANS: [RegExp, RegExp][] = [
  [/^ {0,3}<(script|pre|style|textarea)([ \t>]|\r?$)/i, /<\/(script|pre|style|textarea)>/i],
  [/^ {0,3}<!--/, /-->/],
  [/^ {0,3}<\?/, /\?>/],
  [/^ {0,3}<![A-Za-z]/, />/],
  [/^ {0,3}<!\[CDATA\[/, /\]\]>/],
];

/**
 * Where `text` may be cut into pieces that parse, in `profile`, to the same blocks on
 * their own: at the start of a run of blank lines followed by a line that starts with
 * neither whitespace nor a list marker (either could continue a block above), outside
 * fenced code, `$$` math (TextContent only: the other renderers have no math) and the
 * HTML blocks that span blank lines.
 *
 * Where the structure can't be told line by line, cutting stops (the rest is one piece):
 * at a fence inside a list item or quote that its container may have ended, and at a
 * fence-like line inside what may be an HTML block. A text with a line, outside code,
 * that may be a link or footnote definition (`]:`, which reaches the whole document) or
 * with lone CR line endings is not cut at all. test/markdown.test.ts pins the cuts.
 */
export function markdownCuts(text: string, profile: MarkdownProfile): number[] {
  if (/\r(?!\n)/.test(text)) return [];
  const cuts: number[] = [];
  // An open fence: its marks, the column they start at, and the quote marks before them.
  // A fence inside a list item or quote (`nested`, anything not at column 0) closes only
  // at its own column and quote depth; any other closer-like line, or a less indented or
  // less quoted line, means its container may have ended it, so nothing past that is cut.
  let fence: { char: string; size: number; col: number; quotes: number; nested: boolean } | null = null;
  let html: RegExp | null = null;
  // After a line that may open an HTML block of kind 6 or 7 (until the next blank line), a
  // fence-like line may be HTML text or a real fence: past that, nothing is cut.
  let htmlUntilBlank = false;
  let blank = -1;
  let at = 0;
  for (const line of text.split("\n")) {
    const start = at;
    at += line.length + 1;
    if (fence) {
      const lead = /^[ \t>]*/.exec(line)![0];
      const quotes = lead.split(">").length - 1;
      // A blank line, or in a quoted fence a line of only its quote marks.
      const blankLine = /^[ \t>]*\r?$/.test(line) && quotes >= fence.quotes;
      if (fence.nested && !blankLine && (lead.length < fence.col || quotes < fence.quotes)) return stopped(cuts, text, start);
      const close = /^[ \t>]*(`{3,}|~{3,}|\${2,})[ \t]*\r?$/.exec(line)?.[1];
      if (!close || close[0] !== fence.char || close.length < fence.size) continue;
      if (fence.nested ? lead.length === fence.col && quotes === fence.quotes : lead.length <= 3 && quotes === 0) fence = null;
      else if (fence.nested) return stopped(cuts, text, start);
      continue;
    }
    if (html) {
      if (html.test(line)) html = null;
      continue;
    }
    if (/^[ \t]*\r?$/.test(line)) {
      if (blank < 0) blank = start;
      htmlUntilBlank = false;
      continue;
    }
    if (line.includes("]:")) return [];
    if (blank > 0 && !/^(\s|[-+*](\s|$)|\d{1,9}[.)](\s|$))/.test(line)) cuts.push(blank);
    blank = -1;
    // Fences, after any list markers and quote marks: backticks with no backtick after them,
    // tildes, and in TextContent `$$` with no `$` after it.
    const open = /^((?:[ \t>]|(?:[-+*]|\d{1,9}[.)])(?=[ \t]))*)(`{3,}[^`]*|~{3,}.*|\${2,}[^$]*)$/.exec(line);
    if (open && (open[2]![0] !== "$" || profile === "content")) {
      if (htmlUntilBlank) return stopped(cuts, text, start);
      const marks = /^(`+|~+|\$+)/.exec(open[2]!)![1]!;
      const prefix = open[1]!;
      // Only a fence at column 0 is surely outside every list item.
      fence = { char: marks[0]!, size: marks.length, col: prefix.length, quotes: prefix.split(">").length - 1, nested: prefix !== "" };
      continue;
    }
    const span = HTML_SPANS.find(([opens]) => opens.test(line));
    if (span) {
      if (!span[1].test(line.replace(span[0], ""))) html = span[1];
    } else if (/^ {0,3}<[/A-Za-z]/.test(line)) htmlUntilBlank = true;
  }
  return cuts;
}

/** The cuts before an unclear line at `from`, unless a later line may be a definition (which reaches back). */
function stopped(cuts: number[], text: string, from: number): number[] {
  return text.includes("]:", from) ? [] : cuts;
}

/** Characters a piece holds at most, where markdownCuts allows (a single block may be longer). */
const PIECE_CHARS = 2000;

const pieces = new Map<string, Root>();
const PIECE_CACHE_SIZE = 400;

/**
 * parseMarkdown in steps that each parse a bounded piece: the text is cut where
 * markdownCuts allows (into pieces of about PIECE_CHARS), each piece runs the pipeline
 * on its own, and the trees are joined with positions moved to the whole text's. The
 * result equals parseMarkdown's and lands in its cache. Pieces are cached too, so a
 * response that grows while streaming parses only its new end.
 */
export class MarkdownParse {
  readonly key: string;
  private readonly starts: number[];
  private readonly trees: Root[] = [];
  private result: Root | null = null;

  constructor(
    readonly text: string,
    readonly profile: MarkdownProfile,
    /** Characters a piece holds at most where it can be cut; tests cut at every allowed place. */
    pieceChars = PIECE_CHARS,
  ) {
    this.key = `${profile}\u0000${text}`;
    const starts = [0];
    let previous = 0;
    for (const cut of [...markdownCuts(text, profile), text.length]) {
      if (cut - starts.at(-1)! > pieceChars && previous > starts.at(-1)!) starts.push(previous);
      previous = cut;
    }
    this.starts = starts;
  }

  /** The parsed tree once every piece is in. */
  get tree(): Root | null {
    return this.result ?? cache.get(this.key) ?? null;
  }

  /** Characters the next step parses (0 when done). */
  get nextSize(): number {
    if (this.tree) return 0;
    const i = this.trees.length;
    return (this.starts[i + 1] ?? this.text.length) - this.starts[i]!;
  }

  /** Parse the next piece; after the last, join them. Returns the tree when done. */
  step(): Root | null {
    const done = this.tree;
    if (done) return done;
    const i = this.trees.length;
    const piece = this.text.slice(this.starts[i], this.starts[i + 1] ?? this.text.length);
    const single = this.starts.length === 1;
    const pieceKey = `${this.profile}\u0000${piece}`;
    let tree = single ? undefined : pieces.get(pieceKey);
    if (!tree) {
      tree = single ? runPipeline(piece, this.profile) : (readyMarkdown(piece, this.profile) ?? runPipeline(piece, this.profile));
      if (!single) {
        pieces.set(pieceKey, tree);
        if (pieces.size > PIECE_CACHE_SIZE) pieces.delete(pieces.keys().next().value!);
      }
    }
    this.trees.push(tree);
    if (this.trees.length < this.starts.length) return null;
    this.result = remember(this.key, this.join());
    return this.result;
  }

  private join(): Root {
    if (this.trees.length === 1) return this.trees[0]!;
    const children: Root["children"] = [];
    let line = 0;
    let prev = 0;
    let end: Point = { line: 1, column: 1, offset: 0 };
    this.trees.forEach((tree, i) => {
      const start = this.starts[i]!;
      for (let k = prev; k < start; k++) if (this.text.charCodeAt(k) === 10) line++;
      prev = start;
      const moved = shifted(tree, line, start);
      if (children.length && moved.children.length) children.push({ type: "text", value: "\n" });
      children.push(...moved.children);
      if (moved.position) end = moved.position.end;
    });
    return { type: "root", children, position: { start: { line: 1, column: 1, offset: 0 }, end } };
  }
}

/** A copy of `node` (properties shared) with every position `lines` lines and `offset` characters further on. */
function shifted<T extends Nodes>(node: T, lines: number, offset: number): T {
  const copy = { ...node };
  const p = node.position;
  if (p) {
    const move = (at: Point): Point => ({ line: at.line + lines, column: at.column, offset: (at.offset ?? 0) + offset });
    copy.position = { start: move(p.start), end: move(p.end) };
  }
  if ("children" in node) (copy as { children: Nodes[] }).children = node.children.map((child) => shifted(child, lines, offset));
  return copy;
}
