import {
  Argument,
  Attribute,
  sourced,
  BlinklikeHTMLCollection,
  Boolean,
  CollectionRule,
  computed,
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
  Undefined,
  Union,
  UnsignedLong,
  watch,
  type Sourced,
  type ReadonlySignal,
  type RegularAttribute,
  forward,
  backward,
} from "@html-extras/core";

import { TAB_ITEM } from "./names";

import { lists } from "./HTMLTabListElementShare";

import { HTMLTabElement } from "./HTMLTabElement";
import { HTMLTabsCollection } from "./HTMLTabsCollection";

/**
 * The `HTMLTabListElement` interface represents a `tab-list` element: a
 * control for selecting tabs from a tab set.
 */
@Exposed("Window")
@Interface("HTMLTabListElement")
@Constructor
export class HTMLTabListElement extends HTMLElement {
  static observedAttributes: string[] = ["multiple", "manual", "orientation"];

  /**
   * A boolean value reflecting the `multiple` HTML attribute, which indicates
   * whether more than one tab of the set can be selected at a time.
   */
  @Reflect
  @Attribute(Boolean)
  accessor multiple: boolean = false;

  /**
   * A boolean value reflecting the `manual` HTML attribute, which indicates
   * whether moving focus to a tab leaves selecting it to the user.
   */
  @Reflect
  @Attribute(Boolean)
  accessor manual: boolean = false;

  /**
   * A string reflecting the `orientation` HTML attribute, which contains the
   * axis the tabs of the set are laid out along.
   */
  @Reflect
  @Attribute(DOMString)
  accessor orientation: string = "";

  /**
   * An `HTMLTabsCollection` representing the set of `tab-item`
   * (`HTMLTabElement`) elements contained by this element.
   *
   * @readonly
   */
  @Attribute(InterfaceType(HTMLTabsCollection))
  get tabs(): HTMLTabsCollection {
    return this.#tabs;
  }

  /**
   * An `HTMLCollection` representing the set of `tab-item` elements that are
   * selected.
   *
   * @readonly
   */
  @Attribute(InterfaceType(HTMLCollection))
  get selectedTabs(): HTMLCollectionOf<HTMLTabElement> {
    return this.#selectedTabs;
  }

  /**
   * An unsigned long returning or setting the number of tabs in the tab set.
   * Setting it either grows the set with new tabs or cuts tabs off its end.
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
   * A long reflecting the index of the first selected tab of the set. The
   * value -1 indicates no tab is selected. Setting it leaves the set with the
   * tab at that index selected and nothing else.
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
   * Returns the tab at the given index in the tab set, or null if there is
   * none.
   */
  @Operation(Nullable(InterfaceType(HTMLElement)), [
    Argument(UnsignedLong, "index"),
  ])
  item(index: number): HTMLTabElement | null {
    return this.#tabs.item(index);
  }

  /**
   * Returns the first tab in the set whose id or `name` is the given name, or
   * null if there is none.
   */
  @Operation(Nullable(InterfaceType(HTMLElement)), [
    Argument(DOMString, "name"),
  ])
  namedItem(name: string): HTMLTabElement | null {
    return this.#tabs.namedItem(name);
  }

  /**
   * Adds a tab to the tab set, before the tab given as `before` or at its end.
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
   * Removes the tab list itself, or the tab at the given index of its tab
   * set.
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

    this.#multiple = sourced(() => this.multiple, false);
    this.#manual = sourced(() => this.manual, false);
    this.#orientation = sourced(
      () => this.orientation,
      ORIENTATION.missingValueDefault!.canonicalKeyword,
    );

    this.#automatic = computed(() => !this.#multiple() && !this.#manual());

    effect(() => {
      this.#internals.ariaMultiSelectable = this.#multiple() ? "true" : null;
    });

    effect(() => {
      this.#internals.ariaOrientation = this.#orientation();
    });

    watch(this.#multiple, () => this.#ensureExclusivity());

    this.addEventListener("keydown", this.#onKeyDown);

    lists.share(this, { automatic: this.#automatic });
  }

  attributeChangedCallback(
    name: string,
    _: string | null,
    __: string | null,
    namespace: string | null,
  ): void {
    if (namespace !== null) return;

    switch (String(name)) {
      case "multiple":
        this.#multiple.announce();
        break;
      case "manual":
        this.#manual.announce();
        break;
      case "orientation":
        this.#orientation.announce();
        break;
    }
  }

  #internals: ElementInternals;

  #tabs: HTMLTabsCollection;

  #selectedTabs: BlinklikeHTMLCollection<HTMLTabElement>;

  #multiple: Sourced<boolean>;

  #manual: Sourced<boolean>;

  #orientation: Sourced<string>;

  #automatic: ReadonlySignal<boolean>;

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

/**
 * The states the `orientation` attribute can be in.
 */
const ORIENTATION = new EnumeratedAttributeStates({
  states: [HORIZONTAL, VERTICAL],
  missingValueDefault: HORIZONTAL,
  invalidValueDefault: HORIZONTAL,
});

SpecElement.defineContentAttribute(HTMLTabListElement, "orientation", {
  states: ORIENTATION,
});
