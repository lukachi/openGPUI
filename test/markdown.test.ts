import { describe, expect, test } from "bun:test";
import type { Element, Root, RootContent } from "hast";
import { parseMarkdown } from "./lib.ts";

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
