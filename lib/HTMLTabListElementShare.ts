import { share, type ReadonlySignal, type Share } from "@html-extras/core";

import type { HTMLTabListElement } from "./HTMLTabListElement";

/**
 * What a `tab-list` shares with the rest of the family.
 */
export interface HTMLTabListElementShare {
  /**
   * Whether the tab set uses automatic activation.
   */
  automatic: ReadonlySignal<boolean>;
}

export const lists: Share<HTMLTabListElement, HTMLTabListElementShare> =
  share();
