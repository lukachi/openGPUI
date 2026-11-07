// How a markdown block is cut into the pieces render.ts lays out, their margins, and
// when a block is drawn through gpui-kit's lazy `list` instead of in full. No gpui:
// the tests run this against parsed trees.
import type { Element as HastElement, ElementContent, Root, RootContent } from "hast";

/** Tags that are CSS blocks here: everything else flows inline. */
export const BLOCK = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "pre", "blockquote", "hr", "table", "section", "div"]);
const HEADING = /^h[1-6]$/;

export const isElement = (n: RootContent | ElementContent): n is HastElement => n.type === "element";
const isBlank = (n: RootContent | ElementContent) => n.type === "text" && n.value.trim() === "";

/** React's String(children) for a code element: its text. */
export function textOf(node: ElementContent | RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

/** The language markdown's `code` override would give a CodeBlock, or null for inline code. */
export function codeBlockLanguage(node: HastElement): string | null {
  const className = node.properties.className;
  const classes = Array.isArray(className) ? className.join(" ") : typeof className === "string" ? className : "";
  const match = /language-(\w+)/.exec(classes);
  if (match || (!classes && textOf(node).includes("\n"))) return match?.[1] ?? "text";
  return null;
}

/** A `pre`'s code element and its CodeBlock language, when it is drawn as a CodeBlock. */
export function preCode(pre: HastElement): { code: HastElement; language: string } | null {
  const code = pre.children.find(isElement);
  const language = code?.tagName === "code" ? codeBlockLanguage(code) : null;
  return code && language !== null ? { code, language } : null;
}

/**
 * One piece of a column of block children: a run of inline content (an anonymous
 * block box), or a block element with what its margins depend on: the tag of the
 * next block element (`+` sibling rules) and whether it is the last block element.
 */
export type BlockItem =
  | { kind: "inline"; nodes: ElementContent[] }
  | { kind: "block"; node: HastElement; next: string | undefined; last: boolean };

/** `nodes` as render.ts lays them out: block elements, and the inline runs between them (blank runs dropped). */
export function blockItems(nodes: ElementContent[]): BlockItem[] {
  const items: BlockItem[] = [];
  let run: ElementContent[] = [];
  const flush = () => {
    if (run.some((n) => !isBlank(n))) items.push({ kind: "inline", nodes: run });
    run = [];
  };
  for (const node of nodes) {
    if (isElement(node) && BLOCK.has(node.tagName)) {
      flush();
      items.push({ kind: "block", node, next: undefined, last: false });
    } else run.push(node);
  }
  flush();
  const blocks = items.filter((it): it is Extract<BlockItem, { kind: "block" }> => it.kind === "block");
  blocks.forEach((it, i) => {
    it.next = blocks[i + 1]?.node.tagName;
    it.last = i === blocks.length - 1;
  });
  return items;
}

/**
 * Markdown source one block may have and still be drawn in full on every render of its
 * view. Drawing costs about 2.7 ms per kilobyte in Herdr's engine (one element per word,
 * every frame) and a render is interrupted at about 50 ms; past this, the block's
 * top-level pieces go through a lazy list that builds only what is on screen. Each
 * markdown text draws in a view of its own (render/surface.ts), so this bounds a render.
 */
export const VIRTUAL_CHARS = 6_000;

/** How a markdown block is drawn: in full, or through a lazy list. */
export type BlockDraw = "full" | "virtual";

/** How a markdown block of `chars` source characters is drawn. */
export function virtualDecision(chars: number): BlockDraw {
  return chars > VIRTUAL_CHARS ? "virtual" : "full";
}

// ── Margins ──
// The margins render.ts's Markdown.block() gives each block (markDownRenderer.scss on
// top of Tailwind's preflight), computed from the tree alone: a lazy list's row needs
// its neighbour's margins without building that neighbour's elements.

export interface Margins {
  mt: number;
  mb: number;
}
interface Scope {
  inList: boolean;
  inLi: boolean;
}
const TOP: Scope = { inList: false, inLi: false };
const IN_LI: Scope = { inList: true, inLi: true };

function columnMargins(nodes: ElementContent[], scope: Scope, content: boolean): Margins {
  const items = blockItems(nodes);
  const margins = (it: BlockItem | undefined): Margins => (it?.kind === "block" ? blockMargins(it.node, scope, it, content) : { mt: 0, mb: 0 });
  return { mt: margins(items[0]).mt, mb: margins(items.at(-1)).mb };
}

function blockMargins(node: HastElement, scope: Scope, at: { next?: string; last: boolean }, content: boolean): Margins {
  const own = (mt: number, mb: number): Margins => ({ mt, mb: scope.inList && at.last ? 0 : mb });
  const tag = node.tagName;
  if (tag === "p") return own(0, at.next === "p" ? 18 : content && (at.next === "ol" || at.next === "ul") ? 8 : 0);
  if (HEADING.test(tag)) return own(0, at.next === "p" ? 8 : 18);
  if (tag === "ul" || tag === "ol") {
    // list(): the first item's top margin; the last item's bottom margin is always 0.
    const first = listItems(node)[0];
    const mt = first ? Math.max(scope.inLi ? 8 : 0, columnMargins(first.children, IN_LI, content).mt) : 0;
    return own(Math.max(scope.inLi ? 8 : 0, mt), tag === "ul" ? 24 : 20);
  }
  if (tag === "pre") return preCode(node) ? own(8, 0) : own(0, 0);
  if (tag === "blockquote") {
    const inner = columnMargins(node.children, scope, content);
    return own(Math.max(25, inner.mt), Math.max(25, inner.mb));
  }
  if (tag === "hr") return own(48, 48);
  if (tag === "table") return own(0, 20);
  const inner = columnMargins(node.children, tag === "li" ? IN_LI : scope, content);
  return own(inner.mt, inner.mb);
}

export const listItems = (node: HastElement) => node.children.filter(isElement).filter((c) => c.tagName === "li");

// ── Rows of a long block ──

/** A top-level list with more source than this is drawn one row per item. */
export const SPLIT_LIST_CHARS = 4_000;
/** A code fence with more source than this, or more lines than CODE_SPLIT_LINES, is drawn in line groups. */
export const CODE_SPLIT_CHARS = 4_000;
export const CODE_SPLIT_LINES = 120;
/**
 * A line group holds about this many lines and characters, and ends at a blank line where
 * one is near: highlighting and drawing a group stays well under 10 ms in the engine.
 */
export const CODE_GROUP_LINES = 16;
export const CODE_GROUP_CHARS = 800;
/** A table with more body rows than this is drawn in groups of this many rows (about 8 ms a group in the engine). */
export const TABLE_GROUP_ROWS = 25;

export type VirtualRow = { key: string; margins: Margins } & (
  | { kind: "item"; item: BlockItem }
  | { kind: "li"; node: HastElement; index: number }
  | { kind: "code"; node: HastElement; language: string; code: string; first: boolean; last: boolean }
  | { kind: "table"; node: HastElement; from: number; to: number; count: number; part: string }
);

/**
 * Where to cut `lines` into groups of about `maxLines` lines and `maxChars` characters:
 * a group ends at a blank line once it is full, or by half as much again at the latest.
 * Returns each group's first line index, then `lines.length`.
 */
export function lineGroups(lines: string[], maxLines: number, maxChars: number): number[] {
  const starts = [0];
  let size = 0;
  for (let i = 0; i < lines.length; i++) {
    const count = i - starts.at(-1)!;
    const full = count >= maxLines || size >= maxChars;
    const over = count >= maxLines * 1.5 || size >= maxChars * 1.5;
    if (count > 0 && ((full && lines[i - 1] === "") || over)) {
      starts.push(i);
      size = 0;
    }
    size += lines[i]!.length + 1;
  }
  starts.push(lines.length);
  return starts;
}

/** A table's rows (thead and tbody `tr`s, in order). */
export const tableRows = (table: HastElement) =>
  table.children.filter(isElement).flatMap((s) => (s.tagName === "tr" ? [s] : s.children.filter(isElement).filter((r) => r.tagName === "tr")));

/**
 * A long block's rows, each with its own margins (they collapse between rows as blocks()
 * collapses them): its top-level pieces, with a long list cut into its items, a long code
 * fence into line groups and a long table into row groups. A row's key is its source span
 * (and the part of it), so unchanged rows of a growing text keep their identity.
 */
export function virtualRows(tree: Root, profile: "plain" | "content"): VirtualRow[] {
  const content = profile === "content";
  return blockItems(tree.children as ElementContent[]).flatMap((item, k): VirtualRow[] => {
    const first = (item.kind === "block" ? item.node : item.nodes[0])?.position;
    const last = (item.kind === "block" ? item.node : item.nodes.at(-1))?.position;
    const start = first?.start.offset;
    const end = last?.end.offset;
    const key = start === undefined || end === undefined ? `i${k}` : `${start}-${end}`;
    const whole: VirtualRow = { kind: "item", item, key, margins: item.kind === "block" ? blockMargins(item.node, TOP, item, content) : { mt: 0, mb: 0 } };
    if (item.kind !== "block") return [whole];
    const node = item.node;
    const own = whole.margins;
    const chars = (end ?? 0) - (start ?? 0);
    if ((node.tagName === "ul" || node.tagName === "ol") && chars > SPLIT_LIST_CHARS) {
      const lis = listItems(node);
      return lis.map((li, index) => {
        const inner = columnMargins(li.children, IN_LI, content);
        const mb = index === lis.length - 1 ? own.mb : Math.max(8, inner.mb);
        return { kind: "li", node, index, key: `${key}-li${index}`, margins: { mt: index === 0 ? own.mt : Math.max(0, inner.mt), mb } };
      });
    }
    const pre = node.tagName === "pre" ? preCode(node) : null;
    if (pre) {
      const code = textOf(pre.code).trim();
      const lines = code.split("\n");
      if (code.length <= CODE_SPLIT_CHARS && lines.length <= CODE_SPLIT_LINES) return [whole];
      const starts = lineGroups(lines, CODE_GROUP_LINES, CODE_GROUP_CHARS);
      return starts.slice(0, -1).map((from, g) => ({
        kind: "code",
        node,
        language: pre.language,
        code: lines.slice(from, starts[g + 1]).join("\n"),
        first: g === 0,
        last: g === starts.length - 2,
        key: `${key}-c${from}`,
        margins: { mt: g === 0 ? own.mt : 0, mb: g === starts.length - 2 ? own.mb : 0 },
      }));
    }
    if (node.tagName === "table") {
      const count = tableRows(node).length - 1; // body rows
      if (count <= TABLE_GROUP_ROWS) return [whole];
      const groups: VirtualRow[] = [];
      for (let from = 0; from < count; from += TABLE_GROUP_ROWS) {
        const to = Math.min(count, from + TABLE_GROUP_ROWS);
        groups.push({ kind: "table", node, from, to, count, part: key, key: `${key}-t${from}`, margins: { mt: from === 0 ? own.mt : 0, mb: to === count ? own.mb : 0 } });
      }
      return groups;
    }
    return [whole];
  });
}

/** The source characters a row draws (what its call costs): its span, or its text without one. Table groups are bounded by TABLE_GROUP_ROWS. */
export function rowChars(row: VirtualRow): number {
  if (row.kind === "code") return row.code.length;
  if (row.kind === "table") return 0;
  if (row.kind === "item" && row.item.kind === "inline") return row.item.nodes.reduce((n, c) => n + textOf(c).length, 0);
  const node = row.kind === "li" ? listItems(row.node)[row.index]! : (row.item as Extract<BlockItem, { kind: "block" }>).node;
  const p = node.position;
  return p?.start.offset !== undefined && p.end.offset !== undefined ? p.end.offset - p.start.offset : textOf(node).length;
}
