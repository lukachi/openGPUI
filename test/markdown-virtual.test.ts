import { describe, expect, test } from "bun:test";
import type { ElementContent } from "hast";
// Pure tree logic, run from source: it imports no gpui and nothing the build compiles.
import { blockItems, CODE_GROUP_LINES, MIN_VIRTUAL_CHARS, RENDER_CHARS, TABLE_GROUP_ROWS, VIRTUAL_CHARS, virtualDecision, virtualRows, type VirtualRow } from "../src/markdown/blocks.ts";
import { parseMarkdown } from "./lib.ts";

const shape = (text: string, profile: "plain" | "content") =>
  blockItems(parseMarkdown(text, profile).children as ElementContent[]).map((it) =>
    it.kind === "inline" ? { inline: it.nodes.map((n) => (n.type === "text" ? n.value : n.type)).join("") } : { tag: it.node.tagName, next: it.next, last: it.last },
  );

describe("blockItems: the rows of a long markdown block", () => {
  test("one item per top-level block, in order, without the blank text between them", () => {
    expect(shape("# Title\n\nText\n\n- a\n- b\n\n```ts\nx\n```\n\n> quote\n\n---", "content")).toEqual([
      { tag: "h1", next: "p", last: false },
      { tag: "p", next: "ul", last: false },
      { tag: "ul", next: "pre", last: false },
      { tag: "pre", next: "blockquote", last: false },
      { tag: "blockquote", next: "hr", last: false },
      { tag: "hr", next: undefined, last: true },
    ]);
  });

  test("raw HTML between blocks is its own inline row, and `next` skips it as the + selector does", () => {
    // react-markdown turns raw HTML into literal text: a top-level text node, an anonymous block box.
    expect(shape("Para\n\n<div>raw</div>\n\n- item", "plain")).toEqual([
      { tag: "p", next: "ul", last: false },
      { inline: "\n<div>raw</div>\n" },
      { tag: "ul", next: undefined, last: true },
    ]);
  });

  test("a text of only blank lines has no rows", () => {
    expect(shape("\n\n   \n", "plain")).toEqual([]);
  });
});

describe("virtualDecision: how markdown blocks draw within a render", () => {
  // A small deterministic generator: block sizes from tiny to well past VIRTUAL_CHARS.
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

  test("for any sequence of blocks, what one render draws in full stays within RENDER_CHARS", () => {
    for (let render = 0; render < 2000; render++) {
      let spent = 0;
      let full = 0;
      const blocks = Array.from({ length: 1 + Math.floor(next() * 40) }, () => Math.floor(next() ** 3 * 3 * VIRTUAL_CHARS));
      for (const chars of blocks) {
        const d = virtualDecision(spent, chars);
        if (d.draw === "full") full += chars;
        if (d.draw === "virtual") expect(chars > VIRTUAL_CHARS || chars >= MIN_VIRTUAL_CHARS).toBe(true);
        if (d.draw === "plain") expect(chars).toBeLessThan(MIN_VIRTUAL_CHARS);
        spent = d.spent;
      }
      expect(full).toBeLessThanOrEqual(RENDER_CHARS);
      expect(spent).toBe(full);
    }
  });

  test("a block longer than VIRTUAL_CHARS goes virtual whatever was spent; one that fits is drawn in full", () => {
    expect(virtualDecision(0, VIRTUAL_CHARS + 1).draw).toBe("virtual");
    expect(virtualDecision(RENDER_CHARS, VIRTUAL_CHARS * 5).draw).toBe("virtual");
    expect(virtualDecision(0, Math.min(VIRTUAL_CHARS, RENDER_CHARS)).draw).toBe("full");
  });

  test("past the ceiling, a block too short for a scroll region draws plain", () => {
    expect(virtualDecision(RENDER_CHARS, MIN_VIRTUAL_CHARS - 1).draw).toBe("plain");
    expect(virtualDecision(RENDER_CHARS, MIN_VIRTUAL_CHARS).draw).toBe("virtual");
  });
});

