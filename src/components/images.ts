// Images: Image, ImageBlock, ImageGallery (with its GalleryModal), ImageText, ImageTextLarge.
//
// Ported from react-ui at the pinned commit:
//   Image           genui-lib/Image/{schema.ts,index.tsx}, components/Image/{Image.tsx,image.scss}
//                   (Radix AspectRatio at its 3:2 default, scale "fill")
//   ImageBlock      genui-lib/ImageBlock/*, components/ImageBlock/{ImageBlock.tsx,imageBlock.scss},
//                   hooks/useResponsiveContainer.ts (mobile below 480px)
//   ImageGallery    genui-lib/ImageGallery/*, components/ImageGallery/{ImageGallery.tsx,
//                   GalleryModal.tsx,imageGallery.scss}
//   ImageText       genui-lib/ImageText/*, components/ImageText/{ImageText.tsx,imageText.scss}
//   ImageTextLarge  genui-lib/ImageTextLarge/*, components/ImageTextLarge/{ImageTextLarge.tsx,imageTextLarge.scss}
//   (titles through components/TextBlock, as Text and BoldText draw it: content.ts textBlock)
//
// Pictures come through the host (render/images.ts: ctx.image). An <img> that
// is still loading draws as its empty box; a broken one is hidden where the
// scss hides it (Image, ImageBlock) and otherwise shows its alt text, as a
// browser does.
//
// Where gpui differs:
// - No object-fit: `cover` is drawn by sizing the picture from its intrinsic
//   size and clipping it with the box (fitImage); boxes sized by CSS
//   percentages (aspect ratio, 100% width) are measured with on_size_change,
//   so they settle one frame after the first draw.
// - A clipping box does not round its children: a `cover` picture that
//   overflows its box keeps square corners where the box is rounded.
// - ImageBlock's backdrop is the picture at 150% and 20% opacity without the
//   12px blur (gpui has no filters).
// - ImageBlock's spinner turns with gpui's native `spin` on an SVG arc, served
//   as a data: URI through the same image loader.
// - The gallery grid is solved here (CSS grid with fr rows and the 376px
//   max-height); its `max-width: 768px` media query reads the gallery's own
//   width, the closest a component gets to the viewport.
// - The hover zoom (scale 1.05) grows the picture's box about its center
//   instead of a transform. CSS `ease` (the zoom, the thumbnails' opacity) is
//   drawn as `ease-in-out`: gpui-kit's easings have no `ease`.
// - GalleryModal is a surface overlay (ctx.overlay) covering the host's pane,
//   OpenUI's viewport here, in the overlay color without the 3px backdrop
//   blur and without the fade-in. Escape (the backdrop takes focus) and a press
//   outside the content close it; content below can still see hover. The
//   thumbnail strip scrolls by an offset (gpui-kit can't scroll a div from
//   code): wheel and trackpad move it, the chevrons step 28% of its width.
//   Thumbnails are not keyboard focusable (upstream: Tab, then Enter/Space).
import { div, svg, type Context, type Element, type FocusHandle, type ScrollWheelEvent } from "gpui-kit";
import { fitImage, type ImageState, type ObjectFit } from "../render/images.ts";
import { optional, type Component, type OverlayContent, type RenderContext } from "../render/surface.ts";
import { textStyle, typography, TRANSPARENT } from "../render/tokens.ts";
import { button, ICON_BUTTON, iconButton } from "./buttons.ts";
import { textBlock } from "./content.ts";

type Ready = Extract<ImageState, { status: "ready" }>;

/** A box's width as last measured (CSS percentage widths need it), with the element that reports it. */
function measure(ctx: RenderContext, part: string): { width: number; track: <E extends Element>(el: E) => E; probe: () => Element } {
  const local = ctx.local({ width: 0 }, part);
  const report = (size: { width: number }, cx: Context) => {
    if (local.width !== size.width) {
      local.width = size.width;
      cx.notify();
    }
  };
  return {
    width: local.width,
    track: (el) => el.id(ctx.id(`${part}-size`)).on_size_change(report),
    // An absolute child filling its parent: measures a box whose own size comes from that width.
    probe: () => div().id(ctx.id(`${part}-probe`)).absolute().top(0).left(0).size_full().on_size_change(report),
  };
}

