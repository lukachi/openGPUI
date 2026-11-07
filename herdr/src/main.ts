// opengpui for Herdr: a pane or tab that shows an OpenUI Lang file and sends
// what the person does back to the agent that wrote it.
//
// props (from pane.split / tab.new):
//   src      the .oui file to show (absolute, or ~/…). Re-read whenever it changes.
//   reply    terminal address to `hc send` actions and errors to (an agent's $HC_TERMINAL_ID)
//   events   JSONL file (under the Herdr home) that every action and error is appended to
//   tools    JSON file of Query/Mutation tools: { "name": { "command": "…", "args": ["…"], "cwd": "…" } }
//   library  "openui" (default) or "chat"
//   title    header text
//   look     "herdr" (default) or "openui": whose colors to draw with
import type { ActionEvent, OpenUIError } from "@openuidev/lang-core";
import { h_flex, v_flex } from "gpui-base";
import { div, View, type Context } from "gpui-kit";
import { mkdir, writeFile } from "fs/promises";
import { appHome, exec, hc, home, props, readTextFile, theme, watchFolder, window as herdrWindow } from "herdr";
import { basename, dirname, join } from "path";
import {
  components,
  isStreamingResponse,
  libraries,
  Session,
  subsetLibrary,
  Surface,
  textStyle,
  typography,
  type LibraryName,
} from "../../src/index.ts";
import { DEMO } from "./demo.ts";
import { herdrImages } from "./images.ts";
import { herdrTokens, type Look } from "./theme.ts";

interface SurfaceProps {
  src?: string;
  reply?: string;
  events?: string;
  tools?: string;
  library?: LibraryName;
  title?: string;
  /** "herdr" (default): OpenUI's tokens in the Herdr theme's colors; "openui": OpenUI's own theme. */
  look?: Look;
}

interface ToolSpec {
  command: string;
  args?: string[];
  cwd?: string;
}

const expand = (path: string) => (path.startsWith("~/") ? join(home(), path.slice(2)) : path);

/** Form state as the agent wants it: `{ form: { field: value } }`, without componentType wrappers. */
function plainFormState(state: Record<string, unknown> | undefined): Record<string, unknown> {
  const unwrap = (v: unknown): unknown =>
    v && typeof v === "object" && !Array.isArray(v)
      ? "value" in v && "componentType" in v
        ? v.value
        : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unwrap(x)]))
      : v;
  return Object.fromEntries(Object.entries(state ?? {}).map(([k, v]) => [k, unwrap(v)]));
}

/** How often the writer loop looks for event lines and a new status to write. */
const WRITE_TICK_MS = 50;

export default class OpenGpui extends View {
  private p: SurfaceProps = {};
  private surface!: Surface;
  private session!: Session;
  private srcPath: string | null = null;
  private loaded = false;
  private loadError: string | null = null;
  private eventsPath = "";
  /** Event lines waiting for the writer loop. */
  private pendingEvents: string[] = [];
  private writeError: string | null = null;
  private lastErrorReport = "";
  /** opengpui/status/<name>.json: whether the surface is idle, for tools that wait on it (scripts/preview.ts). */
  private statusPath = "";
  private pendingStatus: string | null = null;
  /** The body's height inside its padding, as last told to the surface. */
  private viewportHeight = -1;
  /** Filled once the tools file loads; the session looks tools up at call time. */
  private readonly tools: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {};

  init(_props: unknown, cx: Context): void {
    this.p = (props() ?? {}) as SurfaceProps;
    this.srcPath = this.p.src ? expand(this.p.src) : null;
    const name = (this.srcPath ?? "demo").split("/").pop()!.replace(/\.[^.]*$/, "").replace(/[^\w.-]+/g, "_");
    this.eventsPath = this.p.events ? expand(this.p.events) : join(appHome(), "opengpui", "events", `${name}.jsonl`);
    this.statusPath = join(appHome(), "opengpui", "status", `${basename(this.eventsPath).replace(/\.jsonl$/, "")}.json`);

    const source = subsetLibrary(libraries[this.p.library ?? "openui"] ?? libraries.openui, Object.keys(components));
    this.session = new Session({
      library: source.library,
      tools: this.tools,
      onAction: (event) => this.onAction(event),
      onError: (errors) => this.onErrors(errors),
    });
    this.surface = new Surface({
      session: this.session,
      components,
      tokens: herdrTokens(this.p.look ?? "herdr"),
      // Asset paths are relative to the Herdr home; scripts/build.ts copies the SVGs here.
      icons: (file) => `mods/opengpui/icons/${file}.svg`,
      // Remote and data: images are cached under the Herdr home; relative ones resolve against the .oui's folder.
      images: herdrImages(this.srcPath ? dirname(this.srcPath) : null),
    });
    this.surface.onIdle = (idle) => this.reportIdle(idle);

    if (!this.srcPath) {
      this.session.setResponse(DEMO);
      this.session.update();
      this.loaded = true;
    }
    this.surface.attach(cx);
    if (this.srcPath) this.follow(this.srcPath, cx);
    this.startWriter(cx);
    if (this.p.tools) {
      const toolsPath = expand(this.p.tools);
      cx.spawn(async () => {
        try {
          Object.assign(this.tools, await this.loadTools(toolsPath));
          this.session.queryManager.invalidate();
        } catch (e) {
          this.loadError = `Can't load tools from ${toolsPath}: ${e}`;
        }
      });
    }
  }

