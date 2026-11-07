// Reads a raw response: bare OpenUI Lang, or a stored message with protocol
// markers, optionally with an OpenUI Cloud scripts section.
// Port of @openuidev/react-lang src/responseBundle.ts (MIT), framework-free.
import { parseMessage } from "@openuidev/lang-core";

const SCRIPTS = "]]>openui:scripts";
const CONTENT_LINE = /^\]\]>openui:content(?:\?.*)?\r?$(\n?)/m;
// A scripts line without its JSON would read as a message marker; keep it in the content.
const BARE_SCRIPTS = /^\]\]>openui:scripts(?=\?|\r?$)/gm;

// Markers inside DSL/JSON strings are ordinary content.
function markerIndex(text: string): number {
  if (!text.includes("]]>")) return -1;
  let quote = "";
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === quote) quote = "";
    } else if (c === "#" || (c === "/" && text[i + 1] === "/")) {
      const newline = text.indexOf("\n", i);
      if (newline < 0) return -1;
      i = newline;
    } else if (c === '"' || c === "'") quote = c;
    else if (text.startsWith("]]>", i)) return i;
  }
  return -1;
}

function readScripts(header: string, payload: string): { names: Set<string>; revision: string } | null {
  try {
    const { count } = JSON.parse(header);
    const values: unknown = JSON.parse(payload);
    if (!Array.isArray(values) || !Number.isSafeInteger(count) || count !== values.length) return null;
    const names = new Set<string>();
    for (const script of values as { name?: unknown; code?: unknown }[]) {
      if (!script || typeof script.name !== "string" || !script.name || typeof script.code !== "string" || names.has(script.name)) {
        return null;
      }
      names.add(script.name);
    }
    const revision = JSON.stringify(
      (values as { name: string; code: string }[])
        .map((s) => ({ name: s.name, code: s.code }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    return { names, revision };
  } catch {
    return null;
  }
}

export interface ResponseBundle {
  program: string;
  metadata: { name?: string };
  scripts: Set<string>;
  /** False while a framed (marker) response is still streaming. */
  complete: boolean;
  /** The response used protocol markers or a scripts section. */
  isBundle: boolean;
  error?: string;
  scriptRevision?: string;
}

/** A file's text is still streaming while it is framed with markers and has no end line yet. */
export const isStreamingResponse = (text: string): boolean =>
  /^\]\]>openui:content/m.test(text) && !/^\]\]>openui:end\s*$/m.test(text);

export function parseResponseBundle(response: string | null, streaming: boolean): ResponseBundle {
  const text = response ?? "";
  const line = CONTENT_LINE.exec(text);
  const framed = !!line && (!streaming || line[1] === "\n");
  const { content, attributes, end } = parseMessage(text.replace(BARE_SCRIPTS, "$& "), { streaming });
  let program = content;
  let section = false;
  let scripts: ReturnType<typeof readScripts> = null;
  const at = markerIndex(program);
  if (at >= 0 && program.startsWith(SCRIPTS, at)) {
    section = true;
    const newline = program.indexOf("\n", at);
    let to = program.length;
    if (newline >= 0) {
      const next = markerIndex(program.slice(newline + 1));
      if (next >= 0) to = newline + 1 + next;
      scripts = readScripts(program.slice(at + SCRIPTS.length, newline), program.slice(newline + 1, to));
    }
    const before = at > 0 ? program.slice(0, at).replace(/\r?\n$/, "") : "";
    const after = program.slice(to);
    program = after ? `${before}\n${after}` : before;
  }

  const metadata: ResponseBundle["metadata"] = {};
  if (!framed && !section && !end) {
    return { program, metadata, scripts: new Set<string>(), complete: true, isBundle: false };
  }
  if (framed && attributes.name !== undefined) metadata.name = attributes.name;
  const error = section && !scripts ? "Invalid scripts bundle" : undefined;
  return {
    program,
    metadata,
    scripts: scripts?.names ?? new Set<string>(),
    complete: !error && (end || !streaming || !framed),
    isBundle: true,
    error: streaming ? undefined : error,
    ...(scripts?.names.size ? { scriptRevision: scripts.revision } : {}),
  };
}
