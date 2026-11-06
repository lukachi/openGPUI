// Forms: Form, FormControl, Input, TextArea.
import { isElementNode, parseStructuredRules, type ParsedRule } from "@openuidev/lang-core";
import { div } from "gpui-kit";
import { Input as GInput, InputState, Textarea, TextareaState, v_flex } from "gpui-base";
import type { Element } from "gpui-kit";
import type { Component, Props, RenderContext } from "../render/surface.ts";

export const Form: Component = {
  render(props, ctx) {
    const name = String(props.name ?? "form");
    // Fields register their rules while rendering; start each pass from none,
    // so a field the response removed no longer blocks submission.
    if (!ctx.streaming) ctx.session.form(name).fields = {};
    const inner = ctx.child("form", { ...ctx.scope, formName: name });
    return v_flex()
      .id(ctx.id())
      .w_full()
      .gap(16)
      .children(inner.children(props.fields, "f"))
      .children(inner.children(props.buttons, "b"));
  },
};

/** The field name an input element edits (`name` may itself be a binding object). */
function inputName(input: unknown): string | undefined {
  if (!isElementNode(input)) return undefined;
  const raw = input.props.name;
  if (typeof raw === "string") return raw;
  return raw && typeof raw === "object" && "name" in raw && typeof raw.name === "string" ? raw.name : undefined;
}

export const FormControl: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const name = inputName(props.input);
    const error = name ? ctx.form?.getFieldError(name) : undefined;
    const required = isElementNode(props.input) && (props.input.props.rules as { required?: boolean } | undefined)?.required === true;
    return v_flex()
      .w_full()
      .gap(6)
      .child(
        div()
          .text_size(13)
          .font_medium()
          .child(`${props.label ?? ""}${required ? " *" : ""}`),
      )
      .children(ctx.children(props.input, "in"))
      .when(!!error, (el) => el.child(div().text_size(12).text_color(t.danger).child(String(error))))
      .when(!error && !!props.hint, (el) => el.child(div().text_size(12).text_color(t.muted).child(String(props.hint))));
  },
};

/**
 * Shared by Input and TextArea: a retained text state bound to a form field or
 * a $variable, with upstream's validation timing (clear on focus and typing,
 * validate on blur).
 */
interface TextState {
  value(): string;
  set_value(next: string): void;
  on(event: "change" | "submit" | "focus" | "blur" | "paste_other", handler: () => void): boolean;
  release(): boolean;
}

interface FieldMeta {
  formName: string | undefined;
  name: string;
  binding: unknown;
  rules: ParsedRule[];
}

function textField<S extends TextState>(
  kind: string,
  props: Props,
  ctx: RenderContext,
  makeState: (value: string) => S,
  makeElement: (state: S) => Element,
  height: number,
): Element {
  const t = ctx.t;
  const session = ctx.session;
  const name = String(props.name ?? "");
  const formName = ctx.formName;
  const field = ctx.field<string>(name, props.value);
  const rules = parseStructuredRules(props.rules);
  const form = ctx.form;
  if (form && rules.length && !ctx.streaming) {
    form.registerField(name, rules, () => session.stateField(formName, name, props.value).value);
  }
  // One text state per thing it edits: the bound $variable, else the form field.
  const key = field.isReactive ? `${kind}:${props.value.target}` : `${kind}:${formName ?? ""}:${name}`;
  const meta: FieldMeta = { formName, name, binding: props.value, rules };
  const current = (m: FieldMeta) => session.stateField<string>(m.formName, m.name, m.binding);
  const state = ctx.retained<S, FieldMeta>(key, {
    kind,
    meta,
    create(entry) {
      const s = makeState(String(field.value ?? ""));
      s.on("change", () => {
        const m = entry.meta;
        current(m).setValue(s.value());
        if (m.rules.length && m.formName !== undefined) session.form(m.formName).clearFieldError(m.name);
      });
      s.on("focus", () => {
        const m = entry.meta;
        if (m.formName !== undefined) session.form(m.formName).clearFieldError(m.name);
      });
      s.on("blur", () => {
        const m = entry.meta;
        if (m.rules.length && m.formName !== undefined) session.form(m.formName).validateField(m.name, s.value(), m.rules);
      });
      return s;
    },
  });
  if (state) {
    // $state can change from elsewhere (@Set, @Reset); bring the text along.
    ctx.after(() => {
      const value = String(current(meta).value ?? "");
      if (state.value() !== value) state.set_value(value);
    });
  }
  const error = form?.getFieldError(name);
  const frame = (el: Element) =>
    el
      .w_full()
      .min_h(height)
      .px(10)
      .rounded(t.radius - 2)
      .border_1()
      .border_color(error ? t.danger : t.input)
      .bg(t.background)
      .text_size(13)
      .when(ctx.streaming, (e) => e.opacity(0.6));
  if (!state) {
    const value = String(field.value ?? "");
    return frame(div().py(8).text_color(value ? t.foreground : t.dim).child(value || String(props.placeholder ?? "")));
  }
  return frame(makeElement(state).h(height));
}

export const Input: Component = {
  render(props, ctx) {
    return textField(
      "input",
      props,
      ctx,
      (value) => {
        const s = InputState.new({ placeholder: String(props.placeholder ?? ""), value });
        if (props.type === "password") s.set_masked(true);
        return s;
      },
      (state) => GInput.new(state),
      34,
    );
  },
};

export const TextArea: Component = {
  render(props, ctx) {
    const rows = Math.max(2, Math.min(20, Number(props.rows) || 4));
    return textField(
      "textarea",
      props,
      ctx,
      (value) => TextareaState.new({ placeholder: String(props.placeholder ?? ""), value, rows }),
      (state) => Textarea.new(state).py(6),
      rows * 20 + 14,
    );
  },
};
