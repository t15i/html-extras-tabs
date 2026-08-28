import {
  Argument,
  Attribute,
  BlinklikeHTMLCollection,
  Boolean,
  CollectionRule,
  Constructor,
  DOMString,
  effect,
  Element as SpecElement,
  EnumeratedAttributeState,
  EnumeratedAttributeStates,
  Exposed,
  Interface,
  InterfaceObject,
  InterfaceType,
  Long,
  Nullable,
  Operation,
  Optional,
  Reflect,
  signal,
  Undefined,
  Union,
  UnsignedLong,
  watch,
  type RegularAttribute,
  type Signal,
  forward,
  backward,
} from "@html-extras/core";

import { TAB_ITEM } from "./names";

import { HTMLTabElement } from "./HTMLTabElement";
import { HTMLTabsCollection } from "./HTMLTabsCollection";

/**
 * A control for selecting tabs from a tab set.
 */
@Exposed("Window")
@Interface
@Constructor
export class HTMLTabListElement extends HTMLElement {
  /**
   * Whether the tab set holds several selected tabs at once.
   */
  @Reflect
  @Attribute(Boolean)
  accessor multiple: boolean = false;

  /**
   * Whether moving focus to a tab leaves selecting it to the user.
   */
  @Reflect
  @Attribute(Boolean)
  accessor manual: boolean = false;

  /**
   * The axis the tabs of the set are laid out along.
   */
  @Reflect
  @Attribute(DOMString)
  accessor orientation: string = "horizontal";

  @Attribute(InterfaceType(HTMLTabsCollection))
  get tabs(): HTMLTabsCollection {
    return this.#tabs;
  }

  @Attribute(InterfaceType(HTMLCollection))
  get selectedTabs(): HTMLCollectionOf<HTMLTabElement> {
    return this.#selectedTabs;
  }

  /**
   * The number of tabs in the tab set.
   */
  @Attribute(UnsignedLong)
  get length(): number {
    return this.#tabs.length;
  }

  @Attribute(UnsignedLong)
  set length(value: number) {
    this.#tabs.length = value;
  }

  /**
   * The index of the first selected tab of the tab set, or -1 when none is
   * selected.
   */
  @Attribute(Long)
  get selectedIndex(): number {
    let index = 0;
    for (const tab of forward(this.#tabs)) {
      if (tab.hasAttribute("selected")) return index;
      index++;
    }

    return -1;
  }

  /**
   * Leaves the tab set with the tab at `value` selected and nothing else.
   */
  @Attribute(Long)
  set selectedIndex(value: number) {
    let firstMatchingTab: Element | null = null;

    let index = 0;
    for (const tab of forward(this.#tabs)) {
      if (firstMatchingTab === null && index === value) {
        firstMatchingTab = tab;
      } else {
        tab.removeAttribute("selected");
      }

      index++;
    }

    firstMatchingTab?.setAttribute("selected", "");
  }

  /**
   * The tab at `index` of the tab set, or null when there is none.
   */
  @Operation(Nullable(InterfaceType(HTMLElement)), [
    Argument(UnsignedLong, "index"),
  ])
  item(index: number): HTMLTabElement | null {
    return this.#tabs.item(index);
  }

  /**
   * The first tab of the set whose id or `name` is `name`, or null when there
   * is none.
   */
  @Operation(Nullable(InterfaceType(HTMLElement)), [
    Argument(DOMString, "name"),
  ])
  namedItem(name: string): HTMLTabElement | null {
    return this.#tabs.namedItem(name);
  }

  /**
   * Inserts a tab into the tab set.
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
    return this.#tabs.add(tab, before);
  }

  /**
   * Removes the list itself, or the tab at the given index of its tab set.
   */
  declare remove: {
    (): undefined;
    (index: number): undefined;
  };

  @Operation(Undefined)
  // eslint-disable-next-line no-unused-private-class-members -- the decorator is what calls it
  #remove1(): undefined {
    Element.prototype.remove.call(this);
    return undefined;
  }

  @Operation(Undefined, [Argument(Long, "index")])
  // eslint-disable-next-line no-unused-private-class-members -- the decorator is what calls it
  #remove2(index: number): undefined {
    return this.#tabs.remove(index);
  }

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "tablist";

