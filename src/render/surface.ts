// Draws a Session with gpui-kit elements, split into retained views.
//
// gpui-shell splits work by phase: `render` may only describe elements, while
// retained native state (InputState, timers, nested views, …) needs a live call
// (init, an event handler or a task). A Surface therefore runs one long-lived task
// per host view, the pump: when the session or a render asked for it, it brings the
// session up to date, runs queued actions, creates the nested views and retained state
// renders asked for, runs deferred work, and notifies the views whose content changed.
// Render stays a pure description.
//
// Scope. An async `cx` acts for whichever call is running when it is used, and the
// continuation of a plain JS promise runs inside whichever call drains QuickJS's job
// queue: another view's render or handler, or another application's. So the pump never
// awaits a promise resolved from elsewhere: `wake()` only sets a flag, and the pump's task,
// spawned from the host's init, awaits nothing but its own `cx.sleep`, which resumes in
// the host's scope. Everything it creates (views, retained state, tasks and timers of
// deferred work) is owned by the host, and it notifies each view by entity.
//
// Views. The response root, every component that sets `view: true` (costly or
// stateful ones: markdown, charts, tables, inputs, …), every overlay and every
// piece (RenderContext.piece) is a nested gpui view of its own (`cx.new`), so a
// state change redraws only its view and gpui-shell's per-call budget applies to
// each view's render, not to the whole response. A view is identified by its node's
// RenderContext key, so locals, retained state and element ids keep theirs. A view
// asked for the first time draws as an empty placeholder until the pump created it
// (one frame per level of nesting).
//
// Invalidation. After each update the pump indexes the evaluated tree by value path
// (invalidate.ts) and notifies each view whose node now differs by value from the one
// it last drew; ancestors differ too and gpui redraws them first, so each parent hands
// its children their new node before they draw. What else a render reads is tracked
// per view (fields, validation errors, streaming, the viewport height, images; see
// RenderContext.watch) and compared on every pump resume. Work a render defers
// (after, wake, timers in deferred work) redraws the view that asked.
import type { ElementNode } from "@openuidev/lang-core";
import { h_flex } from "gpui-base";
import {
  div,
  svg,
  View,
  type AsyncContext,
  type Context,
  type Element,
  type Entity,
  type FocusHandle,
  type Task,
  type Timer,
  type ViewClass,
} from "gpui-kit";
import type { FieldRegistration, FormValidation, Session } from "../runtime/session.ts";
import { highlightPending } from "../markdown/code.ts";
import { markdownPending } from "../markdown/budget.ts";
import { withScheduler, type Scheduler } from "../upstream/timers.ts";
import { iconFile } from "./icons.ts";
import type { ImageLoader, ImageState } from "./images.ts";
import { indexTree, sameValue, type CompareMemo, type TreeIndex } from "./invalidate.ts";
import { ICON_SIZE, lucideSvg, type IconWriter, type StrokeWidth } from "./lucide.ts";
import { resolveTokens, type Tokens } from "./tokens.ts";

/** What a renderer returns: an element, a nested view, text, several of them, or nothing. */
export type Rendered = Element | Entity | string | Rendered[] | null;

/** `[el]`, or nothing for null: for `.children(...)` with an optional part. */
export function optional<T>(el: T | null | undefined): T[] {
  return el == null ? [] : [el];
}

/** Props as the evaluator hands them over: typed by the component's zod schema upstream. */
export type Props = Record<string, any>;

export interface Component {
  render(props: Props, ctx: RenderContext, node: ElementNode): Rendered;
  /**
   * Draw this component in a retained view of its own: its render must return one element
   * (or null), placed by its parent as a child without being restyled or inspected. For
   * components whose render costs grow with their content or that own state that redraws
   * often (hover, measuring, typing, loads). Inline when it fills a slot of a component with inlineChildren.
   */
  view?: boolean;
  /** The nodes it renders directly (its slots) draw inline in its view, not in views of their own: it restyles them (a card block). What they hold draws as anywhere else. */
  inlineChildren?: boolean;
}

export type Components = Record<string, Component>;

/** Native state a render asked for; the pump creates it. */
export interface RetainedSpec<S extends { release?(): unknown }, M> {
  /** Kind of state: a key reused for another kind gets a fresh one. */
  kind: string;
  /** Current props for handlers; refreshed on every render. */
  meta: M;
  /** Runs in the pump, a live phase: `cx` may create native state (`cx.focus_handle()`, …). */
  create(entry: RetainedEntry<S, M>, cx: Context): S;
}

export interface RetainedEntry<S, M> {
  kind: string;
  meta: M;
  state: S;
}

interface Scope {
  formName?: string;
  /**
   * How the card blocks (components/cards) restyle the text of the components they
   * hold, as their scss does for descendants: `ellipsis` keeps a plain line on one row
   * ending in "…", `end` right-aligns a text block, `composite` is CompositeCardBlock's
   * inline markdown override. Inherited by every child context.
   */
  cardText?: { ellipsis?: boolean; end?: boolean; composite?: boolean };
  /** Nodes rendered here draw inline (a card block's slots); their own children don't inherit it. */
  inline?: boolean;
}

/** What an overlay draws: `el` covers the host's area; `focus` gets the keyboard while it is the topmost overlay with one. */
export type OverlayContent = { el: Element; focus?: FocusHandle | null } | null;
/** An overlay's drawing (RenderContext.overlay). */
export type OverlayDraw = (o: RenderContext) => OverlayContent;

/** The host's visible content box, in window coordinates. */
export interface PaneBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
interface Point2 {
  x: number;
  y: number;
}

/** The validation registry of the enclosing form, as a render uses it: its reads and registrations belong to the view. */
export interface FormAccess {
  getFieldError(name: string): string | undefined;
  validateField(name: string, value: unknown, rules: FieldRegistration["rules"]): boolean;
  registerField(name: string, rules: FieldRegistration["rules"], getValue: () => unknown): void;
  clearFieldError(name: string): void;
  validateForm(): boolean;
}

