// Images: how a component draws an OpenUI `src`.
//
// OpenUI hands components image URLs (https, data:, relative paths), while
// gpui's `image(path)` draws only local files under the host's asset root. The
// contract between them:
//
//   Host     new Surface({ ..., images: (src) => Promise<LoadedImage> })
//            Turns a `src` into a drawable asset: a path `image()` accepts and
//            the picture's intrinsic size in px. Rejects when it can't (bad
//            URL, network error, not an image). Called at most once per `src`
//            per Surface, from a task; the host does its own caching.
//   Surface  Keeps one ImageState per `src` and redraws when it changes.
//   Component
//            const state = ctx.image(src)
//            "loading" until the host answers, then "ready" (path, width,
//            height) or "failed". Draw what upstream draws for each: an <img>
//            that has not loaded is an empty box, a broken one per its scss.
//            fitImage() places a ready image the way CSS `object-fit` does.
//
// Without an `images` option every image is "failed" at once, as a browser
// shows an image it can't fetch. The core has no host imports: Herdr's loader
// lives in herdr/src/images.ts.
import { div, image, type Element } from "gpui-kit";

/** A local file the host made of an image `src`: what `image()` draws, and its intrinsic size. */
export interface LoadedImage {
  /** Path for gpui's `image()`, relative to the host's asset root. */
  path: string;
  width: number;
  height: number;
}

/** The host's side of the contract: `src` (as the component got it) → a drawable asset. */
export type ImageLoader = (src: string) => Promise<LoadedImage>;

export type ImageState =
  | { status: "loading" }
  | ({ status: "ready" } & LoadedImage)
  | { status: "failed"; error: string };

export type ObjectFit = "cover" | "contain";

/** Where an image lands in a box under CSS `object-fit` (centered, `object-position: 50% 50%`). */
export interface FitRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function fitRect(intrinsic: { width: number; height: number }, box: { width: number; height: number }, fit: ObjectFit): FitRect {
  const scale =
    fit === "cover"
      ? Math.max(box.width / intrinsic.width, box.height / intrinsic.height)
      : Math.min(box.width / intrinsic.width, box.height / intrinsic.height);
  const width = intrinsic.width * scale;
  const height = intrinsic.height * scale;
  return { left: (box.width - width) / 2, top: (box.height - height) / 2, width, height };
}

/**
 * A ready image filling a `width`×`height` box with `object-fit`: the box clips
 * what `cover` crops. `zoom` scales the picture about its center inside the box
 * (a CSS `transform: scale()` on the <img>), animated over `transition` ms when
 * it changes. The caller styles the box (radius, background, border).
 */
export function fitImage(
  state: Extract<ImageState, { status: "ready" }>,
  box: { width: number; height: number },
  fit: ObjectFit,
  options: { zoom?: number; radius?: number; transition?: number } = {},
): Element {
  const r = fitRect(state, box, fit);
  const zoom = options.zoom ?? 1;
  const width = r.width * zoom;
  const height = r.height * zoom;
  let picture = image(state.path)
    .absolute()
    .left(r.left - (width - r.width) / 2)
    .top(r.top - (height - r.height) / 2)
    .w(width)
    .h(height);
  // gpui rounds the picture itself; when it doesn't overflow the box (contain), that is the box's rounding.
  if (options.radius) picture = picture.rounded(options.radius);
  if (options.transition) {
    const policy = { duration: options.transition, easing: "ease-in-out" } as const;
    picture = picture.transition("left", policy).transition("top", policy).transition("width", policy).transition("height", policy);
  }
  return div().relative().flex_none().overflow_hidden().w(box.width).h(box.height).child(picture);
}
