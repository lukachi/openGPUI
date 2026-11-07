//! oui-harness: renders .oui files with the opengpui core on the gpui-shell
//! runtime Herdr embeds, offscreen. No window reaches the screen and nothing
//! takes focus: GPUI's headless app context runs the views on a test platform
//! with a simulated clock and draws them with the Metal headless renderer.
//!
//!   oui-harness <job.json | ->
//!
//! The job (written by scripts/shot.ts) names the script directory
//! (harness/app, the bundle of harness/src/main.ts), the fonts to register,
//! the viewport, and one item per file and mode: steps to run, each followed
//! by a settle, and shots to write. Progress, actions and errors come out on
//! stdout as JSON lines.
//!
//! Each item gets a runtime of its own, unless the job sets `sharedVm`: then
//! all load into one, as Herdr runs every mod tab in one engine, each window
//! stays open like a tab, and once all are loaded they are closed in order as
//! Herdr closes a tab. `heap` lines (heap.rs) give the script heap at start,
//! after each load and after each close (`heap` alone: after each load).
//!
//! Settled means: no runnable task, no script `render` for `quiet_ms` of
//! simulated time, and no timer due before those ms are up. Time is simulated
//! (GPUI's test scheduler): a `cx.sleep` or timer costs no wall time, the
//! clock jumps from one due timer to the next, and the script's `Date.now()`
//! runs ahead by the simulated time too, so the core's wall-clock watchdogs
//! see sleeps pass as they would in Herdr.

mod heap;
mod log;

use anyhow::{Context as _, Result, anyhow, bail};
use gpui::{
    AnyWindowHandle, App, AssetSource, Entity, HeadlessAppContext, InputEvent as _, KeyDownEvent, KeyUpEvent,
    Keystroke, MouseButton, MouseDownEvent, MouseMoveEvent, MouseUpEvent, Pixels, Point, ScrollDelta,
    ScrollWheelEvent, SharedString, Window, point, px, size,
};
use gpui_base::test_support;
use gpui_shell::{AppAssets, Capabilities, HostModule, HostValue, ScriptView, ShellRoot, ShellRuntime};
use serde::Deserialize;
use serde_json::{Value, json};
use std::{
    borrow::Cow,
    cell::RefCell,
    path::{Path, PathBuf},
    rc::Rc,
    sync::Arc,
    time::{Duration, Instant},
};

/// The gpui-shell version Herdr's vendored copy carries (Cargo.toml pins the
/// herdr-app tag it comes from). Herdr writes the version it embeds on line 3
/// of ~/.config/herdr-app/gpui-kit.d.ts; a shot from another runtime would not
/// show what Herdr shows, so the harness refuses to run against it.
const GPUI_SHELL_VERSION: &str = "0.7.1";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Job {
    /// The script directory: main.js, the shared.js it imports, and its icons.
    app: PathBuf,
    /// Font files (.ttf/.otf) to register before anything renders.
    fonts: Option<PathBuf>,
    width: f32,
    height: f32,
    /// Where data: images are decoded to.
    scratch: PathBuf,
    #[serde(default = "default_quiet")]
    quiet_ms: u64,
    #[serde(default = "default_max")]
    max_ms: u64,
    /// One runtime for every item, as Herdr runs every mod copy in one VM:
    /// each item's window stays open like a tab, and once all are loaded they
    /// are closed one by one as Herdr closes a tab. Implies `heap`.
    #[serde(default)]
    shared_vm: bool,
    /// A "heap" line (heap.rs) after each load and each close.
    #[serde(default)]
    heap: bool,
    items: Vec<Item>,
}

/// The core's watchdogs (markdown/code.ts, markdown/budget.ts) look every
/// second and restart a task stalled for over a second: a stalled task is only
/// restarted at the second look, two seconds in.
fn default_quiet() -> u64 {
    2500
}

