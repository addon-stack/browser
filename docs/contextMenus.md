# contextMenus

Documentation: [Chrome Context Menus API](https://developer.chrome.com/docs/extensions/reference/contextMenus)

A promise-based wrapper for the Chrome `contextMenus` API.

## Methods

- [createContextMenus(createProperties?)](#createContextMenus)
- [removeContextMenus(menuItemId)](#removeContextMenus)
- [removeAllContextMenus()](#removeAllContextMenus)
- [updateContextMenus(id, updateProperties?)](#updateContextMenus)

## Events

- [onContextMenusClicked(callback)](#onContextMenusClicked)

---

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

<a name="onContextMenusClicked"></a>

### onContextMenusClicked

```
onContextMenusClicked(
  callback: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void
): () => void
```

Adds a listener that triggers when a context menu item is clicked. Returns an unsubscribe function.
