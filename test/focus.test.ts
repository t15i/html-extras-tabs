import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "@vitest/browser/context";

import type { HTMLTabElement } from "../lib/index";
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

const tabOf = (container: ParentNode, selector = "tab-item"): HTMLTabElement =>
  container.querySelector<HTMLTabElement>(selector)!;

describe("the tabindex of a tab", () => {
  it("follows the tab into another set", () => {
    const container = fixture(`
      <tab-list id="one"><tab-item id="t1" selected>One</tab-item></tab-list>
      <tab-list id="two"><tab-item id="t2" selected>Two</tab-item></tab-list>
    `);

    // An ordinary move: the tab is removed and inserted again, and the two
    // reactions of that are interleaved by the platform.
    container.querySelector("#two")!.append(container.querySelector("#t1")!);

    expect(tabOf(container, "#t1").getAttribute("tabindex")).toBe("-1");
    expect(tabOf(container, "#t2").getAttribute("tabindex")).toBe("0");
  });

  it("is absent while the tab is in no tab set", () => {
    const tab = tabOf(fixture(`<tab-item></tab-item>`));

    expect(tab.hasAttribute("tabindex")).toBe(false);
  });

  it("is -1 for a tab of a set that is not the selected one", () => {
    const container = fixture(`
      <tab-list><tab-item></tab-item></tab-list>
    `);

    expect(tabOf(container).getAttribute("tabindex")).toBe("-1");
  });

  it("is 0 for the selected tab of a set", () => {
    const container = fixture(`
      <tab-list><tab-item selected></tab-item></tab-list>
    `);

    expect(tabOf(container).getAttribute("tabindex")).toBe("0");
  });

  it("follows the selection", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="a" selected></tab-item>
        <tab-item id="b"></tab-item>
      </tab-list>
    `);
    const a = tabOf(container, "#a");
    const b = tabOf(container, "#b");

    b.setAttribute("selected", "");

    expect(a.getAttribute("tabindex")).toBe("-1");
    expect(b.getAttribute("tabindex")).toBe("0");
  });

  it("is dropped when the tab leaves its set, and written again when it returns", () => {
    const container = fixture(`
      <tab-list><tab-item selected></tab-item></tab-list>
    `);
    const list = container.querySelector("tab-list")!;
    const tab = tabOf(container);

    tab.remove();
    expect(tab.hasAttribute("tabindex")).toBe(false);

    list.appendChild(tab);
    expect(tab.getAttribute("tabindex")).toBe("0");
  });

  it("is dropped while the set is out of the document, and written again on the way back", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="a" selected></tab-item>
        <tab-item id="b"></tab-item>
      </tab-list>
    `);
    const list = container.querySelector("tab-list")!;
    const a = tabOf(list, "#a");
    const b = tabOf(list, "#b");

    // Out of a document there is nobody to use a tabindex, so the tab is left
    // without one rather than kept right for nobody. Exclusivity is a
    // different matter and goes on holding there - see the tests of its own.
    list.remove();

    expect(a.hasAttribute("tabindex")).toBe(false);
    expect(b.hasAttribute("tabindex")).toBe(false);

    container.appendChild(list);

    expect(a.getAttribute("tabindex")).toBe("0");
    expect(b.getAttribute("tabindex")).toBe("-1");
  });

  it("is not written for a tab wrapped in an element of its own", () => {
    const container = fixture(`
      <tab-list><div><tab-item selected></tab-item></div></tab-list>
    `);

    expect(tabOf(container).hasAttribute("tabindex")).toBe(false);
  });

  it("is left alone once the author writes it, and taken back when the author removes it", () => {
    const container = fixture(`
      <tab-list><tab-item></tab-item></tab-list>
    `);
    const tab = tabOf(container);
    expect(tab.getAttribute("tabindex")).toBe("-1");

    tab.setAttribute("tabindex", "5");
    tab.selected = true;
    expect(tab.getAttribute("tabindex")).toBe("5");

    tab.removeAttribute("tabindex");
    expect(tab.getAttribute("tabindex")).toBe("0");
  });

  it("belongs to the author when markup carries it", () => {
    const container = fixture(`
      <tab-list><tab-item tabindex="5" selected></tab-item></tab-list>
    `);

    expect(tabOf(container).getAttribute("tabindex")).toBe("5");
  });

  it("is written for a disabled tab like for any other", () => {
    const container = fixture(`
      <tab-list><tab-item disabled selected></tab-item></tab-list>
    `);

    expect(tabOf(container).getAttribute("tabindex")).toBe("0");
  });
});

