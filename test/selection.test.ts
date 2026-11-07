import { describe, expect, test } from "bun:test";
import { booleanAggregate, libraries, selectionField, Session, toggleBoolean } from "./lib.ts";

function setup(formName: string | null = "f") {
  const session = new Session({ library: libraries.openui.library });
  session.setResponse(`root = Stack([])`);
  session.update();
  const deferred: (() => void)[] = [];
  const ctx = {
    session,
    formName: formName ?? undefined,
    form: formName === null ? null : session.form(formName),
    streaming: false,
    after: (fn: () => void) => void deferred.push(fn),
    watch: <T>(read: () => T) => read(),
  };
  /** Run what a render deferred to the pump, as the surface does. */
  const pump = () => deferred.splice(0).forEach((fn) => fn());
  return { session, ctx: ctx as never as Parameters<typeof selectionField>[0], form: ctx.form, pump };
}

describe("booleanAggregate", () => {
  const items = [{ name: "a" }, { name: "b", defaultChecked: true }, { name: "c", defaultChecked: false }];

  test("stored value beats defaultChecked, which beats false; unknown names are dropped", () => {
    expect(booleanAggregate(items, undefined)).toEqual({ a: false, b: true, c: false });
    expect(booleanAggregate(items, { a: true, b: false, gone: true })).toEqual({ a: true, b: false, c: false });
  });

  test("toggling one item keeps the others' effective values", () => {
    expect(toggleBoolean(items, undefined, "a", true)).toEqual({ a: true, b: true, c: false });
    expect(toggleBoolean(items, { a: true }, "b", false)).toEqual({ a: true, b: false, c: false });
  });
});

describe("selectionField", () => {
  test("a default is written into the form once, as the component's type", () => {
    const { session, ctx, pump } = setup();
    const props = { name: "tools", type: "multiple", defaultValue: ["a", "b"] };
    expect(selectionField(ctx, "Chips", props, "multiple").selected).toEqual(["a", "b"]);
    expect(session.getFieldValue("f", "tools")).toBeUndefined();
    pump();
    expect(session.getFieldValue("f", "tools")).toEqual(["a", "b"]);
    expect(session.store.get("f")).toEqual({ tools: { value: ["a", "b"], componentType: "Chips" } });
  });

  test("multiple toggles in and out; emptying stores [] rather than removing the value", () => {
    const { session, ctx } = setup();
    const props = { name: "tags" };
    selectionField(ctx, "Chips", props, "multiple").toggle("x");
    selectionField(ctx, "Chips", props, "multiple").toggle("y");
    expect(session.getFieldValue("f", "tags")).toEqual(["x", "y"]);
    selectionField(ctx, "Chips", props, "multiple").toggle("x");
    selectionField(ctx, "Chips", props, "multiple").toggle("y");
    expect(session.getFieldValue("f", "tags")).toEqual([]);
  });

  test("single selects one value, switches, and a second click on it clears it", () => {
    const { session, ctx } = setup();
    const props = { name: "pick", type: "single" };
    selectionField(ctx, "Chips", props, "multiple").toggle("a");
    expect(session.getFieldValue("f", "pick")).toBe("a");
    selectionField(ctx, "Chips", props, "multiple").toggle("b");
    expect(session.getFieldValue("f", "pick")).toBe("b");
    selectionField(ctx, "Chips", props, "multiple").toggle("b");
    expect(session.getFieldValue("f", "pick")).toBeUndefined();
  });

  test("two toggles before a redraw both land: the click reads the store, not the render", () => {
    const { session, ctx } = setup();
    const field = selectionField(ctx, "Chips", { name: "tags" }, "multiple");
    field.toggle("x");
    field.toggle("y");
    expect(session.getFieldValue("f", "tags")).toEqual(["x", "y"]);
  });

  test("a stored value wins over the default", () => {
    const { session, ctx, pump } = setup();
    session.setFieldValue("f", "Chips", "tags", ["z"]);
    const props = { name: "tags", defaultValue: ["a"] };
    expect(selectionField(ctx, "Chips", props, "multiple").selected).toEqual(["z"]);
    pump();
    expect(session.getFieldValue("f", "tags")).toEqual(["z"]);
  });

  test("required: an empty selection fails on toggle and on form validation, a default satisfies the form", () => {
    const { ctx, form } = setup();
    const props = { name: "tags", rules: { required: true } };
    const field = selectionField(ctx, "Chips", props, "multiple");
    expect(form!.validateForm()).toBe(false);
    expect(form!.getFieldError("tags")).toBeTruthy();
    field.toggle("x");
    expect(form!.getFieldError("tags")).toBeUndefined();
    selectionField(ctx, "Chips", props, "multiple").toggle("x");
    expect(form!.getFieldError("tags")).toBeTruthy();

    const withDefault = setup();
    const dprops = { name: "tags", rules: { required: true }, defaultValue: "a" };
    selectionField(withDefault.ctx, "Chips", dprops, "multiple");
    withDefault.pump();
    expect(withDefault.form!.validateForm()).toBe(true);
  });

  test("outside a form the value lives under the bare name", () => {
    const { session, ctx } = setup(null);
    selectionField(ctx, "Chips", { name: "solo", rules: { required: true } }, "multiple").toggle("a");
    expect(session.getFieldValue(undefined, "solo")).toEqual(["a"]);
  });
});
