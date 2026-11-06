import { describe, expect, test } from "bun:test";
import type { Element, Root, RootContent } from "hast";
import { MarkdownParse, markdownCuts, parseMarkdown, plainParagraph, runPipeline } from "./lib.ts";

const PROFILES = ["plain", "content", "inline"] as const;

function elements(node: Root | RootContent, tag: string, out: Element[] = []): Element[] {
  if (node.type === "element" && node.tagName === tag) out.push(node);
  if ("children" in node) for (const child of node.children) elements(child, tag, out);
  return out;
}

function text(node: Root | RootContent): string {
  if (node.type === "text") return node.value;
  return "children" in node ? node.children.map(text).join("") : "";
}

describe("parseMarkdown", () => {
  test("MarkDownRenderer is plain CommonMark: no GFM tables or strikethrough", () => {
    const tree = parseMarkdown("| a | b |\n|---|---|\n| 1 | 2 |\n\n~~gone~~", "plain");
    expect(elements(tree, "table")).toHaveLength(0);
    expect(elements(tree, "del")).toHaveLength(0);
  });

  test("TextContent adds GFM, but a single tilde is not strikethrough", () => {
    const tree = parseMarkdown("| a |\n|---|\n| 1 |\n\n~$886K and ~~struck~~", "content");
    expect(elements(tree, "table")).toHaveLength(1);
    expect(elements(tree, "del").map(text)).toEqual(["struck"]);
  });

  test("TextContent breaks lines on newlines and keeps single-dollar text", () => {
    const tree = parseMarkdown("one\ntwo costs $5 and $6", "content");
    expect(elements(tree, "br")).toHaveLength(1);
    expect(elements(tree, "code")).toHaveLength(0);
  });

  test("citations become marked spans in TextContent and Text, not in MarkDownRenderer", () => {
    const marked = (profile: "plain" | "content" | "inline") =>
      elements(parseMarkdown("Claim [1][2] here", profile), "span").filter((s) => s.properties["data-component-type"] === "citation");
    expect(marked("content").map((s) => s.properties["data-citation-indices"])).toEqual(["1,2"]);
    expect(marked("inline")).toHaveLength(1);
    expect(marked("plain")).toHaveLength(0);
  });

  test("raw HTML stays literal text and unsafe link protocols are emptied, as react-markdown does", () => {
    const tree = parseMarkdown("<b>x</b> [a](javascript:alert(1)) [b](https://ok.example) [c](/relative)", "plain");
    expect(elements(tree, "b")).toHaveLength(0);
    expect(text(tree)).toContain("<b>x</b>");
    expect(elements(tree, "a").map((a) => a.properties.href)).toEqual(["", "https://ok.example", "/relative"]);
  });
});

describe("plainParagraph (the fast path for plain strings)", () => {
  const plain = [
    "",
    "Hello world",
    "Revenue",
    "$48,200",
    "+4.1%",
    "99.9% up",
    "-5% vs last week",
    "1,204",
    "2024",
    "Q1",
    "212 ms",
    "Something to know.",
    "As on your badge",
    "Costs $5 and $6",
    "Done (3/4)",
    "a = b",
    "Hello, world! What's new? \"Quoted\" {braces}",
    "ünïcödé — dashes – and “quotes”",
    "日本語のテキスト",
    "a  b   c",
    "C# and F#",
    "x: y",
  ];
  const markup = [
    " leading",
    "trailing ",
    "two\nlines",
    "tab\there",
    "**bold**",
    "_em_",
    "`code`",
    "~~del~~",
    "[1] cited",
    "[link](x)",
    "<b>html</b>",
    "a &amp; b",
    "back\\slash",
    "| a | b |",
    "# Heading",
    "> quote",
    "- item",
    "+ item",
    "1. item",
    "2) item",
    "---",
    "===",
    "see www.example.com",
    "https://example.com",
    "mail me@example.com",
    "😀 emoji",
    "\uFEFFbom",
  ];

  test("for every string it accepts, the tree equals the full pipeline's, in each profile", () => {
    for (const profile of PROFILES) {
      for (const text of plain) {
        const fast = plainParagraph(text, profile);
        expect({ text, profile, accepted: fast !== null }).toEqual({ text, profile, accepted: true });
        expect(fast).toStrictEqual(runPipeline(text, profile));
      }
    }
  });

  test("it leaves anything that may be markup to the pipeline", () => {
    for (const profile of PROFILES) {
      for (const text of markup) expect({ text, profile, fast: plainParagraph(text, profile) }).toEqual({ text, profile, fast: null });
    }
    expect(plainParagraph("$$x$$", "content")).toBeNull();
    expect(plainParagraph("$$x$$", "inline")).toStrictEqual(runPipeline("$$x$$", "inline"));
  });

  test("a recognized string still gives the pipeline's tree through parseMarkdown", () => {
    expect(parseMarkdown("Hello world", "plain")).toStrictEqual(runPipeline("Hello world", "plain"));
  });
});