fn default_max() -> u64 {
    20_000
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Item {
    src: PathBuf,
    mode: String,
    library: String,
    /// Where to write the element description of the settled view.
    spec: Option<PathBuf>,
    /// Query/Mutation tools as JSON text (`shot.ts --tools`): the script answers them.
    tools: Option<String>,
    steps: Vec<StepEntry>,
}

/// A step, and how long to run after it: by default until settled; with
/// `"settle": ms`, exactly that much simulated time in 16 ms frames, so a
/// shot can catch a state that lasts less than a settle (a 1 s "copied" check).
#[derive(Deserialize, Debug)]
struct StepEntry {
    #[serde(flatten)]
    step: Step,
    settle: Option<u64>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
enum Step {
    /// An element id GPUI Kit observes, or a window point.
    Click(Target),
    /// Wheel at a point: [x, y, dy] or [x, y, dy, dx], in px (dy > 0 reads further
    /// down, dx > 0 further right).
    Scroll(Vec<f32>),
    Hover(Target),
    /// Left button down at a target, moves while it is held, and up: a drag in
    /// parts (press on the backdrop, release in the dialog).
    Down(Target),
    Move(Target),
    Up(Target),
    /// A drag from [x1, y1] to [x2, y2] in ten moves.
    Drag((f32, f32, f32, f32)),
    /// A GPUI keystroke: "enter", "cmd-a", "shift-tab".
    Key(String),
    /// Text for the focused element, one character at a time.
    Type(String),
    /// The window's new content size [width, height], as a pane resize.
    Resize((f32, f32)),
    /// Simulated ms to run, in 16 ms frames.
    Wait(u64),
    /// Prints the clipboard's text as a "clipboard" line (`{"clipboard": true}`).
    Clipboard(serde::de::IgnoredAny),
    /// A new text for the file (path), as when an agent rewrites it: framed
    /// without its end line, it is streaming.
    Response(PathBuf),
    /// Writes a PNG of the settled frame.
    Shot(PathBuf),
}

#[derive(Deserialize, Debug)]
#[serde(untagged)]
enum Target {
    Id(String),
    Point(f32, f32),
}

fn main() {
    if let Err(error) = run() {
        emit(json!({ "type": "fatal", "message": format!("{error:#}") }));
        std::process::exit(1);
    }
    // Tearing the app down releases every view and task one by one; the
    // process ending does the same at once.
    std::process::exit(0);
}

fn run() -> Result<()> {
    let argument = std::env::args().nth(1).ok_or_else(|| anyhow!("usage: oui-harness <job.json | ->"))?;
    let text = if argument == "-" {
        std::io::read_to_string(std::io::stdin())?
    } else {
        std::fs::read_to_string(&argument).with_context(|| format!("reading {argument}"))?
    };
    let job: Job = serde_json::from_str(&text).context("parsing the job")?;
    check_pin()?;
    log::install();

    let app = std::fs::canonicalize(&job.app).with_context(|| format!("no script directory {}", job.app.display()))?;
    let mut cx = HeadlessAppContext::with_platform(
        gpui_platform::current_platform(true).text_system(),
        Arc::new(Assets(AppAssets::new(app.clone()), app.clone())),
        gpui_platform::current_headless_renderer,
    );
    let families = cx.update(|cx| -> Result<Vec<String>> {
        gpui_shell::init(cx);
        // gpui-base's disclosure and overlay motion uses wall-clock animations the
        // simulated clock cannot finish; reduced motion draws their end state.
        cx.set_reduce_motion(true);
        if let Some(dir) = &job.fonts {
            cx.text_system().add_fonts(font_files(dir)?)?;
        }
        Ok(cx.text_system().all_font_names())
    })?;

    gpui_shell::export_module(host_module(families, cx.background_executor().clone()))
        .map_err(|e| anyhow!(e.message().to_owned()))?;
    let home = std::env::var("HOME").unwrap_or_default();
    let viewport = size(px(job.width), px(job.height));
    let shared = if job.shared_vm { Some(ShellRuntime::new_isolated()?) } else { None };
    let shared_heap = shared.as_ref().map(heap::Heap::find).transpose()?;
    if let Some(heap) = &shared_heap {
        emit_heap(heap, "start", "", "", 0);
    }
    // The windows a shared runtime keeps open, as tabs: label, mode, window, root.
    let mut tabs: Vec<(String, String, AnyWindowHandle, Entity<ShellRoot>)> = Vec::new();

    for item in &job.items {
        let started = Instant::now();
        let src = std::fs::canonicalize(&item.src).with_context(|| format!("no file {}", item.src.display()))?;
        let base = src.parent().unwrap_or(Path::new("/")).to_path_buf();
        let text = std::fs::read_to_string(&src)?;
        let label = src.display().to_string();
        let follow = item.steps.iter().any(|s| matches!(s.step, Step::Response(_)));
        CURRENT.with_borrow_mut(|current| {
            current.src = label.clone();
            current.mode = item.mode.clone();
            current.response = None;
            current.job = Some(HostValue::Object(vec![
                ("text".into(), HostValue::Str(text)),
                ("base".into(), HostValue::Str(base.display().to_string())),
                ("home".into(), HostValue::Str(home.clone())),
                ("scratch".into(), HostValue::Str(job.scratch.display().to_string())),
                ("mode".into(), HostValue::Str(item.mode.clone())),
                ("library".into(), HostValue::Str(item.library.clone())),
                ("follow".into(), HostValue::Bool(follow)),
                ("tools".into(), item.tools.clone().map_or(HostValue::Null, HostValue::Str)),
            ]));
        });
        // Herdr grants every mod the clipboard (herdr-app src/mods.rs); here it is
        // the test platform's own, never the person's.
        gpui_shell::set_capabilities(
            Capabilities::new()
                .read_roots([app.clone(), base.clone(), PathBuf::from(&home)])
                .write_roots([job.scratch.clone()])
                .clipboard_read(true)
                .clipboard_write(true),
        );

        // A runtime per file unless the job shares one: one VM keeps every load
        // of the 2.7 MB script (gpui-shell never frees a module generation), as
        // Herdr's one runtime does. A fresh one costs nothing measurable next to
        // the load itself.
        let runtime = match &shared {
            Some(runtime) => runtime.clone(),
            None => ShellRuntime::new_isolated()?,
        };
        let failed: Rc<RefCell<Option<String>>> = Rc::default();
        let failure = failed.clone();
        let mounted: Rc<RefCell<Option<Entity<ShellRoot>>>> = Rc::default();
        let mount = mounted.clone();
        let loader = runtime.clone();
        let root = app.clone();
        let window: AnyWindowHandle = cx
            .open_window(viewport, move |window, cx| {
                let root = match loader.try_load(&root, window, cx) {
                    Ok(root) => root,
                    Err(error) => {
                        *failure.borrow_mut() = Some(format!("{error:#}"));
                        loader.load(&root, window, cx)
                    }
                };
                *mount.borrow_mut() = Some(root.clone());
                root
            })?
            .into();
        let root = mounted.borrow_mut().take().ok_or_else(|| anyhow!("the window has no root"))?;
        if let Some(error) = failed.borrow_mut().take() {
            emit(json!({ "type": "error", "src": label, "mode": item.mode, "message": error }));
            cx.update_window(window, |_, window, _| window.remove_window())?;
            cx.run_until_parked();
            if let Some(heap) = &shared_heap {
                emit_heap(heap, "failed", &label, &item.mode, tabs.len());
            }
            continue;
        }
        let loaded = started.elapsed();
        let first = settle(&mut cx, &runtime, window, &job)?;
        emit(json!({
            "type": "settled", "src": label, "mode": item.mode,
            "loadMs": ms(loaded), "settleMs": ms(first.wall), "simulatedMs": ms(first.simulated),
            "renders": first.renders, "timedOut": first.timed_out,
        }));

        for entry in &item.steps {
            let wall = Instant::now();
            let step = &entry.step;
            match step {
                Step::Shot(path) => {
                    let image = cx.capture_screenshot(window)?;
                    if let Some(dir) = path.parent() {
                        std::fs::create_dir_all(dir)?;
                    }
                    image.save(path).with_context(|| format!("writing {}", path.display()))?;
                    emit(json!({ "type": "shot", "src": label, "mode": item.mode, "path": path, "ms": ms(wall.elapsed()) }));
                    continue;
                }
                Step::Wait(time) => {
                    advance(&mut cx, window, *time)?;
                    emit(json!({ "type": "step", "src": label, "mode": item.mode, "step": format!("{step:?}"), "ms": ms(wall.elapsed()) }));
                    continue;
                }
                Step::Clipboard(_) => {
                    let text = cx.update(|cx| cx.read_from_clipboard().and_then(|c| c.text()));
                    emit(json!({ "type": "clipboard", "src": label, "mode": item.mode, "text": text }));
                    continue;
                }
                Step::Response(path) => {
                    let text = std::fs::read_to_string(path).with_context(|| format!("no file {}", path.display()))?;
                    CURRENT.with_borrow_mut(|current| current.response = Some(text));
                }
                step => {
                    let outcome = cx.update_window(window, |_, window, cx| perform(step, window, cx))?;
                    if let Err(error) = outcome {
                        emit(json!({ "type": "error", "src": label, "mode": item.mode, "step": format!("{step:?}"), "message": error }));
                        continue;
                    }
                }
            }
            if let Some(time) = entry.settle {
                advance(&mut cx, window, time)?;
                emit(json!({ "type": "step", "src": label, "mode": item.mode, "step": format!("{step:?}"), "ms": ms(wall.elapsed()) }));
                continue;
            }
            let settled = settle(&mut cx, &runtime, window, &job)?;
            emit(json!({
                "type": "step", "src": label, "mode": item.mode, "step": format!("{step:?}"),
                "ms": ms(wall.elapsed()), "simulatedMs": ms(settled.simulated), "timedOut": settled.timed_out,
            }));
        }

        if let Some(path) = &item.spec {
            let tree = cx.update_window(window, |root, window, cx| describe(root, window, cx))??;
            std::fs::write(path, tree).with_context(|| format!("writing {}", path.display()))?;
            emit(json!({ "type": "spec", "src": label, "mode": item.mode, "path": path }));
        }
        if job.shared_vm {
            tabs.push((label.clone(), item.mode.clone(), window, root));
            if let Some(heap) = &shared_heap {
                emit_heap(heap, "load", &label, &item.mode, tabs.len());
            }
        } else {
            if job.heap {
                emit_heap(&heap::Heap::find(&runtime)?, "load", &label, &item.mode, 1);
            }
            cx.update_window(window, |_, window, _| window.remove_window())?;
            cx.run_until_parked();
        }
        emit(json!({ "type": "done", "src": label, "mode": item.mode, "ms": ms(started.elapsed()) }));
    }

    // Closed in the order they were opened, each as Herdr closes a mod copy's
    // tab (herdr-app src/window.rs `remove_copy`): its final call with 250 ms
    // to settle, then the root goes.
    if let (Some(runtime), Some(heap)) = (&shared, &shared_heap) {
        while !tabs.is_empty() {
            let (label, mode, window, root) = tabs.remove(0);
            CURRENT.with_borrow_mut(|current| {
                current.src = label.clone();
                current.mode = mode.clone();
            });
            let deadline = Instant::now() + Duration::from_millis(250);
            cx.update_window(window, |_, window, cx| runtime.close(&root, deadline, window, cx).detach())?;
            advance(&mut cx, window, 300)?;
            cx.update_window(window, |_, window, _| window.remove_window())?;
            drop(root);
            for _ in 0..20 {
                cx.run_until_parked();
                cx.advance_clock(Duration::from_millis(16));
            }
            cx.run_until_parked();
            emit_heap(heap, "close", &label, &mode, tabs.len());
        }
    }
    Ok(())
}

fn emit_heap(heap: &heap::Heap, after: &str, label: &str, mode: &str, tabs: usize) {
    let mut line = json!({ "type": "heap", "after": after, "src": label, "mode": mode, "tabs": tabs });
    if let (Value::Object(line), Value::Object(usage)) = (&mut line, heap.measure()) {
        line.extend(usage);
    }
    emit(line);
}

/// Refuses to run unless Herdr's runtime is the one this harness is built on:
/// line 3 of Herdr's gpui-kit.d.ts must name the pinned gpui-shell version,
/// and the whole file (the script surface Herdr's runtime generates) must equal
/// the one the harness's runtime generates. Herdr patches its vendored copy
/// without changing the version, so the second check is the one that catches
/// an update. No Herdr config at all is not an error: the pin is then the only
/// statement of the runtime.
fn check_pin() -> Result<()> {
    let path = PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".config/herdr-app/gpui-kit.d.ts");
    let Ok(text) = std::fs::read_to_string(&path) else {
        return Ok(());
    };
    let line = text.lines().nth(2).unwrap_or_default();
    let herdr = line
        .split("gpui-shell ")
        .nth(1)
        .map(|rest| rest.trim().trim_end_matches('.'))
        .ok_or_else(|| anyhow!("{}: line 3 does not name a gpui-shell version: {line:?}", path.display()))?;
    let moved = "Move the pin to the installed Herdr: every `tag` in tools/oui-harness/Cargo.toml to its \
                 herdr-app version (and GPUI_SHELL_VERSION in src/main.rs to line 3), then \
                 `cargo build --release` there.";
    if herdr != GPUI_SHELL_VERSION {
        bail!("Herdr runs gpui-shell {herdr} ({}), the harness is built on {GPUI_SHELL_VERSION}. {moved}", path.display());
    }
    if gpui_shell::type_declarations(&gpui_shell::FrozenComponentRegistry::default()) != text {
        bail!(
            "Herdr's gpui-shell {herdr} declares another script surface ({}) than the harness's: \
             Herdr changed its vendored runtime. {moved}",
            path.display()
        );
    }
    Ok(())
}

fn font_files(dir: &Path) -> Result<Vec<Cow<'static, [u8]>>> {
    let mut fonts = Vec::new();
    for entry in std::fs::read_dir(dir).with_context(|| format!("no font folder {}", dir.display()))? {
        let path = entry?.path();
        if matches!(path.extension().and_then(|e| e.to_str()), Some("ttf" | "otf")) {
            fonts.push(Cow::Owned(std::fs::read(&path)?));
        }
    }
    Ok(fonts)
}

