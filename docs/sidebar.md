# sidebar

Documentation:

- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/sidePanel) [MV3]
- [Opera Sidebar Action API](https://help.opera.com/en/extensions/sidebar-action-api/)
- [Firefox Sidebar Action API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction)

A promise-based wrapper around Chromium's side panel (`chrome.sidePanel`, MV3) and Firefox/Opera `sidebarAction` APIs. Methods provide unified behavior to get/set options and behavior, open the panel, and, where supported, manage title and icon (Firefox & Opera) and badge (Opera). Support includes Chrome, Edge, Firefox, and Opera.

## Classes

### SidebarError

Custom error class thrown when an API method is not supported or fails.

## Methods

- [getSidebarOptions(tabId?)](#getSidebarOptions) [Chromium]
- [getSidebarBehavior()](#getSidebarBehavior) [Chromium]
- [canOpenSidebar()](#canOpenSidebar)
- [canCloseSidebar()](#canCloseSidebar)
- [openSidebar(options)](#openSidebar)
- [closeSidebar(options)](#closeSidebar)
- [setSidebarOptions(options?)](#setSidebarOptions) [Chromium]
- [setSidebarBehavior(behavior?)](#setSidebarBehavior) [Chromium]
- [isOpenSidebar(windowId?)](#isOpenSidebar)
- [toggleSidebar()](#toggleSidebar) [Firefox]
- [setSidebarPath(path, tabId?)](#setSidebarPath)
- [getSidebarPath(tabId?)](#getSidebarPath)
- [setSidebarTitle(title, tabId?)](#setSidebarTitle) [Firefox, Opera]
- [setSidebarIcon(details)](#setSidebarIcon) [Firefox, Opera]
- [setSidebarBadgeText(text, tabId?)](#setSidebarBadgeText) [Opera]
- [clearSidebarBadgeText(tabId?)](#clearSidebarBadgeText) [Opera]
- [setSidebarBadgeTextColor(color, tabId?)](#setSidebarBadgeTextColor) [Opera]
- [setSidebarBadgeBgColor(color, tabId?)](#setSidebarBadgeBgColor) [Opera]
- [getSidebarTitle(tabId?)](#getSidebarTitle) [Firefox, Opera]
- [getSidebarBadgeText(tabId?)](#getSidebarBadgeText) [Opera]
- [getSidebarBadgeTextColor(tabId?)](#getSidebarBadgeTextColor) [Opera]
- [getSidebarBadgeBgColor(tabId?)](#getSidebarBadgeBgColor) [Opera]

---

<a name="getSidebarOptions"></a>

### getSidebarOptions [Chromium]

```
getSidebarOptions(tabId?: number): Promise<chrome.sidePanel.PanelOptions>
```

Retrieves the side panel options (e.g., `path`) for the specified tab. Throws if the Side Panel API isn't supported (requires Chromium-based browsers like Chrome, Edge, or Opera MV3). [MV3]

<a name="getSidebarBehavior"></a>

### getSidebarBehavior [Chromium]

```
getSidebarBehavior(): Promise<chrome.sidePanel.PanelBehavior>
```

Gets the current side panel behavior settings. Throws if unsupported (requires Chromium-based browsers like Chrome, Edge, or Opera MV3). [MV3]

<a name="canOpenSidebar"></a>

### canOpenSidebar

```
canOpenSidebar(): boolean
```

Returns `true` if `chrome.sidePanel` (Chromium MV3) is available, or if `sidebarAction.open` is available (Firefox/Opera).

<a name="canCloseSidebar"></a>

### canCloseSidebar

```
canCloseSidebar(): boolean
```

Returns `true` if `chrome.sidePanel` (Chromium MV3) is available, or if `sidebarAction.close` is available (Firefox/Opera).

<a name="openSidebar"></a>

### openSidebar

```
openSidebar(options: chrome.sidePanel.OpenOptions): Promise<void>
```

Opens the side panel with the given options in Chromium-based browsers (MV3). Falls back to `sidebarAction.open()` in Firefox/Opera. Throws if unsupported.

<a name="closeSidebar"></a>

### closeSidebar

```
closeSidebar(options: chrome.sidePanel.CloseOptions): Promise<void>
```

Closes the side panel with the given options in Chromium-based browsers (MV3). Falls back to `sidebarAction.close()` in Firefox/Opera. Throws if unsupported.

<a name="setSidebarOptions"></a>

### setSidebarOptions [Chromium]

```
setSidebarOptions(options?: chrome.sidePanel.PanelOptions): Promise<void>
```

Sets side panel options (e.g., `path`) in Chromium-based browsers (MV3). Throws if unsupported. [MV3]

<a name="setSidebarBehavior"></a>

### setSidebarBehavior [Chromium]

```
setSidebarBehavior(behavior?: chrome.sidePanel.PanelBehavior): Promise<void>
```

Updates default panel behavior in Chromium-based browsers (MV3). Throws if unsupported. [MV3]

<a name="setSidebarPath"></a>

### setSidebarPath

```
setSidebarPath(path: string, tabId?: number): Promise<void>
```

Sets the sidebar path in Chromium-based browsers via `setOptions` (MV3) or via `sidebarAction.setPanel()` in Firefox/Opera. Throws if unsupported.

<a name="getSidebarPath"></a>

### getSidebarPath

```
getSidebarPath(tabId?: number): Promise<string | undefined>
```

Retrieves the sidebar path from Chromium-based browsers (MV3) or parses from `sidebarAction.getPanel()` in Firefox/Opera. Throws if unsupported.

<a name="isOpenSidebar"></a>

### isOpenSidebar

```
isOpenSidebar(windowId?: number): Promise<boolean>
```

Checks if the sidebar is open for the given window in Chromium-based browsers (MV3) using `getContexts` and in Firefox/Opera using `sidebarAction.isOpen()`. Throws if unsupported.

<a name="toggleSidebar"></a>

### toggleSidebar [Firefox]

```
toggleSidebar(): Promise<void>
```

Toggles the sidebar in Firefox. Throws if unsupported.

<a name="setSidebarTitle"></a>

### setSidebarTitle [Firefox, Opera]

```
setSidebarTitle(title: string | number, tabId?: number): Promise<void>
```

Sets the sidebar title via `sidebarAction.setTitle()` (Firefox/Opera). Throws if unsupported.

<a name="setSidebarIcon"></a>

### setSidebarIcon [Firefox, Opera]

```
setSidebarIcon(details: opr.sidebarAction.IconDetails): Promise<void>
```

Sets the sidebar icon via `sidebarAction.setIcon()` (Firefox/Opera). Throws if unsupported.

> Known issue (Opera): The `opr.sidebarAction.setIcon` API is currently broken and may fail with "Access to extension API denied".
> See: https://forums.opera.com/topic/75680/opr-sidebaraction-seticon-api-is-broken-access-to-extension-api-denied

<a name="setSidebarBadgeText"></a>

### setSidebarBadgeText [Opera]

```
setSidebarBadgeText(text: string | number, tabId?: number): Promise<void>
```

Sets the sidebar badge text via `opr.sidebarAction.setBadgeText()` (Opera only). Throws if unsupported.

<a name="clearSidebarBadgeText"></a>

### clearSidebarBadgeText [Opera]

```
clearSidebarBadgeText(tabId?: number): Promise<void>
```

Clears the sidebar badge text (equivalent to setting an empty string) via `opr.sidebarAction.setBadgeText()` (Opera only).

<a name="setSidebarBadgeTextColor"></a>

### setSidebarBadgeTextColor [Opera]

```
setSidebarBadgeTextColor(color: string | [number, number, number, number], tabId?: number): Promise<void>
```

Sets the sidebar badge text color via `opr.sidebarAction.setBadgeTextColor()` (Opera only). Throws if unsupported.

<a name="setSidebarBadgeBgColor"></a>

### setSidebarBadgeBgColor [Opera]

```
setSidebarBadgeBgColor(color: string | [number, number, number, number], tabId?: number): Promise<void>
```

Sets the sidebar badge background color via `opr.sidebarAction.setBadgeBackgroundColor()` (Opera only). Throws if unsupported.

<a name="getSidebarTitle"></a>

### getSidebarTitle [Firefox, Opera]

```
getSidebarTitle(tabId?: number): Promise<string>
```

Gets the sidebar title via `sidebarAction.getTitle()` (Firefox/Opera). Throws if unsupported.

<a name="getSidebarBadgeText"></a>

### getSidebarBadgeText [Opera]

```
getSidebarBadgeText(tabId?: number): Promise<string>
```

Gets the sidebar badge text via `opr.sidebarAction.getBadgeText()` (Opera only). Throws if unsupported.

<a name="getSidebarBadgeTextColor"></a>

### getSidebarBadgeTextColor [Opera]

```
getSidebarBadgeTextColor(tabId?: number): Promise<[number, number, number, number]>
```

Gets the sidebar badge text color via `opr.sidebarAction.getBadgeTextColor()` (Opera only). Throws if unsupported.

<a name="getSidebarBadgeBgColor"></a>

### getSidebarBadgeBgColor [Opera]

```
getSidebarBadgeBgColor(tabId?: number): Promise<[number, number, number, number]>
```

Gets the sidebar badge background color via `opr.sidebarAction.getBadgeBackgroundColor()` (Opera only). Throws if unsupported.
