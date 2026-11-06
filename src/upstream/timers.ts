// setInterval/clearInterval for lang-core's query refresh (patched in by
// scripts/upstream-plugin.ts). gpui-shell has no browser timers, so a Surface
// runs session updates inside withScheduler(): intervals created during the
// update become cx.timer.every timers of that surface.

export interface Scheduler {
  every(ms: number, fn: () => void): { cancel(): void };
}

let current: Scheduler | null = null;
let nextId = 1;
const live = new Map<number, { cancel(): void }>();

export function withScheduler(scheduler: Scheduler, fn: () => void): void {
  const previous = current;
  current = scheduler;
  try {
    fn();
  } finally {
    current = previous;
  }
}

export function ogpuiSetInterval(fn: () => void, ms: number): number {
  const id = nextId++;
  if (!current) {
    console.log(`[opengpui] query refresh every ${ms} ms skipped: no scheduler in scope`);
    return id;
  }
  live.set(id, current.every(ms, fn));
  return id;
}

export function ogpuiClearInterval(id: number | undefined): void {
  if (id === undefined) return;
  live.get(id)?.cancel();
  live.delete(id);
}
