// Tests run the built headless bundle: lang-core and the upstream libraries are
// compiled from the pinned checkout by the build's plugin, which Bun's runtime
// cannot apply to bare imports. Types come from the sources it was built from.
// @ts-expect-error built JavaScript ships no declarations; typed as src/headless.ts below
import * as built from "../dist/opengpui-headless.js";
import type * as headless from "../src/headless.ts";

export const { Session, libraries, subsetLibrary, resolveTokens, toHex, cssColor, typography, interFace, openuiFonts, parseMarkdown, dateLogic } =
  built as typeof headless;
export type Session = InstanceType<typeof headless.Session>;
