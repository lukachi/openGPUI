// EditableTable.
//
// Ported from react-ui at the pinned commit:
//   EditableTable  genui-lib/EditableTable/{schema.ts,index.tsx} (the renderer: rows, baseline,
//                  changed cells, Save Changes), components/EditableTable/{EditableTable.tsx,
//                  editableTable.scss} (the grid, scroll controls, EditableTableChangesBar),
//                  components/EditableTable/base/editableTableBase.scss,
//                  components/EditableTable/base/components/{cellRegistry.ts,CellTypes.ts,CellOutline.tsx,
//                  TextBaseEditableCell.tsx,EditableTextCell.tsx,EditableNumberCell.tsx,EditableUrlCell.tsx,
//                  EditableDateCell.tsx,EditableSelectCell.tsx,editableCellBase.scss},
//                  components/EditableTable/base/hooks/useEditableCellKeyboard.ts
//   The row/value model and the table layout are in editable-table-model.ts; url cells
//   go through upstream's own safeUrl (components/_shared/utils/safeUrl.ts, `openui-safe-url`).
//   The changes bar's elevated fill is see-through, so it draws without its shadow-s (gpui
//   would show the shadow through the fill: tokens.ts shadow(), docs/gpui-differences.md "Shadows").
//
// Contract, as upstream: `name`, `columns` ({ type, key, header, width?, options? }) and
// `data` ({ id, values } rows, values positional). Nothing is stored while cells are
// edited. "Save Changes" stores the edited rows (positional again) as field `name` of
// form `name` (upstream's setFieldValue(name, "EditableTable", name, rows)), sends the
// action "Save Changes" with form `name`, and makes the saved rows the new baseline;
// "Reset" brings the baseline back. The bar under the table counts the cells that differ
// from the baseline and shows only while that count is above 0. There are no row
// add/remove controls upstream, so there are none here. Dates are stored as ISO strings.
//
// Behavior, as upstream: a click selects a cell, a click on the selected cell edits it;
// arrows and Tab/Shift-Tab move the selection, Enter or F2 edits, a typed character
// starts editing with that character. While editing a text, number or url cell, Enter
// saves and moves down, Tab saves and moves sideways, Escape cancels, leaving the cell
// saves. Select and date cells edit by opening their menu or calendar; picking saves.
// A press outside the table clears the selection unless a select or date cell is open.
//
// Where gpui differs from the browser:
// - Layout: gpui has no table layout. Each column's minimum (its header, and select and
//   date fields, which take their content's width) is measured, and the widths follow the
//   browser's automatic table layout over `th { width }` (columnLayout), so a new table is
//   drawn once with its declared widths before it settles. The sideways scroll is an
//   offset the table owns, as in Table: wheel, trackpad and shift-wheel move it, the
//   chevrons step it a column at a time with a sliding transition, and there is no
//   scrollbar, as upstream hides it.
// - The header's fill is drawn once behind the scrolling grid, so its rounded top
//   corners stay rounded (gpui clips children to a rectangle).
// - Keyboard: one focus handle for the whole table stands in for each cell's tabIndex;
//   a text edit is gpui-base's native Input on the same retained state for every cell.
//   Enter saves through the input's submit event. A character typed on a selected cell
//   starts the edit with that character selected, as upstream's focus-and-select does, so
//   the next character replaces it.
// - The number cell edits plain text (gpui has no `type="number"` input), parsed on save
//   as upstream (a finite float, else 0).
// - Tab and Shift-Tab: the shell root binds them to the window's focus traversal, and a key
//   binding runs before any key handler, so a key handler never hears them. The table binds
//   the two chords itself, in its own key context, and gets them as actions (onTab).
// - Enter in an open select menu picks the highlighted option. Upstream, React bubbles
//   that Enter from the portaled menu to the cell, whose stale handler saves the old value
//   again and moves down, so the pick is lost.
// - Enter in an open calendar moves down and picks nothing, as upstream's cell handler does;
//   Space picks the focused day (the calendar binds both keys, see calendar.ts).
// - A url cell's link opens through the system (cx.open_url) only for an absolute http(s)
//   address, which is all the host opens; any other href upstream's anchor would follow (a
//   bare host such as "example.com" is a relative link in a browser) does nothing here.
import { Input as GInput, InputState } from "gpui-base";
import { div, type Context, type Element, type FocusHandle, type KeyEvent, type ScrollWheelEvent } from "gpui-kit";
import { safeUrl } from "openui-safe-url";
import { optional, type Component, type Rendered } from "../render/surface.ts";
import { shadow, textStyle, typography, type TextStyle } from "../render/tokens.ts";
import { button, iconButton } from "./buttons.ts";
import { formatSingleDate } from "./date-logic.ts";
import { datePickerControl } from "./datepicker.ts";
import {
  baselineOf,
  changedCellCount,
  columnLayout,
  columnSize,
  fromRows,
  navigate,
  parseNumber,
  toDate,
  toDisplayString,
  toRows,
  updateData,
  type CellPosition,
  type EditableCellType,
  type EditableColumn,
  type EditableDataRow,
  type EditableRow,
  type NavigateDirection,
} from "./editable-table-model.ts";
import { selectControl } from "./select.ts";

