import {
  Argument,
  Attribute,
  BlinklikeHTMLCollection,
  Constructor,
  Exposed,
  Interface,
  InterfaceType,
  Internals,
  Long,
  Nullable,
  Operation,
  Optional,
  Setter,
  CollectionRule,
  Undefined,
  Union,
  UnsignedLong,
  type BlinklikeHTMLCollectionData,
  type BlinklikeHTMLCollectionInternals,
} from "@html-extras/core";

import { TAB_ITEM } from "./names";

import type { HTMLTabElement } from "./HTMLTabElement";
import type { HTMLTabListElement } from "./HTMLTabListElement";

/**
 * The backing store of a tabs collection, whose root is always a tab list.
 */
interface HTMLTabsCollectionData extends BlinklikeHTMLCollectionData<HTMLTabElement> {
  root: HTMLTabListElement;
}

/**
 * The internals of a tabs collection.
 */
interface HTMLTabsCollectionInternals extends BlinklikeHTMLCollectionInternals {
  data: HTMLTabsCollectionData;
}

/**
 * The internals of the collection, narrowed to the store above.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- see above
export interface HTMLTabsCollection {
  /** @internal */
  [Internals]: HTMLTabsCollectionInternals;
}

/**
 * The `HTMLTabsCollection` interface represents a collection of `tab-item`
 * (`HTMLTabElement`) elements, always rooted at a `tab-list` element.
 */
@Exposed("Window")
@Interface("HTMLTabsCollection")
@Constructor([Argument(InterfaceType(HTMLElement), "root")])
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- see the interface above
export class HTMLTabsCollection extends BlinklikeHTMLCollection<HTMLTabElement> {
  /**
   * @param root - The list to collect the tabs of.
   */
  constructor(root: HTMLElement) {
    super(root, RULE);
  }

  /**
   * Returns or sets the number of tabs in the collection. Setting it either
   * grows the tab set with new tabs or cuts tabs off its end.
   */
  @Attribute(UnsignedLong)
  override get length(): number {
    return this[Internals].data.length;
  }

  @Attribute(UnsignedLong)
  override set length(value: number) {
    const data = this[Internals].data;

    const current = data.length;

    if (value > current) {
      if (value > 100_000) return;

      appendTabs(data, value - current);
      return;
    }

    for (let index = current - 1; index >= value; index--) {
      data.item(index)!.remove();
    }
  }

  /**
   * Returns or sets the index of the selected tab of the tab set. The value
   * -1 indicates no tab is selected.
   */
  @Attribute(Long)
  get selectedIndex(): number {
    return this[Internals].data.root.selectedIndex;
  }

  @Attribute(Long)
  set selectedIndex(value: number) {
    this[Internals].data.root.selectedIndex = value;
  }

  /**
   * Adds a tab to the tab set.
   *
   * @param tab - The tab to insert.
   * @param before - The tab to insert it before, either as an element or as
   *   an index into the collection. Appended to the set when it is null, and
   *   when the index is out of range.
   *
   * @returns Nothing.
   *
   * @throws A "HierarchyRequestError" `DOMException` if `tab` is an ancestor
   *   of the list, and a "NotFoundError" `DOMException` if `before` is an
   *   element that is not a child of the list.
   */
  // @ts-expect-error the argument type is narrowed to the tab after the class
  // bodies - see references.ts
  @Operation(Undefined, [
    Argument(InterfaceType(HTMLElement), "tab"),
    Optional(
      Argument(Nullable(Union(InterfaceType(HTMLElement), Long)), "before"),
      null,
    ),
  ])
  add(
    tab: HTMLTabElement,
    before: HTMLElement | number | null = null,
  ): undefined {
    const data = this[Internals].data;

    if (tab.contains(data.root)) {
      throw new DOMException(
        "The tab to add is an ancestor of the list to add it to.",
        "HierarchyRequestError",
      );
    }

    if (before instanceof Element && before.parentNode !== data.root) {
      throw new DOMException(
        "The element to add the tab before is not a child of the list.",
        "NotFoundError",
      );
    }

    if (tab === before) return undefined;

    let reference: Node | null = null;
    if (before instanceof Node) reference = before;
    else if (typeof before === "number") reference = data.item(before);

    const parent = reference !== null ? reference.parentNode! : data.root;
    parent.insertBefore(tab, reference);

    return undefined;
  }

  /**
   * Removes the tab at the given index from the tab set.
   *
   * @param index - The index of the tab to remove.
   *
   * @returns Nothing.
   */
  @Operation(Undefined, [Argument(Long, "index")])
  remove(index: number): undefined {
    removeTab(this[Internals].data, index);
    return undefined;
  }

  /**
   * Puts `tab` at `index`, or removes what is there when it is null.
   *
   * @param index - The index to put it at.
   * @param tab - The tab, or null.
   */
  @Setter
  @Operation(Undefined, [
    Argument(UnsignedLong, "index"),
    Argument(Nullable(InterfaceType(HTMLElement)), "tab"),
  ])
  // eslint-disable-next-line no-unused-private-class-members -- the decorator is what calls it
  #set(index: number, tab: HTMLElement | null): undefined {
    const data = this[Internals].data;

    if (tab === null) {
      removeTab(data, index);
      return undefined;
    }

    const delta = index - data.length;

    if (delta > 0) appendTabs(data, delta);

    if (delta >= 0) data.root.appendChild(tab);
    else data.item(index)!.replaceWith(tab);

    return undefined;
  }
}

/**
 * Membership of a tab set: the direct `tab-item` children of a `tab-list`.
 */
const RULE: CollectionRule = new CollectionRule({
  matches(element: Element): boolean {
    return element.localName === TAB_ITEM;
  },
});

/**
 * Removes the tab at `index` of `data`, if there is one.
 *
 * @param data - The backing store of the collection.
 * @param index - The index of the tab to remove.
 */
function removeTab(data: HTMLTabsCollectionData, index: number): void {
  const tab = data.item(index);
  if (tab === null) return;

  tab.remove();
}

/**
 * Appends `count` new tabs to the list `data` is rooted at.
 *
 * @param data - The backing store of the collection.
 * @param count - How many tabs to append.
 */
function appendTabs(data: HTMLTabsCollectionData, count: number): void {
  const list = data.root;
  const document = list.ownerDocument;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index++) {
    fragment.appendChild(document.createElement(TAB_ITEM));
  }

  list.appendChild(fragment);
}
