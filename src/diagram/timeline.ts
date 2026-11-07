// Timeline (docs/diagram.md): tasks on a time axis, a Gantt chart or a roadmap. Its definitions,
// prompt notes, the model a Timeline's evaluated props give the renderer and the validator, and
// the validator. Layout is timelineLayout.ts, drawing components/timeline.ts.
//
// Times are ISO calendar days or plain numbers (relative units: day, week, sprint 1, 2…), one
// kind per Timeline. Both are periods and an end is inclusive: a task from day 4 to day 15, or
// from sprint 1 to sprint 2, covers those whole periods, and a milestone (no end) sits where
// its start period begins. Dates are UTC calendar days counted from 1970-01-01, so a Timeline
// lays out the same everywhere, and nothing reads the clock.
//
// Streaming (as diagram/model.ts): the task being written may have a start or an end cut short;
// a task whose times don't parse yet and a dependency on a task not written yet draw nothing
// until they do. The finished file is validated with everything kept.
import { defineComponent, isElementNode, type ElementNode, type OpenUIError, type OpenUIErrorCode } from "@openuidev/lang-core";
import { z } from "zod";
import { diagramSteps } from "./model.ts";
import { DiagramStep } from "./step.ts";
import type { DiagramStepModel } from "./types.ts";
import { closest } from "./validate.ts";

export const TASK_STATUSES = ["planned", "active", "done", "blocked"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Over this many tasks a Timeline gets a warning: split it. */
const MAX_TASKS = 40;

// ── Definitions ──

const when = z.union([z.string(), z.number()]);

export const Task = defineComponent({
  name: "Task",
  props: z.object({
    id: z.string(),
    label: z.string(),
    start: when,
    end: when.optional(),
    lane: z.string().optional(),
    after: z.array(z.string()).optional(),
    status: z.enum(TASK_STATUSES).optional(),
  }),
  description:
    'A bar on a Timeline from start to end, both included. start/end: ISO days ("2027-01-04") or numbers (sprint 1, 2…), one kind per Timeline; no end: a milestone (a diamond at start). lane: rows group under lane headers. after: ids of the tasks it waits for. status: planned (default), active, done or blocked.',
  component: null,
});

export const Timeline = defineComponent({
  name: "Timeline",
  props: z.object({
    tasks: z.array(Task.ref),
    steps: z.array(DiagramStep.ref).optional(),
  }),
  description:
    "Tasks on a time axis (a Gantt chart, a roadmap), one row each, grouped by lane, with arrows from each task's dependencies. steps: DiagramSteps whose highlight lists task ids.",
  component: null,
});

export const TIMELINE_NOTES = [
  "Write each Timeline as its own statement and its tasks as their own list: `t = Timeline(tTasks, tSteps)`.",
  'Clicking a task sends you `Tell me more about <label>` with context {diagram: "<statement id>", task: "<id>"}.',
];

// ── Times ──

export type TimeUnit = "date" | "number";

/** A parsed time: a number as written, or a date as its UTC day number (days since 1970-01-01). */
export interface When {
  unit: TimeUnit;
  value: number;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** `v` as a time, or null when it is neither an ISO calendar day nor a finite number. */
export function parseWhen(v: unknown): When | null {
  if (typeof v === "number") return Number.isFinite(v) ? { unit: "number", value: v } : null;
  if (typeof v !== "string") return null;
  const m = ISO_DAY.exec(v);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const date = new Date(ms);
  // Date.UTC rolls 2027-02-30 over into March: a calendar day reads back as written.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return { unit: "date", value: ms / DAY_MS };
}

/** UTC calendar parts of a day number. */
export function dayParts(day: number): { year: number; month: number; date: number; weekday: number } {
  const d = new Date(day * DAY_MS);
  // 1970-01-01 was a Thursday; weekday 0 is Monday.
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), date: d.getUTCDate(), weekday: (((day + 3) % 7) + 7) % 7 };
}

/** The day number of a UTC calendar day (month 0-based; overflowing months roll into years). */
export const dayOf = (year: number, month: number, date = 1): number => Date.UTC(year, month, date) / DAY_MS;

// ── Model ──

export interface TimelineTask {
  id: string;
  label: string;
  /** Null when start doesn't parse. */
  start: When | null;
  /** Null: no end (a milestone), or an end that doesn't parse (endText says which). */
  end: When | null;
  /** start and end as written, for messages. */
  startText: string;
  endText?: string;
  lane?: string;
  after: string[];
  status: TaskStatus;
}

/** One Timeline as the layout, the renderer and the validator see it. */
export interface TimelineModel {
  tasks: TimelineTask[];
  steps: DiagramStepModel[];
  /** The unit of the first task's start; null before one parses. */
  unit: TimeUnit | null;
}

const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const written = (v: unknown): string => (typeof v === "string" ? `"${v}"` : String(v));