describe("virtualRows: rows and their margins", () => {
  const rows = (text: string, profile: "plain" | "content" = "content") => virtualRows(parseMarkdown(text, profile), profile);
  /** The space between consecutive rows, as virtualBlock collapses it. */
  const gaps = (list: VirtualRow[]) => list.slice(1).map((r, i) => Math.max(list[i]!.margins.mb, r.margins.mt));
  const longList = (marker: (i: number) => string, items = 200) =>
    Array.from({ length: items }, (_, i) => `${marker(i)} item ${i} with some words to make the list long enough to split`).join("\n");

  test("a long list's item rows are spaced as list() spaces its items, and the list's own margins sit at its ends", () => {
    for (const [tag, marker, end] of [
      ["ul", () => "-", 24],
      ["ol", (i: number) => `${i + 1}.`, 20],
    ] as const) {
      const text = `Before.\n\n${longList(marker)}\n\nAfter.`;
      const split = rows(text);
      const items = split.filter((r) => r.kind === "li");
      expect({ tag, items: items.length }).toEqual({ tag, items: 200 });
      // p before a list: 8 in TextContent; li + li: 8; the list's bottom margin before the paragraph.
      expect(gaps(split)).toEqual([8, ...Array(199).fill(8), end]);
      // The same list too short to split is one row with the margins its first and last items carry.
      const whole = rows(`Before.\n\n${longList(marker, 3)}\n\nAfter.`);
      expect(whole.map((r) => r.kind)).toEqual(["item", "item", "item"]);
      expect([whole[1]!.margins.mt, whole[1]!.margins.mb]).toEqual([items[0]!.margins.mt, items.at(-1)!.margins.mb]);
    }
  });

  test("an item holding a nested list keeps the 8px item spacing", () => {
    const text = Array.from({ length: 120 }, (_, i) => `- item ${i} with enough words to make it long\n  - nested ${i}`).join("\n");
    expect(new Set(gaps(rows(text)))).toEqual(new Set([8]));
  });

  test("long fences and tables are cut into groups that carry the block's margins at their ends only", () => {
    const code = "```ts\n" + Array.from({ length: 300 }, (_, i) => `const v${i} = ${i};`).join("\n") + "\n```";
    const table = "| a | b |\n|---|---|\n" + Array.from({ length: 100 }, (_, i) => `| ${i} | x |`).join("\n");
    const split = rows(`${code}\n\n${table}\n\nEnd.`);
    const codes = split.filter((r) => r.kind === "code");
    const tables = split.filter((r) => r.kind === "table");
    // 300 lines with no blank line: groups end at 1.5 × CODE_GROUP_LINES (or the character limit).
    expect(codes.length).toBeGreaterThanOrEqual(Math.ceil(300 / (1.5 * CODE_GROUP_LINES)));
    expect(codes.map((r) => r.kind === "code" && r.code).join("\n")).toBe(code.slice(6, -4));
    expect(codes.map((r) => r.margins)).toEqual(codes.map((_, i) => ({ mt: i === 0 ? 8 : 0, mb: 0 })));
    const groups = Math.ceil(100 / TABLE_GROUP_ROWS);
    expect(tables.map((r) => r.kind === "table" && [r.from, r.to])).toEqual(
      Array.from({ length: groups }, (_, g) => [g * TABLE_GROUP_ROWS, Math.min(100, (g + 1) * TABLE_GROUP_ROWS)]),
    );
    expect(tables.map((r) => r.margins)).toEqual(tables.map((_, g) => ({ mt: 0, mb: g === groups - 1 ? 20 : 0 })));
  });

  test("keys are unique, and rows that didn't change keep theirs while the text grows", () => {
    const base = `# Title\n\nIntro.\n\n${longList(() => "-", 150)}\n\n| a | b |\n|---|---|\n${Array.from({ length: 90 }, (_, i) => `| ${i} | y |`).join("\n")}\n\nText.`;
    const before = rows(base);
    const after = rows(`${base}\n\nA paragraph that streamed in.\n\nAnd another one.`);
    expect(new Set(after.map((r) => r.key)).size).toBe(after.length);
    // Everything up to the last row of the shorter text (the paragraph that grows) is the same.
    expect(after.slice(0, before.length - 1).map((r) => r.key)).toEqual(before.slice(0, -1).map((r) => r.key));
  });
});