describe("the activation behavior of a tab", () => {
  it("selects the tab on a click of the user", async () => {
    const container = fixture(`
      <tab-list manual><tab-item>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    await userEvent.click(tab);

    expect(tab.selected).toBe(true);
  });

  it("selects the tab on click()", () => {
    const container = fixture(`
      <tab-list manual><tab-item>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    tab.click();

    expect(tab.selected).toBe(true);
  });

  it("selects the tab on Enter", async () => {
    const container = fixture(`
      <tab-list manual><tab-item>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    tab.focus();
    await userEvent.keyboard("{Enter}");

    expect(tab.selected).toBe(true);
  });

  it("selects the tab when Space is released", async () => {
    const container = fixture(`
      <tab-list manual><tab-item>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    tab.focus();
    await userEvent.keyboard("{ }");

    expect(tab.selected).toBe(true);
  });

  it("holds Space off until it is released, and cancels its default", () => {
    const container = fixture(`
      <tab-list manual><tab-item>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    const keydown = new KeyboardEvent("keydown", {
      key: " ",
      cancelable: true,
      bubbles: true,
    });
    tab.dispatchEvent(keydown);

    // Pressing is not activating, and the default has to go or the page
    // scrolls instead of the tab being selected.
    expect(tab.selected).toBe(false);
    expect(keydown.defaultPrevented).toBe(true);

    tab.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));

    expect(tab.selected).toBe(true);
  });

  it("leaves the default of Space alone on a disabled tab", () => {
    const container = fixture(`
      <tab-list manual><tab-item disabled>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    const keydown = new KeyboardEvent("keydown", {
      key: " ",
      cancelable: true,
      bubbles: true,
    });
    tab.dispatchEvent(keydown);
    tab.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));

    // The tab will not be activated, so eating the scrolling of the page would
    // give nothing back for it.
    expect(keydown.defaultPrevented).toBe(false);
    expect(tab.selected).toBe(false);
  });

  it("leaves keys of another kind alone", () => {
    const container = fixture(`
      <tab-list manual><tab-item>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    tab.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true }),
    );
    tab.dispatchEvent(new KeyboardEvent("keyup", { key: "a", bubbles: true }));

    expect(tab.selected).toBe(false);
  });

  it("leaves an activation key pressed on a descendant alone", () => {
    const container = fixture(`
      <tab-list manual><tab-item><button>Inside</button></tab-item></tab-list>
    `);
    const tab = tabOf(container);
    const inside = tab.querySelector("button")!;

    inside.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    inside.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true }),
    );
    inside.dispatchEvent(
      new KeyboardEvent("keyup", { key: " ", bubbles: true }),
    );

    // The keys belong to whatever the author put inside the tab.
    expect(tab.selected).toBe(false);
  });

  it("keeps the selection of a tab that is already selected", () => {
    const container = fixture(`
      <tab-list manual><tab-item selected>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    tab.click();

    expect(tab.selected).toBe(true);
  });

  it("turns the selection off and on again in a set that holds several", () => {
    const container = fixture(`
      <tab-list multiple><tab-item selected>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    tab.click();
    expect(tab.selected).toBe(false);

    tab.click();
    expect(tab.selected).toBe(true);
  });

  it("reads the set of a tab out of the document like any other", () => {
    const list = document.createElement("tab-list");
    list.setAttribute("multiple", "");
    list.innerHTML = `<tab-item selected>Tab</tab-item>`;
    const tab = list.firstElementChild as HTMLTabElement;

    // Activation asks what kind of set the tab is in, and the answer is the
    // parent list wherever it stands. What a set out of the document does not
    // get is the invariant of exclusivity - see the tests of its own.
    tab.click();

    expect(tab.selected).toBe(false);
  });

  it("does nothing for a disabled tab, whichever way it is activated", async () => {
    const container = fixture(`
      <tab-list manual><tab-item disabled>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);

    await userEvent.click(tab);
    expect(tab.selected).toBe(false);

    tab.click();
    expect(tab.selected).toBe(false);

    tab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(tab.selected).toBe(false);

    tab.focus();
    await userEvent.keyboard("{Enter}");
    expect(tab.selected).toBe(false);
  });

  it("is out of reach of a click on a disabled tab, but not of the event a script dispatches", async () => {
    const container = fixture(`
      <tab-list manual><tab-item disabled>Tab</tab-item></tab-list>
    `);
    const tab = tabOf(container);
    const clicks: string[] = [];
    tab.addEventListener("click", (event) => {
      clicks.push(String(event.isTrusted));
    });

    await userEvent.click(tab);
    tab.click();
    tab.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(clicks).toEqual(["false"]);
  });
});

describe("automatic activation", () => {
  it("selects the tab that takes focus", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="a" selected>A</tab-item>
        <tab-item id="b">B</tab-item>
      </tab-list>
    `);

    tabOf(container, "#b").focus();

    expect(tabOf(container, "#a").selected).toBe(false);
    expect(tabOf(container, "#b").selected).toBe(true);
  });

  it("does not select the tab that takes focus in a manual list", () => {
    const container = fixture(`
      <tab-list manual>
        <tab-item id="a" selected>A</tab-item>
        <tab-item id="b">B</tab-item>
      </tab-list>
    `);

    tabOf(container, "#b").focus();

    expect(tabOf(container, "#b").selected).toBe(false);
  });

  it("does not select the tab that takes focus in a list that holds several selections", () => {
    const container = fixture(`
      <tab-list multiple>
        <tab-item id="a" selected>A</tab-item>
        <tab-item id="b">B</tab-item>
      </tab-list>
    `);

    tabOf(container, "#b").focus();

    expect(tabOf(container, "#b").selected).toBe(false);
  });

  it("does not select a tab that is in no tab set", () => {
    const container = fixture(`<tab-item tabindex="0">Loose</tab-item>`);
    const tab = tabOf(container);

    tab.focus();

    expect(tab.selected).toBe(false);
  });
});

describe("an attribute of a tab in a namespace", () => {
  it("does not take the tabindex attribute away from the tab", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="t1" selected>One</tab-item>
        <tab-item id="t2">Two</tab-item>
      </tab-list>
    `);
    const tab = tabOf(container, "#t1");

    expect(tab.getAttribute("tabindex")).toBe("0");

    // It shares the local name of the attribute the tab wrote itself and
    // nothing else. Hearing about it must not record the tab's own value as
    // the author's, which would leave the tab out of the tab order for good.
    tab.setAttributeNS("urn:x", "x:tabindex", "5");

    tabOf(container, "#t2").setAttribute("selected", "");

    expect(tab.getAttributeNS(null, "tabindex")).toBe("-1");
  });
});