const CELL_TYPES: EditableCellType[] = ["text", "number", "date-single", "select", "url"];
/** Cells whose editor lives in a popup: a press outside the table must not end their edit. */
const PORTAL_CELL_TYPES: EditableCellType[] = ["date-single", "select"];
const TEXT_CELL_TYPES: EditableCellType[] = ["text", "number", "url"];
/** What `cx.open_url` accepts: an absolute HTTP(S) URL with a host. */
const OPENABLE_URL = /^https?:\/\/[^\s/?#]+/i;

/**
 * The shell root binds Tab and Shift-Tab to the window's focus traversal, and a key binding
 * runs before any key handler: a table hears the two chords only through bindings of its own,
 * in its own key context, which sit deeper than the root's.
 */
const KEY_CONTEXT = "OpenGPUIEditableTable";
const TAB_ACTION = "opengpui-editable-table-tab";
const TAB_PREV_ACTION = "opengpui-editable-table-tab-prev";
let tabKeysBound = false;
function bindTabKeys(cx: Context): void {
  if (tabKeysBound) return;
  cx.bind_keys([
    { keystroke: "tab", action: TAB_ACTION, context: KEY_CONTEXT },
    { keystroke: "shift-tab", action: TAB_PREV_ACTION, context: KEY_CONTEXT },
  ]);
  tabKeysBound = true;
}

/** `th` and `td`: height 48px. */
const ROW_HEIGHT = 48;
/** Header and display icons: lucide size 16. */
const ICON = 16;

interface TableState {
  /** The data the rows came from (stored value or `data`), to notice when it changes. */
  source: string | null;
  /** The data object and column keys `source` was taken from: unchanged, it isn't serialized again. */
  sourceRef: unknown;
  sourceKeys: string;
  /** Whether the last layout scrolled (upstream's isScrollable, measured on the max-content table). */
  scrollable: boolean;
  rows: EditableRow[];
  /** Established once streaming ends; Save moves it, Reset returns to it. */
  baseline: Map<string, EditableRow> | undefined;
  changed: number;
  selected: CellPosition | null;
  editing: (CellPosition & { cellType: EditableCellType }) | null;
  /** The cell whose date field is under the pointer: its press belongs to the picker. */
  overField: string | null;
  /** An edit ended during this event: the same key press must not start another. */
  justEnded: boolean;
  /** Where the keyboard goes once the next frame is drawn. */
  focus: "table" | "input" | null;
  /** Measured content widths by key ("h2", "r3c2"), px. */
  sizes: Record<string, number>;
  viewport: number;
  offset: number;
  smooth: boolean;
}

interface Native {
  focus: FocusHandle;
  input: InputState;
  release(): void;
}

interface NativeMeta {
  onSubmit(cx: Context): void;
  onBlur(cx: Context): void;
}

/** The columns prop as the schema's defaults fill it (fields may still be streaming in). */
function readColumns(value: unknown): EditableColumn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => ({
      type: CELL_TYPES.includes(c.type as EditableCellType) ? (c.type as EditableCellType) : undefined,
      key: c.key === undefined ? "default" : String(c.key),
      header: c.header === undefined ? "" : String(c.header),
      width: typeof c.width === "number" ? c.width : undefined,
      options: Array.isArray(c.options)
        ? c.options
            .filter((o): o is Record<string, unknown> => !!o && typeof o === "object")
            .map((o) => ({ value: String(o.value ?? ""), label: String(o.label ?? "") }))
        : undefined,
    }));
}

