// opengpui under the headless harness (tools/oui-harness): one .oui file drawn
// the way the Herdr mod draws a pane's content area, with OpenUI's own look,
// and nothing from Herdr. The harness hands over the file and its options
// through the "oui-harness" host module and reads actions and errors back as
// JSON lines. A "response" step hands over a new text for the file, as Herdr's
// file watch does when an agent rewrites it; a framed text without its end
// line is streaming, as in Herdr.
import type { ActionEvent, OpenUIError } from "@openuidev/lang-core";
import { div, View, type Context } from "gpui-kit";
import { clock, emit, fonts, job, response } from "oui-harness";
import { components, isStreamingResponse, openuiFonts, resolveTokens, selectLibrary, Session, Surface, textStyle, typography } from "../../src/index.ts";
import { harnessImages } from "./images.ts";

// The harness runs time on a simulated clock: sleeps and timers return at once
// with the clock moved on. The core also times itself by Date.now() (watchdogs
// that restart a stalled task, redraw throttles), so Date.now() runs ahead by
// the simulated time, keeping both clocks in step as they are in Herdr.
const wallNow = Date.now.bind(Date);
Date.now = () => wallNow() + clock();

export default class Harness extends View {
  private surface!: Surface;
  private session!: Session;
  /** The body's height inside its padding, as last told to the surface. */
  private viewportHeight = -1;
  private lastErrors = "";

  init(_props: unknown, cx: Context): void {
    const j = job();
    const installed = new Set(fonts());
    const source = selectLibrary(j.library, Object.keys(components));
    this.session = new Session({
      library: source.library,
      tools: this.tools(j.tools, cx),
      onAction: (event) => this.onAction(event),
      onError: (errors) => this.onErrors(errors),
    });
    this.surface = new Surface({
      session: this.session,
      components,
      tokens: resolveTokens(j.mode, { fonts: openuiFonts((family) => installed.has(family)) }),
      icons: (file) => `icons/${file}.svg`,
      images: harnessImages(j.base, j.home, j.scratch),
    });
    // As Herdr's status file does (herdr/src/main.ts): scripts/shot.ts flags a file that settled busy.
    this.surface.onIdle = (idle) => emit(JSON.stringify({ type: "idle", idle }));
    this.session.setResponse(j.text, isStreamingResponse(j.text));
    this.session.update();
    if (j.follow) this.follow(cx);
    this.surface.attach(cx);
  }

  /** The text a "response" step handed over, looked for every 50 ms as Herdr's file watch would report it. */
  private follow(cx: Context): void {
    cx.spawn(async (cx) => {
      for (;;) {
        await cx.sleep(50);
        const text = response();
        if (text == null) continue;
        this.session.setResponse(text, isStreamingResponse(text));
        cx.notify();
      }
    });
  }

  /**
   * Query/Mutation tools for `shot.ts --tools`: each answers its `result` (or fails with
   * `error`) `delay` simulated ms after the call, as a Herdr tools.json command answers
   * after it runs. The answers go out from this view's own task.
   */
  private tools(text: string | null, cx: Context): Record<string, (args: Record<string, unknown>) => Promise<unknown>> {
    if (!text) return {};
    const specs = JSON.parse(text) as Record<string, { result?: unknown; error?: string; delay?: number }>;
    const pending: { due: number; settle: () => void }[] = [];
    cx.spawn(async (cx) => {
      for (;;) {
        await cx.sleep(16);
        const now = clock();
        for (const call of pending.filter((c) => c.due <= now)) {
          pending.splice(pending.indexOf(call), 1);
          call.settle();
        }
      }
    });
    return Object.fromEntries(
      Object.entries(specs).map(([name, spec]) => [
        name,
        () =>
          new Promise((resolve, reject) => {
            const settle = () => (spec.error != null ? reject(new Error(spec.error)) : resolve(spec.result ?? null));
            pending.push({ due: clock() + (spec.delay ?? 0), settle });
          }),
      ]),
    );
  }

  private onAction(event: ActionEvent): void {
    emit(
      JSON.stringify({
        type: "action",
        action: event.type,
        message: event.humanFriendlyMessage,
        params: event.params,
        formName: event.formName,
        formState: event.formState,
      }),
    );
  }

  private onErrors(errors: OpenUIError[]): void {
    const key = JSON.stringify(errors);
    if (key === this.lastErrors) return;
    this.lastErrors = key;
    if (errors.length) emit(JSON.stringify({ type: "errors", errors }));
  }

  render(_cx: Context) {
    const t = this.surface.tokens;
    const pad = t.spaceL;
    // Herdr's pane body (herdr/src/main.ts): a scrolling column in body text whose
    // height inside the padding is what a long markdown block's scroll region fills.
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
    return div()
      .id("opengpui-root")
      .relative()
      .flex()
      .flex_col()
      .size_full()
      .bg(t.background)
      .child(body.children(this.surface.renderContent()))
      .children(this.surface.renderOverlays().map((o) => div().absolute().top(0).left(0).size_full().child(o)));
  }

  async close(_cx: Context): Promise<void> {
    this.surface.close();
  }
}