/** How long a src seen while streaming must stay unchanged, without a new chunk, before it loads. */
const STABLE_MS = 150;
/** What a src that waits for its string to settle draws as. */
const WAITING: ImageState = { status: "loading" };
/** How long one pump resume runs deferred work before leaving the rest to the next (a resume is interrupted at about 300–600 ms). */
const DEFERRED_MS = 150;
/** How often the pump looks whether it was asked to run: one resume per tick while idle. */
const TICK_MS = 16;
/** What Session.triggerAction takes as an action. */
type ActionArg = Parameters<Session["triggerAction"]>[2];

type ViewKind = "host" | "node" | "overlay" | "piece";

interface TrackedRead {
  read: () => unknown;
  last: unknown;
}

/** One retained view: the host, a node drawn in a view of its own, an overlay, or a piece. */
export class ViewRecord {
  private static next = 1;
  readonly id = ViewRecord.next++;
  entity: Entity | null = null;
  released = false;
  /** The view whose latest render mounted this one (an overlay's owner). */
  parent: ViewRecord | null = null;
  /** For a node: the node to draw, and the one its last render drew. */
  node: ElementNode | null = null;
  drawnNode: ElementNode | null = null;
  /** The node's value path in the evaluated tree (invalidate.ts), when it has one. */
  path: string | null = null;
  /** An overlay's drawing; a piece's, and its input with the one its last render drew. */
  overlayDraw: OverlayDraw | null = null;
  pieceDraw: ((o: RenderContext) => Element) | null = null;
  input: unknown = undefined;
  drawnInput: unknown = undefined;
  /** An overlay's place in the stack, what its last render returned. */
  order = 0;
  shown = true;
  focus: FocusHandle | null = null;

  // Per render: what the latest render of this view asked for.
  frame = 0;
  started = 0;
  rendering = false;
  wanted = new Map<string, RetainedSpec<any, any>>();
  images = new Set<string>();
  mounted = new Set<ViewRecord>();
  /** Views mounted by earlier renders since the pump last looked: released unless mounted again. */
  dropped = new Set<ViewRecord>();
  reads: TrackedRead[] = [];
  fields = new Map<FieldRegistration, { form: FormValidation; name: string }>();
  /** What the render in progress tracks and registers: they replace `reads` and `fields` once it returns. */
  nextReads: TrackedRead[] = [];
  nextFields = new Map<FieldRegistration, { form: FormValidation; name: string }>();
  /** Notified by the pump and not drawn since; or asked to redraw at the pump's next resume. */
  notified = false;
  dirty = false;
  /** The host's frame when the pump created or notified it, until it draws: see Surface.awaitingDraw. */
  waitFrom: number | null = null;

  constructor(
    readonly kind: ViewKind,
    /** Its key among the surface's views. */
    readonly key: string,
    /** The RenderContext key its render draws with (an overlay's or a piece's owner's). */
    readonly ctxKey: string,
    public scope: Scope,
  ) {}
}

/** Views by id, for RecordView: gpui hands a nested view only its props. */
const records = new Map<number, { surface: Surface; record: ViewRecord }>();

/** A nested view drawing one ViewRecord; the pump creates and notifies it. */
class RecordView extends View {
  private id = 0;

  init(props: Record<string, unknown> | undefined): void {
    this.id = Number(props?.id);
  }

  render(): Element | Entity | string {
    const found = records.get(this.id);
    if (!found || found.record.released) return div().hidden();
    return found.surface.renderRecord(found.record);
  }
}

export class Surface {
  readonly session: Session;
  tokens: Tokens;
  readonly components: Components;
  /** @internal */ readonly iconWriter: IconWriter | null;
  /** @internal lucide icon file name (lucideSvg) → where the host wrote it. */
  readonly icons = new Map<string, { status: "loading" } | { status: "ready"; path: string } | { status: "failed" }>();
  /** @internal */ readonly imageLoader: ImageLoader | null;
  /** @internal */ readonly images = new Map<string, ImageState>();
  /** @internal */ readonly imagesWaiting = new Map<string, { revision: number; settled: boolean }>(); // first asked while streaming
  /** @internal */ retainedEntries = new Map<string, RetainedEntry<any, any>>();
  /** @internal */ deferred: { fn: (cx: Context) => void; owner: ViewRecord }[] = [];
  /** @internal */ local = new Map<string, object>();
  /** @internal */ viewportHeight: number | null = null;
  /** @internal */ readonly host = new ViewRecord("host", "", "n", {});
  /** @internal */ readonly views = new Map<string, ViewRecord>();
  /** @internal */ index: TreeIndex = indexTree(null);
  private indexed: ElementNode | null = null;
  private overlayCount = 0;
  private overlayTop: FocusHandle | null = null;
  /** What the host drew last: its chrome redraws when this changes. */
  private hostSeen: unknown = null;
  /**
   * Called when the surface becomes idle (true: nothing left to draw for what the session
   * holds now; no view waits for a parse, a highlight, an image or deferred work) and when it
   * stops being idle. A host may report it, e.g. so a screenshot waits for it.
   */
  onIdle: ((idle: boolean) => void) | null = null;
  private idle: boolean | null = null;
  private closed = false;
  private pending = false;
  /** Actions handlers asked for (RenderContext.trigger): run from the pump, in the host's scope. */
  private actions: { label: string; formName: string | undefined; action: ActionArg }[] = [];
  private readonly timers = new Set<Task>();
  /** Views whose entity gpui refused to release: tried again at every tick until it lets go. */
  private readonly unreleased = new Set<ViewRecord>();

  /**
   * `tokens`: see resolveTokens(); OpenUI's light theme when omitted.
   * `icons`: writes a lucide icon's SVG to a file `svg()` draws (render/lucide.ts); omitted, icons are not drawn.
   * `images`: turns an image `src` into a local asset (render/images.ts); omitted, images fail.
   */
  constructor(options: { session: Session; components: Components; tokens?: Tokens; icons?: IconWriter; images?: ImageLoader }) {
    this.session = options.session;
    this.components = options.components;
    this.tokens = options.tokens ?? resolveTokens("light");
    this.iconWriter = options.icons ?? null;
    this.imageLoader = options.images ?? null;
  }