  /** Show the file, and again whenever its folder reports a change to it. */
  private follow(path: string, cx: Context): void {
    cx.spawn(async (cx) => {
      let last: string | null = null;
      for (;;) {
        try {
          const text = await readTextFile(path);
          this.loadError = text == null ? `Waiting for ${path}` : null;
          if (text != null && text !== last) {
            last = text;
            this.loaded = true;
            this.session.setResponse(text, isStreamingResponse(text));
          }
        } catch (e) {
          this.loadError = `Can't read ${path}: ${e}`;
        }
        cx.notify();
        try {
          const changed = await watchFolder(dirname(path));
          if (!changed.some((c) => c === path)) continue;
        } catch {
          await cx.sleep(2000);
        }
      }
    });
  }

  /** The surface is idle (nothing left to draw for the file as loaded so far) or busy again: the writer loop reports it. */
  private reportIdle(idle: boolean): void {
    this.pendingStatus = JSON.stringify({ idle: idle && this.loaded, at: new Date().toISOString(), src: this.srcPath });
  }

  private async loadTools(path: string): Promise<typeof this.tools> {
    const text = await readTextFile(path);
    if (!text) return {};
    const specs = JSON.parse(text) as Record<string, ToolSpec>;
    return Object.fromEntries(
      Object.entries(specs).map(([name, spec]) => [
        name,
        async (args: Record<string, unknown>) => {
          const r = await exec(expand(spec.command), [...(spec.args ?? []), JSON.stringify(args)], {
            cwd: spec.cwd ? expand(spec.cwd) : undefined,
          });
          if (r.code !== 0) throw new Error(r.stderr.trim() || `${name} exited with ${r.code}`);
          try {
            return JSON.parse(r.stdout);
          } catch {
            return r.stdout;
          }
        },
      ]),
    );
  }

  /**
   * Appends event lines to the events file and writes the status file, from a task of this
   * view: writes need one. The loop looks for work every WRITE_TICK_MS rather than being woken
   * by a promise: a promise resolved by a handler would continue the loop inside that handler's
   * view (a modal's), whose release would cancel the write. Awaiting only its own sleeps and
   * writes, it stays in this view's scope. fs/promises has no append, so each batch reads the
   * file and writes it back longer.
   */
  private startWriter(cx: Context): void {
    cx.spawn(async (cx) => {
      for (;;) {
        if (this.pendingEvents.length) {
          const lines = this.pendingEvents.splice(0);
          const path = this.eventsPath;
          try {
            await mkdir(dirname(path), { recursive: true });
            const current = (await readTextFile(path)) ?? "";
            await writeFile(path, `${current}${lines.map((l) => `${l}\n`).join("")}`);
            this.writeError = null;
          } catch (e) {
            this.writeError = `Can't write ${path}: ${e}`;
          }
          cx.notify();
        }
        if (this.pendingStatus !== null) {
          const text = this.pendingStatus;
          this.pendingStatus = null;
          try {
            await mkdir(dirname(this.statusPath), { recursive: true });
            await writeFile(this.statusPath, text);
          } catch {}
        }
        await cx.sleep(WRITE_TICK_MS);
      }
    });
  }

  private record(entry: Record<string, unknown>): void {
    this.pendingEvents.push(JSON.stringify({ at: new Date().toISOString(), src: this.srcPath, ...entry }));
  }

  private send(message: string): void {
    if (!this.p.reply) return;
    void hc(["send", this.p.reply, message]).catch((e) => console.log(`[opengpui] hc send failed: ${e}`));
  }

