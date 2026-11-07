// oui-poke: delivers synthetic mouse and keyboard input to one background Herdr
// preview window, without moving the person's pointer or changing focus.
//
// Events are built for the target window and posted straight to its process with
// CGEventPostToPid, so the window server never routes them by the real pointer and
// never activates the app (the technique ghostpoke describes, github.com/yushaw/ghostpoke).
// What a gpui window needs, measured against Herdr 0.1.13:
// - clicks and drags: the window number in fields 91/92 and the window-local point
//   stamped with CGEventSetWindowLocation (without the stamp no click lands);
// - the wheel: also the window number in field 51 and the target pid in field 40
//   (cua-driver's recipe; without them the event follows the real pointer);
// - hover: gpui's normal windows take mouse moves only from their tracking area, so a
//   posted mouseMoved is dropped; `hover` sends a drag event instead, which gpui turns
//   into a mouse move with the button reported down;
// - keys and text go to the app's key window.
//
// Safety: it only ever targets a process that has a Herdr preview home open
// (a path containing "/.config/herdr-preview"), never the person's own Herdr window.
//
// Run it through LaunchServices (`open -W -g -n OuiPoke.app --args …`) so macOS
// attributes the Accessibility permission to OuiPoke.app itself, not to the terminal.
//
//   oui-poke <pid> info
//   oui-poke <pid> click <x> <y> [--count n] [--button left|right] [--cmd]
//   oui-poke <pid> hover <x> <y>
//   oui-poke <pid> down <x> <y> | up <x> <y>
//   oui-poke <pid> drag <x1> <y1> <x2> <y2> [--steps n]
//   oui-poke <pid> scroll <x> <y> <dx> <dy> [--steps n]   (pixels; negative dy reveals what is below)
//   oui-poke <pid> key <keycode> [--cmd] [--shift] [--alt] [--ctrl]
//   oui-poke <pid> type <text>
//
// x, y are window-local points, origin at the window's top-left corner.
import AppKit
import ApplicationServices
import Foundation

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

func out(_ object: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!)
}

var args = Array(CommandLine.arguments.dropFirst())
func flag(_ name: String) -> Bool {
    if let i = args.firstIndex(of: name) { args.remove(at: i); return true }
    return false
}
func option(_ name: String) -> String? {
    guard let i = args.firstIndex(of: name), i + 1 < args.count else { return nil }
    let value = args[i + 1]
    args.removeSubrange(i...(i + 1))
    return value
}

let cmd = flag("--cmd"), shift = flag("--shift"), alt = flag("--alt"), ctrl = flag("--ctrl")
let count = Int(option("--count") ?? "1") ?? 1
let steps = Int(option("--steps") ?? "12") ?? 12
let button = option("--button") ?? "left"

guard args.count >= 2, let pid = pid_t(args[0]) else {
    fail("usage: oui-poke <pid> info|click|move|down|up|drag|scroll|key|type …")
}
let action = args[1]
let rest = Array(args.dropFirst(2))
func num(_ i: Int) -> Double {
    guard i < rest.count, let v = Double(rest[i]) else { fail("\(action): missing number #\(i + 1)") }
    return v
}

// --- Safety: only Herdr preview windows ------------------------------------------

func isPreviewProcess(_ pid: pid_t) -> Bool {
    let lsof = Process()
    lsof.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
    lsof.arguments = ["-a", "-p", String(pid), "-Fn"]
    let pipe = Pipe()
    lsof.standardOutput = pipe
    lsof.standardError = FileHandle.nullDevice
    do { try lsof.run() } catch { return false }
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    lsof.waitUntilExit()
    let text = String(data: data, encoding: .utf8) ?? ""
    let isHerdr = NSRunningApplication(processIdentifier: pid)?.bundleURL?.lastPathComponent == "Herdr.app"
    return isHerdr && text.contains("/.config/herdr-preview")
}

guard isPreviewProcess(pid) else {
    fail("pid \(pid) is not a Herdr preview window (no ~/.config/herdr-preview* home open); refusing")
}
// The first refusal also asks macOS to list OuiPoke under Accessibility, switched off.
guard AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue(): true] as CFDictionary) else {
    fail("OuiPoke.app needs Accessibility: System Settings > Privacy & Security > Accessibility")
}

// --- The target window -------------------------------------------------------------

struct Target { let number: Int; let frame: CGRect }

func targetWindow() -> Target {
    let list = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] ?? []
    var best: Target?
    for w in list {
        guard (w[kCGWindowOwnerPID as String] as? Int).map(pid_t.init) == pid,
              (w[kCGWindowLayer as String] as? Int) == 0,
              let number = w[kCGWindowNumber as String] as? Int,
              let b = w[kCGWindowBounds as String] as? [String: Double] else { continue }
        let frame = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 0, height: b["Height"] ?? 0)
        if frame.width < 200 || frame.height < 200 { continue }
        if best == nil || frame.width * frame.height > best!.frame.width * best!.frame.height {
            best = Target(number: number, frame: frame)
        }
    }
    guard let found = best else { fail("pid \(pid) has no window") }
    return found
}

let window = targetWindow()

// --- Events ------------------------------------------------------------------------

let windowUnderPointer = CGEventField(rawValue: 91)!
let windowThatCanHandle = CGEventField(rawValue: 92)!

var flags: CGEventFlags {
    var f = CGEventFlags()
    if cmd { f.insert(.maskCommand) }
    if shift { f.insert(.maskShift) }
    if alt { f.insert(.maskAlternate) }
    if ctrl { f.insert(.maskControl) }
    return f
}

