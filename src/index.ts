// opengpui: OpenUI Lang rendered with native gpui-kit elements.
//
//   const source = subsetLibrary(libraries.openui, Object.keys(components));
//   const session = new Session({ library: source.library, onAction });
//   const surface = new Surface({ session, components, tokens });
//   // view init:   surface.attach(cx); session.setResponse(text)
//   // view render: surface.renderContent()
//   // view close:  surface.close()
export { components } from "./components/index.ts";
export { button, iconButton, type ButtonOptions, type ButtonSize, type ButtonVariant } from "./components/buttons.ts";
export { flexBox } from "./components/layout.ts";
export { libraries, subsetLibrary, type LibraryName, type LibrarySource } from "./library.ts";
export {
  optional,
  RenderContext,
  Surface,
  type Component,
  type Components,
  type Props,
  type Rendered,
  type RetainedEntry,
  type RetainedSpec,
} from "./render/surface.ts";
export { interFace, interFamily, INTER_CUTS, openuiFonts, type Face, type FontResolver } from "./render/fonts.ts";
export { fitImage, fitRect, type FitRect, type ImageLoader, type ImageState, type LoadedImage, type ObjectFit } from "./render/images.ts";
export { readImageHeader, type ImageFormat, type ImageHeader } from "./render/imageHeader.ts";
export {
  alpha,
  resolveTokens,
  shadow,
  textStyle,
  toHex,
  TRANSPARENT,
  typography,
  type ColorKey,
  type Mode,
  type ShadowPreset,
  type TextStyle,
  type Tokens,
} from "./render/tokens.ts";
export { parseResponseBundle, type ResponseBundle } from "./runtime/response.ts";
export {
  FormValidation,
  Session,
  unwrapFieldValue,
  type ActionInput,
  type SessionOptions,
  type Tools,
} from "./runtime/session.ts";