  private onAction(event: ActionEvent): void {
    const formState = plainFormState(event.formState);
    if (event.type === "open_url") {
      const url = String(event.params?.url ?? "");
      if (/^https?:\/\//.test(url)) {
        const opener = herdrWindow()?.platform === "linux" ? "xdg-open" : herdrWindow()?.platform === "windows" ? "explorer" : "open";
        void exec(opener, [url]).catch(() => {});
      }
    }
    this.record({ type: event.type, message: event.humanFriendlyMessage, params: event.params, formName: event.formName, formState });
    if (event.type !== "open_url") {
      const detail = JSON.stringify({ params: event.params, form: event.formName, state: formState });
      this.send(`[opengpui ${this.srcPath ?? "demo"}] ${event.type}: ${event.humanFriendlyMessage || "(no message)"} ${detail}`);
    }
  }

  private onErrors(errors: OpenUIError[]): void {
    const key = JSON.stringify(errors);
    if (key === this.lastErrorReport) return;
    this.lastErrorReport = key;
    if (!errors.length) return;
    this.record({ type: "errors", errors });
    const lines = errors.map((e) => `${e.code}${e.component ? ` (${e.component})` : ""}: ${e.message}${e.hint ? ` Hint: ${e.hint}` : ""}`);
    this.send(`[opengpui ${this.srcPath ?? "demo"}] errors in your OpenUI file:\n${lines.join("\n")}`);
  }

  render(_cx: Context) {
    this.surface.setTokens(herdrTokens(this.p.look ?? "herdr"));
    const t = this.surface.tokens;
    const errors = this.session.errors;
    const content = this.surface.renderContent();
    // The response draws in a plain column, like OpenUI's Renderer root, in body text.
    // Its height inside the padding is what a long markdown block's scroll region fills.
    const pad = t.spaceL;
    const body = textStyle(
      div()
        .id("opengpui-body")
        .flex()
        .flex_col()
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .p(pad)
        .text_color(t.textNeutralPrimary)
        .on_size_change((size, cx) => {
          const height = Math.max(0, size.height - 2 * pad);
          if (this.viewportHeight !== height) {
            this.viewportHeight = height;
            this.surface.setViewportHeight(height);
            cx.notify();
          }
        }),
      typography(t, "body", "default"),
    );
    // Host chrome: a status line above, errors below, in OpenUI's small label text.
    const label = (el: ReturnType<typeof div>) => textStyle(el, typography(t, "label", "small"));
    return div()
      .id("opengpui-root")
      .relative()
      .flex()
      .flex_col()
      .size_full()
      .bg(t.background)
      .child(
        label(h_flex().h(30).px(t.spaceM).gap(t.spaceS).items_center().border_b_1().border_color(t.borderDefault).text_color(t.textNeutralSecondary))
          .child(div().flex_1().truncate().child(this.p.title ?? this.srcPath ?? "opengpui"))
          .when(this.session.blocked && this.loaded, (el) => el.child(div().text_color(t.textInfoPrimary).child("streaming…")))
          .when(this.session.isQueryLoading, (el) => el.child(div().child("loading data…")))
          .when(this.writeError != null, (el) => el.child(div().text_color(t.textDangerPrimary).truncate().child(this.writeError ?? "")))
          .when(errors.length > 0, (el) => el.child(div().text_color(t.textDangerPrimary).child(`${errors.length} error${errors.length > 1 ? "s" : ""}`))),
      )
      .child(
        content.length === 0
          ? body.child(div().text_color(t.textNeutralSecondary).child(this.loadError ?? (this.loaded ? "Nothing to show yet" : "Loading…")))
          : body.children(content),
      )
      .when(errors.length > 0, (el) =>
        el.child(
          label(v_flex().id("opengpui-errors").max_h(120).overflow_y_scrollbar().px(t.spaceM).py(t.spaceXs).gap(t.space3xs).border_t_1().border_color(t.borderDefault).text_color(t.textDangerPrimary))
            .children(errors.map((e) => `${e.code}${e.component ? ` (${e.component})` : ""}: ${e.message}`)),
        ),
      )
      // Modals (RenderContext.overlay) cover the whole pane, the pane being OpenUI's viewport.
      .children(this.surface.renderOverlays().map((o) => div().absolute().top(0).left(0).size_full().child(o)));
  }

  async close(_cx: Context): Promise<void> {
    this.surface.close();
  }
}
