import {
  Attribute,
  sourced,
  computed,
  connected,
  Constructor,
  effect,
  Exposed,
  hidden,
  Interface,
  InterfaceType,
  Nullable,
  Reflect,
  ref,
  referable,
  styled,
  type Sourced,
  type Connected,
  type Hidden,
  type Reference,
  type ReadonlySignal,
} from "@html-extras/core";

import { styles } from "./styles";

import { tabs } from "./HTMLTabElementShare";

import type { HTMLTabElement } from "./HTMLTabElement";

/**
 * The `HTMLTabPanelElement` interface represents a `tab-panel` element: the
 * content shown when the tab that labels it is selected.
 */
@Exposed("Window")
@Interface("HTMLTabPanelElement")
@Constructor
export class HTMLTabPanelElement extends HTMLElement {
  static observedAttributes: string[] = ["id", "hidden", "tab"];

  /**
   * An `HTMLTabElement` reflecting the `tab` HTML attribute, which references
   * the tab that labels this panel. The value is null if the attribute is
   * absent or names no such tab.
   */
  @Reflect("tab")
  @Attribute(Nullable(InterfaceType(HTMLElement)))
  accessor tabElement: HTMLTabElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "tabpanel";

    this.#connected = connected(this);

    this.#root = computed(() =>
      this.#connected() ? this.getRootNode() : null,
    );

    this.#id = sourced(() => this.getAttribute("id"), null);
    this.#tab = sourced(() => this.getAttribute("tab"), null);

    this.#hidden = hidden(this, () => {
      if (!this.#connected()) return null;

      const shared = tabs.shared(this.#tabElement());

      if (shared?.selected()) return null;
      if (shared?.revealable()) return "until-found";
      return "";
    });

    this.#tabElement = ref(() => this.tabElement, {
      id: this.#tab,
      root: this.#root,
    });

    effect(() => {
      const tab = this.#tabElement();

      if (tab !== null) {
        this.#internals.ariaLabelledByElements = [tab];
        effect(() => {
          if (tabs.shared(tab).selected()) {
            this.#internals.states.add("open");
          } else {
            this.#internals.states.delete("open");
          }
        });
      } else {
        this.#internals.ariaLabelledByElements = null;
        this.#internals.states.delete("open");
      }
    });

    referable(this, {
      id: this.#id,
      root: this.#root,
    });

    styled(styles, {
      root: this.#root,
    });

    this.addEventListener("beforematch", this.#onBeforeMatch);
  }

  connectedCallback(): void {
    this.#connected.announce();
  }

  disconnectedCallback(): void {
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
      case "tab":
        this.#tab.announce();
        break;
      case "id":
        this.#id.announce();
        break;
      case "hidden":
        this.#hidden.announce();
        break;
    }
  }

  #internals: ElementInternals;

  #hidden: Hidden;

  #connected: Connected;

  #root: ReadonlySignal<Node | null>;

  #id: Sourced<string | null>;

  #tab: Sourced<string | null>;

  #tabElement: Reference<HTMLTabElement>;

  /**
   * Runs the beforematch processing steps of the panel: the user agent is
   * about to reveal the content, and the tab of the panel is what shows it.
   */
  #onBeforeMatch(event: Event): void {
    if (event.target !== this) return;

    const tab = this.#tabElement();
    if (tab === null) return;

    this.#hidden.concede(() => tab.setAttribute("selected", ""));
  }
}
