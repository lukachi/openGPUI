// Tables: Table, Col, and the table layout markdown tables share.
//
// Ported from react-ui at the pinned commit:
//   Table, Col  genui-lib/Table/index.tsx, components/Table/{Table.tsx,table.scss}
//               (ScrollableTable), components/Skeleton/{Skeleton.tsx,skeleton.scss} (TableSkeleton)
//
// gpui has no table layout, so `tableView` lays a table out the way a browser's
// automatic table layout does for upstream's markup. Cells don't wrap
// (`white-space: nowrap`), so a column is as wide as its widest cell: every
// cell's content reports its own width (on_size_change), and the next frame
// sizes the columns. A table narrower than its container fills it, the extra
// width shared in proportion to the columns' widths; a wider one keeps its
// width and scrolls sideways (ScrollableTable's `max-content`).
// gpui-kit cannot scroll a div from code, so the scroll is an offset the table
// owns: the wheel and trackpad move it, and ScrollableTable's chevron controls
// step it column by column with a sliding transition, like upstream's smooth
// `scrollTo`. The first frame of new rows is drawn before they are measured,
// with columns of equal width.
import { isElementNode } from "@openuidev/lang-core";
import { div, type Color, type Context, type Element, type ScrollWheelEvent } from "gpui-kit";
import type { Component, RenderContext } from "../render/surface.ts";
import { textStyle, typography, type TextStyle, type Tokens } from "../render/tokens.ts";
import { iconButton } from "./buttons.ts";

const DEFAULT_PAGE_SIZE = 10;

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Col is drawn by its Table; alone it renders nothing (as upstream). */
export const Col: Component = {
  render() {
    return null;
  },
};

export interface TableCell {
  content: (Element | string)[];
  /** TableHead/TableCell `align` (.openui-table-align-*). */
  align?: "left" | "center" | "right";
}

/** What cells inherit: .openui-table is body small; heads are secondary, cells primary. */
export function tableText(t: Tokens, head: boolean): { style: TextStyle; color: Color } {
  return { style: typography(t, "body", "small"), color: head ? t.textNeutralSecondary : t.textNeutralPrimary };
}

interface ViewState {
  /** Content widths by cell key ("h2", "r13c2"), px. */
  sizes: Record<string, number>;
  /** The scroll container's width, px. */
  viewport: number;
  /** Horizontal scroll offset, px. */
  offset: number;
  /** Whether the last offset change came from a control, and should slide. */
  smooth: boolean;
  /** The rows the measurements and offset belong to. */
  rowsKey: string;
}

/**
 * Column widths for content widths `content` (padding included) in a container
 * `viewport` wide: CSS automatic table layout with nothing to wrap.
 */
function columnWidths(content: number[], viewport: number): { widths: number[]; scrollable: boolean } {
  const total = content.reduce((a, b) => a + b, 0);
  if (total >= viewport || total === 0) return { widths: content, scrollable: total > viewport };
  return { widths: content.map((w) => w + ((viewport - total) * w) / total), scrollable: false };
}

/**
 * components/Table: header row, rows, the bordered container. `controls` adds
 * ScrollableTable's chevrons. `rowsKey` names the rows shown (a page): new rows
 * are measured afresh and scroll back to the start.
 */
