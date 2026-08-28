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
}

/**
 * The channel every `tab-item` shares its state on.
 */
export const tabs: Share<HTMLTabElement, HTMLTabElementShare> = share();
