// The logic of the lists slice that needs no gpui, so a test can run it:
// OptionCards' row split, and which SectionBlock sections are open while a
// response streams in.
//
// Ported from react-ui at the pinned commit:
//   components/_shared/cards/smallCardBlockUtils.ts   getRowConfiguration, as is
//   genui-lib/SectionBlock/index.tsx                  SectionBlockRenderer's open-item effects

/**
 * Splits `n` items into rows of at most `maxPerRow` (2 or 3) so the grid never
 * ends with a lonely single card when it can be avoided.
 */
export function getRowConfiguration(n: number, maxPerRow: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];

  if (maxPerRow === 2) {
    const fullRows = Math.floor(n / 2);
    const remainder = n % 2;
    const result: number[] = Array(fullRows).fill(2);
    if (remainder) result.push(1);
    return result;
  }

  if (n % 3 === 0) {
    return Array(n / 3).fill(3);
  }

  if (n % 3 === 2) {
    const threes = Math.floor(n / 3);
    const result: number[] = Array(threes).fill(3);
    result.splice(Math.ceil(result.length / 2), 0, 2);
    return result;
  }

  const threes = Math.floor((n - 4) / 3);
  const result: number[] = Array(threes).fill(3);
  return [...result, 2, 2];
}

/**
 * SectionBlockRenderer's state: `openItems`, the `userSelected`, `prevLengthRef` and
 * `prevIsStreaming` refs, and the dependency lists of its two effects.
 */
export interface SectionOpenState {
  open: string[];
  userSelected: boolean;
  prevLength: number;
  /** Starts as `undefined`: the refs are seeded with the first render's `isStreaming`. */
  prevIsStreaming: boolean | undefined;
  /** Effect 1's last dependencies `[items.length, isStreaming, firstItemValue]`; `undefined` before the first run. */
  deps1?: { length: number; streaming: boolean; first: string | undefined };
  /** Effect 2's last dependency `[isStreaming]`. */
  deps2?: boolean;
}

export const freshSectionOpenState = (): SectionOpenState => ({
  open: [],
  userSelected: false,
  prevLength: 0,
  prevIsStreaming: undefined,
});

/**
 * Both of SectionBlockRenderer's effects, run once per render instead of after it, in
 * their order (the second one's `setOpenItems(value)` wins over the first one's update):
 *  1. while streaming, a section that arrived opens (unless the person chose); otherwise
 *     an empty selection opens the first section;
 *  2. when streaming ends and the person never chose, only the first section stays open.
 * An effect runs when its dependencies changed (always on the first render).
 *
 * @param items  each section's `props.value`, in order (`items[i]?.props?.value`)
 */
export function syncSectionOpen(state: SectionOpenState, items: readonly (string | undefined)[], isStreaming: boolean): void {
  if (state.prevIsStreaming === undefined) state.prevIsStreaming = isStreaming;
  const firstItemValue = items[0];

  const d = state.deps1;
  if (!d || d.length !== items.length || d.streaming !== isStreaming || d.first !== firstItemValue) {
    state.deps1 = { length: items.length, streaming: isStreaming, first: firstItemValue };
    if (items.length > 0) {
      if (isStreaming && items.length > state.prevLength && !state.userSelected) {
        const lastValue = items[items.length - 1];
        if (lastValue && !state.open.includes(lastValue)) state.open = [...state.open, lastValue];
      } else if (state.open.length === 0 && firstItemValue) {
        state.open = [firstItemValue];
      }
      state.prevLength = items.length;
    }
  }

  if (state.deps2 !== isStreaming) {
    state.deps2 = isStreaming;
    if (state.prevIsStreaming && !isStreaming && !state.userSelected && items.length > 0) {
      state.open = firstItemValue ? [firstItemValue] : [];
    }
    state.prevIsStreaming = isStreaming;
  }
}

/** Radix Accordion `type="multiple"`: a press opens a shut item and shuts an open one; the person chose. */
export function toggleSection(state: SectionOpenState, value: string): void {
  state.userSelected = true;
  state.open = state.open.includes(value) ? state.open.filter((v) => v !== value) : [...state.open, value];
}
