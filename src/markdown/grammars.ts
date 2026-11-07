// refractor with refractor/all's grammars, and how far registering them has come
// (markdown/code.ts registers them in the background). Under Herdr, every tab of the
// mod is a load of its own in one engine; scripts/build.ts loads this module once per
// engine for all of them, so the grammars are registered once and every load's
// sessions continue the same count.
import { syntaxes } from "opengpui-prism-all";
import { refractor } from "refractor/core";

export const grammars = {
  refractor,
  syntaxes,
  /** How many of `syntaxes`, in order, are registered (or skipped). */
  registered: 0,
  /** The grammar the last registration started on: if a task starts there again, that one was killed. */
  attempted: -1,
};