/// What the view being created draws, and where its emitted lines belong.
#[derive(Default)]
struct Current {
    src: String,
    mode: String,
    job: Option<HostValue>,
    /// The text the last "response" step handed over, until the script takes it.
    response: Option<String>,
    /// The left button is down (a "down" step without its "up" yet).
    pressed: bool,
}

thread_local! {
    static CURRENT: RefCell<Current> = RefCell::default();
}

/// `clock` is how far the simulated clock has run, in ms: the script adds it to
/// `Date.now()`, so code that times itself by the wall clock (watchdogs that
/// restart a stalled task, redraw throttles) sees simulated sleeps pass.
fn host_module(families: Vec<String>, executor: gpui::BackgroundExecutor) -> HostModule {
    let start = executor.now();
    HostModule::new("oui-harness")
        .function("job", |_| Ok(CURRENT.with_borrow(|current| current.job.clone().unwrap_or(HostValue::Null))))
        .function("response", |_| {
            Ok(CURRENT.with_borrow_mut(|current| current.response.take().map_or(HostValue::Null, HostValue::Str)))
        })
        .function("fonts", move |_| Ok(HostValue::Array(families.iter().cloned().map(HostValue::Str).collect())))
        .function("clock", move |_| Ok(HostValue::Number((executor.now() - start).as_secs_f64() * 1000.)))
        .function("emit", |arguments| {
            let line = arguments.string(0)?;
            emit(serde_json::from_str(line).unwrap_or_else(|_| json!({ "type": "message", "text": line })));
            Ok(HostValue::Null)
        })
}

