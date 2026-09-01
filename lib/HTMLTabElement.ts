import {
  Attribute,
  sourced,
  backward,
  Boolean,
  clickSuppressor,
  computed,
  connected,
  Constructor,
  effect,
  Exposed,
  tabindex,
  type TabIndex,
  forward,
  Interface,
  InterfaceType,
  Long,
  Nullable,
  Reflect,
  ref,
  referable,
  ToggleTaskTracker,
  watch,
  type Sourced,
  type Connected,
  type ReadonlySignal,
  type Reference,
} from "@html-extras/core";

import { TAB_LIST } from "./names";

import { tabs } from "./HTMLTabElementShare";
import { lists } from "./HTMLTabListElementShare";

import type { HTMLTabListElement } from "./HTMLTabListElement";
import type { HTMLTabPanelElement } from "./HTMLTabPanelElement";

/**
 * The `HTMLTabElement` interface represents a `tab-item` element: one tab of
 * the tab set of a `tab-list`.
 */
@Exposed("Window")
@Interface("HTMLTabElement")
@Constructor
export class HTMLTabElement extends HTMLElement {
  static observedAttributes: string[] = [
    "id",
    "tabindex",
    "selected",
    "disabled",
    "panel",
  ];

  /**
   * A boolean value reflecting the `selected` HTML attribute, which indicates
   * whether the tab is selected and its panel therefore shown.
   */
  @Reflect
  @Attribute(Boolean)
  accessor selected: boolean = false;

  /**
   * A boolean value reflecting the `disabled` HTML attribute, which indicates
   * that the tab is unavailable to be selected.
   */
  @Reflect
  @Attribute(Boolean)
  accessor disabled: boolean = false;

  /**
   * An `HTMLTabPanelElement` reflecting the `panel` HTML attribute, which
   * references the panel this tab controls. The value is null if the
   * attribute is absent or names no such panel.
   */
  @Reflect("panel")
  @Attribute(Nullable(InterfaceType(HTMLElement)))
  accessor panelElement: HTMLTabPanelElement | null = null;

  /**
   * A long representing the position of the tab within the tab set it belongs
   * to, in tree order. If the tab is not part of a tab set, the value is -1.
   *
   * @readonly
   */
  @Attribute(Long)
  get index(): number {
    const list = this.#getListElement();
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

    this.#connected = connected(this);

    this.#root = computed(() =>
      this.#connected() ? this.getRootNode() : null,
    );
    this.#list = computed(() =>
      this.#connected() ? this.#getListElement() : null,
    );

    this.#id = sourced(() => this.getAttribute("id"), null);
    this.#disabled = sourced(() => this.disabled, false);
    this.#selected = sourced(() => this.selected, false);
    this.#panel = sourced(() => this.getAttribute("panel"), null);

    this.#automatic = computed(() => {
      return lists.shared(this.#list())?.automatic() ?? false;
    });
    this.#revealable = computed(() => {
      return !this.#disabled() && this.#automatic();
    });

    this.#tabindex = tabindex(this, () => {
      if (this.#list() === null) return null;
      return this.#selected() ? 0 : -1;
    });

    this.#panelElement = ref(() => this.panelElement, {
      id: this.#panel,
      root: this.#root,
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
        effect(() => {
          this.#internals.ariaExpanded = this.#selected() ? "true" : "false";
        });
        this.#internals.ariaControlsElements = [panel];
      } else {
        this.#internals.ariaExpanded = null;
        this.#internals.ariaControlsElements = null;
      }
    });

    watch(this.#selected, (selected, oldSelected) => {
      this.#toggle.queue(
        oldSelected ? "open" : "closed",
        selected ? "open" : "closed",
      );
      if (selected) this.#ensureTabExclusivityByClosingOtherTabs();
    });

    referable(this, {
      id: this.#id,
      root: this.#root,
    });

    clickSuppressor(this, {
      suppress: this.#disabled,
      root: this.#root,
    });

    this.addEventListener("focus", this.#onFocus);
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeyDown);
    this.addEventListener("keyup", this.#onKeyUp);

    tabs.share(this, {
      selected: this.#selected,
      revealable: this.#revealable,
    });
  }

  override click(): void {
    if (this.disabled) return;
    super.click();
  }

  connectedCallback(): void {
    this.#ensureTabExclusivityByClosingTab();
    this.#connected.announce();
  }

  disconnectedCallback(): void {
    this.#ensureTabExclusivityByClosingTab();
    this.#connected.announce();
  }

  attributeChangedCallback(
    name: string,
    _: string | null,
    __: string | null,
    namespace: string | null,
  ): void {
    if (namespace !== null) return;

    switch (String(name)) {
      case "id":
        this.#id.announce();
        break;
      case "tabindex":
        this.#tabindex.announce();
        break;
      case "selected":
        this.#selected.announce();
        break;
      case "disabled":
        this.#disabled.announce();
        break;
      case "panel":
        this.#panel.announce();
        break;
    }
  }

  #internals: ElementInternals;

  #toggle: ToggleTaskTracker;

  #tabindex: TabIndex;

  #connected: Connected;

  #root: ReadonlySignal<Node | null>;

  #list: ReadonlySignal<HTMLTabListElement | null>;

  #id: Sourced<string | null>;

  #disabled: Sourced<boolean>;

  #selected: Sourced<boolean>;

  #panel: Sourced<string | null>;

  #automatic: ReadonlySignal<boolean>;

  #revealable: ReadonlySignal<boolean>;

  #panelElement: Reference<HTMLTabPanelElement>;

  #getListElement(): HTMLTabListElement | null {
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
    const list = this.#getListElement();
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

    const list = this.#getListElement();
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
    if (!this.#automatic()) return;

    this.#activate();
  }

  /** The activation behavior of the tab. */
  #activate() {
    if (this.disabled) return;
    this.selected = this.#getListElement()?.multiple ? !this.selected : true;
  }
}
