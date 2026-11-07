// OpenUI's own component libraries, compiled from upstream source without React
// (see scripts/upstream-plugin.ts). Names, zod schemas, descriptions, groups,
// examples and rules are upstream's, so a model prompted from these writes the
// same OpenUI Lang it would for OpenUI's React renderer.
import { createLibrary, type Library, type PromptOptions } from "@openuidev/lang-core";
import { openuiChatLibrary, openuiChatPromptOptions, openuiLibrary, openuiPromptOptions } from "openui-genui";

export interface LibrarySource {
  library: Required<Library>;
  promptOptions: PromptOptions;
}

export const libraries = {
  /** The general library: dashboards, forms, tables, charts. Root: Stack. */
  openui: { library: openuiLibrary, promptOptions: openuiPromptOptions },
  /** The chat library: conversational cards, follow-ups, lists. */
  chat: { library: openuiChatLibrary, promptOptions: openuiChatPromptOptions },
} satisfies Record<string, LibrarySource>;

export type LibraryName = keyof typeof libraries;

/**
 * A copy of `source` restricted to `names`: the prompt then only teaches the
 * components a renderer implements. Groups lose the missing members (and vanish
 * when empty); examples that call a missing component are dropped, because a
 * model copies examples.
 */
export function subsetLibrary(source: LibrarySource, names: Iterable<string>): LibrarySource {
  const keep = new Set(names);
  const { library } = source;
  const known = new Set(Object.keys(library.components));
  // Text that names a dropped component would teach the model to write it:
  // examples by their calls (`Name(`, including calls inside @Each templates and
  // Query arguments, which a parse leaves as AST), notes and rules by any mention.
  const keeps = (text: string, pattern: RegExp) =>
    [...text.matchAll(pattern)].every(([, name]) => !known.has(name!) || keep.has(name!));
  const callsKept = (text: string) => keeps(text, /\b([A-Z][A-Za-z0-9]*)\s*\(/g);
  const mentionsKept = (text: string) => keeps(text, /\b([A-Z][A-Za-z0-9]*)\b/g);
  const namesAny = (text: string) => [...text.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/g)].some(([, name]) => known.has(name!));
  // A group note that names no component goes on about the one before it (EditableTable's
  // "data is an array of { id, values } rows…"), so it shares that note's fate.
  const notesKept = (notes: string[]) => {
    let kept = true;
    return notes.filter((note) => (kept = namesAny(note) ? mentionsKept(note) : kept));
  };

  const components = Object.values(library.components).filter((c) => keep.has(c.name));
  const componentGroups = (library.componentGroups ?? [])
    .map((g) => ({
      ...g,
      components: g.components.filter((n) => keep.has(n)),
      ...(g.notes ? { notes: notesKept(g.notes) } : {}),
    }))
    .filter((g) => g.components.length > 0);
  const subset = createLibrary({ root: library.root, componentGroups, components });

  // Upstream signatures keep naming dropped components inside unions (Card's
  // children, FormControl's input), so say plainly which ones exist.
  const availability =
    "Only the components listed under Component Signatures exist here. A component named only inside another's " +
    "signature (as an allowed child or input type) is not available: never write it.";
  const options = source.promptOptions;
  const promptOptions: PromptOptions = {
    ...options,
    ...(options.examples ? { examples: options.examples.filter(callsKept) } : {}),
    ...(options.toolExamples ? { toolExamples: options.toolExamples.filter(callsKept) } : {}),
    additionalRules: [...(options.additionalRules ?? []).filter(mentionsKept), availability],
  };
  return { library: subset, promptOptions };
}

/**
 * The library a host draws and prompts: `name` ("openui" by default) restricted to the
 * components the renderer `implemented`, and further to `only` when given (a skill's own
 * subset). A subset is closed over what its signatures need: the library's root, and every
 * component that is the only type a prop of a kept component takes (Table → Col, Form →
 * Buttons and FormControl, Buttons → Button). A required prop that takes one of several
 * components (FormControl's input) needs one of them listed. Throws on an unknown library,
 * on names in `only` the library doesn't implement, and on such an unmet choice.
 */
