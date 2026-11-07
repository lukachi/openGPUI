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
// (a grammar may extend earlier ones), WARM_SLICE_MS of them per resume, by the task
// of a view that shows a code block; until all are in (well under a second in a fresh
// Herdr window), code shows unhighlighted, then redraws. A grammar whose registration
// throws (`reason`: its insertBefore assigns `constructor`, which gpui-shell's frozen
// Object.prototype refuses) or the engine interrupted is skipped, and a watchdog redraws
// a view whose task died, which starts another. refractor itself costs about 13 ms
// per kilobyte there (30 with
// drawing): code up to INLINE_CHARS is highlighted where it is drawn (past
// HIGHLIGHT_MS of a render, one such block per render), longer code by a task of
// the view, a line group per step, the most recently drawn first; it shows plain
// until then. A CodeBlock past LONG_LINES or LONG_CHARS draws its line groups
// through a lazy list (markdown/lazy.ts) in a box as tall as the code or the
// viewport, whichever is less; each group scrolls sideways on its own. In a long
// markdown block's lazy list rows (render.ts virtualBlock), which allow no
// handlers, a block has no hover state and no copy button.
import type { ElementContent, RootContent } from "hast";
import { div, type Color, type Context, type Element } from "gpui-kit";
import { syntaxes } from "opengpui-prism-all";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light.js";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus.js";
import { refractor } from "refractor/core";
import { iconButton } from "../components/buttons.ts";
import type { RenderContext } from "../render/surface.ts";
import { cssColor } from "../render/tokens.ts";
import { CODE_GROUP_CHARS, CODE_GROUP_LINES, lineGroups } from "./blocks.ts";
import { edge, lazyRows } from "./lazy.ts";

let registered = 0;
/** How long one resume of the warming task registers grammars before it yields (a resume is interrupted at a few hundred ms). */
const WARM_SLICE_MS = 40;

type Spawned = Parameters<Parameters<Context["spawn"]>[0]>[0];

/** When each session's warming task last resumed: a session whose task stopped (killed) starts another. */
const warming = new WeakMap<RenderContext["session"], number>();
/** The views waiting for the grammars, per session: each redraws once they are all in. */
const warmWaiting = new WeakMap<RenderContext["session"], Map<object, () => void>>();
/** The grammar the last registration started on: if a task starts there again, that one was killed. */
let attempted = -1;

/** Redraw the views of `session` waiting for the grammars. */
function wakeWarmWaiting(session: RenderContext["session"]): void {
  const waiting = warmWaiting.get(session);
  if (!waiting) return;
  for (const wake of waiting.values()) wake();
  waiting.clear();
}

/**
 * Register refractor/all's next grammars, in its order, WARM_SLICE_MS per resume, until all are in;
 * then redraw the views waiting. Every session's task takes part through the shared count, so
 * a session that closes doesn't strand the others. gpui-shell interrupts a resume that runs too
 * long and the task dies with it: a grammar whose registration was interrupted (`tsx`, which
 * clones two large grammars, was in the engine) is skipped by the next task.
 */
async function warm(task: Spawned, session: RenderContext["session"]): Promise<void> {
  let slice = Date.now();
  while (registered < syntaxes.length) {
    warming.set(session, Date.now());
    if (attempted === registered) {
      console.log(`[opengpui] registering a grammar was interrupted; skipping it`);
      registered++;
      continue;
    }
    attempted = registered;
    try {
      refractor.register(syntaxes[registered]!);
    } catch (e) {
      console.log(`[opengpui] grammar ${registered} can't be registered here, skipping it: ${e}`);
    }
    registered++;
    if (Date.now() - slice >= WARM_SLICE_MS) {
      await task.sleep(16);
      slice = Date.now();
    }
  }
  warming.delete(session);
  wakeWarmWaiting(session);
}

/** Sessions with a watchdog: it redraws the waiting views while warming has stalled, which starts a new warming task. */
const watched = new WeakSet<RenderContext["session"]>();

