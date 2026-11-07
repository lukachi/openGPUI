// Forms: Form, FormControl, Input, TextArea.
//
// Ported from react-ui at the pinned commit:
//   Form         genui-lib/Form/index.tsx
//   FormControl  genui-lib/FormControl/index.tsx, components/FormControl/{FormControl.tsx,formControl.scss,Hint/*},
//                components/Label/*
//   Input        genui-lib/Input/index.tsx, components/Input/{Input.tsx,input.scss}
//   TextArea     genui-lib/TextArea/index.tsx, components/TextArea/{TextArea.tsx,textArea.scss}
//
// Upstream's FormControl never passes hasError down, so inputs keep their normal
// border on a validation error; only the hint line turns red. That is kept.
import { isElementNode, parseStructuredRules, type ParsedRule } from "@openuidev/lang-core";
import { Input as GInput, InputState, Textarea, TextareaState } from "gpui-base";
import { div, type Element } from "gpui-kit";
import { optional, type Component, type Props, type RenderContext } from "../render/surface.ts";
import { textStyle, typography } from "../render/tokens.ts";

export const Form: Component = {
  render(props, ctx) {
    const name = String(props.name ?? "form");
    // Fields register their rules while rendering, each in the view that draws it; a view
    // that draws again without a field, or goes, drops its registration (Surface), so a field
    // the response removed no longer blocks submission (upstream unregisters on unmount).
    const inner = ctx.child("form", { ...ctx.scope, formName: name });
    // FormRenderer: <div role="form" style="display:flex; flex-direction:column; gap:16px">
    return div()
      .id(ctx.id())
      .flex()
      .flex_col()
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

function isRequired(input: unknown): boolean {
  if (!isElementNode(input)) return false;
  const rules = input.props.rules;
  return !!rules && typeof rules === "object" && "required" in rules && rules.required === true;
}

export const FormControl: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const name = inputName(props.input);
    const error = name ? ctx.form?.getFieldError(name) : undefined;
    // Label: body default, neutral primary; the asterisk sits space-3xs to the right.
    const label = textStyle(div().flex().flex_row().gap(t.space3xs).text_color(t.textNeutralPrimary), typography(t, "body", "default"))
      .child(String(props.label ?? ""))
      .when(isRequired(props.input), (el) => el.child("*"));
    // Hint: body small, secondary; danger primary with a 14px AlertCircle for an error.
    const hint = (text: string, isError: boolean) =>
      textStyle(div().flex().flex_row().items_center().gap(t.spaceXs).text_color(isError ? t.textDangerPrimary : t.textNeutralSecondary), typography(t, "body", "small"))
        .children(isError ? optional(ctx.icon("AlertCircle", { size: 14 })) : [])
        .child(text);
    return div()
      .flex()
      .flex_col()
      .gap(t.spaceS)
      .child(label)
      .children(ctx.children(props.input, "in"))
      .when(!!error, (el) => el.child(hint(String(error), true)))
      .when(!error && !!props.hint, (el) => el.child(hint(String(props.hint), false)));
  },
};

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

/**
 * Shared by Input and TextArea: retained text state bound to a form field or a
 * $variable, with upstream's validation timing (clear on focus and typing,
 * validate on blur when the field has rules).
 */
function textField<S extends TextState>(
  kind: string,
  props: Props,
  ctx: RenderContext,
  makeState: (value: string) => S,
  makeElement: (state: S) => Element,
  frame: (el: Element) => Element,
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
  // $state can change from elsewhere (@Set, @Reset); bring the text along. Asked only when
  // they differ: deferred work wakes the pump, which redraws, so asking on every render
  // kept a page with an input redrawing without end.
  if (state && state.value() !== String(field.value ?? "")) {
    ctx.after(() => {
      const value = String(current(meta).value ?? "");
      if (state.value() !== value) state.set_value(value);
    });
  }
  // Shared look: body default, 1px interactive border, highlight-subtle fill;
  // disabled (while streaming): sunk fill, default border, tertiary text.
  const styled = (el: Element) => {
    const base = textStyle(el.w_full().border_1(), typography(t, "body", "default"));
    return ctx.streaming
      ? frame(base).bg(t.sunk).border_color(t.borderDefault).text_color(t.textNeutralTertiary)
      : frame(base)
          .bg(t.highlightSubtle)
          .border_color(t.borderInteractive)
          .text_color(t.textNeutralPrimary)
          .focus((s) => s.border_color(t.borderInteractiveEmphasis));
  };
  if (!state) {
    const value = String(field.value ?? "");
    return styled(div()).text_color(value ? t.textNeutralPrimary : t.textNeutralSecondary).child(value || String(props.placeholder ?? ""));
  }
  return styled(makeElement(state));
}

export const Input: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const body = typography(t, "body", "default");
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
      // Medium size: radius m, padding (xs - 1) × (m - 1); one body line tall.
      (el) =>
        el
          .rounded(t.radiusM)
          .py(t.spaceXs - 1)
          .px(t.spaceM - 1)
          .h(body.size * body.lineHeight + 2 * (t.spaceXs - 1) + 2),
    );
  },
};

export const TextArea: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const body = typography(t, "body", "default");
    const rows = Number(props.rows) || 3;
    return textField(
      "textarea",
      props,
      ctx,
      (value) => TextareaState.new({ placeholder: String(props.placeholder ?? ""), value, rows }),
      (state) => Textarea.new(state),
      // radius xl, padding s × m; `rows` body lines tall.
      (el) =>
        el
          .rounded(t.radiusXl)
          .py(t.spaceS)
          .px(t.spaceM)
          .h(rows * body.size * body.lineHeight + 2 * t.spaceS + 2),
    );
  },
};