/** The model of a Timeline whose evaluated props are `props`; `streaming` while the file is still being written. */
export function timelineModel(props: Record<string, unknown>, streaming: boolean): TimelineModel {
  const els = Array.isArray(props.tasks) ? props.tasks.filter((x): x is ElementNode => isElementNode(x) && x.typeName === "Task") : [];
  let tasks: TimelineTask[] = [];
  for (const el of els) {
    const p = el.props;
    const id = text(p.id);
    if (!id || p.start == null) continue;
    const start = parseWhen(p.start);
    const hasEnd = p.end != null;
    const end = hasEnd ? parseWhen(p.end) : null;
    if (streaming && (!start || (hasEnd && !end))) continue;
    const lane = text(p.lane);
    tasks.push({
      id,
      label: text(p.label) ?? "",
      start,
      end,
      startText: written(p.start),
      ...(hasEnd ? { endText: written(p.end) } : {}),
      ...(lane ? { lane } : {}),
      after: Array.isArray(p.after) ? p.after.filter((a): a is string => typeof a === "string") : [],
      status: (TASK_STATUSES as readonly unknown[]).includes(p.status) ? (p.status as TaskStatus) : "planned",
    });
  }
  const unit = tasks.find((t) => t.start)?.start?.unit ?? null;
  if (streaming) {
    // A dependency still being typed, or on a task not written yet, waits.
    const ids = new Set(tasks.map((t) => t.id));
    tasks = tasks.map((t) => ({ ...t, after: t.after.filter((a) => ids.has(a)) }));
  }
  return { tasks, steps: diagramSteps(props.steps, streaming), unit };
}

// ── Validation ──

export type TimelineErrorCode =
  | "timeline-empty"
  | "timeline-duplicate-id"
  | "timeline-bad-date"
  | "timeline-mixed-units"
  | "timeline-end-before-start"
  | "timeline-unknown-dependency"
  | "timeline-unknown-highlight"
  | "timeline-too-big";

/** Why a written time isn't one, as a hint. */
function badTimeHint(raw: string): string {
  const v = raw.startsWith('"') ? raw.slice(1, -1) : raw;
  if (/^-?\d+(\.\d+)?$/.test(v)) return `Write the number without quotes: ${v}.`;
  const day = /^(\d{4}-\d{2}-\d{2})[T ]/.exec(v);
  if (day) return `Use the calendar day alone: "${day[1]}".`;
  if (ISO_DAY.test(v)) return `${raw} is no calendar day.`;
  return 'Write an ISO day ("2027-01-04") or a number (1, 2, 3).';
}

/** The problems of the Timeline `model` written in statement `statementId`. */
export function validateTimeline(model: TimelineModel, statementId?: string): OpenUIError[] {
  const errors: OpenUIError[] = [];
  const report = (code: TimelineErrorCode, message: string, hint?: string, warning = false) =>
    errors.push({
      source: "parser",
      // lang-core's codes are a closed union; the pipeline carries any string through.
      code: code as unknown as OpenUIErrorCode,
      message,
      component: "Timeline",
      ...(statementId ? { statementId } : {}),
      ...(hint ? { hint } : {}),
      ...(warning ? { severity: "warning" as const } : {}),
    });
  const didYouMean = (id: string, ids: Iterable<string>) => {
    const match = closest(id, ids);
    return match ? `Did you mean "${match}"?` : undefined;
  };

  if (!model.tasks.length) {
    report("timeline-empty", "the Timeline has no tasks", "Give it Tasks, or remove it.");
    return errors;
  }

  const ids = new Set<string>();
  for (const t of model.tasks) {
    if (ids.has(t.id)) report("timeline-duplicate-id", `task id "${t.id}" is used twice`, "Task ids are unique per Timeline: rename one.");
    ids.add(t.id);
  }
  if (model.tasks.length > MAX_TASKS) {
    report("timeline-too-big", `the Timeline has ${model.tasks.length} tasks`, `More than ${MAX_TASKS} is hard to read: split it into several Timelines.`, true);
  }

  const unit = model.unit;
  const first = model.tasks.find((t) => t.start);
  for (const t of model.tasks) {
    if (!t.start) report("timeline-bad-date", `task "${t.id}": start ${t.startText} is no date or number`, badTimeHint(t.startText));
    if (t.endText !== undefined && !t.end) report("timeline-bad-date", `task "${t.id}": end ${t.endText} is no date or number`, badTimeHint(t.endText));
    const odd = [t.start && ["start", t.startText, t.start] as const, t.end && ["end", t.endText!, t.end] as const].find((x) => x && unit && x[2].unit !== unit);
    if (odd && unit && first) {
      report(
        "timeline-mixed-units",
        `task "${t.id}": ${odd[0]} ${odd[1]} is a ${odd[2].unit}, but this Timeline uses ${unit === "date" ? "dates" : "numbers"} (task "${first.id}" starts ${first.startText})`,
        'One Timeline uses ISO days ("2027-01-04") or numbers (1, 2, 3), not both.',
      );
    } else if (t.start && t.end && t.end.value < t.start.value) {
      report("timeline-end-before-start", `task "${t.id}": ends ${t.endText} before it starts ${t.startText}`, "Swap them; or leave end out for a milestone.");
    }
  }

  const lanes = new Set(model.tasks.flatMap((t) => (t.lane ? [t.lane] : [])));
  for (const t of model.tasks) {
    for (const a of t.after) {
      if (ids.has(a)) continue;
      report("timeline-unknown-dependency", `task "${t.id}": after "${a}": no task "${a}"`, lanes.has(a) ? `"${a}" is a lane; name the tasks it waits for.` : didYouMean(a, ids));
    }
  }

  model.steps.forEach((step, i) => {
    if (!step.complete) return;
    for (const id of step.highlight) {
      if (ids.has(id)) continue;
      report("timeline-unknown-highlight", `step ${i + 1} "${step.title}": no task "${id}"`, lanes.has(id) ? `"${id}" is a lane; highlight its tasks.` : didYouMean(id, ids));
    }
  });
  return errors;
}
