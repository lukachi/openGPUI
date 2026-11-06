// Types for the upstream genui-lib entry that scripts/upstream-plugin.ts compiles
// without React. Its own sources need React types, so they are not type-checked
// here; what opengpui reads from them is plain lang-core data.
declare module "openui-genui" {
  import type { Library, PromptOptions } from "@openuidev/lang-core";

  export const openuiLibrary: Required<Library>;
  export const openuiPromptOptions: PromptOptions;
  export const openuiChatLibrary: Required<Library>;
  export const openuiChatPromptOptions: PromptOptions;
}

// OpenUI's default design tokens: ThemeProvider/defaultTheme.ts from the pin.
declare module "openui-theme" {
  import type { Theme } from "openui-theme-types";

  export const defaultLightTheme: Theme;
  export const defaultDarkTheme: Theme;
}

// react-ui's lucide resolver (components/_shared/icons) from the pin. Upstream's
// thunks import a React icon; the build's map makes them answer its SVG file name.
declare module "openui-icons" {
  export function getIconImport(iconName: string): (() => unknown) | null;
}

declare module "openui-icon-fallbacks" {
  export function getFallbackIconName(category?: string): string;
}

// react-ui components/_shared/remark/remarkCitations.ts: `[1][2]` → citation spans.
declare module "openui-remark-citations" {
  import type { Root } from "mdast";
  export const remarkCitations: () => (tree: Root) => void;
}

// The Prism themes react-ui's markdown code blocks use (plain style objects).
declare module "react-syntax-highlighter/dist/esm/styles/prism/one-light.js" {
  const style: Record<string, Record<string, string>>;
  export default style;
}
declare module "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus.js" {
  const style: Record<string, Record<string, string>>;
  export default style;
}

// refractor/all's grammars in its registration order, unregistered (scripts/upstream-plugin.ts).
declare module "opengpui-prism-all" {
  import type { Syntax } from "refractor/core";
  export const syntaxes: Syntax[];
}
