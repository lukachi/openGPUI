// EditableTable's rows, values and layout, without gpui: the renderer draws
// them (editable-table.ts) and the tests run them from the headless bundle.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/EditableTable/index.tsx      toRows, fromRows, the baseline, calculateChangedCellCount
//   components/EditableTable/EditableTable.tsx
//                                          updateData, handleNavigate, the column sizes (`col.width || 120`),
//                                          and the browser's automatic table layout its markup gets
//   components/EditableTable/base/components/{TextBaseEditableCell,EditableNumberCell,EditableDateCell}.tsx
//                                          toDisplayString, the number cell's parseOnSave, toDate
//
// One guard upstream lacks: a row whose `values` is not an array (a row still
// streaming in) reads as empty instead of throwing.

export type EditableCellType = "text" | "number" | "date-single" | "select" | "url";

export interface EditableColumn {
  type?: EditableCellType;
  key: string;
  header: string;
  width?: number;
  options?: { value: string; label: string }[];
}

/** What the agent writes and the form value holds: values ordered like the columns. */
export interface EditableDataRow {
  id: string;
  values: unknown[];
}

/** What the grid edits: the row's values under their column keys. */
export interface EditableRow {
  id: string;
  [key: string]: unknown;
}

export type NavigateDirection = "up" | "down" | "left" | "right";

export interface CellPosition {
  row: number;
  column: string;
}

/** `size: col.width || 120`. */
export const DEFAULT_COLUMN_WIDTH = 120;

export const columnSize = (column: { width?: number }): number => column.width || DEFAULT_COLUMN_WIDTH;

/** Positional `values` (LLM-friendly) → keyed row objects for the grid. */
export function toRows(columnKeys: string[], data: EditableDataRow[]): EditableRow[] {
  return data.map((row) => {
    const values = Array.isArray(row.values) ? row.values : [];
    const valuesMap: Record<string, unknown> = {};
    columnKeys.forEach((key, index) => {
      valuesMap[key] = values[index];
    });
    return { ...valuesMap, id: row.id };
  });
}

/** Keyed rows → the positional form value `Save Changes` stores. */
export function fromRows(columnKeys: string[], rows: EditableRow[]): EditableDataRow[] {
  return rows.map((row) => ({ id: row.id, values: columnKeys.map((key) => row[key]) }));
}

/** The rows edits are counted against, by id. */
export function baselineOf(rows: EditableRow[]): Map<string, EditableRow> {
  return new Map(rows.map((row) => [row.id, row]));
}

/** calculateChangedCellCount: cells of baseline rows whose value is no longer identical; 0 without a baseline. */
export function changedCellCount(
  columnKeys: string[],
  rows: EditableRow[],
  baseline: Map<string, EditableRow> | undefined,
): number {
  if (!baseline) return 0;
  let count = 0;
  const changedMap = new Map(rows.map(({ id, ...values }) => [id, values as Record<string, unknown>]));
  baseline.forEach((baseValues, id) => {
    const changedValues = changedMap.get(id);
    if (!changedValues) return;
    for (const key of columnKeys) {
      if (changedValues[key] !== baseValues[key]) count++;
    }
  });
  return count;
}

/** updateData: a copy of `rows` with one cell replaced; null when the row is gone. */
export function updateData(rows: EditableRow[], rowIndex: number, columnId: string, value: unknown): EditableRow[] | null {
  const oldRow = rows[rowIndex];
  if (!oldRow) return null;
  const next = [...rows];
  next[rowIndex] = { ...oldRow, [columnId]: value };
  return next;
}

/** handleNavigate: one step, clamped to the grid. */
export function navigate(
  position: CellPosition,
  direction: NavigateDirection,
  columns: { key: string }[],
  rowCount: number,
): CellPosition {
  const { row, column } = position;
  const columnIndex = columns.findIndex((col) => col.key === column);
  let newRow = row;
  let newColumnIndex = columnIndex;
  switch (direction) {
    case "up":
      newRow = Math.max(0, row - 1);
      break;
    case "down":
      newRow = Math.min(rowCount - 1, row + 1);
      break;
    case "left":
      newColumnIndex = Math.max(0, columnIndex - 1);
      break;
    case "right":
      newColumnIndex = Math.min(columns.length - 1, columnIndex + 1);
      break;
  }
  return { row: newRow, column: columns[newColumnIndex]?.key || column };
}

/** What a text, number or url cell shows and starts editing from. */
export const toDisplayString = (value: unknown): string => (value === undefined || value === null ? "" : String(value));

/** EditableNumberCell's parseOnSave: a finite float, else 0. */
export function parseNumber(raw: string): number {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** EditableDateCell: table cells store dates as ISO strings; parse them back for the picker. */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Column widths as a browser lays out upstream's `<table>`: each column has a
 * minimum (its widest unbreakable content, padding included) and a maximum
 * (`max(min, th width)`). At `width: 100%` a table between the two sums shares
 * the room above the minimums in proportion to each column's give; a wider
 * container stretches the maximums in proportion. A container narrower than
 * the minimums makes the table scrollable, and it switches to
 * `width: max-content`: every column at its maximum. Once scrollable
 * (`wasScrollable`), it measures that max-content table, so it stays scrollable
 * until the container holds the maximums.
 */
export function columnLayout(
  min: number[],
  max: number[],
  viewport: number,
  wasScrollable = false,
): { widths: number[]; scrollable: boolean } {
  const maxes = max.map((m, i) => Math.max(m, min[i] ?? 0));
  const sumMin = min.reduce((a, b) => a + b, 0);
  const sumMax = maxes.reduce((a, b) => a + b, 0);
  if (sumMin > viewport || (wasScrollable && sumMax > viewport)) return { widths: maxes, scrollable: true };
  if (sumMax >= viewport) {
    const room = sumMax - sumMin;
    const share = room > 0 ? (viewport - sumMin) / room : 0;
    return { widths: min.map((m, i) => m + (maxes[i]! - m) * share), scrollable: false };
  }
  if (sumMax === 0) return { widths: maxes, scrollable: false };
  return { widths: maxes.map((m) => m + ((viewport - sumMax) * m) / sumMax), scrollable: false };
}
