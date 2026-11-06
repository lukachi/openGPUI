// opengpui: OpenUI Lang rendered with native gpui-kit elements.
//
//   const source = subsetLibrary(libraries.openui, Object.keys(components));
//   const session = new Session({ library: source.library, onAction });
//   const surface = new Surface({ session, components, tokens });
//   // view init:   surface.attach(cx); session.setResponse(text)
//   // view render: surface.renderContent()
//   // view close:  surface.close()
export { components } from "./components/index.ts";
export { button, type ButtonOptions } from "./components/buttons.ts";
export { flex } from "./components/layout.ts";
export { libraries, subsetLibrary, type LibraryName, type LibrarySource } from "./library.ts";
export {
  RenderContext,
  Surface,
  type Component,
  type Components,
  type Props,
  type Rendered,
  type RetainedEntry,
  type RetainedSpec,
} from "./render/surface.ts";
export { alpha, DEFAULT_TOKENS, GAP, resolveTokens, toneColor, type Tokens } from "./render/tokens.ts";
export { parseResponseBundle, type ResponseBundle } from "./runtime/response.ts";
export {
  FormValidation,
  Session,
  unwrapFieldValue,
  type ActionInput,
  type SessionOptions,
  type Tools,
} from "./runtime/session.ts";
