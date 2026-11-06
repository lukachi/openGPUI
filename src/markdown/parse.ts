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
import type { Root } from "hast";
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

/**
 * The hast tree react-ui's renderer for `profile` would turn into React elements.
 * Trees are cached by text (a hover redraws every markdown block); callers must not mutate them.
 */
export function parseMarkdown(text: string, profile: MarkdownProfile): Root {
  const key = `${profile}\u0000${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
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
  cache.set(key, tree);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return tree;
}
