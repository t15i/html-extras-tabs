import { afterEach, describe, expect, it, vi } from "vitest";

import { ToggleTaskTracker } from "@html-extras/core";

import type { HTMLTabElement } from "../lib/index";
import "../lib/index";

const trash: Element[] = [];
afterEach(() => {
  while (trash.length) trash.pop()!.remove();
});

/**
 * Resolves once every task queued before it has run.
 *
 * @remarks
 * A toggle task tracker is the only public door to the task source the
 * library queues on, and the toggle event it fires is what says its task has
 * run. The element it fires at is made here and thrown away, so nothing under
 * test hears it.
 */
function drain(): Promise<void> {
  return new Promise<void>((resolve) => {
    const element = document.createElement("div");
    element.addEventListener("toggle", () => resolve(), { once: true });

    new ToggleTaskTracker(element).queue("closed", "open");
  });
}

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

const tabsOf = (container: ParentNode): HTMLTabElement[] => [
  ...container.querySelectorAll<HTMLTabElement>("tab-item"),
];

const selection = (container: ParentNode): string[] =>
  tabsOf(container)
    .filter((tab) => tab.hasAttribute("selected"))
    .map((tab) => tab.id);

/**
 * Records the toggle events fired at every tab of the container.
 *
 * @param container - The container.
 *
 * @returns The records, filled as the events arrive.
 */
function toggles(container: ParentNode): string[] {
  const records: string[] = [];

  for (const tab of tabsOf(container)) {
    tab.addEventListener("toggle", (event) => {
      const { oldState, newState } = event as ToggleEvent;
      records.push(`${tab.id}:${oldState}-${newState}`);
    });
  }

  return records;
}

