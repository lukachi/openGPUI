// A run of rows drawn through gpui-kit's lazy `list` inside a page that scrolls itself.
//
// `list` builds only the rows on screen (each in a call of its own, from layout: no
// handlers, no retained state, no cx.notify), scrolls itself and paints no scrollbar.
// gpui hands every wheel event to both the list and the page around it (neither stops
// propagation), so a box around the list stops it unless the list's last layout built
// its 1px end row on the side the wheel goes: the page scrolls on only at the list's ends.
import { div, list, type Element } from "gpui-kit";
import { Scrollbar } from "gpui-base";
import type { RenderContext } from "../render/surface.ts";

interface LazyState {
  /** Lowest and highest list index built in `frame`: the 1px rows at both ends show where the list is scrolled. */
  seen: { frame: number; min: number; max: number };
}

/**
 * The children of a `relative` box of definite height: the list of `count` rows (keyed by
 * `key`, drawn by `row`) and its scrollbar. `left` widens the list past the box's left side
 * (rows padded back in by the caller), for content a full draw lets overflow there. The
 * first and last rows should reach 1px over the end rows (`mt(-1)`, `mb(-1)`; see `edge`).
 */
export function lazyRows(
  ctx: RenderContext,
  part: string,
  o: { count: number; key: (k: number) => string; row: (k: number) => Element; left?: number },
): Element[] {
  const local = ctx.local<LazyState>({ seen: { frame: -1, min: 0, max: 0 } }, `${part}-lazy`);
  const n = o.count;
  const listId = ctx.id(`${part}-list`);
  const rows = list(
    listId,
    n + 2,
    (i) => (i === 0 ? "top" : i === n + 1 ? "end" : o.key(i - 1)),
    (i) => {
      const seen = local.seen;
      if (seen.frame !== ctx.frame) local.seen = { frame: ctx.frame, min: i, max: i };
      else {
        seen.min = Math.min(seen.min, i);
        seen.max = Math.max(seen.max, i);
      }
      return i === 0 || i === n + 1 ? div().w_full().h(1) : o.row(i - 1);
    },
  ).size_full();
  const wheel = div()
    .id(ctx.id(`${part}-rows`))
    .absolute()
    .top(0)
    .bottom(0)
    .left(-(o.left ?? 0))
    .right(0)
    .on_scroll_wheel((e, cx) => {
      // The list, drawn inside this box, has taken the wheel already; the page gets it only at the
      // list's ends, as the last layout left them (positive y scrolls up).
      const atEdge = e.delta.y > 0 ? local.seen.min === 0 : e.delta.y < 0 ? local.seen.max === n + 1 : true;
      if (!atEdge) cx.stop_propagation();
    })
    .child(rows);
  return [wheel, Scrollbar.vertical(listId).absolute().inset_0()];
}

/** Row `k` of `count` reaching 1px over the list's end rows, so its content sits where a full draw puts it. */
export function edge(el: Element, k: number, count: number): Element {
  let out = el;
  if (k === 0) out = out.mt(-1);
  if (k === count - 1) out = out.mb(-1);
  return out;
}
