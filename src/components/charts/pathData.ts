// SVG path data replayed into a path builder, without gpui: upstream draws
// bars with `roundedBarPath` strings and lines/areas with d3-shape strings,
// and gpui paints a `PathBuilder`. Kept free of gpui imports so it runs under
// `bun test` with a recording builder.

/** The PathBuilder methods path data needs (gpui-kit's PathBuilder satisfies it). */
export interface PathSink {
  move_to(x: number, y: number): unknown;
  line_to(x: number, y: number): unknown;
  /** Quadratic: end point, then control point. */
  curve_to(x: number, y: number, cx: number, cy: number): unknown;
  /** Cubic: end point, then both control points. */
  cubic_bezier_to(x: number, y: number, ax: number, ay: number, bx: number, by: number): unknown;
  arc_to(rx: number, ry: number, rotation: number, large: boolean, sweep: boolean, x: number, y: number): unknown;
  close(): unknown;
}

const TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/**
 * Replay SVG path data `d` (every command, absolute and relative, with
 * implicit repeats) into `sink`, offset by (`dx`, `dy`). Malformed data ends
 * the replay at the first command short of arguments; it never loops.
 */
export function svgPath<S extends PathSink>(sink: S, d: string, dx = 0, dy = 0): S {
  const tokens = d.match(TOKEN) ?? [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  // The last control point, for S/T reflection, and which kind made it.
  let ctrlX = 0;
  let ctrlY = 0;
  let ctrlKind: "C" | "Q" | "" = "";
  const isCommand = (t: string) => /^[A-Za-z]$/.test(t);

  while (i < tokens.length) {
    if (isCommand(tokens[i]!)) cmd = tokens[i++]!;
    else if (cmd === "" || cmd.toUpperCase() === "Z") break; // numbers without a command
    const upper = cmd.toUpperCase();
    const count = ARGS[upper]!;
    const args: number[] = [];
    while (args.length < count && i < tokens.length && !isCommand(tokens[i]!)) args.push(Number(tokens[i++]));
    if (args.length < count) break;
    const rel = cmd !== upper;
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    let kind: "C" | "Q" | "" = "";
    switch (upper) {
      case "M":
        x = ox + args[0]!;
        y = oy + args[1]!;
        startX = x;
        startY = y;
        sink.move_to(x + dx, y + dy);
        cmd = rel ? "l" : "L"; // further pairs are line-tos
        break;
      case "L":
        x = ox + args[0]!;
        y = oy + args[1]!;
        sink.line_to(x + dx, y + dy);
        break;
      case "H":
        x = ox + args[0]!;
        sink.line_to(x + dx, y + dy);
        break;
      case "V":
        y = oy + args[0]!;
        sink.line_to(x + dx, y + dy);
        break;
      case "C":
      case "S": {
        let ax: number;
        let ay: number;
        let k = 0;
        if (upper === "C") {
          ax = ox + args[k++]!;
          ay = oy + args[k++]!;
        } else {
          ax = ctrlKind === "C" ? 2 * x - ctrlX : x;
          ay = ctrlKind === "C" ? 2 * y - ctrlY : y;
        }
        const bx = ox + args[k++]!;
        const by = oy + args[k++]!;
        x = ox + args[k++]!;
        y = oy + args[k++]!;
        sink.cubic_bezier_to(x + dx, y + dy, ax + dx, ay + dy, bx + dx, by + dy);
        ctrlX = bx;
        ctrlY = by;
        kind = "C";
        break;
      }
      case "Q":
      case "T": {
        let cx: number;
        let cy: number;
        if (upper === "Q") {
          cx = ox + args[0]!;
          cy = oy + args[1]!;
          x = ox + args[2]!;
          y = oy + args[3]!;
        } else {
          cx = ctrlKind === "Q" ? 2 * x - ctrlX : x;
          cy = ctrlKind === "Q" ? 2 * y - ctrlY : y;
          x = ox + args[0]!;
          y = oy + args[1]!;
        }
        sink.curve_to(x + dx, y + dy, cx + dx, cy + dy);
        ctrlX = cx;
        ctrlY = cy;
        kind = "Q";
        break;
      }
      case "A":
        x = ox + args[5]!;
        y = oy + args[6]!;
        sink.arc_to(args[0]!, args[1]!, args[2]!, args[3] !== 0, args[4] !== 0, x + dx, y + dy);
        break;
      case "Z":
        sink.close();
        x = startX;
        y = startY;
        break;
    }
    ctrlKind = kind;
  }
  return sink;
}
