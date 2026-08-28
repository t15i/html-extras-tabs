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

const tabOf = (container: ParentNode, id: string): HTMLTabElement =>
  container.querySelector<HTMLTabElement>(`#${id}`)!;

/**
 * The id of the element focus is on.
 */
const focused = (): string => document.activeElement?.id ?? "";

/**
 * Presses a key on the element focus is on, the way a script does.
 *
 * @param key - The key.
 *
 * @returns The event, so that a test can see whether it was canceled.
 */
function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  document.activeElement!.dispatchEvent(event);
  return event;
}

/**
 * A list of three tabs, focus on the first.
 *
 * @param attributes - The attributes of the list.
 *
 * @returns The container.
 */
function list(attributes = ""): HTMLElement {
  const container = fixture(`
    <tab-list ${attributes}>
      <tab-item id="a">A</tab-item>
      <tab-item id="b">B</tab-item>
      <tab-item id="c">C</tab-item>
    </tab-list>
  `);
  tabOf(container, "a").focus();
  return container;
}

describe("moving focus around a tab set", () => {
  it("moves to the next tab and back on the arrows of a row", () => {
    list();

    press("ArrowRight");
    expect(focused()).toBe("b");

    press("ArrowLeft");
    expect(focused()).toBe("a");
  });

  it("moves on the arrows of a column when the set is a column", () => {
    list(`orientation="vertical"`);

    press("ArrowDown");
    expect(focused()).toBe("b");

    press("ArrowUp");
    expect(focused()).toBe("a");
  });

  it("leaves the arrows of the other axis alone", () => {
    list();

    const event = press("ArrowDown");

    expect(focused()).toBe("a");
    expect(event.defaultPrevented).toBe(false);
  });

  it("wraps around at both ends", () => {
    const container = list();

    press("ArrowLeft");
    expect(focused()).toBe("c");

    press("ArrowRight");
    expect(focused()).toBe("a");

    tabOf(container, "c").focus();
    press("ArrowRight");
    expect(focused()).toBe("a");
  });

  it("moves to the first and the last tab on Home and End", () => {
    list();

    press("End");
    expect(focused()).toBe("c");

    press("Home");
    expect(focused()).toBe("a");
  });

  it("cancels the event it acted on", () => {
    list();

    expect(press("ArrowRight").defaultPrevented).toBe(true);
  });

  it("leaves a canceled event alone", () => {
    const container = list();
    container
      .querySelector("tab-list")!
      .addEventListener("keydown", (event) => event.preventDefault(), {
        capture: true,
      });

    press("ArrowRight");

    expect(focused()).toBe("a");
  });

  it("moves onto a disabled tab like onto any other", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="a">A</tab-item>
        <tab-item id="b" disabled>B</tab-item>
        <tab-item id="c">C</tab-item>
      </tab-list>
    `);
    tabOf(container, "a").focus();

    press("ArrowRight");

    expect(focused()).toBe("b");
    expect(tabOf(container, "b").selected).toBe(false);
  });

  it("counts only the tabs of the set", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="a">A</tab-item>
        <div><tab-item id="wrapped">W</tab-item></div>
        <tab-item id="b">B</tab-item>
      </tab-list>
    `);
    tabOf(container, "a").focus();

    press("ArrowRight");

    expect(focused()).toBe("b");
  });

  it("does nothing for a key pressed on a tab of another list", () => {
    const container = fixture(`
      <tab-list><tab-item id="a">A</tab-item></tab-list>
      <tab-list><tab-item id="b">B</tab-item></tab-list>
    `);
    tabOf(container, "b").focus();

    press("ArrowRight");

    expect(focused()).toBe("b");
  });

  it("does nothing for a key pressed on something that is not a tab", () => {
    const container = fixture(`
      <tab-list>
        <button id="button">Button</button>
        <tab-item id="a">A</tab-item>
      </tab-list>
    `);
    container.querySelector<HTMLElement>("#button")!.focus();

    press("ArrowRight");

    expect(focused()).toBe("button");
  });

  it("does nothing for a tab that is not a direct child of the list", () => {
    const container = fixture(`
      <tab-list>
        <tab-item id="a">A</tab-item>
        <div><tab-item id="wrapped">W</tab-item></div>
      </tab-list>
    `);
    tabOf(container, "wrapped").setAttribute("tabindex", "0");
    tabOf(container, "wrapped").focus();

    press("ArrowRight");

    expect(focused()).toBe("wrapped");
  });

  it("moves focus on a key of the user", async () => {
    list();

    await userEvent.keyboard("{ArrowRight}");

    expect(focused()).toBe("b");
  });
});

describe("activation while focus moves", () => {
  it("selects the tab focus lands on", () => {
    const container = list();

    press("ArrowRight");

    expect(tabOf(container, "b").selected).toBe(true);
    expect(tabOf(container, "a").selected).toBe(false);
  });

  it("selects nothing in a manual list", () => {
    const container = list("manual");

    press("ArrowRight");

    expect(focused()).toBe("b");
    expect(tabOf(container, "b").selected).toBe(false);
  });

  it("selects nothing in a list that holds several selections", () => {
    const container = list("multiple");

    press("ArrowRight");

    expect(focused()).toBe("b");
    expect(tabOf(container, "b").selected).toBe(false);
  });
});
