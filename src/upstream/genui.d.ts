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
