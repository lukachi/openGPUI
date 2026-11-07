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

/** How the pieces on both sides of a cut join: as blocks, or inside one list or table. */
export type CutJoin = "block" | "list" | "table";

export interface Cut {
  at: number;
  join: CutJoin;
  /** Text the piece after the cut is parsed behind: a table's header and delimiter rows. */
  prefix?: string;
}

const MARKER = /^([-+*]|\d{1,9}[.)])([ \t]|\r?$)/;
/** A list marker's kind: the bullet, or an ordered list's delimiter. Items of one kind continue a list. */
const markerKind = (line: string) => {
  const m = MARKER.exec(line)?.[1];
  return m === undefined ? null : /\d/.test(m) ? m.at(-1)! : m;
};
const DELIMITER_ROW = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*\r?$/;
/** A table row's cells, as GFM splits them: at pipes that are not escaped, outer pipes dropped. */
const cellCount = (line: string) => line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/).length;
/** A link reference definition on one line, with nothing that could continue it on the next. */
const DEFINITION = /^ {0,3}\[(?!\^)((?:[^\]\\\n]|\\.)+)\]:[ \t]*(?:<[^>\n]*>|\S+)(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?[ \t]*\r?$/;

/**
 * Where `text` may be cut into pieces that parse, in `profile`, to the same blocks on their
 * own, and the link definitions every piece needs.
 *
 * - Between blocks: at the start of a run of blank lines followed by a line that starts
 *   with neither whitespace nor a list marker (either could continue a block above),
 *   outside fenced code, `$$` math (TextContent only: the other renderers have no math)
 *   and the HTML blocks that span blank lines.
 * - Inside a tight top-level list: before each column-0 item of the list's marker kind,
 *   when every line of the list is such an item or indented, nothing before it may
 *   continue a list, and nothing after it does (a blank line inside or a continuation
 *   after would make it loose, and a piece's list would not be). The joined trees merge
 *   the two lists.
 * - Inside a GFM table (TextContent and Text): before each body row that starts with a
 *   pipe; the piece after is parsed behind the header and delimiter rows (`prefix`), and
 *   its body rows join the table.
 *
 * Link definitions (`[label]: url`, one line, not inside a paragraph) reach the whole
 * document: their lines come back in `definitions`, which every piece is parsed with
 * (they draw nothing). Where the structure can't be told line by line, cutting stops (the
 * rest is one piece): at a fence inside a list item or quote that its container may have
 * ended, and at a fence-like line inside what may be an HTML block. A text with any other
 * `]:` line outside code (a footnote, a definition that may span lines or repeats a label)
 * or with lone CR line endings is not cut at all. test/markdown.test.ts pins the cuts.
 */
export function markdownSplit(text: string, profile: MarkdownProfile): Split {
  const steps = splitSteps(text, profile);
  for (;;) {
    const next = steps.next();
    if (next.done) return next.value;
  }
}

export interface Split {
  cuts: Cut[];
  definitions: string;
}

/**
 * Lines markdownSplit reads between two yields of splitSteps: in gpui-shell's engine a whole
 * long document's scan (1,900 lines) ran past a call's budget, so MarkdownParse scans in steps.
 */
const SPLIT_LINES = 250;

/** markdownSplit, yielding every SPLIT_LINES lines; its return value is the split. */
function* splitSteps(text: string, profile: MarkdownProfile): Generator<void, Split, void> {
  const whole = { cuts: [], definitions: "" };
  if (/\r(?!\n)/.test(text)) return whole;
  const cuts: Cut[] = [];
  const definitions: string[] = [];
  const labels = new Set<string>();
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
  // The run of non-blank lines being read: if it is a list or table that may be cut
  // inside, the list's marker kind or the table's header and delimiter rows, and the
  // list's cuts, which hold only once its end shows it was tight.
  let run: { line: number; list: string | null; table: string | null; pending: Cut[]; listy: boolean } | null = null;
  const stop = (from: number) => (text.includes("]:", from) ? whole : { cuts, definitions: definitions.join("\n") });
  const lines = text.split("\n");
  let at = 0;
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && i % SPLIT_LINES === 0) yield;
    const line = lines[i]!;
    const start = at;
    at += line.length + 1;
    if (fence) {
      const lead = /^[ \t>]*/.exec(line)![0];
      const quotes = lead.split(">").length - 1;
      // A blank line, or in a quoted fence a line of only its quote marks.
      const blankLine = /^[ \t>]*\r?$/.test(line) && quotes >= fence.quotes;
      if (fence.nested && !blankLine && (lead.length < fence.col || quotes < fence.quotes)) return stop(start);
      const close = /^[ \t>]*(`{3,}|~{3,}|\${2,})[ \t]*\r?$/.exec(line)?.[1];
      if (!close || close[0] !== fence.char || close.length < fence.size) continue;
      if (fence.nested ? lead.length === fence.col && quotes === fence.quotes : lead.length <= 3 && quotes === 0) fence = null;
      else if (fence.nested) return stop(start);
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
    const kind = markerKind(line);
    const runStart = i === 0 || blank >= 0;
    if (runStart) {
      // A list's cuts hold if what follows its blank lines doesn't continue it (loosely).
      if (run?.list && !/^\s/.test(line) && kind !== run.list) cuts.push(...run.pending);
      const previousListy = run?.listy ?? false;
      run = { line: i, list: null, table: null, pending: [], listy: false };
      if (kind && !previousListy) run.list = kind;
      else if (profile !== "plain" && !kind && line.includes("|") && !/^[\s>]/.test(line)) {
        const delimiter = lines[i + 1];
        if (delimiter !== undefined && DELIMITER_ROW.test(delimiter) && cellCount(delimiter) === cellCount(line)) run.table = `${line}\n${delimiter}\n`;
      }
    } else if (run?.list) {
      // An item of the list may start a piece; an indented line continues an item; anything else: no cuts here.
      if (kind === run.list) run.pending.push({ at: start, join: "list" });
      else if (!/^\s/.test(line)) {
        run.list = null;
        run.pending = [];
      }
    } else if (run?.table) {
      // A body row after the first may start a piece; a line without a leading pipe may end the table.
      const row = i - run.line - 2;
      if (!line.startsWith("|")) run.table = null;
      else if (row >= 1) cuts.push({ at: start, join: "table", prefix: run.table });
    }
    if (run && (/^\s/.test(line) || kind)) run.listy = true;
    if (line.includes("]:")) {
      const def = DEFINITION.exec(line);
      const label = def?.[1]!.toLowerCase().replace(/\s+/g, " ").trim();
      const alone = runStart || DEFINITION.test(lines[i - 1] ?? "");
      if (!def || !alone || /^\s*["'(]/.test(lines[i + 1] ?? "") || labels.has(label!)) return whole;
      labels.add(label!);
      definitions.push(line.replace(/\r$/, ""));
    }
    if (blank > 0 && !/^(\s|[-+*](\s|$)|\d{1,9}[.)](\s|$))/.test(line)) cuts.push({ at: blank, join: "block" });
    blank = -1;
    // Fences, after any list markers and quote marks: backticks with no backtick after them,
    // tildes, and in TextContent `$$` with no `$` after it.
    const open = /^((?:[ \t>]|(?:[-+*]|\d{1,9}[.)])(?=[ \t]))*)(`{3,}[^`]*|~{3,}.*|\${2,}[^$]*)$/.exec(line);
    if (open && (open[2]![0] !== "$" || profile === "content")) {
      if (htmlUntilBlank) return stop(start);
      const marks = /^(`+|~+|\$+)/.exec(open[2]!)![1]!;
      const prefix = open[1]!;
      // Only a fence at column 0 is surely outside every list item.
      fence = { char: marks[0]!, size: marks.length, col: prefix.length, quotes: prefix.split(">").length - 1, nested: prefix !== "" };
      if (run) {
        // A fence in a list or table run: cut around it, not inside.
        run.list = run.table = null;
        run.pending = [];
      }
      continue;
    }
    const span = HTML_SPANS.find(([opens]) => opens.test(line));
    if (span) {
      if (!span[1].test(line.replace(span[0], ""))) html = span[1];
    } else if (/^ {0,3}<[/A-Za-z]/.test(line)) htmlUntilBlank = true;
  }
  if (run?.list) cuts.push(...run.pending);
  cuts.sort((a, b) => a.at - b.at);
  return { cuts, definitions: definitions.join("\n") };
}

