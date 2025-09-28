# sidebar

Documentation:

- Chrome Side Panel API (MV3): https://developer.chrome.com/docs/extensions/reference/sidePanel
- Opera Sidebar Action API: https://help.opera.com/en/extensions/sidebar-action-api/
- Firefox Sidebar Action API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction

A promise-based wrapper around Chrome's side panel (`chrome.sidePanel`, MV3) and Firefox/Opera `sidebarAction` APIs. Methods provide unified behavior to get/set options and behavior, open the panel, and, where supported (Opera), manage title and badge.

## Methods

- [getSidebarOptions(tabId?)](#getSidebarOptions)
- [getSidebarBehavior()](#getSidebarBehavior)
- [canOpenSidebar()](#canOpenSidebar)
- [openSidebar(options)](#openSidebar)
- [setSidebarOptions(options?)](#setSidebarOptions)
- [setSidebarBehavior(behavior?)](#setSidebarBehavior)
- [setSidebarPath(path, tabId?)](#setSidebarPath)
- [getSidebarPath(tabId?)](#getSidebarPath)
- [setSidebarTitle(title, tabId?)](#setSidebarTitle) [Opera]
- [setSidebarBadgeText(text, tabId?)](#setSidebarBadgeText) [Opera]
- [setSidebarBadgeTextColor(color, tabId?)](#setSidebarBadgeTextColor) [Opera]
- [setSidebarBadgeBgColor(color, tabId?)](#setSidebarBadgeBgColor) [Opera]
- [getSidebarTitle(tabId?)](#getSidebarTitle) [Opera]
- [getSidebarBadgeText(tabId?)](#getSidebarBadgeText) [Opera]
- [getSidebarBadgeTextColor(tabId?)](#getSidebarBadgeTextColor) [Opera]
- [getSidebarBadgeBgColor(tabId?)](#getSidebarBadgeBgColor) [Opera]

---

<a name="getSidebarOptions"></a>

### getSidebarOptions

```
getSidebarOptions(tabId?: number): Promise<chrome.sidePanel.PanelOptions>
```

Retrieves the side panel options (e.g., `path`) for the specified tab. Throws if the Side Panel API isn't supported. [MV3]

<a name="getSidebarBehavior"></a>

### getSidebarBehavior

```
getSidebarBehavior(): Promise<chrome.sidePanel.PanelBehavior>
```

Gets the current side panel behavior settings. Throws if unsupported. [MV3]

<a name="canOpenSidebar"></a>

### canOpenSidebar

```
canOpenSidebar(): boolean
```

Returns `true` if either `chrome.sidePanel` (MV3) or `browser.sidebarAction` (Firefox/Opera) is available.

<a name="openSidebar"></a>

### openSidebar

```
openSidebar(options: chrome.sidePanel.OpenOptions): Promise<void>
```

Opens the side panel with the given options in Chrome (MV3). Falls back to `browser.sidebarAction.open()` in Firefox. Logs a warning if unsupported.

<a name="setSidebarOptions"></a>

### setSidebarOptions

```
setSidebarOptions(options?: chrome.sidePanel.PanelOptions): Promise<void>
```

Sets side panel options (e.g., `path`) in Chrome (MV3). Logs a warning if unsupported. [MV3]

<a name="setSidebarBehavior"></a>

### setSidebarBehavior

```
setSidebarBehavior(behavior?: chrome.sidePanel.PanelBehavior): Promise<void>
```

Updates default panel behavior in Chrome (MV3). Logs a warning if unsupported. [MV3]

<a name="setSidebarPath"></a>

### setSidebarPath

```
setSidebarPath(path: string, tabId?: number): Promise<void>
```

Sets the sidebar path in Chrome via `setOptions` (MV3) or via `sidebarAction.setPanel()` in Firefox/Opera. Throws if unsupported.

<a name="getSidebarPath"></a>

### getSidebarPath

```
getSidebarPath(tabId?: number): Promise<string | undefined>
```

Retrieves the sidebar path from Chrome (MV3) or parses from `sidebarAction.getPanel()` in Firefox/Opera. Throws if unsupported.

<a name="setSidebarTitle"></a>

### setSidebarTitle [Opera]

```
setSidebarTitle(title: string | number, tabId?: number): Promise<void>
```

Sets the sidebar title via `opr.sidebarAction.setTitle()` (Opera only). Logs a warning if unsupported.

<a name="setSidebarBadgeText"></a>

### setSidebarBadgeText [Opera]

```
setSidebarBadgeText(text: string | number, tabId?: number): Promise<void>
```

Sets the sidebar badge text via `opr.sidebarAction.setBadgeText()` (Opera only). Logs a warning if unsupported.

<a name="setSidebarBadgeTextColor"></a>

### setSidebarBadgeTextColor [Opera]

```
setSidebarBadgeTextColor(color: string | [number, number, number, number], tabId?: number): Promise<void>
```

Sets the sidebar badge text color via `opr.sidebarAction.setBadgeTextColor()` (Opera only). Logs a warning if unsupported.

<a name="setSidebarBadgeBgColor"></a>

### setSidebarBadgeBgColor [Opera]

```
setSidebarBadgeBgColor(color: string | [number, number, number, number], tabId?: number): Promise<void>
```

Sets the sidebar badge background color via `opr.sidebarAction.setBadgeBackgroundColor()` (Opera only). Logs a warning if unsupported.

<a name="getSidebarTitle"></a>

### getSidebarTitle [Opera]

```
getSidebarTitle(tabId?: number): Promise<string>
```

Gets the sidebar title via `opr.sidebarAction.getTitle()` (Opera only). Throws if unsupported.

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
