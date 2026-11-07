// The Diagram components (docs/diagram.md): openGPUI's own extension, added to upstream's
// libraries with lang-core's `extend`, so lang-core parses, streams, type-checks and prompts
// them like any upstream component. The renderers are opengpui's (`component: null` here, as
// in upstream's schemas compiled without React); Node, Entity, Field, Group, Edge and
// DiagramStep are values a Diagram reads, never drawn on their own.
import { action, createLibrary, defineComponent } from "@openuidev/lang-core";
import { z } from "zod";
import type { LibrarySource } from "../library.ts";
import { EDGE_HEADS, EDGE_STYLES, FIELD_KEYS, NODE_KINDS } from "./types.ts";
import { DiagramStep } from "./step.ts";
import { Block, Message, Participant, Sequence, SEQUENCE_NOTES } from "./sequence.ts";
import { Task, Timeline, TIMELINE_NOTES } from "./timeline.ts";

export { DiagramStep };

export const Node = defineComponent({
  name: "Node",
  props: z.object({
    id: z.string(),
    label: z.string(),
    kind: z.enum(NODE_KINDS).optional(),
    sub: z.string().optional(),
    action: action().optional(),
  }),
  description:
    "A box in a Diagram. id: short, unique in its Diagram. kind picks the icon (default process); start and end are pills. sub: a smaller second line. action replaces what a click sends.",
  component: null,
});

export const Field = defineComponent({
  name: "Field",
  props: z.object({ name: z.string(), type: z.string().optional(), key: z.enum(FIELD_KEYS).optional() }),
  description: "A row of an Entity: a column, attribute or method (`save()`). type shows on the right; key marks a primary (pk) or foreign (fk) key.",
  component: null,
});

export const Entity = defineComponent({
  name: "Entity",
  props: z.object({
    id: z.string(),
    label: z.string(),
    fields: z.array(Field.ref),
    sub: z.string().optional(),
    action: action().optional(),
  }),
  description:
    "A box drawn as a card of fields (a table, a class), going wherever a Node goes and sharing its ids. Edges attach to the whole card; put cardinality in the edge label.",
  component: null,
});

export const Group = defineComponent({
  name: "Group",
  props: z.object({ id: z.string(), label: z.string(), nodes: z.array(z.union([Node.ref, Entity.ref])) }),
  description: "A labelled frame around its nodes (a process, a machine, a folder). Groups don't nest; edges connect nodes, not groups.",
  component: null,
});

export const Edge = defineComponent({
  name: "Edge",
  props: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
    style: z.enum(EDGE_STYLES).optional(),
    head: z.enum(EDGE_HEADS).optional(),
  }),
  description:
    "A line between two node ids of its Diagram, ending at to. style: solid (default) or dashed. head: arrow (default), none, triangle (hollow: inherits) or diamond (filled: composition). Its id is from>to; one edge per pair (merge the labels).",
  component: null,
});

export const Diagram = defineComponent({
  name: "Diagram",
  props: z.object({
    nodes: z.array(z.union([Node.ref, Entity.ref, Group.ref])),
    edges: z.array(Edge.ref),
    steps: z.array(DiagramStep.ref).optional(),
    direction: z.enum(["down", "right"]).optional(),
  }),
  description:
    "Boxes and the edges between them, laid out automatically (architecture, flowchart, state machine, dependencies, ER or class diagram), with optional numbered steps that light up their part. direction: down (default) or right (gets wide fast).",
  component: null,
});

const COMPONENTS = [Diagram, Node, Entity, Field, Group, Edge, DiagramStep, Sequence, Participant, Message, Block, Timeline, Task];
/** The diagram types: admitted in SLOTS, unlike the values they read. */
const VIEWS = [Diagram, Sequence, Timeline];

/** The containers whose content a Diagram may join (the openui root Stack takes any child already). */
const SLOTS = ["TabItem.content", "AccordionItem.content", "Card.children"];

const NOTES = [
  "Write each Diagram as its own statement, and its nodes, edges and steps lists each as their own: `d = Diagram(dNodes, dEdges, dSteps)`.",
  "Ids are short and unique within one Diagram (nodes, entities and groups share them); two Diagrams may reuse an id.",
  "An edge points the way the diagram reads (cause to effect, caller to callee, one step to the next); the layout places its target after its source.",
  "At most about 20 nodes per Diagram: several Diagrams beat one big one.",
  "When you rewrite a Diagram, keep its nodes and edges in the same order: the layout depends on it.",
  'Clicking a box sends you `Tell me more about <label>` with context {diagram: "<statement id>", node: "<id>"}; a step\'s ask button sends `Tell me more about step <n>: <title>` with {diagram, step, highlight}. A box\'s or step\'s own action replaces it.',
  ...SEQUENCE_NOTES,
  ...TIMELINE_NOTES,
];

/** `source` with the Diagram components, admitted where a Card, TabItem or AccordionItem holds content, and their prompt group. */
export function withDiagrams(source: LibrarySource): LibrarySource {
  const { library } = source;
  const schema = library.toJSONSchema().$defs ?? {};
  const has = (slot: string) => {
    const [parent, prop] = slot.split(".");
    const def = schema[parent!] as { properties?: Record<string, unknown> } | undefined;
    return !!def?.properties?.[prop!];
  };
  const slots = SLOTS.filter(has);
  const values = COMPONENTS.filter((c) => !(VIEWS as readonly unknown[]).includes(c));
  const views = VIEWS.map((component) => (slots.length ? { component, slots } : component));
  const extended = library.extend({ components: { add: [...values, ...views] } });
  // `extend` takes no groups; the group goes on through createLibrary, with everything else kept.
  const extendedLibrary = createLibrary({
    root: extended.root,
    id: extended.id,
    components: Object.values(extended.components),
    functions: Object.values(extended.functions),
    actions: Object.values(extended.actions),
    componentGroups: [...(extended.componentGroups ?? []), { name: "Diagrams", components: COMPONENTS.map((c) => c.name), notes: NOTES }],
  });
  return { library: extendedLibrary, promptOptions: source.promptOptions };
}
