// Number.prototype.toLocaleString() for gpui-shell, whose engine has no locale data:
// there it returns the bare digits ("4400"). A browser in en-US groups thousands and
// keeps up to three fraction digits ("4,400", "1,234.568"), which is what react-ui's
// chart tooltips show. Only the no-argument call is replaced; the value is a finite
// number below 1e21 wherever upstream calls it.
export function ogpuiLocaleNumber(value: number): string {
  if (Number.isNaN(value)) return "NaN";
  if (!Number.isFinite(value)) return value < 0 ? "-∞" : "∞";
  const fixed = Math.abs(value).toFixed(3);
  const dot = fixed.indexOf(".");
  const whole = fixed.slice(0, dot).replace(/\B(?=(\d{3})+$)/g, ",");
  const fraction = fixed.slice(dot + 1).replace(/0+$/, "");
  const sign = value < 0 && (whole !== "0" || fraction !== "") ? "-" : "";
  return sign + whole + (fraction ? "." + fraction : "");
}
