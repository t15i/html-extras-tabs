# @html-extras/tabs

The **`@html-extras/tabs`** package provides three custom elements — `<tab-list>`,
`<tab-item>` and `<tab-panel>` — that behave the way the platform's own elements
do: state lives in content attributes, the IDL attributes reflect it, and the
keyboard and the accessibility tree follow the
[ARIA authoring practices](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
without a page arranging any of it.

Each element is backed by an interface — `HTMLTabListElement`, `HTMLTabElement`
and `HTMLTabPanelElement` — written against Web IDL: the interface objects are
exposed on `Window`, the attributes reflect, the operations coerce their
arguments, and the collection of a list is a live `HTMLCollection`.

Written on [`@html-extras/core`](https://github.com/t15i/html-extras-core), the
package the rest of the family is built on too.

## Installation

```sh
npm install @html-extras/tabs
```

The core is a peer dependency; install it alongside if your package manager does
not do so on its own:

```sh
npm install @html-extras/tabs @html-extras/core
```

```js
import "@html-extras/tabs";
```

The elements register themselves as the module runs, so importing it for its
effect is all a page has to do. The classes are exported too, for a page that
needs the types or reaches for one of them by name:

```js
import { HTMLTabElement, HTMLTabListElement } from "@html-extras/tabs";
```

Because the interfaces are exposed on `Window`, they are also reachable as
globals once the module has run, without an import of their own:

```js
document.querySelector("tab-item") instanceof window.HTMLTabElement; // true
```

## Try it

A tab points at its panel and a panel at its tab, each by the `id` of the other.
Both directions are required.

```html
<link rel="stylesheet" href="node_modules/@html-extras/tabs/dist/styles.css" />

<tab-list>
  <tab-item id="material" panel="material-panel" selected>Material</tab-item>
  <tab-item id="sizes" panel="sizes-panel">Sizes</tab-item>
  <tab-item id="care" panel="care-panel" disabled>Care</tab-item>
</tab-list>

<tab-panel id="material-panel" tab="material"
  >Oak and veneered plywood.</tab-panel
>
<tab-panel id="sizes-panel" tab="sizes">120 × 60 × 74 cm.</tab-panel>
<tab-panel id="care-panel" tab="care">Wipe with a damp cloth.</tab-panel>
```

---

# Elements

## `<tab-list>`

The **`<tab-list>`** element represents a control for selecting tabs from a tab
set. Its tab set is its direct `<tab-item>` children, in tree order; a
`<tab-item>` nested any deeper is not a member of it.

Implemented by [`HTMLTabListElement`](#htmltablistelement).

### Attributes

This element includes the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes).

#### `multiple`

This Boolean attribute indicates that more than one tab of the set can be
selected at a time. If it is not specified, selecting a tab unselects whichever
other tab of the set was selected.

Removing the attribute restores the single-selection invariant on the spot: the
first selected tab of the set, in tree order, keeps its selection and the rest
give theirs up.

```html
<tab-list multiple>
  <tab-item id="a" panel="pa" selected>Overview</tab-item>
  <tab-item id="b" panel="pb" selected>Details</tab-item>
</tab-list>
```

```js
const list = document.querySelector("tab-list");

list.selectedTabs.length; // 2
list.multiple = false;
list.selectedTabs.length; // 1 — "Overview" is the one left
```

A list with `multiple` never activates a tab on focus; see [`manual`](#manual).

#### `manual`

This Boolean attribute indicates that moving focus to a tab leaves selecting it
to the user. Without it, the tab focus lands on is selected at once, which is
what a tab set is expected to do when opening a panel costs nothing; with it,
focus moves and the user presses <kbd>Enter</kbd> or <kbd>Space</kbd> to open.

```html
<tab-list manual>
  <tab-item id="report" panel="report-panel" selected>Report</tab-item>
  <tab-item id="audit" panel="audit-panel">Audit</tab-item>
</tab-list>
```

Automatic activation is the state of a list that has neither `manual` nor
[`multiple`](#multiple) specified. A list that holds several selections at a
time is never automatic, since focus moving across it would toggle every tab it
passed.

#### `orientation`

This enumerated attribute contains the axis the tabs of the set are laid out
along, which is the axis the arrow keys move focus along. Possible values are:

- `horizontal`: focus moves with <kbd>←</kbd> and <kbd>→</kbd>.
- `vertical`: focus moves with <kbd>↑</kbd> and <kbd>↓</kbd>.

The attribute is limited to only known values: it is matched ASCII
case-insensitively, and both the missing value default and the invalid value
default are `horizontal`. The value is mapped onto `aria-orientation`, so it is
what assistive technology is told as well.

```html
<tab-list orientation="vertical">
  <tab-item id="inbox" panel="inbox-panel" selected>Inbox</tab-item>
  <tab-item id="sent" panel="sent-panel">Sent</tab-item>
</tab-list>
```

```js
list.setAttribute("orientation", "VeRtIcAl");
list.orientation; // "vertical"

list.setAttribute("orientation", "sideways");
list.orientation; // "horizontal" — the invalid value default
```

### Keyboard interaction

The list moves focus around its tab set on the keys the platform moves it with.
The event it acts on is canceled; an event whose default was already prevented
is left alone, as are keys pressed on anything that is not a direct `<tab-item>`
child of the list.

| Key                                                      | Result                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| <kbd>←</kbd> / <kbd>→</kbd> (`orientation="horizontal"`) | Moves focus to the previous / next tab, wrapping at both ends. |
| <kbd>↑</kbd> / <kbd>↓</kbd> (`orientation="vertical"`)   | Moves focus to the previous / next tab, wrapping at both ends. |
| <kbd>Home</kbd>                                          | Moves focus to the first tab of the set.                       |
| <kbd>End</kbd>                                           | Moves focus to the last tab of the set.                        |

Focus moves onto a [disabled](#disabled) tab like onto any other, so the set can
be read through end to end. What a tab does once it has focus — open at once or
wait to be activated — is the business of [`manual`](#manual).

The keys that activate the tab focus is already on belong to the tab itself; see
[the activation behavior](#activation-behavior).

### Accessibility

The list maps itself through `ElementInternals`, so nothing below appears in the
markup and none of it can be overwritten by an author attribute by accident:

| Feature                | Mapping                                           |
| ---------------------- | ------------------------------------------------- |
| `role`                 | `tablist`                                         |
| `aria-orientation`     | The state of [`orientation`](#orientation)        |
| `aria-multiselectable` | `true` while [`multiple`](#multiple) is specified |

---

## `<tab-item>`

The **`<tab-item>`** element represents one tab of the tab set of a
`<tab-list>`: the control that opens a panel, and the label of that panel in the
accessibility tree.

Implemented by [`HTMLTabElement`](#htmltabelement).

A `<tab-item>` belongs to a tab set only as a direct child of a `<tab-list>`.
Outside one it is still a working element — it reflects its attributes, it can
be selected, its panel follows — but it has no set to be exclusive within, no
managed `tabindex`, and no arrow-key navigation.

### Attributes

This element includes the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes).

#### `selected`

This Boolean attribute indicates that the tab is selected and its panel
therefore shown. Selecting a tab of a set that does not hold several selections
unselects the others.

```html
<tab-list>
  <tab-item id="one" panel="p1" selected>One</tab-item>
  <tab-item id="two" panel="p2">Two</tab-item>
</tab-list>
```

```js
const two = document.getElementById("two");

two.selected = true;
document.getElementById("one").selected; // false — the set is exclusive
```

Changing the attribute fires a [`toggle`](#toggle) event at the tab.

#### `disabled`

This Boolean attribute indicates that the tab is unavailable to be selected.
Clicks on a disabled tab never reach the page, its activation keys do nothing,
and focus landing on it selects nothing even in an automatic list.

A disabled tab keeps its place in the set: it is still focusable, still reached
by the arrow keys, and still carries its managed `tabindex`. Nothing about it is
removed from the accessibility tree either — it is announced as a disabled tab
rather than hidden.

```html
<tab-item id="care" panel="care-panel" disabled>Care</tab-item>
```

```js
const care = document.getElementById("care");

care.click();
care.selected; // false
```

#### `panel`

The `id` of the `<tab-panel>` this tab controls, in the same root as the tab.
The reference resolves to `null` when the attribute is absent, when nothing
carries that id, and when the element that does is not a `<tab-panel>`.

```html
<tab-item id="sizes" panel="sizes-panel">Sizes</tab-item>
<tab-panel id="sizes-panel" tab="sizes">120 × 60 × 74 cm.</tab-panel>
```

The panel is what the tab points `aria-controls` at, and the reference is live:
it follows the panel being renamed, removed, or replaced, without the page
telling the tab anything about it. Reading it back through the IDL attribute is
[`panelElement`](#panelelement).

#### `id`

Not an attribute of this element in particular, but a required part of a working
pair: the [`tab`](#tab) attribute of the panel names the tab by it. A tab is
findable by its id from inside a shadow root the same way it is from the
document.

#### `tabindex`

The tab set is one tab stop, so the element manages `tabindex` on the tabs of
its set: `0` on the selected tab, `-1` on the rest. A tab that is in no set has
no managed value at all, and neither has one whose list is out of the document.

The attribute belongs to the author the moment the author writes it, and is
managed again once the author removes it:

```js
const tab = document.querySelector("tab-item");

tab.getAttribute("tabindex"); // "0" — the selected tab of the set
tab.setAttribute("tabindex", "5"); // the author's now
tab.removeAttribute("tabindex");
tab.getAttribute("tabindex"); // "0" — taken back
```

### Activation behavior

| Input                                  | Result                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| A click on the tab                     | Activates it.                                                    |
| <kbd>Enter</kbd>                       | Activates it, on the key press.                                  |
| <kbd>Space</kbd>                       | Activates it on the release; the press is held off and canceled. |
| Focus, in an [automatic](#manual) list | Activates it.                                                    |

Activating a tab of a set that holds one selection at a time selects it, and
leaves it selected if it was selected already. Activating a tab of a set with
[`multiple`](#multiple) toggles it.

A disabled tab does nothing on any of them. A real click never reaches listeners
on it at all, since the click is suppressed at the root before it is dispatched;
an untrusted `click` event a script dispatches still reaches them, and still
selects nothing.

### Events

#### `toggle`

Fired at a `<tab-item>` when it becomes selected or stops being selected.
Inherited from the platform's [`toggle`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/toggle_event)
event: a `ToggleEvent` whose `oldState` and `newState` are `"closed"` and
`"open"`.

The event is queued as a task, the way `<details>` queues its own, and a tab
that toggles more than once before the task runs fires once, with the states it
started and ended the turn in:

```js
tab.addEventListener("toggle", (event) => {
  console.log(event.oldState, "→", event.newState);
});

tab.selected = true;
tab.selected = false;
// one event, "closed → closed"
```

In an exclusive set both tabs report: the tab that was selected first, then the
tab that gave its selection up.

```js
// t1 is selected, t2 is not
t2.selected = true;
// toggle at t2: closed → open
// toggle at t1: open → closed
```

A tab the parser selected fires one on the way in. A tab removed from the
document before the task runs fires one all the same. Writing the attribute
again without changing whether it is present fires nothing.

### Accessibility

| Feature         | Mapping                                                         |
| --------------- | --------------------------------------------------------------- |
| `role`          | `tab`                                                           |
| `aria-selected` | `true` / `false`, following [`selected`](#selected)             |
| `aria-disabled` | `true` while [`disabled`](#disabled); otherwise left unset      |
| `aria-expanded` | `true` / `false` while the panel resolves; otherwise left unset |
| `aria-controls` | The [panel](#panel), while it resolves                          |

`aria-disabled` is left unset rather than written as `false` on purpose: a `tab-item`
inside an `aria-disabled="true"` subtree would otherwise announce itself out of
a state it does inherit.

`aria-expanded` and `aria-controls` appear together and only while there is a
panel to point at, so a tab whose `panel` names nothing claims no relationship
it cannot deliver.

---

## `<tab-panel>`

The **`<tab-panel>`** element represents the content shown when the tab that
labels it is selected.

Implemented by [`HTMLTabPanelElement`](#htmltabpanelelement).

### Attributes

This element includes the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes).

#### `tab`

The `id` of the `<tab-item>` that labels this panel, in the same root as the
panel. The reference resolves to `null` when the attribute is absent, when
nothing carries that id, and when the element that does is not a `<tab-item>`.

```html
<tab-item id="material" panel="material-panel" selected>Material</tab-item>
<tab-panel id="material-panel" tab="material"
  >Oak and veneered plywood.</tab-panel
>
```

The tab is what the panel points `aria-labelledby` at, and it is what the panel
reads its own open state out of. Reading it back through the IDL attribute is
[`tabElement`](#tabelement).

#### `hidden`

Managed by the element rather than written by the page. The panel keeps the
[`hidden`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden)
attribute in one of three states:

| State                  | When                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| absent                 | The tab of the panel is selected — or the panel is not in a document.                       |
| `hidden="until-found"` | The tab is closed, not disabled, and its list activates automatically.                      |
| `hidden=""`            | Anything else: no tab, a disabled tab, a `manual` list, a `multiple` list, a tab in no set. |

`until-found` is what makes a closed panel findable: its content stays in the
accessibility tree and in find-in-page, and the browser can reveal it. See
[Find in page](#find-in-page).

Like `tabindex` on a tab, the attribute belongs to the author the moment the
author writes it — markup that ships `hidden` on a panel keeps a panel closed
even against a selected tab — and is managed again once the author removes it:

```js
const panel = document.querySelector("tab-panel");

panel.getAttribute("hidden"); // "until-found"
panel.setAttribute("hidden", ""); // the author's now
panel.removeAttribute("hidden");
panel.getAttribute("hidden"); // "until-found" — taken back
```

### Custom states

An open panel matches `:state(open)`, which is the hook for styling the panel
itself and anything inside it while its tab is selected:

```css
tab-panel:state(open) {
  animation: fade-in 150ms ease-out;
}
```

There is no `selected` or `disabled` state on a `tab-item` to match: those are
content attributes, and `tab-item[selected]` and `tab-item[disabled]` already
tell them apart.

### Find in page

A panel that is `hidden="until-found"` is searchable. When the browser is about
to reveal it — find-in-page, or navigation to a fragment inside it — the panel
selects its tab, so what the reader lands on is a tab set with the right tab
open rather than a panel showing under a tab that says otherwise.

```js
location.hash = "#a-heading-inside-a-closed-panel";
// the panel is revealed, its tab becomes selected, and one toggle event fires
```

This is the reason automatic lists close their panels with `until-found` and
everything else closes them outright: revealing a panel whose tab cannot be
selected — because it is disabled, or because the list would have to open every
panel at once — would leave the two out of step.

### Accessibility

| Feature           | Mapping                            |
| ----------------- | ---------------------------------- |
| `role`            | `tabpanel`                         |
| `aria-labelledby` | The [tab](#tab), while it resolves |

---

# The selection model

One rule holds across the whole tab set: unless the list carries
[`multiple`](#multiple), at most one of its tabs is selected. It is restored at
every point the page can break it, and always by unselecting — a set is allowed
to have nothing selected, and no tab is ever selected on the page's behalf.

| Event                                              | What happens                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| A tab is selected                                  | The other tabs of the set give up their selection.                              |
| A selected tab is inserted into a set that has one | The tab being inserted gives up its own.                                        |
| `multiple` is removed from the list                | The first selected tab of the set keeps its selection; the rest give theirs up. |

The two directions differ on purpose. A tab arriving into a set that has already
made a choice does not overturn it; a list narrowing from many selections to one
keeps the first, which is the one a reader coming to it would read first.

Parsed markup that selects several tabs of an exclusive set is resolved as it is
parsed, each tab in turn:

```html
<tab-list>
  <tab-item id="a" selected>A</tab-item>
  <tab-item id="b" selected>B</tab-item>
</tab-list>
```

```js
list.selectedTabs.length; // 1
```

---

# The style sheet

The library adopts a style sheet of its own into every root a panel is in, which
is what gives `hidden` its effect on a `tab-panel` — including the layout a
`hidden="until-found"` panel needs to stay findable while it takes no space. A
page arranges none of this.

What a page does need is `dist/styles.css`, which carries one rule:

```css
tab-panel:not(:defined) {
  display: none;
}
```

A page that serves its tabs as HTML — static or rendered on the server — needs
it, and needs it as a file the parser has already met. Nothing a script delivers
can close the window it covers: the markup is parsed before the definitions
load, and without the rule every panel is laid out and shown, with the closed
ones disappearing afterwards in front of the reader.

```html
<link rel="stylesheet" href="node_modules/@html-extras/tabs/dist/styles.css" />
```

A page that builds its tabs from script does not need it — elements it creates
are upgraded as they are made. A page that has to work without script should not
include it, since without an upgrade nothing would ever be shown.

It is also out of reach inside a declarative shadow root: a sheet of the
document does not cross that boundary, so such a page repeats the rule inside
the template.

---

# Interfaces

## HTMLTabListElement

The **`HTMLTabListElement`** interface represents a `<tab-list>` element. These
elements also share all of the properties and methods of other HTML elements via
the `HTMLElement` interface.

`EventTarget` → `Node` → `Element` → `HTMLElement` → `HTMLTabListElement`

### Instance properties

_This interface inherits properties from `HTMLElement`, `Element`, and `Node`._

#### `multiple`

A boolean value reflecting the [`multiple`](#multiple) HTML attribute, which
indicates whether more than one tab of the set can be selected at a time.

```js
list.multiple = true;
list.getAttribute("multiple"); // ""
```

#### `manual`

A boolean value reflecting the [`manual`](#manual) HTML attribute, which
indicates whether moving focus to a tab leaves selecting it to the user.

```js
list.manual = true;
list.hasAttribute("manual"); // true
```

#### `orientation`

A string reflecting the [`orientation`](#orientation) HTML attribute, which
contains the axis the tabs of the set are laid out along. Limited to only known
values: reading it returns `"horizontal"` or `"vertical"`, whatever the
attribute says.

```js
list.orientation = "vertical";
list.getAttribute("orientation"); // "vertical"

list.setAttribute("orientation", "sideways");
list.orientation; // "horizontal"
```

#### `tabs` (Read only)

An [`HTMLTabsCollection`](#htmltabscollection) representing the set of
`<tab-item>` elements contained by this element.

```js
list.tabs.length; // 3
list.tabs[0]; // the first tab
list.tabs.namedItem("sizes"); // the tab whose id is "sizes"
```

The collection is live, and so is its membership rule: a tab appended to the
list appears in it, and a tab moved out of the list leaves it.

#### `selectedTabs` (Read only)

An `HTMLCollection` representing the set of `<tab-item>` elements that are
selected.

```js
[...list.selectedTabs].map((tab) => tab.id); // ["material"]

list.multiple = true;
list.tabs[1].selected = true;
[...list.selectedTabs].map((tab) => tab.id); // ["material", "sizes"]
```

Live as well: it follows the `selected` attribute without the page re-reading
anything.

#### `length`

An unsigned long returning or setting the number of tabs in the tab set. Setting
it either grows the set with new `<tab-item>` elements appended to the list, or
cuts tabs off its end.

```js
list.length; // 3

list.length = 5; // two empty tabs appended
list.length = 1; // the last four removed
```

Growing the set past 100 000 tabs does nothing.

#### `selectedIndex`

A long reflecting the index of the first selected tab of the set. The value `-1`
indicates no tab is selected. Setting it leaves the set with the tab at that
index selected and nothing else.

```js
list.selectedIndex; // 0

list.selectedIndex = 2;
list.tabs[2].selected; // true
list.tabs[0].selected; // false

list.selectedIndex = -1; // nothing selected
```

An index outside the set selects nothing, and unselects everything.

### Instance methods

_This interface inherits methods from `HTMLElement`, `Element`, and `Node`._

#### `item()`

Returns the tab at the given index in the tab set, or `null` if there is none.

```js
list.item(0); // the first tab
list.item(99); // null
```

#### `namedItem()`

Returns the first tab in the set whose `id` or `name` is the given name, or
`null` if there is none.

```js
list.namedItem("care"); // <tab-item id="care">
```

#### `add()`

Adds a tab to the tab set, before the tab given as `before` or at its end.

```js
const tab = document.createElement("tab-item");

list.add(tab); // appended
list.add(tab, 0); // moved to the front
list.add(tab, list.tabs[1]); // moved before the second tab
```

`before` may be a tab or an index, and `null` — its default — appends. An index
outside the set appends as well.

Throws a `HierarchyRequestError` `DOMException` if the tab to add is an ancestor
of the list, and a `NotFoundError` `DOMException` if `before` is an element that
is not a child of the list.

#### `remove()`

Removes the tab list itself, or the tab at the given index of its tab set.

```js
list.remove(0); // removes the first tab
list.remove(); // removes the list
```

The no-argument form is `Element.remove()`, kept working under the overload the
way `<select>` keeps it.

---

## HTMLTabElement

The **`HTMLTabElement`** interface represents a `<tab-item>` element: one tab of
the tab set of a `<tab-list>`.

`EventTarget` → `Node` → `Element` → `HTMLElement` → `HTMLTabElement`

### Instance properties

_This interface inherits properties from `HTMLElement`, `Element`, and `Node`._

#### `selected`

A boolean value reflecting the [`selected`](#selected) HTML attribute, which
indicates whether the tab is selected and its panel therefore shown.

```js
tab.selected = true;
tab.getAttribute("selected"); // ""
```

#### `disabled`

A boolean value reflecting the [`disabled`](#disabled) HTML attribute, which
indicates that the tab is unavailable to be selected.

```js
tab.disabled = true;
tab.click();
tab.selected; // false
```

#### `panelElement`

An `HTMLTabPanelElement` reflecting the [`panel`](#panel) HTML attribute, which
references the panel this tab controls. The value is `null` if the attribute is
absent or names no such panel.

```js
tab.panelElement; // <tab-panel id="sizes-panel">
```

Setting it writes the content attribute and records the element, the way the
platform's own attr-element attributes do — so a panel with no id still resolves:

```js
const panel = document.createElement("tab-panel");
container.append(panel);

tab.panelElement = panel;
tab.getAttribute("panel"); // ""
tab.panelElement; // the panel
```

#### `index` (Read only)

A long representing the position of the tab within the tab set it belongs to, in
tree order. If the tab is not part of a tab set, the value is `-1`.

```js
list.tabs[2].index; // 2

const loose = document.createElement("tab-item");
loose.index; // -1
```

### Instance methods

_This interface inherits methods from `HTMLElement`, `Element`, and `Node`._

#### `click()`

Runs the activation behavior of the tab, as `HTMLElement.click()` does — except
on a [disabled](#disabled) tab, where it does nothing and dispatches no event.

```js
tab.click();
tab.selected; // true
```

### Events

_Inherits events from its parent interface, `HTMLElement`._

Listen to [`toggle`](#toggle) to be told when a tab is selected or unselected.

---

## HTMLTabPanelElement

The **`HTMLTabPanelElement`** interface represents a `<tab-panel>` element: the
content shown when the tab that labels it is selected.

`EventTarget` → `Node` → `Element` → `HTMLElement` → `HTMLTabPanelElement`

### Instance properties

_This interface inherits properties from `HTMLElement`, `Element`, and `Node`._

#### `tabElement`

An `HTMLTabElement` reflecting the [`tab`](#tab) HTML attribute, which references
the tab that labels this panel. The value is `null` if the attribute is absent or
names no such tab.

```js
panel.tabElement; // <tab-item id="material">
panel.tabElement.selected; // true — the panel is the open one

panel.tabElement = otherTab; // writes the content attribute and records it
panel.tabElement = null; // drops the reference
```

### Instance methods

_No specific method; inherits methods from its parent, `HTMLElement`._

### Events

_Inherits events from its parent interface, `HTMLElement`._

A panel that is `hidden="until-found"` receives the platform's
[`beforematch`](https://developer.mozilla.org/en-US/docs/Web/API/Element/beforematch_event)
event when the browser is about to reveal it, and it is on that event that the
panel selects its tab.

---

## HTMLTabsCollection

The **`HTMLTabsCollection`** interface represents a collection of `<tab-item>`
elements (in document order) and offers methods and properties for selecting
from the list as well as optionally altering its items. This object is returned
by the [`tabs`](#tabs-read-only) property of `HTMLTabListElement`.

`HTMLCollection` → `HTMLTabsCollection`

### Constructor

#### `HTMLTabsCollection()`

Returns a newly created `HTMLTabsCollection` object collecting the direct
`<tab-item>` children of the list it is given.

```js
const tabs = new HTMLTabsCollection(list);
```

### Instance properties

_This interface inherits the properties of its parent, `HTMLCollection`._

#### `length`

Returns or sets the number of tabs in the collection. Setting it either grows the
tab set with new tabs or cuts tabs off its end. This is what
[`HTMLTabListElement.length`](#length) is.

```js
list.tabs.length = 4; // the set is four tabs long
```

#### `selectedIndex`

The index number of the first selected `<tab-item>` element. The value `-1`
indicates no tab is selected. Setting it leaves that tab selected and nothing
else.

```js
list.tabs.selectedIndex; // 0
list.tabs.selectedIndex = 1;
```

### Instance methods

_This interface inherits the methods of its parent, `HTMLCollection`._

#### `add()`

Adds a `<tab-item>` element to the collection of tabs or adds it before a
specified tab.

```js
list.tabs.add(document.createElement("tab-item"));
list.tabs.add(tab, 0);
```

Throws a `HierarchyRequestError` `DOMException` if the tab to add is an ancestor
of the list, and a `NotFoundError` `DOMException` if `before` is an element that
is not a child of the list.

#### `remove()`

Removes the tab at the specified index from the tab set.

```js
list.tabs.remove(1);
```

### Setting a tab by index

The collection supports an indexed property setter, as `HTMLOptionsCollection`
does. Assigning a tab puts it at that index; assigning `null` removes what is
there; assigning past the end grows the set to reach it.

```js
list.tabs[0] = document.createElement("tab-item"); // replaces the first tab
list.tabs[1] = null; // removes the second
list.tabs[7] = tab; // grows the set, then appends
```

---

# From a CDN

The components and the core are published as modules. The components fetch the
core by name, so an import map names it once; the components themselves are a
URL and go straight into a `src`:

```html
<script type="importmap">
  {
    "imports": {
      "@html-extras/core": "https://cdn.jsdelivr.net/npm/@html-extras/core@1.0.0/dist/cdn/index.esm.js"
    }
  }
</script>

<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@html-extras/tabs@1.0.0/dist/styles.css"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@html-extras/tabs@1.0.0/dist/cdn/index.esm.js"
></script>
```

The map has to come before the first module that resolves through it. A page
that writes its own `import "@html-extras/tabs"` adds that name to the map as
well, pointing at the same URL the `src` above uses; a name and a URL that
disagree are two modules.

For a page that wants the tabs and nothing else there is a standalone build with
the core inside it, which needs no map:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@html-extras/tabs@1.0.0/dist/styles.css"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@html-extras/tabs@1.0.0/dist/cdn/index.standalone.esm.js"
></script>
```

The two are alternatives, not layers. A module is the thing at its URL, so a page
that loads the standalone file and then imports the core on its own ends up with
two cores, each with registries the other never sees. Pin the versions, keep one
URL per package, and that cannot happen.

# License

[MIT](./LICENSE)
