import { afterEach, describe, expect, it } from "vitest";

import { internalsOf } from "./internals";

import type { HTMLTabElement, HTMLTabListElement } from "../lib/index";
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

const listOf = (container: ParentNode): HTMLTabListElement =>
  container.querySelector("tab-list")!;

const selection = (container: ParentNode): string[] =>
  [...container.querySelectorAll<HTMLTabElement>("tab-item")]
    .filter((tab) => tab.hasAttribute("selected"))
    .map((tab) => tab.id);

describe("tab-list", () => {
  it("takes the tablist role", () => {
    const list = listOf(fixture(`<tab-list></tab-list>`));

    expect(internalsOf(list).role).toBe("tablist");
  });

  describe("multiple", () => {
    it("is left out of aria-multiselectable when it is absent", () => {
      const list = listOf(fixture(`<tab-list></tab-list>`));

      expect(list.multiple).toBe(false);
      expect(internalsOf(list).ariaMultiSelectable).toBeNull();
    });

    it("is reported as true when it is there", () => {
      const list = listOf(fixture(`<tab-list multiple></tab-list>`));

      expect(list.multiple).toBe(true);
      expect(internalsOf(list).ariaMultiSelectable).toBe("true");
    });

    it("follows the attribute", () => {
      const list = listOf(fixture(`<tab-list></tab-list>`));

      list.multiple = true;
      expect(internalsOf(list).ariaMultiSelectable).toBe("true");

      list.multiple = false;
      expect(internalsOf(list).ariaMultiSelectable).toBeNull();
    });

    it("leaves one selected tab when it is removed", () => {
      const container = fixture(`
        <tab-list multiple>
          <tab-item id="a" selected></tab-item>
          <tab-item id="b" selected></tab-item>
          <tab-item id="c" selected></tab-item>
        </tab-list>
      `);

      listOf(container).multiple = false;

      expect(selection(container)).toEqual(["a"]);
    });

    it("changes nothing about the selection when it is added", () => {
      const container = fixture(`
        <tab-list>
          <tab-item id="a" selected></tab-item>
          <tab-item id="b"></tab-item>
        </tab-list>
      `);

      listOf(container).multiple = true;

      expect(selection(container)).toEqual(["a"]);
    });

    it("leaves the tabs of another list alone when it is removed", () => {
      const container = fixture(`
        <tab-list multiple id="first">
          <tab-item id="a" selected></tab-item>
          <tab-item id="b" selected></tab-item>
        </tab-list>
        <tab-list multiple id="second">
          <tab-item id="c" selected></tab-item>
          <tab-item id="d" selected></tab-item>
        </tab-list>
      `);

      container.querySelector<HTMLTabListElement>("#first")!.multiple = false;

      expect(selection(container)).toEqual(["a", "c", "d"]);
    });
  });

  describe("manual", () => {
    it("reflects the attribute", () => {
      const list = listOf(fixture(`<tab-list manual></tab-list>`));

      expect(list.manual).toBe(true);

      list.manual = false;
      expect(list.hasAttribute("manual")).toBe(false);
    });
  });

  describe("orientation", () => {
    it("is horizontal while the attribute is missing", () => {
      const list = listOf(fixture(`<tab-list></tab-list>`));

      expect(list.orientation).toBe("horizontal");
      expect(internalsOf(list).ariaOrientation).toBe("horizontal");
    });

    it("is vertical when the attribute says so", () => {
      const list = listOf(
        fixture(`<tab-list orientation="vertical"></tab-list>`),
      );

      expect(list.orientation).toBe("vertical");
      expect(internalsOf(list).ariaOrientation).toBe("vertical");
    });

    it("answers with the canonical keyword, whatever case the attribute is in", () => {
      const list = listOf(
        fixture(`<tab-list orientation="VeRtIcAl"></tab-list>`),
      );

      expect(list.orientation).toBe("vertical");
      expect(internalsOf(list).ariaOrientation).toBe("vertical");
    });

    it("falls back to horizontal for a value that is not a keyword", () => {
      const list = listOf(
        fixture(`<tab-list orientation="sideways"></tab-list>`),
      );

      expect(list.orientation).toBe("horizontal");
      expect(internalsOf(list).ariaOrientation).toBe("horizontal");
    });

    it("falls back to horizontal for an empty value", () => {
      const list = listOf(fixture(`<tab-list orientation=""></tab-list>`));

      expect(list.orientation).toBe("horizontal");
    });

    it("writes the attribute as it was given", () => {
      const list = listOf(fixture(`<tab-list></tab-list>`));

      list.orientation = "vertical";

      expect(list.getAttribute("orientation")).toBe("vertical");
      expect(internalsOf(list).ariaOrientation).toBe("vertical");
    });
  });
});