/** A picture filling a box with object-fit, or what a browser shows for it before and instead. */
function picture(state: ImageState, box: { width: number; height: number }, fit: ObjectFit, alt: string, options: { zoom?: number; transition?: number } = {}): Element | null {
  if (box.width <= 0 || box.height <= 0) return null;
  if (state.status === "ready") return fitImage(state, box, fit, options);
  if (state.status === "failed" && alt) return div().w(box.width).h(box.height).overflow_hidden().child(alt);
  return null;
}

// ── Image ──

/** components/Image aspectRatioMap["3:2"]: genui Image never passes another. */
const IMAGE_RATIO = 3 / 2;

export const Image: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const src = typeof props.src === "string" ? props.src : "";
    const alt = String(props.alt ?? "");
    const state = ctx.image(src);
    const local = ctx.local({ width: 0, height: 0 }, "ratio");
    // .openui-image: 1px border default, radius m, foreground behind; object-fit cover (scale "fill").
    // --error: visibility hidden; the aspect-ratio box keeps its place.
    const img =
      state.status === "failed"
        ? null
        : div()
            .size_full()
            .overflow_hidden()
            .border_1()
            .border_color(t.borderDefault)
            .rounded(t.radiusM)
            .bg(t.foreground)
            .children(optional(picture(state, { width: local.width - 2, height: local.height - 2 }, "cover", alt)));
    // Radix AspectRatio: width 100%, padding-bottom (1/ratio)% of the *parent's* width (CSS
    // percentage padding), the image absolutely filling it. In a row that box is taller than wide.
    const fill = div()
      .id(ctx.id("ratio-fill"))
      .absolute()
      .top(0)
      .left(0)
      .size_full()
      .on_size_change((size, cx) => {
        if (local.width !== size.width || local.height !== size.height) {
          local.width = size.width;
          local.height = size.height;
          cx.notify();
        }
      })
      .children(optional(img));
    return div().relative().w_full().min_w_0().pb(`${100 / IMAGE_RATIO}%`).child(fill);
  },
};

// ── ImageBlock ──

/** .openui-image-block-loader: a 3px ring, its top quarter in blue, turning once a second. */
const SPINNER_ARC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
      '<path d="M4.575 4.575A10.5 10.5 0 0 1 19.425 4.575" fill="none" stroke="#000" stroke-width="3"/></svg>',
  );

function spinner(ctx: RenderContext): Element {
  const arc = ctx.image(SPINNER_ARC);
  return div()
    .absolute()
    .size(24)
    .rounded(ctx.t.radiusFull)
    .border(3)
    .border_color("#d1d5dbff") // rgb(209, 213, 219)
    .when(arc.status === "ready", (el) =>
      el.child(
        svg((arc as Ready).path)
          .absolute()
          .top(-3)
          .left(-3)
          .size(24)
          .text_color("#2563ebff") // rgb(37, 99, 235)
          .spin(1000),
      ),
    );
}

const BLOCK_HEIGHT = 240;