/// One JSON line on stdout. A line that names no file belongs to the one
/// being drawn: the script's actions and the runtime's log lines get its src
/// and mode.
pub(crate) fn emit(mut value: Value) {
    use std::io::Write as _;
    if let Value::Object(fields) = &mut value
        && !fields.contains_key("src")
    {
        CURRENT.with_borrow(|current| {
            if !current.src.is_empty() {
                fields.insert("src".into(), current.src.clone().into());
                fields.insert("mode".into(), current.mode.clone().into());
            }
        });
    }
    let mut out = std::io::stdout().lock();
    let _ = writeln!(out, "{value}");
    let _ = out.flush();
}

fn ms(duration: Duration) -> u64 {
    duration.as_millis() as u64
}

struct Settled {
    wall: Duration,
    simulated: Duration,
    renders: u64,
    timed_out: bool,
}

/// Runs tasks and simulated time until the view is settled (see the header):
/// draws, then jumps the clock to the next timer, until `quiet_ms` pass with no
/// script render or the next timer is due after them.
fn settle(cx: &mut HeadlessAppContext, runtime: &Rc<ShellRuntime>, window: AnyWindowHandle, job: &Job) -> Result<Settled> {
    let wall = Instant::now();
    let executor = cx.background_executor().clone();
    let dispatcher = executor.dispatcher().as_test().ok_or_else(|| anyhow!("not a test executor"))?.clone();
    let quiet = Duration::from_millis(job.quiet_ms);
    let start = executor.now();
    let first_renders = runtime.read_metrics().script_renders();
    let mut quiet_since = start;
    loop {
        let before = runtime.read_metrics().script_renders();
        cx.run_until_parked();
        cx.update_window(window, |_, window, cx| window.draw(cx).clear(cx))?;
        cx.run_until_parked();
        let now = executor.now();
        if runtime.read_metrics().script_renders() != before {
            quiet_since = now;
        }
        let settled = now >= quiet_since + quiet || !dispatcher.advance_clock_to_next_timer() || executor.now() > quiet_since + quiet;
        let timed_out = !settled && now - start >= Duration::from_millis(job.max_ms);
        if settled || timed_out {
            return Ok(Settled {
                wall: wall.elapsed(),
                simulated: quiet_since - start,
                renders: runtime.read_metrics().script_renders() - first_renders,
                timed_out,
            });
        }
    }
}

