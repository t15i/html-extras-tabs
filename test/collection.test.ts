import { afterEach, describe, expect, it } from "vitest";

import type {
  HTMLTabElement,
  HTMLTabListElement,
  HTMLTabsCollection,
} from "../lib/index";
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

/**
 * A list of `count` tabs, each carrying its index as its id.
 *
 * @param count - How many tabs.
 * @param attributes - The attributes of the list.
 *
 * @returns The list.
 */
function list(count: number, attributes = ""): HTMLTabListElement {
  const tabs = Array.from(
    { length: count },
    (_, index) => `<tab-item id="t${index}"></tab-item>`,
  ).join("");

  return fixture(`<tab-list ${attributes}>${tabs}</tab-list>`).querySelector(
    "tab-list",
  )!;
}

/**
 * The error `steps` threw.
 *
 * @param steps - What to run.
 *
 * @returns The error.
 *
 * @remarks
 * The exception of an operation reaches the caller as it was thrown, which is
 * what WebIDL asks for and what the machinery now does; it used to arrive
 * wrapped in a `TypeError` carrying it as a cause.
 */
function thrownBy(steps: () => void): Error {
  try {
    steps();
  } catch (error) {
    return error as Error;
  }

  throw new Error("nothing was thrown");
}

const ids = (collection: HTMLTabsCollection | HTMLTabListElement): string[] => {
  const items: string[] = [];
  for (let index = 0; index < collection.length; index++) {
    items.push(collection.item(index)!.id);
  }
  return items;
};