describe("MarkdownParse (a long text parsed in pieces)", () => {
  const section = (i: number) =>
    `## Section ${i}\n\nSome **bold** text [${i}] with a [link](https://x.y) and \`code\`, see www.example.com.\nA second line.\n\n` +
    `- one\n- two\n\n  continued item\n- three\n\n1. first\n2. second\n\n> quoted\n> more\n\n| a | b |\n|---|---|\n| ${i} | ~~x~~ |\n\n` +
    "```ts\nconst a = 1;\n\nconst b = 2;\n```\n\n" +
    "~~~\nfence\n\n```\nstill fence\n~~~\n\n" +
    "    indented code\n\n    still indented\n\n" +
    "$$\nx^2\n\ny\n$$\n\n" +
    "Setext\n---\n\n***\n\nTrailing paragraph with $5.\n\n\n";
  const docs = [
    Array.from({ length: 4 }, (_, i) => section(i)).join(""),
    "- loose\n\n- list\n\nafter\n\n* other\n\n10) ordered\n\n11) more\n\nend",
    "text\r\n\r\nwindows lines\r\n\r\n- x\r\n\r\ny\r\n",
    "One [ref] here.\n\nLater.\n\n[ref]: https://example.com",
    "<div>\n\nhtml block\n\n</div>\n\nafter",
    "```\nunclosed fence\n\nstill code",
    "para\n\n\n\n   three spaces in\n\nlast",
    // Review B1: `$$x$$` is inline math, not a fence opener; `$$` is a fence only in TextContent.
    "$$x$$\n\n$$\na\n\nb\n$$\n\nend",
    "$$\n\n```\na\n$$\n\nb\n```\n\nend",
    // Review B2: `<` lines and `]:` inside code don't stop cutting; HTML blocks that span blank lines aren't cut.
    "intro\n\n```tsx\n<div>\n\n  <span/>\n</div>\n```\n\nmiddle\n\n```ts\ntype M = { [key: string]: number };\n\nconst m: M = {};\n```\n\nend",
    "a\n\n<pre>\nkeep\n\nthis\n</pre>\n\nb\n\n<!-- a\n\ncomment -->\n\nc\n\n<?php\n\n?>\n\nd",
    // Review N1: an unclosed fence in a list item ends where the item does.
    "- a\n    ```\n\npara\n",
    // A long document with a definition stays whole.
    `${Array.from({ length: 3 }, (_, i) => section(i)).join("")}[ref]: https://example.com\n\nSee [ref].`,
    // Fences inside list items: cut after one that closes at its column; after one that may not, nothing is cut.
    "1. Run:\n   ```bash\n   npm i\n\n   npm t\n   ```\n\nnext\n\n- ```\n  x\n\n```\nreal fence\n\nstill\n```\n\nend",
    // Tight top-level lists are cut between items, and the pieces' lists merge back (an ordered one keeps its start).
    "Intro\n\n- a **b**\n- c\n  continued\n  - nested\n- d\n\nafter",
    "5. five\n6. six\n7. seven\n\n8) other list\n9) more\n\nend",
    "- x\n- y\n* other bullet\n* z\n\n- loose\n\n- items\n- here\n\ntail",
    "- a\n- b\n  ```\n  code\n  ```\n- c\n\n  indented after blank\n- d",
    // Table bodies are cut between rows; each piece is parsed behind the header and delimiter rows.
    "| h | i |\n|:--|--:|\n| 1 | **2** |\n| 3 | `4` |\n| 5 | 6 |\n| 7 | 8 |\n\nafter the table\n\n| x |\n|---|\n| y |\nlazy row\n| z |",
    "| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n> quote ends it\n| 5 | 6 |",
    // Link definitions go with every piece; footnotes and repeated labels keep the text whole.
    "See [one] and [two][t].\n\n- [one] in a list\n- and [two][t]\n\n| [one] | x |\n|---|---|\n| [two][t] | y |\n| z | w |\n\n[one]: https://one.example\n[t]: https://two.example \"Two\"\n\nLast [one].",
    "Text [^1] here.\n\nMore.\n\n[^1]: A footnote.",
    "[a]: https://first\n\nUse [a].\n\n[A]: https://second",
    "para\n[x]: not-a-definition\n\n[x] stays text",
  ];

  test("cut at every place it may, the joined tree equals parsing the whole text", () => {
    for (const profile of PROFILES) {
      for (const text of docs) {
        const parse = new MarkdownParse(text, profile, 1);
        let tree = null;
        for (let i = 0; i < 1000 && !tree; i++) tree = parse.step();
        expect({ profile, text, tree }).toStrictEqual({ profile, text, tree: runPipeline(text, profile) });
      }
    }
  });

  test("a long document is cut; definitions, HTML spans and fences keep it whole where needed", () => {
    const firstLines = (text: string, profile: (typeof PROFILES)[number]) =>
      markdownCuts(text, profile).map((at) => text.slice(at).trimStart().split("\n")[0]);
    expect(markdownCuts(docs[0]!, "content").length).toBeGreaterThan(20);
    // One-line definitions after a blank line don't keep a document whole.
    expect(firstLines(docs[3]!, "content")).toEqual(["Later.", "[ref]: https://example.com"]);
    expect(markdownCuts(docs[12]!, "content").length).toBeGreaterThan(10);
    expect(markdownCuts(docs[5]!, "content")).toEqual([]);
    // Never before a list item or indented line, which could continue the block above.
    expect(firstLines(docs[1]!, "content")).toEqual(["after", "end"]);
    // `$$` fences only in TextContent, and never `$$x$$`.
    expect(firstLines(docs[7]!, "content")).toEqual(["$$", "end"]);
    expect(firstLines(docs[8]!, "content")).toEqual(["b"]);
    expect(firstLines(docs[8]!, "plain")).toEqual(["```", "end"]);
    expect(firstLines(docs[13]!, "plain")).toEqual(["next"]);
    // Code holding `<` lines or `]:` is still cut around; HTML kinds 1–5 are not cut inside.
    expect(firstLines(docs[9]!, "plain")).toEqual(["```tsx", "middle", "```ts", "end"]);
    expect(firstLines(docs[10]!, "plain")).toEqual(["<pre>", "b", "<!-- a", "c", "<?php", "d"]);
    // Inside tight top-level lists, before each item of the list's marker kind; not in a loose list or one an indented block follows.
    expect(firstLines(docs[14]!, "content")).toEqual(["- c", "- d", "after"]);
    // A list right after another list's blank lines may continue it: not cut inside.
    expect(firstLines(docs[15]!, "content")).toEqual(["6. six", "7. seven", "end"]);
    // A second list in the same run (another bullet) stops the cuts; a loose list is not cut.
    expect(firstLines(docs[16]!, "content")).toEqual(["tail"]);
    expect(markdownCuts(docs[17]!, "content")).toEqual([]);
    // Table rows from the second body row, up to a line without a leading pipe; no table rows in MarkDownRenderer.
    expect(firstLines(docs[18]!, "content")).toEqual(["| 3 | `4` |", "| 5 | 6 |", "| 7 | 8 |", "after the table", "| x |"]);
    expect(firstLines(docs[18]!, "plain")).toEqual(["after the table", "| x |"]);
    expect(firstLines(docs[19]!, "content")).toEqual(["| 3 | 4 |"]);
    // A document with one-line definitions is cut anyway (the equality test above parses it in pieces).
    expect(markdownCuts(docs[20]!, "content").length).toBeGreaterThan(3);
    // Footnotes, a repeated label, and a `]:` line inside a paragraph keep the text whole.
    expect(markdownCuts(docs[21]!, "content")).toEqual([]);
    expect(markdownCuts(docs[22]!, "content")).toEqual([]);
    expect(markdownCuts(docs[23]!, "content")).toEqual([]);
  });
});
