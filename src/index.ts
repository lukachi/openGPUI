// opengpui: OpenUI Lang rendered with native gpui-kit elements.
//
//   const source = subsetLibrary(libraries.openui, Object.keys(components));
//   const session = new Session({ library: source.library, onAction });
//   const surface = new Surface({ session, components, tokens, icons, images });
//   // icons:  lucide file → asset path (render/lucide.ts); omitted, no icons
//   // images: src → Promise<{ path, width, height }> (render/images.ts); omitted, images fail
//   // view init:   surface.attach(cx); session.setResponse(text)
//   // view render: content = surface.renderContent() (the root's view), then
//   //              surface.renderOverlays(): draw the content, and each overlay's view
//   //              absolutely over the whole view (modals; a host that skips them shows none)
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
  type FormAccess,
  type OverlayContent,
  type OverlayDraw,
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
