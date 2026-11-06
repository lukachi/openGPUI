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

// react-ui genui-lib/selectionFieldUtils.ts: normalize, default and toggle a single/multiple selection.
declare module "openui-selection-utils" {
  export type SelectionType = "single" | "multiple";
  export type SelectionDefaultValue = string | string[] | undefined;
  export function normalizeSelection(type: SelectionType, storedValue: unknown, defaultValue: SelectionDefaultValue): string[];
  export function getStoredDefaultValue(type: SelectionType, defaultValue: SelectionDefaultValue): string | string[] | undefined;
  export function toggleSelection(type: SelectionType, selection: string[], itemValue: string): string[];
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

// react-ui components/DatePicker/helpers/utils/helperFn.tsx: the shown value's text.
declare module "openui-datepicker-helpers" {
  export function formatSingleDate(date: Date | undefined): string;
  export function formatDateRange(range: { from?: Date; to?: Date } | undefined): string;
}

// react-ui components/_shared/utils/safeUrl.ts: the trimmed URL, or undefined for a script-capable scheme.
declare module "openui-safe-url" {
  export function safeUrl(url: string | null | undefined): string | undefined;
}