/// Runs `time` ms of simulated time in 16 ms frames, drawing each, whether or
/// not the view settles meanwhile.
fn advance(cx: &mut HeadlessAppContext, window: AnyWindowHandle, time: u64) -> Result<()> {
    let mut left = time;
    loop {
        cx.run_until_parked();
        cx.update_window(window, |_, window, cx| window.draw(cx).clear(cx))?;
        cx.run_until_parked();
        if left == 0 {
            return Ok(());
        }
        let frame = left.min(16);
        cx.advance_clock(Duration::from_millis(frame));
        left -= frame;
    }
}

fn perform(step: &Step, window: &mut Window, cx: &mut App) -> Result<(), String> {
    match step {
        Step::Click(target) => {
            let position = locate(window, target, cx)?;
            pointer(window, MouseMoveEvent { position, pressed_button: None, modifiers: Default::default() }.to_platform_input(), cx);
            button(window, position, true, cx);
            button(window, position, false, cx);
        }
        Step::Hover(target) => {
            let position = locate(window, target, cx)?;
            pointer(window, MouseMoveEvent { position, pressed_button: None, modifiers: Default::default() }.to_platform_input(), cx);
        }
        Step::Down(target) => {
            let position = locate(window, target, cx)?;
            pointer(window, MouseMoveEvent { position, pressed_button: None, modifiers: Default::default() }.to_platform_input(), cx);
            button(window, position, true, cx);
        }
        Step::Move(target) => {
            let position = locate(window, target, cx)?;
            let pressed_button = CURRENT.with_borrow(|c| c.pressed).then_some(MouseButton::Left);
            pointer(window, MouseMoveEvent { position, pressed_button, modifiers: Default::default() }.to_platform_input(), cx);
        }
        Step::Up(target) => {
            let position = locate(window, target, cx)?;
            let pressed_button = CURRENT.with_borrow(|c| c.pressed).then_some(MouseButton::Left);
            pointer(window, MouseMoveEvent { position, pressed_button, modifiers: Default::default() }.to_platform_input(), cx);
            button(window, position, false, cx);
        }
        Step::Drag((x1, y1, x2, y2)) => {
            let from = point(px(*x1), px(*y1));
            pointer(window, MouseMoveEvent { position: from, pressed_button: None, modifiers: Default::default() }.to_platform_input(), cx);
            button(window, from, true, cx);
            for i in 1..=10 {
                let t = i as f32 / 10.;
                let position = point(px(x1 + (x2 - x1) * t), px(y1 + (y2 - y1) * t));
                let event = MouseMoveEvent { position, pressed_button: Some(MouseButton::Left), modifiers: Default::default() };
                pointer(window, event.to_platform_input(), cx);
            }
            button(window, point(px(*x2), px(*y2)), false, cx);
        }
        Step::Scroll(values) => {
            let [x, y, dy, rest @ ..] = values.as_slice() else {
                return Err("scroll takes [x, y, dy] or [x, y, dy, dx]".into());
            };
            let dx = match rest {
                [] => 0.,
                [dx] => *dx,
                _ => return Err("scroll takes [x, y, dy] or [x, y, dy, dx]".into()),
            };
            let position = point(px(*x), px(*y));
            let pressed_button = CURRENT.with_borrow(|c| c.pressed).then_some(MouseButton::Left);
            pointer(window, MouseMoveEvent { position, pressed_button, modifiers: Default::default() }.to_platform_input(), cx);
            // A wheel's delta moves content the other way: dy > 0 reads further down.
            let delta = ScrollDelta::Pixels(point(px(-dx), px(-*dy)));
            pointer(window, ScrollWheelEvent { position, delta, ..Default::default() }.to_platform_input(), cx);
        }
        Step::Resize((width, height)) => {
            window.resize(size(px(*width), px(*height)));
            window.bounds_changed(cx);
            render_frame(window, cx);
        }
        Step::Key(key) => {
            let keystroke = Keystroke::parse(key).map_err(|e| format!("not a keystroke: {key}: {e}"))?;
            press(window, keystroke, cx);
            render_frame(window, cx);
        }
        Step::Type(text) => {
            for character in text.chars() {
                let typed = character.to_string();
                let name = if character == ' ' { "space" } else { typed.as_str() };
                let mut keystroke = Keystroke::parse(name).map_err(|e| format!("can't type {typed:?}: {e}"))?;
                keystroke.key_char = Some(typed);
                window.dispatch_keystroke(keystroke, cx);
                render_frame(window, cx);
            }
        }
        Step::Shot(_) | Step::Wait(_) | Step::Clipboard(_) | Step::Response(_) => {
            unreachable!("run outside the window update")
        }
    }
    Ok(())
}

