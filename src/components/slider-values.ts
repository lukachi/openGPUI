// The plain-number logic of Slider: no gpui, so tests can run it.
//
// Ported from react-ui at the pinned commit: components/Slider/{Slider.tsx,SliderBlock.tsx}
// (`formatNumber`, the value error rules, the dots, the step rules). Those helpers are not
// exported upstream, so they are copied here value by value.

/**
 * Slider.tsx `formatNumber`: below 1000 `String(n)`, else
 * `Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" })` lowercased.
 * gpui-shell's JS engine has no Intl guarantee, so compact notation is written out:
 * k, m, b, t; two significant digits below 10 of a unit, whole units above, carrying
 * into the next unit when rounding reaches 1000 (999999 is "1m"); beyond t it stays in t.
 */
export function formatNumber(num: number | undefined): string {
  if (num === undefined) return "";
  if (num < 1000) return String(num);
  const suffixes = ["k", "m", "b", "t"];
  let unit = Math.min(Math.floor(Math.log10(num) / 3), 4);
  for (;;) {
    const scale = 10 ** (3 * unit);
    const scaled = num / scale;
    const rounded = scaled < 10 ? Math.round(num / (scale / 10)) / 10 : Math.round(scaled);
    if (rounded >= 1000 && unit < 4) {
      unit++;
      continue;
    }
    return `${rounded}${suffixes[unit - 1]}`;
  }
}

/** SliderBlock `effectiveStep`: a discrete slider keeps its step (default 1); a continuous one never goes below 1. */
export function effectiveStep(discrete: boolean, step: number | undefined): number {
  return discrete ? (step ?? 1) : Math.max(1, step ?? 1);
}

/** SliderBlock's `minError` / `maxError`: what the value inputs report under them. */
export function valueErrors(value: number[], min: number, max: number): { min: string; max: string } {
  const [minValue, maxValue] = value;
  // Global isNaN on purpose: it coerces, so a missing second value reads as "Invalid number" like upstream.
  const check = (v: number) => {
    if (isNaN(v)) return "Invalid number";
    if (v < min || v > max) return `Value must be between ${min} and ${max}`;
    return "";
  };
  const error = { min: check(minValue as number), max: check(maxValue as number) };
  if (value.length > 1 && (minValue as number) > (maxValue as number)) error.min = "Min must be less than max";
  return error;
}

/** ValueInput `onChange`: what a typed text sets, or undefined when it is not a number (`isNaN(Number(text))`). */
export function typedNumber(text: string): number | undefined {
  const n = Number(text);
  return Number.isNaN(n) ? undefined : n;
}

export interface Dot {
  /** `left` of the dot as a share of the track, 0..100. */
  position: number;
  active: boolean;
}

/**
 * The most steps one slider draws as options or dots. Upstream renders a DOM node per step, so a
 * step far below the range never finishes there either; here it must not hold the JS engine.
 */
export const MAX_STEPS = 20_000;

/**
 * `floor((max - min) / step)`, or null when the numbers cannot make a slider: a span or a step that
 * is not a positive finite number (props arrive one by one while streaming), or more than MAX_STEPS.
 */
export function stepCount(min: number, max: number, step: number): number | null {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) return null;
  if (!Number.isFinite(step) || !(step > 0)) return null;
  const count = Math.floor((max - min) / step);
  return count > MAX_STEPS ? null : count;
}

/** Slider.tsx `renderDots` for a discrete slider: one dot per step, lit up to the value (or between the two). */
export function dots(min: number, max: number, step: number, value: number[]): Dot[] {
  const count = stepCount(min, max, step);
  if (count === null) return [];
  const isRange = value.length > 1;
  const current = value[0] ?? min;
  return Array.from({ length: count + 1 }, (_, index) => {
    const v = min + step * index;
    return {
      position: ((v - min) / (max - min)) * 100,
      active: isRange ? v >= (value[0] ?? min) && v <= (value[1] ?? max) : v <= current,
    };
  });
}

/** Radix clamps what it draws to the slider's range; the logical value (and its inputs) keep what was typed. */
export function clampToRange(value: number[], min: number, max: number): number[] {
  return value.map((v) => (Number.isNaN(v) ? min : Math.min(max, Math.max(min, v))));
}

// ── The native slider ──
// gpui-base's SliderState is given the domain 0..(max - min), see slider.ts. These convert between it
// and upstream's values the way Radix's Slider computes the value it reports.

/** Whether a native slider can be made for these numbers (finite, max > min, step > 0). */
export function canUseNative(min: number, max: number, step: number): boolean {
  return Number.isFinite(min) && Number.isFinite(max) && max > min && Number.isFinite(step) && step > 0;
}

/** Radix `getDecimalCount`. */
export function decimalCount(value: number): number {
  return (String(value).split(".")[1] || "").length;
}

/** Radix `roundValue`. */
export function roundValue(value: number, decimals: number): number {
  const rounder = 10 ** decimals;
  return Math.round(value * rounder) / rounder;
}

/** Upstream values as the native state holds them: clamped to the range, shifted to start at 0. */
export function toNative(value: number[], min: number, max: number): number[] {
  return clampToRange(value, min, max).map((v) => v - min);
}

/**
 * What the native state reports as upstream's value: Radix's `roundValue(round((v - min) / step) * step + min,
 * decimals(step))` clamped to the range, so a fractional step gives 0.3 and not 0.30000000000000004.
 */
export function fromNative(raw: number[], min: number, max: number, step: number): number[] {
  const decimals = decimalCount(step);
  return raw.map((s) => Math.min(max, Math.max(min, roundValue(Math.round(s / step) * step + min, decimals))));
}

/** Radix `minStepsBetweenThumbs={1}`: a range whose thumbs are closer than one step is not a value. */
export function hasMinStepBetween(value: number[], step: number): boolean {
  if (value.length < 2) return true;
  // A hair of tolerance: 0.3 - 0.2 is 0.09999999999999998, which is one 0.1 step.
  return value[1]! - value[0]! >= step - 1e-9 * step;
}