  /** New tokens redraw every view (the host draws first, so they read the new ones). */
  setTokens(tokens: Tokens): void {
    if (tokens === this.tokens || sameValue(tokens, this.tokens)) return;
    this.tokens = tokens;
    for (const rec of this.views.values()) rec.dirty = true;
    this.wake();
  }

  /**
   * The height of the host's scrolling area that shows the content, inside its padding:
   * a long markdown block is a scroll region this tall (markdown/render.ts). Hosts that
   * don't tell get a default. The views that read it redraw.
   */
  setViewportHeight(height: number): void {
    if (this.viewportHeight === height) return;
    this.viewportHeight = height;
    this.wake();
  }

  /**
   * The host's visible content box in window coordinates, learned from a pointer event on the host's
   * non-scrolling content wrapper (`notePane`), for overlays that must stay inside it (a calendar that
   * flips above its field, a chart tooltip); null until the pointer has been over it.
   * @internal
   */
  pane: PaneBox | null = null;

  /** A pointer event on the host's content wrapper (a move or a press): its box is `bounds` at `position - local_position`. */
  notePane(e: { position: Point2; local_position?: Point2; bounds?: { width: number; height: number } }): void {
    if (!e.bounds || !e.local_position) return;
    const left = e.position.x - e.local_position.x;
    const top = e.position.y - e.local_position.y;
    const right = left + e.bounds.width;
    const bottom = top + e.bounds.height;
    const p = this.pane;
    if (!p || p.left !== left || p.top !== top || p.right !== right || p.bottom !== bottom) this.pane = { left, top, right, bottom };
  }

  /**
   * Start the pump. Call once from the host view's init(): the pump's task belongs to the
   * host, and since it awaits only its own sleeps it stays in the host's scope (see the
   * header). Waking it sets a flag that it reads every TICK_MS.
   */
  attach(cx: Context): void {
    const previous = this.session.onChange;
    this.session.onChange = () => {
      previous();
      this.wake();
    };
    this.wake();
    cx.spawn(async (cx) => {
      while (!this.closed) {
        await cx.sleep(this.pending ? 0 : TICK_MS);
        if (this.closed) continue;
        // A refused release is retried every tick on its own, without a wake (that would spin the loop).
        for (const rec of [...this.unreleased]) this.release(rec);
        if (!this.pending) continue;
        this.pending = false;
        // A failure in one resume must not end the loop: every later redraw goes through it.
        try {
          if (this.pump(cx)) cx.notify();
        } catch (e) {
          console.log(`[opengpui] pump failed: ${e}`);
        }
      }
    });
  }

  /** Ask the pump to run at its next tick. Safe from any phase, render included. */
  wake(): void {
    this.pending = true;
  }

  /** @internal Queue an action for the pump (Session.triggerAction). */
  queueAction(label: string, formName: string | undefined, action: ActionArg): void {
    this.actions.push({ label, formName, action });
    this.wake();
  }

  /** One pump resume; true when the host must redraw. */
  private pump(cx: AsyncContext): boolean {
    const scheduler: Scheduler = {
      every: (ms, fn) => {
        const task = cx.timer.every(ms, () => fn());
        this.timers.add(task);
        return {
          cancel: () => {
            task.cancel();
            this.timers.delete(task);
          },
        };
      },
    };
    // Actions run here, so their awaits (a mutation's tool call) resume in the host's scope.
    for (const { label, formName, action } of this.actions.splice(0)) {
      this.session.triggerAction(label, formName, action).catch((e) => console.log(`[opengpui] action failed: ${e}`));
    }
    withScheduler(scheduler, () => this.session.update());

    const notify = new Set<ViewRecord>();
    let host = false;

    // Views whose node changed by value: the tree is indexed once per new evaluated root.
    const root = this.session.root;
    if (root !== this.indexed) {
      this.indexed = root;
      this.index = indexTree(root);
      const memo: CompareMemo = new Map();
      for (const rec of this.views.values()) {
        if (rec.kind !== "node" || !rec.entity || rec.path === null) continue;
        const now = this.index.byPath.get(rec.path) as ElementNode | undefined;
        if (!now || now === rec.drawnNode || sameValue(now, rec.drawnNode, memo)) continue;
        rec.node = now;
        notify.add(rec);
      }
    }
    // Views whose tracked reads changed, or that asked to redraw.
    for (const rec of this.liveRecords()) {
      if (rec.dirty) {
        rec.dirty = false;
        notify.add(rec);
        continue;
      }
      if (this.readsChanged(rec)) notify.add(rec);
    }

    // Release the views the latest render of their parent no longer mounted.
    for (const rec of [...this.liveRecords()]) {
      for (const child of rec.dropped) if (child.parent === rec && !rec.mounted.has(child)) this.release(child);
      rec.dropped.clear();
    }
    // An overlay that drew nothing goes once its owner draws again without asking.
    for (const rec of this.views.values()) if (rec.kind === "overlay" && rec.entity && !rec.shown && rec.parent) notify.add(rec.parent);

    // The views renders asked for, all created here so the host owns them (and releases them
    // only through the surface); the view that mounts one draws again to show it.
    for (const rec of this.views.values()) {
      if (rec.entity || rec.released || !rec.parent?.mounted.has(rec)) continue;
      this.makeView(cx, rec);
      notify.add(rec.kind === "overlay" ? this.host : rec.parent);
    }

    // Retained state: created for what renders ask for, released when no live view asks.
    const wanted = new Map<string, { spec: RetainedSpec<any, any>; askers: ViewRecord[] }>();
    for (const rec of this.liveRecords()) {
      for (const [key, spec] of rec.wanted) {
        const w = wanted.get(key);
        if (w) w.askers.push(rec);
        else wanted.set(key, { spec, askers: [rec] });
      }
    }
    for (const [key, { spec, askers }] of wanted) {
      if (this.retainedEntries.has(key)) continue;
      const entry: RetainedEntry<any, any> = { kind: spec.kind, meta: spec.meta, state: null };
      entry.state = spec.create(entry, cx);
      this.retainedEntries.set(key, entry);
      for (const rec of askers) notify.add(rec);
    }
    // Values live in the session's store, so state created again later starts from the same text.
    for (const [key, entry] of this.retainedEntries) {
      if (wanted.has(key)) continue;
      entry.state?.release?.();
      this.retainedEntries.delete(key);
    }
    // Image states no view asked for go too (a failed one is retried when asked again;
    // the host's cache keeps reloads cheap).
    const seen = new Set<string>();
    for (const rec of this.liveRecords()) for (const src of rec.images) seen.add(src);
    for (const src of this.images.keys()) if (!seen.has(src)) this.images.delete(src);
    for (const src of this.imagesWaiting.keys()) if (!seen.has(src)) this.imagesWaiting.delete(src);

    // The keyboard follows the topmost overlay that has a focus handle: to it when
    // it opens, back to the one below when it closes.
    let top: FocusHandle | null = null;
    for (const rec of this.overlays()) if (rec.shown && rec.focus) top = rec.focus;
    if (top !== this.overlayTop) {
      this.overlayTop = top;
      top?.focus();
    }

    // Deferred work (native state updates, chart layouts computed in the pump) runs until
    // DEFERRED_MS of this resume have passed; the rest waits for the next one, so several
    // heavy computes queued together don't add up to one call past gpui-shell's budget.
    // Each redraws the view that asked for it.
    const started = Date.now();
    const deferred = this.deferred;
    this.deferred = [];
    for (let i = 0; i < deferred.length; i++) {
      if (i > 0 && Date.now() - started > DEFERRED_MS) {
        this.deferred = deferred.slice(i).concat(this.deferred);
        this.wake();
        break;
      }
      const { fn, owner } = deferred[i]!;
      if (owner.released) continue;
      try {
        fn(ownedContext(cx, owner, this));
      } catch (e) {
        console.log(`[opengpui] deferred work failed: ${e}`);
      }
      notify.add(owner);
    }

    // An owner that redraws hands its overlays and pieces a new drawing.
    for (const rec of [...notify]) for (const child of rec.mounted) if (child.kind !== "node" && child.entity) notify.add(child);
    for (const rec of notify) {
      if (rec.kind === "host") host = true;
      else this.notifyView(cx, rec);
    }
    // While views wait to draw, the host draws too: after that frame, one still waiting is not on screen.
    const waiting = this.awaitingDraw();
    const redrawHost = host || waiting || !sameValue(this.hostState(), this.hostSeen);
    this.setIdle(!redrawHost && this.deferred.length === 0 && !this.pending && !this.working());
    return redrawHost;
  }

