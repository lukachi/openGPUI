// lucide icons as data. Every icon's SVG markup comes in with the bundle
// (scripts/sync.ts → .upstream/assets/lucide/svgs.json, about 340 KB), and gpui's
// `svg()` draws only files, so a host writes the icons a page draws to files of its
// own, once each: nothing ships one file per icon.
import svgs from "openui-lucide-svgs";

/** Upstream IconWrapper's default size, px. */
export const ICON_SIZE = 14;

/** Stroke widths react-ui gives lucide icons: lucide's 2, and 2.5 where its scss restyles them (Tag's `svg { stroke-width: 2.5 }`). */
export type StrokeWidth = 2 | 2.5;

/** One icon as a host writes it: a file name (without extension) that changes with the content, and the SVG. */
export interface LucideSvg {
  name: string;
  svg: string;
}

/** The host's side: make `svg` a file `svg()` draws, named after `name` (writing it if it isn't there yet); resolves to its path. */
export type IconWriter = (name: string, svg: string) => Promise<string>;

/** The SVG of lucide file `file` at `stroke`, or null when lucide has no such file. */
export function lucideSvg(file: string, stroke: StrokeWidth = 2): LucideSvg | null {
  const inner = svgs[file];
  if (inner == null) return null;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return { name: `${file}-${stroke}-${fnv1a(svg)}`, svg };
}

/** FNV-1a (32 bit) over UTF-16 code units, as 8 hex digits: enough to tell two versions of an icon apart. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
