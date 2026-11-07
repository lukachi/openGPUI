// Sequence (docs/diagram.md): participants as columns, messages as numbered rows, blocks framing
// a run of messages. Its definitions (added by withDiagrams), its model from evaluated props
// (pure, as model.ts is for Diagram) and the problems lang-core can't see in it.
//
// Message numbers are positions in the messages list (1..N), so a step or a block naming "3"
// keeps meaning the third message whatever else is dropped. Streaming: a message waits for both
// its participants (an end may still be being typed), and a block for both its numbers and for
// a range the messages written so far cover. A block being typed may frame too few messages for
// a moment (its last number cut short, "1" of "12") and grows as the rest arrives, as a label does.
import { action, defineComponent, isElementNode, type ElementNode, type OpenUIError, type OpenUIErrorCode } from "@openuidev/lang-core";
import { z } from "zod";
import { diagramSteps } from "./model.ts";
import { DiagramStep } from "./step.ts";
import { NODE_KINDS, type DiagramStepModel, type NodeKind } from "./types.ts";
import { closest } from "./validate.ts";

export const MESSAGE_STYLES = ["call", "reply", "async"] as const;
export type MessageStyle = (typeof MESSAGE_STYLES)[number];

// ── Definitions ──

export const Participant = defineComponent({
  name: "Participant",
  props: z.object({
    id: z.string(),
    label: z.string(),
    kind: z.enum(NODE_KINDS).optional(),
    sub: z.string().optional(),
    action: action().optional(),
  }),
  description:
    "A column of a Sequence. id: short, unique in its Sequence. kind picks the icon (as a Node's). sub: a smaller second line. action replaces what a click sends.",
  component: null,
});

export const Message = defineComponent({
  name: "Message",
  props: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
    style: z.enum(MESSAGE_STYLES).optional(),
  }),
  description:
    "An arrow between two participant ids of its Sequence (from == to: a self message). Numbered 1..N in list order. style: call (default; solid), reply (dashed) or async (open arrowhead).",
  component: null,
});

export const Block = defineComponent({
  name: "Block",
  props: z.object({ label: z.string(), first: z.number(), last: z.number() }),
  description: 'A labelled frame ("loop every 5 s", "alt: cache miss") around messages first..last (message numbers, inclusive).',
  component: null,
});

export const Sequence = defineComponent({
  name: "Sequence",
  props: z.object({
    participants: z.array(Participant.ref),
    messages: z.array(Message.ref),
    steps: z.array(DiagramStep.ref).optional(),
    blocks: z.array(Block.ref).optional(),
  }),
  description: "A sequence diagram: participants as columns, messages as numbered arrows top to bottom, with optional numbered steps and blocks.",
  component: null,
});

/** Sequence's lines in the prompt's Diagrams group. */
export const SEQUENCE_NOTES = [
  'A Sequence step highlights participant ids and message numbers as strings ("3"); a message number lights the message and both its participants.',
  "Clicking a participant sends `Tell me more about <label>` with {diagram, node}; clicking a message sends `Tell me more about message <n>: <label>` with {diagram, message: <n>}.",
];

// ── Model ──

export interface SequenceParticipant {
  id: string;
  label: string;
  kind: NodeKind;
  sub?: string;
  action?: unknown;
}

export interface SequenceMessage {
  /** 1-based position in the messages list. */
  n: number;
  from: string;
  to: string;
  label: string;
  style: MessageStyle;
}

export interface SequenceBlock {
  label: string;
  first: number;
  last: number;
}

export interface SequenceModel {
  participants: SequenceParticipant[];
  /** In order; while streaming, only those whose participants have arrived. */
  messages: SequenceMessage[];
  /** How many messages the list holds (the N of 1..N), drawn or not. */
  count: number;
  blocks: SequenceBlock[];
  steps: DiagramStepModel[];
}

const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const is = (v: unknown, typeName: string): v is ElementNode => isElementNode(v) && v.typeName === typeName;
const oneOf = <T extends string>(values: readonly T[], v: unknown, fallback: T): T => ((values as readonly unknown[]).includes(v) ? (v as T) : fallback);

/** The model of a Sequence whose evaluated props are `props`; `streaming` while the file is still being written. */
export function sequenceModel(props: Record<string, unknown>, streaming: boolean): SequenceModel {
  const participants: SequenceParticipant[] = [];
  for (const el of Array.isArray(props.participants) ? props.participants : []) {
    if (!is(el, "Participant")) continue;
    const id = text(el.props.id);
    if (!id) continue;
    const sub = text(el.props.sub);
    const action = el.props.action;
    participants.push({
      id,
      label: text(el.props.label) ?? "",
      kind: oneOf(NODE_KINDS, el.props.kind, "process"),
      ...(sub ? { sub } : {}),
      ...(action != null ? { action } : {}),
    });
  }

  const ids = new Set(participants.map((p) => p.id));
  const list: unknown[] = Array.isArray(props.messages) ? props.messages : [];
  const messages: SequenceMessage[] = [];
  list.forEach((el, i) => {
    if (!is(el, "Message")) return;
    const from = text(el.props.from);
    const to = text(el.props.to);
    if (from === undefined || to === undefined) return;
    if (streaming && !(ids.has(from) && ids.has(to))) return;
    messages.push({ n: i + 1, from, to, label: text(el.props.label) ?? "", style: oneOf(MESSAGE_STYLES, el.props.style, "call") });
  });

  const blocks: SequenceBlock[] = [];
  for (const el of Array.isArray(props.blocks) ? props.blocks : []) {
    if (!is(el, "Block")) continue;
    const { first, last } = el.props;
    if (typeof first !== "number" || typeof last !== "number") continue;
    const block = { label: text(el.props.label) ?? "", first, last };
    if (!streaming || blockFits(block, list.length)) blocks.push(block);
  }

  return { participants, messages, count: list.length, blocks, steps: diagramSteps(props.steps, streaming) };
}

