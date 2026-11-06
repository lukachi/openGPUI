// useSeriesVisibility's toggle rule, without gpui so it runs under `bun test`:
// one guard for every chart whose legend hides series (upstream keeps a single
// implementation too).

/**
 * `hidden` with `key` toggled, or null when the toggle is refused: hiding a
 * series is refused when it would leave none visible. Only hidden keys that
 * still exist in `keys` count, so a stale one never blocks a toggle.
 */
export function toggleHidden(hidden: ReadonlySet<string>, keys: string[], key: string): Set<string> | null {
  const next = new Set(hidden);
  if (next.has(key)) {
    next.delete(key);
    return next;
  }
  next.add(key);
  const hiddenCurrent = keys.filter((k) => next.has(k)).length;
  // The new key is counted: at least one series always stays visible.
  return hiddenCurrent >= keys.length ? null : next;
}
