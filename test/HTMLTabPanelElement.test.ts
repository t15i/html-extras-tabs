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

const panelOf = (container: ParentNode): HTMLTabPanelElement =>
  container.querySelector("tab-panel")!;
const tabOf = (container: ParentNode): HTMLTabElement =>
  container.querySelector("tab-item")!;

describe("tab-panel", () => {
  it("takes the tabpanel role", () => {
    const panel = panelOf(fixture(`<tab-panel></tab-panel>`));

    expect(internalsOf(panel).role).toBe("tabpanel");
  });

  it("has no tab, no label and no open state without the attribute", () => {
    const panel = panelOf(fixture(`<tab-panel></tab-panel>`));

    expect(panel.tabElement).toBeNull();
    expect(internalsOf(panel).ariaLabelledByElements).toBeNull();
    expect(internalsOf(panel).states.has("open")).toBe(false);
  });

  it("resolves a tab of the same node tree and takes it as its label", () => {
    const container = fixture(`
      <tab-list><tab-item id="t"></tab-item></tab-list>
      <tab-panel tab="t"></tab-panel>
    `);

    expect(panelOf(container).tabElement).toBe(tabOf(container));
    expect(internalsOf(panelOf(container)).ariaLabelledByElements).toEqual([
      tabOf(container),
    ]);
  });

  it("resolves nothing when the id belongs to an element of another type", () => {
    const container = fixture(`
      <div id="t"></div>
      <tab-panel tab="t"></tab-panel>
    `);

    expect(panelOf(container).tabElement).toBeNull();
    expect(internalsOf(panelOf(container)).ariaLabelledByElements).toBeNull();
  });

  it("resolves nothing when the tab is in another node tree", () => {
    const container = fixture(`<tab-panel tab="t"></tab-panel>`);
    const host = document.createElement("div");
    container.appendChild(host);

    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<tab-list><tab-item id="t"></tab-item></tab-list>`;

    expect(root.querySelector("tab-item")).not.toBeNull();
    expect(panelOf(container).tabElement).toBeNull();
  });

  it("is open exactly while its tab is selected", () => {
    const container = fixture(`
      <tab-list><tab-item id="t" selected></tab-item></tab-list>
      <tab-panel tab="t"></tab-panel>
    `);
    const panel = panelOf(container);
    const tab = tabOf(container);

    expect(internalsOf(panel).states.has("open")).toBe(true);
    expect(panel.matches(":state(open)")).toBe(true);

    tab.removeAttribute("selected");
    expect(internalsOf(panel).states.has("open")).toBe(false);
    expect(panel.matches(":state(open)")).toBe(false);

    tab.setAttribute("selected", "");
    expect(internalsOf(panel).states.has("open")).toBe(true);
  });

  it("follows the tab it is pointed at", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="a" selected></tab-item>
        <tab-item id="b"></tab-item>
      </tab-list>
      <tab-panel tab="a"></tab-panel>
    `);
    const panel = panelOf(container);
    const b = container.querySelector<HTMLTabElement>("#b")!;

    expect(internalsOf(panel).states.has("open")).toBe(true);

    panel.setAttribute("tab", "b");
    expect(panel.tabElement).toBe(b);
    expect(internalsOf(panel).states.has("open")).toBe(false);

    b.setAttribute("selected", "");
    expect(internalsOf(panel).states.has("open")).toBe(true);
  });

  it("loses its tab when the attribute is removed", () => {
    const container = fixture(`
      <tab-list><tab-item id="t" selected></tab-item></tab-list>
      <tab-panel tab="t"></tab-panel>
    `);
    const panel = panelOf(container);

    panel.removeAttribute("tab");

    expect(panel.tabElement).toBeNull();
    expect(internalsOf(panel).ariaLabelledByElements).toBeNull();
    expect(internalsOf(panel).states.has("open")).toBe(false);
  });

  it("loses its tab when the tab is disconnected, and finds it again", () => {
    const container = fixture(`
      <tab-list><tab-item id="t" selected></tab-item></tab-list>
      <tab-panel tab="t"></tab-panel>
    `);
    const panel = panelOf(container);
    const tab = tabOf(container);
    const list = container.querySelector("tab-list")!;

    tab.remove();
    expect(panel.tabElement).toBeNull();
    expect(internalsOf(panel).states.has("open")).toBe(false);

    list.appendChild(tab);
    expect(panel.tabElement).toBe(tab);
    expect(internalsOf(panel).states.has("open")).toBe(true);
  });

  it("follows the tab through a rename", () => {
    const container = fixture(`
      <tab-list><tab-item id="t" selected></tab-item></tab-list>
      <tab-panel tab="t"></tab-panel>
    `);
    const panel = panelOf(container);
    const tab = tabOf(container);

    tab.id = "other";
    expect(panel.tabElement).toBeNull();
    expect(internalsOf(panel).states.has("open")).toBe(false);

    panel.setAttribute("tab", "other");
    expect(panel.tabElement).toBe(tab);
    expect(internalsOf(panel).states.has("open")).toBe(true);
  });

  it("takes a tab assigned through the IDL attribute at once", () => {
    const container = fixture(`
      <tab-list><tab-item selected></tab-item></tab-list>
      <tab-panel></tab-panel>
    `);
    const panel = panelOf(container);
    const tab = tabOf(container);

    panel.tabElement = tab;

    expect(panel.tabElement).toBe(tab);
    expect(panel.getAttribute("tab")).toBe("");

    // Nothing is awaited here. The reflected setter records the element
    // before it writes the attribute, so the reaction to that write - which
    // is what carries the reference into the element - already resolves it.
    expect(internalsOf(panel).ariaLabelledByElements).toEqual([tab]);
    expect(internalsOf(panel).states.has("open")).toBe(true);
  });

  it("gives the tab back when it is removed from the document", () => {
    const container = fixture(`
      <tab-list><tab-item selected></tab-item></tab-list>
      <tab-panel></tab-panel>
    `);
    const panel = panelOf(container);
    const tab = tabOf(container);

    panel.tabElement = tab;
    expect(internalsOf(panel).states.has("open")).toBe(true);

    tab.remove();

    // A tab assigned through IDL is held by the panel, not named by it, so
    // nothing about the attribute changes when it leaves - the tab says so
    // itself.
    expect(panel.tabElement).toBeNull();
    expect(internalsOf(panel).states.has("open")).toBe(false);
    expect(internalsOf(panel).ariaLabelledByElements).toBeNull();
  });

  it("gives the tab back when the IDL attribute is set to null", () => {
    const container = fixture(`
      <tab-list><tab-item selected></tab-item></tab-list>
      <tab-panel></tab-panel>
    `);
    const panel = panelOf(container);

    panel.tabElement = tabOf(container);
    expect(internalsOf(panel).states.has("open")).toBe(true);

    panel.tabElement = null;

    expect(panel.hasAttribute("tab")).toBe(false);
    expect(internalsOf(panel).states.has("open")).toBe(false);
    expect(internalsOf(panel).ariaLabelledByElements).toBeNull();
  });
});