  private makeView(cx: Context, rec: ViewRecord): void {
    records.set(rec.id, { surface: this, record: rec });
    if (rec.kind === "overlay") rec.order = ++this.overlayCount;
    rec.entity = createView(cx, RecordView, { id: rec.id });
    rec.waitFrom = this.host.frame;
  }

  /**
   * A view the pump created or notified that may still draw: until it draws, or until the
   * host has drawn a frame since. A view on screen draws in the same frame as the host, so
   * one that didn't is not on screen (one its parent builds but doesn't place) and must not hold idle. Or one
   * asked to redraw at the next resume.
   */
  private awaitingDraw(): boolean {
    for (const rec of this.liveRecords()) if (rec.dirty || (rec.waitFrom !== null && this.host.frame <= rec.waitFrom)) return true;
    return false;
  }

  /** Background work this surface's views wait for: icon writes, image loads, markdown parses, code highlighting, queries. */
  private working(): boolean {
    for (const state of this.icons.values()) if (state.status === "loading") return true;
    for (const state of this.images.values()) if (state.status === "loading") return true;
    for (const waiting of this.imagesWaiting.values()) if (!waiting.settled) return true;
    return markdownPending(this.session) || highlightPending(this.session) || this.session.isQueryLoading;
  }

  private setIdle(idle: boolean): void {
    if (idle === this.idle) return;
    this.idle = idle;
    this.onIdle?.(idle);
  }

  /**
   * @internal Redraw a view, from a task of the host (the pump, deferred work): the host
   * itself through `cx.notify()`, any other by its entity. One not drawn yet is left alone
   * (its first draw reads the latest state), as is one released.
   */
  notifyView(cx: Context, rec: ViewRecord): void {
    if (rec.released) return;
    if (rec.kind === "host") return cx.notify();
    if (!rec.entity || rec.frame === 0) return;
    rec.notified = true;
    // The first notify since the view last drew starts its wait: a hidden view whose reads keep
    // differing is notified at every resume, and restarting the wait would redraw the host forever.
    rec.waitFrom ??= this.host.frame;
    cx.notify(rec.entity);
  }

  /** Whether a tracked read of `rec` now returns another value. A read that throws is dropped: it would redraw the view on every resume. */
  private readsChanged(rec: ViewRecord): boolean {
    let changed = false;
    rec.reads = rec.reads.filter((r) => {
      try {
        if (!sameValue(r.read(), r.last)) changed = true;
        return true;
      } catch {
        return false;
      }
    });
    return changed;
  }

  /** The host and every view not released. */
  private *liveRecords(): Iterable<ViewRecord> {
    yield this.host;
    for (const rec of this.views.values()) if (!rec.released) yield rec;
  }

  private overlays(): ViewRecord[] {
    return [...this.views.values()].filter((r) => r.kind === "overlay" && r.entity && !r.released).sort((a, b) => a.order - b.order);
  }

  /** What the host's chrome shows of the session, and which views it mounts. */
  private hostState(): unknown {
    const s = this.session;
    const root = this.views.get(ROOT_KEY);
    return [s.errors, s.blocked, s.isQueryLoading, s.root === null, root?.entity ?? null, this.overlays().map((r) => r.id)];
  }

