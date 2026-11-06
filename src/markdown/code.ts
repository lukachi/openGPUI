// react-ui components/CodeBlock (CodeBlock.tsx, codeBlock.scss) as markdown draws it.
//
// Upstream highlights with react-syntax-highlighter 16's Prism build, which is
// refractor/all with the theme MarkDownRenderer picks: oneLight, or vscDarkPlus
// in dark mode. The same grammars and the same theme objects are used here;
// a token's style merges the theme entries for every combination of its class
// names, as react-syntax-highlighter's createStyleObject does. The box takes the
// theme's `pre` style, then markDownRenderer.scss's `!important` padding (25px)
// and react-ui's 0.5rem radius where the theme sets none. The copy button shows
// on hover, copies, and turns to a success check for a second.
//
// refractor/all registers its ~300 grammars at import; gpui-shell's engine
// interrupts that while loading a mod. They are registered in the same order
// (a grammar may extend earlier ones), two per frame, by the task of a view
// that shows a code block; until all are in (about 3 s), code shows
// unhighlighted, then redraws.
import type { Element as HastElement, ElementContent, RootContent } from "hast";
import { div, type Color, type Context, type Element } from "gpui-kit";
import { syntaxes } from "opengpui-prism-all";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light.js";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus.js";
import { refractor } from "refractor/core";
import { iconButton } from "../components/buttons.ts";
import type { RenderContext } from "../render/surface.ts";
import { cssColor } from "../render/tokens.ts";

let registered = 0;

/**
 * Grammars per resume. gpui-shell interrupts a call that runs too long, and an
 * interrupted engine stops rendering every view; a loop bounded by elapsed time
 * (Date.now) still ran into that, so the bound is a count.
 */
const PER_TICK = 2;

type Spawned = Parameters<Parameters<Context["spawn"]>[0]>[0];

/**
 * Register refractor/all's next grammars, in its order, until all are in. Every
 * waiting code block's task takes part through the shared count, so a view that
 * closes doesn't strand the others.
 */
async function warm(task: Spawned): Promise<void> {
  while (registered < syntaxes.length) {
    for (let i = 0; i < PER_TICK && registered < syntaxes.length; i++) refractor.register(syntaxes[registered++]!);
    await task.sleep(16);
  }
}

const highlightingReady = () => registered === syntaxes.length;

type Style = Record<string, string>;
type Theme = Record<string, Style>;

/** react-syntax-highlighter powerSetPermutations: k-permutations of the first four classes, k = 1..n. */
function classCombinations(classes: string[]): string[] {
  const items = classes.slice(0, 4);
  const out: string[] = [];
  for (let k = 1; k <= items.length; k++) {
    const walk = (prefix: number[]) => {
      if (prefix.length === k) {
        out.push(prefix.map((i) => items[i]).join("."));
        return;
      }
      for (let i = 0; i < items.length; i++) if (!prefix.includes(i)) walk([...prefix, i]);
    };
    walk([]);
  }
  return out;
}

/** createStyleObject: the theme entries for every class combination, later ones winning. */
function tokenStyle(classes: string[], theme: Theme): Style {
  return Object.assign({}, ...classCombinations(classes.filter((c) => c !== "token")).map((c) => theme[c] ?? {}));
}

interface Segment {
  text: string;
  classes: string[];
}

/** flattenCodeTree: text with the class names of every element above it. */
function flatten(nodes: (ElementContent | RootContent)[], classes: string[], out: Segment[]): Segment[] {
  for (const node of nodes) {
    if (node.type === "text") out.push({ text: node.value, classes });
    else if (node.type === "element") {
      const own = node.properties.className;
      flatten(node.children, [...classes, ...(Array.isArray(own) ? own.map(String) : [])], out);
    }
  }
  return out;
}

const highlighted = new Map<string, Segment[]>();
const plain = (code: string): Segment[] => [{ text: code, classes: [] }];

/** getCodeTree: refractor's tokens for a known language, plain text otherwise. Cached once grammars are in. */
function highlight(code: string, language: string): Segment[] {
  if (!language || language === "text" || !highlightingReady()) return plain(code);
  const key = `${language}\u0000${code}`;
  let segments = highlighted.get(key);
  if (!segments) {
    try {
      segments = flatten(refractor.highlight(code, language).children, [], []);
    } catch {
      segments = plain(code); // a language refractor doesn't know: plain text, as upstream
    }
    highlighted.set(key, segments);
    if (highlighted.size > 100) highlighted.delete(highlighted.keys().next().value!);
  }
  return segments;
}

const px = (value: string | undefined): number | undefined => (value?.endsWith("px") ? parseFloat(value) : undefined);
const families = (value: string | undefined) => (value ?? "monospace").split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));

/** What differs between CodeBlock inside MarkDownRenderer and CodeBlock on its own (genui-lib/CodeBlock). */
export interface CodeBlockOptions {
  /** The theme: MarkDownRenderer passes oneLight or vscDarkPlus by mode; a bare CodeBlock always gets vscDarkPlus. */
  theme?: "mode" | "dark";
  /** The box padding: markDownRenderer.scss forces 25px; a bare CodeBlock keeps its theme's (`1em`). */
  padding?: "markdown" | "theme";
}

/**
 * The CodeBlock for `code`. `inheritedSize` is the font size the block sits in
 * (a theme without a font size inherits it).
 */