describe("exclusivity of a tab set", () => {
  it("unselects the tab that was selected when another is selected", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="t1" selected></tab-item>
        <tab-item id="t2"></tab-item>
      </tab-list>
    `);

    container.querySelector("#t2")!.setAttribute("selected", "");

    expect(selection(container)).toEqual(["t2"]);
  });

  it("restores the invariant of a set that markup broke", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="t1" selected></tab-item>
        <tab-item id="t2" selected></tab-item>
        <tab-item id="t3" selected></tab-item>
      </tab-list>
    `);

    expect(selection(container)).toHaveLength(1);
  });

  it("leaves the tabs of a set that is not exclusive alone", () => {
    const container = fixture(`
      <tab-list multiple>
        <tab-item id="t1" selected></tab-item>
        <tab-item id="t2"></tab-item>
      </tab-list>
    `);

    container.querySelector("#t2")!.setAttribute("selected", "");

    expect(selection(container)).toEqual(["t1", "t2"]);
  });

  it("leaves a tab that is in no tab set alone", () => {
    const container = fixture(`
      <tab-list><tab-item id="t1" selected></tab-item></tab-list>
      <tab-item id="loose"></tab-item>
    `);

    container.querySelector("#loose")!.setAttribute("selected", "");

    expect(selection(container)).toEqual(["t1", "loose"]);
  });

  it("leaves a tab wrapped in an element of its own out of the set", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="t1" selected></tab-item>
        <div><tab-item id="wrapped"></tab-item></div>
      </tab-list>
    `);

    container.querySelector("#wrapped")!.setAttribute("selected", "");

    expect(selection(container)).toEqual(["t1", "wrapped"]);
  });

  it("makes a tab that arrives into an exclusive set give up its selection", () => {
    const container = fixture(`
      <tab-list><tab-item id="t1" selected></tab-item></tab-list>
    `);
    const arriving = document.createElement("tab-item") as HTMLTabElement;
    arriving.id = "arriving";
    arriving.setAttribute("selected", "");

    container.querySelector("tab-list")!.appendChild(arriving);

    expect(selection(container)).toEqual(["t1"]);
  });

  it("makes a tab that arrives before the selected tab give up its selection", () => {
    const container = fixture(`
      <tab-list><tab-item id="t1" selected></tab-item></tab-list>
    `);
    const list = container.querySelector("tab-list")!;
    const arriving = document.createElement("tab-item") as HTMLTabElement;
    arriving.id = "arriving";
    arriving.setAttribute("selected", "");

    // The tab that already holds the selection is looked for on both sides of
    // the arriving tab, so where it sits in the set makes no difference.
    list.insertBefore(arriving, list.firstChild);

    expect(selection(container)).toEqual(["t1"]);
  });

  it("keeps the selection of a tab that arrives into a set that is not exclusive", () => {
    const container = fixture(`
      <tab-list multiple><tab-item id="t1" selected></tab-item></tab-list>
    `);
    const arriving = document.createElement("tab-item") as HTMLTabElement;
    arriving.id = "arriving";
    arriving.setAttribute("selected", "");

    container.querySelector("tab-list")!.appendChild(arriving);

    expect(selection(container)).toEqual(["t1", "arriving"]);
  });

  it("keeps the selection of a tab that arrives into an empty set", () => {
    const container = fixture(`<tab-list></tab-list>`);
    const arriving = document.createElement("tab-item") as HTMLTabElement;
    arriving.id = "arriving";
    arriving.setAttribute("selected", "");

    container.querySelector("tab-list")!.appendChild(arriving);

    expect(selection(container)).toEqual(["arriving"]);
  });

  it("selects nothing of its own when a selected tab is removed", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="t1" selected></tab-item>
        <tab-item id="t2"></tab-item>
      </tab-list>
    `);

    container.querySelector("#t1")!.remove();

    expect(selection(container)).toEqual([]);
  });

  it("reaches the other tabs of a set that left the document whole", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="first" selected></tab-item>
        <tab-item id="second"></tab-item>
      </tab-list>
    `);
    const list = container.querySelector("tab-list")!;

    list.remove();
    tabsOf(list)[1]!.setAttribute("selected", "");

    // The reaction to an attribute arrives wherever the element stands, and
    // the set it works on is the parent list, so this branch asks nothing
    // about the document. What a set out of the document does not get is the
    // rule an insertion follows - see the test below it.
    expect(selection(list)).toEqual(["second"]);
  });

  it("reaches the other tabs of a set in a tree of its own", () => {
    const list = document.createElement("tab-list");
    const first = document.createElement("tab-item") as HTMLTabElement;
    const second = document.createElement("tab-item") as HTMLTabElement;
    first.id = "first";
    second.id = "second";

    list.append(first, second);
    first.setAttribute("selected", "");
    second.setAttribute("selected", "");

    // Selecting a tab that is already in the set is the same branch again,
    // and it costs nothing to keep: declining it here would mean writing code
    // to ask about the document. What a tree of its own genuinely cannot do
    // is the test below - there the set is not held to its invariant, only
    // the reaction is served.
    expect(selection(list)).toEqual(["second"]);
  });

  it("holds a set upgraded in a tree of its own to one selection", () => {
    const container = document.createElement("div");
    container.innerHTML =
      `<tab-list>` +
      `<tab-item id="first" selected></tab-item>` +
      `<tab-item id="second" selected></tab-item>` +
      `</tab-list>`;

    // Nothing in there is a custom element yet - the tree is in no document.
    // The upgrade takes the list first, and the set is held to its invariant
    // by the list itself, before any of its tabs is upgraded at all. Which is
    // why the first selection is the one that survives here, where a set
    // connected to a document keeps the last: there each tab is asked in turn
    // to give up its own.
    customElements.upgrade(container);

    expect(selection(container)).toEqual(["first"]);
  });

  it("leaves a set of several selections upgraded in a tree of its own alone", () => {
    const container = document.createElement("div");
    container.innerHTML =
      `<tab-list multiple>` +
      `<tab-item id="first" selected></tab-item>` +
      `<tab-item id="second" selected></tab-item>` +
      `</tab-list>`;

    // The rule is read off the attribute, which an upgraded element carries
    // before its reactions arrive - the signal at that moment still says the
    // set is an exclusive one.
    customElements.upgrade(container);

    expect(selection(container)).toEqual(["first", "second"]);
  });

  it("lets two selected tabs of a tree of its own live until it is connected", () => {
    const list = document.createElement("tab-list");
    const first = document.createElement("tab-item") as HTMLTabElement;
    const second = document.createElement("tab-item") as HTMLTabElement;
    first.id = "first";
    second.id = "second";
    first.setAttribute("selected", "");
    second.setAttribute("selected", "");

    list.append(first, second);
    expect(selection(list)).toEqual(["first", "second"]);

    const container = fixture("");
    container.appendChild(list);

    // The invariant comes back on connection, where each tab is asked in tree
    // order to give up its selection, so the last of them is the one left.
    expect(selection(container)).toEqual(["second"]);
  });
});

describe("toggle events of a tab", () => {
  it("fires one at the tab that was selected, in a task", async () => {
    const container = fixture(`
      <tab-list><tab-item id="t1"></tab-item></tab-list>
    `);
    const records = toggles(container);

    container.querySelector("#t1")!.setAttribute("selected", "");
    await Promise.resolve();
    expect(records).toEqual([]);

    await drain();
    expect(records).toEqual(["t1:closed-open"]);
  });

  it("fires at the tab that was selected before the tab that gave it up", async () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="t1" selected></tab-item>
        <tab-item id="t2"></tab-item>
      </tab-list>
    `);
    // The tab the parser selected has an event of its own on the way out.
    await drain();
    const records = toggles(container);

    container.querySelector("#t2")!.setAttribute("selected", "");

    await drain();
    expect(records).toEqual(["t2:closed-open", "t1:open-closed"]);
  });

  it("fires once for a tab toggled twice in one turn", async () => {
    const container = fixture(`
      <tab-list><tab-item id="t1"></tab-item></tab-list>
    `);
    const records = toggles(container);
    const tab = container.querySelector<HTMLTabElement>("#t1")!;

    tab.selected = true;
    tab.selected = false;

    await drain();
    expect(records).toEqual(["t1:closed-closed"]);
  });

  it("fires nothing when the value of the attribute changes but its presence does not", async () => {
    const container = fixture(`
      <tab-list><tab-item id="t1" selected></tab-item></tab-list>
    `);
    await drain();
    const records = toggles(container);

    container.querySelector("#t1")!.setAttribute("selected", "selected");

    await drain();
    expect(records).toEqual([]);
  });

  it("fires for a tab the parser selected", async () => {
    const container = fixture(`
      <tab-list><tab-item id="t1" selected></tab-item></tab-list>
    `);
    const records = toggles(container);

    await drain();
    expect(records).toEqual(["t1:closed-open"]);
  });

  it("fires at a tab that was disconnected before the task ran", async () => {
    const container = fixture(`
      <tab-list><tab-item id="t1"></tab-item></tab-list>
    `);
    const tab = container.querySelector<HTMLTabElement>("#t1")!;
    const listener = vi.fn();
    tab.addEventListener("toggle", listener);

    tab.selected = true;
    tab.remove();

    await drain();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