  /** Release a view, the views it mounted, and its form registrations. Locals stay. */
  private release(rec: ViewRecord): void {
    if (rec.released) return;
    // The entity first: should gpui refuse, the surface still holds the view, and the pump
    // tries again at its next tick (not only at the next wake), without failing the resume.
    try {
      rec.entity?.release();
    } catch (e) {
      if (!this.unreleased.has(rec)) console.log(`[opengpui] view release refused, retrying: ${e}`);
      this.unreleased.add(rec);
      return;
    }
    this.unreleased.delete(rec);
    rec.entity = null;
    rec.released = true;
    for (const child of [...rec.mounted, ...rec.dropped]) if (child.parent === rec) this.release(child);
    rec.mounted.clear();
    rec.dropped.clear();
    // An interrupted render never reached end(): what it registered sits in nextFields only.
    for (const regs of [rec.fields, rec.nextFields]) {
      for (const [reg, { form, name }] of regs) if (form.fields[name] === reg) delete form.fields[name];
      regs.clear();
    }
    rec.reads = [];
    if (this.views.get(rec.key) === rec) this.views.delete(rec.key);
    records.delete(rec.id);
  }

  /** @internal Mark a view to redraw at the pump's next resume. */
  invalidate(rec: ViewRecord): void {
    if (rec.released) return;
    rec.dirty = true;
    this.wake();
  }

  /** @internal An image state changed: the views that asked for it redraw. */
  imageChanged(src: string): void {
    for (const rec of this.liveRecords()) if (rec.images.has(src)) rec.dirty = true;
    this.wake();
  }

  /** @internal Mount a view of `kind` at `key` from `parent`'s render; null while the pump has yet to create it. */
  mount(parent: RenderContext, kind: Exclude<ViewKind, "host">, key: string, scope: Scope): { rec: ViewRecord; fresh: boolean } {
    let rec = this.views.get(key);
    let fresh = false;
    if (!rec || rec.kind !== kind) {
      rec = new ViewRecord(kind, key, kind === "node" ? key : parent.key, scope);
      this.views.set(key, rec);
      fresh = true;
    }
    const owner = parent.view;
    rec.parent = owner;
    owner.mounted.add(rec);
    this.unreleased.delete(rec); // mounted again before gpui let it go: it stays
    if (!sameScope(rec.scope, scope)) {
      rec.scope = scope;
      fresh = true;
    }
    if (!rec.entity) this.wake();
    return { rec, fresh };
  }

  /** @internal A node's view: its entity, or a placeholder until the pump created it. */
  mountNode(parent: RenderContext, key: string, node: ElementNode): Entity | Element {
    const { rec, fresh } = this.mount(parent, "node", key, parent.scope);
    rec.node = node;
    rec.path = this.index.pathOf.get(node) ?? null;
    const entity = rec.entity;
    if (!entity) return div().hidden();
    // Usually the pump saw the change already (notified); a node without a path, or one
    // whose path moved, is caught here and redrawn a frame later.
    if (!rec.notified && (fresh || (node !== rec.drawnNode && !sameValue(node, rec.drawnNode)))) this.invalidate(rec);
    return entity;
  }

  /** @internal Draw one view: the host never comes here, gpui calls this through RecordView. */
  renderRecord(rec: ViewRecord): Element | Entity | string {
    const ctx = this.begin(rec);
    let out: Element | Entity | string;
    try {
      if (rec.kind === "node") {
        rec.drawnNode = rec.node;
        out = rec.node ? single(ctx.renderComponent(rec.node)) : div().hidden();
      } else if (rec.kind === "piece") {
        rec.drawnInput = rec.input;
        out = rec.pieceDraw?.(ctx) ?? div().hidden();
      } else {
        const drawn = rec.overlayDraw?.(ctx) ?? null;
        rec.shown = drawn != null;
        rec.focus = drawn?.focus ?? null;
        out = drawn?.el ?? div().hidden();
        if (!drawn) this.wake();
      }
    } finally {
      this.end(rec);
    }
    return out;
  }

  /**
   * Start a render of `rec`. What it tracks and registers goes to `nextReads`/`nextFields`
   * and replaces the last render's in end(): a render gpui-shell interrupts never gets there,
   * so the view keeps tracking (and its fields keep validating) what it drew last. What the
   * interrupted render registered joins the view's own fields, so end() or release() drops it.
   */
  private begin(rec: ViewRecord): RenderContext {
    if (rec.rendering) for (const [reg, entry] of rec.nextFields) rec.fields.set(reg, entry);
    rec.rendering = true;
    rec.notified = false;
    rec.waitFrom = null;
    rec.dirty = false;
    rec.frame++;
    rec.started = Date.now();
    for (const child of rec.mounted) rec.dropped.add(child);
    rec.mounted = new Set();
    rec.wanted = new Map();
    rec.images = new Set();
    rec.nextReads = [];
    rec.nextFields = new Map();
    return new RenderContext(this, rec, rec.ctxKey, rec.scope);
  }

  private end(rec: ViewRecord): void {
    rec.rendering = false;
    for (const [reg, { form, name }] of rec.fields) if (!rec.nextFields.has(reg) && form.fields[name] === reg) delete form.fields[name];
    rec.fields = rec.nextFields;
    rec.reads = rec.nextReads;
    const missing = [...rec.wanted.keys()].some((k) => !this.retainedEntries.has(k));
    // A render after a resume that left work (or views to draw) lets the pump look again,
    // so the surface turns idle once the last of them drew.
    if (missing || rec.dropped.size || this.deferred.length || !this.idle) this.wake();
  }

  /** The response's root, drawn as children for the host's container: its view, or nothing before one parses. */
  renderContent(): (Element | Entity | string)[] {
    const ctx = this.begin(this.host);
    try {
      const root = this.session.root;
      return root ? [this.mountNode(ctx, ROOT_KEY, root)] : [];
    } finally {
      this.end(this.host);
      this.hostSeen = this.hostState();
    }
  }

  /**
   * The overlays (RenderContext.overlay), bottom first. The host stacks each over its
   * whole area (the page: CSS `position: fixed`). A host that draws content must draw
   * these too, right after renderContent().
   */
  renderOverlays(): Entity[] {
    return this.overlays().flatMap((r) => optional(r.entity));
  }

  /** Stop the pump and release native state. Call from the host's close(). */
  close(): void {
    this.closed = true;
    for (const task of this.timers) task.cancel();
    this.timers.clear();
    for (const rec of [...this.views.values()]) this.release(rec);
    for (const entry of this.retainedEntries.values()) entry.state?.release?.();
    this.retainedEntries.clear();
    this.session.dispose();
  }
}

