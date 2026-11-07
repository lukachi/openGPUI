// What the opengpui CLI and the Herdr mod agree on: where a shown file's events go, and the
// shape of an event, in the events file and in the `hc send` reply alike. Pure: no herdr or
// gpui imports, so the CLI (Bun) and the tests use it as the mod does.
import { join } from "path";

/** One line of the events file, and the JSON line of a reply. */
export type PaneEvent =
  | {
      at: string;
      src: string | null;
      /** continue_conversation (@ToAssistant, a button without action), open_url (@OpenUrl), or a library's custom action. */
      type: string;
      /** The message the action carries: @ToAssistant's text or the button's label; "" when it has none. */
      message: string;
      /** @ToAssistant's context is `params.context`; @OpenUrl's address `params.url`. */
      params: Record<string, unknown>;
      /** The Form the action fired from, if any. */
      formName?: string;
      /** Inside a Form: `{ <formName>: { <field>: value } }`. Outside: every form and every `$variable` (`"$name": value`). */
      formState: Record<string, unknown>;
    }
  | {
      at: string;
      src: string | null;
      type: "errors";
      /** lang-core's errors: code, message, and where known component, statementId, path, hint. */
      errors: Record<string, unknown>[];
    };

/** FNV-1a (32 bit) as 8 hex digits: a stable short tag for a path, the same in Bun and QuickJS. */
function pathTag(path: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * The events file of the shown file `src` (absolute): `<herdrHome>/opengpui/events/<stem>-<tag>.jsonl`,
 * the tag taken from the whole path, so files of one name in two folders never share a log.
 * The pane without a file (the demo) logs to `demo.jsonl`.
 */
export function eventsPath(herdrHome: string, src: string | null): string {
  const name = src ? `${src.split("/").pop()!.replace(/\.[^.]*$/, "").replace(/[^\w.-]+/g, "_")}-${pathTag(src)}` : "demo";
  return join(herdrHome, "opengpui", "events", `${name}.jsonl`);
}

/** The surface's idle report for the pane logging to `events` (internal: tools/preview/preview.ts waits on it). */
export function statusPath(herdrHome: string, events: string): string {
  return join(herdrHome, "opengpui", "status", `${events.split("/").pop()!.replace(/\.jsonl$/, "")}.json`);
}

/** The text `hc send` types into the agent's terminal: a headline, then the event's JSON line. */
export function replyText(event: PaneEvent): string {
  const headline =
    event.type === "errors" && "errors" in event
      ? `errors: ${event.errors.length} in your OpenUI file`
      : `${event.type}: ${"message" in event && event.message ? event.message : "(no message)"}`;
  return `[opengpui ${event.src ?? "demo"}] ${headline}\n${JSON.stringify(event)}`;
}
