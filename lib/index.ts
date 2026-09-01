import { TAB_ITEM, TAB_LIST, TAB_PANEL } from "./names";

import { HTMLTabElement } from "./HTMLTabElement";
import { HTMLTabListElement } from "./HTMLTabListElement";
import { HTMLTabPanelElement } from "./HTMLTabPanelElement";

import "./references";

customElements.define(TAB_LIST, HTMLTabListElement);
customElements.define(TAB_ITEM, HTMLTabElement);
customElements.define(TAB_PANEL, HTMLTabPanelElement);

export { HTMLTabElement } from "./HTMLTabElement";
export { HTMLTabListElement } from "./HTMLTabListElement";
export { HTMLTabPanelElement } from "./HTMLTabPanelElement";
export { HTMLTabsCollection } from "./HTMLTabsCollection";
