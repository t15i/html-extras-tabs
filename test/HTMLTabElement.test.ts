import { afterEach, describe, expect, it } from "vitest";

import { internalsOf } from "./internals";

import type { HTMLTabElement, HTMLTabPanelElement } from "../lib/index";
import "../lib/index";

const trash: Element[] = [];
afterEach(() => {
  while (trash.length) trash.pop()!.remove();
});

/**
 * Markup in the document, cleaned up after the test.
 *
 * @param html - The markup.
 *
 * @returns The container it was parsed into.
 */
function fixture(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  trash.push(container);
  return container;
}

const tabOf = (container: ParentNode): HTMLTabElement =>
  container.querySelector("tab-item")!;

describe("tab-item", () => {
  it("takes the tab role", () => {
    const tab = tabOf(fixture(`<tab-item></tab-item>`));

    expect(internalsOf(tab).role).toBe("tab");
  });

  describe("aria-selected", () => {
    it("is set even when the tab is not selected", () => {
      const tab = tabOf(fixture(`<tab-item></tab-item>`));

      expect(internalsOf(tab).ariaSelected).toBe("false");
    });

    it("is true for a tab selected in markup", () => {
      const tab = tabOf(fixture(`<tab-item selected></tab-item>`));

      expect(internalsOf(tab).ariaSelected).toBe("true");
    });

    it("follows the attribute", () => {
      const tab = tabOf(fixture(`<tab-item></tab-item>`));

      tab.selected = true;
      expect(internalsOf(tab).ariaSelected).toBe("true");

      tab.selected = false;
      expect(internalsOf(tab).ariaSelected).toBe("false");
    });
  });

  describe("aria-disabled", () => {
    it("is left out for a tab that is not disabled", () => {
      const tab = tabOf(fixture(`<tab-item></tab-item>`));

      expect(internalsOf(tab).ariaDisabled).toBeNull();
    });

    it("is true for a disabled tab", () => {
      const tab = tabOf(fixture(`<tab-item disabled></tab-item>`));

      expect(internalsOf(tab).ariaDisabled).toBe("true");
    });

    it("is left out again once the tab is enabled", () => {
      const tab = tabOf(fixture(`<tab-item disabled></tab-item>`));

      tab.disabled = false;

      expect(internalsOf(tab).ariaDisabled).toBeNull();
    });
  });

  describe("aria-expanded and aria-controls", () => {
    it("are both left out while the tab has no panel", () => {
      const tab = tabOf(fixture(`<tab-item selected></tab-item>`));

      expect(internalsOf(tab).ariaExpanded).toBeNull();
      expect(internalsOf(tab).ariaControlsElements).toBeNull();
    });

    it("are both left out while the panel reference resolves to nothing", () => {
      const tab = tabOf(fixture(`<tab-item panel="missing"></tab-item>`));

      expect(tab.panelElement).toBeNull();
      expect(internalsOf(tab).ariaExpanded).toBeNull();
      expect(internalsOf(tab).ariaControlsElements).toBeNull();
    });

    it("appear once the panel resolves", () => {
      const container = fixture(`
        <tab-item panel="p"></tab-item>
        <tab-panel id="p"></tab-panel>
      `);
      const tab = tabOf(container);
      const panel = container.querySelector<HTMLTabPanelElement>("tab-panel")!;

      expect(internalsOf(tab).ariaExpanded).toBe("false");
      expect(internalsOf(tab).ariaControlsElements).toEqual([panel]);
    });

    it("report the selected state of the tab", () => {
      const container = fixture(`
        <tab-item panel="p" selected></tab-item>
        <tab-panel id="p"></tab-panel>
      `);
      const tab = tabOf(container);

      expect(internalsOf(tab).ariaExpanded).toBe("true");

      tab.selected = false;
      expect(internalsOf(tab).ariaExpanded).toBe("false");
    });

    it("are dropped again when the panel goes away", () => {
      const container = fixture(`
        <tab-item panel="p"></tab-item>
        <tab-panel id="p"></tab-panel>
      `);
      const tab = tabOf(container);

      container.querySelector("tab-panel")!.remove();

      expect(tab.panelElement).toBeNull();
      expect(internalsOf(tab).ariaExpanded).toBeNull();
      expect(internalsOf(tab).ariaControlsElements).toBeNull();
    });

    it("appear once the panel is set through the IDL attribute", () => {
      const container = fixture(`
        <tab-item></tab-item>
        <tab-panel></tab-panel>
      `);
      const tab = tabOf(container);
      const panel = container.querySelector<HTMLTabPanelElement>("tab-panel")!;

      // Setting the panel through the IDL attribute writes the content
      // attribute, and the reaction to that write is what the reference hears.
      // The platform runs it after the whole setter, by which point the
      // element is recorded - measured against a native attr-element
      // attribute in both engines.
      tab.panelElement = panel;

      expect(tab.getAttribute("panel")).toBe("");
      expect(tab.panelElement).toBe(panel);
      expect(internalsOf(tab).ariaExpanded).toBe("false");
      expect(internalsOf(tab).ariaControlsElements).toEqual([panel]);
    });

    it("follow the panel from one set through the IDL attribute to the next", () => {
      const container = fixture(`
        <tab-item></tab-item>
        <tab-panel id="first"></tab-panel>
        <tab-panel id="second"></tab-panel>
      `);
      const tab = tabOf(container);
      const [first, second] =
        container.querySelectorAll<HTMLTabPanelElement>("tab-panel");

      tab.panelElement = first!;
      tab.panelElement = second!;

      expect(tab.panelElement).toBe(second);
      expect(internalsOf(tab).ariaControlsElements).toEqual([second]);
    });

    it("ignore an element of another type carrying the id", () => {
      const container = fixture(`
        <tab-item panel="p"></tab-item>
        <div id="p"></div>
      `);
      const tab = tabOf(container);

      expect(tab.panelElement).toBeNull();
      expect(internalsOf(tab).ariaControlsElements).toBeNull();
    });
  });

  describe("states", () => {
    it("declares neither a selected nor a disabled state", () => {
      const tab = tabOf(fixture(`<tab-item selected disabled></tab-item>`));

      // Rule 5: a state that an attribute already tells apart is not declared,
      // and authors have [selected] and [disabled] for these two.
      expect(internalsOf(tab).states.has("selected")).toBe(false);
      expect(internalsOf(tab).states.has("disabled")).toBe(false);
      expect(tab.matches("[selected][disabled]")).toBe(true);
    });
  });

  describe("index", () => {
    it("is -1 for a tab that is in no tab set", () => {
      const container = fixture(`<tab-item></tab-item>`);

      expect(tabOf(container).index).toBe(-1);
    });

    it("is -1 for a tab wrapped in an element of its own", () => {
      const container = fixture(`
        <tab-list><div><tab-item></tab-item></div></tab-list>
      `);

      expect(tabOf(container).index).toBe(-1);
    });

    it("counts the tabs of the set that come before it", () => {
      const container = fixture(`
        <tab-list>
          <tab-item id="a"></tab-item>
          <tab-item id="b"></tab-item>
          <tab-item id="c"></tab-item>
        </tab-list>
      `);

      const [a, b, c] = [
        ...container.querySelectorAll<HTMLTabElement>("tab-item"),
      ];
      expect(a!.index).toBe(0);
      expect(b!.index).toBe(1);
      expect(c!.index).toBe(2);
    });

    it("counts only tabs, not the other children of the list", () => {
      const container = fixture(`
        <tab-list>
          <div></div>
          <tab-item id="a"></tab-item>
          <span></span>
          <tab-item id="b"></tab-item>
        </tab-list>
      `);

      expect(container.querySelector<HTMLTabElement>("#b")!.index).toBe(1);
    });

    it("follows the tab as the set changes around it", () => {
      const container = fixture(`
        <tab-list><tab-item id="a"></tab-item></tab-list>
      `);
      const list = container.querySelector("tab-list")!;
      const tab = tabOf(container);

      expect(tab.index).toBe(0);

      list.insertBefore(document.createElement("tab-item"), tab);
      expect(tab.index).toBe(1);

      tab.remove();
      expect(tab.index).toBe(-1);
    });

    it("counts in a tree of its own", () => {
      const list = document.createElement("tab-list");
      list.innerHTML = `<tab-item></tab-item><tab-item id="second"></tab-item>`;

      expect(list.querySelector<HTMLTabElement>("#second")!.index).toBe(1);
    });

    it("counts in a tree of its own after it has been asked once", () => {
      const tab = document.createElement("tab-item") as HTMLTabElement;
      expect(tab.index).toBe(-1);

      const list = document.createElement("tab-list");
      list.append(tab);

      expect(tab.index).toBe(0);
    });
  });
});
