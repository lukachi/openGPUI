// Which tab is selected and which accordion item is open, as genui-lib's
// TabsRenderer and AccordionRenderer decide it while a response streams in.
// Pure logic (no gpui), so a test can run it; disclosure.ts draws the result.

/** The part of a TabItem / AccordionItem node these rules read. */
export interface SectionNode {
  props: { value?: unknown; trigger?: unknown; content?: unknown };
}

export interface TabsSelection {
  /** `activeTab`: the selected item's `value`; "" until one is chosen. */
  active: string;
  /** `userHasInteracted`. */
  interacted: boolean;
  /** `prevContentSizes`: JSON length of each item's content on the last pass. */
  sizes: Record<string, number>;
}

/** `JSON.stringify(item.props.content).length`. */
function contentSize(content: unknown): number {
  try {
    return JSON.stringify(content)?.length ?? 0;
  } catch {
    return 0;
  }
}

/**
 * TabsRenderer's two effects, run once per render instead of after it: the
 * first tab when none is chosen, then, until the person picks one, the last tab
 * whose content grew since the previous pass (streaming follows the newest tab).
 * The first pass sees every tab grow from nothing, so a complete response opens
 * on its last tab, as upstream does.
 */
export function syncActive(state: TabsSelection, items: SectionNode[]): void {
  const first = items[0];
  if (items.length && !state.active && first) state.active = String(first.props.value);
  if (state.interacted) return;
  let candidate: string | null = null;
  const next: Record<string, number> = {};
  for (const item of items) {
    const value = String(item.props.value);
    const size = contentSize(item.props.content);
    next[value] = size;
    if (size > (state.sizes[value] ?? 0)) candidate = value;
  }
  state.sizes = next;
  if (candidate && candidate !== state.active) state.active = candidate;
}

export interface AccordionSelection {
  /** `openItem`: the open item's `value`; "" when all are shut. */
  open: string;
  /** `userHasInteracted`. */
  interacted: boolean;
  /** `prevItemCount`. */
  prevCount: number;
}

/** AccordionRenderer's auto-open: a new item arriving before any click opens (the newest one). */
export function autoOpen(state: AccordionSelection, items: SectionNode[]): void {
  if (!state.interacted && items.length > state.prevCount) {
    const newest = items[items.length - 1];
    if (newest) state.open = String(newest.props.value);
  }
  state.prevCount = items.length;
}

/** Radix single collapsible: pressing the open item shuts it, any other opens. */
export function toggled(open: string, value: string): string {
  return open === value ? "" : value;
}
