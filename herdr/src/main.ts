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
import { dirname, join } from "path";
import {
  components,
  libraries,
  Session,
  subsetLibrary,
  Surface,
  textStyle,
  typography,
  type LibraryName,
} from "../../src/index.ts";
import { DEMO } from "./demo.ts";
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

/** A Response is "streaming" while it is framed with markers and has no end line yet. */
const isStreaming = (text: string) => /^\]\]>openui:content/m.test(text) && !/^\]\]>openui:end\s*$/m.test(text);

export default class OpenGpui extends View {
  private p: SurfaceProps = {};
  private surface!: Surface;
  private session!: Session;
  private srcPath: string | null = null;
  private loaded = false;
  private loadError: string | null = null;
  private eventsPath = "";
  /** Event lines waiting for the writer task, and how to wake it. */
  private pendingEvents: string[] = [];
  private wakeWriter: (() => void) | null = null;
  private writeError: string | null = null;
  private lastErrorReport = "";
  /** Filled once the tools file loads; the session looks tools up at call time. */
  private readonly tools: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {};

  init(_props: unknown, cx: Context): void {
    this.p = (props() ?? {}) as SurfaceProps;
    this.srcPath = this.p.src ? expand(this.p.src) : null;
    const name = (this.srcPath ?? "demo").split("/").pop()!.replace(/\.[^.]*$/, "").replace(/[^\w.-]+/g, "_");
    this.eventsPath = this.p.events ? expand(this.p.events) : join(appHome(), "opengpui", "events", `${name}.jsonl`);

    const source = subsetLibrary(libraries[this.p.library ?? "openui"] ?? libraries.openui, Object.keys(components));
    this.session = new Session({
      library: source.library,
      tools: this.tools,
      onAction: (event) => this.onAction(event),
      onError: (errors) => this.onErrors(errors),
    });
    this.surface = new Surface({ session: this.session, components, tokens: herdrTokens(this.p.look ?? "herdr") });

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
            this.session.setResponse(text, isStreaming(text));
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
   * Appends event lines to the events file. It runs as a task: promise chains
   * started outside one are not driven by the host, so they would never write.
   * fs/promises has no append, so each batch reads the file and writes it back longer.
   */
  private startWriter(cx: Context): void {
    cx.spawn(async (cx) => {
      for (;;) {
        if (!this.pendingEvents.length) {
          await new Promise<void>((resolve) => (this.wakeWriter = resolve));
        }
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
    });
  }

  private record(entry: Record<string, unknown>): void {
    this.pendingEvents.push(JSON.stringify({ at: new Date().toISOString(), src: this.srcPath, ...entry }));
    const wake = this.wakeWriter;
    this.wakeWriter = null;
    wake?.();
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
    const body = textStyle(
      div().id("opengpui-body").flex().flex_col().flex_1().min_h(0).overflow_y_scrollbar().p(t.spaceL).text_color(t.textNeutralPrimary),
      typography(t, "body", "default"),
    );
    // Host chrome: a status line above, errors below, in OpenUI's small label text.
    const label = (el: ReturnType<typeof div>) => textStyle(el, typography(t, "label", "small"));
    return div()
      .id("opengpui-root")
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
      );
  }

  async close(_cx: Context): Promise<void> {
    this.surface.close();
  }
}
