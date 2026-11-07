// Where a Sequence's parts go, in px at scale 1 (origin top left), from measured text: computed
// in the pane, no ELK. Pure and deterministic: the same model and widths give the same layout.
//
// Columns: each participant's header box sits on a row along the top, its dashed lifeline down
// from its centre. The gap between two adjacent centres starts at what the headers need, then
// grows until every message label between them fits (a message spanning several columns spreads
// its shortfall over the gaps it crosses; narrower spans are settled first). A self message's
// label and loop go right of its lifeline, into the next gap (or past the last column).
//
// Rows: one per drawn message, in order: its label, then its arrow (a self message loops down
// below it), the number badge on the sender's lifeline. A block adds a title row above its first
// message and a little room under its last, outer blocks around inner ones; its frame spans the
// columns its messages touch, inset per nesting level so nested frames don't coincide.
import { blockFits, type SequenceModel } from "./sequence.ts";

/** A text style's measure (the charts' Measurer fits). */
export interface TextMetric {
  width(text: string): number;
  readonly lineHeight: number;
}

export interface SequenceMetrics {
  /** Participant labels. */
  label: TextMetric;
  /** Participant subs. */
  sub: TextMetric;
  /** Message labels. */
  message: TextMetric;
  /** Block titles. */
  block: TextMetric;
  /** Message numbers. */
  badge: TextMetric;
}

export const HEAD_PAD_X = 12;
export const HEAD_PAD_Y = 8;
export const HEAD_ICON = 16;
export const HEAD_ICON_GAP = 8;
export const SUB_GAP = 2;
const HEAD_MIN_W = 88;
/** Between two header boxes. */
const COL_GAP = 32;
/** Label plate padding, and its distance from the badge. */
export const LABEL_PAD_X = 6;
const LABEL_GAP = 3;
const BADGE_PAD_X = 4;
const SELF_W = 32;
const SELF_H = 18;
/** Under the headers, before the first row. */
const FIRST_GAP = 18;
const ROW_GAP = 12;
/** The lifelines go on this far past the last row. */
const TAIL = 14;
export const BLOCK_PAD_X = 16;
const BLOCK_INSET = 8;
export const BLOCK_TITLE_PAD_X = 8;
export const BLOCK_TITLE_PAD_Y = 3;
const BLOCK_TITLE_GAP = 6;
const BLOCK_END_PAD = 10;
const MARGIN = 2;
/** Reserved under an arrow for its head. */
const ARROW_HALF = 4.5;

export interface ParticipantBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The lifeline's x. */
  cx: number;
}

export interface MessageRow {
  n: number;
  from: string;
  to: string;
  /** The arrow's y (a self message: its loop's top). */
  y: number;
  /** Where the line leaves the badge, and the arrow tip. */
  x0: number;
  x1: number;
  /** A self message: its loop's right x and bottom y (the tip is back at the lifeline). */
  self?: { right: number; bottom: number };
  badge: { x: number; y: number; w: number; h: number };
  /** The label plate. */
  label: { x: number; y: number; w: number; h: number };
  /** What a pointer hits: the label, the badge and the arrow. */
  hit: { x: number; y: number; w: number; h: number };
  /** How many block frames it sits in (a label plate matches their stacked tint). */
  depth: number;
}

export interface BlockFrame {
  label: string;
  /** The block's message numbers. */
  first: number;
  last: number;
  x: number;
  y: number;
  w: number;
  h: number;
  titleW: number;
  titleH: number;
}

export interface SequenceLayout {
  width: number;
  height: number;
  participants: ParticipantBox[];
  /** Every lifeline's top and bottom. */
  lifeline: { y0: number; y1: number };
  messages: MessageRow[];
  blocks: BlockFrame[];
}