/// Screen point (global, top-left origin) of a window-local point.
func screen(_ x: Double, _ y: Double) -> CGPoint {
    CGPoint(x: window.frame.minX + x, y: window.frame.minY + y)
}

var eventNumber = Int(Date().timeIntervalSince1970 * 1000) & 0x7fff_ffff

// Private CoreGraphics call that stamps a window-local point (top-left origin) on an
// event. Without it a gpui window drops posted clicks (measured: 0 of 3 landed, 3 of 3
// with it); ghostpoke uses it the same way.
typealias SetWindowLocation = @convention(c) (CGEvent, CGPoint) -> Void
let setWindowLocation: SetWindowLocation = {
    guard let handle = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", RTLD_NOW),
          let symbol = dlsym(handle, "CGEventSetWindowLocation") else { fail("CGEventSetWindowLocation is missing") }
    return unsafeBitCast(symbol, to: SetWindowLocation.self)
}()

func mouse(_ type: NSEvent.EventType, _ x: Double, _ y: Double, clicks: Int = 1, buttonNumber: Int64 = 0) {
    // NSEvent locations in a window are bottom-left based.
    let local = NSPoint(x: x, y: window.frame.height - y)
    eventNumber += 1
    guard let ns = NSEvent.mouseEvent(
        with: type, location: local, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
        windowNumber: window.number, context: nil, eventNumber: eventNumber, clickCount: clicks, pressure: 1
    ), let cg = ns.cgEvent else { fail("could not build a \(type) event") }
    cg.setIntegerValueField(.mouseEventButtonNumber, value: buttonNumber)
    cg.setIntegerValueField(windowUnderPointer, value: Int64(window.number))
    cg.setIntegerValueField(windowThatCanHandle, value: Int64(window.number))
    cg.location = screen(x, y)
    cg.flags = flags
    setWindowLocation(cg, CGPoint(x: x, y: y))
    cg.postToPid(pid)
}

func pause(_ ms: Int) { usleep(useconds_t(ms * 1000)) }

let right = button == "right"
let downType: NSEvent.EventType = right ? .rightMouseDown : .leftMouseDown
let upType: NSEvent.EventType = right ? .rightMouseUp : .leftMouseUp
let dragType: NSEvent.EventType = right ? .rightMouseDragged : .leftMouseDragged
let buttonNumber: Int64 = right ? 1 : 0

switch action {
case "info":
    out(["pid": Int(pid), "window": window.number,
         "x": window.frame.minX, "y": window.frame.minY, "width": window.frame.width, "height": window.frame.height])
case "hover":
    mouse(.leftMouseDragged, num(0), num(1), clicks: 0)
case "down":
    mouse(downType, num(0), num(1), buttonNumber: buttonNumber)
case "up":
    mouse(upType, num(0), num(1), buttonNumber: buttonNumber)
case "click":
    let (x, y) = (num(0), num(1))
    mouse(.leftMouseDragged, x, y, clicks: 0)
    pause(20)
    for i in 1...max(1, count) {
        mouse(downType, x, y, clicks: i, buttonNumber: buttonNumber)
        pause(30)
        mouse(upType, x, y, clicks: i, buttonNumber: buttonNumber)
        pause(60)
    }
case "drag":
    let (x1, y1, x2, y2) = (num(0), num(1), num(2), num(3))
    mouse(.leftMouseDragged, x1, y1, clicks: 0)
    pause(20)
    mouse(downType, x1, y1, buttonNumber: buttonNumber)
    pause(30)
    for i in 1...max(1, steps) {
        let t = Double(i) / Double(max(1, steps))
        mouse(dragType, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, clicks: 0, buttonNumber: buttonNumber)
        pause(16)
    }
    mouse(upType, x2, y2, buttonNumber: buttonNumber)
case "scroll":
    // dx, dy in pixels; negative dy reveals content below. Like cua-driver's background
    // wheel: the window number in fields 51/91/92 and the target pid in field 40 (without
    // them the event is routed by the real pointer and dropped).
    let (x, y, dx, dy) = (num(0), num(1), num(2), num(3))
    mouse(.leftMouseDragged, x, y, clicks: 0)
    pause(20)
    let ticks = max(1, steps)
    for _ in 0..<ticks {
        guard let cg = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 2,
                               wheel1: Int32(dy / Double(ticks)), wheel2: Int32(dx / Double(ticks)), wheel3: 0)
        else { fail("could not build a scroll event") }
        cg.location = screen(x, y)
        setWindowLocation(cg, CGPoint(x: x, y: y))
        for field: UInt32 in [51, 91, 92] { cg.setIntegerValueField(CGEventField(rawValue: field)!, value: Int64(window.number)) }
        cg.setIntegerValueField(CGEventField(rawValue: 40)!, value: Int64(pid))
        cg.flags = flags
        cg.postToPid(pid)
        pause(16)
    }
case "key":
    guard let code = CGKeyCode(rest.first ?? "") else { fail("key: needs a keycode") }
    for down in [true, false] {
        guard let cg = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: down) else { fail("could not build a key event") }
        cg.flags = flags
        cg.postToPid(pid)
        pause(15)
    }
case "type":
    let text = rest.joined(separator: " ")
    for unit in text.utf16 {
        for down in [true, false] {
            guard let cg = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: down) else { fail("could not build a key event") }
            var u = unit
            cg.keyboardSetUnicodeString(stringLength: 1, unicodeString: &u)
            cg.postToPid(pid)
            pause(10)
        }
    }
default:
    fail("unknown action \(action)")
}
pause(30)
