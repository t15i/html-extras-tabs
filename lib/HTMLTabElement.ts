import {
  Attribute,
  backward,
  Boolean,
  clickSuppressor,
  connectivity,
  Constructor,
  effect,
  Exposed,
  forward,
  Interface,
  InterfaceType,
  Long,
  Nullable,
  Reflect,
  ref,
  refTarget,
  signal,
  tabindex,
  ToggleTaskTracker,
  watch,
  type Reference,
  type Signal,
  type TabIndex,
} from "@html-extras/core";

import { TAB_LIST } from "./names";

import { tabs } from "./HTMLTabElementShare";

import type { HTMLTabListElement } from "./HTMLTabListElement";
import type { HTMLTabPanelElement } from "./HTMLTabPanelElement";

/**
 * A tab of the tab set of a `tab-list`.
 */
@Exposed("Window")
@Interface
@Constructor
export class HTMLTabElement extends HTMLElement {
  static observedAttributes: string[] = ["id", "tabindex"];

  /**
   * Whether the tab is selected, and its panel therefore shown.
   */
  @Reflect
  @Attribute(Boolean)
  accessor selected: boolean = false;

  /**
   * Whether activating the tab is disabled.
   */
  @Reflect
  @Attribute(Boolean)
  accessor disabled: boolean = false;

  /**
   * The panel this tab controls.
   */
  @Reflect("panel")
  @Attribute(Nullable(InterfaceType(HTMLElement)))
  accessor panelElement: HTMLTabPanelElement | null = null;

  /**
   * The number of tabs of the same tab set that come before this one in tree
   * order, or -1 when the tab is in no tab set.
   */
  @Attribute(Long)
  get index(): number {
    const list = this.#list;
    if (list === null) return -1;

    const preceding = backward(list.tabs, this);

    let index = 0;
    while (!preceding.next().done) index++;

    return index;
  }

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "tab";

    this.#toggle = new ToggleTaskTracker(this);

    const { connected, root, mount } = connectivity(this);
    this.#connected = connected;

    this.#id = signal(null);
    this.#disabled = signal(false);
    this.#selected = signal(false);

    this.#panelElement = ref(() => this.panelElement, root);

    this.#tabindex = tabindex(this, () => {
      if (!this.#connected()) return null;
      return this.#list ? (this.#selected() ? 0 : -1) : null;
    });

    mount(() => this.#ensureTabExclusivityByClosingTab());

    watch(this.#selected, (selected, oldSelected) => {
      if (oldSelected === undefined) return;

      this.#toggle.queue(
        oldSelected ? "open" : "closed",
        selected ? "open" : "closed",
      );

      if (selected) this.#ensureTabExclusivityByClosingOtherTabs();
    });

    effect(() => {
      this.#internals.ariaSelected = this.#selected() ? "true" : "false";
    });

    effect(() => {
      // null is used instead of false to avoid overwriting
      // aria-disabled="true" received from ancestors
      this.#internals.ariaDisabled = this.#disabled() ? "true" : null;
    });

    effect(() => {
      const panel = this.#panelElement();
      if (panel) {
        this.#internals.ariaExpanded = this.#selected() ? "true" : "false";
        this.#internals.ariaControlsElements = [panel];
      } else {
        this.#internals.ariaExpanded = null;
        this.#internals.ariaControlsElements = null;
      }
    });

    refTarget(this, {
      id: this.#id,
      root,
    });

    clickSuppressor(this, {
      suppress: this.#disabled,
      root,
    });

    this.addEventListener("focus", this.#onFocus);
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeyDown);
    this.addEventListener("keyup", this.#onKeyUp);

    tabs.share(this, { selected: this.#selected });
  }

  override click(): void {
    if (this.disabled) return;
    super.click();
  }

  connectedCallback(): void {
    this.#connected(true);
  }

  disconnectedCallback(): void {
    this.#connected(false);
  }

  attributeChangedCallback(
    name: string,
    _: string | null,
    value: string | null,
  ): void {
    switch (String(name)) {
      case "selected":
        this.#selected(this.selected);
        break;
      case "disabled":
        this.#disabled(this.disabled);
        break;
      case "panel":
        this.#panelElement(value);
        break;
      case "id":
        this.#id(value);
        break;
      case "tabindex":
        this.#tabindex(value);
        break;
    }
  }

  #internals: ElementInternals;

  #connected: Signal<boolean>;

  #id: Signal<string | null>;

  #disabled: Signal<boolean>;

  #selected: Signal<boolean>;

  #panelElement: Reference<HTMLTabPanelElement>;

  #toggle: ToggleTaskTracker;

  #tabindex: TabIndex;

  get #list(): HTMLTabListElement | null {
    const parent = this.parentElement;
    if (parent === null) return null;
    if (parent.localName !== TAB_LIST) return null;

    return parent as HTMLTabListElement;
  }

  /**
   * Ensures the exclusivity of the tab by unselecting the other tabs of its
   * set, if the set is an exclusive one.
   */
  #ensureTabExclusivityByClosingOtherTabs(): void {
    const list = this.#list;
    if (list === null) return;
    if (list.multiple) return;

    for (const member of forward(list.selectedTabs)) {
      if (member === this) continue;

      member.removeAttribute("selected");
    }
  }

  /**
   * Ensures the exclusivity of the tab by unselecting the tab itself, if the
   * set is an exclusive one and a tab of it is selected already.
   */
  #ensureTabExclusivityByClosingTab(): void {
    if (!this.hasAttribute("selected")) return;

    const list = this.#list;
    if (list === null) return;
    if (list.multiple) return;

    if (
      forward(list.selectedTabs, this).next().done === true &&
      backward(list.selectedTabs, this).next().done === true
    ) {
      return;
    }

    this.removeAttribute("selected");
  }

  /** Runs the activation behavior of the tab on a click. */
  #onClick(): void {
    this.#activate();
  }

  /**
   * Asks for activation on the keys the platform activates a control with.
   *
   * @param event - The keydown event.
   */
  #onKeyDown(event: KeyboardEvent): void {
    if (event.target !== this) return;
    if (this.disabled) return;

    switch (event.key) {
      case "Enter":
        this.#activate();
        break;
      case " ":
        event.preventDefault();
        break;
    }
  }

  /**
   * Runs the activation behavior on the release of Space.
   *
   * @param event - The keyup event.
   */
  #onKeyUp(event: KeyboardEvent): void {
    if (event.target !== this) return;
    if (this.disabled) return;

    switch (event.key) {
      case " ":
        this.#activate();
        break;
    }
  }

  /**
   * Runs the activation behavior of the tab when it takes focus, if the list
   * it belongs to activates its tabs automatically.
   */
  #onFocus() {
    const list = this.#list;
    if (list === null) return;
    if (list.multiple || list.manual) return;

    this.#activate();
  }

  /** The activation behavior of the tab. */
  #activate() {
    if (this.disabled) return;
    this.selected = this.#list?.multiple ? !this.selected : true;
  }
}