/** Whether `b` frames whole messages of a list of `count`: what the renderer draws and the validator accepts. */
export const blockFits = (b: SequenceBlock, count: number): boolean =>
  Number.isInteger(b.first) && Number.isInteger(b.last) && b.first >= 1 && b.first <= b.last && b.last <= count;

// ── Validation ──

/** Over this many participants or messages a Sequence gets a warning: split it. */
const MAX_PARTICIPANTS = 12;
const MAX_MESSAGES = 40;

export type SequenceErrorCode =
  | "sequence-empty"
  | "sequence-duplicate-id"
  | "sequence-unknown-participant"
  | "sequence-unknown-highlight"
  | "sequence-bad-block"
  | "sequence-too-big";

/** The problems of the Sequence `model` written in statement `statementId`. */
export function validateSequence(model: SequenceModel, statementId?: string): OpenUIError[] {
  const errors: OpenUIError[] = [];
  const report = (code: SequenceErrorCode, message: string, hint?: string, warning = false) =>
    errors.push({
      source: "parser",
      // lang-core's codes are a closed union; the pipeline carries any string through.
      code: code as unknown as OpenUIErrorCode,
      message,
      component: "Sequence",
      ...(statementId ? { statementId } : {}),
      ...(hint ? { hint } : {}),
      ...(warning ? { severity: "warning" as const } : {}),
    });
  const didYouMean = (id: string, ids: Iterable<string>) => {
    const match = closest(id, ids);
    return match ? `Did you mean "${match}"?` : undefined;
  };

  if (!model.participants.length) {
    report("sequence-empty", "the Sequence has no participants", "Give it Participants and Messages between them, or remove it.");
    return errors;
  }
  if (!model.count) report("sequence-empty", "the Sequence has no messages", "Add Messages between its participants, or use a Diagram.");

  const ids = new Set<string>();
  for (const p of model.participants) {
    if (ids.has(p.id)) report("sequence-duplicate-id", `participant id "${p.id}" is used twice`, "Participant ids are unique per Sequence: rename one.");
    ids.add(p.id);
  }
  if (model.participants.length > MAX_PARTICIPANTS || model.count > MAX_MESSAGES) {
    report(
      "sequence-too-big",
      `the Sequence has ${model.participants.length} participants and ${model.count} messages`,
      `More than ${MAX_PARTICIPANTS} participants or ${MAX_MESSAGES} messages is hard to read: split it into several Sequences.`,
      true,
    );
  }

  for (const m of model.messages) {
    for (const end of m.from === m.to ? [m.from] : [m.from, m.to]) {
      if (!ids.has(end)) report("sequence-unknown-participant", `message ${m.n} "${m.label}": no participant "${end}"`, didYouMean(end, ids));
    }
  }

  const range = model.count ? `1..${model.count}` : "none (it has no messages)";
  for (const b of model.blocks) {
    if (blockFits(b, model.count)) continue;
    const why = !Number.isInteger(b.first) || !Number.isInteger(b.last) ? "message numbers are whole" : b.first > b.last ? "first is after last" : `messages run ${range}`;
    report("sequence-bad-block", `block "${b.label}" (${b.first}..${b.last}): ${why}`, `first and last are message numbers in ${range}, first ≤ last.`);
  }

  model.steps.forEach((step, i) => {
    if (!step.complete) return;
    for (const id of step.highlight) {
      if (ids.has(id) || isMessageNumber(id, model.count)) continue;
      let hint: string | undefined;
      const [from, to, ...rest] = id.split(">");
      if (to !== undefined && !rest.length) {
        const numbers = model.messages.filter((m) => m.from === from && m.to === to).map((m) => `"${m.n}"`);
        hint = numbers.length ? `Highlight messages by number: ${numbers.join(", ")}.` : "Highlight messages by their number (\"3\"), not from>to.";
      } else if (/^\d+$/.test(id)) hint = `Messages are numbered ${range}.`;
      else hint = didYouMean(id, ids);
      report("sequence-unknown-highlight", `step ${i + 1} "${step.title}": no participant or message "${id}"`, hint);
    }
  });
  return errors;
}

/** Whether a highlight id names a message: its number, written plainly ("3"). */
export const isMessageNumber = (id: string, count: number): boolean => /^[1-9]\d*$/.test(id) && Number(id) <= count;
