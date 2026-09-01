import { share, type ReadonlySignal, type Share } from "@html-extras/core";

import type { HTMLTabElement } from "./HTMLTabElement";

/**
 * What a `tab-item` shares with the rest of the family.
 */
export interface HTMLTabElementShare {
  /**
   * Whether the tab has the `selected` attribute specified.
   */
  selected: ReadonlySignal<boolean>;

  /**
   * Whether the tab can be selected by revealing the content of its panel.
   */
  revealable: ReadonlySignal<boolean>;
}

export const tabs: Share<HTMLTabElement, HTMLTabElementShare> = share();
