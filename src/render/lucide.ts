// How lucide's SVGs are laid out for a host. Pure data: the build scripts import it.
//
// Lucide draws at stroke-width 2. react-ui restyles some icons in scss (Tag's
// `svg { stroke-width: 2.5 }`); gpui draws an SVG file as it is, so a host
// ships one set per width react-ui uses, the default set at the top.

/** Upstream IconWrapper's default size, px. */
export const ICON_SIZE = 14;

/** Stroke widths react-ui gives lucide icons. */
export const LUCIDE_STROKE_WIDTHS = [2, 2.5] as const;
export type StrokeWidth = (typeof LUCIDE_STROKE_WIDTHS)[number];

/** An icon's path under the host's icon folder, without extension: `circle`, `stroke-2.5/circle`. */
export function lucideFile(file: string, stroke: StrokeWidth = 2): string {
  return stroke === 2 ? file : `stroke-${stroke}/${file}`;
}

/** Where a host keeps lucide's SVGs: `lucideFile(...)` → path for `svg()`. */
export type IconPath = (file: string) => string;