    this.#tabs = new HTMLTabsCollection(this);
    this.#selectedTabs = new BlinklikeHTMLCollection(this, SELECTED_TABS_RULE);

    this.#multiple = signal(false);
    this.#manual = signal(false);
    this.#orientation = signal(HORIZONTAL.canonicalKeyword);

    watch(this.#multiple, () => {
      this.#ensureExclusivity();
    });

    effect(() => {
      // An inapplicable state is no state: a set that holds one selection at a
      // time is not a set that was marked as holding one.
      this.#internals.ariaMultiSelectable = this.#multiple() ? "true" : null;
    });

    effect(() => {
      this.#internals.ariaOrientation = this.#orientation();
    });

    this.addEventListener("keydown", this.#onKeyDown);
  }

  attributeChangedCallback(name: string): void {
    switch (String(name)) {
      case "multiple":
        this.#multiple(this.multiple);
        break;
      case "manual":
        this.#manual(this.manual);
        break;
      case "orientation":
        this.#orientation(this.orientation);
        break;
    }
  }

  #internals: ElementInternals;

  #tabs: HTMLTabsCollection;

  #selectedTabs: BlinklikeHTMLCollection<HTMLTabElement>;

  #multiple: Signal<boolean>;

  #manual: Signal<boolean>;

  #orientation: Signal<string>;

  /**
   * Leaves the first selected tab of the set selected and unselects the rest,
   * unless the set is one that holds several selections at a time.
   */
  #ensureExclusivity(): void {
    if (this.hasAttribute("multiple")) return;

    let selected = false;

    for (const tab of forward(this.#selectedTabs)) {
      if (!selected) {
        selected = true;
        continue;
      }

      tab.removeAttribute("selected");
    }
  }

  /**
   * Moves focus around the tab set, on the keys the platform moves it with.
   *
   * @param event - The keydown event.
   */
  #onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.localName !== TAB_ITEM) return;
    if (target.parentElement !== this) return;

    let tab;

    const key = event.key;
    const vertical = this.orientation === "vertical";
    if (key === (vertical ? "ArrowUp" : "ArrowLeft")) {
      tab =
        backward(this.#tabs, target).next().value ??
        backward(this.#tabs).next().value;
    } else if (key === (vertical ? "ArrowDown" : "ArrowRight")) {
      tab =
        forward(this.#tabs, target).next().value ??
        forward(this.#tabs).next().value;
    } else if (key === "Home") {
      tab = forward(this.#tabs).next().value;
    } else if (key === "End") {
      tab = backward(this.#tabs).next().value;
    }

    if (tab) {
      event.preventDefault();
      tab.focus();
    }
  }
}

const SELECTED_TABS_RULE: CollectionRule = new CollectionRule({
  matches(element: Element): boolean {
    return element.localName === TAB_ITEM && element.hasAttribute("selected");
  },
  attributes: ["selected"],
});

const iface = InterfaceObject.getInterfaceOf(HTMLTabListElement)!;
const orientation = iface.members["orientation"] as RegularAttribute;

orientation.limitedToOnlyKnownValues = true;

const HORIZONTAL = new EnumeratedAttributeState({
  conformingKeywords: new Set(["horizontal"]),
});
const VERTICAL = new EnumeratedAttributeState({
  conformingKeywords: new Set(["vertical"]),
});
SpecElement.defineContentAttribute(HTMLTabListElement, "orientation", {
  states: new EnumeratedAttributeStates({
    states: [HORIZONTAL, VERTICAL],
    missingValueDefault: HORIZONTAL,
    invalidValueDefault: HORIZONTAL,
  }),
});
