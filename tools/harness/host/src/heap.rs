//! The script heap of a `ShellRuntime`: QuickJS's own accounting
//! (`JS_ComputeMemoryUsage`), the numbers its 256 MiB limit is checked against.
//!
//! gpui-shell keeps its QuickJS runtime private, so the runtime is found the
//! way a debugger would: `ShellRuntime` holds its rquickjs `Context` inline,
//! and that holds the `JSContext` pointer. Every word of the `ShellRuntime`
//! that is the start of a malloc block is a candidate; a candidate is the
//! context when its `rt` is a malloc block too, whose opaque (rquickjs's
//! per-runtime state) is one, that the runtime's own handle (another word of
//! the `ShellRuntime`, an `Rc` block) points at, and whose memory limit is the
//! sandbox's. Nothing is read from a block before `malloc_size` has said it is
//! one and large enough. If gpui-shell's layout ever stops matching, the
//! harness says so rather than guessing.

use anyhow::{Result, bail};
use gpui_shell::ShellRuntime;
use rquickjs_sys::{JS_ComputeMemoryUsage, JS_GetRuntime, JS_GetRuntimeOpaque, JS_RunGC, JSMemoryUsage, JSRuntime};
use serde_json::{Value, json};
use std::{ffi::c_void, mem::size_of, rc::Rc};

/// gpui-kit's sandbox (`engine/quickjs/sandbox.rs` `memory_limit_bytes`).
const LIMIT: i64 = 256 << 20;

unsafe extern "C" {
    fn malloc_size(ptr: *const c_void) -> usize;
}

fn block(word: usize) -> usize {
    if word < 4096 || word % 8 != 0 {
        return 0;
    }
    unsafe { malloc_size(word as *const c_void) }
}

fn words(start: *const u8, bytes: usize) -> impl Iterator<Item = usize> {
    (0..bytes / size_of::<usize>()).map(move |i| unsafe { (start as *const usize).add(i).read_unaligned() })
}

pub struct Heap(*mut JSRuntime);

impl Heap {
    pub fn find(runtime: &Rc<ShellRuntime>) -> Result<Self> {
        let start = Rc::as_ptr(runtime) as *const u8;
        let fields: Vec<usize> = words(start, size_of::<ShellRuntime>()).collect();
        for &context in &fields {
            if block(context) < 64 {
                continue;
            }
            let rt = unsafe { JS_GetRuntime(context as *mut _) } as usize;
            if block(rt) < 512 {
                continue;
            }
            let opaque = unsafe { JS_GetRuntimeOpaque(rt as *mut _) } as usize;
            if block(opaque) == 0 {
                continue;
            }
            let owned = fields.iter().any(|&handle| {
                let size = block(handle);
                size > 0 && size <= 4096 && words(handle as *const u8, size).any(|w| w == rt)
            });
            if !owned {
                continue;
            }
            let heap = Heap(rt as *mut JSRuntime);
            if heap.usage().malloc_limit == LIMIT {
                return Ok(heap);
            }
        }
        bail!("could not find the QuickJS runtime inside gpui-shell's ShellRuntime (its layout changed?)")
    }

    fn usage(&self) -> JSMemoryUsage {
        let mut usage: JSMemoryUsage = unsafe { std::mem::zeroed() };
        unsafe { JS_ComputeMemoryUsage(self.0, &mut usage) };
        usage
    }

    /// What the heap holds now (`malloc` is what the limit is checked
    /// against, garbage included), then what it holds after a full collection
    /// (`live`, and where it goes). Only between script calls: the harness
    /// calls it with the app parked.
    pub fn measure(&self) -> Value {
        let before = self.usage().malloc_size;
        unsafe { JS_RunGC(self.0) };
        let u = self.usage();
        let mib = |bytes: i64| (bytes as f64 / 1048576. * 10.).round() / 10.;
        json!({
            "mallocMiB": mib(before),
            "liveMiB": mib(u.malloc_size),
            "limitMiB": mib(u.malloc_limit),
            "mallocCount": u.malloc_count,
            "objects": { "count": u.obj_count, "MiB": mib(u.obj_size) },
            "properties": { "count": u.prop_count, "MiB": mib(u.prop_size) },
            "shapes": { "count": u.shape_count, "MiB": mib(u.shape_size) },
            "strings": { "count": u.str_count, "MiB": mib(u.str_size) },
            "atoms": { "count": u.atom_count, "MiB": mib(u.atom_size) },
            "functions": {
                "count": u.js_func_count, "MiB": mib(u.js_func_size),
                "codeMiB": mib(u.js_func_code_size), "pc2lineMiB": mib(u.js_func_pc2line_size),
            },
            "arrays": { "count": u.array_count, "fast": u.fast_array_count, "elements": u.fast_array_elements },
            "binary": { "count": u.binary_object_count, "MiB": mib(u.binary_object_size) },
        })
    }
}