export function codeBlock(
  ctx: RenderContext,
  part: string,
  code: string,
  language: string,
  inheritedSize: number,
  options: CodeBlockOptions = {},
): Element {
  const t = ctx.t;
  const theme = (options.theme === "dark" || t.mode === "dark" ? vscDarkPlus : oneLight) as Theme;
  const pre = theme['pre[class*="language-"]'] ?? {};
  const codeTag = { ...theme['code[class*="language-"]'], ...theme[`code[class*="language-${language}"]`] };
  const local = ctx.local({ hovered: false, copied: false, waiting: false }, part);
  if (language && language !== "text" && !highlightingReady() && !local.waiting) {
    local.waiting = true;
    ctx.after((cx) => {
      cx.spawn(async (view) => {
        await warm(view);
        local.waiting = false;
        view.notify();
      });
    });
  }

  const preSize = px(pre.fontSize) ?? inheritedSize;
  const size = px(codeTag.fontSize) ?? preSize;
  const lineHeight = parseFloat(codeTag.lineHeight ?? "1.5");
  const tab = " ".repeat(Number(codeTag.tabSize ?? 2));
  const face = (weight: number) => t.fonts?.(families(codeTag.fontFamily), size, weight);
  const baseColor = cssColor(codeTag.color ?? "") ?? t.textNeutralPrimary;

  const span = (text: string, style: Style): Element => {
    const bold = style.fontWeight === "bold" || Number(style.fontWeight) >= 600;
    let el = div().child(text.replace(/\t/g, tab));
    const color = style.color ? cssColor(style.color) : null;
    if (color) el = el.text_color(color);
    const bg = style.background ? cssColor(style.background) : null;
    if (bg) el = el.bg(bg);
    if (style.fontStyle === "italic") el = el.italic();
    if (bold) {
      const resolved = face(700);
      el = el.font_weight(resolved?.weight ?? 700);
      if (resolved) el = el.font_family(resolved.family);
    }
    return el;
  };

  // One row per line; an empty line keeps its height.
  const lines: Element[][] = [[]];
  for (const seg of highlight(code, language)) {
    const style = tokenStyle(seg.classes, theme);
    seg.text.split("\n").forEach((piece, i) => {
      if (i > 0) lines.push([]);
      if (piece) lines.at(-1)!.push(span(piece, style));
    });
  }
  // A browser draws no empty line after a final newline.
  if (code.endsWith("\n") && lines.length > 1) lines.pop();
  const regular = face(400);
  let body = div()
    .flex_none()
    .flex()
    .flex_col()
    .text_size(size)
    .line_height(lineHeight)
    .text_color(baseColor)
    .children(lines.map((spans) => div().flex().flex_row().whitespace_nowrap().min_h(size * lineHeight).children(spans)));
  if (regular) body = body.font_family(regular.family).font_weight(regular.weight);

  // An inline theme radius beats codeBlock.scss's 0.5rem; vscDarkPlus sets none.
  const length = (value: string | undefined): number | undefined =>
    value?.endsWith("em") ? parseFloat(value) * preSize : px(value);
  const radius = length(pre.borderRadius) ?? 8;
  const background: Color = cssColor(pre.background ?? pre.backgroundColor ?? "") ?? t.sunk;
  const highlighter = div()
    .id(ctx.id(`${part}-pre`))
    .flex()
    .flex_row()
    .overflow_x_scroll()
    .p(options.padding === "theme" ? (length(pre.padding) ?? 0) : 25)
    .rounded(radius)
    .bg(background)
    .child(body);

  // CodeBlock.tsx draws lucide's `<Copy />` at its default size 24; the 16px `.openui-icon-button-icon`
  // span squeezes the svg (a flex item) to 16, as the reference renderer measures.
  const copy = iconButton(ctx, {
    id: ctx.id(`${part}-copy`),
    icon: local.copied ? "CheckCheck" : "Copy",
    variant: "secondary",
    size: "small",
    onClick: (cx) => {
      cx.write_to_clipboard(code);
      local.copied = true;
      cx.notify();
      cx.timer.after(1000, (later) => {
        local.copied = false;
        later.notify();
      });
    },
  });
  return div()
    .id(ctx.id(`${part}-wrap`))
    .relative()
    .w_full()
    .on_hover((hovered, cx) => {
      if (local.hovered !== hovered) {
        local.hovered = hovered;
        cx.notify();
      }
    })
    .child(highlighter)
    .child(
      div()
        .absolute()
        .top(8)
        .right(8)
        .opacity(local.hovered ? 1 : 0)
        .transition("opacity", { duration: 200, easing: "ease-in-out" })
        .child(local.copied ? copy.text_color(t.textSuccessPrimary).bg(t.successBackground) : copy),
    );
}

/** The language markdown's `code` override would give a CodeBlock, or null for inline code. */
export function codeBlockLanguage(node: HastElement): string | null {
  const className = node.properties.className;
  const classes = Array.isArray(className) ? className.join(" ") : typeof className === "string" ? className : "";
  const match = /language-(\w+)/.exec(classes);
  if (match || (!classes && textOf(node).includes("\n"))) return match?.[1] ?? "text";
  return null;
}

/** React's String(children) for a code element: its text. */
export function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}
