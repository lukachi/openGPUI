// The worked diagram examples `opengpui examples` prints (skills/opengpui/examples/), bundled
// into the CLI as text so an agent that only has the CLI has them too.
import architecture from "../skills/opengpui/examples/architecture.oui" with { type: "text" };
import classDiagram from "../skills/opengpui/examples/class.oui" with { type: "text" };
import dependencies from "../skills/opengpui/examples/dependencies.oui" with { type: "text" };
import er from "../skills/opengpui/examples/er.oui" with { type: "text" };
import flowchart from "../skills/opengpui/examples/flowchart.oui" with { type: "text" };
import pipeline from "../skills/opengpui/examples/pipeline.oui" with { type: "text" };
import sequence from "../skills/opengpui/examples/sequence.oui" with { type: "text" };
import stateMachine from "../skills/opengpui/examples/state-machine.oui" with { type: "text" };
import timeline from "../skills/opengpui/examples/timeline.oui" with { type: "text" };

export interface Example {
  name: string;
  /** One line for the list: what kind of picture it is. */
  about: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  { name: "architecture", about: "Diagram: a system's parts in groups, with steps that walk a request through it", source: architecture },
  { name: "flowchart", about: "Diagram: a process with decisions (start, decision, end kinds) and a retry loop", source: flowchart },
  { name: "state-machine", about: "Diagram: states and the events between them, cycles included", source: stateMachine },
  { name: "pipeline", about: "Diagram, left to right: data flowing through stages", source: pipeline },
  { name: "dependencies", about: "Diagram: tasks grouped by phase, arrows for 'needed before'", source: dependencies },
  { name: "er", about: "Diagram with Entity: tables, fields, keys and cardinalities", source: er },
  { name: "class", about: "Diagram with Entity: classes, members, inheritance and composition", source: classDiagram },
  { name: "sequence", about: "Sequence: messages between participants in order, a block, steps", source: sequence },
  { name: "timeline", about: "Timeline: a roadmap by lane with dates, dependencies and milestones", source: timeline },
];
