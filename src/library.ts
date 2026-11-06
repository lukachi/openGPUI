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

  const components = Object.values(library.components).filter((c) => keep.has(c.name));
  const componentGroups = (library.componentGroups ?? [])
    .map((g) => ({
      ...g,
      components: g.components.filter((n) => keep.has(n)),
      ...(g.notes ? { notes: g.notes.filter(mentionsKept) } : {}),
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
