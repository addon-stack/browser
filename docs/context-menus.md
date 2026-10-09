# contextMenus

Documentation: [Chrome Context Menus API](https://developer.chrome.com/docs/extensions/reference/contextMenus)

A promise-based wrapper for the Chrome `contextMenus` API.

## Methods

- [isAvailableContextMenus()](#isAvailableContextMenus)
- [createContextMenus(createProperties?)](#createContextMenus)
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
createContextMenus(createProperties?: chrome.contextMenus.CreateProperties): Promise<void>
```

Creates a new context menu item with the specified properties.

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

<a name="createOrUpdateContextMenu"></a>

### createOrUpdateContextMenu

```
createOrUpdateContextMenu(
  id: string | number,
  properties: Omit<chrome.contextMenus.CreateProperties, "id">
): Promise<void>
```

Tries to create a context menu item. If it already exists (e.g., after service worker wake up), it updates the existing item instead.

<a name="onContextMenusClicked"></a>

### onContextMenusClicked

```
onContextMenusClicked(
  callback: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void
): () => void
```

Adds a listener that triggers when a context menu item is clicked. Returns an unsubscribe function.