describe("the tabs collection", () => {
  it("collects the tabs of the set and nothing else", () => {
    const element = fixture(`
      <tab-list>
        <tab-item id="a"></tab-item>
        <div><tab-item id="wrapped"></tab-item></div>
        <span></span>
        <tab-item id="b"></tab-item>
      </tab-list>
    `).querySelector<HTMLTabListElement>("tab-list")!;

    expect(ids(element.tabs)).toEqual(["a", "b"]);
  });

  it("is the same object every time", () => {
    const element = list(1);

    expect(element.tabs).toBe(element.tabs);
  });

  it("is live", () => {
    const element = list(2);
    expect(element.tabs.length).toBe(2);

    element.appendChild(document.createElement("tab-item"));
    expect(element.tabs.length).toBe(3);

    element.querySelector("#t0")!.remove();
    expect(ids(element.tabs)).toEqual(["t1", ""]);
  });

  it("collects an element that has not been upgraded", () => {
    const element = list(0);
    element.innerHTML = `<tab-item id="raw"></tab-item>`;

    expect(ids(element.tabs)).toEqual(["raw"]);
  });

  it("answers to ids and names", () => {
    const element = fixture(`
      <tab-list>
        <tab-item id="a"></tab-item>
        <tab-item name="b"></tab-item>
      </tab-list>
    `).querySelector<HTMLTabListElement>("tab-list")!;

    expect(element.tabs.namedItem("a")).toBe(element.querySelector("#a"));
    expect(element.tabs.namedItem("b")).toBe(element.querySelector("[name=b]"));
    expect(element.tabs.namedItem("missing")).toBeNull();
  });

  describe("length", () => {
    it("counts the tabs", () => {
      expect(list(3).tabs.length).toBe(3);
    });

    it("appends new tabs when it grows", () => {
      const element = list(1);

      element.tabs.length = 3;

      expect(element.tabs.length).toBe(3);
      expect(element.children.length).toBe(3);
      expect(element.lastElementChild!.localName).toBe("tab-item");
    });

    it("creates tabs that are tabs", () => {
      const element = list(0);

      element.tabs.length = 1;

      expect(element.tabs.item(0)).toBeInstanceOf(
        customElements.get("tab-item")!,
      );
    });

    it("cuts tabs off the end when it shrinks", () => {
      const element = list(4);

      element.tabs.length = 2;

      expect(ids(element.tabs)).toEqual(["t0", "t1"]);
    });

    it("empties the set when it is set to zero", () => {
      const element = list(2);

      element.tabs.length = 0;

      expect(element.tabs.length).toBe(0);
    });

    it("changes nothing when it is set to what it already is", () => {
      const element = list(2);

      element.tabs.length = 2;

      expect(ids(element.tabs)).toEqual(["t0", "t1"]);
    });

    it("does nothing at all past a hundred thousand", () => {
      const element = list(1);

      element.tabs.length = 100_001;

      expect(element.tabs.length).toBe(1);
    });

    it("leaves the other children of the list alone when it shrinks", () => {
      const element = fixture(`
        <tab-list>
          <tab-item id="a"></tab-item>
          <span id="text"></span>
          <tab-item id="b"></tab-item>
        </tab-list>
      `).querySelector<HTMLTabListElement>("tab-list")!;

      element.tabs.length = 1;

      expect(ids(element.tabs)).toEqual(["a"]);
      expect(element.querySelector("#text")).not.toBeNull();
    });
  });

  describe("the indexed setter", () => {
    it("replaces the tab at an index that is taken", () => {
      const element = list(3);
      const tab = document.createElement("tab-item") as HTMLTabElement;
      tab.id = "new";

      element.tabs[1] = tab;

      expect(ids(element.tabs)).toEqual(["t0", "new", "t2"]);
    });

    it("appends at the index right past the end", () => {
      const element = list(2);
      const tab = document.createElement("tab-item") as HTMLTabElement;
      tab.id = "new";

      element.tabs[2] = tab;

      expect(ids(element.tabs)).toEqual(["t0", "t1", "new"]);
    });

    it("fills the gap up to an index past the end", () => {
      const element = list(1);
      const tab = document.createElement("tab-item") as HTMLTabElement;
      tab.id = "new";

      element.tabs[3] = tab;

      expect(ids(element.tabs)).toEqual(["t0", "", "", "new"]);
    });

    it("removes the tab at an index when it is set to null", () => {
      const element = list(3);

      element.tabs[1] = null as unknown as HTMLTabElement;

      expect(ids(element.tabs)).toEqual(["t0", "t2"]);
    });

    it("removes nothing for an index that is out of range", () => {
      const element = list(2);

      element.tabs[5] = null as unknown as HTMLTabElement;

      expect(ids(element.tabs)).toEqual(["t0", "t1"]);
    });
  });

  describe("add", () => {
    it("appends the tab when it is given nothing to insert before", () => {
      const element = list(1);
      const tab = document.createElement("tab-item") as HTMLTabElement;
      tab.id = "new";

      element.tabs.add(tab);

      expect(ids(element.tabs)).toEqual(["t0", "new"]);
    });

    it("inserts the tab before the element it was given", () => {
      const element = list(2);
      const tab = document.createElement("tab-item") as HTMLTabElement;
      tab.id = "new";

      element.tabs.add(tab, element.querySelector<HTMLElement>("#t1")!);

      expect(ids(element.tabs)).toEqual(["t0", "new", "t1"]);
    });

    it("inserts the tab before the index it was given", () => {
      const element = list(3);
      const tab = document.createElement("tab-item") as HTMLTabElement;
      tab.id = "new";

      element.tabs.add(tab, 2);

      expect(ids(element.tabs)).toEqual(["t0", "t1", "new", "t2"]);
    });

    it("appends the tab for an index that is out of range", () => {
      const element = list(1);
      const tab = document.createElement("tab-item") as HTMLTabElement;
      tab.id = "new";

      element.tabs.add(tab, 9);

      expect(ids(element.tabs)).toEqual(["t0", "new"]);
    });

    it("does nothing when the tab is the element to insert it before", () => {
      const element = list(2);
      const tab = element.querySelector<HTMLTabElement>("#t1")!;

      element.tabs.add(tab, tab);

      expect(ids(element.tabs)).toEqual(["t0", "t1"]);
    });

    it("throws when the tab is an ancestor of the list", () => {
      const container = fixture(`
        <tab-item id="outer"><tab-list></tab-list></tab-item>
      `);
      const element = container.querySelector<HTMLTabListElement>("tab-list")!;
      const tab = container.querySelector<HTMLTabElement>("#outer")!;

      const error = thrownBy(() => element.tabs.add(tab));

      expect(error).toBeInstanceOf(DOMException);
      expect((error as DOMException).name).toBe("HierarchyRequestError");
    });

    it("throws when the element to insert before is not a child of the list", () => {
      const element = list(1);
      const tab = document.createElement("tab-item") as HTMLTabElement;
      const stranger = document.createElement("div");
      document.body.appendChild(stranger);
      trash.push(stranger);

      const error = thrownBy(() => element.tabs.add(tab, stranger));

      expect(error).toBeInstanceOf(DOMException);
      expect((error as DOMException).name).toBe("NotFoundError");
    });

    it("refuses an element that is not a tab", () => {
      const element = list(1);
      const notATab = document.createElement("div");

      expect(() =>
        element.tabs.add(notATab as unknown as HTMLTabElement),
      ).toThrow(TypeError);
    });
  });

  describe("remove", () => {
    it("removes the tab at the index", () => {
      const element = list(3);

      element.tabs.remove(1);

      expect(ids(element.tabs)).toEqual(["t0", "t2"]);
    });

    it("removes nothing for an index that is out of range", () => {
      const element = list(2);

      element.tabs.remove(5);
      element.tabs.remove(-1);

      expect(ids(element.tabs)).toEqual(["t0", "t1"]);
    });

    it("removes nothing from an empty collection", () => {
      const element = list(0);

      expect(() => element.tabs.remove(0)).not.toThrow();
    });
  });

  describe("selectedIndex", () => {
    it("is the index of the selected tab", () => {
      const element = list(3);
      element.querySelector("#t1")!.setAttribute("selected", "");

      expect(element.tabs.selectedIndex).toBe(1);
    });

    it("is -1 when no tab is selected", () => {
      expect(list(2).tabs.selectedIndex).toBe(-1);
    });

    it("selects the tab at the index it is set to", () => {
      const element = list(3);

      element.tabs.selectedIndex = 2;

      expect(element.querySelector("#t2")!.hasAttribute("selected")).toBe(true);
      expect(element.tabs.selectedIndex).toBe(2);
    });

    it("unselects everything for an index that belongs to no tab", () => {
      const element = list(2);
      element.querySelector("#t0")!.setAttribute("selected", "");

      element.tabs.selectedIndex = 5;

      expect(element.tabs.selectedIndex).toBe(-1);
    });

    it("takes the selection away from the tabs before the index", () => {
      const element = list(3, "multiple");
      element.querySelector("#t0")!.setAttribute("selected", "");

      element.tabs.selectedIndex = 2;

      expect(element.querySelector("#t0")!.hasAttribute("selected")).toBe(
        false,
      );
      expect(element.tabs.selectedIndex).toBe(2);
    });

    it("takes the selection away from every other tab of a set of several selections", () => {
      const element = list(3, "multiple");
      element.querySelector("#t0")!.setAttribute("selected", "");
      element.querySelector("#t2")!.setAttribute("selected", "");

      // One selection by name and by nature, the way it is on a multiple
      // select. Several selections are made through the tabs themselves.
      element.tabs.selectedIndex = 1;

      expect(element.querySelector("#t0")!.hasAttribute("selected")).toBe(
        false,
      );
      expect(element.querySelector("#t1")!.hasAttribute("selected")).toBe(true);
      expect(element.querySelector("#t2")!.hasAttribute("selected")).toBe(
        false,
      );
      expect(element.tabs.selectedIndex).toBe(1);
    });
  });
});

