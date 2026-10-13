# sidebar

Documentation: [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel),
[Firefox Sidebar Action API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction),
[Opera Sidebar Action API](https://help.opera.com/en/extensions/sidebar-action-api/).

Promise-based methods for configuring an extension's sidebar, controlling its visibility, and changing its
label, icon or badge where the browser supports those operations. Capability checks help callers decide
which features to offer. This module does not export sidebar event subscriptions.

## Methods

- [isAvailableSidebar()](#isAvailableSidebar)
- [canOpenSidebar()](#canOpenSidebar)
- [canCloseSidebar()](#canCloseSidebar)
- [canSetSidebarTitle()](#canSetSidebarTitle)
- [canGetSidebarTitle()](#canGetSidebarTitle)
- [canSetSidebarIcon()](#canSetSidebarIcon)
- [openSidebar(options)](#openSidebar)
- [closeSidebar(options)](#closeSidebar)
- [toggleSidebar()](#toggleSidebar)
- [getSidebarOptions(tabId?)](#getSidebarOptions)
- [setSidebarOptions(options?)](#setSidebarOptions)
- [getSidebarBehavior()](#getSidebarBehavior)
- [setSidebarBehavior(behavior?)](#setSidebarBehavior)
- [setSidebarPath(path, tabId?)](#setSidebarPath)
- [getSidebarPath(tabId?)](#getSidebarPath)
- [getSidebarState(windowId?)](#getSidebarState)
- [isOpenSidebar(windowId?)](#isOpenSidebar)
- [setSidebarTitle(title, tabId?)](#setSidebarTitle)
- [getSidebarTitle(tabId?)](#getSidebarTitle)
- [setSidebarIcon(details)](#setSidebarIcon)
- [setSidebarBadgeText(text, tabId?)](#setSidebarBadgeText)
- [clearSidebarBadgeText(tabId?)](#clearSidebarBadgeText)
- [getSidebarBadgeText(tabId?)](#getSidebarBadgeText)
- [setSidebarBadgeTextColor(color, tabId?)](#setSidebarBadgeTextColor)
- [getSidebarBadgeTextColor(tabId?)](#getSidebarBadgeTextColor)
- [setSidebarBadgeBgColor(color, tabId?)](#setSidebarBadgeBgColor)
- [getSidebarBadgeBgColor(tabId?)](#getSidebarBadgeBgColor)

## Permissions and browser support

For Chromium's Side Panel API, declare the `sidePanel` permission and an initial local page in the MV3 manifest:

```json
{
  "manifest_version": 3,
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidebar.html"
  }
}
```

For Firefox or Opera Sidebar Action, use the `sidebar_action` manifest key:

```json
{
  "sidebar_action": {
    "default_panel": "sidebar.html",
    "default_title": "My sidebar",
    "default_icon": "icons/sidebar.png"
  }
}
```

These are manifest fragments; provide the referenced files and the remaining required manifest fields.
`sidebar_action` does not use the Chromium `sidePanel` permission. See the
[Firefox manifest reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action)
and [Opera's manifest example](https://help.opera.com/en/extensions/sidebar-action-api/).
Call the wrappers from an extension context, such as a background script, service worker, popup or extension page.

| Browser / API | Configuration and visibility | Title, icon and badge |
| --- | --- | --- |
| Chrome / Chromium, MV3 `sidePanel` | Options, behavior, path, open/close and state query; method support varies by version | No title, icon or badge methods |
| Microsoft Edge, MV3 `sidePanel` | Uses the Chromium implementation where exposed | No title, icon or badge methods |
| Firefox desktop `sidebarAction` | Path, open/close, toggle and state query | Title and icon; no sidebar badge methods |
| Opera `opr.sidebarAction`, MV2 | Path; no legacy open/close, toggle or state query | Title; icon is temporarily disabled by the package; badge methods depend on the platform and exposed API |
| Opera, MV3 | Uses `sidePanel` for configuration/visibility when exposed; otherwise legacy Sidebar Action where supported | Title via `opr.sidebarAction`; icon is temporarily disabled by the package |
| Safari / iOS Safari / Firefox for Android | These sidebar APIs are unavailable | Unavailable |

See the compatibility data for [Side Panel](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/sidePanel.json)
and [Sidebar Action](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/sidebarAction.json).
Chrome introduced `sidePanel` in 114, `open` in 116, and `close` in 141. Use method-level checks rather
than treating namespace presence as support for every operation.
[Opera's reference](https://help.opera.com/en/extensions/sidebar-action-api/) marks badge support as unavailable
on macOS; the package's declarations do not guarantee that a method is exposed or functional on every platform.
The [Opera icon limitations](#opera-icon-compatibility) apply specifically to changing the icon.

### API selection and errors

- Options and behavior use `sidePanel` only. Path, open/close and state queries prefer `sidePanel` when present.
- Title, icon, badge and toggle operations use `sidebarAction`: `opr.sidebarAction` takes precedence over
  `browser.sidebarAction`. A selected namespace with a missing method does not trigger a retry on another namespace.

A browser exposing both APIs can therefore use different native namespaces for different operations.

`isAvailableSidebar()` and the `can…` checks are synchronous, uncached and silent. They return `false` when
required API access fails and do not call the operation being checked. They work without a DOM, including in
service workers. A `true` result does not guarantee valid arguments, a required user gesture or a successful call.

Operations return Promises and preserve failures as rejections. Unsupported operations are not silently skipped.
Callback errors through `runtime.lastError`, native Promise rejections and synchronous native errors are passed
back to the caller. Only the state helpers deliberately convert unavailable or failed queries into safe results.

```ts
import {canSetSidebarTitle, setSidebarTitle} from "@addon-core/browser";

if (canSetSidebarTitle()) {
    try {
        await setSidebarTitle("Reading list");
    } catch (error) {
        console.error("Could not update the sidebar title", error);
    }
}
```

## Types

### SidebarError

An exported `Error` subclass used for explicit unsupported-operation checks, including a blocked Opera
icon change. It is not a wrapper around every possible failure: native errors and API access errors remain
ordinary rejections, and some unavailable configuration/path operations use `Error` directly.
Do not assume that every Sidebar failure is an instance of `SidebarError`.

### SidebarState

Exported as both a runtime enum and a TypeScript type:

```ts
enum SidebarState {
    Open = "open",
    Closed = "closed",
    Unknown = "unknown",
}
```

Use `SidebarState.Unknown` when the browser cannot establish the panel's state. It is distinct from a confirmed
closed panel. See [getSidebarState()](#getSidebarState) for the query scope and Chromium limitation.

### Native argument types

Configuration and visibility methods use `chrome.sidePanel.PanelOptions`, `PanelBehavior`, `OpenOptions`
and `CloseOptions`. These types describe arguments; their availability in TypeScript does not establish runtime support.

`setSidebarIcon()` retains the existing global type `opr.sidebarAction.IconDetails` for its Firefox arguments;
the type name does not imply runtime support in Opera:

| Property | Type | Meaning |
| --- | --- | --- |
| `path` | `string \| Record<string, string>` | An image path or a map of sizes to paths |
| `imageData` | `ImageData` | Pixel data supplied instead of a path |
| `tabId` | `number` | Optional tab-specific override; omitted for the global icon |

Supply `path` or `imageData`. The current wrapper type does not expose Firefox's `windowId` option or maps of
`ImageData` objects. Supported Firefox calls receive the original arguments, including all path-map keys,
string paths, pixel data and `tabId`. The browser validates native arguments; the package does not adapt maps.
`IconDetails` is not a separate named export from the package.

Badge setters accept a color string or `chrome.extensionTypes.ColorArray`, an RGBA tuple
`[number, number, number, number]` with channels from 0 to 255. Badge color getters return that tuple.

---

<a name="isAvailableSidebar"></a>

### isAvailableSidebar

```ts
isAvailableSidebar(): boolean
```

Checks for `sidePanel` on the API selected by `browser()`, then for the selected `sidebarAction` namespace.
Returns `false` if no namespace is available or accessing the environment throws. It checks namespace
presence only; use the `can…` functions for the operations they cover.

```ts
import {isAvailableSidebar} from "@addon-core/browser";

const hasSidebarApi = isAvailableSidebar();
```

<a name="canOpenSidebar"></a>

### canOpenSidebar

```ts
canOpenSidebar(): boolean
```

Checks for a callable `sidePanel.open` when Side Panel is present, otherwise for `sidebarAction.open`.
A missing method or access error returns `false`. This does not check user-gesture requirements.

```ts
import {canOpenSidebar} from "@addon-core/browser";

const canShowOpenButton = canOpenSidebar();
```

<a name="canCloseSidebar"></a>

### canCloseSidebar

```ts
canCloseSidebar(): boolean
```

Checks for a callable `sidePanel.close` when Side Panel is present, otherwise for `sidebarAction.close`.
This is independent of `canOpenSidebar()`; a browser can support opening without exposing a close method.

```ts
import {canCloseSidebar} from "@addon-core/browser";

const canShowCloseButton = canCloseSidebar();
```

<a name="canSetSidebarTitle"></a>

### canSetSidebarTitle

```ts
canSetSidebarTitle(): boolean
```

Checks for a callable `setTitle` on the selected `sidebarAction`. Returns `false` for an absent or
non-callable method or an access error. `sidePanel` alone cannot change the title through this helper.

```ts
import {canSetSidebarTitle, setSidebarTitle} from "@addon-core/browser";

if (canSetSidebarTitle()) {
    await setSidebarTitle("My panel");
}
```

<a name="canGetSidebarTitle"></a>

### canGetSidebarTitle

```ts
canGetSidebarTitle(): boolean
```

Checks for a callable `getTitle` on the selected `sidebarAction`. Reading and setting are checked
independently; support for `setTitle` does not establish support for `getTitle`.

```ts
import {canGetSidebarTitle, getSidebarTitle} from "@addon-core/browser";

if (canGetSidebarTitle()) {
    console.log(await getSidebarTitle());
}
```

<a name="canSetSidebarIcon"></a>

### canSetSidebarIcon

```ts
canSetSidebarIcon(): boolean
```

Uses the same compatibility rule as `setSidebarIcon()`: the selected `sidebarAction` must expose a callable
`setIcon`, and it must not be Opera's `opr.sidebarAction`. Opera is temporarily blocked in both MV2 and MV3
because its native handler targets the wrong API. This check does not read the manifest.

Returns `false` for `sidePanel` alone, absent or non-callable methods, API access errors and the temporary
Opera restriction. `true` means support considering known restrictions, not success with arbitrary arguments.
The check does not load an image or make a trial icon change. See the [Opera restriction](#opera-icon-compatibility).

```ts
import {canSetSidebarIcon, setSidebarIcon} from "@addon-core/browser";

if (canSetSidebarIcon()) {
    await setSidebarIcon({path: "/icons/sidebar.png"});
}
```

<a name="openSidebar"></a>

### openSidebar

```ts
openSidebar(options: chrome.sidePanel.OpenOptions): Promise<void>
```

Forwards `options` to `sidePanel.open` when available. Chromium requires at least one of `tabId` or `windowId`.
Without Side Panel, calls Firefox's `sidebarAction.open()` with no arguments: the supplied IDs do not target
another window in that branch. The public wrapper still uses Chromium's options type and requires a target ID.
A missing selected method rejects with `SidebarError`.

Invoke opening directly in a user-action handler. See the
[Chromium requirements](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-open)
and [Firefox active-window behavior](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction/open).
For example, register this in a background context with an action configured without a popup:

```ts
import {canOpenSidebar, onActionClicked, openSidebar} from "@addon-core/browser";

onActionClicked(tab => {
    if (canOpenSidebar()) {
        void openSidebar({windowId: tab.windowId}).catch(error => {
            console.error("Could not open the sidebar", error);
        });
    }
});
```

<a name="closeSidebar"></a>

### closeSidebar

```ts
closeSidebar(options: chrome.sidePanel.CloseOptions): Promise<void>
```

Forwards `options` to `sidePanel.close`; Chromium requires `tabId` or `windowId` to identify the target.
Otherwise calls Firefox's `sidebarAction.close()` without arguments, ignoring the supplied IDs and closing
the extension's sidebar in the active window. A missing selected method rejects with `SidebarError`.
Firefox requires a user-action handler for this call; see its
[close reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction/close).

This alternative action handler closes the panel when the toolbar button is clicked. Configure the action
without a popup and register the handler in a background context:

```ts
import {canCloseSidebar, closeSidebar, onActionClicked} from "@addon-core/browser";

onActionClicked(tab => {
    if (canCloseSidebar()) {
        void closeSidebar({windowId: tab.windowId}).catch(error => console.error("Could not close the sidebar", error));
    }
});
```

The public wrapper requires a target ID even in Firefox, where the native call ignores it.

<a name="toggleSidebar"></a>

### toggleSidebar

```ts
toggleSidebar(): Promise<void>
```

Calls the selected `sidebarAction.toggle()`, supported by Firefox. It does not emulate toggling through
`sidePanel.open` and `sidePanel.close`. Missing support rejects with `SidebarError`.
Firefox toggles the extension's sidebar in the active window and requires a
[user-action handler](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction/toggle).

```ts
import {toggleSidebar} from "@addon-core/browser";

// Firefox extension page with a button whose ID is toggle-sidebar.
document.querySelector<HTMLButtonElement>("#toggle-sidebar")?.addEventListener("click", () => {
    void toggleSidebar().catch(error => console.error("Could not toggle the sidebar", error));
});
```

<a name="getSidebarOptions"></a>

### getSidebarOptions

```ts
getSidebarOptions(tabId?: number): Promise<chrome.sidePanel.PanelOptions>
```

Reads `sidePanel.getOptions({tabId})`. Omit `tabId` for the default configuration or provide it for a tab's
configuration. Returns the native options unchanged, including `path` and `enabled` when supplied by the browser.
This is Side Panel only; missing support and native query failures reject.

```ts
import {getSidebarOptions} from "@addon-core/browser";

const options = await getSidebarOptions(42);
console.log(options.path, options.enabled);
```

<a name="setSidebarOptions"></a>

### setSidebarOptions

```ts
setSidebarOptions(options?: chrome.sidePanel.PanelOptions): Promise<void>
```

Passes the supplied object to `sidePanel.setOptions`. Omitting it sends `{}`; this helper does not implement
a reset operation. Configuration does not open the panel. This is Side Panel only and rejects when unavailable.

```ts
import {setSidebarOptions} from "@addon-core/browser";

await setSidebarOptions({tabId: 42, path: "sidebar.html", enabled: true});
```

<a name="getSidebarBehavior"></a>

### getSidebarBehavior

```ts
getSidebarBehavior(): Promise<chrome.sidePanel.PanelBehavior>
```

Returns the result of `sidePanel.getPanelBehavior()`. This is Side Panel only; it has no Sidebar Action fallback.

```ts
import {getSidebarBehavior} from "@addon-core/browser";

const behavior = await getSidebarBehavior();
console.log(behavior.openPanelOnActionClick);
```

<a name="setSidebarBehavior"></a>

### setSidebarBehavior

```ts
setSidebarBehavior(behavior?: chrome.sidePanel.PanelBehavior): Promise<void>
```

Calls `sidePanel.setPanelBehavior`, for example to let an action click toggle the panel.
Omitting `behavior` sends `{}` without adding defaults or resetting configuration. This is Side Panel only.

```ts
import {setSidebarBehavior} from "@addon-core/browser";

await setSidebarBehavior({openPanelOnActionClick: true});
```

<a name="setSidebarPath"></a>

### setSidebarPath

```ts
setSidebarPath(path: string, tabId?: number): Promise<void>
```

Sets `sidePanel` options `{tabId, path}` when that API is present; otherwise calls
`sidebarAction.setPanel({tabId, panel: path})`. Omit `tabId` to update the default/global panel.
The path is passed unchanged, and the browser decides which URLs it accepts. Chromium requires a local
extension resource. Setting a path does not itself open the panel; unsupported operations and native failures reject.

```ts
import {setSidebarPath} from "@addon-core/browser";

await setSidebarPath("sidebar.html");
await setSidebarPath("sidebar.html?mode=compact#settings", 42);
```

<a name="getSidebarPath"></a>

### getSidebarPath

```ts
getSidebarPath(tabId?: number): Promise<string | undefined>
```

Reads `sidePanel.getOptions()` or the selected `sidebarAction.getPanel()`. Omit `tabId` for the default/global
configuration. Unlike `getSidebarOptions().path`, this helper normalizes the native result:

- This extension's URLs become paths relative to its root, without a leading `/`.
- Query parameters, fragments and URL encoding are preserved.
- External URLs remain absolute, including their scheme and host.
- Empty or absent native paths produce `undefined`.

A failed query rejects; it is not converted to `undefined`. Reading a configured path does not establish visibility.

```ts
import {getSidebarPath, setSidebarPath} from "@addon-core/browser";

await setSidebarPath("sidebar.html?mode=compact#settings", 42);
console.log(await getSidebarPath(42)); // "sidebar.html?mode=compact#settings"
```

<a name="getSidebarState"></a>

### getSidebarState

```ts
getSidebarState(windowId?: number): Promise<SidebarState>
```

Queries `runtime.getContexts({contextTypes: ["SIDE_PANEL"]})` when Side Panel is present; otherwise uses
Firefox's `sidebarAction.isOpen({windowId})`. Without an ID, looks up the last focused browser window on
each call. It checks only that window, which may differ from the calling page's window. An explicit ID,
including `0`, bypasses the focus lookup.

Returns `SidebarState.Open` for a confirmed open panel, `SidebarState.Closed` for a confirmed closed panel,
and `SidebarState.Unknown` when the result cannot be established. Missing APIs, API access errors, failed
window lookups and failed queries produce `Unknown` without rejection, logging or caching.
Opera's legacy Sidebar Action has no state query; an environment with only that API returns `Unknown`.

Chromium reports panel contexts, which are not a complete visibility signal. A matching window context
produces `Open`. If none matches but a side-panel context has `windowId: -1`, the result is `Unknown` because
that context cannot be assigned to a window. Otherwise the result is `Closed`, including an empty context list.
The helper does not maintain its own visibility registry. The unassigned window ID is covered by
[Chromium's native API test](https://chromium.googlesource.com/chromium/src/+/cc748d4034cf809a90bead06f9f9dcabd0dbbaf5/chrome/browser/extensions/api/runtime/runtime_apitest.cc#1165).

```ts
import {getSidebarState, SidebarState} from "@addon-core/browser";

const state = await getSidebarState();

if (state === SidebarState.Open) {
    console.log("An open panel was confirmed");
} else if (state === SidebarState.Closed) {
    console.log("The queried window has no open panel");
} else {
    console.log("The panel state is unknown");
}
```

<a name="isOpenSidebar"></a>

### isOpenSidebar

```ts
isOpenSidebar(windowId?: number): Promise<boolean>
```

Returns `true` only when `getSidebarState(windowId)` returns `SidebarState.Open`. Both `Closed` and `Unknown`
produce `false`; `false` does not necessarily mean the panel is closed. Like the state query, this helper
contains errors and does not reject. Use `getSidebarState()` when the distinction matters.

```ts
import {isOpenSidebar} from "@addon-core/browser";

const confirmedOpen = await isOpenSidebar(7);
```

<a name="setSidebarTitle"></a>

### setSidebarTitle

```ts
setSidebarTitle(title: string | number, tabId?: number): Promise<void>
```

Calls `sidebarAction.setTitle({tabId, title: title.toString()})`; omitting `tabId` changes the global title.
The title labels the browser's sidebar UI, not the sidebar page's HTML document. Firefox uses it in sidebar
UI and Opera describes it as a tooltip. The wrapper awaits Firefox's Promise and handles Opera's synchronous setter.
A missing or non-callable selected method rejects with `SidebarError`; native failures still reject.

```ts
import {canSetSidebarTitle, setSidebarTitle} from "@addon-core/browser";

if (canSetSidebarTitle()) {
    await setSidebarTitle("Reading list", 42);
}
```

<a name="getSidebarTitle"></a>

### getSidebarTitle

```ts
getSidebarTitle(tabId?: number): Promise<string>
```

Reads the selected `sidebarAction.getTitle({tabId})`, awaiting Firefox's Promise or Opera's callback.
Omit `tabId` for the global title. Missing or non-callable support rejects with `SidebarError`;
access errors, callback errors and native Promise rejections also reject.

```ts
import {canGetSidebarTitle, getSidebarTitle} from "@addon-core/browser";

if (canGetSidebarTitle()) {
    console.log(await getSidebarTitle(42));
}
```

<a name="setSidebarIcon"></a>

### setSidebarIcon

```ts
setSidebarIcon(details: opr.sidebarAction.IconDetails): Promise<void>
```

Changes the selected Sidebar Action icon in Firefox. Uses the same compatibility rule as `canSetSidebarIcon()`:
missing or non-callable support, or Opera in either MV2 or MV3, rejects with `SidebarError` before any native
icon call. API access errors retain their original rejection. Opera's namespace keeps priority when both
namespaces exist; the wrapper does not retry through Firefox or the Action API.

Firefox receives `details` unchanged, including all path-map keys, string paths, `imageData` and `tabId: 0`.
Neither `details` nor its path map is modified. The package does not convert sizes, load or resize images.
It waits for Firefox's Promise and propagates native rejections and synchronous argument errors. A successful
capability check does not validate an image or guarantee that a particular call succeeds.
See the [argument types](#native-argument-types) and [Opera limitations](#opera-icon-compatibility).

```ts
import {canSetSidebarIcon, setSidebarIcon} from "@addon-core/browser";

if (canSetSidebarIcon()) {
    await setSidebarIcon({path: "/icons/sidebar.png"});
    await setSidebarIcon({path: "/icons/sidebar-active.png", tabId: 42});

    await setSidebarIcon({
        path: {24: "/small.png", 40: "/medium.png", 64: "/large.png"},
        tabId: 42,
    });
    // Firefox receives the original map with all three sizes. Opera skips this block.
}
```

<a name="setSidebarBadgeText"></a>

### setSidebarBadgeText

```ts
setSidebarBadgeText(text: string | number, tabId?: number): Promise<void>
```

Calls the selected Sidebar Action's `setBadgeText` with the text converted to a string. This is an Opera
operation where the method is exposed; it has no Side Panel or Firefox equivalent. Omit `tabId` for the
global badge. Missing support rejects with `SidebarError`.

```ts
import {setSidebarBadgeText} from "@addon-core/browser";

// Opera with badge support.
await setSidebarBadgeText(3, 42);
```

<a name="clearSidebarBadgeText"></a>

### clearSidebarBadgeText

```ts
clearSidebarBadgeText(tabId?: number): Promise<void>
```

Calls `setSidebarBadgeText("", tabId)` and preserves its errors. Clearing does not reset badge colors.

```ts
import {clearSidebarBadgeText} from "@addon-core/browser";

// Opera with badge support.
await clearSidebarBadgeText(42);
```

<a name="getSidebarBadgeText"></a>

### getSidebarBadgeText

```ts
getSidebarBadgeText(tabId?: number): Promise<string>
```

Reads the selected Sidebar Action's `getBadgeText` through its callback. Omit `tabId` for the global badge.
A native empty string is returned unchanged; an unavailable method or failed read rejects.

```ts
import {getSidebarBadgeText} from "@addon-core/browser";

// Opera with badge support.
console.log(await getSidebarBadgeText(42));
```

<a name="setSidebarBadgeTextColor"></a>

### setSidebarBadgeTextColor

```ts
setSidebarBadgeTextColor(color: string | chrome.extensionTypes.ColorArray, tabId?: number): Promise<void>
```

Forwards `{tabId, color}` to the selected Sidebar Action's `setBadgeTextColor`, without color conversion.
This requires an implementation exposing that Opera-specific method; the general badge API does not
establish support for text-color methods. Missing support rejects with `SidebarError`.

```ts
import {setSidebarBadgeTextColor} from "@addon-core/browser";

// Opera with setBadgeTextColor support.
await setSidebarBadgeTextColor([255, 255, 255, 255], 42);
```

<a name="getSidebarBadgeTextColor"></a>

### getSidebarBadgeTextColor

```ts
getSidebarBadgeTextColor(tabId?: number): Promise<chrome.extensionTypes.ColorArray>
```

Reads the selected Sidebar Action's `getBadgeTextColor` through its callback and returns the native RGBA tuple.
Omitting `tabId` queries the global setting. Unavailable support and native failures reject.

```ts
import {getSidebarBadgeTextColor} from "@addon-core/browser";

// Opera with getBadgeTextColor support.
const [red, green, blue, alpha] = await getSidebarBadgeTextColor(42);
console.log(red, green, blue, alpha);
```

<a name="setSidebarBadgeBgColor"></a>

### setSidebarBadgeBgColor

```ts
setSidebarBadgeBgColor(color: string | chrome.extensionTypes.ColorArray, tabId?: number): Promise<void>
```

Forwards `{tabId, color}` to the selected Sidebar Action's `setBadgeBackgroundColor`. Omit `tabId` for the
global setting. The wrapper does not normalize colors or provide a fallback when the method is unavailable.

```ts
import {setSidebarBadgeBgColor} from "@addon-core/browser";

// Opera with badge background-color support.
await setSidebarBadgeBgColor("#2463eb", 42);
```

<a name="getSidebarBadgeBgColor"></a>

### getSidebarBadgeBgColor

```ts
getSidebarBadgeBgColor(tabId?: number): Promise<chrome.extensionTypes.ColorArray>
```

Reads the selected Sidebar Action's `getBadgeBackgroundColor` through its callback. Returns an RGBA tuple
rather than a CSS string, and rejects unavailable support or native errors.

```ts
import {getSidebarBadgeBgColor} from "@addon-core/browser";

// Opera with badge background-color support.
const background = await getSidebarBadgeBgColor(42);
console.log(background);
```

## Opera icon compatibility

The package temporarily disables `setSidebarIcon()` for **Opera in both Manifest V2 and Manifest V3**, even
when native `setIcon` exists. `canSetSidebarIcon()` returns `false`; a direct setter call rejects with
`SidebarError` without invoking Opera's method. Title, path and other Sidebar operations keep their existing
behavior. Use `sidebar_action.default_icon` in the manifest for Opera's initial Sidebar icon.

In **Opera 135.0.5973.92 on macOS**, the native Sidebar Action handler sends the request to the old
`browserAction.setIcon`, with different failures in each manifest version:

- **MV2:** calls can complete successfully while changing the toolbar's Browser Action icon instead of
  the Sidebar icon. Visual checks with both `sidebar_action` and `browser_action` declared reproduced this
  for global and tab-specific calls. A direct native call with valid arguments reproduced the same result
  without the wrapper.
- **MV3:** the old API is unavailable, so correct native calls fail with `Access to extension API denied.`

Changing path-map keys cannot correct this routing defect, so the package does not adapt Opera icon maps.
The block also avoids Opera's lost callback on native image loading or decoding failures. No timeout,
custom image loader, Action API fallback or silent success is used.

This is a temporary package compatibility restriction, independent of the manifest or browser version.
Revisit it only after a browser fix is confirmed by both successful API completion and visual updates of
the actual Sidebar icon, globally and for a specific tab.

## Compatibility notes

Earlier Chromium `isOpenSidebar()` calls without a window ID checked all windows. The helper now checks
the last focused window and returns `false` for unavailable or failed queries. Use `getSidebarState()` to
retain the distinction between closed and unknown.

Earlier Firefox/Opera `getSidebarPath()` results had a leading `/` and omitted query parameters and fragments.
The current helper preserves those URL components and returns local paths relative to the extension root.

## Verification scope

Jest tests exercise capability checks, namespace priority, unchanged Firefox arguments and failure handling
against controlled API models. Opera MV2/MV3 tests assert rejection without native icon calls or manifest
reads, while title/path tests guard against regressions. Package-consumer checks verify public types and ESM/CJS exports.
[Browser scenarios](../tests/browser/api/sidebar/) run the built package in Firefox and Chromium; they cover
icon/title contracts and unsupported Side Panel operations. Separate native checks in Opera 137.0.6036.39
on macOS confirmed the package's rejection of icon changes in MV2 and MV3, including a service worker without
a DOM, while title and path operations still completed. These checks verify the package's block, not whether
Opera has fixed its native handler. The earlier native Opera investigation and visual verification are the
basis for the compatibility restriction above; successful native callbacks alone did not establish correct
Sidebar icon updates.
These checks do not establish support for every historical browser version or prove that all badge methods
work on every Opera platform.