export const ImageBlock: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const src = typeof props.src === "string" ? props.src : "";
    if (!src) return null;
    const state = ctx.image(src);
    const { width, track } = measure(ctx, "block");
    // useResponsiveContainer starts at "mobile" (width 0) until it measures.
    const mobile = width < 480;
    // .openui-image-block-wrapper: flex 1 1 0, 240px tall, centered, radius 2xl, clips.
    const wrapper = track(div())
      .relative()
      .flex()
      .flex_row()
      .flex_1()
      .min_w_0()
      .w_full()
      .min_h(BLOCK_HEIGHT)
      .max_h(BLOCK_HEIGHT)
      .h(BLOCK_HEIGHT)
      .justify_center()
      .items_center()
      .overflow_hidden()
      .rounded(t.radius2xl);
    // --error: visibility hidden.
    if (state.status === "failed") return wrapper;

    const padX = mobile ? 0 : t.spaceL + 2;
    const padY = mobile ? 0 : t.spaceL - 2;
    const inner = { width: width - 2 * padX, height: BLOCK_HEIGHT - 2 * padY };
    const border = 4;
    let content: Element[] = [];
    if (state.status === "ready" && width > 0) {
      // ::before: inset -20px, the picture at background-size 150%, centered, opacity .2 (blur: none here).
      const back = { width: width + 40, height: BLOCK_HEIGHT + 40 };
      const bw = back.width * 1.5;
      const bh = (bw * state.height) / state.width;
      const backdrop = div()
        .absolute()
        .left(-20 + (back.width - bw) / 2)
        .top(-20 + (back.height - bh) / 2)
        .opacity(0.2)
        .child(fitImage(state, { width: bw, height: bh }, "cover"));
      // The <img>, border-box (react-ui's reset) with a 4px border. Desktop: height 100%,
      // width from its ratio up to max-width 100%. Mobile: width 100%, height from its ratio.
      const ratio = state.width / state.height;
      const box = mobile
        ? { width: inner.width - 2 * border, height: (inner.width - 2 * border) / ratio }
        : { width: Math.min((inner.height - 2 * border) * ratio, inner.width - 2 * border), height: inner.height - 2 * border };
      const radius = mobile ? t.radius2xl : t.radiusL;
      const img = div()
        .flex_none()
        .w(box.width + 2 * border)
        .h(box.height + 2 * border)
        .border(border)
        .border_color(t.borderDefault)
        .rounded(radius)
        .overflow_hidden()
        .child(fitImage(state, box, "cover", { radius: radius - border }));
      content = [backdrop, img];
    }
    return wrapper.children(content).when(state.status === "loading", (el) => el.child(spinner(ctx)));
  },
};

// ── ImageGallery ──

interface GalleryItem {
  src: string;
  alt?: string;
}

/** A grid item's area: column and row lines, as imageGallery.scss places it. */
type Area = readonly [col: number, colSpan: number, row: number, rowSpan: number];

interface GridSpec {
  columns: number[]; // fr
  /** Two `1fr` rows; otherwise one implicit `auto` row. */
  frRows: boolean;
  areas: Area[];
}

/** imageGallery.scss layouts by image count (getLayoutClassName), and their max-width 768px forms. */
function gridSpec(count: number, narrow: boolean): GridSpec {
  switch (count) {
    case 1:
      return { columns: [1], frRows: false, areas: [[0, 1, 0, 1]] };
    case 2:
      return { columns: [1, 1], frRows: false, areas: [[0, 1, 0, 1], [1, 1, 0, 1]] };
    case 3:
      return narrow
        ? { columns: [1, 1], frRows: true, areas: [[0, 2, 0, 1], [0, 1, 1, 1], [1, 1, 1, 1]] }
        : { columns: [1, 1], frRows: true, areas: [[0, 1, 0, 2], [1, 1, 0, 1], [1, 1, 1, 1]] };
    case 4:
      return { columns: [1, 1, 1, 1], frRows: true, areas: [[0, 2, 0, 2], [2, 2, 0, 1], [2, 1, 1, 1], [3, 1, 1, 1]] };
    default:
      return narrow
        ? { columns: [1, 1, 1, 1, 1, 1], frRows: true, areas: [[0, 3, 0, 1], [3, 3, 0, 1], [0, 2, 1, 1], [2, 2, 1, 1], [4, 2, 1, 1]] }
        : { columns: [2, 1, 1], frRows: true, areas: [[0, 1, 0, 2], [1, 1, 0, 1], [2, 1, 0, 1], [1, 1, 1, 1], [2, 1, 1, 1]] };
  }
}

const GRID_MAX_HEIGHT = 376;

