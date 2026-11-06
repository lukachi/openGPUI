// How the browser sizes SingleStackedBarChart's segments, without gpui so it
// runs under `bun test`.

/** .openui-segmented-bar-segment: min-width. */
export const MIN_SEGMENT = 2;

/**
 * The widths of a flex row of segments whose flex-basis is their share of
 * `content` (a fraction, `share` 0..1), with flex-shrink 1, a gap between
 * segments and a minimum width: CSS's "resolve flexible lengths". The gaps
 * shrink every segment in proportion to its basis; a segment that would end
 * under the minimum freezes at it and the rest share what is left. Segments
 * never grow.
 */
export function segmentWidths(shares: number[], content: number, gap: number): number[] {
  const base = shares.map((share) => share * content);
  const widths = [...base];
  const frozen = base.map(() => false);
  const gaps = gap * Math.max(0, shares.length - 1);
  for (let pass = 0; pass <= shares.length; pass++) {
    let used = gaps;
    let flexible = 0;
    base.forEach((b, i) => {
      if (frozen[i]) used += widths[i]!;
      else {
        used += b;
        flexible += b;
      }
    });
    const free = content - used;
    if (free >= 0 || flexible <= 0) {
      // Nothing (more) to shrink: the rest keep their basis, under the minimum frozen at it.
      base.forEach((b, i) => {
        if (!frozen[i]) widths[i] = Math.max(b, MIN_SEGMENT);
      });
      return widths;
    }
    const target = base.map((b, i) => (frozen[i] ? widths[i]! : b + (free * b) / flexible));
    let violation = 0;
    target.forEach((w, i) => {
      if (!frozen[i]) violation += Math.max(w, MIN_SEGMENT) - w;
    });
    target.forEach((w, i) => {
      if (frozen[i]) return;
      const clamped = Math.max(w, MIN_SEGMENT);
      widths[i] = clamped;
      // Violations above zero freeze the segments under their minimum; none freezes them all.
      if (violation === 0 || clamped > w) frozen[i] = true;
    });
    if (frozen.every(Boolean)) return widths;
  }
  return widths;
}