/// GPUI Kit's `press` (gpui_kit::test, not vendored by Herdr): Enter and Tab run
/// their bindings without the simulated IME also inserting text; every other key
/// goes through it. The key-up always follows, since buttons act on it.
fn press(window: &mut Window, keystroke: Keystroke, cx: &mut App) {
    let keystroke = if matches!(keystroke.key.as_str(), "enter" | "tab") {
        window.dispatch_event(KeyDownEvent { keystroke: keystroke.clone(), is_held: false, prefer_character_input: false }.to_platform_input(), cx);
        keystroke
    } else {
        let keystroke = keystroke.with_simulated_ime();
        window.dispatch_keystroke(keystroke.clone(), cx);
        keystroke
    };
    window.dispatch_event(KeyUpEvent { keystroke }.to_platform_input(), cx);
}

/// The left button down or up at a point; "move" steps carry it while it is down.
fn button(window: &mut Window, position: Point<Pixels>, down: bool, cx: &mut App) {
    CURRENT.with_borrow_mut(|c| c.pressed = down);
    let event = if down {
        MouseDownEvent { button: MouseButton::Left, position, modifiers: Default::default(), click_count: 1, first_mouse: false }
            .to_platform_input()
    } else {
        MouseUpEvent { button: MouseButton::Left, position, modifiers: Default::default(), click_count: 1 }.to_platform_input()
    };
    pointer(window, event, cx);
}

