// Slider.
//
// Ported from react-ui at the pinned commit:
//   Slider  genui-lib/Slider/{schema.ts,index.tsx}, components/Slider/{Slider.tsx,SliderBlock.tsx,slider.scss}
//
// The plain-number rules (compact number text, value errors, dots, steps) are
// in slider-values.ts so tests can run them.
//
// What is emitted: the form value is an array, `[n]` or `[low, high]` (a range
// is a defaultValue with two numbers), committed like upstream's SliderBlock:
// 200ms after the last change (lodash debounce, flushed when the slider goes
// away) and on release of a drag (Radix `onValueCommit`).
//
// Where gpui differs from the browser (Radix Slider):
// - The drag, thumbs and keyboard are gpui-base's native Slider. Its indicator
//   spans the track (the container minus its 10px padding), where a thumb's
//   center sits at `share * width` like upstream's, so the thumbs end flush
//   with the container's edges. Radix maps a press over the root width, which
//   is the same box.
// - The fill (`.openui-slider-range`, from the container's left edge to just
//   past the thumb) is drawn here from the live value, not by the shell, so
//   it can reach under the thumb at either end like upstream's -10px / -8px margins. It and
//   the discrete dots follow the thumb one frame late while dragging, and they
//   are drawn once the track's width has been measured (the frame after a new
//   slider appears).
// - The value bubble over a thumb shows while the pointer is over that thumb
//   (not on keyboard focus, and not once the pointer leaves it mid-drag).
// - The thumb's 1px outline is a border (gpui has no outline), so the thumb
//   element is 22px with the 20px handle inside.
// - A disabled slider (while streaming) covers the track with an element that
//   takes the presses (`pointer-events: none` upstream) and dims at 50%.
// - ValueInput's text should be right aligned (`text-align: right`); gpui-base's
//   native Input ignores gpui's text alignment, so it stays left aligned.
// - The native SliderState is given the domain 0..(max - min) and the values
//   shifted by `min`: SliderState.new with min 500 (max 10000) never returned
//   in this host and took the pump down with it (min 0, 1 and 100 are fine; the
//   cause is not known, the shift is what was seen to work). The Slider's own
//   values, inputs and commits are all in upstream's domain, and a value the
//   native slider reports is rounded back to the step's decimals as Radix does.
// - No native slider is made unless max > min and step > 0 are finite: props
//   arrive one by one while streaming (`max` missing reads as 100, `step` as
//   none), and a step of 0 or an absurd step count draws no dots and no options
//   instead of looping. The track then draws without thumbs.
// - Radix rules kept: minStepsBetweenThumbs 1 (a move that brings the thumbs
//   closer than a step is pushed back), `onValueCommit` at the end of a drag
//   only when the value changed, and keyboard steps commit at once.
// - The native thumbs stop at each other, where Radix lets a dragged thumb pass the other and
//   swap places (it sorts the values and follows the pointer's thumb). A thumb the pointer
//   outruns is held one step from the other instead of staying where the last event left it.
// - The value bubble also stays on the thumb being dragged while the pointer is down (Radix
//   shows it for `:focus`, which a press gives the thumb). A thumb takes its own presses, so
//   the handle reports the start of a drag as well as the track.
import { parseStructuredRules, type ParsedRule } from "@openuidev/lang-core";
import {
  Input as GInput,
  InputState,
  Slider as GSlider,
  SliderIndicator,
  SliderState,
  SliderThumb,
  SliderTrack,
} from "gpui-base";
import { div, type Context, type Element, type Task } from "gpui-kit";
import { optional, type Component, type RenderContext } from "../render/surface.ts";
import { over, shadow, textStyle, typography } from "../render/tokens.ts";
import { selectControl } from "./select.ts";
import {
  canUseNative,
  clampToRange,
  dots,
  effectiveStep,
  formatNumber,
  fromNative,
  hasMinStepBetween,
  holdApart,
  stepCount,
  toNative,
  typedNumber,
  valueErrors,
} from "./slider-values.ts";

/** Debounce of SliderBlock's `onValueCommit`. */
const COMMIT_DELAY_MS = 200;

interface Native {
  slider: SliderState;
  release(): void;
}

interface Inputs {
  inputs: InputState[];
  release(): void;
}

