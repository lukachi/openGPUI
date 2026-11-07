// Modal.
//
// Ported from react-ui at the pinned commit:
//   Modal  genui-lib/Modal/{schema.ts,index.tsx}, components/Modal/{Modal.tsx,Modal.scss}
//
// State contract (genui Modal): `open` is read through the state field "open"
// (a $boolean binding, or the enclosing form's field); true or "true" opens it.
// Closing (the X button, Escape, a press on the backdrop) writes false; nothing
// in the modal ever writes true.
//
// Upstream portals the dialog into document.body. Here it is a surface overlay
// (ctx.overlay): a view of its own that the host stacks over its whole area, the
// page. Its children are rendered with this node's key and form scope, so they
// bind to the same form state, trigger through the same session, and keep their
// retained native state (inputs). Overlays opened later (an ImageGallery's
// GalleryModal inside it) stack above it, as later portals do.
//
// Where gpui forces a difference:
// - Not `window.open_dialog`: a window dialog is a separate view, invalidated
//   separately from the Surface that opened it (so its content would not redraw
//   when the session changes), it reports no close by Escape or backdrop (so
//   `open` could not be written back to false), and it draws its own chrome.
// - The backdrop covers the pane (OpenUI's page in Herdr), not the window.
//   90vw/85vh are 90%/85% of the pane.
// - box-shadow 0 16px 48px rgba(0,0,0,0.2) maps to gpui's `shadow_2xl` preset.
// - Animations: the fade-in (0.15s ease-out) is a native opacity transition on
//   the backdrop and the dialog; the dialog's 2% slide-in is not drawn.
// - The backdrop stops presses and wheel scrolling from reaching what is under it,
//   but gpui has no occluding hitbox for scripts, so hover styles below it still react.
// - Escape is heard while the keyboard is inside the dialog (focused on open, as
//   upstream focuses the content, and again when an overlay above it closes),
//   not on the whole document.
// - A press on the backdrop closes on click (press and release on the backdrop), as
//   upstream's onClick does.
import { div, type Element, type FocusHandle } from "gpui-kit";
import { optional, type Component } from "../render/surface.ts";
import { shadow, textStyle, typography } from "../render/tokens.ts";

/** Modal.scss .openui-modal-{sm,md,lg} widths. */
const WIDTHS: Record<string, number> = { sm: 400, md: 560, lg: 720 };

/** Modal.scss: dialog radius, close button box and radius, X icon size. */
const RADIUS = 12;
const CLOSE_BOX = 28;
const CLOSE_RADIUS = 6;
const CLOSE_ICON = 18;
const FADE_MS = 150;

export const Modal: Component = {
  render(props, ctx) {
    const field = ctx.field<unknown>("open", props.open);
    const isOpen = field.value === true || field.value === "true";
    const local = ctx.local({ shown: false, pressed: false });
    // Like upstream's portal, the modal takes no place in the flow.
    if (!isOpen) {
      local.shown = false;
      local.pressed = false;
      return null;
    }
    // handleOpenChange(false): only closing writes the field.
    const close = () => field.setValue(false);
    ctx.overlay("modal", (o) => {
      const t = o.t;
      // The surface moves the keyboard here when this becomes the topmost overlay.
      const focus = o.retained<FocusHandle, null>(o.id("focus"), {
        kind: "modal-focus",
        meta: null,
        create: (_entry, cx) => cx.focus_handle(),
      });
      // First open frame draws transparent; the next one fades in.
      const opacity = local.shown ? 1 : 0;
      if (!local.shown) {
        local.shown = true;
        o.after(() => {});
      }

      const size = (props.size as string | undefined) ?? "md";
      const width = WIDTHS[size];

      const title = textStyle(div().flex_1().min_w(0), typography(t, "body", "heavy")).child(String(props.title ?? ""));
      const closeButton = div()
        .id(o.id("close"))
        .flex()
        .flex_none()
        .items_center()
        .justify_center()
        .w(CLOSE_BOX)
        .h(CLOSE_BOX)
        .rounded(CLOSE_RADIUS)
        .cursor_pointer()
        .text_color(t.textNeutralSecondary)
        .hover((s) => s.text_color(t.textNeutralPrimary))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          close();
        })
        .children(optional(o.icon("X", { size: CLOSE_ICON })));
      const header = div()
        .flex()
        .flex_row()
        .flex_none()
        .items_center()
        .justify_between()
        .p(t.spaceM)
        .border_b_1()
        .border_color(t.borderDefault)
        .child(title)
        .child(closeButton);
      const body = div()
        .id(o.id("body"))
        .flex()
        .flex_col()
        .flex_1()
        .min_h(0)
        .gap(t.spaceM)
        .p(t.spaceM)
        .overflow_y_scroll()
        .children(o.children(props.children, "c"));

      let content: Element = div()
        .id(o.id("content"))
        .flex()
        .flex_col()
        .max_h("85%")
        .bg(t.foreground)
        .text_color(t.textNeutralPrimary)
        .border_1()
        .border_color(t.borderDefault)
        .rounded(RADIUS)
        .opacity(opacity)
        .transition("opacity", { duration: FADE_MS, easing: "ease-out" })
        // A press or release inside the dialog is not one on the backdrop, and
        // cancels a press that started on the backdrop.
        .on_mouse_down("left", (_e, cx) => {
          cx.stop_propagation();
          local.pressed = false;
        })
        .on_mouse_up("left", (_e, cx) => {
          cx.stop_propagation();
          local.pressed = false;
        })
        .on_key_down((e, cx) => {
          if (e.key !== "escape") return;
          cx.stop_propagation();
          close();
        })
        .child(header)
        .child(body);
      content = shadow(content, "2xl");
      if (width !== undefined) content = content.w(width).max_w("90%");
      if (focus) content = content.track_focus(focus);

      const backdrop = textStyle(
        div()
          .id(o.id("overlay"))
          .relative()
          .flex()
          .items_center()
          .justify_center()
          .size_full()
          .cursor_default()
          .text_color(t.textNeutralPrimary),
        typography(t, "body", "default"),
      )
        .child(
          div()
            .absolute()
            .inset_0()
            .bg(t.overlay)
            .opacity(opacity)
            .transition("opacity", { duration: FADE_MS, easing: "ease-out" }),
        )
        .child(content)
        // Nothing under the backdrop hears a press or a wheel. A click (press and
        // release on the backdrop) closes, as upstream's overlay onClick.
        .on_mouse_down("left", (_e, cx) => {
          cx.stop_propagation();
          local.pressed = true;
        })
        .on_mouse_up("left", (_e, cx) => {
          cx.stop_propagation();
          if (!local.pressed) return;
          local.pressed = false;
          close();
        })
        .on_mouse_down("right", (_e, cx) => cx.stop_propagation())
        .on_scroll_wheel((_e, cx) => cx.stop_propagation());
      return { el: backdrop, focus };
    });
    return null;
  },
};
