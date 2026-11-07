// Keeps markdown work inside gpui-shell's per-call budget.
//
// gpui-shell interrupts a JS call that runs about 50 ms, and an interrupted call
// can leave the engine unable to draw any view. In that engine the markdown
// pipeline costs about a millisecond per short string and 20 ms per kilobyte, so
// the first render of a long text cannot parse it. A render therefore gets a tree
// only when it costs nothing (cached, or plain text: parse.ts readyMarkdown) or is
// short and the render is still young; anything else is queued, the caller draws the
// text plain, and a task parses the queue in bounded steps (MarkdownParse) across
// ticks, then redraws the views that asked. Each markdown text draws in a view of its
// own (TextContent, MarkDownRenderer, Callout, a step's details: render/surface.ts),
// so a page of many texts never adds up in one render; a long text is drawn through a
// lazy list (blocks.ts virtualDecision). A piece whose parse still passes what a task
// resume can run (one block markdownSplit can't cut: a long table in MarkDownRenderer,
// one huge list item) is not attempted: that block draws as its literal text and the
// rest of the text parses (MAX_STEP_COST, MarkdownParse.skipPiece).
import type { Root } from "hast";
import type { Context } from "gpui-kit";
import type { RenderContext } from "../render/surface.ts";
import type { Session } from "../runtime/session.ts";
import { MarkdownParse, parseMarkdown, readyMarkdown, type MarkdownProfile } from "./parse.ts";

/** A render parses a text itself only while its view's render is younger than this… */
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
 * its block draws as literal text, rather than an interrupted task leaving every later
 * text of the view unparsed.
 */
const MAX_STEP_COST = 12_000;
/** A drain whose last resume is older than this was killed: a new one may start. */
const DRAIN_STALE_MS = 1000;
/** What one pipeline run costs regardless of its length, in characters. */
const RUN_COST = 100;
/** How often a running queue redraws the views whose texts it parsed so far. */
const REDRAW_MS = 250;

type Spawned = Parameters<Parameters<Context["spawn"]>[0]>[0];

/** A text waiting for the drain, and how to redraw the view that asked for it. */
interface Waiting {
  parse: MarkdownParse;
  wake: () => void;
}

/** Parses waiting per session, by the render site that asked. */
const queues = new WeakMap<Session, Map<string, Waiting>>();
/** When each session's drain last resumed. */
const running = new WeakMap<Session, number>();
/** Texts the pipeline threw on (the latest 50): they parse in render again, which reports the error as before. */
const failed = new Set<string>();
const note = (set: Set<string>, key: string) => {
  set.add(key);
  if (set.size > 50) set.delete(set.values().next().value!);
};
/** The tree each render site drew last, with its text's key, per session. */
type Shown = Map<string, { key: string; tree: Root }>;
const shown = new WeakMap<Session, Shown>();

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
  const waiting = queue.get(site);
  if (waiting?.parse.key === key) waiting.wake = ctx.waker();
  else queue.set(site, { parse: new MarkdownParse(text, profile), wake: ctx.waker() });
  const resumed = running.get(ctx.session);
  if (resumed === undefined || Date.now() - resumed > DRAIN_STALE_MS) {
    running.set(ctx.session, Date.now());
    const session = ctx.session;
    const done = sites;
    ctx.after((cx) => cx.spawn((task) => drain(task, session, queue, done)));
  }
  return mine?.tree ?? null;
}

/** True while texts of `session` wait for the drain: their views draw them plain until it parses them. */
export function markdownPending(session: Session): boolean {
  return (queues.get(session)?.size ?? 0) > 0;
}

async function drain(task: Spawned, session: Session, queue: Map<string, Waiting>, sites: Shown): Promise<void> {
  let redrawn = Date.now();
  /** Views whose texts parsed since they last redrew. */
  const ready = new Set<() => void>();
  const redraw = () => {
    for (const wake of ready) wake();
    ready.clear();
  };
  try {
    while (queue.size) {
      let spent = 0;
      running.set(session, Date.now());
      for (const [site, { parse, wake }] of queue) {
        let threw = false;
        while (!parse.tree) {
          // A cut scan step (MarkdownParse) gets a resume to itself: its cost isn't in characters parsed.
          // A piece too costly for one resume joins as its literal text (skipPiece), which costs little.
          const oversize = !parse.scanning && parse.nextCost > MAX_STEP_COST;
          const cost = parse.scanning ? STEP_CHARS : oversize ? RUN_COST : RUN_COST + parse.nextSize;
          if (spent > 0 && spent + cost > STEP_CHARS) break;
          spent += cost;
          try {
            if (oversize) {
              console.log(`[opengpui] markdown block too long to parse in one step (${parse.nextSize} characters): drawn as text`);
              parse.skipPiece();
            } else parse.step();
          } catch (e) {
            console.log(`[opengpui] markdown parse failed: ${e}`);
            note(failed, parse.key);
            threw = true;
            break;
          }
        }
        const tree = parse.tree;
        if (tree) sites.set(site, { key: parse.key, tree });
        if (tree || threw) {
          queue.delete(site);
          ready.add(wake);
        }
        if (spent + RUN_COST > STEP_CHARS) break;
      }
      await task.sleep(16);
      if (queue.size && Date.now() - redrawn >= REDRAW_MS) {
        redrawn = Date.now();
        redraw();
      }
    }
  } finally {
    running.delete(session);
  }
  redraw();
}
