// Tables: Table, Col (column-oriented, paged by 10 like upstream).
import { isElementNode } from "@openuidev/lang-core";
import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import type { Element } from "gpui-kit";
import type { Component } from "../render/surface.ts";
import { button } from "./buttons.ts";

const PAGE_SIZE = 10;

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Col is drawn by its Table; alone it shows nothing (as upstream). */
export const Col: Component = {
  render() {
    return null;
  },
};

export const Table: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const cols = asArray(props.columns)
      .filter(isElementNode)
      .map((c) => ({ label: String(c.props.label ?? ""), data: asArray(c.props.data), type: c.props.type }));
    const rowCount = cols.length ? Math.max(0, ...cols.map((c) => c.data.length)) : 0;

    if (ctx.queryLoading && rowCount === 0) {
      return div().w_full().py(12).text_size(12).text_color(t.dim).child("Loading…");
    }
    if (!cols.length) return null;

    const local = ctx.local({ page: 0 });
    const pages = Math.ceil(rowCount / PAGE_SIZE);
    const page = Math.min(local.page, Math.max(0, pages - 1));
    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, rowCount);

    // A row, so element cells (a Tag, a Button) keep their own width instead of stretching.
    const cell = (col: { type?: unknown }, content: string | null, header: boolean): Element =>
      h_flex()
        .flex_1()
        .min_w_0()
        .px(10)
        .py(header ? 6 : 8)
        .gap(6)
        .items_center()
        .when(col.type === "number", (el) => el.justify_end())
        .when(content != null, (el) => el.child(content!));

    const header = h_flex()
      .w_full()
      .border_b_1()
      .border_color(t.border)
      .bg(t.surface)
      .text_size(12)
      .font_semibold()
      .text_color(t.muted)
      .children(cols.map((c) => cell(c, c.label, true)));

    const rows: Element[] = [];
    for (let r = start; r < end; r++) {
      rows.push(
        h_flex()
          .id(ctx.id(`r${r}`))
          .w_full()
          .items_center()
          .text_size(13)
          .when(r < end - 1, (el) => el.border_b_1().border_color(t.border))
          .hover((s) => s.bg(t.hover))
          .children(
            cols.map((c, ci) => {
              const v = c.data[r];
              const content =
                typeof v === "object" && v !== null ? ctx.children(v, `c${r}_${ci}`) : [String(v ?? "")];
              return cell(c, null, false).children(content);
            }),
          ),
      );
    }

    return v_flex()
      .id(ctx.id())
      .w_full()
      .gap(8)
      .child(
        v_flex()
          .w_full()
          .rounded(t.radius)
          .border_1()
          .border_color(t.border)
          .overflow_hidden()
          .child(header)
          .children(rows),
      )
      .when(pages > 1, (el) =>
        el.child(
          h_flex()
            .w_full()
            .justify_end()
            .items_center()
            .gap(8)
            .child(
              button(ctx, {
                id: ctx.id("prev"),
                label: "‹",
                variant: "secondary",
                size: "small",
                disabled: page === 0,
                onClick: (cx) => {
                  local.page = Math.max(0, page - 1);
                  cx.notify();
                },
              }),
            )
            .child(div().text_size(12).text_color(t.muted).child(`${page + 1} / ${pages}`))
            .child(
              button(ctx, {
                id: ctx.id("next"),
                label: "›",
                variant: "secondary",
                size: "small",
                disabled: page >= pages - 1,
                onClick: (cx) => {
                  local.page = Math.min(pages - 1, page + 1);
                  cx.notify();
                },
              }),
            ),
        ),
      );
  },
};
