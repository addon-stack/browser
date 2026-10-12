# contextMenus

Documentation: [Chrome Context Menus API](https://developer.chrome.com/docs/extensions/reference/contextMenus)

A promise-based wrapper for the Chrome `contextMenus` API.

## Methods

- [isAvailableContextMenus()](#isAvailableContextMenus)
- [createContextMenus(createProperties)](#createContextMenus)
- [removeContextMenus(menuItemId)](#removeContextMenus)
- [removeAllContextMenus()](#removeAllContextMenus)
- [updateContextMenus(id, updateProperties?)](#updateContextMenus)
- [createOrUpdateContextMenu(id, properties)](#createOrUpdateContextMenu)

## Events

- [onContextMenusClicked(callback)](#onContextMenusClicked)

---

<a name="isAvailableContextMenus"></a>

### isAvailableContextMenus

```ts
isAvailableContextMenus(): boolean
```

Returns `true` when the `contextMenus` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
It checks namespace presence only; it does not guarantee individual methods, permissions, or a successful operation.

```ts
import {isAvailableContextMenus} from "@addon-core/browser";

if (isAvailableContextMenus()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

<a name="createContextMenus"></a>

### createContextMenus

```
createContextMenus(createProperties: chrome.contextMenus.CreateProperties): Promise<void>
```

Creates a new context menu item with the specified properties.

The properties argument is required. Normal, checkbox, and radio items require a `title`;
a separator can omit it. Properties are forwarded unchanged, and native creation errors reject the Promise.

```ts
import {createContextMenus} from "@addon-core/browser";

await createContextMenus({id: "open", title: "Open", contexts: ["page"]});
await createContextMenus({id: "divider", type: "separator"});
```

<a name="removeContextMenus"></a>

### removeContextMenus

```
removeContextMenus(menuItemId: string | number): Promise<void>
```

Removes the context menu item with the given ID.

<a name="removeAllContextMenus"></a>

### removeAllContextMenus

```
removeAllContextMenus(): Promise<void>
```

Removes all context menu items added by the extension.

<a name="updateContextMenus"></a>

### updateContextMenus

```
updateContextMenus(
  id: string | number,
  updateProperties?: Omit<chrome.contextMenus.CreateProperties, "id">
): Promise<void>
```

Updates the specified context menu item with new properties.
Update properties remain partial: `{enabled: false}`, `{checked: true}`, and an empty object are valid
TypeScript arguments without a title. Omitting `updateProperties` forwards an empty object.
Native validation and lookup errors reject the Promise.

<a name="createOrUpdateContextMenu"></a>

### createOrUpdateContextMenu

```ts
// Signature notation: omit id from each native creation variant separately.
// WithoutId is not exported by the package.
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

createOrUpdateContextMenu(
  id: string | number,
  properties: WithoutId<chrome.contextMenus.CreateProperties>
): Promise<void>
```

Tries to create a context menu item using `id.toString()`. If creation fails, it attempts to update the item
using the original ID and properties. This fallback applies to any creation error, including an existing
ID after a service worker wakes up. An update error rejects the Promise. The properties object is not mutated.

The properties must be valid for creation: normal, checkbox, and radio items require a title,
while a separator can omit it. Supply the ID as the first argument.
For a partial update of an existing item, use `updateContextMenus()`.

```ts
import {createOrUpdateContextMenu, updateContextMenus} from "@addon-core/browser";

await createOrUpdateContextMenu("open", {title: "Open"});
await createOrUpdateContextMenu("divider", {type: "separator"});
await updateContextMenus("open", {enabled: false});
```

Compatibility note: with `@types/chrome@^0.3.5`, creation types enforce the title requirement.
`createContextMenus()` now requires an argument, and `createOrUpdateContextMenu()` preserves that
requirement when removing `id` from the native type. Replace omitted or empty creation options with
valid item properties; use `updateContextMenus()` for update-only properties. This is a breaking
TypeScript contract change.

<a name="onContextMenusClicked"></a>

### onContextMenusClicked

```
onContextMenusClicked(
  callback: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void
): () => void
```

Adds a listener that triggers when a context menu item is clicked. Returns an unsubscribe function.