fn render_frame(window: &mut Window, cx: &mut App) {
    window.refresh();
    window.draw(cx).clear(cx);
}

fn pointer(window: &mut Window, event: gpui::PlatformInput, cx: &mut App) {
    window.dispatch_event(event, cx);
    render_frame(window, cx);
}

/// A target's centre. Ids resolve through gpui-base's test observation, which
/// covers its controls (AccordionTrigger, Button, Input, Select, Tab, …) and
/// names each by its own element id as GPUI prints it (the `--spec` file lists
/// them). A script `div` with an id is not observed: aim at it with a point.
fn locate(window: &mut Window, target: &Target, cx: &mut App) -> Result<Point<Pixels>, String> {
    match target {
        Target::Point(x, y) => Ok(point(px(*x), px(*y))),
        Target::Id(id) => {
            render_frame(window, cx);
            let matches: Vec<_> = test_support::snapshots(window)
                .into_iter()
                .filter(|s| s.path().last().is_some_and(|last| last.to_string() == *id))
                .collect();
            let found = match matches.as_slice() {
                [one] => one,
                [] => return Err(format!("no observed element with id {id:?} (the --spec file lists them); aim at a point instead")),
                many => return Err(format!("{} observed elements have id {id:?}", many.len())),
            };
            if !found.visible() {
                return Err(format!("element {id:?} is not visible (bounds {:?})", found.bounds()));
            }
            Ok(found.bounds().center())
        }
    }
}

