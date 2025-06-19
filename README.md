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

<a name="alarms"></a>
## alarms

**Documentation:** [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms)

A promise-based wrapper for the Chrome `alarms` API.

### Methods

- [clearAlarm(name)](#clearAlarm)
- [clearAllAlarm()](#clearAllAlarm)
- [createAlarm(name, info)](#createAlarm)
- [getAlarm(name)](#getAlarm)
- [getAllAlarm()](#getAllAlarm)
- [onAlarm(callback)](#onAlarm)

<a name="clearAlarm"></a>
### clearAlarm

```
clearAlarm(name: string): Promise<boolean>
```

Clears the alarm with the specified name, returning true if an existing alarm was found and cleared.

<a name="clearAllAlarm"></a>
### clearAllAlarm

```
clearAllAlarm(): Promise<boolean>
```

Clears all alarms, returning true if any alarms were found and cleared.

<a name="createAlarm"></a>
### createAlarm

```
createAlarm(name: string, info: chrome.alarms.AlarmCreateInfo): Promise<void>
```

Creates a new alarm or updates an existing one with the given name and scheduling options.

<a name="getAlarm"></a>
### getAlarm

```
getAlarm(name: string): Promise<chrome.alarms.Alarm>
```

Retrieves details for the alarm with the specified name.

<a name="getAllAlarm"></a>
### getAllAlarm

```
getAllAlarm(): Promise<chrome.alarms.Alarm[]>
```

Retrieves all set alarms.

<a name="onAlarm"></a>
### onAlarm

```
onAlarm(callback: (alarm: chrome.alarms.Alarm) => void): () => void
```

Adds a listener that triggers when an alarm goes off.

<a name="audio"></a>
## audio

**Documentation:** [Chrome Audio API](https://developer.chrome.com/docs/extensions/reference/audio)

A promise-based wrapper for the Chrome `audio` API.

### Methods

- [getAudioDevices(filter)](#getAudioDevices)
- [getAudioMute(streamType)](#getAudioMute)
- [setAudioActiveDevices(ids)](#setAudioActiveDevices)
- [setAudioMute(streamType, isMuted)](#setAudioMute)
- [setAudioProperties(id, properties)](#setAudioProperties)
- [onAudioDeviceListChanged(callback)](#onAudioDeviceListChanged)
- [onAudioLevelChanged(callback)](#onAudioLevelChanged)
- [onAudioMuteChanged(callback)](#onAudioMuteChanged)

<a name="getAudioDevices"></a>
### getAudioDevices

```
getAudioDevices(filter?: chrome.audio.DeviceFilter): Promise<chrome.audio.AudioDeviceInfo[]>
```

Retrieves the list of available audio devices, optionally filtered.

<a name="getAudioMute"></a>
### getAudioMute

```
getAudioMute(streamType: chrome.audio.StreamType): Promise<boolean>
```

Retrieves the mute state of the specified audio stream.

<a name="setAudioActiveDevices"></a>
### setAudioActiveDevices

```
setAudioActiveDevices(ids?: chrome.audio.DeviceIdLists): Promise<void>
```

Sets the list of active audio devices.

<a name="setAudioMute"></a>
### setAudioMute

```
setAudioMute(streamType: chrome.audio.StreamType, isMuted: boolean): Promise<void>
```

Sets the mute state for the specified audio stream.

<a name="setAudioProperties"></a>
### setAudioProperties

```
setAudioProperties(id: string, properties?: chrome.audio.DeviceProperties): Promise<void>
```

Updates properties for the specified audio device.

<a name="onAudioDeviceListChanged"></a>
### onAudioDeviceListChanged

```
onAudioDeviceListChanged(callback: () => void): () => void
```

Adds a listener for changes in the list of audio devices.

<a name="onAudioLevelChanged"></a>
### onAudioLevelChanged

```
onAudioLevelChanged(callback: (level: number) => void): () => void
```

Adds a listener for changes in audio level.

<a name="onAudioMuteChanged"></a>
### onAudioMuteChanged

```
onAudioMuteChanged(callback: (isMuted: boolean) => void): () => void
```

Adds a listener for changes in audio mute state.

<a name="browsingData"></a>
## browsingData

**Documentation:** [Chrome Browsing Data API](https://developer.chrome.com/docs/extensions/reference/browsingData)

A promise-based wrapper for the Chrome `browsingData` API.

### Methods

- [removeBrowsingData(options, dataToRemove)](#removeBrowsingData)
- [removeAppcacheData(options)](#removeAppcacheData)
- [removeCacheData(options)](#removeCacheData)
- [removeCacheStorageData(options)](#removeCacheStorageData)
- [removeCookiesData(options)](#removeCookiesData)
- [removeDownloadsData(options)](#removeDownloadsData)
- [removeFileSystemsData(options)](#removeFileSystemsData)
- [removeFormData(options)](#removeFormData)
- [removeHistoryData(options)](#removeHistoryData)
- [removeIndexedDBData(options)](#removeIndexedDBData)
- [removeLocalStorageData(options)](#removeLocalStorageData)
- [removePasswordsData(options)](#removePasswordsData)
- [removeServiceWorkersData(options)](#removeServiceWorkersData)
- [removeWebSQLData(options)](#removeWebSQLData)
- [getBrowsingDataSettings()](#getBrowsingDataSettings)

<a name="removeBrowsingData"></a>
### removeBrowsingData

```
removeBrowsingData(options: chrome.browsingData.RemovalOptions, dataToRemove: chrome.browsingData.DataTypeSet): Promise<void>
```

Clears the specified types of browsing data within the given time range.

<a name="removeAppcacheData"></a>
### removeAppcacheData

```
removeAppcacheData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears the application cache.

<a name="removeCacheData"></a>
### removeCacheData

```
removeCacheData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears the browser cache.

<a name="removeCacheStorageData"></a>
### removeCacheStorageData

```
removeCacheStorageData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears Cache Storage.

<a name="removeCookiesData"></a>
### removeCookiesData

```
removeCookiesData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears all cookies.

<a name="removeDownloadsData"></a>
### removeDownloadsData

```
removeDownloadsData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears download history.

<a name="removeFileSystemsData"></a>
### removeFileSystemsData

```
removeFileSystemsData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears file system data.

<a name="removeFormData"></a>
### removeFormData

```
removeFormData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears data entered into forms.

<a name="removeHistoryData"></a>
### removeHistoryData

```
removeHistoryData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears browsing history.

<a name="removeIndexedDBData"></a>
### removeIndexedDBData

```
removeIndexedDBData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears IndexedDB data.

<a name="removeLocalStorageData"></a>
### removeLocalStorageData

```
removeLocalStorageData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears Local Storage data.

<a name="removePasswordsData"></a>
### removePasswordsData

```
removePasswordsData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears saved passwords.

<a name="removeServiceWorkersData"></a>
### removeServiceWorkersData

```
removeServiceWorkersData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears Service Worker registrations.

<a name="removeWebSQLData"></a>
### removeWebSQLData

```
removeWebSQLData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears WebSQL data.

<a name="getBrowsingDataSettings"></a>
### getBrowsingDataSettings

```
getBrowsingDataSettings(): Promise<chrome.browsingData.SettingsResult>
```

Retrieves the current browsing data removal settings.

<a name="commands"></a>
## commands

**Documentation:** [Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/commands)

A promise-based wrapper for the Chrome `commands` API.

### Methods

- [getAllCommands()](#getAllCommands)
- [onCommand(callback)](#onCommand)

<a name="getAllCommands"></a>
### getAllCommands

```
getAllCommands(): Promise<chrome.commands.Command[]>
```

Retrieves all registered extension commands.

<a name="onCommand"></a>
### onCommand

```
onCommand(callback: (command: string) => void): () => void
```

Adds a listener for extension command events.

<a name="contextMenus"></a>
## contextMenus

**Documentation:** [Chrome Context Menus API](https://developer.chrome.com/docs/extensions/reference/contextMenus)

A promise-based wrapper for the Chrome `contextMenus` API.

### Methods

- [createContextMenus(createProperties)](#createContextMenus)
- [removeContextMenus(menuItemId)](#removeContextMenus)
- [removeAllContextMenus()](#removeAllContextMenus)
- [updateContextMenus(id, updateProperties)](#updateContextMenus)
- [onContextMenusClicked(callback)](#onContextMenusClicked)

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
updateContextMenus(id: string | number, updateProperties?: Omit<chrome.contextMenus.CreateProperties, 'id'>): Promise<void>
```

Updates the specified context menu item with new properties.

<a name="onContextMenusClicked"></a>
### onContextMenusClicked

```
onContextMenusClicked(callback: (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => void): () => void
```

Adds a listener that triggers when a context menu item is clicked.

<a name="cookies"></a>
## cookies

**Documentation:** [Chrome Cookies API](https://developer.chrome.com/docs/extensions/reference/cookies)

A promise-based wrapper for the Chrome `cookies` API.

### Methods

- [getCookie(details)](#getCookie)
- [getAllCookie(details)](#getAllCookie)
- [getAllCookieStores()](#getAllCookieStores)
- [getCookiePartitionKey(details)](#getCookiePartitionKey)
- [removeCookie(details)](#removeCookie)
- [setCookie(details)](#setCookie)
- [onCookieChanged(callback)](#onCookieChanged)

<a name="getCookie"></a>
### getCookie

```
getCookie(details: chrome.cookies.CookieDetails): Promise<chrome.cookies.Cookie | null>
```

Retrieves the cookie matching the specified details, or `null` if not found.

<a name="getAllCookie"></a>
### getAllCookie

```
getAllCookie(details?: chrome.cookies.GetAllDetails): Promise<chrome.cookies.Cookie[]>
```

Retrieves all cookies that match the given filter details.

<a name="getAllCookieStores"></a>
### getAllCookieStores

```
getAllCookieStores(): Promise<chrome.cookies.CookieStore[]>
```

Retrieves all cookie stores accessible to the extension.

<a name="getCookiePartitionKey"></a>
### getCookiePartitionKey [MV3]

```
getCookiePartitionKey(details: chrome.cookies.FrameDetails): Promise<chrome.cookies.CookiePartitionKey>
```

Retrieves the partition key for the cookie associated with the given frame (Manifest V3 only).

<a name="removeCookie"></a>
### removeCookie

```
removeCookie(details: chrome.cookies.CookieDetails): Promise<chrome.cookies.CookieDetails>
```

Removes the cookie matching the specified details, returning the details of the removed cookie.

<a name="setCookie"></a>
### setCookie

```
setCookie(details: chrome.cookies.SetDetails): Promise<chrome.cookies.Cookie | null>
```

Sets a cookie with the given details, returning the created cookie or `null` on failure.

<a name="onCookieChanged"></a>
### onCookieChanged

```
onCookieChanged(callback: (changeInfo: chrome.cookies.CookieChangeInfo) => void): () => void
```

Adds a listener that triggers when a cookie change event occurs.