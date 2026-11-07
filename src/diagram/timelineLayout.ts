// A Timeline's layout (docs/diagram.md), computed in the pane: pure and deterministic, from the
// model and measured text widths to px at scale 1, origin top left.
//
//   axis      a band on top with a tick per day, week (Mondays) or month (1st), by the span of
//             the dates (or every 1, 2, 5, 10… units for numbers), each labelled just right of
//             its line, so a label names the period it starts; a label that would run into the
//             one before is left out (its line stays).
//   lanes     in first-appearance order, each under a header row; tasks without a lane form a
//             group with no header where the first of them appears.
//   rows      one per task, in written order within its lane.
//   scale     px per unit from the span (about PLOT_W wide), clamped per tick kind so a busy
//             span grows wide instead of crushing its bars.
//   bars      from start to end + 1 (ends are inclusive); a milestone is a diamond centred on
//             its start. A label goes inside when it fits, else right of the bar.
//   arrows    from a dependency's end to the task's start: out of the end, down, into the start
//             when there is room and the dependency's label sits inside it; else down from
//             under its end (a milestone: its tip) and into the start; else straight down onto
//             a task starting with it; else around, back before the start.
//
// Tasks whose times don't parse, or are in the other unit, are left out (the validator names them).
import { dayOf, dayParts, type TimelineModel, type TimelineTask, type TimeUnit } from "./timeline.ts";

// ── Geometry (px at scale 1) ──

/** The plot width the scale aims for. */
const PLOT_W = 840;
const LEFT = 16;
const RIGHT = 16;
/** Above the tick labels: at the fit, they sit below the canvas's corner buttons. */
const AXIS_TOP = 22;
const AXIS_BOTTOM = 6;
const TICK_LABEL_PAD = 5;
/** Space a tick label keeps from the next one. */
const TICK_LABEL_GAP = 8;
const LANE_PAD_Y = 6;
const LANE_PAD_X = 10;
const ROW_PAD_Y = 7;
const BAR_PAD_X = 8;
const BAR_PAD_Y = 5;
const LABEL_GAP = 6;
/** Horizontal run of an arrow out of a bar's end before it turns. */
const STUB = 10;
/** How far inside a bar's ends an arrow may leave it or land on it. */
const INSET = 6;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Measured text: widths in px and line heights. */
export interface TimelineMetrics {
  /** The width of what a bar shows (its status icon and label). */
  content: (task: TimelineTask) => number;
  contentH: number;
  lane: (label: string) => number;
  laneH: number;
  tick: (label: string) => number;
  tickH: number;
}

export type TickKind = "day" | "week" | "month" | "number";

export interface TimelineTick {
  x: number;
  /** Null: the line only (its label would run into the one before). */
  label: string | null;
  labelX: number;
}

export interface TimelineBar {
  id: string;
  /** The row's top and height. */
  rowY: number;
  rowH: number;
  /** The bar (a milestone: the diamond's bounding square). */
  x0: number;
  x1: number;
  y: number;
  h: number;
  milestone: boolean;
  /** Where the content (icon and label) starts, and whether it sits inside the bar. */
  labelX: number;
  labelW: number;
  inside: boolean;
}

export interface TimelineArrow {
  /** `from>to`: the dependency, then the task. */
  id: string;
  from: string;
  to: string;
  points: [number, number][];
}

export interface TimelineLaneBox {
  label: string;
  labelX: number;
  y: number;
  h: number;
}

export interface TimelineLayout {
  width: number;
  height: number;
  unit: TimeUnit;
  tickKind: TickKind;
  /** The axis band's height (it starts at y 0) and the top of its labels. */
  axisH: number;
  tickY: number;
  /** The plot's x range: the first and last tick. */
  x0: number;
  x1: number;
  ticks: TimelineTick[];
  lanes: TimelineLaneBox[];
  bars: TimelineBar[];
  arrows: TimelineArrow[];
}

