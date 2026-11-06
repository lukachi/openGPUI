import { describe, expect, test } from "bun:test";
import type { ActionEvent } from "@openuidev/lang-core";
import { libraries, Session, subsetLibrary } from "./lib.ts";

function session(text: string, onAction?: (e: ActionEvent) => void) {
  const s = new Session({ library: libraries.openui.library, onAction });
  s.setResponse(text);
  s.update();
  return s;
}

/** The ActionPlan a Button carries, as the evaluator hands it to the renderer. */
function buttonAction(s: Session, index = 0): unknown {
  const buttons: unknown[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if ("typeName" in v && v.typeName === "Button" && "props" in v && v.props && typeof v.props === "object" && "action" in v.props) {
        buttons.push(v.props.action);
      }
      Object.values(v).forEach(walk);
    }
  };
  walk(s.root);
  return buttons[index];
}

describe("subsetLibrary", () => {
  test("dropped components get no signature, no example and no note", () => {
    const sub = subsetLibrary(libraries.openui, ["Stack", "TextContent", "Button", "Buttons", "Form", "FormControl", "Input"]);
    const prompt = sub.library.prompt(sub.promptOptions);
    expect(prompt).toMatch(/^Input\(/m);
    for (const dropped of ["Accordion", "Modal", "Tabs", "PieChart", "Select"]) {
      expect(prompt).not.toMatch(new RegExp(`^${dropped}\\(`, "m"));
      expect(prompt).not.toMatch(new RegExp(`= ${dropped}\\(`));
    }
    // Upstream unions still name them (FormControl's input), so availability is stated outright.
    expect(prompt).toContain("Only the components listed under Component Signatures exist here.");
  });
});

describe("actions", () => {
  test("plan steps run in order: @Set lands before @ToAssistant reads the state", async () => {
    const events: ActionEvent[] = [];
    const s = session(
      `root = Stack([b])\n$n = 1\nb = Button("Go", Action([@Set($n, 2), @ToAssistant("done")]))`,
      (e) => events.push(e),
    );
    await s.triggerAction("Go", undefined, buttonAction(s) as never);
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("continue_conversation");
    expect(events[0]!.humanFriendlyMessage).toBe("done");
    expect(events[0]!.formState).toMatchObject({ $n: 2 });
  });

  test("a form's action carries that form's fields", async () => {
    const events: ActionEvent[] = [];
    const s = session(`root = Stack([b])\nb = Button("Send", @ToAssistant("send"))`, (e) => events.push(e));
    s.setFieldValue("contact", "Input", "email", "a@b.c");
    s.setFieldValue("other", "Input", "x", "y");
    await s.triggerAction("Send", "contact", buttonAction(s) as never);
    expect(events[0]!.formName).toBe("contact");
    expect(events[0]!.formState).toEqual({ contact: { email: { value: "a@b.c", componentType: "Input" } } });
  });

  test("@Reset restores declared defaults", async () => {
    const s = session(`root = Stack([b])\n$q = "start"\nb = Button("Reset", @Reset($q))`);
    s.store.set("$q", "typed");
    await s.triggerAction("Reset", undefined, buttonAction(s) as never);
    expect(s.store.get("$q")).toBe("start");
  });

  test("a framed response still streaming holds actions back", async () => {
    const events: ActionEvent[] = [];
    const s = new Session({ library: libraries.openui.library, onAction: (e) => events.push(e) });
    s.setResponse(`]]>openui:content\nroot = Stack([b])\nb = Button("Go", @ToAssistant("go"))\n`, true);
    s.update();
    expect(s.blocked).toBe(true);
    await s.triggerAction("Go", undefined, null);
    expect(events).toHaveLength(0);
  });
});

describe("errors", () => {
  test("a render failure is reported on the next update", () => {
    const s = session(`root = Stack([t])\nt = TextContent("x")`);
    expect(s.errors).toEqual([]);
    s.reportRenderError({ source: "runtime", code: "render-error", component: "TextContent", message: "boom" });
    s.update();
    expect(s.errors.map((e) => e.code)).toEqual(["render-error"]);
  });

  test("validation blocks a form until its rules pass", () => {
    const s = session(`root = Stack([t])\nt = TextContent("x")`);
    const form = s.form("f");
    form.registerField("name", [{ type: "required" } as never], () => s.getFieldValue("f", "name"));
    expect(form.validateForm()).toBe(false);
    expect(form.getFieldError("name")).toBeTruthy();
    s.setFieldValue("f", "Input", "name", "Ann");
    expect(form.validateForm()).toBe(true);
  });
});