/** Wait for the grammars in this view; start the session's warming task unless one is running (it resumed within the last second). */
function ensureWarm(ctx: RenderContext): void {
  const session = ctx.session;
  let waiting = warmWaiting.get(session);
  if (!waiting) warmWaiting.set(session, (waiting = new Map()));
  waiting.set(ctx.view, ctx.waker());
  const resumed = warming.get(session);
  if (resumed !== undefined && Date.now() - resumed < 1000) return;
  warming.set(session, Date.now());
  const watch = !watched.has(session);
  watched.add(session);
  ctx.after((cx) => {
    cx.spawn((task) => warm(task, session));
    if (watch) {
      cx.spawn(async (task) => {
        while (!highlightingReady()) {
          await task.sleep(1000);
          if (Date.now() - (warming.get(session) ?? 0) > 1000) wakeWarmWaiting(session);
        }
        watched.delete(session);
      });
    }
  });
}

const highlightingReady = () => registered === syntaxes.length;

/** True while code of `session` waits for grammars or for its highlighting task: it draws plain until then. */
export function highlightPending(session: RenderContext["session"]): boolean {
  return (warmWaiting.get(session)?.size ?? 0) > 0 || (jobs.get(session)?.queue.size ?? 0) > 0;
}

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

function remember(key: string, segments: Segment[]): void {
  highlighted.set(key, segments);
  if (highlighted.size > 400) highlighted.delete(highlighted.keys().next().value!);
}

/**
 * Past this much of a render, code not highlighted before waits for a later frame (see
 * budget.ts), except the first such block of each render: every render highlights at
 * least one, so a page whose render is always long still finishes, a block per frame.
 */
const HIGHLIGHT_MS = 20;
/**
 * refractor costs about 30 ms per kilobyte in gpui-shell's engine (measured: a 16-line,
 * 800-character group took 26 ms), so only code this short (about 9 ms) is highlighted in
 * the call that draws it; longer code is highlighted by a task of its view (highlightLater).
 */
const INLINE_CHARS = 300;
/**
 * What one task step highlights at most (about 30 ms; a 3,000-character step never finished
 * in a resume, so the step is well inside the budget): longer code is tokenized in line
 * groups (blocks.ts lineGroups) of this size, each on its own, so a token that spans a
 * group boundary (a block comment, a template string) restarts at it.
 */
const TASK_GROUP_LINES = 40;
const TASK_GROUP_CHARS = 1_000;
/** How often a session's highlighting task redraws the views whose code it finished. */
const REDRAW_MS = 250;
/** A session's highlighting task that hasn't resumed for this long was killed: a new one may start. */
const TASK_STALE_MS = 1000;
/** Code waiting for a session's highlighting task, newest last (drawn most recently: on screen). */
interface Job {
  code: string;
  language: string;
  lines: string[];
  starts: number[];
  /** The next group to highlight, and the segments of those done. */
  group: number;
  out: Segment[];
  failed?: boolean;
  /** The views that drew this code, and how to redraw each once it is highlighted. */
  waiting: Map<object, () => void>;
}
const jobs = new WeakMap<RenderContext["session"], { queue: Map<string, Job>; resumed: number | null; watched: boolean }>();
/** Per view, its render that last highlighted new code. */
const highlightedIn = new WeakMap<object, number>();
/** Jobs a session keeps waiting at most: past this, the least recently drawn are dropped (and asked again when drawn). */
const QUEUE_SIZE = 64;

function tokens(code: string, language: string): Segment[] | null {
  try {
    return flatten(refractor.highlight(code, language).children, [], []);
  } catch (e) {
    console.log(`[opengpui] highlighting ${language} failed: ${e}`);
    return null;
  }
}

/**
 * Queue `code` for the session's highlighting task, which takes the most recently drawn code
 * first, a line group per step, and redraws the views that drew each block once it is done.
 */
