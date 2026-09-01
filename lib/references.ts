import {
  InterfaceObject,
  InterfaceType,
  Nullable,
  type IDLOperation,
  type RegularAttribute,
} from "@html-extras/core";

import { HTMLTabElement } from "./HTMLTabElement";
import { HTMLTabListElement } from "./HTMLTabListElement";
import { HTMLTabPanelElement } from "./HTMLTabPanelElement";
import { HTMLTabsCollection } from "./HTMLTabsCollection";

const HTMLTabElementType = InterfaceType(HTMLTabElement);
const NullableHTMLTabElement = Nullable(HTMLTabElementType);

const HTMLTabPanelElementType = InterfaceType(HTMLTabPanelElement);
const NullableHTMLTabPanelElement = Nullable(HTMLTabPanelElementType);

const tab = InterfaceObject.getInterfaceOf(HTMLTabElement)!;
const panelElement = tab.members["panelElement"] as RegularAttribute;
panelElement.type = NullableHTMLTabPanelElement;

const panel = InterfaceObject.getInterfaceOf(HTMLTabPanelElement)!;
const tabElement = panel.members["tabElement"] as RegularAttribute;
tabElement.type = NullableHTMLTabElement;

const list = InterfaceObject.getInterfaceOf(HTMLTabListElement)!;
const listAdd = list.members["add"] as IDLOperation[];
const item = list.members["item"] as IDLOperation[];
const namedItem = list.members["namedItem"] as IDLOperation[];
listAdd[0]!.arguments[0]!.type = HTMLTabElementType;
item[0]!.returnType = NullableHTMLTabElement;
namedItem[0]!.returnType = NullableHTMLTabElement;

const collection = InterfaceObject.getInterfaceOf(HTMLTabsCollection)!;
const collectionAdd = collection.members["add"] as IDLOperation[];
collectionAdd[0]!.arguments[0]!.type = HTMLTabElementType;
collection.indexedPropertySetter!.arguments[1]!.type = NullableHTMLTabElement;