/** Where markdownSplit cuts `text`. */
export function markdownCuts(text: string, profile: MarkdownProfile): number[] {
  return markdownSplit(text, profile).cuts.map((c) => c.at);
}

/** Characters a piece holds at most, where markdownSplit allows (a single block may be longer). */
const PIECE_CHARS = 2000;

const pieces = new Map<string, Root>();
const PIECE_CACHE_SIZE = 400;

/**
 * parseMarkdown in steps that each parse a bounded piece: the text is cut where
 * markdownSplit allows (into pieces of about PIECE_CHARS), each piece runs the pipeline
 * on its own (behind a table's header rows, with the document's link definitions), and
 * the trees are joined with positions moved to the whole text's, a list or table cut in
 * two merged back into one. The result equals parseMarkdown's (unless a piece was skipped:
 * skipPiece) and lands in its cache. The cuts are found in steps too (the first steps scan).
 * Pieces are cached too, so a response that grows while streaming parses only its new end.
 */
export class MarkdownParse {
  readonly key: string;
  /** The cut scan, until it is done; then the pieces' starts. */
  private splitting: Generator<void, Split, void> | null;
  private starts: Cut[] = [];
  private definitions = "";
  private readonly trees: Root[] = [];
  private result: Root | null = null;

  constructor(
    readonly text: string,
    readonly profile: MarkdownProfile,
    /** Characters a piece holds at most where it can be cut; tests cut at every allowed place. */
    private readonly pieceChars = PIECE_CHARS,
  ) {
    this.key = `${profile}\u0000${text}`;
    // Scanned by step(), not here: the parse is made in a render, which a long text's scan overruns.
    this.splitting = splitSteps(text, profile);
  }

