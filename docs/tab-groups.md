# tabGroups

Documentation: [Chrome Tab Groups API](https://developer.chrome.com/docs/extensions/reference/api/tabGroups),
[Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups).

Promise-based methods for reading, updating and moving groups of browser tabs, plus event subscriptions
that return an unsubscribe function. Groups have a title, color and collapsed state. Native results,
errors and browser-specific event payloads are preserved.

## Methods

- [isAvailableTabGroups()](#isAvailableTabGroups)
- [getTabGroup()](#getTabGroup)
- [queryTabGroups()](#queryTabGroups)
- [updateTabGroup()](#updateTabGroup)
- [moveTabGroup()](#moveTabGroup)

## Events

- [onTabGroupCreated()](#onTabGroupCreated)
- [onTabGroupUpdated()](#onTabGroupUpdated)
- [onTabGroupMoved()](#onTabGroupMoved)
- [onTabGroupRemoved()](#onTabGroupRemoved)

## Permissions and browser support

Declare the permission in the extension manifest:

```json
{
  "permissions": ["tabGroups"]
}
```

Use the API from an extension context such as a background script, popup or extension page.

| Browser | Support |
| --- | --- |
| Chrome / Chromium | Chrome 89+, Manifest V3 |
| Microsoft Edge / Opera desktop | Chromium Tab Groups API |
| Firefox desktop | Firefox 139+ |
| Safari / iOS Safari | Not supported |

See [MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/tabGroups.json).
`isAvailableTabGroups()` checks namespace availability in the current context, not whether a particular
operation will succeed. Methods and subscriptions retain native failures when the API is unavailable.

## Types and native behavior

Method options reuse `chrome.tabGroups.QueryInfo`, `UpdateProperties` and `MoveProperties` from
`@types/chrome`. The package exports these portable result and event types:

```ts
interface TabGroup extends Omit<chrome.tabGroups.TabGroup, "shared"> {
    shared?: boolean;
}

interface TabGroupRemoveInfo {
    isWindowClosing: boolean;
}
```

`TabGroup` has `id`, `windowId`, `color`, `collapsed`, optional `title`, and optional `shared`.
Chrome added `shared` in version 137; Firefox does not supply it. The wrapper does not add missing fields.
The `shared` query filter is Chromium-specific; forwarding it does not add shared-group support to Firefox.

Group IDs are numeric and should not be treated as persistent identifiers across browser restarts.
The special ID `-1` means a tab is ungrouped, not an existing group. There is no native
`tabGroups.create` or `tabGroups.remove`: use the existing [Tabs methods](tabs.md) to manage membership:

```ts
import {groupTabs, queryTabs, ungroupTab, updateTabGroup} from "@addon-core/browser";

const groupId = await groupTabs({
    tabIds: [firstTabId, secondTabId],
    createProperties: {windowId},
});
await updateTabGroup(groupId, {title: "Work", color: "blue"});
const members = await queryTabs({groupId});

// Keep the tabs open but remove them from their group.
await ungroupTab([firstTabId, secondTabId]);
```

`createProperties.windowId` selects the new group's window; when omitted, the browser uses its current
window and may move the supplied tabs there. Removing the last tab from a group removes the group. Closing all its tabs also removes it.
All methods preserve native errors, including errors for missing group IDs.

---

<a name="isAvailableTabGroups"></a>

### isAvailableTabGroups

```ts
isAvailableTabGroups(): boolean
```

Checks the API selected by `browser()` on every call. Returns `false` when the namespace or extension
environment is missing, or access throws. It does not log or guarantee that a later operation succeeds.

```ts
import {isAvailableTabGroups, queryTabGroups} from "@addon-core/browser";

if (isAvailableTabGroups()) {
    const groups = await queryTabGroups();
    console.log(groups);
}
```

<a name="getTabGroup"></a>

### getTabGroup

```ts
getTabGroup(groupId: number): Promise<TabGroup>
```

Returns the native group data. A missing group rejects rather than returning an empty object.

```ts
import {getTabGroup} from "@addon-core/browser";

const group = await getTabGroup(groupId);
console.log(group.title, group.color, group.collapsed);
```

<a name="queryTabGroups"></a>

### queryTabGroups

```ts
queryTabGroups(queryInfo?: chrome.tabGroups.QueryInfo): Promise<TabGroup[]>
```

Omitting the argument passes an empty filter and returns all groups accessible to the extension.
Native filters include `windowId`, `title`, `color`, `collapsed` and Chromium's `shared`.
No matches returns an empty array; a native failure rejects.

```ts
import {queryTabGroups} from "@addon-core/browser";

const allGroups = await queryTabGroups();
const workGroups = await queryTabGroups({windowId, title: "Work", color: "blue"});
```

<a name="updateTabGroup"></a>

### updateTabGroup

```ts
updateTabGroup(
    groupId: number,
    properties: chrome.tabGroups.UpdateProperties
): Promise<TabGroup | undefined>
```

Changes `title`, `color` or `collapsed`; omitted properties remain unchanged. The native Chrome
signature permits an omitted result, so the wrapper preserves `undefined` without an additional read.
In Firefox a collapsed group can keep its active tab visible. Chrome collapses the whole group and
activates a tab outside it. See [Firefox group state](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups/TabGroup).

```ts
import {updateTabGroup} from "@addon-core/browser";

await updateTabGroup(groupId, {title: "Research", color: "green", collapsed: true});
```

<a name="moveTabGroup"></a>

### moveTabGroup

```ts
moveTabGroup(
    groupId: number,
    properties: chrome.tabGroups.MoveProperties
): Promise<TabGroup | undefined>
```

Moves a group and its tabs. `index` is the destination position of its first tab; `-1` moves it to the end.
An optional `windowId` selects another normal browser window. Browser restrictions, such as moving into
another group or before pinned tabs, retain their native errors. As with update, `undefined` is preserved.

```ts
import {moveTabGroup} from "@addon-core/browser";

await moveTabGroup(groupId, {index: -1});
await moveTabGroup(groupId, {windowId: destinationWindowId, index: 0});
```

<a name="onTabGroupCreated"></a>

### onTabGroupCreated

```ts
onTabGroupCreated(callback: (group: TabGroup) => void): () => void
```

Subscribes to group creation. Chromium also emits creation in the destination window when a group
moves between windows.

```ts
import {onTabGroupCreated} from "@addon-core/browser";

const unsubscribe = onTabGroupCreated(group => {
    console.log("Created", group.id, group.windowId);
});

unsubscribe();
```

<a name="onTabGroupUpdated"></a>

### onTabGroupUpdated

```ts
onTabGroupUpdated(callback: (group: TabGroup) => void): () => void
```

Receives the updated group object, rather than a patch containing only changed fields.

```ts
import {onTabGroupUpdated} from "@addon-core/browser";

const unsubscribe = onTabGroupUpdated(group => {
    console.log(group.title, group.color, group.collapsed);
});

unsubscribe();
```

<a name="onTabGroupMoved"></a>

### onTabGroupMoved

```ts
onTabGroupMoved(callback: (group: TabGroup) => void): () => void
```

Both browsers report moves inside a window. Firefox also reports cross-window moves through this event;
Chromium emits removal from the old window and creation in the new window instead. The wrapper does
not synthesize or merge events. The payload has `windowId` but no tab-strip index; query the group's tabs
when that position is needed. See [native move events](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups/onMoved).

```ts
import {onTabGroupMoved, queryTabs} from "@addon-core/browser";

const unsubscribe = onTabGroupMoved(async group => {
    const tabs = await queryTabs({groupId: group.id});
    console.log(group.windowId, tabs[0]?.index);
});

unsubscribe();
```

<a name="onTabGroupRemoved"></a>

### onTabGroupRemoved

```ts
onTabGroupRemoved(
    callback: (group: TabGroup, removeInfo?: TabGroupRemoveInfo) => void
): () => void
```

Fires when a group closes or loses its last tab. Chromium also emits it for a transfer out of a window.
Firefox supplies a second argument with `isWindowClosing`; Chromium supplies only the group.
Missing removal information is not replaced with a fabricated `false` value.
See [Firefox removal details](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups/onRemoved).

```ts
import {onTabGroupRemoved} from "@addon-core/browser";

const unsubscribe = onTabGroupRemoved((group, removeInfo) => {
    console.log("Removed", group.id);

    if (removeInfo?.isWindowClosing) {
        console.log("The containing window is closing");
    }
});

unsubscribe();
```