/// The settled view's element description (the script root's snapshot), then
/// the elements a step can name by id, with their bounds.
fn describe(root: gpui::AnyView, window: &mut Window, cx: &mut App) -> Result<String> {
    let shell = root.downcast::<gpui_shell::ShellRoot>().map_err(|_| anyhow!("the window root is not a ShellRoot"))?;
    let content = shell.read(cx).content().clone();
    let view = content.downcast::<ScriptView>().map_err(|_| anyhow!("the shell root holds no script view"))?;
    let view = view.read(cx);
    if let Some(error) = view.build_error() {
        bail!("{error}");
    }
    let mut out = view.snapshot().map(|s| s.debug_tree()).unwrap_or_default();
    let mut targets: Vec<_> = test_support::snapshots(window)
        .into_iter()
        .filter_map(|s| {
            let id = s.path().last()?.to_string();
            let b = s.bounds();
            let at = format!("{:.0},{:.0} {:.0}x{:.0}", f32::from(b.origin.x), f32::from(b.origin.y), f32::from(b.size.width), f32::from(b.size.height));
            Some((f32::from(b.origin.y), f32::from(b.origin.x), format!("{id}  {at}{}", if s.visible() { "" } else { "  (hidden)" })))
        })
        .collect();
    targets.sort_by(|a, b| a.0.total_cmp(&b.0).then(a.1.total_cmp(&b.1)));
    out.push_str("\n\n# Observed elements: a step's \"click\"/\"hover\" id, then x,y wxh in the window\n");
    for (_, _, line) in targets {
        out.push_str(&line);
        out.push('\n');
    }
    Ok(out)
}

/// The script directory's assets, and the files the harness's image loader
/// hands `image()` by absolute path. gpui-shell keys an image by its path
/// relative to the root (`/Users/a.png` arrives as `Users/a.png`), so a path
/// the script directory does not have is looked up from `/`.
struct Assets(AppAssets, PathBuf);

impl AssetSource for Assets {
    fn load(&self, path: &str) -> Result<Option<Cow<'static, [u8]>>> {
        let absolute = Path::new("/").join(path);
        if !self.1.join(path).exists() && absolute.is_file() {
            return Ok(Some(Cow::Owned(std::fs::read(absolute)?)));
        }
        self.0.load(path)
    }

    fn list(&self, path: &str) -> Result<Vec<SharedString>> {
        self.0.list(path)
    }
}