export function tableView(
  ctx: RenderContext,
  part: string,
  o: { header: TableCell[]; rows: TableCell[][]; controls: boolean; rowsKey?: string },
): Element {
  const t = ctx.t;
  const local = ctx.local<ViewState>({ sizes: {}, viewport: 0, offset: 0, smooth: false, rowsKey: "" }, part);
  const rowsKey = o.rowsKey ?? "";
  if (local.rowsKey !== rowsKey) {
    local.rowsKey = rowsKey;
    local.sizes = {};
    local.offset = 0;
    local.smooth = false;
  }
  const columns = o.header.length;

  // Layout from last frame's measurements of exactly the cells on screen now.
  const pad = 2 * t.spaceM;
  const keys = Array.from({ length: columns }, (_, ci) => [`h${ci}`, ...o.rows.map((_, ri) => `r${ri}c${ci}`)]);
  const measured = local.viewport > 0 && keys.every((col) => col.every((k) => local.sizes[k] !== undefined));
  const layout = measured
    ? columnWidths(
        keys.map((col) => Math.ceil(Math.max(...col.map((k) => local.sizes[k]!))) + pad),
        local.viewport,
      )
    : null;
  const tableWidth = layout ? layout.widths.reduce((a, b) => a + b, 0) : 0;
  const maxOffset = layout?.scrollable ? tableWidth - local.viewport : 0;
  const offset = Math.min(Math.max(0, local.offset), maxOffset);
  const lefts = layout ? layout.widths.map((_, i) => layout.widths.slice(0, i).reduce((a, b) => a + b, 0)) : [];

  /** Content that reports its natural width under `key`. */
  const measure = (key: string, content: (Element | string)[]) =>
    div()
      .id(ctx.id(`${part}-m-${key}`))
      .flex()
      .flex_row()
      .flex_none()
      .items_center()
      .whitespace_nowrap()
      .on_size_change((size, cx) => {
        if (local.sizes[key] !== size.width) {
          local.sizes[key] = size.width;
          cx.notify();
        }
      })
      .children(content);

  // .openui-table-cell / -head: padding m on every side, no wrapping; align-* justifies.
  const cell = (ci: number, c: TableCell | undefined, key: string, head: boolean): Element => {
    const text = tableText(t, head);
    let el = textStyle(div().flex().flex_row().items_center().overflow_hidden().p(t.spaceM).text_color(text.color), text.style);
    el = layout ? el.flex_none().w(layout.widths[ci]!) : el.flex_1().min_w_0();
    if (c?.align === "right") el = el.justify_end();
    else if (c?.align === "center") el = el.justify_center();
    return el.child(measure(key, c?.content ?? []));
  };

  const header = div()
    .flex()
    .flex_row()
    .border_b_1()
    .border_color(t.borderDefault)
    .children(o.header.map((c, ci) => cell(ci, c, `h${ci}`, true)));

  const rows = o.rows.map((row, ri) =>
    div()
      .flex()
      .flex_row()
      .when(ri % 2 === 1, (el) => el.bg(t.highlightSubtle)) // tbody tr:nth-child(even)
      .when(ri < o.rows.length - 1, (el) => el.border_b_1().border_color(t.borderDefault))
      .children(Array.from({ length: columns }, (_, ci) => cell(ci, row[ci], `r${ri}c${ci}`, false))),
  );

  const scrollTo = (next: number, smooth: boolean, cx: Context) => {
    local.offset = Math.min(Math.max(0, next), maxOffset);
    local.smooth = smooth;
    cx.notify();
  };

  // .openui-table-container: border default, radius 2xl, overflow auto (scrollbar hidden).
  const container = div()
    .id(ctx.id(`${part}-scroll`))
    .w_full()
    .overflow_hidden()
    .border_1()
    .border_color(t.borderDefault)
    .rounded(t.radius2xl)
    .on_size_change((size, cx) => {
      const inner = size.width - 2; // inside the 1px border
      if (local.viewport !== inner) {
        local.viewport = inner;
        cx.notify();
      }
    })
    .when(maxOffset > 0, (el) =>
      el.on_scroll_wheel((e: ScrollWheelEvent, cx) => {
        const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
        if (dx === 0) return;
        cx.stop_propagation();
        scrollTo(local.offset - dx, false, cx);
      }),
    )
    .child(
      div()
        .id(ctx.id(`${part}-content`))
        .relative()
        .flex()
        .flex_col()
        .when(!!layout?.scrollable, (el) => el.w(tableWidth).left(-offset))
        .when(!layout?.scrollable, (el) => el.w_full())
        .when(local.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" }))
        .child(header)
        .children(rows),
    );

  // ScrollableTable controls: small secondary chevrons at the top corners while there is somewhere to go.
  const control = (side: "left" | "right") => {
    const canGo = side === "left" ? offset > 0 : offset < maxOffset - 1;
    if (!o.controls || !layout?.scrollable || !canGo) return null;
    return div()
      .absolute()
      .top(t.spaceS)
      .when(side === "left", (el) => el.left(t.spaceS))
      .when(side === "right", (el) => el.right(t.spaceS))
      .rounded(t.radiusS)
      .bg(t.foreground)
      .child(
        iconButton(ctx, {
          id: ctx.id(`${part}-scroll-${side}`),
          icon: side === "left" ? "ChevronLeft" : "ChevronRight",
          size: "small",
          variant: "secondary",
          onClick: (cx) => {
            // scrollToPrevColumn / scrollToNextColumn: the nearest column edge past the current offset.
            const target =
              side === "left" ? (lefts.filter((l) => l < offset - 1).at(-1) ?? 0) : (lefts.find((l) => l > offset + 1) ?? maxOffset);
            scrollTo(target, true, cx);
          },
        }),
      );
  };

  return div()
    .relative()
    .w_full()
    .child(container)
    .children([control("left"), control("right")].filter((c): c is Element => c !== null));
}

export const Table: Component = {
  render(props, ctx) {
    const columns = asArray(props.columns);
    const cols = columns.filter(isElementNode).map((c) => ({ label: String(c.props.label ?? ""), data: asArray(c.props.data) }));
    const rowCount = cols.length ? Math.max(0, ...cols.map((c) => c.data.length)) : 0;

    if (ctx.queryLoading && rowCount === 0) return tableSkeleton(ctx, 5, Math.max(cols.length || columns.length, 3));
    if (!cols.length) return null;

    const local = ctx.local({ page: 0 });
    const totalPages = Math.ceil(rowCount / DEFAULT_PAGE_SIZE);
    const page = Math.min(local.page, Math.max(0, totalPages - 1));
    const start = page * DEFAULT_PAGE_SIZE;
    const end = Math.min(start + DEFAULT_PAGE_SIZE, rowCount);

    const rows: TableCell[][] = [];
    for (let r = start; r < end; r++) {
      rows.push(
        cols.map((c, ci) => {
          const v = c.data[r];
          return { content: typeof v === "object" && v !== null ? ctx.children(v, `c${r}_${ci}`) : [String(v ?? "")] };
        }),
      );
    }
    const table = tableView(ctx, "table", {
      header: cols.map((c) => ({ content: [c.label] })),
      rows,
      controls: true,
      rowsKey: String(page),
    });

    if (totalPages <= 1) return div().id(ctx.id()).w_full().child(table);
    // Pagination: IconButtons (small, secondary) around "n / total" (13px, #6b7280 inline upstream).
    const turn = (to: number) => (cx: Context) => {
      local.page = to;
      cx.notify();
    };
    const pager = div()
      .flex()
      .flex_row()
      .items_center()
      .justify_end()
      .gap(8)
      .pt(8)
      .child(
        iconButton(ctx, {
          id: ctx.id("prev"),
          icon: "ChevronLeft",
          size: "small",
          variant: "secondary",
          disabled: page === 0,
          onClick: turn(Math.max(0, page - 1)),
        }),
      )
      .child(div().text_size(13).text_color("#6b7280").child(`${page + 1} / ${totalPages}`))
      .child(
        iconButton(ctx, {
          id: ctx.id("next"),
          icon: "ChevronRight",
          size: "small",
          variant: "secondary",
          disabled: page >= totalPages - 1,
          onClick: turn(Math.min(totalPages - 1, page + 1)),
        }),
      );
    return div().id(ctx.id()).w_full().child(table).child(pager);
  },
};

/** components/Skeleton TableSkeleton: a header row and `rows` rows of pulsing bars. */
function tableSkeleton(ctx: RenderContext, rows: number, columns: number): Element {
  const t = ctx.t;
  const bar = (width: string) =>
    div().h(14).w(width as `${number}%`).bg(t.elevated).rounded(t.radiusS).loop("opacity", { from: 0.3, to: 0.85, period: 1200 });
  const row = (cells: Element[], last: boolean) =>
    div()
      .flex()
      .flex_row()
      .gap(t.spaceM)
      .py(t.spaceSM)
      .px(t.spaceM)
      .when(!last, (el) => el.border_b_1().border_color(t.borderDefault))
      .children(cells.map((c) => div().flex_1().h(14).child(c)));
  const out = [row(Array.from({ length: columns }, () => div().w("60%" as `${number}%`).child(bar("100%"))), false)];
  for (let ri = 0; ri < rows; ri++) {
    out.push(row(Array.from({ length: columns }, (_, ci) => bar(`${50 + ((ri * 7 + ci * 13) % 40)}%`)), ri === rows - 1));
  }
  return div().id(ctx.id("skeleton")).py(t.spaceS).children(out);
}