/** SliderBlock's React state, and what its effects and the debounce hold. */
interface Ui {
  /** `useState(defaultValue ?? [min])`: what the inputs and errors show (may be out of range). */
  value: number[];
  /** `[defaultValue, min]` as the last effect saw them. */
  seen: string;
  /** The current range, for handlers made once. */
  min: number;
  max: number;
  /** What the native slider is drawn at, in upstream's values, so render can tell when to push. */
  nativeValue: number[];
  /** What the native slider was last given or reported, in its own domain. */
  pushed: number[];
  /** Inside our own `set_value` on it. */
  pushing: boolean;
  /** A pointer press on the slider is in progress, and the value it began at. */
  dragging: boolean;
  dragStart: number[] | null;
  /** Index of the thumb the drag last moved: it keeps its value bubble while the pointer is down. */
  dragThumb: number;
  /** What each input was last given or reported. */
  texts: string[];
  focused: boolean[];
  /** Index of the thumb under the pointer, or -1. */
  hover: number;
  /** The track's width, measured. */
  trackWidth: number;
  pending: number[] | null;
  timer: Task | null;
  /** `onValueCommitRef.current`: the latest commit, for the timer and the flush. */
  commit: (value: number[]) => void;
  /** Set the value inputs to the current value now (a native change is not a store write, so no render follows at once). */
  pushTexts: () => void;
  /** Redraw this slider's view (RenderContext.waker): a native change is not a store write, so nothing else would. */
  wake: () => void;
}

const sameNumbers = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

const toArray = (v: number | [number, number]): number[] => (typeof v === "number" ? [v] : [...v]);

/** The debounced commit: restarts on every call, fires 200ms after the last. */
function setValueAndCommit(ui: Ui, value: number[], cx: Context): void {
  ui.value = value;
  ui.pushTexts();
  ui.pending = value;
  ui.timer?.cancel();
  ui.timer = cx.timer.after(COMMIT_DELAY_MS, () => flush(ui));
  cx.notify();
  ui.wake();
}

/** Set the native slider from here; its `change` echo is not a drag (it arrives inside the call, or matches `pushed`). */
function pushNative(ui: Ui, slider: SliderState, native: number[]): void {
  ui.pushing = true;
  ui.pushed = native;
  try {
    slider.set_value(native.length > 1 ? [native[0]!, native[1]!] : native[0]!);
  } finally {
    ui.pushing = false;
  }
}

/** lodash `debounced.flush()`: run the pending commit now. */
function flush(ui: Ui): void {
  ui.timer?.cancel();
  ui.timer = null;
  const value = ui.pending;
  ui.pending = null;
  if (value) ui.commit(value);
}

interface SliderBlock {
  ctx: RenderContext;
  label: string;
  variant: "continuous" | "discrete";
  min: number;
  max: number;
  step: number | undefined;
  defaultValue: number[] | undefined;
  /** Both `onValueCommit` paths: the debounce and the end of a drag. */
  onCommit(value: number[]): void;
  /** Disabled while streaming, which also hides the value controls. */
  streaming: boolean;
}

