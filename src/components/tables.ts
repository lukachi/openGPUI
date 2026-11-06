// Tables: Table, Col.
//
// Ported from react-ui at the pinned commit:
//   Table, Col  genui-lib/Table/index.tsx, components/Table/{Table.tsx,table.scss},
//               components/Skeleton/{Skeleton.tsx,skeleton.scss} (TableSkeleton)
//
// gpui has no table layout: columns share the width equally instead of sizing
// to their content, and cells truncate instead of scrolling the table sideways
// (upstream's ScrollableTable arrows are therefore not drawn).
import { isElementNode } from "@openuidev/lang-core";
import { div, type Element } from "gpui-kit";
import type { Component, RenderContext } from "../render/surface.ts";
import { textStyle, typography } from "../render/tokens.ts";
import { iconButton } from "./buttons.ts";

const DEFAULT_PAGE_SIZE = 10;

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Col is drawn by its Table; alone it renders nothing (as upstream). */
export const Col: Component = {
  render() {
    return null;
  },
};

export const Table: Component = {
  render(props, ctx) {
    const t = ctx.t;
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

    // .openui-table-cell / -head: padding m on every side, neutral primary text; cells don't wrap.
    const cell = (): Element => div().flex().flex_row().items_center().flex_1().min_w_0().p(t.spaceM).text_color(t.textNeutralPrimary);

    const header = div()
      .flex()
      .flex_row()
      .border_b_1()
      .border_color(t.borderDefault)
      .children(
        cols.map((c) =>
          cell().child(
            textStyle(div().flex_1().min_w_0().truncate().text_color(t.textNeutralSecondary), typography(t, "body", "small")).child(c.label),
          ),
        ),
      );

    const rows: Element[] = [];
    for (let r = start; r < end; r++) {
      const odd = (r - start) % 2 === 1; // nth-child(even)
      rows.push(
        div()
          .id(ctx.id(`r${r}`))
          .flex()
          .flex_row()
          .when(odd, (el) => el.bg(t.highlightSubtle))
          .when(r < end - 1, (el) => el.border_b_1().border_color(t.borderDefault))
          .children(
            cols.map((c, ci) => {
              const v = c.data[r];
              return typeof v === "object" && v !== null
                ? cell().children(ctx.children(v, `c${r}_${ci}`))
                : cell().child(div().truncate().child(String(v ?? "")));
            }),
          ),
      );
    }

    const table = textStyle(
      div().flex().flex_col().w_full().border_1().border_color(t.borderDefault).rounded(t.radius2xl).overflow_hidden(),
      typography(t, "body", "small"),
    )
      .child(header)
      .children(rows);

    if (totalPages <= 1) return div().id(ctx.id()).w_full().child(table);
    // Pagination: IconButtons (small, secondary) around "n / total" (13px, #6b7280 inline upstream).
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
          glyph: "‹",
          size: "small",
          variant: "secondary",
          disabled: page === 0,
          onClick: (cx) => {
            local.page = Math.max(0, page - 1);
            cx.notify();
          },
        }),
      )
      .child(div().text_size(13).text_color("#6b7280").child(`${page + 1} / ${totalPages}`))
      .child(
        iconButton(ctx, {
          id: ctx.id("next"),
          glyph: "›",
          size: "small",
          variant: "secondary",
          disabled: page >= totalPages - 1,
          onClick: (cx) => {
            local.page = Math.min(totalPages - 1, page + 1);
            cx.notify();
          },
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