/**
 * CSS grid for the gallery: fr columns; rows sized by each <img>'s height at
 * its column width (an image not loaded yet is 0 tall). Two fr rows share the
 * tallest need and shrink together to fit max-height 376; an auto row doesn't
 * shrink, and the gallery cuts it at 376 (checked against Chrome: one tall
 * image shows its top). Images then fill their areas (100%).
 */
function galleryGrid(spec: GridSpec, width: number, gap: number, natural: (i: number, cellWidth: number) => number) {
  const unit = (width - gap * (spec.columns.length - 1)) / spec.columns.reduce((a, b) => a + b, 0);
  const colX = spec.columns.map((_, i) => spec.columns.slice(0, i).reduce((a, fr) => a + fr * unit + gap, 0));
  const span = (start: number, n: number) => spec.columns.slice(start, start + n).reduce((a, fr) => a + fr * unit, 0) + gap * (n - 1);
  const needs = spec.areas.map(([c, cs, , rs], i) => {
    const h = natural(i, span(c, cs));
    return rs === 2 ? (h - gap) / 2 : h;
  });
  let row = Math.max(0, ...needs);
  if (spec.frRows && 2 * row + gap > GRID_MAX_HEIGHT) row = (GRID_MAX_HEIGHT - gap) / 2;
  const gridHeight = spec.frRows ? 2 * row + gap : row;
  const cells = spec.areas.map(([c, cs, r, rs]) => ({
    left: colX[c]!,
    top: r * (row + gap),
    width: span(c, cs),
    height: rs * row + (rs - 1) * gap,
  }));
  return { cells, height: Math.min(gridHeight, GRID_MAX_HEIGHT) };
}

const MAX_GRID_IMAGES = 5;

export const ImageGallery: Component = {
  render(props, ctx) {
    const images = (Array.isArray(props.images) ? props.images : []).map((i: GalleryItem | null) => ({
      src: typeof i?.src === "string" ? i.src : "",
      alt: typeof i?.alt === "string" ? i.alt : undefined,
    }));
    if (!images.length) return null;
    const t = ctx.t;
    // The gallery's UI state lives as long as the node is drawn (as React state does):
    // a gallery drawn again later at the same place starts closed.
    const local =
      ctx.retained<GalleryLocal, null>(ctx.id("gallery-state"), { kind: "gallery-state", meta: null, create: () => galleryLocal() }) ?? galleryLocal();
    // Upstream mounts images past the fifth only inside the modal.
    const visible = images.slice(0, MAX_GRID_IMAGES);
    const states = (local.open ? images : visible).map((i) => ctx.image(i.src));
    const { width, probe } = measure(ctx, "gallery");
    // A broken <img> is as tall as its alt text's line (body default) when nothing else sets the row.
    const body = typography(t, "body", "default");
    const altLine = body.size * body.lineHeight;
    const grid = galleryGrid(gridSpec(visible.length, width <= 768), width, t.spaceS, (i, cellWidth) => {
      const s = states[i]!;
      return s.status === "ready" ? (cellWidth * s.height) / s.width : s.status === "failed" ? altLine : 0;
    });

    const open = (index: number, cx: Context) => {
      local.selected = index;
      local.open = true;
      local.offset = 0;
      cx.notify();
    };
    if (local.open) ctx.overlay("gallery", (o) => galleryModal(o, images, states, local));
    const cells = visible.map((item, i) => {
      const cell = grid.cells[i]!;
      const alt = item.alt || `Gallery image ${i + 1}`;
      return div()
        .id(ctx.id(`img-${i}`))
        .absolute()
        .left(cell.left)
        .top(cell.top)
        .w(cell.width)
        .h(cell.height)
        .overflow_hidden()
        .cursor_pointer()
        .on_hover((hovered, cx) => {
          const next = hovered ? i : local.hovered === i ? -1 : local.hovered;
          if (next !== local.hovered) {
            local.hovered = next;
            cx.notify();
          }
        })
        .on_click((_e, cx) => open(i, cx))
        .children(optional(picture(states[i]!, cell, "cover", alt, { zoom: local.hovered === i ? 1.05 : 1, transition: 300 })));
    });
    // .openui-gallery__show-all-button: bottom/right 5px over the grid.
    const showAll =
      images.length > MAX_GRID_IMAGES
        ? div()
            .absolute()
            .bottom(5)
            .right(5)
            // react-ui's Button never stops the click: it goes on to whatever surrounds the gallery.
            .child(button(ctx, { id: ctx.id("show-all"), label: "Show All", variant: "primary", size: "small", bubble: true, onClick: (cx) => open(local.selected, cx) }))
        : null;
    // .openui-gallery: full width, radius m, clips; the grid is at most 376px tall.
    return div()
      .relative()
      .w_full()
      .h(grid.height)
      .min_w_0()
      .overflow_hidden()
      .rounded(t.radiusM)
      .child(probe())
      .children(cells)
      .children(optional(showAll));
  },
};

