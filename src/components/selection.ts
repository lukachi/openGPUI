// Selection fields: the value handling Chips (and, in a later slice, OptionCards)
// and the checkbox/switch groups share. No gpui here, so the headless bundle and
// the tests can run it against a Session.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/selectionFieldUtils.ts   compiled as is (`openui-selection-utils`), re-exported below
//   genui-lib/formDefaultValueUtils.ts useHydrateDefaultFieldValue, as `hydrateDefaultFieldValue`
//   genui-lib/Chips/index.tsx          ChipsRenderer's state wiring, as `selectionField`
//   genui-lib/{CheckBoxGroup,SwitchGroup}/index.tsx  the name → checked aggregate, as `booleanAggregate`
//
// What this module offers:
//   normalizeSelection / getStoredDefaultValue / toggleSelection   upstream's pure helpers
//   selectionField(ctx, componentType, props, fallbackType)         a single/multiple selection bound to the
//       form field `props.name`: the selected values, `toggle(value)` (stores, then validates), default
//       hydration and validation registration, as ChipsRenderer and OptionCardsRenderer do (see below)
//   booleanAggregate / toggleBoolean                                the `{ [itemName]: checked }` value of
//       CheckBoxGroup and SwitchGroup
//
// Differences from upstream:
//  - React runs hydration and registration in effects after a render; here `hydrateDefaultFieldValue`
//    runs in the surface pump (`ctx.after`) and registration happens while rendering, as the other
//    field components do.
//  - `toggle` reads the stored value when clicked; upstream toggles the `selection` its last render
//    computed. They differ only when two clicks land before a redraw, where this keeps both.
import { parseStructuredRules } from "@openuidev/lang-core";
import {
  getStoredDefaultValue,
  normalizeSelection,
  toggleSelection,
  type SelectionDefaultValue,
  type SelectionType,
} from "openui-selection-utils";
import type { RenderContext } from "../render/surface.ts";

export { getStoredDefaultValue, normalizeSelection, toggleSelection, type SelectionDefaultValue, type SelectionType };

/** The parts of RenderContext a field needs (and a test can supply). */
export type FieldContext = Pick<RenderContext, "session" | "formName" | "form" | "streaming" | "after">;

/**
 * useHydrateDefaultFieldValue: while the response is complete, a field with no stored
 * value but a default writes the default into form state (not persisted as a user change).
 */
export function hydrateDefaultFieldValue(
  ctx: FieldContext,
  o: { componentType: string; name: string; existingValue: unknown; defaultValue: unknown },
): void {
  if (ctx.streaming || o.existingValue !== undefined || o.defaultValue === undefined) return;
  const { session, formName } = ctx;
  ctx.after(() => {
    // The store may have moved on since the render that asked.
    if (session.blocked || session.getFieldValue(formName, o.name) !== undefined) return;
    session.setFieldValue(formName, o.componentType, o.name, o.defaultValue, false);
  });
}

export interface SelectionField {
  type: SelectionType;
  /** The selected item values: the stored value, else the default. */
  selected: string[];
  /** The form is still streaming: items are disabled and toggling does nothing. */
  disabled: boolean;
  /** Select or deselect `itemValue` as the selection type says, store it and validate. */
  toggle(itemValue: string): void;
}

/**
 * The wiring ChipsRenderer / OptionCardsRenderer give a selection component:
 * `props` is `{ name, type?, rules?, defaultValue? }`.
 *
 * @param componentType  recorded next to the value in form state ("Chips", "OptionCards")
 * @param fallbackType   the type when `props.type` is unset (the schemas' default)
 */
export function selectionField(
  ctx: FieldContext,
  componentType: string,
  props: { name: string; type?: unknown; rules?: unknown; defaultValue?: SelectionDefaultValue },
  fallbackType: SelectionType,
): SelectionField {
  const { session, formName } = ctx;
  const name = props.name;
  const type: SelectionType = (props.type as SelectionType | undefined) ?? fallbackType;
  const rules = parseStructuredRules(props.rules);
  const existingValue = session.getFieldValue(formName, name);
  const selected = normalizeSelection(type, existingValue, props.defaultValue);
  const storedDefaultValue = getStoredDefaultValue(type, props.defaultValue);

  hydrateDefaultFieldValue(ctx, { componentType, name, existingValue, defaultValue: storedDefaultValue });

  const form = ctx.form;
  if (form && rules.length > 0 && !ctx.streaming) {
    form.registerField(name, rules, () => {
      const value = session.getFieldValue(formName, name) ?? storedDefaultValue;
      if (type === "single") return typeof value === "string" && value ? value : undefined;
      return Array.isArray(value) && value.length > 0 ? value : undefined;
    });
  }

  return {
    type,
    selected,
    disabled: ctx.streaming,
    toggle(itemValue) {
      if (ctx.streaming) return;
      // Read the store, not the render's `selected`: two clicks may land before a redraw.
      const current = normalizeSelection(type, session.getFieldValue(formName, name), props.defaultValue);
      const next = toggleSelection(type, current, itemValue);
      const stored = type === "single" ? (next[0] ?? undefined) : next;
      const validated = type === "single" ? (next[0] ?? undefined) : next.length > 0 ? next : undefined;
      session.setFieldValue(formName, componentType, name, stored, true);
      if (rules.length > 0) form?.validateField(name, validated, rules);
    },
  };
}

/**
 * The `{ [item name]: checked }` value of CheckBoxGroup and SwitchGroup: each item's stored
 * boolean, else its `defaultChecked`, else false. Names not among `items` are dropped.
 */
export function booleanAggregate(items: { name: string; defaultChecked?: boolean }[], stored: unknown): Record<string, boolean> {
  const record = stored as Record<string, boolean | undefined> | null | undefined;
  const result: Record<string, boolean> = {};
  for (const item of items) result[item.name] = record?.[item.name] ?? item.defaultChecked ?? false;
  return result;
}

/** The aggregate after item `name` changes to `checked`. */
export function toggleBoolean(
  items: { name: string; defaultChecked?: boolean }[],
  stored: unknown,
  name: string,
  checked: boolean,
): Record<string, boolean> {
  return { ...booleanAggregate(items, stored), [name]: checked };
}