function highlightLater(ctx: RenderContext, key: string, code: string, language: string): void {
  let view = jobs.get(ctx.session);
  if (!view) jobs.set(ctx.session, (view = { queue: new Map(), resumed: null, watched: false }));
  const queue = view.queue;
  let job = queue.get(key);
  queue.delete(key);
  if (!job) {
    const lines = code.split("\n");
    job = { code, language, lines, starts: lineGroups(lines, TASK_GROUP_LINES, TASK_GROUP_CHARS), group: 0, out: [], waiting: new Map() };
  }
  job.waiting.set(ctx.view, ctx.waker());
  queue.set(key, job);
  if (queue.size > QUEUE_SIZE) queue.delete(queue.keys().next().value!);
  view.resumed = Date.now();
  const state = view;
  const watch = !view.watched;
  view.watched = true;
  ctx.after((cx) => {
    // The engine kills a resume that runs too long, and its task with it, silently: while code
    // waits and no task has resumed for a second, the watchdog redraws the views waiting, which
    // starts another.
    if (watch) {
      cx.spawn(async (task) => {
        while (queue.size) {
          await task.sleep(1000);
          if (queue.size && (state.resumed === null || Date.now() - state.resumed > TASK_STALE_MS)) {
            for (const waiting of queue.values()) for (const wake of waiting.waiting.values()) wake();
          }
        }
        state.watched = false;
      });
    }
    cx.spawn(async (task) => {
      let redrawn = Date.now();
      /** Views whose code finished since they last redrew. */
      const ready = new Set<() => void>();
      const redraw = () => {
        for (const wake of ready) wake();
        ready.clear();
      };
      try {
        while (queue.size) {
          // Each step in a resume of its own: the first would otherwise run inside the pump's call.
          await task.sleep(16);
          state.resumed = Date.now();
          const last = [...queue].at(-1);
          // Another task (a watchdog's restart) may have drained the queue during the sleep.
          if (!last) break;
          const [key, job] = last;
          const g = job.group;
          const group = job.lines.slice(job.starts[g], job.starts[g + 1]).join("\n");
          const found = tokens(group, job.language);
          job.group++; // after the work: a step the engine kills is redone by the next task
          if (g > 0) job.out.push({ text: "\n", classes: [] });
          job.out.push(...(found ?? plain(group)));
          if (!found) job.failed = true;
          if (job.group + 1 >= job.starts.length) {
            queue.delete(key);
            // A block a group of which failed shows plain, and is tried again when next drawn.
            if (!job.failed) remember(key, job.out);
            for (const wake of job.waiting.values()) ready.add(wake);
            // When the queue is empty, or a quarter second on, so a page of many blocks isn't redrawn per block.
            if (!queue.size || Date.now() - redrawn >= REDRAW_MS) {
              redrawn = Date.now();
              redraw();
            }
          }
        }
      } finally {
        state.resumed = null;
        redraw();
      }
    });
  });
}

/**
 * getCodeTree: refractor's tokens for a language it has registered, plain text otherwise
 * (react-syntax-highlighter's `registered` check). Kept per block (`mine`, its ctx.local)
 * and in a shared cache, so a page with more blocks than the cache holds never highlights
 * the same block twice. Short code is highlighted here (`budgeted`: within the render's
 * HIGHLIGHT_MS; a lazy list's row is a call of its own), longer code by the view's task,
 * plain until it is done. A highlight that throws shows plain and is not remembered.
 */
function highlight(ctx: RenderContext, mine: { key: string; segments: Segment[] | null }, code: string, language: string, budgeted: boolean): Segment[] {
  if (!language || language === "text" || !highlightingReady() || !refractor.registered(language)) return plain(code);
  const key = `${language}\u0000${code}`;
  if (mine.key === key && mine.segments) return mine.segments;
  let segments = highlighted.get(key);
  if (!segments) {
    if (code.length > INLINE_CHARS) {
      highlightLater(ctx, key, code, language);
      return plain(code);
    }
    if (budgeted && ctx.renderTime > HIGHLIGHT_MS && highlightedIn.get(ctx.view) === ctx.frame) {
      ctx.after(() => {}); // the view redraws, and its next render highlights more
      return plain(code);
    }
    highlightedIn.set(ctx.view, ctx.frame);
    const found = tokens(code, language);
    if (!found) return plain(code);
    segments = found;
    remember(key, segments);
  }
  mine.key = key;
  mine.segments = segments;
  return segments;
}

/**
 * A CodeBlock longer than this (lines, characters) draws its lines through a lazy list:
 * drawn whole and highlighted, 1,200 lines (33 KB) ran past a render's budget in the engine.
 */
const LONG_LINES = 150;
const LONG_CHARS = 6_000;
/** Where a host never told its viewport height, a long CodeBlock's box is at most this tall. */
const DEFAULT_VIEWPORT = 600;

const px = (value: string | undefined): number | undefined => (value?.endsWith("px") ? parseFloat(value) : undefined);
const families = (value: string | undefined) => (value ?? "monospace").split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));

