# Diagrams

An agent draws a diagram it writes itself, and the pane lays it out and draws it natively. There
are three components, each for a family of pictures:

- `Diagram`: boxes and arrows. Architecture, flowcharts, state machines, pipelines, dependency
  graphs, trees, and with `Entity` boxes data models (ER) and class diagrams. Laid out by ELK.
- `Sequence`: messages between participants in order ([Sequence](#sequence)).
- `Timeline`: tasks on a time axis, by lane, with dependencies ([Timeline](#timeline)).

All three share one viewport (pan, zoom, fit, expand), optional numbered steps that each light up
the part they talk about, and click-to-ask: clicking a box, a message, a task or a step's ask
button sends the agent a question, and the agent answers by rewriting the file.
`opengpui examples` prints a worked example per common kind of diagram
(`skills/opengpui/examples/`); they are starting points, not the only shapes.

This is openGPUI's own extension: OpenUI has no diagram component. Everything else in the pane
stays a port of upstream.

## Syntax

Added to both libraries (`openui`, `chat`) with lang-core's `extend`. `Diagram`, `Sequence` and
`Timeline` may stand wherever a Card, TabItem or AccordionItem holds content, and at the root's
level. `DiagramStep` is shared by all three.

```
Diagram(nodes, edges, steps?, direction?)
Node(id, label, kind?, sub?, action?)
Entity(id, label, fields, sub?, action?)
Field(name, type?, key?)
Group(id, label, nodes)
Edge(from, to, label?, style?, head?)
DiagramStep(title, details, highlight, action?)
```

- `nodes`: `Node`s, `Entity`s and `Group`s. A `Group` is a labelled frame around its nodes;
  groups don't nest. A node belongs to at most one group.
- `id`: short, unique within its Diagram (nodes, entities and groups share the namespace). Two
  Diagrams may reuse ids.
- `kind`: `actor | process | module | file | store | external | decision | start | end | event |
  task | service | queue | ui` (default `process`). It picks the box's icon (`start` and `end` are
  pills); the layout ignores it.
- `sub`: a smaller second line.
- `Entity`: a box with a header and a row per `Field` (name, `type` on the right, `key` `pk` or
  `fk` as an icon). Tables for data models; classes and their members for class diagrams.
- `Edge`: an arrow between two node ids. Its id is `from>to`; a second edge with the same ends is an
  error (merge the labels). `style`: `solid` (default) or `dashed`. `head`: `arrow` (default),
  `none`, `triangle` (hollow: inheritance) or `diamond` (filled: composition). Cardinality goes in
  the label.
- `steps`: `DiagramStep`s, numbered in order. `details` is markdown. `highlight` lists node ids and
  edge ids; an edge id lights the edge and both its ends.
- `direction`: `down` (default) or `right`. `right` gets wide fast; the prompt says so.
- `action` on a Node, an Entity or a step replaces the default question (below).

A Diagram (one example per common kind of diagram: `opengpui examples`):

```
shop = Diagram(shopNodes, shopEdges, shopSteps)
shopNodes = [Node("user", "Customer", "actor"), server, Node("db", "Orders DB", "store", "Postgres")]
server = Group("server", "App server", [Node("api", "API"), Node("worker", "Worker")])
shopEdges = [Edge("user", "api", "POST /order"), Edge("api", "db", "writes"), Edge("api", "worker", "enqueues"), Edge("worker", "db", "updates")]
shopSteps = [step1, step2]
step1 = DiagramStep("The order is sent", "The API checks the order and writes it.", ["user>api", "api>db"])
step2 = DiagramStep("Work happens later", "The worker finishes the job.", ["api>worker", "worker>db"])
```

### Sequence

```
Sequence(participants, messages, steps?, blocks?)
Participant(id, label, kind?, sub?, action?)
Message(from, to, label, style?)
Block(label, first, last)
```

- Participants are columns with lifelines; messages are rows in order. Message N is the N-th
  entry of the list (a message that can't be drawn yet doesn't renumber the rest). `from == to`
  is a self message: a loop right of its lifeline, its label to the right.
- `style`: `call` (default; solid, filled head), `reply` (dashed, open head), `async` (solid, open
  head).
- `Block`: a labelled frame around messages `first`..`last` (inclusive), e.g. "loop" or
  "alt: cache miss". It frames only the columns its messages touch; nested blocks are inset per
  level.
- `highlight` holds participant ids and message numbers as strings (`"3"`); a message lights
  both its participants. A participant id wins when both match.
- Laid out in the pane (no ELK, `src/diagram/sequenceLayout.ts`): gaps between columns grow until
  every label fits between its two columns. Labels don't wrap.
- Validation (`src/diagram/sequence.ts`): `sequence-empty` (no participants or no messages),
  `sequence-duplicate-id`, `sequence-unknown-participant`, `sequence-unknown-highlight`,
  `sequence-bad-block` (not whole numbers, `first > last`, or outside 1..N), and the warning
  `sequence-too-big` (over 12 participants or 40 messages).
- Not drawn: activation bars, a repeated header row at the bottom, create and destroy messages.

### Timeline

```
Timeline(tasks, steps?)
Task(id, label, start, end?, lane?, after?, status?)
```

- `start` and `end`: ISO dates (`"2026-11-07"`, UTC calendar days) or numbers (sprints, weeks);
  the first task's start decides which, and a quoted number is an error. Ends are inclusive:
  `Task(…, 1, 2)` covers periods 1 and 2. A task without `end` is a milestone, a diamond where its
  start period begins.
- `lane`: tasks are grouped by lane, lanes in order of first appearance, one row per task. Tasks
  without a lane form a group without a header.
- `after`: the ids of tasks this one depends on, drawn as arrows from the dependency's end into
  this task's start. A task after itself is ignored; cycles are drawn as written.
- `status`: `planned` (default, an outline), `active` (accent fill), `done` (muted, a check icon)
  or `blocked` (error tint, a Ban icon).
- `highlight` holds task ids; an arrow lights when both its tasks do.
- Laid out in the pane (no ELK, `src/diagram/timelineLayout.ts`). Ticks: days for spans up to 31
  days, Monday weeks up to 140 days, then months (every 3, 6 or 12 on long spans); numbers get
  integer ticks every 1, 2, 5, 10… units. Arrows run under bars.
- Validation (`src/diagram/timeline.ts`): `timeline-empty`, `timeline-duplicate-id`,
  `timeline-bad-date`, `timeline-mixed-units`, `timeline-end-before-start`,
  `timeline-unknown-dependency`, `timeline-unknown-highlight`, and the warning `timeline-too-big`
  (over 40 tasks).

## Validation

Each component has a validator (Diagram `src/diagram/validate.ts`, Sequence and Timeline in their
own files); all run in `opengpui check` and in the pane (`diagramErrors` in the Session), after
lang-core's own checks (argument types, unknown components). Their problems are reported like
lang-core's: a line per problem in `check`, the pane's error list, and the `errors` event.

For a Diagram:

- duplicate node, entity or group id;
- an edge end that is not a node id (a group id included);
- a duplicate edge (same `from>to`);
- a duplicate field name in one Entity (`diagram-duplicate-field`);
- a highlight id that is neither a node id nor an edge id;
- an empty Diagram.

Each unknown id gets a "did you mean" from the diagram's ids. A Diagram over 30 nodes gets a
warning (not a failure): split it. Sequence and Timeline codes are listed in their sections.

While the file streams, edges whose ends haven't arrived yet are skipped, and a step's highlight
is ignored until the step is complete (a cut-off id would light nothing or the wrong thing).
lang-core marks only the whole tree as partial, not one statement, so while the file is cut
mid-statement the last step written (inline and as a statement) counts as incomplete; it lights
once the stream ends.

## Layout

ELK layered (elkjs), run outside the pane: Herdr's QuickJS has no WebAssembly, and elkjs in
QuickJS needs patches and can pass gpui-shell's 500 ms task budget, which interrupts the pane
(see the spike in `tmp/diagram-spike/layout/NOTES.md`; numbers below are from it).

1. **Sizing (in the pane).** The renderer turns a Diagram into a sized graph: every node, group
   title and edge label gets a width and height from its text, measured with the charts'
   `Measurer` (`src/components/charts/measure.ts`): gpui has no text measurement a script can
   call, so invisible probes in the same style report their drawn width, cached per face and
   size for the life of the host. A Diagram lays out once every character is measured.
2. **Cache.** The key is a hash of the sized graph and the layout version. A hit draws at once.
   Changing the selected step, the narration, or anything outside the Diagram doesn't change the
   key.
3. **Host.** On a miss the renderer asks `ctx.layout(graph)`, which works like `ctx.image(src)`:
   "loading" until the host answers, then "ready" or "failed", and the view redraws. The Surface
   gets a new option beside `icons` and `images`:
   ```ts
   type DiagramLayouter = (graph: SizedGraph) => Promise<DiagramLayout>;
   new Surface({ ..., layout: DiagramLayouter })
   ```
   - **Herdr** (`herdr/src/layout.ts`): writes the graph to
     `~/.config/herdr-app/opengpui/layout/<hash>.in.json` and runs the mod's own CLI,
     `cli/opengpui layout <in> <out>`, with `exec` (Node 18+ or Bun, as the CLI needs anyway).
     About 140–240 ms per layout, off the pane's thread. The result stays in that folder as the
     cache, cleaned like the image cache.
   - **Harness**: the Rust host gets a `layout(input)` function that runs the same CLI command
     synchronously (the harness's clock is simulated, so a blocking call costs no frames);
     `shot.ts` tells it the command.
4. **When.** While the file streams, a graph is laid out once it has outlived a new chunk or
   300 ms (the rule images follow); a complete file lays out at once. Until the first layout the
   Diagram shows a placeholder with its node count; after that, a changed graph keeps showing the
   previous layout until the new one lands. A loading layout counts as busy for the idle status.
5. **Failure.** No Node/Bun, or the layout fails: the Diagram shows the error in place and the
   pane reports it as a runtime error.

`opengpui layout <in> <out>` is internal (listed under Internal in the agent contract). Its
input and output:

```ts
interface SizedGraph {
  direction: "down" | "right";
  nodes: { id: string; w: number; h: number; group?: string }[];
  groups: { id: string; titleW: number; titleH: number }[];
  edges: { id: string; from: string; to: string; labelW?: number; labelH?: number }[];
}
interface DiagramLayout {
  width: number; height: number;                       // px at scale 1
  nodes: Record<string, { x: number; y: number }>;      // top-left, absolute
  groups: Record<string, { x: number; y: number; w: number; h: number; titleX: number; titleY: number }>;
  edges: Record<string, { points: [number, number][]; labelX?: number; labelY?: number }>; // orthogonal polyline, start to end
}
```

ELK options: `layered`, direction from the Diagram, orthogonal edge routing,
`hierarchyHandling: INCLUDE_CHILDREN`, labels sized and placed by ELK, coordinates relative to
the root, plus the tuned spacing set from the spike. elkjs (about 3 MB) goes into the CLI bundle
only, never into `shared.js`. Its order sensitivity is a property of the input: the skill asks the
agent to keep nodes and edges in the same order across rewrites.

## Drawing

Each diagram component has a retained view of its own (hover, the selected step, pan and zoom).
The viewport, its controls, pan and zoom, the expanded view and the steps list are one shared
module, `src/components/diagram/canvas.ts` (its header documents the API); each component
supplies only its drawing at a scale, what to reveal for a step, and its clicks.

- **Viewport.** A bordered box, full width of its column. At first it fits the diagram's width
  (never above scale 1) and is as tall as the fitted diagram, at most 70 % of the pane's height.
- **Groups**: a frame with the title in ELK's title box. **Nodes**: a rounded box with the
  kind's lucide icon (actor User, process Cpu, module Package, file FileText, store Database,
  external Cloud, decision Diamond, start Play, end Flag, event Zap, task SquareCheck, service
  Server, queue Layers, ui AppWindow), the label and `sub`; `start` and `end` are pills,
  `external` has a dashed border. **Entities**: a card with the header (label, `sub`) over a row
  per field: a key column (KeyRound for `pk`, Link for `fk`) when any field has a key, the name,
  and the type on the right in muted text, in the code font. **Edges**: the polyline through
  `paint_path`, solid or dashed, with its head at the `to` end (the line stops where the head
  starts, so a hollow triangle stays empty), the label on a plate at ELK's label box.
  Colors, radii and type come from OpenUI's tokens, so both looks work.
- **Paths** are built once per layout and zoom level and reused while panning (a pan moves the
  layer, it doesn't rebuild it).
- **Steps** sit under the viewport as a numbered list in OpenUI's Steps look, with the selected
  step marked and Previous / Next buttons. No step is selected at first. Selecting one dims every
  node and edge it doesn't highlight and pans the viewport to bring the highlighted part into
  view.
- **Hover** on a node marks it and its edges.

### Pan and zoom

gpui-kit gives the pane wheel, mouse button and mouse move events, no pinch and no element
scale. Zoom is a redraw at another scale: coordinates and font sizes are multiplied, text widths
scale with them.

- Drag: pans. A press that moves less than 4 px is a click.
- ⌘ (macOS) / Ctrl + wheel or trackpad scroll: zooms around the pointer, 0.25× to 2×.
- Plain wheel: scrolls the page as everywhere else in the pane.
- Buttons in the viewport's corner: `−`, `+`, fit, and expand.
- Keys while the Diagram has focus: `+`, `-`, `0` (fit), arrows (pan), `[` `]` (previous/next step).
- **Expand** opens the Diagram over the whole pane (`ctx.overlay`); there a plain wheel or
  two-finger scroll pans too. Escape or the button closes it.

## Events

A click (not a drag) on a node, an entity or a participant sends, unless it has an `action`:

```
@ToAssistant("Tell me more about <label>", {diagram: "<statement id>", node: "<id>"})
```

On a message: `Tell me more about message <n>: <label>` with `{diagram, message: <n>}`; on a task:
`Tell me more about <label>` with `{diagram, task: "<id>"}`.

Each step has an ask button, unless the step has an `action`:

```
@ToAssistant("Tell me more about step <n>: <title>", {diagram, step: <n>, highlight: [...]})
```

All arrive as `continue_conversation` events like any button's (see the agent contract).

## Prompt, skill and examples

- `opengpui prompt` gains a Diagrams group: the signatures and short notes (one statement per
  diagram and its lists; ids; size limits, several diagrams beat one big one; what a click sends).
- The skill's Diagrams section is general: which component fits which picture, small diagrams,
  optional steps, stable order when rewriting, answering a click by adding rather than starting
  over. It points to the examples.
- `opengpui examples [name]` lists and prints worked examples (`skills/opengpui/examples/`,
  bundled into the CLI by `bin/examples.ts`): architecture, flowchart, state machine, pipeline,
  dependencies, ER, class, sequence, timeline. `test/examples.test.ts` keeps each passing `check`.

## Files

| Path | What |
|---|---|
| `src/diagram/types.ts` | the model, `SizedGraph`, `DiagramLayout`, `DiagramLayouter` |
| `src/diagram/components.ts` | Diagram's `defineComponent`s and the library extension (`withDiagrams`) for all three |
| `src/diagram/step.ts` | `DiagramStep`, shared by all three |
| `src/diagram/model.ts` | a Diagram's evaluated props → its model (streaming-aware) |
| `src/diagram/validate.ts` | the Diagram validator shared by `check` and the pane (through `Session`) |
| `src/diagram/elk.ts` | sized graph → layout with elkjs (CLI only) |
| `src/diagram/sequence.ts`, `sequenceLayout.ts` | Sequence: definitions, model, validator; its in-pane layout |
| `src/diagram/timeline.ts`, `timelineLayout.ts` | Timeline: definitions, model, dates, validator; its in-pane layout |
| `src/render/surface.ts` | the `layout` option and `ctx.layout(graph)` |
| `src/components/diagram.ts` | the Diagram renderer: sizing, nodes, entities, edges, highlight, node events |
| `src/components/sequence.ts`, `timeline.ts` | the Sequence and Timeline renderers |
| `src/components/diagram/canvas.ts` | what every diagram type shares (its header documents the API): viewport, pan/zoom, expand, keys, steps list, step ask |
| `src/components/diagram/kinds.ts` | the kind → lucide icon table (Node, Participant) |
| `herdr/src/layout.ts` | Herdr's layouter: cache folder and `exec` |
| `tools/harness/host`, `script/` | the harness's `layout` host function and layouter |
| `bin/opengpui.ts`, `bin/examples.ts` | `layout` and `examples` commands |
| `skills/opengpui/examples/` | the worked examples |

## Not in this version

Pinch zoom (no event), nested groups, edges to groups, a minimap, left-to-right layouts that fit a
narrow pane, and keeping a layout stable when a node is added.

## Decisions made while building

- **The mod finds its CLI** through a `cli` prop: Herdr has no API for a mod's own folder, so
  `opengpui show` passes its launcher's path; a pane without it (saved before 0.2.0) falls back
  to `mods/opengpui/cli/opengpui` under `appHome()`.
- **Back edges.** No ELK option shortens a back edge that loops around the drawing, because ELK
  always enters a node from the side its direction points from. When the first layout has back
  edges, `elk.ts` lays out again with them reversed and draws them backwards, and keeps that only
  if it has no more crossings and no more edges through nodes. Cycle breaking by model order
  keeps the node written first on top. Details in `elk.ts`'s header.
- **A plain wheel** over the viewport still scrolls the page: gpui delivers an event to every
  handler on the path unless one calls `cx.stop_propagation()`, so the Diagram stops only the
  modified (zoom) wheel events.
