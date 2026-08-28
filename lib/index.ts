import { TAB_ITEM, TAB_LIST, TAB_PANEL } from "./names";

import { HTMLTabElement } from "./HTMLTabElement";
import { HTMLTabListElement } from "./HTMLTabListElement";
import { HTMLTabPanelElement } from "./HTMLTabPanelElement";

// Nothing is taken from it: importing it is what writes the IDL types that
// name one of the elements. That it happens before the registrations below is
// not a matter of where the import sits - a module is evaluated before the
// body of the module importing it.
import "./references";

// The names are fixed, and not only for convenience: the steps that create new
// tabs resolve the name back through `customElements.getName`. They come from
// the same module the collection rules read them from, so the name an element
// is registered under and the name a rule matches cannot drift apart.
customElements.define(TAB_LIST, HTMLTabListElement);
customElements.define(TAB_ITEM, HTMLTabElement);
customElements.define(TAB_PANEL, HTMLTabPanelElement);

export { HTMLTabElement } from "./HTMLTabElement";
export { HTMLTabListElement } from "./HTMLTabListElement";
export { HTMLTabPanelElement } from "./HTMLTabPanelElement";
export { HTMLTabsCollection } from "./HTMLTabsCollection";