/** The root node's key, as RenderContext("n").render(root, "root") names it. */
const ROOT_KEY = "n.root";

function sameScope(a: Scope, b: Scope): boolean {
  return a === b || (a.formName === b.formName && a.inline === b.inline && sameValue(a.cardText, b.cardText));
}

/** A view draws one element: a string stays, nothing is a hidden element, several go in a column. */
function single(out: Rendered): Element | Entity | string {
  if (out == null) return div().hidden();
  if (!Array.isArray(out)) return out;
  const items = flatten(out);
  return items.length === 1 ? items[0]! : div().flex().flex_col().children(items);
}

/**
 * gpui-kit's declaration writes `Context.new` as `new(...)` inside an interface, which
 * TypeScript reads as a construct signature; at runtime it is the method its doc describes.
 */
interface CreatesViews {
  "new"(Class: ViewClass, props?: Record<string, unknown>): Entity;
}

function createView(cx: Context, Class: ViewClass, props: Record<string, unknown>): Entity {
  const creator: CreatesViews = cx as unknown as CreatesViews; // see CreatesViews
  return creator.new(Class, props);
}

/** `cx`, with `notify()` (and that of its timers and tasks) redrawing `owner` rather than the host. */
function ownedContext(cx: AsyncContext, owner: ViewRecord, surface: Surface): AsyncContext {
  const owned: AsyncContext = new OwnedContext(cx, owner, surface) as unknown as AsyncContext; // all but the misread `new` (CreatesViews) is checked
  return owned;
}

/**
 * The context deferred work gets: the pump's, with `notify()` (and that of its timers
 * and tasks) redrawing the view that deferred it rather than the host. Its timers and
 * tasks belong to the host, so they outlive the view and may notify it by entity; a
 * task must await only host promises it starts itself (sleeps, fs, exec) to stay so.
 */
class OwnedContext implements Pick<AsyncContext, keyof AsyncContext> {
  constructor(
    private readonly cx: AsyncContext,
    private readonly owner: ViewRecord,
    private readonly surface: Surface,
  ) {}

  private wrap = (cx: AsyncContext): AsyncContext => ownedContext(cx, this.owner, this.surface);

  notify(target?: Entity): void {
    if (target) return this.cx.notify(target);
    const owner = this.owner;
    // cx.notify(owner.entity), or the host's own cx.notify(); one not created yet redraws once it is.
    if (owner.entity || owner.kind === "host") this.surface.notifyView(this.cx, owner);
    else this.surface.invalidate(owner);
  }
  get timer(): Timer {
    return {
      after: (ms, handler, opts) => this.cx.timer.after(ms, (cx) => handler(this.wrap(cx)), opts),
      every: (ms, handler, opts) => this.cx.timer.every(ms, (cx) => handler(this.wrap(cx)), opts),
    };
  }
  spawn(body: (cx: AsyncContext) => unknown, opts?: Parameters<Context["spawn"]>[1]): Task {
    return this.cx.spawn((cx) => body(this.wrap(cx)), opts);
  }
  bind_keys(...args: Parameters<Context["bind_keys"]>) {
    return this.cx.bind_keys(...args);
  }
  stop_propagation(): void {
    this.cx.stop_propagation();
  }
  propagate(): void {
    this.cx.propagate();
  }
  phase() {
    return this.cx.phase();
  }
  theme() {
    return this.cx.theme();
  }
  open_url(url: string): void {
    this.cx.open_url(url);
  }
  read_from_clipboard(): string | undefined {
    return this.cx.read_from_clipboard();
  }
  write_to_clipboard(text: string): void {
    this.cx.write_to_clipboard(text);
  }
  focus_handle(): FocusHandle {
    return this.cx.focus_handle();
  }
  "new"(Class: ViewClass, props?: Record<string, unknown>): Entity {
    return createView(this.cx, Class, props ?? {});
  }
  sleep(ms?: number): Promise<void> {
    return this.cx.sleep(ms);
  }
}

/** What a component renderer receives besides its props. */
export class RenderContext {
  readonly session: Session;
  readonly t: Tokens;

  constructor(
    private readonly surface: Surface,
    /** The view this render belongs to: its reads, mounts and retained state are this view's. */
    readonly view: ViewRecord,
    /** Stable path of this node in the tree; the base of its element ids. */
    readonly key: string,
    readonly scope: Scope,
  ) {
    this.session = surface.session;
    this.t = surface.tokens;
  }

  /** Record a read the view's render depends on: the pump redraws the view when it changes. */
  private track<T>(read: () => T, value: T): T {
    if (this.view.rendering) this.view.nextReads.push({ read, last: value });
    return value;
  }

  /**
   * Read session state the render depends on that no accessor here covers: the view
   * redraws when `read()` returns another value. A render reads the session only
   * through tracked accessors (field, form, streaming, watch, …).
   */
  watch<T>(read: () => T): T {
    return this.track(read, read());
  }

  /** The enclosing Form's name, if any. */
  get formName(): string | undefined {
    return this.scope.formName;
  }

  /** The enclosing Form's validation registry, if any: errors read are tracked, fields registered belong to this view. */
  get form(): FormAccess | null {
    const formName = this.scope.formName;
    if (formName === undefined) return null;
    const form = this.session.form(formName);
    const view = this.view;
    return {
      getFieldError: (name) => this.track(() => form.getFieldError(name), form.getFieldError(name)),
      validateField: (name, value, rules) => form.validateField(name, value, rules),
      registerField: (name, rules, getValue) => {
        form.registerField(name, rules, getValue);
        const reg = form.fields[name];
        if (reg && view.rendering) view.nextFields.set(reg, { form, name });
      },
      clearFieldError: (name) => form.clearFieldError(name),
      validateForm: () => form.validateForm(),
    };
  }

  /** True while the response is still streaming: inputs and actions wait. */
  get streaming(): boolean {
    const session = this.session;
    return this.track(() => session.blocked, session.blocked);
  }

  get queryLoading(): boolean {
    const session = this.session;
    return this.track(() => session.isQueryLoading, session.isQueryLoading);
  }

