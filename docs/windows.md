# windows

Documentation: [Chrome Windows API](https://developer.chrome.com/docs/extensions/reference/windows)

A promise-based wrapper for the Chrome `windows` API to create, query, update, and manage browser windows.

## Methods

- [createWindow(createData?)](#createWindow)
- [getWindow(windowId, queryOptions?)](#getWindow)
- [getAllWindows(queryOptions?)](#getAllWindows)
- [getCurrentWindow(queryOptions?)](#getCurrentWindow)
- [getLastFocusedWindow(queryOptions?)](#getLastFocusedWindow)
- [removeWindow(windowId)](#removeWindow)
- [updateWindow(windowId, updateInfo)](#updateWindow)

## Events

- [onWindowBoundsChanged(callback)](#onWindowBoundsChanged)
- [onWindowCreated(callback, filter?)](#onWindowCreated)
- [onWindowFocusChanged(callback, filter?)](#onWindowFocusChanged)
- [onWindowRemoved(callback, filter?)](#onWindowRemoved)

---

<a name="createWindow"></a>

### createWindow

```
createWindow(createData?: chrome.windows.CreateData): Promise<chrome.windows.Window | undefined>
```

Creates a new browser window with the specified options. Resolves with the created `Window` or `undefined`.

<a name="getWindow"></a>

### getWindow

```
getWindow(windowId: number, queryOptions?: chrome.windows.QueryOptions): Promise<chrome.windows.Window>
```

Retrieves details for the window with the given ID.

<a name="getAllWindows"></a>

### getAllWindows

```
getAllWindows(queryOptions?: chrome.windows.QueryOptions): Promise<chrome.windows.Window[]>
```

Retrieves all windows, optionally filtered by the provided query options.

<a name="getCurrentWindow"></a>

### getCurrentWindow

```
getCurrentWindow(queryOptions?: chrome.windows.QueryOptions): Promise<chrome.windows.Window>
```

Gets the current window (the window that contains the code calling this method).

<a name="getLastFocusedWindow"></a>

### getLastFocusedWindow

```
getLastFocusedWindow(queryOptions?: chrome.windows.QueryOptions): Promise<chrome.windows.Window>
```

Gets the most recently focused window.

<a name="removeWindow"></a>

### removeWindow

```
removeWindow(windowId: number): Promise<void>
```

Removes (closes) the window with the given ID.

<a name="updateWindow"></a>

### updateWindow

```
updateWindow(windowId: number, updateInfo: chrome.windows.UpdateInfo): Promise<chrome.windows.Window>
```

Updates the properties of the specified window and resolves with the updated `Window`.

<a name="onWindowBoundsChanged"></a>

### onWindowBoundsChanged

```
onWindowBoundsChanged(
  callback: (windowId: number) => void
): () => void
```

Adds a listener that fires when the window's bounds (size or position) change. Returns an unsubscribe function.

<a name="onWindowCreated"></a>

### onWindowCreated

```
onWindowCreated(
  callback: (window: chrome.windows.Window) => void,
  filter?: { windowTypes: chrome.windows.WindowType[] } // WindowEventFilter
): () => void
```

Adds a listener that fires when a new window is created. Optionally filter by window types. Returns an unsubscribe function.

<a name="onWindowFocusChanged"></a>

### onWindowFocusChanged

```
onWindowFocusChanged(
  callback: (windowId: number) => void,
  filter?: { windowTypes: chrome.windows.WindowType[] } // WindowEventFilter
): () => void
```

Adds a listener that fires when the focused window changes. Optionally filter by window types. Returns an unsubscribe function.

<a name="onWindowRemoved"></a>

### onWindowRemoved

```
onWindowRemoved(
  callback: (windowId: number) => void,
  filter?: { windowTypes: chrome.windows.WindowType[] } // WindowEventFilter
): () => void
```

Adds a listener that fires when a window is removed (closed). Optionally filter by window types. Returns an unsubscribe function.
