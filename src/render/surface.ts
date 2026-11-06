// Draws a Session with gpui-kit elements.
//
// gpui-shell splits work by phase: `render` may only describe elements, while
// retained native state (InputState, timers, …) needs a live call (init, an
// event handler or a task). A Surface therefore runs one long-lived task per
// host view, the pump: it wakes whenever the session or a render asks, brings
// the session up to date, creates the retained state the last render asked
// for, runs deferred work, and redraws. Render stays a pure description.
import type { ElementNode } from "@openuidev/lang-core";
import { h_flex } from "gpui-base";
import { div, svg, type Context, type Element, type Task } from "gpui-kit";
import type { FormValidation, Session } from "../runtime/session.ts";
import { withScheduler, type Scheduler } from "../upstream/timers.ts";
import { iconFile } from "./icons.ts";
import { ICON_SIZE, lucideFile, type IconPath, type StrokeWidth } from "./lucide.ts";
import { resolveTokens, type Tokens } from "./tokens.ts";

/** What a renderer returns: an element, text, several of them, or nothing. */
export type Rendered = Element | string | Rendered[] | null;

/** `[el]`, or nothing for null: for `.children(...)` with an optional part. */
export function optional<T>(el: T | null | undefined): T[] {
  return el == null ? [] : [el];
}

/** Props as the evaluator hands them over: typed by the component's zod schema upstream. */
export type Props = Record<string, any>;

export interface Component {
  render(props: Props, ctx: RenderContext, node: ElementNode): Rendered;
}

export type Components = Record<string, Component>;

/** Native state a render asked for; the pump creates it. */
export interface RetainedSpec<S extends { release?(): unknown }, M> {
  /** Kind of state: a key reused for another kind gets a fresh one. */
  kind: string;
  /** Current props for handlers; refreshed on every render. */
  meta: M;
  create(entry: RetainedEntry<S, M>): S;
}

export interface RetainedEntry<S, M> {
  kind: string;
  meta: M;
  state: S;
}

interface Scope {
  formName?: string;
}

export class Surface {
  readonly session: Session;
  tokens: Tokens;
  readonly components: Components;
  /** @internal */ readonly iconPath: IconPath | null;
  /** @internal */ retainedEntries = new Map<string, RetainedEntry<any, any>>();
  /** @internal */ wanted = new Map<string, RetainedSpec<any, any>>();
  /** @internal */ deferred: ((cx: Context) => void)[] = [];
  /** @internal */ local = new Map<string, object>();
  private rendered = false;
  private closed = false;
  private pending = false;
  private resolveWake: (() => void) | null = null;
  private readonly timers = new Set<Task>();

  /**
   * `tokens`: see resolveTokens(); OpenUI's light theme when omitted.
   * `icons`: where the host keeps lucide's SVGs; omitted, icons are not drawn.
   */
  constructor(options: { session: Session; components: Components; tokens?: Tokens; icons?: IconPath }) {
    this.session = options.session;
    this.components = options.components;
    this.tokens = options.tokens ?? resolveTokens("light");
    this.iconPath = options.icons ?? null;
  }

  setTokens(tokens: Tokens): void {
    this.tokens = tokens;
  }

  /** Start the pump. Call once from the host view's init(). */
  attach(cx: Context): void {
    const previous = this.session.onChange;
    this.session.onChange = () => {
      previous();
      this.wake();
    };
    cx.spawn(async (cx) => {
      while (!this.closed) {
        await this.nextWake();
        if (this.closed) break;
        this.pump(cx);
        cx.notify();
      }
    });
    this.wake();
  }

  /** Ask the pump to run soon. Safe from any phase, render included. */
  wake(): void {
    this.pending = true;
    const resolve = this.resolveWake;
    this.resolveWake = null;
    resolve?.();
  }

  private nextWake(): Promise<void> {
    if (this.pending) {
      this.pending = false;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.resolveWake = () => {
        this.pending = false;
        resolve();
      };
    });
  }

  private pump(cx: Context): void {
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
    withScheduler(scheduler, () => this.session.update());

    for (const [key, spec] of this.wanted) {
      if (this.retainedEntries.has(key)) continue;
      const entry: RetainedEntry<any, any> = { kind: spec.kind, meta: spec.meta, state: null };
      entry.state = spec.create(entry);
      this.retainedEntries.set(key, entry);
    }
    // Release what the last render no longer drew. Values live in the session's
    // store, so state created again later starts from the same text.
    if (this.rendered) {
      for (const [key, entry] of this.retainedEntries) {
        if (this.wanted.has(key)) continue;
        entry.state?.release?.();
        this.retainedEntries.delete(key);
      }
    }
    const deferred = this.deferred;
    this.deferred = [];
    for (const fn of deferred) {
      try {
        fn(cx);
      } catch (e) {
        console.log(`[opengpui] deferred work failed: ${e}`);
      }
    }
  }

  /** The response's root, drawn as children for the host's container; empty before one parses. */
  renderContent(): (Element | string)[] {
    this.wanted = new Map();
    this.rendered = true;
    const out = new RenderContext(this, "n", {}).children(this.session.root, "root");
    const missing = [...this.wanted.keys()].some((k) => !this.retainedEntries.has(k));
    if (missing || this.deferred.length) this.wake();
    return out;
  }

  /** Stop the pump and release native state. Call from the host's close(). */
  close(): void {
    this.closed = true;
    this.wake();
    for (const task of this.timers) task.cancel();
    this.timers.clear();
    for (const entry of this.retainedEntries.values()) entry.state?.release?.();
    this.retainedEntries.clear();
    this.session.dispose();
  }
}

