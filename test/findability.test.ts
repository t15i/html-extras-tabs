import { afterEach, describe, expect, it } from "vitest";

import { ToggleTaskTracker } from "@html-extras/core";

import type { HTMLTabElement, HTMLTabPanelElement } from "../lib/index";
import "../lib/index";

const trash: Element[] = [];
afterEach(() => {
  while (trash.length) trash.pop()!.remove();
  location.hash = "";
});

/**
 * Resolves once every task queued before it has run.
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

/**
 * Author styles in the document, cleaned up after the test.
 *
 * @param css - The rules.
 */
function styled(css: string): void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  trash.push(style);
}

/**
 * Navigates to the fragment named by `id`, which is what asks the user agent
 * to reveal whatever is hiding it.
 *
 * @param id - The identifier to navigate to.
 */
async function reveal(id: string): Promise<void> {
  location.hash = `#${id}`;
  await drain();
}

const tabOf = (container: ParentNode, selector = "tab-item"): HTMLTabElement =>
  container.querySelector<HTMLTabElement>(selector)!;

const panelOf = (
  container: ParentNode,
  selector = "tab-panel",
): HTMLTabPanelElement =>
  container.querySelector<HTMLTabPanelElement>(selector)!;

/**
 * A tab set of two tabs and two panels, the second of them closed.
 *
 * @param attributes - The attributes of the list.
 *
 * @returns The container.
 */
function pair(attributes = ""): HTMLElement {
  return fixture(`
    <tab-list ${attributes}>
      <tab-item id="t1" panel="p1" selected>One</tab-item>
      <tab-item id="t2" panel="p2">Two</tab-item>
    </tab-list>
    <tab-panel id="p1" tab="t1"><span>first</span></tab-panel>
    <tab-panel id="p2" tab="t2"><span id="needle">second</span></tab-panel>
  `);
}

describe("the hidden attribute of a tab-panel", () => {
  it("is until-found for a closed panel of a set that activates on focus", () => {
    const container = pair();

    expect(panelOf(container, "#p2").getAttribute("hidden")).toBe(
      "until-found",
    );
  });

  it("is absent for an open panel", () => {
    const container = pair();

    expect(panelOf(container, "#p1").hasAttribute("hidden")).toBe(false);
  });

  it("is empty for a panel that has no tab", () => {
    const container = fixture(`<tab-panel></tab-panel>`);

    expect(panelOf(container).getAttribute("hidden")).toBe("");
  });

  it("is empty for a panel of a disabled tab", () => {
    const container = pair();
    tabOf(container, "#t2").setAttribute("disabled", "");

    expect(panelOf(container, "#p2").getAttribute("hidden")).toBe("");
  });

  it("is empty for a panel of a set that activates manually", () => {
    const container = pair("manual");

    expect(panelOf(container, "#p2").getAttribute("hidden")).toBe("");
  });

  it("is empty for a panel of a set that holds several selections", () => {
    const container = pair("multiple");

    expect(panelOf(container, "#p2").getAttribute("hidden")).toBe("");
  });

  it("is empty for a panel of a tab that is in no set", () => {
    const container = fixture(`
      <tab-item id="t1" panel="p1"></tab-item>
      <tab-panel id="p1" tab="t1"></tab-panel>
    `);

    expect(panelOf(container).getAttribute("hidden")).toBe("");
  });

  it("follows the set it is told about", () => {
    const container = pair("manual");
    container.querySelector("tab-list")!.removeAttribute("manual");

    expect(panelOf(container, "#p2").getAttribute("hidden")).toBe(
      "until-found",
    );
  });

  it("is absent for a panel that is in no document", () => {
    const panel = document.createElement("tab-panel");

    expect(panel.hasAttribute("hidden")).toBe(false);
  });

  it("is dropped again when the panel leaves the document", () => {
    const container = pair();
    const panel = panelOf(container, "#p2");
    panel.remove();

    expect(panel.hasAttribute("hidden")).toBe(false);
  });

  it("belongs to the author when markup carries it", () => {
    const container = fixture(`
      <tab-list><tab-item id="t1" panel="p1" selected>One</tab-item></tab-list>
      <tab-panel id="p1" tab="t1" hidden><span>first</span></tab-panel>
    `);
    const panel = panelOf(container);

    expect(panel.getAttribute("hidden")).toBe("");
    expect(panel.firstElementChild!.checkVisibility()).toBe(false);
  });

  it("is taken back when the author removes it", () => {
    const container = pair();
    const panel = panelOf(container, "#p2");

    panel.setAttribute("hidden", "");
    panel.removeAttribute("hidden");

    expect(panel.getAttribute("hidden")).toBe("until-found");
  });
});

