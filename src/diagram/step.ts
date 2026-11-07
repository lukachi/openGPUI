// DiagramStep: the numbered step every diagram type takes (Diagram, Sequence, Timeline). Its own
// module so the types' definitions can reference it while components.ts imports them all.
import { action, defineComponent } from "@openuidev/lang-core";
import { z } from "zod";

export const DiagramStep = defineComponent({
  name: "DiagramStep",
  props: z.object({
    title: z.string(),
    details: z.string(),
    highlight: z.array(z.string()),
    action: action().optional(),
  }),
  description:
    "A numbered step under a Diagram, Sequence or Timeline. details is markdown. highlight lists the ids it lights: in a Diagram node ids and edge ids (from>to; an edge lights both its ends), in a Sequence participant ids and message numbers (\"3\"), in a Timeline task ids.",
  component: null,
});
