# tabs

Documentation: [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs)

A promise-based wrapper for the Chrome `tabs` API, providing core tab operations, messaging, zoom controls, grouping, and helper utilities.

## Methods

- [captureVisibleTab(windowId, options)](#captureVisibleTab)
- [connectTab(tabId, connectInfo?)](#connectTab)
- [createTab(properties)](#createTab)
- [detectTabLanguage(tabId)](#detectTabLanguage)
- [discardTab(tabId)](#discardTab)
- [duplicateTab(tabId)](#duplicateTab)
- [getTab(tabId)](#getTab)
- [getCurrentTab()](#getCurrentTab)
- [getTabZoom(tabId)](#getTabZoom)
- [getTabZoomSettings(tabId)](#getTabZoomSettings)
- [goTabBack(tabId)](#goTabBack)
- [goTabForward(tabId)](#goTabForward)
- [groupTabs(options)](#groupTabs)
- [highlightTab(highlightInfo)](#highlightTab)
- [moveTab(tabId, moveProperties)](#moveTab)
- [moveTabs(tabIds, moveProperties)](#moveTabs)
- [queryTabs(queryInfo?)](#queryTabs)
- [reloadTab(tabId, bypassCache?)](#reloadTab)
- [removeTab(tabId)](#removeTab)
- [sendTabMessage(tabId, message, options?)](#sendTabMessage)
- [setTabZoom(tabId, zoomFactor)](#setTabZoom)
- [setTabZoomSettings(tabId, zoomSettings)](#setTabZoomSettings)
- [ungroupTab(tabIds)](#ungroupTab)
- [updateTab(tabId, updateProperties)](#updateTab)
- [executeScriptTab(tabId, details)](#executeScriptTab) [MV2]
- [insertCssTab(tabId, details)](#insertCssTab) [MV2]
- [removeCssTab(tabId, details)](#removeCssTab) [MV2]
- [getTabUrl(tabId)](#getTabUrl)
- [getActiveTab()](#getActiveTab)
- [queryTabIds(queryInfo?)](#queryTabIds)
- [findTab(queryInfo?)](#findTab)
- [findTabById(tabId)](#findTabById)
- [findTabByUrl(url)](#findTabByUrl)
- [updateTabAsSelected(tabId)](#updateTabAsSelected)
- [updateTabAsActive(tabId)](#updateTabAsActive)
- [openOrCreateTab(tab)](#openOrCreateTab)
- [openOrCreateTabByUrl(url)](#openOrCreateTabByUrl)

## Events

- [onTabActivated(callback)](#onTabActivated)
- [onTabAttached(callback)](#onTabAttached)
- [onTabCreated(callback)](#onTabCreated)
- [onTabDetached(callback)](#onTabDetached)
- [onTabHighlighted(callback)](#onTabHighlighted)
- [onTabMoved(callback)](#onTabMoved)
- [onTabRemoved(callback)](#onTabRemoved)
- [onTabReplaced(callback)](#onTabReplaced)
- [onTabUpdated(callback)](#onTabUpdated)
- [onTabZoomChange(callback)](#onTabZoomChange)

---

<a name="captureVisibleTab"></a>

### captureVisibleTab

```
captureVisibleTab(
  windowId: number,
  options: chrome.extensionTypes.ImageDetails
): Promise<string>
```

Captures the visible area of the specified window as an image (data URL string).

<a name="connectTab"></a>

### connectTab

```
connectTab(
  tabId: number,
  connectInfo?: chrome.tabs.ConnectInfo
): chrome.runtime.Port
```

Creates a long-lived connection to the specified tab for messaging.

<a name="createTab"></a>

### createTab

```
createTab(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>
```

Creates a new tab with the given properties.

<a name="detectTabLanguage"></a>

### detectTabLanguage

```
detectTabLanguage(tabId: number): Promise<string>
```

Detects the primary language of the specified tab's content. Returns a language code (e.g., `"en"` or `"und"`).

<a name="discardTab"></a>

### discardTab

```
discardTab(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Discards the specified tab to free memory. Resolves with the updated tab or `undefined`.

<a name="duplicateTab"></a>

### duplicateTab

```
duplicateTab(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Duplicates the specified tab. Resolves with the new tab, or `undefined` if duplication fails.

<a name="getTab"></a>

### getTab

```
getTab(tabId: number): Promise<chrome.tabs.Tab>
```

Retrieves information about the specified tab.

<a name="getCurrentTab"></a>

### getCurrentTab

```
getCurrentTab(): Promise<chrome.tabs.Tab | undefined>
```

Retrieves the tab in which the calling script is running (e.g., popup). May resolve to `undefined` outside a tab context.

<a name="getTabZoom"></a>

### getTabZoom

```
getTabZoom(tabId: number): Promise<number>
```

Gets the zoom factor of the specified tab.

<a name="getTabZoomSettings"></a>

### getTabZoomSettings

```
getTabZoomSettings(tabId: number): Promise<chrome.tabs.ZoomSettings>
```

Retrieves the zoom settings for the specified tab.

<a name="goTabBack"></a>

### goTabBack

```
goTabBack(tabId: number): Promise<void>
```

Navigates the tab one step backward in its history.

<a name="goTabForward"></a>

### goTabForward

```
goTabForward(tabId: number): Promise<void>
```

Navigates the tab one step forward in its history.

<a name="groupTabs"></a>

### groupTabs

```
groupTabs(options: chrome.tabs.GroupOptions): Promise<number>
```

Groups one or more tabs. Resolves with the group ID.

<a name="highlightTab"></a>

### highlightTab

```
highlightTab(highlightInfo: chrome.tabs.HighlightInfo): Promise<chrome.windows.Window>
```

Highlights (selects) the specified tabs and resolves with the updated window.

<a name="moveTab"></a>

### moveTab

```
moveTab(
  tabId: number,
  moveProperties: chrome.tabs.MoveProperties
): Promise<chrome.tabs.Tab>
```

Moves a tab to a new index or window.

<a name="moveTabs"></a>

### moveTabs

```
moveTabs(
  tabIds: number[],
  moveProperties: chrome.tabs.MoveProperties
): Promise<chrome.tabs.Tab[]>
```

Moves multiple tabs and resolves with the updated tabs.

<a name="queryTabs"></a>

### queryTabs

```
queryTabs(queryInfo?: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>
```

Retrieves tabs matching the query filter.

<a name="reloadTab"></a>

### reloadTab

```
reloadTab(tabId: number, bypassCache?: boolean): Promise<void>
```

Reloads the specified tab. Set `bypassCache` to `true` to force revalidation.

<a name="removeTab"></a>

### removeTab

```
removeTab(tabId: number): Promise<void>
```

Closes the specified tab.

<a name="sendTabMessage"></a>

### sendTabMessage

```
sendTabMessage<M = any, R = any>(
  tabId: number,
  message: M,
  options?: chrome.tabs.MessageSendOptions
): Promise<R>
```

Sends a one-time message to the content script in the specified tab and resolves with the response.

<a name="setTabZoom"></a>

### setTabZoom

```
setTabZoom(tabId: number, zoomFactor: number): Promise<void>
```

Sets the zoom factor for the specified tab.

<a name="setTabZoomSettings"></a>

### setTabZoomSettings

```
setTabZoomSettings(
  tabId: number,
  zoomSettings: chrome.tabs.ZoomSettings
): Promise<void>
```

Updates the zoom settings for the specified tab.

<a name="ungroupTab"></a>

### ungroupTab

```
ungroupTab(tabIds: number | [number, ...number[]]): Promise<void>
```

Removes one or more tabs from their respective groups.

<a name="updateTab"></a>

### updateTab

```
updateTab(
  tabId: number,
  updateProperties: chrome.tabs.UpdateProperties
): Promise<chrome.tabs.Tab | undefined>
```

Updates properties of the specified tab. Resolves with the updated tab or `undefined`.

<a name="executeScriptTab"></a>

### executeScriptTab [MV2]

```
executeScriptTab(
  tabId: number,
  details: chrome.extensionTypes.InjectDetails
): Promise<any[] | undefined>
```

Executes code in the tab using the MV2 `chrome.tabs.executeScript`. Not available in MV3.

<a name="insertCssTab"></a>

### insertCssTab [MV2]

```
insertCssTab(
  tabId: number,
  details: chrome.extensionTypes.InjectDetails
): Promise<void>
```

Inserts CSS into the tab using the MV2 `chrome.tabs.insertCSS`. Not available in MV3.

<a name="removeCssTab"></a>

### removeCssTab [MV2]

```
removeCssTab(
  tabId: number,
  details: chrome.extensionTypes.InjectDetails
): Promise<void>
```

Removes previously inserted CSS using the MV2 `chrome.tabs.removeCSS`. Not available in MV3.

<a name="getTabUrl"></a>

### getTabUrl

```
getTabUrl(tabId: number): Promise<string>
```

Returns the current URL of the specified tab or throws if it cannot be determined.

<a name="getActiveTab"></a>

### getActiveTab

```
getActiveTab(): Promise<chrome.tabs.Tab>
```

Returns the active tab in the current window or throws if not found.

<a name="queryTabIds"></a>

### queryTabIds

```
queryTabIds(queryInfo?: chrome.tabs.QueryInfo): Promise<number[]>
```

Returns only the IDs for tabs matching the query.

<a name="findTab"></a>

### findTab

```
findTab(queryInfo?: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab | undefined>
```

Returns the first tab matching the query, if any.

<a name="findTabById"></a>

### findTabById

```
findTabById(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Resolves with the tab for the given ID, or `undefined` if not available.

<a name="findTabByUrl"></a>

### findTabByUrl

```
findTabByUrl(url: string): Promise<chrome.tabs.Tab | undefined>
```

Finds the first tab with the specified URL, if any.

<a name="updateTabAsSelected"></a>

### updateTabAsSelected

```
updateTabAsSelected(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Marks the specified tab as highlighted (selected).

<a name="updateTabAsActive"></a>

### updateTabAsActive

```
updateTabAsActive(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Marks the specified tab as active.

<a name="openOrCreateTab"></a>

### openOrCreateTab

```
openOrCreateTab(tab: chrome.tabs.Tab): Promise<void>
```

Selects an existing tab with the same URL and ID, or creates a new one with that URL.

<a name="openOrCreateTabByUrl"></a>

### openOrCreateTabByUrl

```
openOrCreateTabByUrl(url: string): Promise<void>
```

Selects an existing tab with the given URL, or creates a new tab with that URL.

---

<a name="onTabActivated"></a>

### onTabActivated

```
onTabActivated(
  callback: (activeInfo: chrome.tabs.OnActivatedInfo) => void
): () => void
```

Fires when the active tab in a window changes. Returns an unsubscribe function.

<a name="onTabAttached"></a>

### onTabAttached

```
onTabAttached(
  callback: (tabId: number, attachInfo: chrome.tabs.OnAttachedInfo) => void
): () => void
```

Fires when a tab is attached to a window (moved between windows). Returns an unsubscribe function.

<a name="onTabCreated"></a>

### onTabCreated

```
onTabCreated(
  callback: (tab: chrome.tabs.Tab) => void
): () => void
```

Fires when a tab is created. Returns an unsubscribe function.

<a name="onTabDetached"></a>

### onTabDetached

```
onTabDetached(
  callback: (tabId: number, detachInfo: chrome.tabs.OnDetachedInfo) => void
): () => void
```

Fires when a tab is detached from a window. Returns an unsubscribe function.

<a name="onTabHighlighted"></a>

### onTabHighlighted

```
onTabHighlighted(
  callback: (highlightInfo: chrome.tabs.OnHighlightedInfo) => void
): () => void
```

Fires when the highlighted/selected tabs in a window change. Returns an unsubscribe function.

<a name="onTabMoved"></a>

### onTabMoved

```
onTabMoved(
  callback: (tabId: number, moveInfo: chrome.tabs.OnMovedInfo) => void
): () => void
```

Fires when a tab is moved within a window. Returns an unsubscribe function.

<a name="onTabRemoved"></a>

### onTabRemoved

```
onTabRemoved(
  callback: (tabId: number, removeInfo: chrome.tabs.OnRemovedInfo) => void
): () => void
```

Fires when a tab is closed. Returns an unsubscribe function.

<a name="onTabReplaced"></a>

### onTabReplaced

```
onTabReplaced(
  callback: (addedTabId: number, removedTabId: number) => void
): () => void
```

Fires when a tab is replaced with another tab due to prerendering or instant. Returns an unsubscribe function.

<a name="onTabUpdated"></a>

### onTabUpdated

```
onTabUpdated(
  callback: (
    tabId: number,
    changeInfo: chrome.tabs.OnUpdatedInfo,
    tab: chrome.tabs.Tab
  ) => void
): () => void
```

Fires when a tab is updated. Returns an unsubscribe function.

<a name="onTabZoomChange"></a>

### onTabZoomChange

```
onTabZoomChange(
  callback: (ZoomChangeInfo: chrome.tabs.OnZoomChangeInfo) => void
): () => void
```

Fires when a tab's zoom changes. Returns an unsubscribe function.
