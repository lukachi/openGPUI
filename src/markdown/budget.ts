// Keeps markdown work inside gpui-shell's per-call budget.
//
// gpui-shell interrupts a JS call that runs about 50 ms, and an interrupted call
// can leave the engine unable to draw any view. In that engine the markdown
// pipeline costs about a millisecond per short string and 20 ms per kilobyte, so
// the first render of a long response cannot parse all of its markdown. A render
// therefore gets a tree only when it costs nothing (cached, or plain text: parse.ts
// readyMarkdown) or is short and the render is still young; anything else is
// queued, the caller draws the text plain, and a task of the view parses the queue
// in bounded steps (MarkdownParse) across ticks, then redraws. Drawing a parsed
// tree costs too (one element per word, every frame), so one render draws at most
// FORMATTED_CHARS of markdown formatted (formattedCount).
import type { Root } from "hast";
import type { Context } from "gpui-kit";
import type { RenderContext } from "../render/surface.ts";
import type { Session } from "../runtime/session.ts";
import { MarkdownParse, parseMarkdown, readyMarkdown, type MarkdownProfile } from "./parse.ts";

/** A render parses a text itself only while it is younger than this… */
const SYNC_MS = 8;
/** …and only a text this short (the pipeline costs about 20 ms per kilobyte in the engine). */
const SYNC_CHARS = 300;
/**
 * Characters a task resume parses (about 80 ms). A resume may run longer than a
 * render: 300 ms passed where a render was interrupted at 60. Counted, not timed:
 * a loop bounded by Date.now still ran into the interrupt (markdown/code.ts). One
 * step always runs, so a single block longer than this still parses whole.
 */
const STEP_CHARS = 4000;
/** What one pipeline run costs regardless of its length, in characters. */
const RUN_COST = 100;
/** How often a running queue redraws its view to show what is parsed so far. */
const REDRAW_MS = 250;
/**
 * Characters of markdown source one render draws formatted. Drawing costs about 3 ms
 * per kilobyte in the engine (one element per word, every frame); a top-level block
 * that doesn't fit in what is left draws as plain text (markdownBlock), so a long
 * response stays under the interrupt. Counted in document order, so the same blocks
 * fall back every frame. Temporary: a later slice virtualizes long markdown.
 */
const FORMATTED_CHARS = 6_000;

type Spawned = Parameters<Parameters<Context["spawn"]>[0]>[0];

/** Parses waiting per view (its session), by the render site that asked. */
const queues = new WeakMap<Session, Map<string, MarkdownParse>>();
const running = new WeakSet<Session>();
/** Texts the pipeline threw on (the latest 50): they parse in render again, which reports the error as before. */
const failed = new Set<string>();
/** Formatted characters each view drew in its current render. */
const drawn = new WeakMap<Session, { frame: number; chars: number }>();
/** The tree each render site drew last, with its text's key, per view. */
type Shown = Map<string, { key: string; tree: Root }>;
const shown = new WeakMap<Session, Shown>();

/**
 * Which of `nodes` (a markdown block's top-level children) this render draws formatted:
 * each that fits in what is left of FORMATTED_CHARS for the whole render, which it
 * spends. A block that doesn't fit is drawn plain, and later blocks may still fit.
 * Temporary: a later slice virtualizes long markdown with gpui-kit's list().
 */
export function formattedBlocks(ctx: RenderContext, nodes: Root["children"], size: (node: Root["children"][number]) => number): boolean[] {
  let spent = drawn.get(ctx.session);
  if (!spent || spent.frame !== ctx.frame) drawn.set(ctx.session, (spent = { frame: ctx.frame, chars: 0 }));
  const budget = spent;
  return nodes.map((node) => {
    const chars = node.position ? (node.position.end.offset ?? 0) - (node.position.start.offset ?? 0) : size(node);
    if (budget.chars + chars > FORMATTED_CHARS) return false;
    budget.chars += chars;
    return true;
  });
}

/**
 * The tree for `text`, or what to draw while it is parsed later: the tree this render
 * site showed last (a streaming response's text a chunk behind), else null (draw the
 * text plain). `part` names the site; a newer text at a site replaces the one waiting.
 * A site keeps its own tree, so the shared cache evicting it never starts work again.
 */
export function markdownTree(ctx: RenderContext, part: string, text: string, profile: MarkdownProfile): Root | null {
  const site = ctx.id(part);
  let sites = shown.get(ctx.session);
  if (!sites) shown.set(ctx.session, (sites = new Map()));
  let queue = queues.get(ctx.session);
  const key = `${profile}\u0000${text}`;
  const mine = sites.get(site);
  if (mine?.key === key) return mine.tree;
  const tree =
    readyMarkdown(text, profile) ??
    (failed.has(key) || (text.length <= SYNC_CHARS && ctx.renderTime < SYNC_MS) ? parseMarkdown(text, profile) : null);
  if (tree) {
    queue?.delete(site);
    sites.set(site, { key, tree });
    return tree;
  }
  if (!queue) queues.set(ctx.session, (queue = new Map()));
  if (queue.get(site)?.key !== key) queue.set(site, new MarkdownParse(text, profile));
  if (!running.has(ctx.session)) {
    running.add(ctx.session);
    const session = ctx.session;
    const done = sites;
    ctx.after((cx) => cx.spawn((task) => drain(task, session, queue, done)));
  }
  return mine?.tree ?? null;
}

async function drain(task: Spawned, session: Session, queue: Map<string, MarkdownParse>, sites: Shown): Promise<void> {
  let redrawn = Date.now();
  try {
    while (queue.size) {
      let spent = 0;
      for (const [site, parse] of queue) {
        let threw = false;
        while (!parse.tree && (spent === 0 || spent + RUN_COST + parse.nextSize <= STEP_CHARS)) {
          spent += RUN_COST + parse.nextSize;
          try {
            parse.step();
          } catch (e) {
            console.log(`[opengpui] markdown parse failed: ${e}`);
            failed.add(parse.key);
            if (failed.size > 50) failed.delete(failed.values().next().value!);
            threw = true;
            break;
          }
        }
        const tree = parse.tree;
        if (tree) sites.set(site, { key: parse.key, tree });
        if (tree || threw) queue.delete(site);
        if (spent + RUN_COST > STEP_CHARS) break;
      }
      await task.sleep(16);
      if (queue.size && Date.now() - redrawn >= REDRAW_MS) {
        redrawn = Date.now();
        task.notify();
      }
    }
  } finally {
    running.delete(session);
  }
  task.notify();
}