function readData(value: unknown): EditableDataRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({ id: String(r.id ?? ""), values: Array.isArray(r.values) ? r.values : [] }));
}

/** headerIcon: by column type. */
function headerIcon(type: EditableCellType | undefined): string | null {
  switch (type) {
    case undefined:
      return null;
    case "url":
      return "Link";
    case "date-single":
      return "CalendarDays";
    case "select":
      return "List";
    default:
      return "Type";
  }
}

export const EditableTable: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const session = ctx.session;
    const name = String(props.name ?? "");
    const columns = readColumns(props.columns);
    const columnKeys = columns.map((c) => c.key);

    const st = ctx.local<TableState>({
      source: null,
      sourceRef: undefined,
      sourceKeys: "",
      scrollable: false,
      rows: [],
      baseline: undefined,
      changed: 0,
      selected: null,
      editing: null,
      overField: null,
      justEnded: false,
      focus: null,
      sizes: {},
      viewport: 0,
      offset: 0,
      smooth: false,
    });

    // useState(toRows(existingValue || initialData)) and the effect that resets it when either changes:
    // the same data object (or the same columns) skips reading and comparing it again.
    const existingValue = ctx.watch(() => session.getFieldValue(name, name) as EditableDataRow[] | undefined);
    const rawSource: unknown = existingValue || props.data;
    const sourceData = () => existingValue || readData(props.data);
    const sourceKeys = columnKeys.join("\n");
    if (st.sourceRef !== rawSource || st.sourceKeys !== sourceKeys) {
      st.sourceRef = rawSource;
      st.sourceKeys = sourceKeys;
      const data = sourceData();
      const source = JSON.stringify([columnKeys, data]);
      if (st.source !== source) {
        st.source = source;
        st.rows = toRows(columnKeys, data);
      }
    }
    // Establish the baseline once streaming ends, so changed cells can be counted.
    if (!ctx.streaming && st.baseline === undefined) st.baseline = baselineOf(toRows(columnKeys, sourceData()));

    const rows = st.rows;
    const columnOf = (key: string) => columns.find((c) => c.key === key);
    /** CellRenderer: the column's type, text when it has none. */
    const typeOf = (key: string): EditableCellType => columnOf(key)?.type || "text";

    const native = ctx.retained<Native, NativeMeta>(ctx.id("native"), {
      kind: "editable-table",
      meta: { onSubmit: (cx) => onSubmit(cx), onBlur: (cx) => onBlur(cx) },
      create(entry, cx) {
        bindTabKeys(cx);
        const focus = cx.focus_handle();
        const input = InputState.new({});
        input.on("submit", (_e, cx) => entry.meta.onSubmit(cx));
        input.on("blur", (_e, cx) => entry.meta.onBlur(cx));
        return {
          focus,
          input,
          release() {
            focus.release();
            input.release();
          },
        };
      },
    });
    if (st.focus && native) {
      const target = st.focus;
      st.focus = null;
      ctx.after(() => {
        if (target === "table") {
          native.focus.focus();
          return;
        }
        native.input.focus();
        native.input.set_selected_range({ start: 0, end: native.input.value().length });
      });
    }
    if (st.justEnded) ctx.after(() => (st.justEnded = false));

    // ── The grid's state changes (EditableTable.tsx and the renderer) ──
    /** updateData → onDataChange → handleDataChange: recount against the baseline. */
    const update = (rowIndex: number, columnId: string, value: unknown) => {
      const next = updateData(st.rows, rowIndex, columnId, value);
      if (!next) return;
      st.rows = next;
      st.changed = changedCellCount(columnKeys, next, st.baseline);
    };
    /** handleFinishEdit: the cell stays selected and takes the keyboard back. */
    const finishEdit = () => {
      if (!st.editing) return;
      st.editing = null;
      st.justEnded = true;
      st.focus = "table";
    };
    /** A text cell's handleSave: parse the input and store it. */
    const saveText = () => {
      const e = st.editing;
      if (!e || !TEXT_CELL_TYPES.includes(typeOf(e.column)) || !native) return;
      const raw = native.input.value();
      update(e.row, e.column, typeOf(e.column) === "number" ? parseNumber(raw) : raw);
      finishEdit();
    };
    const handleCellSelect = (row: number, column: string) => {
      // A browser blurs the edited input first, which saves it.
      saveText();
      st.selected = { row, column };
      st.editing = null;
      st.focus = "table";
    };
    const handleStartEdit = (row: number, column: string, char?: string) => {
      const e = st.editing;
      if (e && e.row === row && e.column === column) return;
      saveText();
      const cellType = columnOf(column)?.type ?? "text";
      st.selected = { row, column };
      st.editing = { row, column, cellType };
      if (TEXT_CELL_TYPES.includes(typeOf(column)) && native) {
        // onStartEditWithChar replaces the edit buffer; the input then takes focus and selects it.
        native.input.set_value(char ?? toDisplayString(rows[row]?.[column]));
        st.focus = "input";
      }
    };
    const handleNavigate = (direction: NavigateDirection) => {
      if (!st.selected) return;
      st.selected = navigate(st.selected, direction, columns, rows.length);
      st.editing = null;
      st.focus = "table";
      reveal(st.selected.column);
    };

    function onSubmit(cx: Context) {
      if (!st.editing || !TEXT_CELL_TYPES.includes(typeOf(st.editing.column))) return;
      saveText();
      handleNavigate("down");
      cx.notify();
    }
    function onBlur(cx: Context) {
      if (!st.editing || !TEXT_CELL_TYPES.includes(typeOf(st.editing.column))) return;
      saveText();
      cx.notify();
    }

    // useEditableCellKeyboard and the select and date cells' key interceptors (Tab is onTab).
    const onKey = (e: KeyEvent, cx: Context) => {
      const handled = () => {
        cx.stop_propagation();
        cx.notify();
      };
      const editing = st.editing;
      if (editing) {
        const type = typeOf(editing.column);
        if (e.key === "escape") {
          finishEdit();
          return handled();
        }
        if (e.key === "enter") {
          if (TEXT_CELL_TYPES.includes(type)) {
            // The input's submit event normally gets here first; this covers a host that sends the key instead.
            saveText();
            handleNavigate("down");
            return handled();
          }
          if (type === "date-single") {
            handleNavigate("down");
            return handled();
          }
        }
        return;
      }
      if (st.justEnded) return;
      const selected = st.selected;
      if (!selected) return;
      switch (e.key) {
        case "enter":
        case "f2":
          handleStartEdit(selected.row, selected.column);
          return handled();
        case "up":
        case "down":
        case "left":
        case "right":
          handleNavigate(e.key);
          return handled();
      }
      const char = e.key_char;
      if (char && char.length === 1 && !e.modifiers.control && !e.modifiers.platform && !e.modifiers.alt) {
        const text = TEXT_CELL_TYPES.includes(typeOf(selected.column));
        handleStartEdit(selected.row, selected.column, text ? char : undefined);
        return handled();
      }
    };
    /**
     * Tab and Shift-Tab, which the host binds to its own focus traversal: a key binding runs before
     * any key handler, so the table binds the two chords in its own key context and gets them as
     * actions.
     */
    const onTab = (shift: boolean, cx: Context) => {
      const sideways: NavigateDirection = shift ? "left" : "right";
      const editing = st.editing;
      if (editing) {
        const type = typeOf(editing.column);
        if (TEXT_CELL_TYPES.includes(type)) saveText();
        else if (type === "select") {
          update(editing.row, editing.column, rows[editing.row]?.[editing.column] || "");
          finishEdit();
        }
        handleNavigate(sideways);
      } else if (!st.selected) {
        // The table itself has the keyboard: Tab goes to the first cell, and is the table's either way.
        if (rows.length > 0 && columns.length > 0) st.selected = { row: 0, column: columns[0]!.key };
      } else handleNavigate(sideways);
      cx.stop_propagation();
      cx.notify();
    };

    // ── Layout ──
    const pad = 2 * t.spaceM;
    const measure = (key: string, content: (Element | string)[]) =>
      div()
        .id(ctx.id(`m-${key}`))
        .flex()
        .flex_row()
        .flex_none()
        .items_center()
        .whitespace_nowrap()
        .on_size_change((size, cx) => {
          if (st.sizes[key] !== size.width) {
            st.sizes[key] = size.width;
            cx.notify();
          }
        })
        .children(content);
    /** Text a field draws, measured where it can't push anything around. */
    const ghost = (key: string, text: string, style: TextStyle) =>
      div()
        .absolute()
        .top(0)
        .left(0)
        .h(0)
        .opacity(0)
        .overflow_hidden()
        .flex()
        .flex_row()
        .child(textStyle(measure(key, [text]), style));
    const width = (key: string) => st.sizes[key] ?? 0;
    const smallText = typography(t, "body", "small");
    const defaultText = typography(t, "body", "default");

    const mins = columns.map((col, ci) => {
      const border = ci < columns.length - 1 ? 1 : 0;
      // .openui-editable-table-header-container: the header text, gap s, the 16px icon.
      let min = pad + width(`h${ci}`) + t.spaceS + (headerIcon(col.type) ? ICON : 0);
      for (let ri = 0; ri < rows.length; ri++) {
        const type = col.type || "text";
        // The select trigger (md box, 1px border, gap s, chevron) and the date field (padding m, chevron).
        if (type === "select") min = Math.max(min, pad + 2 + 2 * (t.spaceM - 1) + width(`r${ri}c${ci}`) + t.spaceS + ICON);
        else if (type === "date-single") min = Math.max(min, pad + 2 + 2 * t.spaceM + width(`r${ri}c${ci}`) + ICON);
      }
      return Math.ceil(min) + border;
    });
    const maxes = columns.map((col) => columnSize(col));
    // Scrollable stays scrollable until the maxima fit: upstream then measures its max-content table.
    const layout = st.viewport > 0 ? columnLayout(mins, maxes, st.viewport, st.scrollable) : { widths: maxes, scrollable: false };
    st.scrollable = layout.scrollable;
    const widths = layout.widths;
    const tableWidth = widths.reduce((a, b) => a + b, 0);
    const maxOffset = layout.scrollable ? tableWidth - st.viewport : 0;
    const offset = Math.min(Math.max(0, st.offset), maxOffset);
    const starts = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
    const lefts = [...new Set(starts.map(Math.round))].sort((a, b) => a - b);
    /** A focused cell scrolls into view, as the browser's focus() does: here, the selected column. */
    function reveal(column: string) {
      const ci = columns.findIndex((c) => c.key === column);
      if (ci < 0 || maxOffset <= 0) return;
      const left = starts[ci]!;
      const right = left + widths[ci]!;
      if (left < st.offset) st.offset = left;
      else if (right > st.offset + st.viewport) st.offset = right - st.viewport;
      st.offset = Math.min(Math.max(0, st.offset), maxOffset);
      st.smooth = false;
    }

    // ── Header ──
    const header = div()
      .flex()
      .flex_row()
      .children(
        columns.map((col, ci) => {
          const icon = headerIcon(col.type);
          // thead th: padding s × m, border-right default, body small, secondary; 48px tall.
          return textStyle(
            div()
              .flex()
              .flex_row()
              .items_center()
              .flex_none()
              .w(widths[ci]!)
              .h(ROW_HEIGHT)
              .py(t.spaceS)
              .px(t.spaceM)
              .overflow_hidden()
              .text_color(t.textNeutralSecondary)
              .when(ci < columns.length - 1, (el) => el.border_r_1().border_color(t.borderDefault)),
            smallText,
          ).child(
            div()
              .flex()
              .flex_row()
              .items_center()
              .justify_between()
              .gap(t.spaceS)
              .w_full()
              .child(measure(`h${ci}`, [col.header]))
              .child(div().flex_none().children(icon ? optional(ctx.icon(icon, { size: ICON })) : [])),
          );
        }),
      );

    // ── Cells ──
    const outline = (selected: boolean, editing: boolean): Element[] => {
      if (!selected && !editing) return [];
      // .openui-editable-table-cell-outline-*: 1px selected, 1.5px editing, interactive-selected.
      const w = editing ? 1.5 : 1;
      const bar = () => div().absolute().bg(t.borderInteractiveSelected);
      return [
        bar().top(0).left(0).w_full().h(w),
        bar().bottom(0).left(0).w_full().h(w),
        bar().top(0).left(0).h_full().w(w),
        bar().top(0).right(0).h_full().w(w),
      ];
    };

    /** The absolute, vertically centered display line of a text, number or url cell. */
    const displayLine = () => div().absolute().left(t.spaceM).right(t.spaceM).top(0).bottom(0).flex().flex_row().items_center();
    const clipped = (text: string) => div().min_w_0().overflow_hidden().whitespace_nowrap().text_ellipsis().child(text);

    const cell = (ri: number, ci: number): Element => {
      const col = columns[ci]!;
      const columnId = col.key;
      const type = typeOf(columnId);
      const value = rows[ri]![columnId];
      const isSelected = st.selected?.row === ri && st.selected?.column === columnId;
      const isEditing = st.editing?.row === ri && st.editing?.column === columnId;
      /** Select and date cells draw a live control only while selected or edited. */
      const live = isSelected || isEditing;
      const part = `r${ri}c${ci}`;
      const key = ctx.id(`cell-${part}`);

      // .openui-editable-table-cell-base: relative, padding s × m, body small, primary.
      let base = textStyle(
        div().id(key).relative().flex().flex_col().flex_1().py(t.spaceS).px(t.spaceM).text_color(t.textNeutralPrimary),
        smallText,
      );

      if (TEXT_CELL_TYPES.includes(type)) {
        // TextBaseEditableCell: a click selects, a click on the selected (or edited) cell edits.
        base = base.on_click((_e, cx) => {
          cx.stop_propagation();
          if (!isSelected && !isEditing) handleCellSelect(ri, columnId);
          else handleStartEdit(ri, columnId);
          cx.notify();
        });
        if (isEditing && native) {
          // .openui-editable-table-cell-input: the full cell, transparent, no padding.
          base = base.child(textStyle(GInput.new(native.input).w_full().flex_1().bg("#00000000"), smallText));
        } else if (type === "url") {
          const raw = toDisplayString(value);
          const safeHref = safeUrl(raw);
          // .openui-editable-table-display-url: link icon (secondary), then the text, underlined on hover.
          let link = div()
            .id(ctx.id(`link-${part}`))
            .flex_1()
            .min_w_0()
            .overflow_hidden()
            .whitespace_nowrap()
            .text_ellipsis()
            .hover((s) => s.underline())
            .on_click((_e, cx) => {
              cx.stop_propagation();
              // cx.open_url throws unless the host accepts the URL (absolute http(s) with a host);
              // the regex skips the call for what plainly fails, the catch covers the rest ("https://a b").
              if (safeHref && OPENABLE_URL.test(safeHref)) {
                try {
                  cx.open_url(safeHref);
                } catch {
                  // not an address the host opens: nothing happens, as for any other href
                }
              }
            })
            .child(raw);
          if (safeHref) link = link.cursor_pointer();
          base = base.child(
            displayLine()
              .gap(t.spaceS)
              .child(div().flex_none().text_color(t.textNeutralSecondary).children(optional(ctx.icon("Link", { size: ICON }))))
              .child(link),
          );
        } else if (type === "number") {
          // .openui-editable-table-display-number: right aligned, number small.
          base = base.child(textStyle(displayLine().justify_end(), typography(t, "number", "small")).child(clipped(toDisplayString(value))));
        } else {
          base = base.child(displayLine().child(clipped(String(value ?? ""))));
        }
      } else if (type === "select") {
        const options = col.options ?? [];
        const current = (value as string) || "";
        const shown = options.find((o) => o.value === current)?.label ?? (current === "" ? "Select an option" : "");
        base = base
          .on_click((_e, cx) => {
            if (!isSelected && !isEditing) handleCellSelect(ri, columnId);
            else if (isSelected && !isEditing) handleStartEdit(ri, columnId);
            cx.notify();
          })
          .child(ghost(part, shown, smallText))
          .child(
            // Only the selected cell's trigger is live: elsewhere a press is the cell's (it selects),
            // as upstream's first click only selects, and no menu or native state exists.
            selectControl({
              ctx,
              part,
              value: current,
              items: options,
              placeholder: "Select an option",
              triggerText: "small",
              inert: !live,
              open: isEditing,
              onOpenChange(open) {
                // A press on the selected cell's trigger edits it; closing ends the edit.
                if (open) handleStartEdit(ri, columnId);
                else if (st.editing?.row === ri && st.editing.column === columnId) finishEdit();
              },
              onChange(next) {
                // handleValueChange: save and finish editing on selection.
                update(ri, columnId, next);
                finishEdit();
              },
            }),
          );
      } else {
        const date = toDate(value);
        if (!live && st.overField === part) st.overField = null;
        base = base
          .on_click((_e, cx) => {
            // onClickCapture: the first press anywhere in the cell, its field included, selects it.
            // On the selected cell the field is the live picker, whose own press opens it (and
            // reaches onOpenChange), so a press over the field is left to it.
            if (isEditing || (isSelected && st.overField === part)) return;
            if (!isSelected) handleCellSelect(ri, columnId);
            else handleStartEdit(ri, columnId);
            cx.notify();
          })
          .child(ghost(part, formatSingleDate(date), defaultText))
          .child(
            datePickerControl(ctx, {
              part,
              mode: "single",
              single: date,
              inert: !live,
              open: isEditing,
              onOpenChange(open) {
                if (open) handleStartEdit(ri, columnId);
                else finishEdit();
              },
              onFieldHover(hovered) {
                if (hovered) st.overField = part;
                else if (st.overField === part) st.overField = null;
              },
              onEnter() {
                // handleKeyDownWithPicker: Enter in the open picker selects the cell below, picking nothing.
                handleNavigate("down");
              },
              onSelect(next) {
                // handleDateChange: auto-save on date selection.
                update(ri, columnId, next instanceof Date ? next.toISOString() : undefined);
                finishEdit();
              },
            }),
          );
      }

      // td: border-right default; the cell base fills it.
      return div()
        .flex()
        .flex_col()
        .flex_none()
        .w(widths[ci]!)
        .when(ci < columns.length - 1, (el) => el.border_r_1().border_color(t.borderDefault))
        .child(base.children(outline(isSelected, isEditing)));
    };

    const body = rows.map((_, ri) =>
      div()
        .flex()
        .flex_row()
        .min_h(ROW_HEIGHT)
        .when(ri < rows.length - 1, (el) => el.border_b_1().border_color(t.borderDefault))
        .children(columns.map((_, ci) => cell(ri, ci))),
    );

    // ── The wrapper, its scroll container and controls ──
    const scrollTo = (next: number, smooth: boolean, cx: Context) => {
      st.offset = Math.min(Math.max(0, next), maxOffset);
      st.smooth = smooth;
      cx.notify();
    };
    const control = (side: "left" | "right"): Element | null => {
      const canGo = side === "left" ? offset > 0 : offset < maxOffset - 1;
      if (!layout.scrollable || !canGo) return null;
      // .openui-editable-table-scroll-control: top/side s, radius s, elevated; a small secondary IconButton.
      return div()
        .absolute()
        .top(t.spaceS)
        .when(side === "left", (el) => el.left(t.spaceS))
        .when(side === "right", (el) => el.right(t.spaceS))
        .rounded(t.radiusS)
        .bg(t.elevated)
        .child(
          iconButton(ctx, {
            id: ctx.id(`scroll-${side}`),
            icon: side === "left" ? "ChevronLeft" : "ChevronRight",
            size: "small",
            variant: "secondary",
            iconSize: ICON,
            onClick: (cx) => {
              // scrollToPrevColumn / scrollToNextColumn: the nearest column edge past the current offset.
              const target =
                side === "left" ? (lefts.filter((l) => l < offset - 1).at(-1) ?? 0) : (lefts.find((l) => l > offset + 1) ?? maxOffset);
              scrollTo(Math.min(target, maxOffset), true, cx);
            },
          }),
        );
    };

    // .openui-editable-table-wrapper: border default, radius xl on top, overflow hidden, focusable.
    let wrapper = div()
      .id(ctx.id())
      .relative()
      .w_full()
      .overflow_hidden()
      .border_1()
      .border_color(t.borderDefault)
      .rounded_t(t.radiusXl)
      .on_size_change((size, cx) => {
        const inner = size.width - 2; // inside the 1px border
        if (st.viewport !== inner) {
          st.viewport = inner;
          cx.notify();
        }
      })
      .on_mouse_down_out((_e, cx) => {
        // Click outside the table deselects, unless a select or date cell's popup is open.
        const portal = st.editing && PORTAL_CELL_TYPES.includes(st.editing.cellType);
        if (portal || (!st.selected && !st.editing)) return;
        saveText();
        st.selected = null;
        st.editing = null;
        st.focus = null;
        cx.notify();
      })
      .when(maxOffset > 0, (el) =>
        el.on_scroll_wheel((e: ScrollWheelEvent, cx) => {
          const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
          if (dx === 0) return;
          cx.stop_propagation();
          scrollTo(st.offset - dx, false, cx);
        }),
      );
    if (native) {
      wrapper = wrapper
        .track_focus(native.focus)
        .tab_index(0)
        .key_context(KEY_CONTEXT)
        .on_action(TAB_ACTION, (_e, cx) => onTab(false, cx))
        .on_action(TAB_PREV_ACTION, (_e, cx) => onTab(true, cx))
        .on_key_down(onKey);
    }

    const table = wrapper
      // thead th background, drawn once under the grid so the top corners stay round.
      .children(columns.length ? [div().absolute().top(0).left(0).right(0).h(ROW_HEIGHT).bg(t.highlightSubtle)] : [])
      .child(
        div()
          .id(ctx.id("content"))
          .relative()
          .flex()
          .flex_col()
          .when(layout.scrollable, (el) => el.w(tableWidth).left(-offset))
          .when(!layout.scrollable, (el) => el.w_full())
          .when(st.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" }))
          .when(columns.length > 0, (el) => el.child(header))
          .children(body),
      )
      .children([control("left"), control("right")].filter((c): c is Element => c !== null));

    const out: Rendered[] = [table];
    if (st.changed > 0) out.push(changesBar());
    return out;

    /** EditableTableChangesBar: the count, Reset and Save Changes; nothing while no cell changed. */
    function changesBar(): Element {
      const handleReset = (cx: Context) => {
        st.changed = 0;
        if (st.baseline) st.rows = Array.from(st.baseline.values());
        cx.notify();
      };
      const handleSubmit = (cx: Context) => {
        const saved = st.rows;
        session.setFieldValue(name, "EditableTable", name, fromRows(columnKeys, saved));
        ctx.action("Save Changes", name);
        st.changed = 0;
        st.baseline = baselineOf(saved);
        cx.notify();
      };
      // .openui-editable-table-changes-container: row, gap s, padding s s s m, elevated, radius xl,
      // border default, shadow s. The count is body default; the buttons sit in a row, gap s.
      return shadow(
        div()
          .flex()
          .flex_row()
          .items_center()
          .justify_between()
          .gap(t.spaceS)
          .pt(t.spaceS)
          .pr(t.spaceS)
          .pb(t.spaceS)
          .pl(t.spaceM)
          .bg(t.elevated)
          .rounded(t.radiusXl)
          .border_1()
          .border_color(t.borderDefault),
        t.shadowS,
        t.elevated,
      )
        .child(textStyle(div().text_color(t.textNeutralPrimary), defaultText).child(`${st.changed} changes made`))
        .child(
          div()
            .flex()
            .flex_row()
            .gap(t.spaceS)
            .child(button(ctx, { id: ctx.id("reset"), label: "Reset", variant: "secondary", size: "small", iconLeft: "RotateCcw", onClick: handleReset }))
            .child(button(ctx, { id: ctx.id("save"), label: "Save Changes", variant: "primary", size: "small", iconLeft: "Check", onClick: handleSubmit })),
        );
    }
  },
};