/** components/Slider SliderBlock: label, value controls, and the Slider. */
function sliderBlock(o: SliderBlock): Element {
  const { ctx, min, max } = o;
  const t = ctx.t;
  const streaming = o.streaming;
  const discrete = o.variant === "discrete";
  const step = effectiveStep(discrete, o.step);

  const seen = JSON.stringify([o.defaultValue ?? null, min]);
  const ui = ctx.local<Ui>(
    {
      value: o.defaultValue ? [...o.defaultValue] : [min],
      seen,
      min,
      max,
      nativeValue: [],
      pushed: [],
      pushing: false,
      dragging: false,
      dragStart: null,
      dragThumb: -1,
      texts: [],
      focused: [false, false],
      hover: -1,
      trackWidth: 0,
      pending: null,
      timer: null,
      commit: o.onCommit,
      wake: () => {},
      pushTexts: () => {},
    },
    "slider",
  );
  ui.commit = o.onCommit;
  ui.wake = ctx.waker();
  ui.min = min;
  ui.max = max;
  // useEffect(() => setValue(defaultValue ?? [min]), [defaultValue, min])
  if (ui.seen !== seen) {
    ui.seen = seen;
    ui.value = o.defaultValue ? [...o.defaultValue] : [min];
  }
  const value = ui.value;
  const isRange = value.length > 1;
  const shownValue = clampToRange(value, min, max);

  // The native slider needs a real span and step. While props stream in, `max` and `step` can be missing
  // (the defaults then give max < min, or no step), so nothing native is made until they are usable.
  const native = canUseNative(min, max, step)
    ? ctx.retained<Native, object>(`slider:${ctx.id()}:${isRange}:${min}:${max}:${step}`, {
        kind: "slider",
        meta: {},
        create() {
          const start = toNative(value, min, max);
          const slider = SliderState.new({ min: 0, max: max - min, step, value: isRange ? [start[0]!, start[1]!] : start[0]! });
          ui.nativeValue = shownValue;
          ui.pushed = start;
          slider.on("change", (v, cx) => {
            // What we set ourselves (a typed value) echoes back: not a drag.
            if (ui.pushing) return;
            let raw = toArray(v);
            if (sameNumbers(raw, ui.pushed)) return;
            if (ui.dragging) ui.dragThumb = raw.findIndex((n, i) => n !== ui.pushed[i]);
            let next = fromNative(raw, min, max, step).sort((a, b) => a - b);
            // Radix minStepsBetweenThumbs={1}: a move that brings the thumbs closer than a step is refused,
            // which for a pointer that arrives in one jump leaves the thumb wherever the last event was.
            // The native thumbs stop at each other, so the moved thumb is held one step short instead.
            if (!hasMinStepBetween(next, step)) {
              const held = holdApart(raw, ui.pushed, step, max - min);
              if (!held || sameNumbers(held, ui.pushed)) {
                pushNative(ui, slider, ui.pushed);
                return;
              }
              raw = held;
              next = fromNative(raw, min, max, step).sort((a, b) => a - b);
              pushNative(ui, slider, raw);
            }
            ui.pushed = raw;
            ui.nativeValue = next;
            setValueAndCommit(ui, next, cx);
            // Radix `updateValues(..., { commit: true })`: a keyboard step commits at once.
            if (!ui.dragging) ui.commit(next);
          });
          // Radix handleSlideEnd: commit when the drag ended on another value than it started.
          slider.on("release", (v, cx) => {
            const before = ui.dragStart;
            ui.dragging = false;
            ui.dragStart = null;
            ui.dragThumb = -1;
            const next = fromNative(toArray(v), min, max, step).sort((a, b) => a - b);
            if (before && String(next) !== String(before)) ui.commit(next);
            cx.notify();
            ui.wake();
          });
          return {
            slider,
            release() {
              flush(ui);
              slider.release();
            },
          };
        },
      })
    : null;

  // ValueInput's text states: one per value of a continuous slider.
  const inputs = discrete
    ? null
    : ctx.retained<Inputs, object>(`slider-inputs:${ctx.id()}:${isRange}`, {
        kind: "slider-inputs",
        meta: {},
        create() {
          const states: InputState[] = [];
          for (let i = 0; i < (isRange ? 2 : 1); i++) {
            const input = InputState.new({ value: String(ui.value[i] ?? (i === 0 ? ui.min : ui.max)) });
            ui.texts[i] = input.value();
            input.on("change", (_e, cx) => {
              ui.texts[i] = input.value();
              const n = typedNumber(input.value());
              if (n === undefined || n === ui.value[i]) return;
              const [low, high] = ui.value;
              setValueAndCommit(ui, i === 0 ? (isRange ? [n, high ?? ui.max] : [n]) : [low ?? ui.min, n], cx);
            });
            input.on("focus", () => {
              ui.focused[i] = true;
            });
            input.on("blur", (_e, cx) => {
              ui.focused[i] = false;
              cx.notify();
            });
            states.push(input);
          }
          return {
            inputs: states,
            release() {
              for (const input of states) input.release();
            },
          };
        },
      });
  // A drag moves the value inputs in the same frame as the fill, not a pump tick later.
  ui.pushTexts = () =>
    inputs?.inputs.forEach((input, i) => {
      const text = String(ui.value[i]);
      if (ui.focused[i] || ui.texts[i] === text) return;
      ui.texts[i] = text;
      input.set_value(text);
    });

  // Typed or chosen values move the thumb; the inputs follow the value unless being typed in.
  const texts = value.map((v) => String(v));
  const thumbStale = native !== null && !sameNumbers(ui.nativeValue, shownValue);
  const textStale = !streaming && inputs !== null && inputs.inputs.some((_, i) => !ui.focused[i] && ui.texts[i] !== texts[i]);
  if (thumbStale || textStale) {
    ctx.after(() => {
      if (native && !sameNumbers(ui.nativeValue, shownValue)) {
        ui.nativeValue = shownValue;
        pushNative(ui, native.slider, toNative(value, min, max));
      }
      inputs?.inputs.forEach((input, i) => {
        if (ui.focused[i] || ui.texts[i] === texts[i]) return;
        ui.texts[i] = texts[i]!;
        input.set_value(texts[i]!);
      });
    });
  }

  // ── Value controls ──
  const errors = valueErrors(value, min, max);
  const hasError = !streaming && !discrete && (isRange ? Boolean(errors.min || errors.max) : Boolean(errors.min));

  const errorMessage = (text: string) =>
    textStyle(div().flex().flex_row().items_center().gap(t.space2xs).whitespace_nowrap().pr(t.space2xs).text_color(t.textDangerPrimary), typography(t, "label", "small"))
      .children(optional(ctx.icon("AlertCircle", { size: 14 })))
      .child(text);

  const separator = () => div().w(8).h(2).flex_none().bg(t.textNeutralSecondary);

  // ValueInput: a text Input, 36px tall, text right aligned, a danger border for its error.
  const valueInput = (i: number, error: string, width: number): Element => {
    const frame = (el: Element) =>
      textStyle(
        el
          .w(width)
          .h(36)
          .border_1()
          .rounded(t.radiusM)
          .py(t.spaceXs - 1)
          .px(t.spaceS)
          .text_right()
          .whitespace_nowrap()
          .overflow_hidden()
          .bg(t.highlightSubtle)
          .border_color(error ? t.borderDangerEmphasis : t.borderInteractive)
          .text_color(t.textNeutralPrimary),
        typography(t, "body", "default"),
      );
    const state = inputs?.inputs[i];
    if (!state) return frame(div()).child(String(value[i] ?? (i === 0 ? min : max)));
    return frame(GInput.new(state)).focus((s) => s.border_color(error ? t.borderDangerEmphasis : t.borderInteractiveEmphasis));
  };

  const optionsFor = (keep: (o: number) => boolean) => {
    const count = stepCount(min, max, step);
    const out: { value: string; label: string }[] = [];
    if (count === null) return out;
    for (let i = 0; i <= count; i++) {
      const o = min + i * step;
      if (keep(o)) out.push({ value: String(o), label: String(o) });
    }
    return out;
  };

  let controls: Element | null = null;
  if (!streaming) {
    const column = () => div().flex().flex_col().items_end().gap(t.spaceXs).relative();
    if (discrete) {
      const [low, high] = value;
      const pick = (part: string, current: number | undefined, items: { value: string; label: string }[], width: number, change: (n: number) => number[]) =>
        selectControl({
          ctx,
          part,
          value: String(current),
          items,
          width,
          height: 36,
          onChange: (v, cx) => setValueAndCommit(ui, change(Number(v)), cx),
        });
      controls = isRange
        ? column().child(
            div()
              .flex()
              .flex_row()
              .items_center()
              .gap(t.spaceXs)
              .child(pick("low", low, optionsFor((o) => o < (high ?? max)), 80, (n) => [n, high ?? max].sort((a, b) => a - b)))
              .child(separator())
              .child(pick("high", high, optionsFor((o) => o > (low ?? min)), 80, (n) => [low ?? min, n].sort((a, b) => a - b))),
          )
        : column().child(pick("single", low, optionsFor(() => true), 100, (n) => [n]));
    } else if (isRange) {
      const error = errors.min || errors.max;
      controls = column()
        .child(div().flex().flex_row().items_center().gap(t.spaceXs).child(valueInput(0, errors.min, 64)).child(separator()).child(valueInput(1, errors.max, 64)))
        .when(!!error, (el) => el.child(errorMessage(error)));
    } else {
      controls = column().child(valueInput(0, errors.min, 80)).when(!!errors.min, (el) => el.child(errorMessage(errors.min)));
    }
  }

  const header = div()
    .flex()
    .flex_row()
    .justify_between()
    .when(hasError, (el) => el.items_start().mb(t.spaceS))
    .when(!hasError, (el) => el.items_center().mb(t.spaceS + t.spaceXs))
    .child(textStyle(div().pt(t.spaceXs).text_color(t.textNeutralPrimary), typography(t, "label", "default")).child(o.label))
    .children(optional(controls));

  return div()
    .id(ctx.id())
    .flex()
    .flex_col()
    .w_full()
    .child(header)
    .child(div().flex().flex_row().items_center().child(slider(ctx, ui, native, { variant: streaming ? "continuous" : o.variant, min, max, step, streaming, shownValue })));
}

