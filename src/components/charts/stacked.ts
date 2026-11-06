// SingleStackedBarChart: one thin horizontal bar split into segments by share
// of the total, with the compact legend (each entry and its share) below.
//
// Ported from react-ui at the pinned commit:
//   genui-lib/Charts/SingleStackedBarChart.ts (contract; the 1D data preamble,
//   charts/polar.ts `sliceRows`)
//   components/Charts/SegmentedBar/{SegmentedBar.tsx,SingleStackedBar.tsx,segmentedBar.scss},
//   SegmentedBar/parts/segmentedBarGeometry.ts (compiled from the pin),
//   shared/core/ChartShell.tsx, shared/cartesian/chartBase.scss (the centered container),
//   shared/core/DefaultLegend (charts/chrome.ts `legendView`),
//   Separator/separator.scss
//
// genui renders upstream's defaults: the default legend variant (a separator
// and the swatch legend, no toggling), colors by input order from the bar
// palette, no entrance animation. Hovering a segment dims the others to 0.5
// over 200ms and shows a Value / Percentage tooltip above it.
//
// gpui differences: a segment's width is a flex-basis in percent upstream and
// the browser shrinks the row by the gaps and the 2px minimum; the same
// resolution is computed here. Hovering follows the segments' boxes; the
// pointer over a gap between two clears the highlight, as leaving a segment
// does. The tooltip hangs above the segment's top center, flipped below it near
// the window's top edge.
import { v_flex } from "gpui-base";
import { div, type Element } from "gpui-kit";
import { resolvePalette } from "openui-charts/utils/paletteUtils";
import { numberTickFormatter } from "openui-charts/utils/styleUtils";
import { segmentShare, segmentValue } from "openui-charts/SegmentedBar/parts/segmentedBarGeometry";
import type { Component } from "../../render/surface.ts";
import { cssColor, shadow, typography } from "../../render/tokens.ts";
import { chartTooltip, legendStrings, legendView } from "./chrome.ts";
import type { LegendItem } from "./data.ts";
import { hoverState, trackWidth, withHover } from "./hover.ts";
import { Measurer } from "./measure.ts";
import { sliceRows } from "./polar.ts";
import { MIN_SEGMENT, segmentWidths } from "./segments.ts";

const TRACK_HEIGHT = 20;

export const SingleStackedBarChart: Component = {
  render(props, ctx) {
    const rows = sliceRows(props);
    if (!rows) return null;
    const t = ctx.t;
    const size = ctx.local({ width: 0 }, "size");
    const hover = hoverState(ctx);

    // Colors by input order from the bar palette; negative and non-numeric values count 0.
    const ramp = resolvePalette({}, "barChartPalette");
    const values = rows.map((row) => segmentValue(row["value"]));
    const total = values.reduce((sum, v) => sum + v, 0);
    const segments = rows.map((row, i) => {
      const share = segmentShare(values[i] ?? 0, total);
      return {
        key: `${String(row["category"])}-${i}`,
        label: String(row["category"]),
        value: values[i] ?? 0,
        share,
        percentage: share * 100,
        color: cssColor(ramp[i % ramp.length] ?? "#000000") ?? ("#000000ff" as const),
      };
    });

    const pad = t.space2xs;
    const innerHeight = TRACK_HEIGHT - 2 * pad;
    const content = Math.max(0, size.width - 2 * pad);
    const widths = segmentWidths(
      segments.map((s) => s.share),
      content,
      t.space3xs,
    );
    const lefts: number[] = [];
    let cursor = pad;
    for (const w of widths) {
      lefts.push(cursor);
      cursor += w + t.space3xs;
    }

    const active = hover.index !== null && hover.index < segments.length ? hover.index : null;
    const track = withHover(
      div()
        .id(ctx.id("track"))
        .relative()
        .w_full()
        .h(TRACK_HEIGHT)
        .flex_none()
        .overflow_hidden()
        .rounded(t.radiusS)
        .bg(t.background),
      hover,
      (x, y) => {
        if (size.width <= 0 || y < pad || y > pad + innerHeight) return null;
        const found = widths.findIndex((w, i) => x >= lefts[i]! && x <= lefts[i]! + w);
        return found < 0 ? null : found;
      },
      { x: 0, y: 0 },
      false, // the tooltip hangs from the segment, so only a change of segment redraws
    ).children(
      size.width > 0
        ? segments.map((segment, i) => {
            // :first-child rounds the left corners, :last-child the right; one segment is both, and the later rule wins.
            let el = div()
              .id(ctx.id(`segment-${i}`))
              .absolute()
              .left(lefts[i]!)
              .top(pad)
              .w(widths[i]!)
              .h(innerHeight)
              .overflow_hidden()
              .bg(segment.color)
              .opacity(active === null || active === i ? 1 : 0.5)
              .transition("opacity", { duration: 200, easing: "ease-in-out" });
            if (i === segments.length - 1) el = el.rounded_r(t.radiusXs);
            else if (i === 0) el = el.rounded_l(t.radiusXs);
            // The centered 1px accent line inside each segment: 5px in from both sides.
            return shadow(el, t.shadowS).child(
              div()
                .absolute()
                .left(5)
                .top(innerHeight / 2 - 0.5)
                .w(Math.max(widths[i]! - 10, MIN_SEGMENT))
                .h(1)
                .bg(t.borderAccentEmphasis),
            );
          })
        : [],
    );

    // The tooltip hangs from the hovered segment's top center, not from the pointer.
    let tooltip: Element[] = [];
    if (active !== null) {
      const segment = segments[active]!;
      const ax = lefts[active]! + widths[active]! / 2;
      tooltip = [
        chartTooltip(
          ctx,
          {
            label: segment.label,
            items: [
              { name: "Value", value: numberTickFormatter(segment.value), color: segment.color },
              { name: "Percentage", value: `${segment.percentage.toFixed(1)}%`, color: segment.color },
            ],
          },
          { ...hover, x: ax, y: pad, wx: hover.wx - hover.x + ax, wy: hover.wy - hover.y + pad },
          "top",
        ),
      ];
    }

    const legendItems: LegendItem[] = segments.map((s) => ({ key: s.key, label: s.label, color: s.color, percentage: s.percentage }));
    const measurer = new Measurer(ctx, typography(t, "label", "extra-small")).want(legendStrings(legendItems));
    const probes = measurer.probes();
    return trackWidth(v_flex().id(ctx.id()).relative().w_full().items_center().justify_center().gap(t.spaceM), size)
      .child(div().relative().w_full().flex_none().child(shadow(track, t.shadowS)).children(tooltip))
      .child(div().w_full().h(1).flex_none().bg(t.borderDefault))
      .child(legendView(ctx, { items: legendItems, containerWidth: size.width, measurer, flush: true }))
      .children(probes ? [probes] : []);
  },
};
