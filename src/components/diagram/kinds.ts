// The lucide icon each NODE_KINDS kind draws, shared by every diagram type that shows kinds
// (Diagram boxes, Sequence participants). Each name resolves to a lucide file (render/icons.ts).
import type { NodeKind } from "../../diagram/types.ts";

export const KIND_ICON: Record<NodeKind, string> = {
  actor: "User",
  process: "Cpu",
  module: "Package",
  file: "FileText",
  store: "Database",
  external: "Cloud",
  decision: "Diamond",
  start: "Play",
  end: "Flag",
  event: "Zap",
  task: "SquareCheck",
  service: "Server",
  queue: "Layers",
  ui: "AppWindow",
};