  /** Scan the next SPLIT_LINES lines for cuts; once the scan is done, group the cuts into pieces. */
  private scan(): void {
    const next = this.splitting!.next();
    if (!next.done) return;
    this.splitting = null;
    const split = next.value;
    const starts: Cut[] = [{ at: 0, join: "block" }];
    let previous: Cut | null = null;
    for (const cut of [...split.cuts, { at: this.text.length, join: "block" as const }]) {
      if (cut.at - starts.at(-1)!.at > this.pieceChars && previous && previous.at > starts.at(-1)!.at) starts.push(previous);
      previous = cut;
    }
    this.starts = starts;
    this.definitions = starts.length > 1 ? split.definitions : "";
  }

  /** The parsed tree once every piece is in. */
  get tree(): Root | null {
    return this.result ?? cache.get(this.key) ?? null;
  }

  /** True while the next step scans for cuts rather than parsing a piece. */
  get scanning(): boolean {
    return this.splitting !== null && !this.tree;
  }

  private piece(i: number): string {
    const cut = this.starts[i]!;
    const body = this.text.slice(cut.at, this.starts[i + 1]?.at ?? this.text.length);
    return `${cut.prefix ?? ""}${body}${this.definitions ? `\n\n${this.definitions}\n` : ""}`;
  }

  /** Characters the next step parses (0 when done or scanning). */
  get nextSize(): number {
    if (this.tree || this.scanning) return 0;
    const i = this.trees.length;
    return (this.starts[i + 1]?.at ?? this.text.length) - this.starts[i]!.at;
  }