  /** A stable element id for a part of this node. */
  id(part = ""): string {
    return part ? `${this.key}:${part}` : this.key;
  }

  /**
   * Milliseconds since this view's render began. gpui-shell interrupts a call that runs
   * about 50 ms; work that can wait (markdown/budget.ts) moves to a task once a render ran long.
   */
  get renderTime(): number {
    return Date.now() - this.view.started;
  }

  /** Which render of this view this is: a count that grows by one per render. */
  get frame(): number {
    return this.view.frame;
  }

  /** The host's content viewport height (Surface.setViewportHeight), or null when the host never told. */
  get viewportHeight(): number | null {
    const surface = this.surface;
    return this.track(() => surface.viewportHeight, surface.viewportHeight);
  }

  /**
   * The host's visible content box in window coordinates (Surface.notePane), or null before the pointer
   * has been over it. Not tracked: read it when deciding something at the time (where an overlay opens).
   */
  get pane(): PaneBox | null {
    return this.surface.pane;
  }

  /**
   * Redraw this view at the pump's next resume. For code that runs outside render and
   * outside a handler: a lazy list's row builder (gpui-kit `list`), which runs in
   * layout after the render and may not notify. Work queued with after() there needs it.
   */
  wake(): void {
    this.surface.invalidate(this.view);
  }

  /** wake(), kept for later: what a shared task calls when what this view waits for is ready. */
  waker(): () => void {
    const surface = this.surface;
    const view = this.view;
    return () => surface.invalidate(view);
  }

  /**
   * A lucide icon by name, as upstream's IconWrapper draws it: `size` px, in the
   * surrounding text color, at a stroke width react-ui uses. Null when the host
   * has no icons. The first time a surface draws an icon, the host writes its SVG
   * to a file; until then (a frame or so) it is an empty box of its size.
   */
  icon(name: string, options: { category?: string; size?: number; stroke?: StrokeWidth } = {}): Element | null {
    const surface = this.surface;
    const writer = surface.iconWriter;
    const icon = writer ? lucideSvg(iconFile(name, options.category), options.stroke) : null;
    if (!writer || !icon) return null;
    const key = `icon:${icon.name}`;
    this.view.images.add(key);
    let state = surface.icons.get(icon.name);
    if (!state) {
      const loading = { status: "loading" } as const;
      state = loading;
      surface.icons.set(icon.name, loading);
      // Promises only advance inside a task, so the write starts from the pump's cx.
      this.after((cx) => {
        cx.spawn(async () => {
          try {
            surface.icons.set(icon.name, { status: "ready", path: await writer(icon.name, icon.svg) });
          } catch (e) {
            console.log(`[opengpui] icon ${icon.name}: ${e instanceof Error ? e.message : e}`);
            surface.icons.set(icon.name, { status: "failed" });
          }
          surface.imageChanged(key);
        });
      });
    }
    return (state.status === "ready" ? svg(state.path) : div()).size(options.size ?? ICON_SIZE).flex_none();
  }

  /**
   * An image `src` as the host made it drawable (render/images.ts): "loading"
   * until the host answers, then "ready" with its path and intrinsic size, or
   * "failed". The views that asked redraw when it changes. A state lives while
   * renders ask for it. While the model is still writing, a new src starts loading
   * only once a later chunk still contains it or it stayed unchanged for STABLE_MS
   * (the trailing statement's string grows a character at a time); a finished
   * response loads at once, even an invalid one.
   */
  image(src: string): ImageState {
    const surface = this.surface;
    this.view.images.add(src);
    const known = surface.images.get(src);
    if (known) return known;
    const loader = surface.imageLoader;
    if (!loader || !src.trim()) {
      const failed: ImageState = { status: "failed", error: loader ? "empty src" : "the host loads no images" };
      surface.images.set(src, failed);
      return failed;
    }
    // While the model writes, the trailing statement's string grows a character at a
    // time: a src loads once it outlives a new chunk or STABLE_MS, whichever comes first.
    const session = this.session;
    if (session.isStreaming) {
      const revision = this.track(() => session.revision, session.revision);
      const waiting = surface.imagesWaiting.get(src);
      if (!waiting) {
        const entry = { revision, settled: false };
        surface.imagesWaiting.set(src, entry);
        this.after((cx) =>
          cx.timer.after(STABLE_MS, () => {
            entry.settled = true;
            surface.imageChanged(src);
          }),
        );
        return WAITING;
      }
      if (waiting.revision === revision && !waiting.settled) return WAITING;
    }
    surface.imagesWaiting.delete(src);
    const loading: ImageState = { status: "loading" };
    surface.images.set(src, loading);
    // Promises only advance inside a task, so the load starts from the pump's cx.
    this.after((cx) => {
      cx.spawn(async () => {
        let next: ImageState;
        try {
          const loaded = await loader(src);
          next = { status: "ready", path: loaded.path, width: loaded.width, height: loaded.height };
        } catch (e) {
          next = { status: "failed", error: e instanceof Error ? e.message : String(e) };
        }
        // Dropped meanwhile (no render asks for it): a later ask loads it again.
        if (surface.images.get(src) !== loading) return;
        surface.images.set(src, next);
        surface.imageChanged(src);
      });
    });
    return loading;
  }

  /**
   * Draw `draw` above the whole surface (a modal: CSS `position: fixed`), in a view of
   * its own that the host stacks over its whole area, later overlays above earlier ones
   * (as later portals are in the DOM). Ask on every render it should stay; `part` keeps
   * several of one node apart. `draw` runs in the overlay's render with a context of
   * this node's key and scope (ids, locals, retained state and form are this node's),
   * whenever this view draws again or the overlay's own handlers notify; it reads live
   * state there. Drawing null shows nothing, and this view is redrawn so it can stop asking.
   */
  overlay(part: string, draw: OverlayDraw): void {
    const { rec } = this.surface.mount(this, "overlay", `${this.key}#overlay:${part}`, this.scope);
    rec.overlayDraw = draw;
    if (rec.entity && !rec.notified) this.surface.invalidate(rec);
  }

