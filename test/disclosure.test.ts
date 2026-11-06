import { describe, expect, test } from "bun:test";
import { autoOpen, syncActive, toggled, type SectionNode, type TabsSelection } from "../src/components/disclosure-state.ts";

const item = (value: string, content: unknown[] = []): SectionNode => ({ props: { value, trigger: value, content } });
const fresh = (): TabsSelection => ({ active: "", interacted: false, sizes: {} });

describe("Tabs selection", () => {
  test("a complete response opens on its last tab (every tab grows on the first pass)", () => {
    const s = fresh();
    syncActive(s, [item("a", ["x"]), item("b", ["y"]), item("c", ["z"])]);
    expect(s.active).toBe("c");
  });

  test("a later pass with nothing new keeps the tab", () => {
    const s = fresh();
    const items = [item("a", ["x"]), item("b", ["y"])];
    syncActive(s, items);
    syncActive(s, items);
    expect(s.active).toBe("b");
  });

  test("streaming follows the tab whose content grows", () => {
    const s = fresh();
    syncActive(s, [item("a", ["x"])]);
    expect(s.active).toBe("a");
    syncActive(s, [item("a", ["x"]), item("b", ["y"])]);
    expect(s.active).toBe("b");
    syncActive(s, [item("a", ["x", "more"]), item("b", ["y"])]);
    expect(s.active).toBe("a");
  });

  test("a person's choice stops the following", () => {
    const s = fresh();
    syncActive(s, [item("a", ["x"]), item("b", ["y"])]);
    s.interacted = true;
    s.active = "a";
    syncActive(s, [item("a", ["x"]), item("b", ["y", "more"])]);
    expect(s.active).toBe("a");
  });

  test("no items selects nothing", () => {
    const s = fresh();
    syncActive(s, []);
    expect(s.active).toBe("");
  });
});

describe("Accordion selection", () => {
  test("a whole response opens its last item", () => {
    const s = { open: "", interacted: false, prevCount: 0 };
    autoOpen(s, [item("a"), item("b"), item("c")]);
    expect(s.open).toBe("c");
  });

  test("an item arriving later opens, an unchanged count does not reopen", () => {
    const s = { open: "", interacted: false, prevCount: 0 };
    autoOpen(s, [item("a")]);
    s.open = "";
    autoOpen(s, [item("a")]);
    expect(s.open).toBe("");
    autoOpen(s, [item("a"), item("b")]);
    expect(s.open).toBe("b");
  });

  test("after a click new items leave the choice alone", () => {
    const s = { open: "a", interacted: true, prevCount: 1 };
    autoOpen(s, [item("a"), item("b")]);
    expect(s.open).toBe("a");
  });

  test("pressing the open item shuts it, another opens", () => {
    expect(toggled("a", "a")).toBe("");
    expect(toggled("a", "b")).toBe("b");
    expect(toggled("", "b")).toBe("b");
  });
});
