import {
  Attribute,
  Constructor,
  effect,
  Exposed,
  Interface,
  InterfaceType,
  Nullable,
  Reflect,
  ref,
  refTarget,
  signal,
  type Reference,
  type Signal,
  connectivity,
} from "@html-extras/core";

import { tabs } from "./HTMLTabElementShare";

import type { HTMLTabElement } from "./HTMLTabElement";

/**
 * The content shown when the corresponding tab is selected.
 */
@Exposed("Window")
@Interface
@Constructor
export class HTMLTabPanelElement extends HTMLElement {
  static observedAttributes: string[] = ["id"];

  /**
   * The tab that labels this panel.
   */
  @Reflect("tab")
  @Attribute(Nullable(InterfaceType(HTMLElement)))
  accessor tabElement: HTMLTabElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "tabpanel";

    const { connected, root } = connectivity(this);
    this.#connected = connected;

    this.#id = signal(null);
    this.#tabElement = ref(() => this.tabElement, root);

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

    refTarget(this, {
      id: this.#id,
      root,
    });
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
      case "tab":
        this.#tabElement(value);
        break;
      case "id":
        this.#id(value);
        break;
    }
  }

  #internals: ElementInternals;

  #id: Signal<string | null>;

  #connected: Signal<boolean>;

  #tabElement: Reference<HTMLTabElement>;
}