/** The layout of `model` with text measured by `m`. */
export function sequenceLayout(model: SequenceModel, m: SequenceMetrics): SequenceLayout {
  const col = new Map<string, number>();
  model.participants.forEach((p, i) => {
    if (!col.has(p.id)) col.set(p.id, i);
  });
  // A duplicate id draws once, at its first column.
  const heads = model.participants.filter((p, i) => col.get(p.id) === i);
  col.clear();
  heads.forEach((p, i) => col.set(p.id, i));

  const headH = Math.max(0, ...heads.map((p) => HEAD_PAD_Y * 2 + m.label.lineHeight + (p.sub ? SUB_GAP + m.sub.lineHeight : 0)));
  const headW = heads.map((p) => {
    const text = Math.max(m.label.width(p.label), p.sub ? m.sub.width(p.sub) : 0);
    return Math.max(HEAD_MIN_W, Math.ceil(HEAD_PAD_X * 2 + HEAD_ICON + HEAD_ICON_GAP + text));
  });

  const rows = model.messages.filter((msg) => col.has(msg.from) && col.has(msg.to));
  const badgeH = m.badge.lineHeight + 2;
  const badgeW = (n: number) => Math.max(badgeH, Math.ceil(m.badge.width(String(n)) + BADGE_PAD_X * 2));
  const plateW = (label: string) => Math.ceil(m.message.width(label) + LABEL_PAD_X * 2);

  // Gaps between adjacent lifelines; `right`: room past the last one.
  const gaps = headW.slice(1).map((w, i) => (headW[i]! + w) / 2 + COL_GAP);
  let right = (headW[headW.length - 1] ?? 0) / 2;
  const spans = rows
    .map((msg) => {
      const a = col.get(msg.from)!;
      const b = col.get(msg.to)!;
      const self = a === b;
      const need = self
        ? badgeW(msg.n) / 2 + LABEL_GAP + Math.max(plateW(msg.label), SELF_W) + LABEL_GAP
        : badgeW(msg.n) / 2 + LABEL_GAP + plateW(msg.label) + LABEL_GAP * 2;
      return { lo: Math.min(a, b), hi: self ? a + 1 : Math.max(a, b), need };
    })
    .sort((p, q) => p.hi - p.lo - (q.hi - q.lo));
  for (const s of spans) {
    if (s.lo >= gaps.length) {
      right = Math.max(right, s.need);
      continue;
    }
    let have = 0;
    for (let i = s.lo; i < s.hi; i++) have += gaps[i]!;
    const short = (s.need - have) / (s.hi - s.lo);
    if (short > 0) for (let i = s.lo; i < s.hi; i++) gaps[i]! += short;
  }
  const cx: number[] = [];
  heads.forEach((_, i) => cx.push(i ? cx[i - 1]! + gaps[i - 1]! : headW[0]! / 2));

  // Blocks: their drawn rows, nesting depth below them, and padding.
  const rowOf = new Map(rows.map((msg, i) => [msg.n, i]));
  const blocks = model.blocks.flatMap((b, index) => {
    if (!blockFits(b, model.count)) return [];
    let first = -1;
    let last = -1;
    for (let n = b.first; n <= b.last; n++) {
      const r = rowOf.get(n);
      if (r === undefined) continue;
      if (first < 0) first = r;
      last = r;
    }
    return first < 0 ? [] : [{ block: b, index, first, last, inner: 0, top: 0, bottom: 0 }];
  });
  const inside = (k: (typeof blocks)[number], j: (typeof blocks)[number]) =>
    k !== j && k.first >= j.first && k.last <= j.last && (k.first !== j.first || k.last !== j.last || k.index > j.index);
  // Inner ones first, so each depth is final when an outer block reads it.
  const bySize = [...blocks].sort((p, q) => p.last - p.first - (q.last - q.first) || q.index - p.index);
  for (const j of bySize) for (const k of bySize) if (inside(k, j)) j.inner = Math.max(j.inner, k.inner + 1);
  const outerFirst = (p: (typeof blocks)[number], q: (typeof blocks)[number]) => q.last - p.last || p.index - q.index;
  const innerFirst = (p: (typeof blocks)[number], q: (typeof blocks)[number]) => p.first - q.first || q.index - p.index;
  const titleH = m.block.lineHeight + BLOCK_TITLE_PAD_Y * 2;

  // Rows, top to bottom.
  const messages: MessageRow[] = [];
  let y = headH + FIRST_GAP;
  rows.forEach((msg, r) => {
    for (const b of blocks.filter((b) => b.first === r).sort(outerFirst)) {
      b.top = y;
      y += titleH + BLOCK_TITLE_GAP;
    }
    const a = cx[col.get(msg.from)!]!;
    const b = cx[col.get(msg.to)!]!;
    const lh = m.message.lineHeight;
    const arrowY = y + lh + LABEL_GAP;
    const bw = badgeW(msg.n);
    const badge = { x: a - bw / 2, y: arrowY - badgeH / 2, w: bw, h: badgeH };
    const pw = plateW(msg.label);
    let row: MessageRow;
    if (a === b) {
      const x0 = a + bw / 2;
      const loopRight = x0 + SELF_W;
      const bottom = arrowY + SELF_H;
      const label = { x: x0 + LABEL_GAP, y, w: pw, h: lh };
      row = {
        n: msg.n,
        from: msg.from,
        to: msg.to,
        y: arrowY,
        x0,
        x1: a,
        self: { right: loopRight, bottom },
        badge,
        label,
        hit: { x: badge.x, y, w: Math.max(label.x + pw, loopRight) - badge.x, h: bottom + ARROW_HALF - y },
        depth: 0,
      };
      y = bottom;
    } else {
      const dir = Math.sign(b - a);
      const x0 = a + (dir * bw) / 2;
      const mid = (x0 + b) / 2;
      const label = { x: mid - pw / 2, y, w: pw, h: lh };
      const lo = Math.min(badge.x, b, label.x);
      const hi = Math.max(badge.x + bw, b, label.x + pw);
      row = { n: msg.n, from: msg.from, to: msg.to, y: arrowY, x0, x1: b, badge, label, hit: { x: lo, y, w: hi - lo, h: badge.y + badgeH - y }, depth: 0 };
      y = arrowY;
    }
    row.depth = blocks.filter((blk) => blk.first <= r && r <= blk.last).length;
    messages.push(row);
    y += Math.max(badgeH / 2, ARROW_HALF);
    for (const blk of blocks.filter((blk) => blk.last === r).sort(innerFirst)) {
      y += BLOCK_END_PAD;
      blk.bottom = y;
    }
    y += ROW_GAP;
  });
  const lifelineEnd = rows.length ? y - ROW_GAP + TAIL : headH + FIRST_GAP + TAIL;

  const frames = blocks.map((blk) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let r = blk.first; r <= blk.last; r++) {
      const row = messages[r]!;
      lo = Math.min(lo, cx[col.get(row.from)!]!, cx[col.get(row.to)!]!);
      hi = Math.max(hi, cx[col.get(row.from)!]!, cx[col.get(row.to)!]!, row.self ? Math.max(row.self.right, row.label.x + row.label.w) : -Infinity);
    }
    const pad = BLOCK_PAD_X + blk.inner * BLOCK_INSET;
    const titleW = Math.ceil(m.block.width(blk.block.label) + BLOCK_TITLE_PAD_X * 2);
    const x = lo - pad;
    const w = Math.max(hi + pad - x, titleW + BLOCK_INSET * 2);
    return { label: blk.block.label, first: blk.block.first, last: blk.block.last, x, y: blk.top, w, h: blk.bottom - blk.top, titleW, titleH };
  });

  // Shift everything right of the margin: a frame may reach left of the first header.
  const minX = Math.min(0, ...frames.map((f) => f.x));
  const dx = MARGIN - minX;
  const dy = MARGIN;
  const participants = heads.map((p, i) => ({ id: p.id, x: cx[i]! - headW[i]! / 2 + dx, y: dy, w: headW[i]!, h: headH, cx: cx[i]! + dx }));
  const move = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h });
  const placed = messages.map((row) => ({
    ...row,
    y: row.y + dy,
    x0: row.x0 + dx,
    x1: row.x1 + dx,
    ...(row.self ? { self: { right: row.self.right + dx, bottom: row.self.bottom + dy } } : {}),
    badge: move(row.badge),
    label: move(row.label),
    hit: move(row.hit),
  }));
  const placedFrames = frames.map((f) => ({ ...f, x: f.x + dx, y: f.y + dy }));
  const lastCx = cx.length ? cx[cx.length - 1]! : 0;
  const maxX = Math.max(
    lastCx + right,
    ...placed.map((row) => row.hit.x + row.hit.w - dx),
    ...frames.map((f) => f.x + f.w),
  );
  return {
    width: Math.ceil(maxX + dx + MARGIN),
    height: Math.ceil(lifelineEnd + dy + MARGIN),
    participants,
    lifeline: { y0: headH + dy, y1: lifelineEnd + dy },
    messages: placed,
    blocks: placedFrames,
  };
}