describe("the content of a tab-panel", () => {
  it("is shown while the tab is selected", () => {
    const container = pair();

    expect(panelOf(container, "#p1").firstElementChild!.checkVisibility()).toBe(
      true,
    );
  });

  it("is hidden while the tab is not selected", () => {
    const container = pair();

    expect(panelOf(container, "#p2").firstElementChild!.checkVisibility()).toBe(
      false,
    );
  });

  it("is hidden in a set that activates manually", () => {
    const container = pair("manual");

    expect(panelOf(container, "#p2").firstElementChild!.checkVisibility()).toBe(
      false,
    );
  });

  it("is hidden in a set that activates manually, styled or not", () => {
    styled(`
      tab-panel {
        display: block;
        padding: 16px;
        border: 1px solid;
        background: grey;
      }
    `);
    const container = pair("manual");
    const panel = panelOf(container, "#p2");
    const box = panel.getBoundingClientRect();

    // The rule of the user agent for the Hidden state gives way to the
    // display of the author; the rule of the library is what puts it back.
    expect(getComputedStyle(panel).display).toBe("none");
    expect(box.width).toBe(0);
    expect(box.height).toBe(0);
    expect(panel.firstElementChild!.checkVisibility()).toBe(false);
  });

  it("leaves no box behind when the author styled the panel", () => {
    styled(`
      tab-panel {
        display: block;
        padding: 16px;
        border: 1px solid;
        margin: 8px;
        min-height: 40px;
        background: grey;
      }
    `);
    const container = pair();
    const box = panelOf(container, "#p2").getBoundingClientRect();

    expect(box.width).toBe(0);
    expect(box.height).toBe(0);
  });
});

describe("the style sheet of the library", () => {
  it("is in the document of a panel", () => {
    pair();

    expect(document.adoptedStyleSheets).toHaveLength(1);
  });

  it("is in the document once, however many panels", () => {
    pair();
    pair();

    expect(document.adoptedStyleSheets).toHaveLength(1);
  });

  it("is in the shadow root a panel is in", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    trash.push(host);

    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
      <tab-list><tab-item id="t1" panel="p1">One</tab-item></tab-list>
      <tab-panel id="p1" tab="t1"><span>first</span></tab-panel>
    `;

    expect(root.adoptedStyleSheets).toHaveLength(1);
  });
});

describe("revealing the content of a tab-panel", () => {
  it("selects the tab of the panel the user found", async () => {
    const container = pair();

    await reveal("needle");

    expect(tabOf(container, "#t2").hasAttribute("selected")).toBe(true);
    expect(tabOf(container, "#t1").hasAttribute("selected")).toBe(false);
  });

  it("shows the content it revealed", async () => {
    const container = pair();

    await reveal("needle");
    const panel = panelOf(container, "#p2");

    expect(panel.hasAttribute("hidden")).toBe(false);
    expect(panel.firstElementChild!.checkVisibility()).toBe(true);
  });

  it("fires the toggle event of the tab it selected once", async () => {
    const container = pair();
    let toggles = 0;
    tabOf(container, "#t2").addEventListener("toggle", () => toggles++);

    await reveal("needle");

    expect(toggles).toBe(1);
  });

  it("reveals a panel nested in another panel", async () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="t1" panel="p1" selected>One</tab-item>
        <tab-item id="t2" panel="p2">Two</tab-item>
      </tab-list>
      <tab-panel id="p1" tab="t1"><span>first</span></tab-panel>
      <tab-panel id="p2" tab="t2">
        <tab-list>
          <tab-item id="t3" panel="p3" selected>Three</tab-item>
          <tab-item id="t4" panel="p4">Four</tab-item>
        </tab-list>
        <tab-panel id="p3" tab="t3"><span>third</span></tab-panel>
        <tab-panel id="p4" tab="t4"><span id="needle">fourth</span></tab-panel>
      </tab-panel>
    `);

    await reveal("needle");

    expect(tabOf(container, "#t2").hasAttribute("selected")).toBe(true);
    expect(tabOf(container, "#t4").hasAttribute("selected")).toBe(true);
    expect(panelOf(container, "#p4").firstElementChild!.checkVisibility()).toBe(
      true,
    );
  });

  it("does nothing for a panel that has no tab", async () => {
    const container = fixture(
      `<tab-panel hidden="until-found"><span id="needle">alone</span></tab-panel>`,
    );
    const panel = panelOf(container);

    panel.dispatchEvent(new Event("beforematch", { bubbles: true }));

    expect(panel.getAttribute("hidden")).toBe("until-found");
  });
});

describe("an attribute of a tab-panel in a namespace", () => {
  it("does not take the hidden attribute away from the panel", () => {
    const container = pair();
    const panel = panelOf(container, "#p2");

    expect(panel.getAttribute("hidden")).toBe("until-found");

    // As above: the local name is shared and nothing else, and the panel is
    // the one who wrote the real attribute. Taken for the author's, it would
    // hold the panel closed for the rest of its life.
    panel.setAttributeNS("urn:x", "x:hidden", "");

    tabOf(container, "#t2").setAttribute("selected", "");

    expect(panel.getAttributeNS(null, "hidden")).toBeNull();
  });
});