/** What a component renderer receives besides its props. */
export class RenderContext {
  readonly session: Session;
  readonly t: Tokens;

  constructor(
    private readonly surface: Surface,
    /** Stable path of this node in the tree; the base of its element ids. */
    readonly key: string,
    readonly scope: Scope,
  ) {
    this.session = surface.session;
    this.t = surface.tokens;
  }

  /** The enclosing Form's name, if any. */
  get formName(): string | undefined {
    return this.scope.formName;
  }

  /** The enclosing Form's validation registry, if any. */
  get form(): FormValidation | null {
    return this.scope.formName !== undefined ? this.session.form(this.scope.formName) : null;
  }

  /** True while the response is still streaming: inputs and actions wait. */
  get streaming(): boolean {
    return this.session.blocked;
  }

  get queryLoading(): boolean {
    return this.session.isQueryLoading;
  }

  /** A stable element id for a part of this node. */
  id(part = ""): string {
    return part ? `${this.key}:${part}` : this.key;
  }

  /**
   * A lucide icon by name, as upstream's IconWrapper draws it: `size` px, in the
   * surrounding text color, at a stroke width react-ui uses. Null when the host
   * has no icons.
   */
  icon(name: string, options: { category?: string; size?: number; stroke?: StrokeWidth } = {}): Element | null {
    const path = this.surface.iconPath;
    if (!path) return null;
    return svg(path(lucideFile(iconFile(name, options.category), options.stroke)))
      .size(options.size ?? ICON_SIZE)
      .flex_none();
  }

  /** A child context, e.g. with a form scope. */
  child(suffix: string, scope: Scope = this.scope): RenderContext {
    return new RenderContext(this.surface, `${this.key}.${suffix}`, scope);
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
  children(value: unknown, suffix = "c"): (Element | string)[] {
    const out = this.render(value, suffix);
    return out == null ? [] : Array.isArray(out) ? flatten(out) : [out];
  }

  private renderNode(node: ElementNode, suffix: string): Rendered {
    const ctx = this.child(suffix);
    const component = this.surface.components[node.typeName];
    if (!component) return unsupported(ctx, node.typeName);
    try {
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
        .border_color(ctx.t.borderDangerEmphasis)
        .text_color(ctx.t.textDangerPrimary)
        .text_size(12)
        .child(`${node.typeName} failed to render`);
    }
  }

  /** A form field: bound to a $variable when `binding` is reactive, else to the enclosing form. */
  field<T = unknown>(name: string, binding: unknown) {
    return this.session.stateField<T>(this.scope.formName, name, binding);
  }

  /** Run an action in this node's form scope. */
  trigger(label: string, action: unknown): Promise<void> {
    return this.session.triggerAction(label, this.scope.formName, action as Parameters<Session["triggerAction"]>[2]);
  }

  /**
   * Retained native state, created by the pump (a live phase). Null until it
   * exists: draw a placeholder meanwhile. Handlers read current props from
   * `entry.meta`, which every render refreshes.
   *
   * @param key  identity across renders, e.g. the field the state edits
   */
  retained<S extends { release?(): unknown }, M>(key: string, spec: RetainedSpec<S, M>): S | null {
    this.surface.wanted.set(key, spec);
    const entry = this.surface.retainedEntries.get(key);
    if (!entry || entry.kind !== spec.kind) return null;
    entry.meta = spec.meta;
    return entry.state as S;
  }

  /** Work that needs a live phase (native state updates, timers): runs in the pump with its cx. */
  after(fn: (cx: Context) => void): void {
    this.surface.deferred.push(fn);
  }

  /** Per-node UI state that survives renders: a table's page, an open accordion. */
  local<T extends object>(initial: T): T {
    let state = this.surface.local.get(this.key) as T | undefined;
    if (!state) {
      state = { ...initial };
      this.surface.local.set(this.key, state);
    }
    return state;
  }
}

function flatten(items: Rendered[]): (Element | string)[] {
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