interface Scale {
  kind: TickKind;
  lo: number;
  hi: number;
  ppu: number;
  /** Tick values with their labels, lo..hi. */
  ticks: { v: number; label: string }[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Ticks, range and px per unit for numbers spanning lo..hi (exclusive end). */
function numberScale(lo: number, hi: number): Scale {
  const a = Math.floor(lo);
  const b = Math.max(Math.ceil(hi), a + 1);
  const ppu = clamp(PLOT_W / (b - a), 6, 140);
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => s * ppu >= 28) ?? 1000;
  const first = Math.floor(a / step) * step;
  const last = Math.ceil(b / step) * step;
  const ticks = [];
  for (let v = first; v <= last; v += step) ticks.push({ v, label: String(v) });
  return { kind: "number", lo: first, hi: last, ppu, ticks };
}

/** Ticks, range and px per day for day numbers spanning lo..hi (exclusive end). */
function dateScale(lo: number, hi: number): Scale {
  const span = Math.max(hi - lo, 1);
  const label = (day: number, long: boolean) => {
    const p = dayParts(day);
    return long ? `${MONTHS[p.month]} ${p.date}` : String(p.date);
  };
  if (span <= 31) {
    const ppu = clamp(PLOT_W / span, 28, 80);
    const ticks = [];
    for (let d = lo; d <= hi; d++) ticks.push({ v: d, label: label(d, d === lo || dayParts(d).date === 1) });
    return { kind: "day", lo, hi, ppu, ticks };
  }
  if (span <= 140) {
    const first = lo - dayParts(lo).weekday;
    const last = hi + ((7 - dayParts(hi).weekday) % 7);
    const ppu = clamp(PLOT_W / (last - first), 6, 24);
    const ticks = [];
    for (let d = first; d <= last; d += 7) ticks.push({ v: d, label: label(d, true) });
    return { kind: "week", lo: first, hi: last, ppu, ticks };
  }
  const start = dayParts(lo);
  const end = dayParts(hi);
  const firstMonth = start.year * 12 + start.month;
  const lastMonth = end.year * 12 + end.month + (end.date > 1 ? 1 : 0);
  const days = dayOf(Math.floor(lastMonth / 12), lastMonth % 12) - dayOf(start.year, start.month);
  const ppu = clamp(PLOT_W / days, 0.3, 4);
  const step = [1, 3, 6, 12].find((s) => s * 30.4 * ppu >= 34) ?? 12;
  const from = Math.floor(firstMonth / step) * step;
  const to = Math.ceil(lastMonth / step) * step;
  const ticks = [];
  for (let m = from; m <= to; m += step) {
    const [year, month] = [Math.floor(m / 12), m % 12];
    const text = step === 12 ? String(year) : m === from || month === 0 ? `${MONTHS[month]} ${year}` : MONTHS[month]!;
    ticks.push({ v: dayOf(year, month), label: text });
  }
  return { kind: "month", lo: ticks[0]!.v, hi: ticks[ticks.length - 1]!.v, ppu, ticks };
}

/** The task's times in the Timeline's unit as [start, exclusive end] (a milestone: [start, start]), or null when they aren't. */
function span(t: TimelineTask, unit: TimeUnit): [number, number] | null {
  if (!t.start || t.start.unit !== unit) return null;
  if (t.endText === undefined) return [t.start.value, t.start.value];
  if (!t.end || t.end.unit !== unit) return null;
  const [a, b] = t.start.value <= t.end.value ? [t.start.value, t.end.value] : [t.end.value, t.start.value];
  return [a, b + 1];
}

/** An arrow from `src`'s end to `dst`'s start, in another row (see the header). */
function route(src: TimelineBar, dst: TimelineBar): [number, number][] {
  const ty = dst.y + dst.h / 2;
  const tx = dst.x0;
  if (src.inside && tx - src.x1 >= 2 * STUB) {
    const sy = src.y + src.h / 2;
    return [[src.x1, sy], [src.x1 + STUB, sy], [src.x1 + STUB, ty], [tx, ty]];
  }
  // Out of the bottom (top) near the end: a label right of the source stays clear.
  const down = dst.rowY > src.rowY;
  const leave = down ? src.y + src.h : src.y;
  // One x per source for every task after its end, so their arrows share one trunk.
  const ex = src.milestone ? (src.x0 + src.x1) / 2 : clamp(Math.min(tx, src.x1) - STUB, src.x0 + INSET, src.x1 - INSET);
  if (tx - ex >= STUB) return [[ex, leave], [ex, ty], [tx, ty]];
  if (!dst.milestone && ex >= dst.x0 + INSET && ex <= dst.x1 - INSET) return [[ex, leave], [ex, down ? dst.y : dst.y + dst.h]];
  // Around: along the gap next to the task's row, back before its start and into it.
  const gy = down ? dst.rowY : dst.rowY + dst.rowH;
  return [[ex, leave], [ex, gy], [tx - STUB, gy], [tx - STUB, ty], [tx, ty]];
}

/** The layout of `model` with text measured by `m`; null before any task can be placed. */
export function timelineLayout(model: TimelineModel, m: TimelineMetrics): TimelineLayout | null {
  const unit = model.unit;
  if (!unit) return null;
  const placed = model.tasks.flatMap((t) => {
    const s = span(t, unit);
    return s ? [{ t, s }] : [];
  });
  if (!placed.length) return null;

  const lo = Math.min(...placed.map((p) => p.s[0]));
  const hi = Math.max(...placed.map((p) => p.s[1]));
  const scale = unit === "date" ? dateScale(lo, hi) : numberScale(lo, hi);
  const x = (v: number) => LEFT + (v - scale.lo) * scale.ppu;

  // The last tick closes the range: it names a period only when a task starts there.
  const lastStart = Math.max(...placed.map((p) => p.s[0]));
  const ticks: TimelineTick[] = [];
  let free = -Infinity;
  scale.ticks.forEach((tk, i) => {
    const tx = x(tk.v);
    const labelX = tx + TICK_LABEL_PAD;
    const fits = labelX >= free && (i < scale.ticks.length - 1 || lastStart >= tk.v);
    ticks.push({ x: tx, label: fits ? tk.label : null, labelX });
    if (fits) free = labelX + m.tick(tk.label) + TICK_LABEL_GAP;
  });
  const axisH = AXIS_TOP + m.tickH + AXIS_BOTTOM;

  // Lanes in first-appearance order; the lane-less group where its first task appears.
  const order: (string | undefined)[] = [];
  for (const p of placed) if (!order.includes(p.t.lane)) order.push(p.t.lane);

  const barH = m.contentH + BAR_PAD_Y * 2;
  const rowH = barH + ROW_PAD_Y * 2;
  const laneH = m.laneH + LANE_PAD_Y * 2;
  const lanes: TimelineLaneBox[] = [];
  const bars: TimelineBar[] = [];
  /** Each bar's task's dependencies. */
  const after: string[][] = [];
  let y = axisH;
  let right = x(scale.hi);
  for (const lane of order) {
    if (lane !== undefined) {
      lanes.push({ label: lane, labelX: LANE_PAD_X, y, h: laneH });
      right = Math.max(right, LANE_PAD_X * 2 + m.lane(lane));
      y += laneH;
    }
    for (const { t, s } of placed.filter((p) => p.t.lane === lane)) {
      const w = m.content(t);
      const milestone = t.endText === undefined;
      const by = y + ROW_PAD_Y;
      let bar: TimelineBar;
      if (milestone) {
        const cx = x(s[0]);
        bar = { id: t.id, rowY: y, rowH, x0: cx - barH / 2, x1: cx + barH / 2, y: by, h: barH, milestone, labelX: cx + barH / 2 + LABEL_GAP, labelW: w, inside: false };
      } else {
        const [x0, x1] = [x(s[0]), x(s[1])];
        const inside = w + BAR_PAD_X * 2 <= x1 - x0;
        bar = { id: t.id, rowY: y, rowH, x0, x1, y: by, h: barH, milestone, labelX: inside ? x0 + BAR_PAD_X : x1 + LABEL_GAP, labelW: w, inside };
      }
      bars.push(bar);
      after.push(t.after);
      right = Math.max(right, bar.inside ? bar.x1 : bar.labelX + w);
      y += rowH;
    }
  }

  const byId = new Map(bars.map((b) => [b.id, b]));
  const arrows: TimelineArrow[] = [];
  bars.forEach((b, i) => {
    for (const dep of new Set(after[i])) {
      const src = byId.get(dep);
      if (!src || dep === b.id) continue;
      arrows.push({ id: `${dep}>${b.id}`, from: dep, to: b.id, points: route(src, b) });
    }
  });

  const ticksRight = ticks.reduce((r, tk) => (tk.label ? Math.max(r, tk.labelX + m.tick(tk.label)) : r), 0);
  return {
    width: Math.ceil(Math.max(right, ticksRight) + RIGHT),
    height: y,
    unit,
    tickKind: scale.kind,
    axisH,
    tickY: AXIS_TOP,
    x0: x(scale.lo),
    x1: x(scale.hi),
    ticks,
    lanes,
    bars,
    arrows,
  };
}
