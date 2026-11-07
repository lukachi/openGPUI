# Where gpui differs from the browser

openGPUI ports `@openuidev/react-ui` faithfully: behavior that differs from upstream is a bug.
Where gpui can't do what the browser does, the closest gpui form is kept and the difference is
listed here, and in the header of the component's file.

## Views and the per-call budget

gpui-shell interrupts a JS call that runs about 50 ms in `render` (a task may run a few hundred
ms), and Herdr's QuickJS is slow. The limit is per call. Each costly or stateful component
(markdown and code, charts, tables, tabs, accordions, steps, carousels, images, card blocks,
lists, form controls), the response root and each overlay draws in a retained gpui view of its
own. So a page of any size is many bounded calls, and a change redraws only the views it
touches: a stream chunk the views whose evaluated node changed, a hover or a toggle its own
view, typing the input and what shows its value.

- A view met for the first time is an empty placeholder until it is created: a new part of the
  page appears a frame per level of nesting later.
- An interrupted view shows gpui's error card in its place; the rest of the page goes on.
- Strings without markdown skip the parser. Longer markdown is parsed in a task in pieces (the
  same tree as one parse) and shows as its plain source for the first frames.
- A markdown block longer than 6,000 characters is drawn through gpui-kit's lazy `list`, which
  builds only what is on screen. A parse step or a lazy row that would still run too long (one
  huge list item, say, or a row over 12,000 characters) is not attempted, and that text stays
  plain.
- Code up to 300 characters is highlighted where it is drawn; longer code by a task in steps of
  1,000 characters, so it shows plain for a moment, and a step cuts multi-line tokens (block
  comments, template strings) at its edges.

## Tasks and plain promises

An async `cx` acts for whichever call is running, and the continuation of a plain JS promise
runs inside whichever call drains QuickJS's job queue (another view's render or handler, or
another mod's). A long-lived task awaits only host promises it starts itself (sleeps, fs,
exec); the surface's pump and Herdr's writer loop poll a flag on a sleep for that reason.

## Fonts

Optical sizes come in steps (14, 16, 18, 24, 28, 32) instead of following every size, and a
size/weight pair without a cut takes the nearest cut. Heading large/xl track −0.1px upstream;
here they get the −1% of all other text.

## Shadows

OpenUI's custom shadows map to gpui's presets (`shadow-s` and `shadow-m` → `shadow_xs`, measured
against upstream's render; `shadow-l` → `shadow_md`, …): gpui-shell exposes only presets, not
gpui's `BoxShadow`. gpui paints a shadow under its whole box, where CSS paints it only outside,
so a box whose fill isn't opaque (a secondary Button, the DatePicker field, a sunk Card, a clear
Tab on hover) gets no shadow instead of a grey fill (`shadow()` in `src/render/tokens.ts`). A
secondary IconButton on an opaque chip (the Carousel and Tabs arrows) is filled with its
see-through fill composited over the chip, so it keeps its shadow.

## Transitions

gpui animates only opacity, size and position, so upstream's color transitions (hover fills,
borders) switch at once. `cursor: not-allowed` isn't drawn.

## Choice controls

gpui-base's unstyled `Checkbox`, `Radio` and `Switch` carry focus, keyboard and disabled state;
the indicators are drawn from upstream's sizes (the checkmark is a path without round caps).
There is no focus ring and no `overflow-wrap: anywhere`: a word longer than its row isn't
broken.

## Buttons

Button and IconButton are tab stops that Enter and Space press, as the `<button>` upstream
renders (a disabled one, and a Button while its response streams, is neither).

- The browser's own focus outline is all upstream shows (its scss has no focus rule), and gpui
  scripts have no `focus-visible` style, so there is no ring.
