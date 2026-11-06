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
// tree costs too (one element per word, every frame), so a long block, or one past
// what a render may draw in full, is drawn through a lazy list or plain (blockDraw).
// A parse step whose cost still passes what a task resume can run (one huge list
// item, say) is not attempted: that text stays its plain source (MAX_STEP_COST).
import type { Root } from "hast";
import type { Context } from "gpui-kit";
import type { RenderContext } from "../render/surface.ts";
import type { Session } from "../runtime/session.ts";
import { virtualDecision, type BlockDraw } from "./blocks.ts";
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
/**
 * A single step that costs more than this (MarkdownParse.nextCost, about 240 ms in the
 * engine at 20 ms per kilobyte; a resume is interrupted at about 300–600 ms) is not run:
 * its text draws as plain source, rather than an interrupted task leaving every later
 * text of the view unparsed.
 */
const MAX_STEP_COST = 12_000;
/** A drain whose last resume is older than this was killed: a new one may start. */
const DRAIN_STALE_MS = 1000;
/** What one pipeline run costs regardless of its length, in characters. */
const RUN_COST = 100;
/** How often a running queue redraws its view to show what is parsed so far. */
const REDRAW_MS = 250;

type Spawned = Parameters<Parameters<Context["spawn"]>[0]>[0];

/** Parses waiting per view (its session), by the render site that asked. */
const queues = new WeakMap<Session, Map<string, MarkdownParse>>();
/** When each view's drain last resumed. */
const running = new WeakMap<Session, number>();
/** Texts the pipeline threw on (the latest 50): they parse in render again, which reports the error as before. */
const failed = new Set<string>();
/** Texts with a step over MAX_STEP_COST (the latest 50): drawn as plain source. */
const oversize = new Set<string>();
const note = (set: Set<string>, key: string) => {
  set.add(key);
  if (set.size > 50) set.delete(set.values().next().value!);
};
/** Markdown characters each view drew in full in its current render. */
const drawn = new WeakMap<Session, { frame: number; chars: number }>();
/** The tree each render site drew last, with its text's key, per view. */
type Shown = Map<string, { key: string; tree: Root }>;
const shown = new WeakMap<Session, Shown>();

/**
 * How this render draws a markdown text of `chars` characters (blocks.ts virtualDecision),
 * counting what the view's render already drew in full. Counted in document order, so the
 * same blocks go virtual or plain every frame.
 */
export function blockDraw(ctx: RenderContext, chars: number): BlockDraw {
  let drawnNow = drawn.get(ctx.session);
  if (!drawnNow || drawnNow.frame !== ctx.frame) drawn.set(ctx.session, (drawnNow = { frame: ctx.frame, chars: 0 }));
  const decision = virtualDecision(drawnNow.chars, chars);
  drawnNow.chars = decision.spent;
  return decision.draw;
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
  if (oversize.has(key)) return null;
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
  const resumed = running.get(ctx.session);
  if (resumed === undefined || Date.now() - resumed > DRAIN_STALE_MS) {
    running.set(ctx.session, Date.now());
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
      running.set(session, Date.now());
      for (const [site, parse] of queue) {
        let threw = false;
        if (!parse.tree && parse.nextCost > MAX_STEP_COST) {
          console.log(`[opengpui] markdown too long to parse in one step (${Math.round(parse.nextCost)}): drawn as text`);
          note(oversize, parse.key);
          queue.delete(site);
          continue;
        }
        while (!parse.tree && (spent === 0 || spent + RUN_COST + parse.nextSize <= STEP_CHARS) && parse.nextCost <= MAX_STEP_COST) {
          spent += RUN_COST + parse.nextSize;
          try {
            parse.step();
          } catch (e) {
            console.log(`[opengpui] markdown parse failed: ${e}`);
            note(failed, parse.key);
            threw = true;
            break;
          }
        }
        const tree = parse.tree;
        if (tree) sites.set(site, { key: parse.key, tree });
        if (tree || threw) queue.delete(site);
        else if (parse.nextCost > MAX_STEP_COST) {
          note(oversize, parse.key);
          queue.delete(site);
        }
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