export function selectLibrary(name: string | undefined, implemented: Iterable<string>, only?: Iterable<string>): LibrarySource {
  const source = (libraries as Record<string, LibrarySource>)[name ?? "openui"];
  const label = name ?? "openui";
  if (!source) throw new Error(`unknown library "${name}": ${Object.keys(libraries).join(" or ")}`);
  const available = new Set([...implemented].filter((n) => n in source.library.components));
  if (!only) return subsetLibrary(source, available);
  const wanted = new Set(only);
  if (!wanted.size) throw new Error("no components listed");
  const unknown = [...wanted].filter((n) => !available.has(n));
  if (unknown.length) throw new Error(`not in the ${label} library: ${unknown.join(", ")}`);
  if (source.library.root) wanted.add(source.library.root);

  // The library's JSON Schema: one $defs entry per component, props holding `$ref`s to others.
  const defs: Record<string, unknown> = source.library.toJSONSchema().$defs ?? {};
  const missing = new Map<string, string[]>();
  for (let todo = [...wanted]; todo.length; ) {
    const component = todo.pop()!;
    for (const slot of componentSlots(defs[component])) {
      const [sole] = slot.refs;
      if (slot.refs.length === 1) {
        if (!wanted.has(sole!) && available.has(sole!)) {
          wanted.add(sole!);
          todo.push(sole!);
        }
      } else if (slot.required) {
        missing.set(`${component}'s ${slot.prop}`, slot.refs.filter((r) => available.has(r)));
      }
    }
  }
  const unmet = [...missing].filter(([, refs]) => !refs.some((r) => wanted.has(r)));
  if (unmet.length) {
    throw new Error(
      `the ${label} subset is incomplete: ${unmet.map(([slot, refs]) => `${slot} needs one of ${refs.join(", ")}`).join("; ")}`,
    );
  }
  return subsetLibrary(source, wanted);
}

/** A JSON Schema node, read as far as componentSlots needs it. */
interface JsonSchema {
  $ref?: unknown;
  anyOf?: unknown;
  items?: unknown;
  properties?: unknown;
  required?: unknown;
}

const schemaNode = (value: unknown): JsonSchema | null => (value && typeof value === "object" && !Array.isArray(value) ? value : null);

/**
 * The props of a component's schema that hold components: the components each takes (its
 * `$ref`s, through arrays, unions and nested objects) and whether the prop is required.
 * A prop whose union also admits a plain value (a string title or a Tag) is no slot.
 */
function componentSlots(def: unknown): { prop: string; refs: string[]; required: boolean }[] {
  const refsOf = (value: unknown): string[] | null => {
    const s = schemaNode(value);
    if (!s) return null;
    if (typeof s.$ref === "string") return [s.$ref.split("/").pop()!];
    if (s.items) return refsOf(s.items);
    if (Array.isArray(s.anyOf)) {
      const all = s.anyOf.map(refsOf);
      return all.every((r) => r) ? all.flatMap((r) => r!) : null;
    }
    return null;
  };
  const slots: { prop: string; refs: string[]; required: boolean }[] = [];
  const walk = (s: JsonSchema, path: string, required: boolean) => {
    const requiredProps = Array.isArray(s.required) ? s.required : [];
    for (const [prop, value] of Object.entries(schemaNode(s.properties) ?? {})) {
      const at = path ? `${path}.${prop}` : prop;
      const needed = required && requiredProps.includes(prop);
      const p = schemaNode(value);
      if (p?.properties) walk(p, at, needed);
      const refs = refsOf(value);
      if (refs?.length) slots.push({ prop: at, refs: [...new Set(refs)], required: needed });
    }
  };
  const schema = schemaNode(def);
  if (schema) walk(schema, "", true);
  return slots;
}