interface GalleryLocal {
  selected: number;
  /** The grid image under the pointer (hover zoom). */
  hovered: number;
  /** GalleryModal is showing (`showAll` upstream). */
  open: boolean;
  /** The thumbnail strip's scroll offset, and whether the last change slides. */
  offset: number;
  smooth: boolean;
  thumbHovered: number;
  /** The overlay's measured size: the modal's viewport. */
  width: number;
  height: number;
  release?(): unknown;
}

const galleryLocal = (): GalleryLocal => ({ selected: 0, hovered: -1, open: false, offset: 0, smooth: false, thumbHovered: -1, width: 0, height: 0 });

const THUMB_HEIGHT = 116;
const THUMB_MIN_WIDTH = 174;

/**
 * components/ImageGallery GalleryModal, drawn as a surface overlay over the pane (its viewport):
 * the overlay's own handlers close it, so it draws nothing once closed.
 */
function galleryModal(ctx: RenderContext, images: GalleryItem[], states: ImageState[], local: GalleryLocal): OverlayContent {
  if (!local.open) return null;
  const t = ctx.t;
  const close = (cx: Context) => {
    local.open = false;
    cx.notify();
  };
  // Escape needs the keyboard: a focus handle while open; the surface focuses the topmost overlay's.
  const focus = ctx.retained<FocusHandle, null>(ctx.id("modal-focus"), {
    kind: "gallery-modal-focus",
    meta: null,
    create: (_entry, cx) => cx.focus_handle(),
  });
  // @media (max-width: 768px): the content fills the screen, square.
  const full = local.width <= 768;
  const boxW = full ? local.width : Math.min(local.width - 80, 720);
  const boxH = full ? local.height : Math.min(local.height - 80, 640);
  const pad = t.spaceXl;
  const selected = Math.min(local.selected, images.length - 1);
  const state = states[selected]!;
  const strip = local;
  // .openui-gallery__modal-header: "All Photos" in heading extra-small, a small secondary close button.
  const header = div()
    .flex()
    .flex_row()
    .items_center()
    .justify_between()
    .px(pad)
    .child(textStyle(div().text_color(t.textNeutralPrimary), typography(t, "heading", "extra-small")).child("All Photos"))
    .child(iconButton(ctx, { id: ctx.id("modal-close"), icon: "X", size: "small", variant: "secondary", onClick: close }));

  // .openui-gallery__modal-main: the picture at its own size, shrunk to fit (max 100%), radius s.
  const mainW = boxW - 2 - 2 * pad;
  const mainH = Math.max(0, boxH - 2 - 2 * pad - 2 * t.spaceXl - ICON_BUTTON.small.box - THUMB_HEIGHT);
  let shown: Element | null = null;
  if (state.status === "ready") {
    const scale = Math.max(0, Math.min(1, mainW / state.width, mainH / state.height));
    shown = fitImage(state, { width: state.width * scale, height: state.height * scale }, "contain", { radius: t.radiusS });
  } else if (state.status === "failed") {
    shown = div().max_w(mainW).overflow_hidden().child(images[selected]!.alt || `Gallery image ${selected + 1}`);
  }
  const main = div().flex().flex_1().min_h_0().justify_center().items_center().px(pad).children(optional(shown));

  // .openui-gallery__modal-carousel: thumbnails flex 1, min 174px, gap s, padded xl; scrolls sideways.
  const viewW = boxW - 2;
  const gap = t.spaceS;
  const n = images.length;
  const thumbW = Math.max(THUMB_MIN_WIDTH, (viewW - 2 * pad - gap * (n - 1)) / n);
  const contentW = 2 * pad + n * thumbW + gap * (n - 1);
  const maxOffset = Math.max(0, contentW - viewW);
  const offset = Math.min(Math.max(0, strip.offset), maxOffset);
  const scrollTo = (next: number, smooth: boolean, cx: Context) => {
    strip.offset = Math.min(Math.max(0, next), maxOffset);
    strip.smooth = smooth;
    cx.notify();
  };
  const thumbs = images.map((_, i) => {
    const active = i === selected;
    return div()
      .id(ctx.id(`thumb-${i}`))
      .flex_none()
      .w(thumbW)
      .h(THUMB_HEIGHT)
      .cursor_pointer()
      .rounded(t.radiusS)
      .border_1()
      .border_color(active ? t.borderInteractiveSelected : TRANSPARENT)
      .overflow_hidden()
      .opacity(active ? 1 : strip.thumbHovered === i ? 0.8 : 0.6)
      .transition("opacity", { duration: 200, easing: "ease-in-out" })
      .on_hover((hovered, cx) => {
        strip.thumbHovered = hovered ? i : strip.thumbHovered === i ? -1 : strip.thumbHovered;
        cx.notify();
      })
      .on_click((_e, cx) => {
        local.selected = i;
        cx.notify();
      })
      .children(optional(picture(states[i]!, { width: thumbW - 2, height: THUMB_HEIGHT - 2 }, "cover", "")));
  });
  const carousel = div()
    .id(ctx.id("modal-carousel"))
    .w(viewW)
    .h(THUMB_HEIGHT)
    .overflow_hidden()
    .when(maxOffset > 0, (el) =>
      el.on_scroll_wheel((e: ScrollWheelEvent, cx) => {
        const dx = e.delta.x !== 0 ? e.delta.x : e.delta.y;
        if (dx === 0) return;
        cx.stop_propagation();
        scrollTo(strip.offset - dx, false, cx);
      }),
    )
    .child(
      div()
        .relative()
        .flex()
        .flex_row()
        .gap(gap)
        .px(pad)
        .w(contentW)
        .left(-offset)
        .when(strip.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" }))
        .children(thumbs),
    );
  // Scroll buttons: extra-small secondary chevrons, 24px in from each side, on a foreground chip (radius xs).
  const control = (side: "left" | "right") => {
    const show = side === "left" ? offset > 0 : offset + viewW < contentW - 0.5;
    if (!show) return null;
    return div()
      .absolute()
      .top((THUMB_HEIGHT - ICON_BUTTON["extra-small"].box) / 2)
      .when(side === "left", (el) => el.left(24))
      .when(side === "right", (el) => el.right(24))
      .bg(t.foreground)
      .rounded(t.radiusXs)
      .overflow_hidden()
      .child(
        iconButton(ctx, {
          id: ctx.id(`modal-scroll-${side}`),
          icon: side === "left" ? "ChevronLeft" : "ChevronRight",
          size: "extra-small",
          variant: "secondary",
          onClick: (cx) => scrollTo(offset + (side === "left" ? -1 : 1) * viewW * 0.28, true, cx),
        }),
      );
  };
  const carouselContainer = div()
    .relative()
    .flex()
    .flex_row()
    .items_center()
    .justify_center()
    .w_full()
    .child(carousel)
    .children([control("left"), control("right")].filter((c): c is Element => c !== null));

  // .openui-gallery__modal-content: border default, foreground, radius xl, gap and vertical padding xl.
  // A press inside it stays there; outside it closes the modal.
  const content = div()
    .id(ctx.id("modal"))
    .flex()
    .flex_col()
    .flex_none()
    .w(boxW)
    .h(boxH)
    .overflow_hidden()
    .gap(t.spaceXl)
    .py(pad)
    .border_1()
    .border_color(t.borderDefault)
    .bg(t.foreground)
    .rounded(full ? 0 : t.radiusXl)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .child(header)
    .child(main)
    .child(carouselContainer);

  // .openui-gallery__modal: fixed over the viewport, centered, the overlay color behind (no backdrop blur).
  const backdrop = div()
    .id(ctx.id("modal-backdrop"))
    .size_full()
    .flex()
    .justify_center()
    .items_center()
    .bg(t.overlay)
    .on_mouse_down("left", (_e, cx) => {
      cx.stop_propagation(); // the press must not reach the grid below
      close(cx);
    })
    .on_key_down((e, cx) => {
      if (e.key !== "escape") return;
      cx.stop_propagation();
      close(cx);
    })
    .on_scroll_wheel((_e, cx) => cx.stop_propagation())
    .on_size_change((size, cx) => {
      if (local.width !== size.width || local.height !== size.height) {
        local.width = size.width;
        local.height = size.height;
        cx.notify();
      }
    });
  return { el: (focus ? backdrop.track_focus(focus) : backdrop).children(local.width > 0 ? [content] : []), focus };
}

// ── ImageText, ImageTextLarge ──

/** components/ImageText: default 40px square (horizontal), else imageSize; vertical without it: space-2xl + space-2xs. */
export const ImageText: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const title = String(props.title ?? "");
    const src = typeof props.src === "string" ? props.src : "";
    const alt = typeof props.alt === "string" ? props.alt : title;
    const horizontal = props.layout !== "vertical";
    const size = typeof props.imageSize === "number" && props.imageSize > 0 ? props.imageSize : t.space2xl + t.space2xs;
    const state = ctx.image(src);
    // .openui-image-text__image-container: radius m, clips, sunk behind; the <img> covers it.
    const box = div()
      .flex()
      .flex_none()
      .items_center()
      .justify_center()
      .w(size)
      .h(size)
      .rounded(t.radiusM)
      .overflow_hidden()
      .bg(t.sunk)
      .children(optional(picture(state, { width: size, height: size }, "cover", alt)));
    const block = textBlock(ctx, props.bold === true ? "highlight-text-number-subtext" : "text-subtext", {
      value: title,
      subtext: props.subtitle,
      size: horizontal ? "xs" : "sm",
    });
    const content = div().flex().flex_col().min_w_0().when(horizontal, (el) => el.pt(t.space3xs)).child(block);
    const root = div().flex().gap(t.spaceM).child(box).child(content);
    return horizontal ? root.flex_row().items_center() : root.flex_col().items_start();
  },
};

const LARGE_HEIGHT = 180;

export const ImageTextLarge: Component = {
  render(props, ctx) {
    const t = ctx.t;
    const title = String(props.title ?? "");
    const src = typeof props.src === "string" ? props.src : "";
    const alt = typeof props.alt === "string" ? props.alt : title;
    const state = ctx.image(src);
    const { width, track } = measure(ctx, "banner");
    // .openui-image-text-large__image-wrap: full width, radius m, clips, sunk; the <img> is 180px tall, cover.
    const wrap = track(div())
      .relative()
      .flex()
      .w_full()
      .h(LARGE_HEIGHT)
      .flex_none()
      .rounded(t.radiusM)
      .overflow_hidden()
      .bg(t.sunk)
      .children(optional(picture(state, { width, height: LARGE_HEIGHT }, "cover", alt)));
    return div()
      .flex()
      .flex_col()
      .w_full()
      .min_w_0()
      .gap(t.spaceM)
      .child(wrap)
      .child(textBlock(ctx, "highlight-text", { value: title, subtext: props.subtitle, size: "sm" }));
  },
};
