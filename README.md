# @adnbn/browser

A TypeScript promise-based wrapper for Chrome Extension APIs, supporting both Manifest V2 and V3 across Chrome, Opera, Edge, and other Chromium-based browsers.

## Installation

```bash
npm install @adnbn/browser
```

## Supported Chrome APIs

- [action](#action)
- [alarms](#alarms)
- [audio](#audio)
- [browsingData](#browsingdata)
- [commands](#commands)
- [contextMenus](#contextmenus)
- [cookies](#cookies)
- [documentScan](#documentscan)
- [downloads](#downloads)
- [extension](#extension)
- [fileBrowserHandler](#filebrowserhandler)
- [history](#history)
- [i18n](#i18n)
- [idle](#idle)
- [management](#management)
- [notifications](#notifications)
- [offscreen](#offscreen)
- [permissions](#permissions)
- [runtime](#runtime)
- [scripting](#scripting)
- [sidebar](#sidebar)
- [tabCapture](#tabcapture)
- [tabs](#tabs)
- [userScripts](#userscripts)
- [webNavigation](#webnavigation)
- [webRequest](#webrequest)

<a name="action"></a>
## action

**Documentation:** [Chrome Action API](https://developer.chrome.com/docs/extensions/reference/action)

A unified interface to the Chrome `action` API (`chrome.action` in Manifest V3, `chrome.browserAction` in Manifest V2), with Promise-based methods.

### Methods

- [disableAction(tabId)](#disableAction)
- [enableAction(tabId)](#enableAction)
- [getBadgeBgColor(tabId)](#getBadgeBgColor)
- [getBadgeText(tabId)](#getBadgeText)
- [getBadgeTextColor(tabId)](#getBadgeTextColor) [MV3]
- [getActionPopup(tabId)](#getActionPopup)
- [getActionTitle(tabId)](#getActionTitle)
- [getActionUserSetting()](#getActionUserSetting) [MV3]
- [isActionEnabled(tabId)](#isActionEnabled)
- [openActionPopup(windowId)](#openActionPopup) [MV3]
- [setBadgeBgColor(color, tabId)](#setBadgeBgColor)
- [setBadgeText(text, tabId)](#setBadgeText)
- [setBadgeTextColor(color, tabId)](#setBadgeTextColor) [MV3]
- [setActionIcon(details)](#setActionIcon)
- [setActionPopup(popup, tabId)](#setActionPopup)
- [setActionTitle(title, tabId)](#setActionTitle)
- [getDefaultPopup()](#getDefaultPopup)
- [clearBadgeText(tabId)](#clearBadgeText)
- [onActionClicked(callback)](#onActionClicked)
- [onActionUserSettingsChanged(callback)](#onActionUserSettingsChanged) [MV3]

<a name="disableAction"></a>
### disableAction

```
disableAction(tabId: number): Promise<void>
```

Disables the extension action for the specified tab. Falls back to `chrome.browserAction.disable` in Manifest V2.

<a name="enableAction"></a>
### enableAction

```
enableAction(tabId: number): Promise<void>
```

Enables the extension action for the specified tab. Falls back to `chrome.browserAction.enable` in Manifest V2.

<a name="getBadgeBgColor"></a>
### getBadgeBgColor

```
getBadgeBgColor(tabId?: number): Promise<[number, number, number, number]>
```

Retrieves the badge background color for a given tab.

<a name="getBadgeText"></a>
### getBadgeText

```
getBadgeText(tabId?: number): Promise<string>
```

Retrieves the badge text for a given tab.

<a name="getBadgeTextColor"></a>
### getBadgeTextColor [MV3]

```
getBadgeTextColor(tabId?: number): Promise<[number, number, number, number]>
```

Retrieves the badge text color for a given tab (Manifest V3 only).

<a name="getActionPopup"></a>
### getActionPopup

```
getActionPopup(tabId?: number): Promise<string>
```

Retrieves the popup URL set for the action in a given tab.

<a name="getActionTitle"></a>
### getActionTitle

```
getActionTitle(tabId?: number): Promise<string>
```

Retrieves the title set for the action in a given tab.

<a name="getActionUserSetting"></a>
### getActionUserSetting [MV3]

```
getActionUserSetting(): Promise<chrome.action.UserSettings>
```

Retrieves the user settings for the action (Manifest V3 only).

<a name="isActionEnabled"></a>
### isActionEnabled

```
isActionEnabled(tabId: number): Promise<boolean>
```

Checks whether the action is enabled for the specified tab.

<a name="openActionPopup"></a>
### openActionPopup [MV3]

```
openActionPopup(windowId?: number): Promise<void>
```

Programmatically opens the action popup (Manifest V3 only).

<a name="setBadgeBgColor"></a>
### setBadgeBgColor

```
setBadgeBgColor(color: string | [number, number, number, number], tabId?: number): Promise<void>
```

Sets the badge background color for a given tab.

<a name="setBadgeText"></a>
### setBadgeText

```
setBadgeText(text: string | number, tabId?: number): Promise<void>
```

Sets the badge text for a given tab.

<a name="setBadgeTextColor"></a>
### setBadgeTextColor [MV3]

```
setBadgeTextColor(color: string | [number, number, number, number], tabId?: number): Promise<void>
```

Sets the badge text color for a given tab (Manifest V3 only).

<a name="setActionIcon"></a>
### setActionIcon

```
setActionIcon(details: chrome.action.TabIconDetails): Promise<void>
```

Sets the action icon for a tab or globally.

<a name="setActionPopup"></a>
### setActionPopup

```
setActionPopup(popup: string, tabId?: number): Promise<void>
```

Sets the popup URL for the action in a given tab.

<a name="setActionTitle"></a>
### setActionTitle

```
setActionTitle(title: string, tabId?: number): Promise<void>
```

Sets the title for the action in a given tab.

<a name="getDefaultPopup"></a>
### getDefaultPopup

```
getDefaultPopup(): string
```

Returns the default popup URL from the manifest (`action.default_popup` in MV3 or `browser_action.default_popup` in MV2).

<a name="clearBadgeText"></a>
### clearBadgeText

```
clearBadgeText(tabId?: number): Promise<void>
```

Clears the badge text for a given tab.

<a name="onActionClicked"></a>
### onActionClicked

```
onActionClicked(callback: (tab: chrome.tabs.Tab) => void): () => void
```

Adds a listener for the action clicked event.

<a name="onActionUserSettingsChanged"></a>
### onActionUserSettingsChanged [MV3]

```
onActionUserSettingsChanged(callback: (settings: chrome.action.UserSettings) => void): () => void
```

Adds a listener for user settings changes on the action (Manifest V3 only).