interface SliderView {
  variant: "continuous" | "discrete";
  min: number;
  max: number;
  step: number;
  streaming: boolean;
  /** The value as drawn: clamped to the range, like Radix. */
  shownValue: number[];
}

/** components/Slider Slider: the container with its track, fill, dots, thumbs, and the min/max labels. */
function slider(ctx: RenderContext, ui: Ui, native: Native | null, v: SliderView): Element {
  const t = ctx.t;
  const { min, max } = v;
  const dim = <E extends Element>(el: E): E => (v.streaming ? (el.opacity(0.5) as E) : el);
  const isRange = v.shownValue.length > 1;
  const span = max - min;
  const share = (n: number) => (span > 0 ? (n - min) / span : 0);
  // The track is the container's content box: the container pads 10px each side.
  const track = Math.max(0, ui.trackWidth - 20);

  // `.openui-slider-range`: from the container's left edge (margin-left -10) to 8px past the
  // right end of the filled part (margin-right -8); transparent for a single slider at its minimum.
  const [low, high] = isRange ? [v.shownValue[0]!, v.shownValue[1]!] : [min, v.shownValue[0]!];
  const fillLeft = isRange ? 10 + share(low) * track - 10 : 0;
  const fillRight = 10 + share(high) * track + 8;
  const fillHidden = !isRange && high === min;
  const fill = dim(
    div()
      .absolute()
      .top(0)
      .left(fillLeft)
      .w(Math.max(0, fillRight - fillLeft))
      .h(10)
      .rounded(t.radiusS)
      .bg(fillHidden || track === 0 || !(span > 0) ? "#00000000" : t.interactiveAccentDefault),
  );

  // `.openui-slider-dots-dot`: 4px, centered on `share * track`, the thumb's own center.
  const dotLayer =
    v.variant === "discrete" && track > 0
      ? dots(min, max, v.step, v.shownValue).map((d) =>
          dim(
            div()
              .absolute()
              .top(3)
              .left(10 + (d.position / 100) * track - 2)
              .size(4)
              .rounded(t.radiusFull)
              .bg(d.active ? t.foreground : t.textNeutralTertiary),
          ),
        )
      : [];

  // Radix valuesBeforeSlideStart: a release commits only if the value changed since this press. A press
  // on the track reaches the container; the thumb takes its own presses, so its handle reports them too.
  const startPress = () => {
    ui.dragging = true;
    ui.dragStart = [...ui.value];
  };

  const thumb = (i: number): Element => {
    const state = native!.slider;
    // The handle: 20px, radius s, a 1px border-default outline outside it, shadow-s, an accent dot.
    const handle = shadow(
      div()
        .size(20)
        .rounded(t.radiusS)
        .overflow_hidden()
        .flex()
        .items_center()
        .justify_center()
        .bg(t.foreground)
        // .openui-slider-thumb-inner turns sunk on hover over the outer thumb's foreground: opaque, the shadow stays.
        .hover((s) => s.bg(over(t.sunk, t.foreground)))
        .on_mouse_down("left", startPress)
        // Thumbs may not deliver hover themselves; the plain handle inside does.
        .on_hover((hovered, cx) => {
          const next = hovered ? i : ui.hover === i ? -1 : ui.hover;
          if (next !== ui.hover) {
            ui.hover = next;
            cx.notify();
          }
        }),
      t.shadowS,
      t.foreground,
    ).child(div().size(6).rounded(t.radius3xs).bg(t.interactiveAccentDefault));
    // `.openui-slider-thumb-value`: label small, 4px padding, a border-interactive outline, 35px above.
    const bubble = shadow(
      textStyle(
        div().p(t.space2xs).rounded(t.radiusS).border_1().border_color(t.borderInteractive).bg(t.foreground).text_color(t.textNeutralPrimary).whitespace_nowrap(),
        typography(t, "label", "small"),
      ),
      t.shadowS,
      t.foreground,
    ).child(formatNumber(v.shownValue[i]));
    const el = SliderThumb.new(state)
      .id(ctx.id(`thumb${i}`))
      .size(22)
      .ml(-11)
      .rounded(t.radiusS + 1)
      .border_1()
      .border_color(t.borderDefault)
      .flex()
      .items_center()
      .justify_center()
      .child(handle)
      .when(!v.streaming && (ui.hover === i || (ui.dragging && ui.dragThumb === i)), (e) =>
        e.child(div().absolute().top(-35).left(-1).w(22).flex().flex_row().justify_center().child(bubble)),
      );
    return isRange && i === 0 ? el.start(true) : el;
  };

  const travel = native
    ? dim(
        GSlider.new(native.slider)
          .flex()
          .flex_row()
          .items_center()
          .w_full()
          .h(20)
          .min_w(100)
          .child(
            SliderTrack.new(native.slider)
              .flex()
              .flex_row()
              .items_center()
              .w_full()
              .h(20)
              // The groove: records the track the thumbs move along; the fill is drawn above.
              .child(
                SliderIndicator.new(native.slider)
                  .relative()
                  .flex_1()
                  .h(22)
                  .child(thumb(0))
                  .when(isRange, (e) => e.child(thumb(1))),
              ),
          ),
      )
    : div().w_full().h(20);

  const container = div()
    .relative()
    .flex()
    .flex_row()
    .items_center()
    .w_full()
    .h(10)
    .px(10)
    .bg(t.sunk)
    .rounded(t.radiusS)
    .on_mouse_down("left", startPress)
    .on_size_change((size, cx) => {
      if (Math.abs(size.width - ui.trackWidth) > 0.5) {
        ui.trackWidth = size.width;
        cx.notify();
      }
    })
    .child(fill)
    .children(dotLayer)
    .child(travel)
    // Disabled: `pointer-events: none`, here an element that takes the presses.
    .when(v.streaming, (e) => e.child(div().absolute().inset_0().on_mouse_down("left", (_e, cx) => cx.stop_propagation())));

  // `.openui-slider-labels`: min and max, label small, secondary, 8px below, 4px in.
  const labels = textStyle(
    div().flex().flex_row().justify_between().mt(t.spaceS).px(t.space2xs).text_color(t.textNeutralSecondary),
    typography(t, "label", "small"),
  )
    .child(formatNumber(min))
    .child(formatNumber(max));

  return div().flex().flex_row().items_center().gap(t.spaceS).w_full().child(div().w_full().child(container).child(labels));
}

/** genui Slider: `name`, `variant`, `min`, `max`, `step`, `defaultValue`, `label`, `rules`, `value`. */
export const Slider: Component = {
  render(props, ctx) {
    const name = String(props.name ?? "");
    const field = ctx.field<number[] | undefined>(name, props.value);
    const rules: ParsedRule[] = parseStructuredRules(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming) {
      const formName = ctx.formName;
      form.registerField(name, rules, () => ctx.session.stateField<number[] | undefined>(formName, name, props.value).value);
    }
    const value = field.value ?? (props.defaultValue as number[] | undefined);
    return sliderBlock({
      ctx,
      label: (props.label as string) || name,
      variant: (props.variant as "continuous" | "discrete") || "continuous",
      min: (props.min as number | undefined) ?? 0,
      max: (props.max as number | undefined) ?? 100,
      step: props.step as number | undefined,
      defaultValue: value != null ? value : undefined,
      onCommit(vals) {
        field.setValue(vals);
        if (rules.length && form) form.validateField(name, vals[0], rules);
      },
      streaming: ctx.streaming,
    });
  },
};
