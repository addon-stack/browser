# tabs

Documentation: [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs),
[Firefox Tabs API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs).

Find, open and organize browser tabs; exchange messages with their content scripts; and observe tab changes.
Methods return Promises except for the synchronous availability check and `connectTab()`, which returns a native Port.
Event subscriptions return an unsubscribe function.

## Methods

- [isAvailableTabs()](#isAvailableTabs)
- [getTab()](#getTab)
- [getCurrentTab()](#getCurrentTab)
- [getActiveTab()](#getActiveTab)
- [queryTabs()](#queryTabs)
- [queryTabIds()](#queryTabIds)
- [findTab()](#findTab)
- [findTabById()](#findTabById)
- [findTabByUrl()](#findTabByUrl)
- [getTabUrl()](#getTabUrl)
- [createTab()](#createTab)
- [updateTab()](#updateTab)
- [duplicateTab()](#duplicateTab)
- [discardTab()](#discardTab)
- [removeTab()](#removeTab)
- [updateTabAsSelected()](#updateTabAsSelected)
- [updateTabAsActive()](#updateTabAsActive)
- [highlightTab()](#highlightTab)
- [openOrCreateTab()](#openOrCreateTab)
- [openOrCreateTabByUrl()](#openOrCreateTabByUrl)
- [moveTab()](#moveTab)
- [moveTabs()](#moveTabs)
- [groupTabs()](#groupTabs)
- [ungroupTab()](#ungroupTab)
- [reloadTab()](#reloadTab)
- [goTabBack()](#goTabBack)
- [goTabForward()](#goTabForward)
- [getTabZoom()](#getTabZoom)
- [setTabZoom()](#setTabZoom)
- [getTabZoomSettings()](#getTabZoomSettings)
- [setTabZoomSettings()](#setTabZoomSettings)
- [captureVisibleTab()](#captureVisibleTab)
- [detectTabLanguage()](#detectTabLanguage)
- [sendTabMessage()](#sendTabMessage)
- [connectTab()](#connectTab)
- [executeScriptTab()](#executeScriptTab)
- [insertCssTab()](#insertCssTab)
- [removeCssTab()](#removeCssTab)

## Events

- [onTabActivated()](#onTabActivated)
- [onTabAttached()](#onTabAttached)
- [onTabCreated()](#onTabCreated)
- [onTabDetached()](#onTabDetached)
- [onTabHighlighted()](#onTabHighlighted)
- [onTabMoved()](#onTabMoved)
- [onTabRemoved()](#onTabRemoved)
- [onTabReplaced()](#onTabReplaced)
- [onTabUpdated()](#onTabUpdated)
- [onTabZoomChange()](#onTabZoomChange)

## Permissions and browser support

Use this API from a background script, service worker or extension page, including a popup.
The Tabs API is not exposed to content scripts; use messaging to request tab operations from the background.

| Task | Access to consider |
| --- | --- |
| Create, close or reload tabs | These basic operations do not require the `tabs` permission. |
| Read or query URLs, titles and favicons | Use `tabs` or matching host permissions. |
| Access the current page after a user invokes the extension | `activeTab` grants temporary access. |
| Capture the visible tab | See the separate [capture requirements](#captureVisibleTab). |
| Inject scripts or CSS | Page access is required; MV3 uses the separate [Scripting API](scripting.md). |

For an extension that lists tab URLs and titles, the manifest can include:

```json
{
    "permissions": ["tabs"]
}
```

Choose permissions for the operations your extension actually performs. Declaring `tabs` does not grant arbitrary
page injection or screenshot access. See [Chrome's permission guide](https://developer.chrome.com/docs/extensions/reference/api/tabs#permissions).

Method availability and optional fields vary across Chromium, Firefox and Safari. Check the compatibility section
of each linked native method; namespace availability is not a guarantee that every operation is supported.
For group-specific behavior, see [Tab Groups](tab-groups.md). Legacy injection helpers below target Manifest V2;
use [Scripting](scripting.md) in Manifest V3. The wrappers do not emulate missing native methods.

## Types and behavior

Signatures use `chrome.tabs`, `chrome.windows`, `chrome.runtime` and `chrome.extensionTypes` from `@types/chrome`.
These types do not establish runtime support in every browser. Native results, optional fields and errors are
preserved by the method wrappers unless a helper explicitly documents a different policy.

| Value or helper | Meaning |
| --- | --- |
| `tab.id` | Numeric identifier; check `!== undefined` because `0` is valid. |
| `tab.index` | Position within a window; used by `highlightTab()`. |
| `getCurrentTab()` | The tab containing the calling extension page, if any. |
| `getActiveTab()` | The first active tab returned for the current window. |
| `updateTabAsSelected()` | Sends `highlighted: true`; native selection can also activate the tab. |
| `updateTabAsActive()` | Sends `active: true`; does not request window focus. |

Most asynchronous errors remain Promise rejections. `findTabById()` is an explicit exception: it returns
`undefined` after any lookup rejection. `getTabUrl()` builds its own errors on top of that helper.
Empty query results are valid; a failed query is not converted to an empty array.

Examples use `tabId`, `windowId`, `destinationWindowId`, `firstTabId` and `secondTabId` for numeric IDs already
obtained by the application. Each example is independent; `await` belongs in an async function or an ES module.

## Quick start

Open a reference page in a background tab and use its returned ID:

```ts
import {createTab, updateTabAsActive} from "@addon-core/browser";

const tab = await createTab({url: "https://example.com/guide", active: false});

if (tab.id !== undefined) {
    await updateTabAsActive(tab.id);
}
```

When an existing matching URL should be reused, use `openOrCreateTabByUrl()`. If a particular tab's ID and URL
must match, use `openOrCreateTab()`. Both reuse paths delegate to native highlighting and return no tab object.

## Method reference

<a name="isAvailableTabs"></a>

### isAvailableTabs

```ts
isAvailableTabs(): boolean
```

Checks the namespace selected by `browser()` on each call. Returns `false` if the extension environment
or namespace is missing, or if accessing it throws. The check is synchronous, silent and uncached.
It does not establish permissions, support for individual methods, or success of a later operation.

```ts
import {isAvailableTabs, queryTabIds} from "@addon-core/browser";

if (isAvailableTabs()) {
    const tabIds = await queryTabIds({currentWindow: true});
    console.log("Tabs in this window", tabIds);
}
```

<a name="getTab"></a>

### getTab

```ts
getTab(tabId: number): Promise<chrome.tabs.Tab>
```

Reads a tab by ID. A missing tab or other native failure rejects the Promise.
Use this strict lookup when the original error matters; [findTabById()](#findTabById) suppresses lookup failures.

```ts
import {getTab} from "@addon-core/browser";

try {
    const tab = await getTab(tabId);
    console.log(tab.id, tab.title ?? "Title unavailable");
} catch (error) {
    console.error("Could not read the tab", error);
}
```

<a name="getCurrentTab"></a>

### getCurrentTab

```ts
getCurrentTab(): Promise<chrome.tabs.Tab | undefined>
```

Reads the tab containing the calling extension page, for example an options page opened in a tab.
A popup or background script has no containing tab and normally receives `undefined`.
Use [getActiveTab()](#getActiveTab) to query the active tab instead.
See [native getCurrent behavior](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/getCurrent).

```ts
import {getCurrentTab} from "@addon-core/browser";

// In an extension page opened as a browser tab.
const currentTab = await getCurrentTab();

if (currentTab?.id !== undefined) {
    console.log("This extension page is in tab", currentTab.id);
}
```

<a name="getActiveTab"></a>

### getActiveTab

```ts
getActiveTab(): Promise<chrome.tabs.Tab>
```

Queries `{active: true, currentWindow: true}` and returns the first result.
Rejects with `Error("Tab not found")` if the query is empty; native query errors also reject.
The browser determines the current window for the calling context.

```ts
import {getActiveTab, reloadTab} from "@addon-core/browser";

const tab = await getActiveTab();

if (tab.id !== undefined) {
    await reloadTab(tab.id);
}
```

<a name="queryTabs"></a>

### queryTabs

```ts
queryTabs(queryInfo?: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>
```

Returns all accessible tabs matching the native filter. Omitting `queryInfo` passes `{}`.
No matches produces an empty array; a failed query rejects.

The `url` filter uses browser match patterns, and URL fragments are not matched. Reading or filtering
sensitive fields requires the appropriate permission. See [native query filters](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/query).

```ts
import {queryTabs} from "@addon-core/browser";

const tabs = await queryTabs({
    currentWindow: true,
    url: "https://example.com/*",
});

for (const tab of tabs) {
    console.log(tab.id, tab.title ?? "Untitled", tab.url);
}
```

<a name="queryTabIds"></a>

### queryTabIds

```ts
queryTabIds(queryInfo?: chrome.tabs.QueryInfo): Promise<number[]>
```

Runs the same query as [queryTabs()](#queryTabs) and collects numeric IDs in result order.
Missing IDs are skipped; ID `0` is retained. Query failures reject.

```ts
import {queryTabIds} from "@addon-core/browser";

const pinnedIds = await queryTabIds({currentWindow: true, pinned: true});
console.log("Pinned tabs", pinnedIds);
```

<a name="findTab"></a>

### findTab

```ts
findTab(queryInfo?: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab | undefined>
```

Returns the first native query result, or `undefined` if there are no matches.
It does not suppress query failures. Omit the filter to inspect the first accessible tab.

```ts
import {findTab} from "@addon-core/browser";

const audibleTab = await findTab({currentWindow: true, audible: true});
console.log(audibleTab?.title ?? "No audible tab found");
```

<a name="findTabById"></a>

### findTabById

```ts
findTabById(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Returns the tab for the requested ID, or `undefined` after **any** `getTab()` rejection.
This includes errors other than a closed or missing tab. Use [getTab()](#getTab) when the original browser
error must remain visible to the caller.

```ts
import {findTabById} from "@addon-core/browser";

const tab = await findTabById(tabId);

if (tab) {
    console.log("Tab found", tab.id);
} else {
    console.log("The tab could not be retrieved");
}
```

<a name="findTabByUrl"></a>

### findTabByUrl

```ts
findTabByUrl(url: string): Promise<chrome.tabs.Tab | undefined>
```

Queries `{url}` and returns the first matching tab, or `undefined` if none is found.
The string follows native URL-filter semantics, including match patterns. Query errors reject.
When several tabs match, this helper does not select by ID.

```ts
import {findTabByUrl} from "@addon-core/browser";

const tab = await findTabByUrl("https://example.com/dashboard");
console.log(tab?.id ?? "Dashboard is not open");
```

<a name="getTabUrl"></a>

### getTabUrl

```ts
getTabUrl(tabId: number): Promise<string>
```

Returns a nonempty URL from the tab found by [findTabById()](#findTabById).
Rejects with `Tab id "${tabId}" not exist` if the lookup fails, or `URL not exist by tab id ${tabId}`
if the result has no URL. The requested ID is substituted into each message.

Because the lookup uses `findTabById()`, the first error also replaces other native lookup failures.
A missing URL can reflect missing permissions; it does not prove that the tab is absent.

```ts
import {getTabUrl} from "@addon-core/browser";

try {
    const url = await getTabUrl(tabId);
    console.log("Current address", url);
} catch (error) {
    console.error("Could not read the tab URL", error);
}
```

<a name="createTab"></a>

### createTab

```ts
createTab(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>
```

Creates a tab with the supplied properties and returns the native `Tab`.
Creating a tab does not wait for its page to finish loading; observe [onTabUpdated()](#onTabUpdated)
when later load-state changes matter.

```ts
import {createTab} from "@addon-core/browser";

const tab = await createTab({
    url: "https://example.com/guide",
    active: false,
});

console.log("Opened in the background", tab.id);
```

<a name="updateTab"></a>

### updateTab

```ts
updateTab(
    tabId: number,
    updateProperties: chrome.tabs.UpdateProperties
): Promise<chrome.tabs.Tab | undefined>
```

Passes the requested property changes to the browser. Omitted properties are left to native behavior.
The wrapper preserves an omitted native result as `undefined`; native errors still reject.
Updating `active` does not focus the containing window.

```ts
import {updateTab} from "@addon-core/browser";

const tab = await updateTab(tabId, {pinned: true, muted: true});
console.log(tab?.pinned, tab?.mutedInfo?.muted);
```

<a name="duplicateTab"></a>

### duplicateTab

```ts
duplicateTab(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Duplicates the tab and returns the native result. The declared `undefined` result is preserved when
no result is supplied; it is not a fallback for failures. Native errors reject.

```ts
import {duplicateTab} from "@addon-core/browser";

const copy = await duplicateTab(tabId);

if (copy?.id !== undefined) {
    console.log("Duplicate tab", copy.id);
}
```

<a name="discardTab"></a>

### discardTab

```ts
discardTab(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Asks the browser to unload a tab's contents while keeping its entry in the tab strip.
The browser applies its discard restrictions. A native `undefined` result is retained, and native errors reject.

```ts
import {discardTab, queryTabIds} from "@addon-core/browser";

const [tabId] = await queryTabIds({currentWindow: true, active: false, discarded: false});

if (tabId !== undefined) {
    const tab = await discardTab(tabId);
    console.log("Discarded", tab?.discarded);
}
```

<a name="removeTab"></a>

### removeTab

```ts
removeTab(tabId: number): Promise<void>
```

Closes one tab by ID. Resolves without a value after the native call succeeds; failures reject.
Use [onTabRemoved()](#onTabRemoved) to observe tab closure.

```ts
import {removeTab} from "@addon-core/browser";

await removeTab(tabId);
```

<a name="updateTabAsSelected"></a>

### updateTabAsSelected

```ts
updateTabAsSelected(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Calls `updateTab(tabId, {highlighted: true})`. The helper does not set `active` or update window focus.
Native selection can also activate the tab, so highlighting must not be treated as a cross-browser guarantee
that the active tab stays unchanged. See [native selection behavior](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/update#highlighted).

```ts
import {updateTabAsSelected} from "@addon-core/browser";

await updateTabAsSelected(tabId);
```

<a name="updateTabAsActive"></a>

### updateTabAsActive

```ts
updateTabAsActive(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Calls `updateTab(tabId, {active: true})` to activate the tab in its window.
It does not focus that window; use the [Windows API](windows.md) if the application also needs window focus.

```ts
import {updateTabAsActive} from "@addon-core/browser";

await updateTabAsActive(tabId);
```

<a name="highlightTab"></a>

### highlightTab

```ts
highlightTab(highlightInfo: chrome.tabs.HighlightInfo): Promise<chrome.windows.Window>
```

Selects tabs by their zero-based **indices within a window**, rather than their tab IDs.
The first supplied index becomes the active tab. Resolves with the updated window.
See [native highlight behavior](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/highlight).

```ts
import {highlightTab, queryTabs} from "@addon-core/browser";

const tabs = await queryTabs({currentWindow: true});
const first = tabs[0];

if (first) {
    await highlightTab({
        windowId: first.windowId,
        tabs: tabs.slice(0, 2).map(tab => tab.index),
    });
}
```

<a name="openOrCreateTab"></a>

### openOrCreateTab

```ts
openOrCreateTab(tab: chrome.tabs.Tab): Promise<void>
```

Queries by `tab.url` and selects the result whose ID equals `tab.id`, even when several tabs share the URL.
ID `0` is valid. Reuse calls [updateTabAsSelected()](#updateTabAsSelected), with its native selection behavior.

| Input | Outcome |
| --- | --- |
| ID and URL match an existing tab | Select that tab, regardless of its position in the query results. |
| ID is absent, stale, or belongs to a different URL | Create a tab with the supplied URL. |
| URL is absent | Create a tab without specifying a URL. |

Resolves without a value. Query, selection and creation errors reject; a failed query or selection never
triggers a fallback creation. This is a query followed by an operation, not an atomic deduplication guarantee
for concurrent callers.

```ts
import {createTab, openOrCreateTab} from "@addon-core/browser";

await createTab({url: "https://example.com/dashboard", active: false});
const second = await createTab({url: "https://example.com/dashboard", active: false});

// Selects second by its ID, even though another tab has the same URL.
await openOrCreateTab(second);
```

<a name="openOrCreateTabByUrl"></a>

### openOrCreateTabByUrl

```ts
openOrCreateTabByUrl(url: string): Promise<void>
```

Selects the first native URL-query result, including ID `0`, through
[updateTabAsSelected()](#updateTabAsSelected). Creates a tab with that URL if no result is found or the first
result has no ID. Unlike `openOrCreateTab()`, it does not look for a particular ID.

Resolves without a value. Native query, selection and creation errors reject; a failed query or selection
never triggers fallback creation. Native URL matching and concurrent-call limitations still apply.

```ts
import {openOrCreateTabByUrl} from "@addon-core/browser";

await openOrCreateTabByUrl("https://example.com/dashboard");
```

<a name="moveTab"></a>

### moveTab

```ts
moveTab(
    tabId: number,
    moveProperties: chrome.tabs.MoveProperties
): Promise<chrome.tabs.Tab>
```

Moves one tab to a position in its current window or an explicitly supplied `windowId`.
Use `index: -1` to move it to the end. Native move restrictions and errors are preserved.

```ts
import {moveTab} from "@addon-core/browser";

const tab = await moveTab(tabId, {index: 0});
console.log("New position", tab.index);
```

<a name="moveTabs"></a>

### moveTabs

```ts
moveTabs(
    tabIds: number[],
    moveProperties: chrome.tabs.MoveProperties
): Promise<chrome.tabs.Tab[]>
```

Moves an array of tab IDs and returns the native array of updated tabs.
Supply `windowId` to move them to another window; native ordering and restrictions remain in effect.

```ts
import {moveTabs, queryTabIds} from "@addon-core/browser";

const tabIds = await queryTabIds({currentWindow: true, highlighted: true});

if (tabIds.length > 0) {
    await moveTabs(tabIds, {windowId: destinationWindowId, index: -1});
}
```

<a name="groupTabs"></a>

### groupTabs

```ts
groupTabs(options: chrome.tabs.GroupOptions): Promise<number>
```

Groups existing tabs and returns the numeric group ID. Pass `groupId` to add them to an existing group,
or `createProperties` when creating a group. Set `createProperties.windowId` to choose its window explicitly.
See [Tab Groups](tab-groups.md) for group metadata, permissions and browser support.

```ts
import {groupTabs, queryTabIds, updateTabGroup} from "@addon-core/browser";

const [firstTabId, ...otherTabIds] = await queryTabIds({windowId, url: "https://example.com/*"});

if (firstTabId !== undefined) {
    const groupId = await groupTabs({
        tabIds: [firstTabId, ...otherTabIds],
        createProperties: {windowId},
    });

    await updateTabGroup(groupId, {title: "Research", color: "blue"});
}
```

<a name="ungroupTab"></a>

### ungroupTab

```ts
ungroupTab(tabIds: number | [number, ...number[]]): Promise<void>
```

Removes one ID or a nonempty tuple of IDs from their groups while leaving the tabs open.
The wrapper chooses the callback or Promise invocation for the selected browser API and preserves native failures.

```ts
import {ungroupTab} from "@addon-core/browser";

await ungroupTab(tabId);
await ungroupTab([firstTabId, secondTabId]);
```

<a name="reloadTab"></a>

### reloadTab

```ts
reloadTab(tabId: number, bypassCache?: boolean): Promise<void>
```

Reloads the tab. Pass `true` to request bypassing the local cache.
The Promise represents the native reload operation, not completion of the page load.

```ts
import {reloadTab} from "@addon-core/browser";

await reloadTab(tabId);
await reloadTab(tabId, true);
```

<a name="goTabBack"></a>

### goTabBack

```ts
goTabBack(tabId: number): Promise<void>
```

Navigates one entry backward in the tab's history. Native navigation failures reject.

```ts
import {goTabBack} from "@addon-core/browser";

await goTabBack(tabId);
```

<a name="goTabForward"></a>

### goTabForward

```ts
goTabForward(tabId: number): Promise<void>
```

Navigates one entry forward in the tab's history. Native navigation failures reject.

```ts
import {goTabForward} from "@addon-core/browser";

await goTabForward(tabId);
```

<a name="getTabZoom"></a>

### getTabZoom

```ts
getTabZoom(tabId: number): Promise<number>
```

Returns the tab's native zoom factor. A factor of `1` represents 100%, and `1.25` represents 125%.

```ts
import {getTabZoom} from "@addon-core/browser";

const factor = await getTabZoom(tabId);
console.log(`Zoom: ${Math.round(factor * 100)}%`);
```

<a name="setTabZoom"></a>

### setTabZoom

```ts
setTabZoom(tabId: number, zoomFactor: number): Promise<void>
```

Sets the tab's zoom factor. Pass `0` to reset it to the browser's default zoom.
Native restrictions, including unsupported targets, retain their errors.

```ts
import {setTabZoom} from "@addon-core/browser";

await setTabZoom(tabId, 1.25);
```

<a name="getTabZoomSettings"></a>

### getTabZoomSettings

```ts
getTabZoomSettings(tabId: number): Promise<chrome.tabs.ZoomSettings>
```

Returns the native zoom settings, including the current zoom mode and scope.

```ts
import {getTabZoomSettings} from "@addon-core/browser";

const settings = await getTabZoomSettings(tabId);
console.log(settings.mode, settings.scope, settings.defaultZoomFactor);
```

<a name="setTabZoomSettings"></a>

### setTabZoomSettings

```ts
setTabZoomSettings(
    tabId: number,
    zoomSettings: chrome.tabs.ZoomSettings
): Promise<void>
```

Updates zoom behavior with the supplied settings. Support and allowed combinations remain controlled
by the browser; the wrapper does not emulate unsupported modes.

```ts
import {setTabZoomSettings} from "@addon-core/browser";

await setTabZoomSettings(tabId, {mode: "automatic", scope: "per-tab"});
```

<a name="captureVisibleTab"></a>

### captureVisibleTab

```ts
captureVisibleTab(
    windowId: number,
    options: chrome.extensionTypes.ImageDetails
): Promise<string>
```

Captures the visible area of the active tab in the specified window and returns an image data URL.
This wrapper requires both arguments; pass `{}` for default image options.

Capture requires `activeTab` access from a user invocation or the `<all_urls>` host permission,
subject to browser/version restrictions. The `tabs` permission alone does not grant capture access.
See [native capture permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab).

```ts
import {captureVisibleTab, onActionClicked} from "@addon-core/browser";

// Background script; manifest includes "activeTab" and an action without a popup.
onActionClicked(async tab => {
    const imageUrl = await captureVisibleTab(tab.windowId, {format: "png"});
    console.log(imageUrl);
});
```

<a name="detectTabLanguage"></a>

### detectTabLanguage

```ts
detectTabLanguage(tabId: number): Promise<string>
```

Returns the detected language code, such as `"en"`, or the native undetermined value `"und"`.
The browser performs detection; this wrapper does not inspect or translate page text.

```ts
import {detectTabLanguage} from "@addon-core/browser";

const language = await detectTabLanguage(tabId);
console.log(language === "und" ? "Language could not be determined" : language);
```

<a name="sendTabMessage"></a>

### sendTabMessage

```ts
sendTabMessage<M = any, R = any>(
    tabId: number,
    message: M,
    options?: chrome.tabs.MessageSendOptions
): Promise<R>
```

Sends a one-time message to content scripts in the target tab and returns the native response.
A receiver must already be installed. Use `frameId` or supported `documentId` options to address a specific context.
Native delivery errors reject.

`M` and `R` describe the request and response at compile time; they do not validate runtime payloads.
Use serializable messages supported by the target browser. See [Runtime messaging](runtime.md) for receiver helpers.

```ts
import {sendTabMessage} from "@addon-core/browser";

type Request = {type: "read-selection"};
type Response = {text: string};

const response = await sendTabMessage<Request, Response>(
    tabId,
    {type: "read-selection"},
    {frameId: 0}
);

console.log(response.text);
```

<a name="connectTab"></a>

### connectTab

```ts
connectTab(
    tabId: number,
    connectInfo?: chrome.tabs.ConnectInfo
): chrome.runtime.Port
```

Returns a native `chrome.runtime.Port` synchronously for a long-lived connection to a content script.
There is no Promise adapter for this method. Handle disconnection and release the port when its owner is disposed.

```ts
import {connectTab} from "@addon-core/browser";

const port = connectTab(tabId, {name: "page-status", frameId: 0});
port.onMessage.addListener(message => {
    console.log("Page status", message);
});
port.onDisconnect.addListener(() => {
    console.log("Page connection closed");
});
port.postMessage({type: "subscribe"});

// Later, when the owning view or controller is disposed:
port.disconnect();
```

<a name="executeScriptTab"></a>

### executeScriptTab [MV2]

```ts
executeScriptTab(
    tabId: number,
    details: chrome.extensionTypes.InjectDetails
): Promise<any[] | undefined>
```

Calls the legacy `tabs.executeScript` API with the supplied injection details.
The result is the native array of frame results, or `undefined` if omitted; native errors reject.
Requires access to the target page. For Manifest V3 use [executeScript()](scripting.md#executeScript).

```ts
import {executeScriptTab} from "@addon-core/browser";

// Manifest V2; scripts/read-page.js is packaged with the extension.
const results = await executeScriptTab(tabId, {file: "scripts/read-page.js"});
console.log(results);
```

<a name="insertCssTab"></a>

### insertCssTab [MV2]

```ts
insertCssTab(
    tabId: number,
    details: chrome.extensionTypes.InjectDetails
): Promise<void>
```

Calls legacy `tabs.insertCSS`. Requires access to the target page.
For Manifest V3 use [insertCss()](scripting.md#insertCss).

```ts
import {insertCssTab} from "@addon-core/browser";

// Manifest V2; the stylesheet is packaged with the extension.
await insertCssTab(tabId, {file: "styles/reader.css"});
```

<a name="removeCssTab"></a>

### removeCssTab [MV2]

```ts
removeCssTab(
    tabId: number,
    details: chrome.extensionTypes.InjectDetails
): Promise<void>
```

Calls legacy `tabs.removeCSS` to remove a matching injection. Use the same stylesheet and relevant
injection options used to insert it. For Manifest V3 use [removeCss()](scripting.md#removeCss).

```ts
import {removeCssTab} from "@addon-core/browser";

// Manifest V2; matches the earlier insertCssTab call.
await removeCssTab(tabId, {file: "styles/reader.css"});
```

## Event reference

All event helpers return `() => void`. Keep that function and call it when the subscription's owner is disposed;
it removes that particular listener. In a background service worker, register long-lived listeners at the top level.
The cleanup calls below illustrate later disposal, not immediate unsubscription after registration.

Callbacks receive native event arguments. They are wrapped by [safeListener()](utils.md#safeListener), which logs
callback failures. Subscription failures, such as a missing event API, are not converted to a no-op listener.

<a name="onTabActivated"></a>

### onTabActivated

```ts
onTabActivated(
    callback: (activeInfo: chrome.tabs.OnActivatedInfo) => void
): () => void
```

Receives the newly active tab ID and its window ID. The tab's URL may not yet be available;
observe [onTabUpdated()](#onTabUpdated) for subsequent changes.

```ts
import {onTabActivated} from "@addon-core/browser";

const unsubscribe = onTabActivated(activeInfo => {
    console.log("Active tab", activeInfo.tabId, "in window", activeInfo.windowId);
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabAttached"></a>

### onTabAttached

```ts
onTabAttached(
    callback: (tabId: number, attachInfo: chrome.tabs.OnAttachedInfo) => void
): () => void
```

Fires when a tab joins another window. `newPosition` is its index in the destination window.

```ts
import {onTabAttached} from "@addon-core/browser";

const unsubscribe = onTabAttached((tabId, attachInfo) => {
    console.log(tabId, "joined window", attachInfo.newWindowId, "at", attachInfo.newPosition);
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabCreated"></a>

### onTabCreated

```ts
onTabCreated(
    callback: (tab: chrome.tabs.Tab) => void
): () => void
```

Receives the newly created tab. Creation does not mean the page has loaded, and URL/title fields may
be absent. Observe [onTabUpdated()](#onTabUpdated) for later changes.

```ts
import {onTabCreated} from "@addon-core/browser";

const unsubscribe = onTabCreated(tab => {
    console.log("Created tab", tab.id, "in window", tab.windowId);
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabDetached"></a>

### onTabDetached

```ts
onTabDetached(
    callback: (tabId: number, detachInfo: chrome.tabs.OnDetachedInfo) => void
): () => void
```

Fires when a tab leaves a window during a move. `oldPosition` is its former index.

```ts
import {onTabDetached} from "@addon-core/browser";

const unsubscribe = onTabDetached((tabId, detachInfo) => {
    console.log(tabId, "left window", detachInfo.oldWindowId, "from", detachInfo.oldPosition);
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabHighlighted"></a>

### onTabHighlighted

```ts
onTabHighlighted(
    callback: (highlightInfo: chrome.tabs.OnHighlightedInfo) => void
): () => void
```

Receives the selected tab IDs for a window. These are IDs, whereas the input to
[highlightTab()](#highlightTab) uses tab-strip indices.

```ts
import {onTabHighlighted} from "@addon-core/browser";

const unsubscribe = onTabHighlighted(highlightInfo => {
    console.log("Selected tabs", highlightInfo.tabIds, "in window", highlightInfo.windowId);
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabMoved"></a>

### onTabMoved

```ts
onTabMoved(
    callback: (tabId: number, moveInfo: chrome.tabs.OnMovedInfo) => void
): () => void
```

Fires for a move within a window, with the previous and next indices.
For a move between windows, use the detached and attached events.

```ts
import {onTabMoved} from "@addon-core/browser";

const unsubscribe = onTabMoved((tabId, moveInfo) => {
    console.log(tabId, "moved from", moveInfo.fromIndex, "to", moveInfo.toIndex);
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabRemoved"></a>

### onTabRemoved

```ts
onTabRemoved(
    callback: (tabId: number, removeInfo: chrome.tabs.OnRemovedInfo) => void
): () => void
```

Reports a closed tab and whether its containing window is also closing.

```ts
import {onTabRemoved} from "@addon-core/browser";

const unsubscribe = onTabRemoved((tabId, removeInfo) => {
    console.log("Closed tab", tabId, {windowClosing: removeInfo.isWindowClosing});
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabReplaced"></a>

### onTabReplaced

```ts
onTabReplaced(
    callback: (addedTabId: number, removedTabId: number) => void
): () => void
```

Reports a tab replacement, for example during prerendering. The added ID comes first, then the removed ID.
Applications tracking tabs by ID can update their references here.

```ts
import {onTabReplaced} from "@addon-core/browser";

const unsubscribe = onTabReplaced((addedTabId, removedTabId) => {
    console.log("Replace tracked tab", removedTabId, "with", addedTabId);
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabUpdated"></a>

### onTabUpdated

```ts
onTabUpdated(
    callback: (
        tabId: number,
        changeInfo: chrome.tabs.OnUpdatedInfo,
        tab: chrome.tabs.Tab
    ) => void
): () => void
```

Receives the tab ID, a patch of changed fields, and the resulting tab object.
Check the fields of interest because the event fires for many kinds of updates. The callback has no native
filter argument in this wrapper. URL/title visibility still depends on permissions.

```ts
import {onTabUpdated} from "@addon-core/browser";

const unsubscribe = onTabUpdated((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        console.log("Finished loading", tabId, tab.url ?? "URL unavailable");
    }
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```

<a name="onTabZoomChange"></a>

### onTabZoomChange

```ts
onTabZoomChange(
    callback: (zoomChangeInfo: chrome.tabs.OnZoomChangeInfo) => void
): () => void
```

Receives the previous and new zoom factors, tab ID, and current zoom settings.

```ts
import {onTabZoomChange} from "@addon-core/browser";

const unsubscribe = onTabZoomChange(zoomChangeInfo => {
    console.log(zoomChangeInfo.tabId, zoomChangeInfo.oldZoomFactor, zoomChangeInfo.newZoomFactor);
});

// Later, when the owning view or controller is disposed:
unsubscribe();
```