describe("the facade of the list", () => {
  it("counts the tabs of the set", () => {
    expect(list(3).length).toBe(3);
  });

  it("grows and shrinks the set through length", () => {
    const element = list(1);

    element.length = 3;
    expect(element.tabs.length).toBe(3);

    element.length = 0;
    expect(element.tabs.length).toBe(0);
  });

  it("answers item and namedItem like the collection does", () => {
    const element = list(2);

    expect(element.item(1)).toBe(element.tabs.item(1));
    expect(element.item(9)).toBeNull();
    expect(element.namedItem("t0")).toBe(element.tabs.namedItem("t0"));
  });

  it("adds a tab like the collection does", () => {
    const element = list(1);
    const tab = document.createElement("tab-item") as HTMLTabElement;
    tab.id = "new";

    element.add(tab, 0);

    expect(ids(element)).toEqual(["new", "t0"]);
  });

  it("removes a tab of the set when it is given an index", () => {
    const element = list(2);

    element.remove(0);

    expect(ids(element)).toEqual(["t1"]);
  });

  it("removes itself when it is given nothing", () => {
    const element = list(2);
    const parent = element.parentElement!;

    element.remove();

    expect(parent.querySelector("tab-list")).toBeNull();
  });

  it("reads and writes the selected index", () => {
    const element = list(3);

    element.selectedIndex = 1;

    expect(element.selectedIndex).toBe(1);
    expect(element.tabs.selectedIndex).toBe(1);
  });

  it("collects the selected tabs of the set", () => {
    const element = list(3);
    element.querySelector("#t1")!.setAttribute("selected", "");

    expect(element.selectedTabs.length).toBe(1);
    expect(element.selectedTabs.item(0)).toBe(element.querySelector("#t1"));
  });

  it("keeps the selected tabs collection live through attribute changes", () => {
    const element = list(3, "multiple");
    expect(element.selectedTabs.length).toBe(0);

    element.querySelector("#t0")!.setAttribute("selected", "");
    element.querySelector("#t2")!.setAttribute("selected", "");
    expect(element.selectedTabs.length).toBe(2);

    element.querySelector("#t0")!.removeAttribute("selected");
    expect(element.selectedTabs.length).toBe(1);
  });
});
