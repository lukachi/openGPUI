//! The runtime reports script errors, unhandled rejections and illegal-phase
//! calls through `tracing`; with no subscriber they vanish. Warnings, errors
//! and the script's own console become `{"type":"log"}` lines on stdout, next
//! to the actions.

use serde_json::json;
use std::fmt::{self, Write as _};
use tracing::{
    Event, Level, Metadata, Subscriber,
    field::{Field, Visit},
    level_filters::LevelFilter,
    span,
};

pub fn install() {
    let _ = tracing::subscriber::set_global_default(Sink);
}

struct Sink;

impl Subscriber for Sink {
    fn enabled(&self, metadata: &Metadata<'_>) -> bool {
        *metadata.level() <= Level::WARN || metadata.target().starts_with("gpui_shell::script")
    }

    fn max_level_hint(&self) -> Option<LevelFilter> {
        Some(LevelFilter::TRACE)
    }

    fn new_span(&self, _: &span::Attributes<'_>) -> span::Id {
        span::Id::from_u64(1)
    }

    fn record(&self, _: &span::Id, _: &span::Record<'_>) {}

    fn record_follows_from(&self, _: &span::Id, _: &span::Id) {}

    fn event(&self, event: &Event<'_>) {
        let mut fields = Fields::default();
        event.record(&mut fields);
        crate::emit(json!({
            "type": "log",
            "level": event.metadata().level().as_str(),
            "target": event.metadata().target(),
            "message": fields.0,
        }));
    }

    fn enter(&self, _: &span::Id) {}

    fn exit(&self, _: &span::Id) {}
}

#[derive(Default)]
struct Fields(String);

impl Visit for Fields {
    fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
        if !self.0.is_empty() {
            self.0.push(' ');
        }
        let _ = if field.name() == "message" {
            write!(self.0, "{value:?}")
        } else {
            write!(self.0, "{}={value:?}", field.name())
        };
    }
}