  /**
   * A piece of this node drawn in a view of its own (a step's markdown): it redraws when
   * `input` changes by value or its own handlers notify, not with every render here.
   * `draw` must return one element; `part` names the piece.
   */
  piece<I>(part: string, input: I, draw: (o: RenderContext, input: I) => Element): Entity | Element {
    const { rec, fresh } = this.surface.mount(this, "piece", `${this.key}#piece:${part}`, this.scope);
    rec.pieceDraw = (o) => draw(o, rec.input as I);
    rec.input = input;
    const entity = rec.entity;
    if (!entity) return div().hidden();
    if (!rec.notified && (fresh || !sameValue(input, rec.drawnInput))) this.surface.invalidate(rec);
    return entity;
  }

  /** A child context, e.g. with a form scope. */
  child(suffix: string, scope: Scope = this.scope): RenderContext {
    return new RenderContext(this.surface, this.view, `${this.key}.${suffix}`, scope);
  }

  /** Render any evaluated value: an element node, an array, or a primitive. */
  render(value: unknown, suffix = "0"): Rendered {
    if (value == null || value === false) return null;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.flatMap((v, i) => this.children(v, `${suffix}_${i}`));
    if (typeof value === "object" && "type" in value && value.type === "element") {
      return this.renderNode(value as ElementNode, suffix);
    }
    return null;
  }

  /** Render a value as a flat list of children, ready for `.children(...)`. */
  children(value: unknown, suffix = "c"): (Element | Entity | string)[] {
    const out = this.render(value, suffix);
    return out == null ? [] : Array.isArray(out) ? flatten(out) : [out];
  }

  private renderNode(node: ElementNode, suffix: string): Rendered {
    const component = this.surface.components[node.typeName];
    if (!this.scope.inline) {
      if (component?.view) return this.surface.mountNode(this, `${this.key}.${suffix}`, node);
      return this.child(suffix).renderComponent(node);
    }
    // A card block's slot: drawn inline, so the block can restyle it; what the slot holds is
    // drawn as anywhere else, views included.
    const { inline: _, ...below } = this.scope;
    return this.child(suffix, below).renderComponent(node);
  }

  /** @internal Draw `node`'s component with this context (the node's own). */
  renderComponent(node: ElementNode): Rendered {
    const component = this.surface.components[node.typeName];
    if (!component) return unsupported(this, node.typeName);
    try {
      const ctx = component.inlineChildren ? new RenderContext(this.surface, this.view, this.key, { ...this.scope, inline: true }) : this;
      return component.render(node.props ?? {}, ctx, node);
    } catch (e) {
      this.session.reportRenderError({
        source: "runtime",
        code: "render-error",
        component: node.typeName,
        message: `Component ${node.typeName} render failed: ${e instanceof Error ? e.message : String(e)}`,
      });
      return div()
        .px(8)
        .py(4)
        .rounded(6)
        .border_1()
        .border_color(this.t.borderDangerEmphasis)
        .text_color(this.t.textDangerPrimary)
        .text_size(12)
        .child(`${node.typeName} failed to render`);
    }
  }

  /** A form field: bound to a $variable when `binding` is reactive, else to the enclosing form. Its value is tracked. */
  field<T = unknown>(name: string, binding: unknown) {
    const session = this.session;
    const formName = this.scope.formName;
    const field = session.stateField<T>(formName, name, binding);
    this.track(() => session.stateField<T>(formName, name, binding).value, field.value);
    return field;
  }

  /** Run an action in this node's form scope (Session.triggerAction): queued, the pump runs it. */
  trigger(label: string, action: unknown): void {
    this.action(label, this.scope.formName, action);
  }

  /** Run an action with the payload of form `formName` (the whole store when undefined): queued, the pump runs it. */
  action(label: string, formName: string | undefined, action?: unknown): void {
    this.surface.queueAction(label, formName, action as ActionArg);
  }

  /**
   * Retained native state, created by the pump (a live phase). Null until it
   * exists: draw a placeholder meanwhile (the view redraws once it does). Handlers
   * read current props from `entry.meta`, which every render refreshes.
   *
   * @param key  identity across renders, e.g. the field the state edits
   */
  retained<S extends { release?(): unknown }, M>(key: string, spec: RetainedSpec<S, M>): S | null {
    this.view.wanted.set(key, spec);
    const entry = this.surface.retainedEntries.get(key);
    if (!entry || entry.kind !== spec.kind) return null;
    entry.meta = spec.meta;
    return entry.state as S;
  }

  /**
   * Work that needs a live phase (native state updates, timers): runs in the pump with
   * its cx, then this view redraws. `cx.notify()` there, and in its timers and tasks,
   * redraws this view.
   */
  after(fn: (cx: Context) => void): void {
    this.surface.deferred.push({ fn, owner: this.view });
    this.surface.wake();
  }

  /**
   * Drop this node's locals whose part starts with `prefix` and whose rest `keep` rejects:
   * the state of pieces that are gone (a long markdown block's rows while it streams).
   */
  pruneLocals(prefix: string, keep: (rest: string) => boolean): void {
    const head = `${this.key}:${prefix}`;
    for (const key of this.surface.local.keys()) if (key.startsWith(head) && !keep(key.slice(head.length))) this.surface.local.delete(key);
  }

  /** Per-node UI state that survives renders: a table's page, an open accordion. `part` keeps several apart. */
  local<T extends object>(initial: T, part = ""): T {
    const key = part ? `${this.key}:${part}` : this.key;
    let state = this.surface.local.get(key) as T | undefined;
    if (!state) {
      state = { ...initial };
      this.surface.local.set(key, state);
    }
    return state;
  }
}

function flatten(items: Rendered[]): (Element | Entity | string)[] {
  return items.flatMap((o) => (o == null ? [] : Array.isArray(o) ? flatten(o) : [o]));
}

function unsupported(ctx: RenderContext, typeName: string): Element {
  return h_flex()
    .px(10)
    .py(6)
    .rounded(6)
    .border_1()
    .border_dashed()
    .border_color(ctx.t.borderInteractive)
    .text_size(12)
    .text_color(ctx.t.textNeutralSecondary)
    .child(`${typeName} is not supported by opengpui yet`);
}