  /**
   * What the next step costs, in characters of prose: lines of fenced code count a
   * fiftieth (the parser only scans them), so a long fence doesn't look like a long text.
   */
  get nextCost(): number {
    if (this.tree || this.scanning) return 0;
    const i = this.trees.length;
    let cost = 0;
    let fence: string | null = null;
    for (const line of this.text.slice(this.starts[i]!.at, this.starts[i + 1]?.at ?? this.text.length).split("\n")) {
      const mark = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence && mark && mark[0] === fence[0] && mark.length >= fence.length) fence = null;
      else if (!fence && mark) fence = mark;
      else if (fence) {
        cost += (line.length + 1) / 50;
        continue;
      }
      cost += line.length + 1;
    }
    return cost;
  }

  /** Scan for cuts, or parse the next piece; after the last, join them. Returns the tree when done. */
  step(): Root | null {
    const done = this.tree;
    if (done) return done;
    if (this.splitting) {
      this.scan();
      return null;
    }
    const i = this.trees.length;
    const single = this.starts.length === 1;
    const piece = single ? this.text : this.piece(i);
    const pieceKey = `${this.profile}\u0000${piece}`;
    let tree = single ? undefined : pieces.get(pieceKey);
    if (!tree) {
      tree = single ? runPipeline(piece, this.profile) : (readyMarkdown(piece, this.profile) ?? runPipeline(piece, this.profile));
      if (!single) {
        pieces.set(pieceKey, tree);
        if (pieces.size > PIECE_CACHE_SIZE) pieces.delete(pieces.keys().next().value!);
      }
    }
    return this.add(tree);
  }

  /**
   * Don't parse the next piece: it joins as one paragraph of its literal source. For a piece
   * whose parse would pass what one task resume may run (budget.ts MAX_STEP_COST: one block
   * markdownSplit can't cut, such as a long table, which MarkDownRenderer reads as one
   * paragraph), so the rest of the text still parses.
   */
  skipPiece(): Root | null {
    const done = this.tree;
    if (done || this.scanning) return done;
    const cut = this.starts[this.trees.length]!;
    const prefix = cut.prefix ?? "";
    const body = this.text.slice(cut.at, this.starts[this.trees.length + 1]?.at ?? this.text.length);
    const value = body.trim();
    const lead = body.slice(0, body.length - body.trimStart().length);
    const lines = (s: string) => s.split("\n").length - 1;
    // Positions in the piece's own terms (behind its prefix), as the pipeline's would be: join() moves them.
    const offset = prefix.length + lead.length;
    const start = { line: 1 + lines(prefix + lead), column: lead.length - lead.lastIndexOf("\n"), offset };
    const end = { line: start.line + lines(value), column: value.includes("\n") ? value.length - value.lastIndexOf("\n") : start.column + value.length, offset: offset + value.length };
    const position = { start, end };
    const children: Root["children"] = value ? [{ type: "element", tagName: "p", properties: {}, children: [{ type: "text", value, position }], position }] : [];
    return this.add({ type: "root", children, position });
  }

  /** A piece's tree in; after the last, the joined tree. */
  private add(tree: Root): Root | null {
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
    this.trees.forEach((tree, i) => {
      const cut = this.starts[i]!;
      for (let k = prev; k < cut.at; k++) if (this.text.charCodeAt(k) === 10) line++;
      prev = cut.at;
      const prefix = cut.prefix ?? "";
      const moved = shifted(tree, line - (prefix.split("\n").length - 1), cut.at - prefix.length);
      let rest = moved.children;
      const last = children.at(-1);
      const first = rest[0];
      if (cut.join === "list" && last?.type === "element" && first?.type === "element" && last.tagName === first.tagName && /^[uo]l$/.test(last.tagName)) {
        // Items of one list: the first piece's list (its `start`) takes the next one's items.
        children[children.length - 1] = mergeChildren(last, first);
        rest = rest.slice(1);
      } else if (cut.join === "table" && last?.type === "element" && first?.type === "element" && last.tagName === "table" && first.tagName === "table") {
        const body = (t: typeof last) => t.children.find((c) => c.type === "element" && c.tagName === "tbody");
        const into = body(last);
        const from = body(first);
        if (into?.type === "element" && from?.type === "element") {
          const tbody = mergeChildren(into, from);
          children[children.length - 1] = { ...last, children: last.children.map((c) => (c === into ? tbody : c)), position: last.position && first.position && { start: last.position.start, end: first.position.end } };
          rest = rest.slice(1);
        }
      } else if (children.length && rest.length) children.push({ type: "text", value: "\n" });
      children.push(...rest);
    });
    // The root ends where the text does (pieces carry the definitions after their own text).
    const lines = this.text.split("\n");
    const end: Point = { line: lines.length, column: lines.at(-1)!.length + 1, offset: this.text.length };
    return { type: "root", children, position: { start: { line: 1, column: 1, offset: 0 }, end } };
  }
}

/** `a` with `b`'s children after its own (both start and end with a "\n" text: one is dropped), ending where `b` does. */
function mergeChildren<T extends Extract<Nodes, { type: "element" }>>(a: T, b: T): T {
  return { ...a, children: [...a.children, ...b.children.slice(1)], position: a.position && b.position && { start: a.position.start, end: b.position.end } };
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