- The focus handle is retained state, so a button is a tab stop from its second frame.
- A focused button that turns disabled keeps the keyboard (the next Tab starts from its place);
  one that unmounts (a carousel or tab-list arrow at its end) leaves nothing focused, and the
  next Tab reaches nothing (see [Focus](#focus)).
- Enter/Space on a Button inside a clickable card runs the card's action and not the Button's,
  as upstream's `cardKeyDownHandler` (which `preventDefault`s the key) does. A script cannot
  `prevent_default`, so the card raises a flag the Button's keyboard click reads (`keyClick` in
  `buttons.ts`). Mouse clicks run both, as upstream.

## Focus

Tab and Shift-Tab move focus from where a click left it. In a fresh pane, or after a click on
bare page (the shell root blurs it), nothing is focused, the shell root's Tab binding is not on
the key's path, and a Tab reaches nothing: click a control first.

## Overlays

A page-level `position: fixed` portal (Modal) is a surface overlay that the host stacks over its
own area: in Herdr the pane, not the whole window, so a click outside the pane (Herdr's sidebar)
is Herdr's and leaves a Modal open. Percent sizes (`90vw`, `85vh`) are of the pane.

- An overlay opened inside another stacks above it, and the keyboard goes to the topmost one and
  back when it closes.
- Hover styles under an overlay still react (gpui gives scripts no occluding hitbox).
- An overlay is a view of its own; a host mounts the views `surface.renderOverlays()` returns
  over its area after `renderContent()`. A host that doesn't shows no modals.

## Images

gpui draws only local files, so the host turns a `src` into a cached file first (Herdr downloads
with curl into `~/.config/herdr-app/opengpui/images/`, bounded to 256 MiB; local paths only under
`$HOME`). An image is an empty box until then, and while a response streams a src loads only
once it stops changing.

- `object-fit` is drawn from the intrinsic size read from the file header.
- A clipping box doesn't round its children, so cropped pictures keep square corners.
- No CSS filters: ImageBlock's backdrop isn't blurred.
- Broken images show their alt text without the browser's icon.

## Markdown

gpui has no inline text layout, so a paragraph is a wrapping row of words, one element per word
in its own style. Such text can't be selected, and a word may wrap one space earlier than in a
browser (the trailing space counts). An inline code chip doesn't break across lines.

- Images show their alt text (gpui loads only local files).
- Math stays TeX in a code block, as upstream shows it until KaTeX loads; KaTeX isn't ported.
- A task list's checkbox imitates the browser's native one.
- Code highlighting needs refractor's ~300 grammars, which gpui-shell can't register at load:
  the first code block starts registering them in 40 ms slices of a task, and code shows
  unhighlighted until they are in (about 0.35 s in the headless harness). refractor's `reason`
  grammar can't be registered under gpui-shell's frozen `Object.prototype` and is skipped.
- A link opens only when it is an absolute http(s) address (`cx.open_url` throws for any other):
  `mailto:`, relative and `ftp:` links draw as links but do nothing when clicked.

## Long markdown and long code

A long block is a scroll region as tall as the pane's content area, with its own scrollbar; a
long CodeBlock's box is as tall as its code or the pane, whichever is less.

- The wheel scrolls the region and, at its top or bottom end, passes to the page. While the
  region is only partly on screen the wheel still scrolls the region (gpui gives both every
  wheel event, and the region can't tell where it is).
- A block over the threshold but shorter than the pane leaves the rest of its region empty.
- Rows of the list allow no handlers: links are native links for http(s) addresses only, and
  only the hovered word underlines; code blocks there have no copy button.
- A table draws equal columns until a hidden draw has measured it, and a long table measures its
  first 25 rows and estimates the rest from their text.
- A long fence or table is cut into groups of rows, each of which scrolls sideways on its own.
- gpui-kit's `list` splices all its items when their count changes, which puts its scroll back
  at the top: a block that grows while it streams starts over at its top with each chunk.
- The region's scrollbar follows the rows measured so far, so its thumb is long and moves in
  small steps until they are all in.

## Tables

Column widths come from measuring each cell, so a new page is drawn once with equal columns
before they settle. The sideways scroll is the table's own offset (gpui-kit cannot scroll a div
from code): wheel, trackpad and shift-wheel move it, and there is no scrollbar, which matches
upstream's hidden one.

## EditableTable

Its own grid (upstream styles it apart from Table): column widths follow the browser's auto
table layout over each column's declared width, measured in script, so a new table draws once at
its declared widths before it settles; it scrolls sideways by its own offset.

- Number cells edit plain text (no `type="number"`), parsed on save as upstream.
- In an open select menu Enter picks the highlighted option (upstream loses the pick: React
  bubbles the Enter to the cell).
- Tab and Shift-Tab reach a table only as actions it binds itself (the shell root binds them to
  focus traversal, and a key binding runs before any key handler).
- A url cell opens only absolute http(s) addresses (`cx.open_url` throws for any other).

## Tabs, Accordion, Carousel

Tab lists and carousels scroll by an offset they own (wheel, trackpad, chevrons/arrows), with no
scrollbar, as upstream hides it.

- Tab triggers are gpui-base's native `Tab`, which hears no keys: no arrow-key roving.
- Accordion triggers take Tab and Enter/Space through a focusable div inside gpui-base's
  click-only trigger (no focus ring, no arrow-key roving), and an item's content is built only
  while it is open or sliding shut, as Radix mounts it.
- gpui can't rotate, so the accordion chevron flips instead of turning; only opening and closing
  slide.
- The carousel's edge fade (`mask-image`) isn't drawn, and its narrow-window card width needs
  the window width, which render can't read.
- A chosen tab or open item survives its parent being hidden, where Radix would reset it.

## Date pickers

gpui-kit's `Popover` hosts the calendar: it also closes on Escape. It flips above the field
when the pane's visible area has less room below than the calendar is tall (its measured height,
4 to 6 weeks) and more above, decided again when the height changes, as floating-ui's `flip()`
with `autoUpdate`. The pane-box caveats of [Select](#select) apply; a first press with no move
before it stays below, clamped into the window. Its scale/fade isn't animated.

- The month and year lists scroll by an offset they own.
- The grid takes one keyboard focus with a roving focused day (DayPicker's own key map) instead
  of focusable day buttons.
- Popover binds Enter and Space to its own toggle, and a key binding runs before any key
  handler, so the grid binds the two keys itself in its own key context to pick the focused day
  (EditableTable's date cell: Enter moves down instead, as upstream's cell handler does).

Three deliberate deviations:

- range ends given as strings are read (upstream crashes on them);
- re-picking the selected day clears what the field shows as well as its value (upstream keeps
  showing the first pick);
- a `required` rule on a single picker reads the Date as its ISO string (lang-core's `isEmpty`
  counts a Date as empty, so upstream's never validates).

## Select

The menu opens below the trigger, or above it when the pane's visible area has less room below
(10px collision padding, as Radix) and more above; it never shifts sideways.

- The pane's box comes from the pointer having moved over the host's non-scrolling content
  wrapper (`Surface.notePane`), so a first press with no move before it opens below.
- The trigger's own box is the one it had when pressed, so a menu opened by keyboard after the
  page scrolled decides from a stale place.
- Its fade/scale and the chevron's turn aren't animated.
- The pointer row and the keyboard row are separate highlights (Radix moves focus to the row
  under the pointer), so both can show at once.

## Slider

Thumbs, drag and keyboard are gpui-base's native `Slider`; the fill and dots follow a drag one
frame late.

- `SliderState.new` with some nonzero `min` (500…10000) never returns and stops the pump, so the
  native slider runs on `0..max-min` with values shifted back and rounded to the step's decimals
  as Radix does, and it's only made once `max > min` and `step > 0` (props stream in one by
  one).
- The value inputs stay left aligned (gpui-base's Input ignores alignment).
- The native thumbs stop at each other, where Radix lets a dragged thumb pass the other and
  swap: the moved thumb is held one step short.
- The value bubble stays on the thumb being dragged.

## Lists and sections

- No transforms, so ListItem's indicator doesn't scale on hover (the fills and colors change).
- A clickable ListItem takes Tab and shows its hover look while focused, but no keys, as
  upstream's `role="button"` div.
- SectionBlock's open chevron is lucide's ChevronDown (gpui can't rotate), and its trigger takes
  Tab and Enter/Space through a focusable div inside gpui-base's click-only trigger, with no
  focus ring and no arrow-key roving.
- OptionCards' `@container` queries read the field's measured width, so a new response draws
  once in the wide layout; cards have no focus ring or transitions.
- EntityList's right-aligned text pushes each wrapped line right.

## Charts

gpui has no SVG and no text measurement. Geometry is painted with gpui paths, replayed from the
same path data upstream emits (d3-shape and react-ui's own bar paths); axis text is placed
elements with SVG baselines taken from Inter's metrics.

- Labels are measured by drawing them invisibly, so a string with characters no chart has met
  yet holds the plot back one frame.
- Hover followers glide on native springs tuned to upstream's presets (active dots in a straight
  line, not along the curve); there are no round line caps.
- RadarChart's hover reacts inside the series polygons only.
- Pie, Radial, SingleStackedBar and Scatter hit-test their geometry (gpui paths take no pointer
  events); the hovered wedge's `brightness` switches at once.
- Scatter draws each dot as two boxes up to 1000 visible dots and as two cached paths per
  dataset beyond that, so overlapping dots then show their rings over each other's fills.
- Stacked legends scroll by their own offset.
- The hover tooltip is a gpui layer that takes the pointer (upstream's has
  `pointer-events: none`), so it passes its pointer moves on to the chart under it.
- Tooltip numbers are grouped by a shim for `toLocaleString()`, which gpui-shell's engine
  answers without separators.

## Card blocks

- Carousels scroll by an offset the block owns, with no scrollbar and no edge fade.
- Container queries read the block's measured width, so a block is drawn once in the wide layout
  before it settles.
- A clickable card's hover `scale(0.995)` and its 2px focus ring aren't drawn.
- Snippet labels and values end in "…" only as plain text (gpui ellipsizes one run of text) and
  have no truncation tooltip.
- Context and Visual card pictures keep square corners where the card is rounded and get no
  backdrop blur behind tags.