/** What differs between CodeBlock inside MarkDownRenderer and CodeBlock on its own (genui-lib/CodeBlock). */
export interface CodeBlockOptions {
  /** The theme: MarkDownRenderer passes oneLight or vscDarkPlus by mode; a bare CodeBlock always gets vscDarkPlus. */
  theme?: "mode" | "dark";
  /** The box padding: markDownRenderer.scss forces 25px; a bare CodeBlock keeps its theme's (`1em`). */
  padding?: "markdown" | "theme";
  /**
   * Drawn in a lazy list's row (gpui-kit `list`), which allows no handlers: no hover
   * state and no copy button; the code still scrolls sideways natively.
   */
  static?: boolean;
  /**
   * One line group of a long fence in a lazy list (render.ts virtualBlock): only the first
   * group has the box's top padding and corners, only the last its bottom ones. Each group
   * scrolls sideways on its own.
   */
  edges?: { top: boolean; bottom: boolean };
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
  const local = ctx.local({ hovered: false, copied: false, highlight: { key: "", segments: null as Segment[] | null } }, part);
  if (language && language !== "text" && !highlightingReady()) ensureWarm(ctx);

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

  const regular = face(400);
  /** The lines of `segments`, one row per line; an empty line keeps its height. */
  const column = (segments: Segment[], text: string): Element => {
    const lines: Element[][] = [[]];
    for (const seg of segments) {
      const style = tokenStyle(seg.classes, theme);
      seg.text.split("\n").forEach((piece, i) => {
        if (i > 0) lines.push([]);
        if (piece) lines.at(-1)!.push(span(piece, style));
      });
    }
    // A browser draws no empty line after a final newline.
    if (text.endsWith("\n") && lines.length > 1) lines.pop();
    let body = div()
      .flex_none()
      .flex()
      .flex_col()
      .text_size(size)
      .line_height(lineHeight)
      .text_color(baseColor)
      .children(lines.map((spans) => div().flex().flex_row().whitespace_nowrap().min_h(size * lineHeight).children(spans)));
    if (regular) body = body.font_family(regular.family).font_weight(regular.weight);
    return body;
  };

  // An inline theme radius beats codeBlock.scss's 0.5rem; vscDarkPlus sets none.
  const length = (value: string | undefined): number | undefined =>
    value?.endsWith("em") ? parseFloat(value) * preSize : px(value);
  const radius = length(pre.borderRadius) ?? 8;
  const background: Color = cssColor(pre.background ?? pre.backgroundColor ?? "") ?? t.sunk;
  const pad = options.padding === "theme" ? (length(pre.padding) ?? 0) : 25;
  let highlighter: Element;
  const codeLines = code.replace(/\n$/, "").split("\n");
  if (!options.static && (codeLines.length > LONG_LINES || code.length > LONG_CHARS)) {
    // Long code: line groups (blocks.ts lineGroups) in a lazy list, in a box as tall as the code
    // or the host's viewport, whichever is less; each group highlights and scrolls sideways on its own.
    const starts = lineGroups(codeLines, CODE_GROUP_LINES, CODE_GROUP_CHARS);
    const groups = starts.length - 1;
    const height = Math.min(codeLines.length * size * lineHeight + 2 * pad, ctx.viewportHeight ?? DEFAULT_VIEWPORT);
    highlighter = div()
      .relative()
      .w_full()
      .h(height)
      .rounded(radius)
      .bg(background)
      .children(
        lazyRows(ctx, part, {
          count: groups,
          key: (g) => `g${starts[g]}`,
          row: (g) => {
            const text = codeLines.slice(starts[g], starts[g + 1]).join("\n");
            const row = div()
              .id(ctx.id(`${part}-g${starts[g]}`))
              .w_full()
              .flex()
              .flex_row()
              .overflow_x_scroll()
              .px(pad)
              .when(g === 0, (el) => el.pt(pad))
              .when(g === groups - 1, (el) => el.pb(pad))
              .child(column(highlight(ctx, { key: "", segments: null }, text, language, false), text));
            return edge(row, g, groups);
          },
        }),
      );
  } else {
    const edges = options.edges ?? { top: true, bottom: true };
    let box = div().id(ctx.id(`${part}-pre`)).flex().flex_row().overflow_x_scroll().px(pad).bg(background).child(column(highlight(ctx, local.highlight, code, language, !options.static), code));
    if (edges.top) box = box.pt(pad).rounded_t(radius);
    if (edges.bottom) box = box.pb(pad).rounded_b(radius);
    highlighter = box;
  }
  if (options.static) return div().relative().w_full().child(highlighter);

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
