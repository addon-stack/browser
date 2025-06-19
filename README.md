# @adnbn/browser

[![npm version](https://img.shields.io/npm/v/@adnbn/browser.svg)](https://www.npmjs.com/package/@adnbn/browser)
[![npm downloads](https://img.shields.io/npm/dm/@adnbn/browser.svg)](https://www.npmjs.com/package/@adnbn/browser)

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

### Events

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

### Events

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

### Events

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

### Events

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

### Events

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

### Events

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

<a name="documentscan"></a>

## documentscan

**Documentation:** [Chrome Document Scan API](https://developer.chrome.com/docs/extensions/reference/documentScan)

A promise-based wrapper for the Chrome `documentScan` API.

### Methods

- [cancelDocScanning](#cancelDocScanning)
- [closeDocScanner](#closeDocScanner)
- [getDocScannerOptionGroups](#getDocScannerOptionGroups)
- [getDocScannerList](#getDocScannerList)
- [openDocScanner](#openDocScanner)
- [readDocScanningData](#readDocScanningData)
- [docScanning](#docScanning)
- [setDocScannerOptions](#setDocScannerOptions)
- [startDocScanning](#startDocScanning)

<a name="cancelDocScanning"></a>

### cancelDocScanning

```
cancelDocScanning(job: string): Promise<chrome.documentScan.CancelScanResponse<string>>
```

Cancels an ongoing document scan job.

<a name="closeDocScanner"></a>

### closeDocScanner

```
closeDocScanner(scannerHandle: string): Promise<chrome.documentScan.CloseScannerResponse<string>>
```

Closes the document scanner associated with the specified scanner handle.

<a name="getDocScannerOptionGroups"></a>

### getDocScannerOptionGroups

```
getDocScannerOptionGroups(scannerHandle: string): Promise<chrome.documentScan.GetOptionGroupsResponse<string>>
```

Retrieves the available option groups for the specified document scanner.

<a name="getDocScannerList"></a>

### getDocScannerList

```
getDocScannerList(filter: chrome.documentScan.DeviceFilter): Promise<chrome.documentScan.GetScannerListResponse>
```

Fetches a list of document scanners matching the given filter criteria.

<a name="openDocScanner"></a>

### openDocScanner

```
openDocScanner(scannerId: string): Promise<chrome.documentScan.OpenScannerResponse<string>>
```

Opens a document scanner by its ID, returning a handle for further operations.

<a name="readDocScanningData"></a>

### readDocScanningData

```
readDocScanningData(job: string): Promise<chrome.documentScan.ReadScanDataResponse<string>>
```

Reads a chunk of data from an ongoing scan job.

<a name="docScanning"></a>

### docScanning

```
docScanning(options: chrome.documentScan.ScanOptions): Promise<chrome.documentScan.ScanResults>
```

Performs a document scan with the specified options and returns the scan results.

<a name="setDocScannerOptions"></a>

### setDocScannerOptions

```
setDocScannerOptions(scannerHandle: string, options: chrome.documentScan.OptionSetting[]): Promise<chrome.documentScan.SetOptionsResponse<string>>
```

Sets the scanner options for the given scanner handle.

<a name="startDocScanning"></a>

### startDocScanning

```
startDocScanning(scannerHandle: string, options: chrome.documentScan.StartScanOptions): Promise<chrome.documentScan.StartScanResponse<string>>
```

Starts a scan operation on an open scanner with the provided settings.

<a name="downloads"></a>

## downloads

**Documentation:** [Chrome Downloads API](https://developer.chrome.com/docs/extensions/reference/downloads)

A promise-based wrapper for the Chrome `downloads` API.

### Methods

- [acceptDownloadDanger](#acceptDownloadDanger)
- [cancelDownload](#cancelDownload)
- [download](#download)
- [eraseDownload](#eraseDownload)
- [getDownloadFileIcon](#getDownloadFileIcon)
- [openDownload](#openDownload)
- [pauseDownload](#pauseDownload)
- [removeDownloadFile](#removeDownloadFile)
- [resumeDownload](#resumeDownload)
- [searchDownloads](#searchDownloads)
- [setDownloadsUiOptions](#setDownloadsUiOptions)
- [showDownloadFolder](#showDownloadFolder)
- [showDownload](#showDownload)
- [findDownload](#findDownload)
- [isDownloadExists](#isDownloadExists)
- [getDownloadState](#getDownloadState)

### Events

- [onDownloadsChanged](#onDownloadsChanged)
- [onDownloadsCreated](#onDownloadsCreated)
- [onDownloadsDeterminingFilename](#onDownloadsDeterminingFilename)

<a name="acceptDownloadDanger"></a>

### acceptDownloadDanger

```
acceptDownloadDanger(downloadId: number): Promise<void>
```

Accepts a dangerous download, allowing it to proceed.

<a name="cancelDownload"></a>

### cancelDownload

```
cancelDownload(downloadId: number): Promise<void>
```

Cancels the specified download.

<a name="download"></a>

### download

```
download(options: chrome.downloads.DownloadOptions): Promise<number>
```

Initiates a download with the given options, resolving to the download ID. This function automatically uniquifies filenames on conflict and verifies the download's completion, throwing a `BlockDownloadError` if the download is interrupted or requires additional permissions.

<a name="eraseDownload"></a>

### eraseDownload

```
eraseDownload(query: chrome.downloads.DownloadQuery): Promise<number[]>
```

Removes the download history entries that match the given query, returning the list of erased download IDs.

<a name="getDownloadFileIcon"></a>

### getDownloadFileIcon

```
getDownloadFileIcon(downloadId: number, options: chrome.downloads.GetFileIconOptions): Promise<string>
```

Retrieves the icon for the downloaded file.

<a name="openDownload"></a>

### openDownload

```
openDownload(downloadId: number): void
```

Opens the downloaded file.

<a name="pauseDownload"></a>

### pauseDownload

```
pauseDownload(downloadId: number): Promise<void>
```

Pauses an active download.

<a name="removeDownloadFile"></a>

### removeDownloadFile

```
removeDownloadFile(downloadId: number): Promise<void>
```

Deletes the downloaded file from the local disk.

<a name="resumeDownload"></a>

### resumeDownload

```
resumeDownload(downloadId: number): Promise<void>
```

Resumes a paused download.

<a name="searchDownloads"></a>

### searchDownloads

```
searchDownloads(query: chrome.downloads.DownloadQuery): Promise<chrome.downloads.DownloadItem[]>
```

Searches for downloads matching the specified query.

<a name="setDownloadsUiOptions"></a>

### setDownloadsUiOptions

```
setDownloadsUiOptions(enabled: boolean): Promise<void>
```

Enables or disables the browser's default download UI.

<a name="showDownloadFolder"></a>

### showDownloadFolder

```
showDownloadFolder(): void
```

Shows the default download folder in the file explorer.

<a name="showDownload"></a>

### showDownload

```
showDownload(downloadId: number): Promise<boolean>
```

Attempts to reveal the specified download in the file explorer, returning `true` if it exists.

<a name="findDownload"></a>

### findDownload

```
findDownload(downloadId: number): Promise<chrome.downloads.DownloadItem | undefined>
```

Retrieves the download item for the given download ID, if it exists.

<a name="isDownloadExists"></a>

### isDownloadExists

```
isDownloadExists(downloadId: number): Promise<boolean | undefined>
```

Checks whether a download with the specified ID exists.

<a name="getDownloadState"></a>

### getDownloadState

```
getDownloadState(downloadId?: number): Promise<chrome.downloads.DownloadState | undefined>
```

Retrieves the state (`in_progress`, `complete`, or `interrupted`) of the given download.

<a name="onDownloadsChanged"></a>

### onDownloadsChanged

```
onDownloadsChanged(callback: Parameters<typeof chrome.downloads.onChanged.addListener>[0]): () => void
```

Adds a listener triggered when a download's state or properties change.

<a name="onDownloadsCreated"></a>

### onDownloadsCreated

```
onDownloadsCreated(callback: Parameters<typeof chrome.downloads.onCreated.addListener>[0]): () => void
```

Adds a listener triggered when a new download is created.

<a name="onDownloadsDeterminingFilename"></a>

### onDownloadsDeterminingFilename

```
onDownloadsDeterminingFilename(callback: Parameters<typeof chrome.downloads.onDeterminingFilename.addListener>[0]): () => void
```

Adds a listener triggered when a download's filename is being determined.

<a name="extension"></a>

## extension

**Documentation:** [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/extension)

A promise-based wrapper for the Chrome `extension` API.

### Methods

- [getBackgroundPage](#getBackgroundPage)
- [getViews](#getViews)
- [isAllowedFileSchemeAccess](#isAllowedFileSchemeAccess)
- [isAllowedIncognitoAccess](#isAllowedIncognitoAccess)
- [setUpdateUrlData](#setUpdateUrlData)

<a name="getBackgroundPage"></a>

### getBackgroundPage

```
getBackgroundPage(): Window | null
```

Returns the `window` object of the extension's background page, or `null` if no background page exists.

<a name="getViews"></a>

### getViews

```
getViews(properties?: chrome.extension.FetchProperties): Window[]
```

Retrieves all active extension views (e.g., background, popup, options), optionally filtered by the specified properties.

<a name="isAllowedFileSchemeAccess"></a>

### isAllowedFileSchemeAccess

```
isAllowedFileSchemeAccess(): Promise<boolean>
```

Checks if the extension has permission to access file system URLs (`file://`).

<a name="isAllowedIncognitoAccess"></a>

### isAllowedIncognitoAccess

```
isAllowedIncognitoAccess(): Promise<boolean>
```

Determines whether the extension is allowed to operate in incognito mode.

<a name="setUpdateUrlData"></a>

### setUpdateUrlData

```
setUpdateUrlData(data: string): void
```

Sets the data string to be sent as part of the extension's update check URL.

<a name="fileBrowserHandler"></a>

## fileBrowserHandler

**Documentation:** [Chrome File Browser Handler API](https://developer.chrome.com/docs/extensions/reference/fileBrowserHandler)

A wrapper for the Chrome `fileBrowserHandler` API to manage file browser actions.

### Events

- [onExecute](#onExecute)

<a name="onExecute"></a>

### onExecute

```
onExecute(callback: (id: string, details: chrome.fileBrowserHandler.FileBrowserHandlerExecuteDetails) => void): () => void
```

Adds a listener triggered when the user invokes the extension via the file browser. Returns a function to remove the listener.

<a name="history"></a>

## history

**Documentation:** [Chrome History API](https://developer.chrome.com/docs/extensions/reference/history)

A promise-based wrapper for the Chrome `history` API to manage browser history.

### Methods

- [addHistoryUrl](#addHistoryUrl)
- [deleteAllHistory](#deleteAllHistory)
- [deleteRangeHistory](#deleteRangeHistory)
- [deleteHistoryUrl](#deleteHistoryUrl)
- [getHistoryVisits](#getHistoryVisits)
- [searchHistory](#searchHistory)

### Events

- [onHistoryVisited](#onHistoryVisited)
- [onHistoryVisitRemoved](#onHistoryVisitRemoved)

<a name="addHistoryUrl"></a>

### addHistoryUrl

```
addHistoryUrl(url: string): Promise<void>
```

Adds the specified URL to the browser history.

<a name="deleteAllHistory"></a>

### deleteAllHistory

```
deleteAllHistory(): Promise<void>
```

Deletes all entries from the browser history.

<a name="deleteRangeHistory"></a>

### deleteRangeHistory

```
deleteRangeHistory(range: chrome.history.Range): Promise<void>
```

Removes all history entries within the specified time range.

<a name="deleteHistoryUrl"></a>

### deleteHistoryUrl

```
deleteHistoryUrl(details: chrome.history.Url): Promise<void>
```

Deletes all occurrences of the given URL from the history.

<a name="getHistoryVisits"></a>

### getHistoryVisits

```
getHistoryVisits(url: string): Promise<chrome.history.VisitItem[]>
```

Retrieves the visit history for the specified URL.

<a name="searchHistory"></a>

### searchHistory

```
searchHistory(query: chrome.history.HistoryQuery): Promise<chrome.history.HistoryItem[]>
```

Searches the browser history with the given query, returning matching history items.

<a name="onHistoryVisited"></a>

### onHistoryVisited

```
onHistoryVisited(callback: (result: chrome.history.HistoryItem) => void): () => void
```

Adds a listener triggered when the browser records a page visit.

<a name="onHistoryVisitRemoved"></a>

### onHistoryVisitRemoved

```
onHistoryVisitRemoved(callback: (removed: chrome.history.RemoveInfo) => void): () => void
```

Adds a listener triggered when URLs are removed from the history, providing details of the removal.<a name="i18n"></a>

## i18n

**Documentation:** [Chrome i18n API](https://developer.chrome.com/docs/extensions/reference/i18n)

A promise-based wrapper for the Chrome `i18n` API to manage localization.

### Methods

- [detectI18Language](#detectI18Language)
- [getI18nAcceptLanguages](#getI18nAcceptLanguages)
- [getI18nUILanguage](#getI18nUILanguage)
- [getI18nMessage](#getI18nMessage)
- [getDefaultLanguage](#getDefaultLanguage)

<a name="detectI18Language"></a>

### detectI18Language

```
detectI18Language(text: string): Promise<chrome.i18n.LanguageDetectionResult>
```

Detects the primary language of the provided text.

<a name="getI18nAcceptLanguages"></a>

### getI18nAcceptLanguages

```
getI18nAcceptLanguages(): Promise<string[]>
```

Retrieves the user's preferred accept languages list.

<a name="getI18nUILanguage"></a>

### getI18nUILanguage

```
getI18nUILanguage(): string | undefined
```

Returns the browser's UI language code.

<a name="getI18nMessage"></a>

### getI18nMessage

```
getI18nMessage(key: string): string | undefined
```

Retrieves the localized message for the specified key.

<a name="getDefaultLanguage"></a>

### getDefaultLanguage

```
getDefaultLanguage(): string | undefined
```

Extracts the default locale as declared in the extension manifest.

<a name="idle"></a>

## idle

**Documentation:** [Chrome Idle API](https://developer.chrome.com/docs/extensions/reference/idle)

A promise-based wrapper for the Chrome `idle` API to monitor user idle state.

### Methods

- [getIdleAutoLockDelay](#getIdleAutoLockDelay)
- [queryIdleState](#queryIdleState)
- [setIdleDetectionInterval](#setIdleDetectionInterval)

### Events

- [onIdleStateChanged](#onIdleStateChanged)

<a name="getIdleAutoLockDelay"></a>

### getIdleAutoLockDelay

```
getIdleAutoLockDelay(): Promise<number>
```

Retrieves the number of seconds before the system auto-locks due to inactivity.

<a name="queryIdleState"></a>

### queryIdleState

```
queryIdleState(detectionIntervalInSeconds: number): Promise<chrome.idle.IdleState>
```

Queries the user's idle state within the specified detection interval.

<a name="setIdleDetectionInterval"></a>

### setIdleDetectionInterval

```
setIdleDetectionInterval(intervalInSeconds: number): void
```

Sets the interval, in seconds, used to detect idle state changes.

<a name="onIdleStateChanged"></a>

### onIdleStateChanged

```
onIdleStateChanged(callback: (newState: chrome.idle.IdleState) => void): () => void
```

Adds a listener that fires when the user's idle state changes, returning a function to remove the listener.

<a name="management"></a>

## management

**Documentation:** [Chrome Management API](https://developer.chrome.com/docs/extensions/reference/management)

A promise-based wrapper for the Chrome `management` API to manage extensions and apps.

### Methods

- [createAppShortcut](#createAppShortcut)
- [generateAppForLink](#generateAppForLink)
- [getExtensionInfo](#getExtensionInfo)
- [getAllExtensionInfo](#getAllExtensionInfo)
- [getPermissionWarningsById](#getPermissionWarningsById)
- [getPermissionWarningsByManifest](#getPermissionWarningsByManifest)
- [getCurrentExtension](#getCurrentExtension)
- [launchExtensionApp](#launchExtensionApp)
- [setExtensionEnabled](#setExtensionEnabled)
- [setExtensionLaunchType](#setExtensionLaunchType)
- [uninstallExtension](#uninstallExtension)
- [uninstallCurrentExtension](#uninstallCurrentExtension)

### Events

- [onExtensionDisabled](#onExtensionDisabled)
- [onExtensionEnabled](#onExtensionEnabled)
- [onExtensionInstalled](#onExtensionInstalled)
- [onExtensionUninstalled](#onExtensionUninstalled)

<a name="createAppShortcut"></a>

### createAppShortcut

```
createAppShortcut(id: string): Promise<void>
```

Creates a desktop shortcut for the specified app ID.

<a name="generateAppForLink"></a>

### generateAppForLink

```
generateAppForLink(url: string, title: string): Promise<chrome.management.ExtensionInfo>
```

Generates a Chrome app for the given URL and title, returning its extension info.

<a name="getExtensionInfo"></a>

### getExtensionInfo

```
getExtensionInfo(id: string): Promise<chrome.management.ExtensionInfo>
```

Retrieves information about the extension or app with the specified ID.

<a name="getAllExtensionInfo"></a>

### getAllExtensionInfo

```
getAllExtensionInfo(): Promise<chrome.management.ExtensionInfo[]>
```

Retrieves information about all installed extensions and apps.

<a name="getPermissionWarningsById"></a>

### getPermissionWarningsById

```
getPermissionWarningsById(id: string): Promise<string[]>
```

Gets permission warning messages for the specified extension ID.

<a name="getPermissionWarningsByManifest"></a>

### getPermissionWarningsByManifest

```
getPermissionWarningsByManifest(manifestStr: string): Promise<string[]>
```

Gets permission warning messages for the given manifest string.

<a name="getCurrentExtension"></a>

### getCurrentExtension

```
getCurrentExtension(): Promise<chrome.management.ExtensionInfo>
```

Retrieves information about the current extension.

<a name="launchExtensionApp"></a>

### launchExtensionApp

```
launchExtensionApp(id: string): Promise<void>
```

Launches the specified extension app by ID.

<a name="setExtensionEnabled"></a>

### setExtensionEnabled

```
setExtensionEnabled(id: string, enabled: boolean): Promise<void>
```

Enables or disables the specified extension or app.

<a name="setExtensionLaunchType"></a>

### setExtensionLaunchType

```
setExtensionLaunchType(id: string, launchType: string): Promise<void>
```

Sets the launch type (e.g., regular, pinned) for the specified extension.

<a name="uninstallExtension"></a>

### uninstallExtension

```
uninstallExtension(id: string, showConfirmDialog?: boolean): Promise<void>
```

Uninstalls the extension with the given ID, optionally showing a confirmation dialog.

<a name="uninstallCurrentExtension"></a>

### uninstallCurrentExtension

```
uninstallCurrentExtension(showConfirmDialog?: boolean): Promise<void>
```

Uninstalls the current extension, optionally showing a confirmation dialog.

<a name="onExtensionDisabled"></a>

### onExtensionDisabled

```
onExtensionDisabled(callback: (info: chrome.management.ExtensionInfo) => void): () => void
```

Fires when an extension or app is disabled.

<a name="onExtensionEnabled"></a>

### onExtensionEnabled

```
onExtensionEnabled(callback: (info: chrome.management.ExtensionInfo) => void): () => void
```

Fires when an extension or app is enabled.

<a name="onExtensionInstalled"></a>

### onExtensionInstalled

```
onExtensionInstalled(callback: (info: chrome.management.ExtensionInfo) => void): () => void
```

Fires when an extension or app is installed.

<a name="onExtensionUninstalled"></a>

### onExtensionUninstalled

```
onExtensionUninstalled(callback: (extensionId: string) => void): () => void
```

Fires when an extension or app is uninstalled, passing its ID.

<a name="notifications"></a>

## notifications

**Documentation:** [Chrome Notifications API](https://developer.chrome.com/docs/extensions/reference/notifications)

A promise-based wrapper for the Chrome `notifications` API to create and manage desktop notifications.

### Methods

- [clearNotification](#clearNotification)
- [createNotification](#createNotification)
- [getAllNotification](#getAllNotification)
- [getNotificationPermissionLevel](#getNotificationPermissionLevel)
- [updateNotification](#updateNotification)
- [isSupportNotifications](#isSupportNotifications)
- [clearAllNotification](#clearAllNotification)

### Events

- [onNotificationsButtonClicked](#onNotificationsButtonClicked)
- [onNotificationsClicked](#onNotificationsClicked)
- [onNotificationsClosed](#onNotificationsClosed)
- [onNotificationsPermissionLevelChanged](#onNotificationsPermissionLevelChanged)

<a name="clearNotification"></a>

### clearNotification

```
clearNotification(notificationId: string): Promise<boolean>
```

Clears the notification with the specified ID, resolving to `true` if the notification existed and was cleared.

<a name="createNotification"></a>

### createNotification

```
createNotification(options: chrome.notifications.NotificationOptions, notificationId?: string): Promise<string>
```

Creates a notification with the given options and optional ID, returning the notification ID.

<a name="getAllNotification"></a>

### getAllNotification

```
getAllNotification(): Promise<{ [notificationId: string]: chrome.notifications.NotificationOptions }>
```

Retrieves all notifications currently displayed, returned as a map of notification IDs to their options.

<a name="getNotificationPermissionLevel"></a>

### getNotificationPermissionLevel

```
getNotificationPermissionLevel(): Promise<string>
```

Gets the current permission level for notifications.

<a name="updateNotification"></a>

### updateNotification

```
updateNotification(options: chrome.notifications.NotificationOptions, notificationId: string): Promise<boolean>
```

Updates an existing notification with new options, resolving to `true` if the notification was updated.

<a name="isSupportNotifications"></a>

### isSupportNotifications

```
isSupportNotifications(): boolean
```

Checks if the Notifications API is supported in the current browser.

<a name="clearAllNotification"></a>

### clearAllNotification

```
clearAllNotification(): Promise<void>
```

Clears all currently displayed notifications.

<a name="onNotificationsButtonClicked"></a>

### onNotificationsButtonClicked

```
onNotificationsButtonClicked(callback: (notificationId: string, buttonIndex: number) => void): () => void
```

Adds a listener for when a button on a notification is clicked, returning a function to remove the listener.

<a name="onNotificationsClicked"></a>

### onNotificationsClicked

```
onNotificationsClicked(callback: (notificationId: string) => void): () => void
```

Adds a listener for when a notification itself is clicked.

<a name="onNotificationsClosed"></a>

### onNotificationsClosed

```
onNotificationsClosed(callback: (notificationId: string, byUser: boolean) => void): () => void
```

Adds a listener for when a notification is closed, including whether it was closed by the user.

<a name="onNotificationsPermissionLevelChanged"></a>

### onNotificationsPermissionLevelChanged

```
onNotificationsPermissionLevelChanged(callback: (level: string) => void): () => void
```

Adds a listener for when notification permission level changes.

<a name="offscreen"></a>

## offscreen

**Documentation:** [Chrome Offscreen API](https://developer.chrome.com/docs/extensions/reference/offscreen) [MV3]

A promise-based wrapper for the Chrome `offscreen` API to create and manage offscreen documents.

### Methods

- [createOffscreen](#createOffscreen)
- [closeOffscreen](#closeOffscreen)
- [hasOffscreen](#hasOffscreen)

<a name="createOffscreen"></a>

### createOffscreen

```
createOffscreen(parameters: chrome.offscreen.CreateParameters): Promise<void>
```

Creates an offscreen document with the specified parameters.

<a name="closeOffscreen"></a>

### closeOffscreen

```
closeOffscreen(): Promise<void>
```

Closes the existing offscreen document.

<a name="hasOffscreen"></a>

### hasOffscreen

```
hasOffscreen(): Promise<boolean>
```

Checks whether an offscreen document is currently open.

<a name="permissions"></a>

## permissions

**Documentation:** [Chrome Permissions API](https://developer.chrome.com/docs/extensions/reference/permissions)

A promise-based wrapper for the Chrome `permissions` API to request and manage extension permissions.

### Methods

- [containsPermissions](#containsPermissions)
- [getAllPermissions](#getAllPermissions)
- [requestPermissions](#requestPermissions)
- [removePermissions](#removePermissions)
- [addHostAccessRequest](#addHostAccessRequest) [MV3]
- [removeHostAccessRequest](#removeHostAccessRequest) [MV3]

### Events

- [onPermissionsAdded](#onPermissionsAdded)
- [onPermissionsRemoved](#onPermissionsRemoved)

<a name="containsPermissions"></a>

### containsPermissions

```
containsPermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
```

Checks whether the extension has the specified permissions.

<a name="getAllPermissions"></a>

### getAllPermissions

```
getAllPermissions(): Promise<chrome.permissions.Permissions>
```

Retrieves all granted permissions.

<a name="requestPermissions"></a>

### requestPermissions

```
requestPermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
```

Prompts the user to grant additional permissions.

<a name="removePermissions"></a>

### removePermissions

```
removePermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
```

Removes the specified permissions if granted.

<a name="addHostAccessRequest"></a>

### addHostAccessRequest [MV3]

```
addHostAccessRequest(request?: chrome.permissions.AddHostAccessRequest): Promise<void>
```

Requests additional host access at runtime (Manifest V3 only).

<a name="removeHostAccessRequest"></a>

### removeHostAccessRequest [MV3]

```
removeHostAccessRequest(request?: chrome.permissions.RemoveHostAccessRequest): Promise<void>
```

Clears a previously requested host access (Manifest V3 only).

<a name="onPermissionsAdded"></a>

### onPermissionsAdded

```
onPermissionsAdded(callback: (permissions: chrome.permissions.Permissions) => void): () => void
```

Fires when new permissions are granted.

<a name="onPermissionsRemoved"></a>

### onPermissionsRemoved

```
onPermissionsRemoved(callback: (permissions: chrome.permissions.Permissions) => void): () => void
```

Fires when permissions are removed.

<a name="runtime"></a>

## runtime

**Documentation:** [Chrome Runtime API](https://developer.chrome.com/docs/extensions/reference/runtime)

A wrapper for the Chrome `runtime` API, including messaging, updates, and lifecycle events.

### Methods

- [connect](#connect)
- [connectNative](#connectNative)
- [getContexts](#getContexts) [MV3]
- [getManifest](#getManifest)
- [getId](#getId)
- [getManifestVersion](#getManifestVersion)
- [isManifestVersion3](#isManifestVersion3)
- [getPackageDirectoryEntry](#getPackageDirectoryEntry)
- [getPlatformInfo](#getPlatformInfo)
- [getUrl](#getUrl)
- [openOptionsPage](#openOptionsPage)
- [reload](#reload)
- [requestUpdateCheck](#requestUpdateCheck)
- [restart](#restart) [MV3]
- [restartAfterDelay](#restartAfterDelay) [MV3]
- [sendMessage](#sendMessage)
- [setUninstallUrl](#setUninstallUrl)

### Events

- [onConnect](#onConnect)
- [onConnectExternal](#onConnectExternal)
- [onInstalled](#onInstalled)
- [onMessage](#onMessage)
- [onMessageExternal](#onMessageExternal)
- [onRestartRequired](#onRestartRequired)
- [onStartup](#onStartup)
- [onSuspend](#onSuspend)
- [onSuspendCanceled](#onSuspendCanceled)
- [onUpdateAvailable](#onUpdateAvailable)
- [onUserScriptConnect](#onUserScriptConnect)
- [onUserScriptMessage](#onUserScriptMessage)

<a name="connect"></a>

### connect

```
connect(extensionId: string, connectInfo?: object): chrome.runtime.Port
```

Opens a long-lived connection to another extension or app.

<a name="connectNative"></a>

### connectNative

```
connectNative(application: string): chrome.runtime.Port
```

Connects to a native application.

<a name="getContexts"></a>

### getContexts [MV3]

```
getContexts(filter: chrome.runtime.ContextFilter): Promise<chrome.runtime.ExtensionContext[]>
```

Retrieves extension contexts matching the filter (Manifest V3 only).

<a name="getManifest"></a>

### getManifest

```
getManifest(): chrome.runtime.Manifest
```

Returns the extension's manifest details.

<a name="getId"></a>

### getId

```
getId(): string
```

Returns the extension ID.

<a name="getManifestVersion"></a>

### getManifestVersion

```
getManifestVersion(): 2 | 3
```

Retrieves the manifest version (2 or 3).

<a name="isManifestVersion3"></a>

### isManifestVersion3

```
isManifestVersion3(): boolean
```

Checks if the extension uses Manifest V3.

<a name="getPackageDirectoryEntry"></a>

### getPackageDirectoryEntry

```
getPackageDirectoryEntry(): Promise<FileSystemDirectoryEntry>
```

Gets the root directory of the extension package.

<a name="getPlatformInfo"></a>

### getPlatformInfo

```
getPlatformInfo(): Promise<chrome.runtime.PlatformInfo>
```

Returns information about the current platform.

<a name="getUrl"></a>

### getUrl

```
getUrl(path: string): string
```

Converts a relative path to an absolute extension URL.

<a name="openOptionsPage"></a>

### openOptionsPage

```
openOptionsPage(): Promise<void>
```

Opens the extension's options page.

<a name="reload"></a>

### reload

```
reload(): void
```

Reloads the extension.

<a name="requestUpdateCheck"></a>

### requestUpdateCheck

```
requestUpdateCheck(): Promise<{status: chrome.runtime.RequestUpdateCheckStatus; details?: chrome.runtime.UpdateCheckDetails;}>
```

Checks for an update and returns status and details.

<a name="restart"></a>

### restart [MV3]

```
restart(): void
```

Restarts the browser to apply updates (Manifest V3 only).

<a name="restartAfterDelay"></a>

### restartAfterDelay [MV3]

```
restartAfterDelay(seconds: number): Promise<void>
```

Schedules a browser restart after the given delay in seconds (Manifest V3 only).

<a name="sendMessage"></a>

### sendMessage

```
sendMessage<M = any, R = any>(message: M): Promise<R>
```

Sends a single message to the extension or app and awaits a response.

<a name="setUninstallUrl"></a>

### setUninstallUrl

```
setUninstallUrl(url: string): Promise<void>
```

Sets a URL to be opened upon uninstallation.

<a name="onConnect"></a>

### onConnect

```
onConnect(callback: (port: chrome.runtime.Port) => void): () => void
```

Fires when a connection is made by another extension or content script.

<a name="onConnectExternal"></a>

### onConnectExternal

```
onConnectExternal(callback: (port: chrome.runtime.Port) => void): () => void
```

Fires when an external extension connects.

<a name="onInstalled"></a>

### onInstalled

```
onInstalled(callback: chrome.runtime.InstalledDetails): () => void
```

Fires when the extension is installed or updated.

<a name="onMessage"></a>

### onMessage

```
onMessage(callback: (message: any, sender: chrome.runtime.MessageSender) => void): () => void
```

Fires when a message is received.

<a name="onMessageExternal"></a>

### onMessageExternal

```
onMessageExternal(callback: (message: any, sender: chrome.runtime.MessageSender) => void): () => void
```

Fires when an external extension sends a message.

<a name="onRestartRequired"></a>

### onRestartRequired

```
onRestartRequired(callback: (reason: chrome.runtime.OnRestartRequiredReason) => void): () => void
```

Fires when the extension requires a browser restart.

<a name="onStartup"></a>

### onStartup

```
onStartup(callback: () => void): () => void
```

Fires when the browser starts up.

<a name="onSuspend"></a>

### onSuspend

```
onSuspend(callback: () => void): () => void
```

Fires when the event page is about to be unloaded.

<a name="onSuspendCanceled"></a>

### onSuspendCanceled

```
onSuspendCanceled(callback: () => void): () => void
```

Fires when a suspend is canceled.

<a name="onUpdateAvailable"></a>

### onUpdateAvailable

```
onUpdateAvailable(callback: chrome.runtime.UpdateAvailableDetails): () => void
```

Fires when an update is available.

<a name="onUserScriptConnect"></a>

### onUserScriptConnect

```
onUserScriptConnect(callback: (port: chrome.runtime.Port) => void): () => void
```

Fires when a user script establishes a connection.

<a name="onUserScriptMessage"></a>

### onUserScriptMessage

```
onUserScriptMessage(callback: (message: any, sender: chrome.runtime.MessageSender) => void): () => void
```

Fires when a message arrives from a user script.

<a name="scripting"></a>

## scripting

**Documentation:** [Chrome Scripting API](https://developer.chrome.com/docs/extensions/reference/scripting)

A promise-based wrapper for the Chrome `scripting` API to inject scripts and styles, and manage content scripts.

### Methods

- [executeScript](#executeScript)
- [getRegisteredContentScripts](#getRegisteredContentScripts)
- [insertCSS](#insertCSS)
- [registerContentScripts](#registerContentScripts)
- [removeCSS](#removeCSS)
- [unregisterContentScripts](#unregisterContentScripts)
- [updateContentScripts](#updateContentScripts)
- [isAvailableScripting](#isAvailableScripting)

<a name="executeScript"></a>

### executeScript

```
executeScript<T = any>(injection: chrome.scripting.ScriptInjection<any, T>): Promise<chrome.scripting.InjectionResult<chrome.scripting.Awaited<T>>[]>
```

Executes a script in the specified target and returns the injection results.

<a name="getRegisteredContentScripts"></a>

### getRegisteredContentScripts

```
getRegisteredContentScripts(filter?: chrome.scripting.ContentScriptFilter): Promise<chrome.scripting.RegisteredContentScript[]>
```

Retrieves registered content scripts, optionally filtered by criteria.

<a name="insertCSS"></a>

### insertCSS

```
insertCSS(injection: chrome.scripting.CSSInjection): Promise<void>
```

Injects CSS into specified target pages.

<a name="registerContentScripts"></a>

### registerContentScripts

```
registerContentScripts(scripts: chrome.scripting.RegisteredContentScript[]): Promise<void>
```

Registers one or more content scripts programmatically.

<a name="removeCSS"></a>

### removeCSS

```
removeCSS(injection: chrome.scripting.CSSInjection): Promise<void>
```

Removes previously injected CSS from specified target pages.

<a name="unregisterContentScripts"></a>

### unregisterContentScripts

```
unregisterContentScripts(filter?: chrome.scripting.ContentScriptFilter): Promise<void>
```

Unregisters content scripts matching the given filter.

<a name="updateContentScripts"></a>

### updateContentScripts

```
updateContentScripts(scripts: chrome.scripting.RegisteredContentScript[]): Promise<void>
```

Updates existing content scripts with new definitions.

<a name="isAvailableScripting"></a>

### isAvailableScripting

```
isAvailableScripting(): boolean
```

Checks if the Scripting API is available in the current browser.

<a name="sidebar"></a>

## sidebar

**Documentation:**

- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/sidePanel) [MV3]
- [Opera Sidebar Action API](https://help.opera.com/en/extensions/sidebar-action-api/)
- [Firefox Sidebar Action API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction)

A promise-based wrapper for the Chrome `sidePanel` API and the `sidebarAction` API in Firefox/Opera. Provides methods to get and set side panel options, behavior, path, title, and badge.

### Methods

- [getSidebarOptions](#getSidebarOptions)
- [getSidebarBehavior](#getSidebarBehavior)
- [canOpenSidebar](#canOpenSidebar)
- [openSidebar](#openSidebar)
- [setSidebarOptions](#setSidebarOptions)
- [setSidebarBehavior](#setSidebarBehavior)
- [setSidebarPath](#setSidebarPath)
- [getSidebarPath](#getSidebarPath)
- [setSidebarTitle](#setSidebarTitle) [Opera]
- [setSidebarBadgeText](#setSidebarBadgeText) [Opera]
- [setSidebarBadgeTextColor](#setSidebarBadgeTextColor) [Opera]
- [setSidebarBadgeBgColor](#getSidebarBadgeBgColor) [Opera]
- [getSidebarTitle](#getSidebarTitle) [Opera]
- [getSidebarBadgeText](#getSidebarBadgeText) [Opera]
- [getSidebarBadgeTextColor](#getSidebarBadgeTextColor) [Opera]
- [getSidebarBadgeBgColor](#getSidebarBadgeBgColor) [Opera]

<a name="getSidebarOptions"></a>

### getSidebarOptions

```
getSidebarOptions(tabId?: number): Promise<chrome.sidePanel.PanelOptions>
```

Retrieves the panel options (such as `path` and other settings) for the specified tab's side panel. Throws an error if the Side Panel API is not supported. [MV3]

<a name="getSidebarBehavior"></a>

### getSidebarBehavior

```
getSidebarBehavior(): Promise<chrome.sidePanel.PanelBehavior>
```

Fetches the current behavior settings of the side panel (e.g., default open state). Throws an error if the API is not supported. [MV3]

<a name="canOpenSidebar"></a>

### canOpenSidebar

```
canOpenSidebar(): boolean
```

Returns `true` if the side panel (Chrome MV3) or sidebar action (Firefox/Opera) APIs are available, indicating the extension can programmatically open the sidebar.

<a name="openSidebar"></a>

### openSidebar

```
openSidebar(options: chrome.sidePanel.OpenOptions): Promise<void>
```

Opens the side panel with the specified options in Chrome (Manifest V3). Falls back to `browser.sidebarAction.open()` in Firefox. Logs a warning if unsupported.

<a name="setSidebarOptions"></a>

### setSidebarOptions

```
setSidebarOptions(options?: chrome.sidePanel.PanelOptions): Promise<void>
```

Sets new panel options (e.g., `path`) for the side panel in Chrome (Manifest V3). Logs a warning if unsupported. [MV3]

<a name="setSidebarBehavior"></a>

### setSidebarBehavior

```
setSidebarBehavior(behavior?: chrome.sidePanel.PanelBehavior): Promise<void>
```

Updates the panel behavior settings in Chrome (Manifest V3). Logs a warning if unsupported. [MV3]

<a name="setSidebarPath"></a>

### setSidebarPath

```
setSidebarPath(path: string, tabId?: number): Promise<void>
```

Sets the URL path of the sidebar panel. Uses Chrome `setOptions` in MV3 or `sidebarAction.setPanel()` in Firefox/Opera. Throws if unsupported.

<a name="getSidebarPath"></a>

### getSidebarPath

```
getSidebarPath(tabId?: number): Promise<string | undefined>
```

Retrieves the current sidebar panel path from Chrome MV3 or parses it from the `sidebarAction.getPanel()` result in Firefox/Opera. Throws if unsupported.

<a name="setSidebarTitle"></a>

### setSidebarTitle

```
setSidebarTitle(title: string | number, tabId?: number): Promise<void>
```

Sets the sidebar title in Opera via `opr.sidebarAction.setTitle()`. Logs a warning if unsupported. [Opera]

<a name="setSidebarBadgeText"></a>

### setSidebarBadgeText

```
setSidebarBadgeText(text: string | number, tabId?: number): Promise<void>
```

Sets the sidebar badge text in Opera via `opr.sidebarAction.setBadgeText()`. Logs a warning if unsupported. [Opera]

<a name="setSidebarBadgeTextColor"></a>

### setSidebarBadgeTextColor

```
setSidebarBadgeTextColor(color: string | number[] | chrome.action.ColorArray, tabId?: number): Promise<void>
```

Sets the sidebar badge text color in Opera via `opr.sidebarAction.setBadgeTextColor()`. Logs a warning if unsupported. [Opera]

<a name="setSidebarBadgeBgColor"></a>

### setSidebarBadgeBgColor

```
setSidebarBadgeBgColor(color: string | number[] | chrome.action.ColorArray, tabId?: number): Promise<void>
```

Sets the sidebar badge background color in Opera via `opr.sidebarAction.setBadgeBackgroundColor()`. Logs a warning if unsupported. [Opera]

<a name="getSidebarTitle"></a>

### getSidebarTitle

```
getSidebarTitle(tabId?: number): Promise<string>
```

Retrieves the sidebar title in Opera via `opr.sidebarAction.getTitle()`. Throws an error if unsupported. [Opera]

<a name="getSidebarBadgeText"></a>

### getSidebarBadgeText

```
getSidebarBadgeText(tabId?: number): Promise<string>
```

Retrieves the sidebar badge text in Opera via `opr.sidebarAction.getBadgeText()`. Throws an error if unsupported. [Opera]

<a name="getSidebarBadgeTextColor"></a>

### getSidebarBadgeTextColor

```
getSidebarBadgeTextColor(tabId?: number): Promise<chrome.action.ColorArray>
```

Retrieves the sidebar badge text color in Opera via `opr.sidebarAction.getBadgeTextColor()`. Throws an error if unsupported. [Opera]

<a name="getSidebarBadgeBgColor"></a>

### getSidebarBadgeBgColor

```
getSidebarBadgeBgColor(tabId?: number): Promise<chrome.action.ColorArray>
```

Retrieves the sidebar badge background color in Opera via `opr.sidebarAction.getBadgeBackgroundColor()`. Throws an error if unsupported. [Opera]

<a name="tabCapture"></a>

## tabCapture

**Documentation:** [Chrome Tab Capture API](https://developer.chrome.com/docs/extensions/reference/tabCapture)

A promise-based wrapper for the Chrome `tabCapture` API to capture and retrieve tab media streams.

### Methods

- [createTabCapture](#createTabCapture)
- [getCapturedTabs](#getCapturedTabs)
- [getCaptureMediaStreamId](#getCaptureMediaStreamId)

### Events

- [onCaptureStatusChanged](#onCaptureStatusChanged)

<a name="createTabCapture"></a>

### createTabCapture

```
createTabCapture(options: chrome.tabCapture.CaptureOptions): Promise<MediaStream | null>
```

Captures the visible media stream of a tab based on the specified options. Resolves with the `MediaStream` if successful, or `null` otherwise. Rejects if an error occurs.

<a name="getCapturedTabs"></a>

### getCapturedTabs

```
getCapturedTabs(): Promise<chrome.tabCapture.CaptureInfo[]>
```

Retrieves details of all active tab capture sessions. Resolves with an array of `CaptureInfo` objects.

<a name="getCaptureMediaStreamId"></a>

### getCaptureMediaStreamId

```
getCaptureMediaStreamId(options: chrome.tabCapture.GetMediaStreamOptions): Promise<string>
```

Generates a media stream ID for capturing a tab via `navigator.mediaDevices.getUserMedia`. Resolves with the stream ID.

<a name="onCaptureStatusChanged"></a>

### onCaptureStatusChanged

```
onCaptureStatusChanged(callback: (info: chrome.tabCapture.CaptureInfo) => void): () => void
```

Adds a listener for tab capture status changes (started, stopped, source changed). Returns a function to remove the listener.

<a name="tabs"></a>

## tabs

**Documentation:** [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs)

A promise-based wrapper for the Chrome `tabs` API, providing core tab operations, messaging, and utility methods.

### Methods

- [captureVisibleTab](#captureVisibleTab)
- [connectTab](#connectTab)
- [createTab](#createTab)
- [detectTabLanguage](#detectTabLanguage)
- [discardTab](#discardTab)
- [duplicateTab](#duplicateTab)
- [getTab](#getTab)
- [getCurrentTab](#getCurrentTab)
- [getTabZoom](#getTabZoom)
- [getTabZoomSettings](#getTabZoomSettings)
- [goTabBack](#goTabBack)
- [goTabForward](#goTabForward)
- [groupTabs](#groupTabs)
- [highlightTab](#highlightTab)
- [moveTab](#moveTab)
- [moveTabs](#moveTabs)
- [queryTabs](#queryTabs)
- [reloadTab](#reloadTab)
- [removeTab](#removeTab)
- [sendTabMessage](#sendTabMessage)
- [setTabZoom](#setTabZoom)
- [setTabZoomSettings](#setTabZoomSettings)
- [ungroupTab](#ungroupTab)
- [updateTab](#updateTab)
- [executeScriptTab](#executeScriptTab)
- [getTabUrl](#getTabUrl)
- [getActiveTab](#getActiveTab)
- [queryTabIds](#queryTabIds)
- [findTab](#findTab)
- [findTabById](#findTabById)
- [updateTabAsSelected](#updateTabAsSelected)
- [updateTabAsActive](#updateTabAsActive)
- [openOrCreateTab](#openOrCreateTab)

### Events

- [onTabActivated](#onTabActivated)
- [onTabAttached](#onTabAttached)
- [onTabCreated](#onTabCreated)
- [onTabDetached](#onTabDetached)
- [onTabHighlighted](#onTabHighlighted)
- [onTabMoved](#onTabMoved)
- [onTabRemoved](#onTabRemoved)
- [onTabReplaced](#onTabReplaced)
- [onTabUpdated](#onTabUpdated)
- [onTabZoomChange](#onTabZoomChange)

<a name="captureVisibleTab"></a>

### captureVisibleTab

```
captureVisibleTab(windowId: number, options: chrome.extensionTypes.ImageDetails): Promise<string>
```

Captures the visible area of the specified window as an image and returns a data URL string. Resolves with the image `data:image/png;base64,...`.

<a name="connectTab"></a>

### connectTab

```
connectTab(tabId: number, connectInfo?: chrome.tabs.ConnectInfo): chrome.runtime.Port
```

Creates a long-lived connection to the specified tab for message passing. Returns a `Port` object.

<a name="createTab"></a>

### createTab

```
createTab(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>
```

Creates a new tab with the given properties. Resolves with the created `Tab` object.

<a name="detectTabLanguage"></a>

### detectTabLanguage

```
detectTabLanguage(tabId: number): Promise<string>
```

Detects the language of the specified tab's content. Resolves with a language code (e.g., `"en"` or `"und"`).

<a name="discardTab"></a>

### discardTab

```
discardTab(tabId: number): Promise<chrome.tabs.Tab>
```

Discards the specified tab to free up system resources. Resolves with the updated `Tab` object.

<a name="duplicateTab"></a>

### duplicateTab

```
duplicateTab(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Duplicates the specified tab, opening a copy. Resolves with the new `Tab`, or `undefined` if duplication fails.

<a name="getTab"></a>

### getTab

```
getTab(tabId: number): Promise<chrome.tabs.Tab>
```

Retrieves information about the specified tab. Resolves with the `Tab` object.

<a name="getCurrentTab"></a>

### getCurrentTab

```
getCurrentTab(): Promise<chrome.tabs.Tab | undefined>
```

Retrieves the tab in which the script is running (e.g., popup or content script). Resolves with the `Tab` or `undefined` if not called in a tab context.

<a name="getTabZoom"></a>

### getTabZoom

```
getTabZoom(tabId: number): Promise<number>
```

Gets the zoom factor of the specified tab. Resolves with the zoom level (e.g., `1.0`).

<a name="getTabZoomSettings"></a>

### getTabZoomSettings

```
getTabZoomSettings(tabId: number): Promise<chrome.tabs.ZoomSettings>
```

Retrieves the zoom settings of the specified tab. Resolves with a `ZoomSettings` object.

<a name="goTabBack"></a>

### goTabBack

```
goTabBack(tabId: number): Promise<void>
```

Navigates the specified tab one step backward in its history.

<a name="goTabForward"></a>

### goTabForward

```
goTabForward(tabId: number): Promise<void>
```

Navigates the specified tab one step forward in its history.

<a name="groupTabs"></a>

### groupTabs

```
groupTabs(options: chrome.tabs.GroupOptions): Promise<number>
```

Groups one or more tabs into a single tab group. Resolves with the group ID.

<a name="highlightTab"></a>

### highlightTab

```
highlightTab(highlightInfo: chrome.tabs.HighlightInfo): Promise<chrome.windows.Window>
```

Highlights (selects) the specified tabs within a window. Resolves with the updated `Window`.

<a name="moveTab"></a>

### moveTab

```
moveTab(tabId: number, moveProperties: chrome.tabs.MoveProperties): Promise<chrome.tabs.Tab>
```

Moves a tab to a new index or window. Resolves with the moved `Tab`.

<a name="moveTabs"></a>

### moveTabs

```
moveTabs(tabIds: number[], moveProperties: chrome.tabs.MoveProperties): Promise<chrome.tabs.Tab[]>
```

Moves multiple tabs to new positions. Resolves with an array of updated `Tab` objects.

<a name="queryTabs"></a>

### queryTabs

```
queryTabs(queryInfo?: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>
```

Retrieves all tabs that match the given query filters. Resolves with an array of `Tab` objects.

<a name="reloadTab"></a>

### reloadTab

```
reloadTab(tabId: number, bypassCache?: boolean): Promise<void>
```

Reloads the specified tab. If `bypassCache` is `true`, forces resource revalidation.

<a name="removeTab"></a>

### removeTab

```
removeTab(tabId: number): Promise<void>
```

Closes the specified tab.

<a name="sendTabMessage"></a>

### sendTabMessage

```
sendTabMessage<M = any, R = any>(tabId: number, message: M, options?: chrome.tabs.MessageSendOptions): Promise<R>
```

Sends a one-time message to the content script in the specified tab. Resolves with the response.

<a name="setTabZoom"></a>

### setTabZoom

```
setTabZoom(tabId: number, zoomFactor: number): Promise<void>
```

Sets the zoom factor for the specified tab.

<a name="setTabZoomSettings"></a>

### setTabZoomSettings

```
setTabZoomSettings(tabId: number, zoomSettings: chrome.tabs.ZoomSettings): Promise<void>
```

Updates the zoom settings for the specified tab.

<a name="ungroupTab"></a>

### ungroupTab

```
ungroupTab(tabIds: number | number[]): Promise<void>
```

Removes one or more tabs from their group.

<a name="updateTab"></a>

### updateTab

```
updateTab(tabId: number, updateProperties: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab | undefined>
```

Updates properties of the specified tab (e.g., URL, active state). Resolves with the updated `Tab` or `undefined`.

<a name="executeScriptTab"></a>

### executeScriptTab

```
executeScriptTab(tabId: number, details: chrome.extensionTypes.InjectDetails): Promise<any[]>
```

Injects JavaScript into the specified tab and returns execution results.

<a name="getTabUrl"></a>

### getTabUrl

```
getTabUrl(tabId: number): Promise<string>
```

Retrieves the URL of the specified tab. Rejects if the tab does not exist or has no URL.

<a name="getActiveTab"></a>

### getActiveTab

```
getActiveTab(): Promise<chrome.tabs.Tab>
```

Gets the currently active tab in the current window. Rejects if no active tab is found.

<a name="queryTabIds"></a>

### queryTabIds

```
queryTabIds(queryInfo?: chrome.tabs.QueryInfo): Promise<number[]>
```

Retrieves IDs of tabs matching the given query.

<a name="findTab"></a>

### findTab

```
findTab(queryInfo?: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab | undefined>
```

Finds the first tab matching the query. Resolves with the `Tab` or `undefined`.

<a name="findTabById"></a>

### findTabById

```
findTabById(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Finds a tab by its ID, or resolves with `undefined` if not found.

<a name="updateTabAsSelected"></a>

### updateTabAsSelected

```
updateTabAsSelected(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Highlights the specified tab, making it selected.

<a name="updateTabAsActive"></a>

### updateTabAsActive

```
updateTabAsActive(tabId: number): Promise<chrome.tabs.Tab | undefined>
```

Sets the specified tab as active.

<a name="openOrCreateTab"></a>

### openOrCreateTab

```
openOrCreateTab(tab: chrome.tabs.Tab): Promise<void>
```

If a tab with the same URL exists, activates it; otherwise, creates a new tab.

<a name="onTabActivated"></a>

### onTabActivated

```
onTabActivated(callback: (activeInfo: chrome.tabs.TabActiveInfo) => void): () => void
```

Fires when the active tab in a window changes. Returns a function to remove the listener.

<a name="onTabAttached"></a>

### onTabAttached

```
onTabAttached(callback: (info: chrome.tabs.TabAttachedInfo) => void): () => void
```

Fires when a tab is attached to a window. Returns a function to remove the listener.

<a name="onTabCreated"></a>

### onTabCreated

```
onTabCreated(callback: (tab: chrome.tabs.Tab) => void): () => void
```

Fires when a new tab is created. Returns a function to remove the listener.

<a name="onTabDetached"></a>

### onTabDetached

```
onTabDetached(callback: (info: chrome.tabs.TabDetachedInfo) => void): () => void
```

Fires when a tab is detached from a window. Returns a function to remove the listener.

<a name="onTabHighlighted"></a>

### onTabHighlighted

```
onTabHighlighted(callback: (highlightInfo: chrome.tabs.TabHighlightInfo) => void): () => void
```

Fires when the highlighted status of tabs in a window changes. Returns a function to remove the listener.

<a name="onTabMoved"></a>

### onTabMoved

```
onTabMoved(callback: (moveInfo: chrome.tabs.TabMoveInfo) => void): () => void
```

Fires when a tab is moved within a window. Returns a function to remove the listener.

<a name="onTabRemoved"></a>

### onTabRemoved

```
onTabRemoved(callback: (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void): () => void
```

Fires when a tab is closed. Returns a function to remove the listener.

<a name="onTabReplaced"></a>

### onTabReplaced

```
onTabReplaced(callback: (addedTabId: number, removedTabId: number) => void): () => void
```

Fires when one tab replaces another. Returns a function to remove the listener.

<a name="onTabUpdated"></a>

### onTabUpdated

```
onTabUpdated(callback: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void): () => void
```

Fires when a tab is updated (e.g., URL change, status). Returns a function to remove the listener.

<a name="onTabZoomChange"></a>

### onTabZoomChange

```
onTabZoomChange(callback: (zoomChangeInfo: chrome.tabs.ZoomChangeInfo) => void): () => void
```

Fires when the zoom level of a tab changes. Returns a function to remove the listener.

- [onTabActivated](#onTabActivated)
- [onTabAttached](#onTabAttached)
- [onTabCreated](#onTabCreated)
- [onTabDetached](#onTabDetached)
- [onTabHighlighted](#onTabHighlighted)
- [onTabMoved](#onTabMoved)
- [onTabRemoved](#onTabRemoved)
- [onTabReplaced](#onTabReplaced)
- [onTabUpdated](#onTabUpdated)
- [onTabZoomChange](#onTabZoomChange)

<a name="userscripts"></a>

## userScripts

**Documentation:** [Chrome User Scripts API](https://developer.chrome.com/docs/extensions/reference/userScripts)

A promise-based wrapper for the Chrome `userScripts` API, providing methods to configure worlds, register, retrieve, update, and unregister user scripts.

### Methods

- [configureUserScriptsWorld(properties)](#configureUserScriptsWorld)
- [getUserScripts(ids)](#getUserScripts)
- [getUserScriptsWorldConfigs()](#getUserScriptsWorldConfigs)
- [registerUserScripts(scripts)](#registerUserScripts)
- [resetUserScriptsWorldConfigs(worldId)](#resetUserScriptsWorldConfigs)
- [unregisterUserScripts(ids)](#unregisterUserScripts)
- [updateUserScripts(scripts)](#updateUserScripts)

<a name="configureUserScriptsWorld"></a>

### configureUserScriptsWorld

```
configureUserScriptsWorld(properties?: chrome.userScripts.WorldProperties): Promise<void>
```

Configures the execution context for user scripts by setting world properties. Must be called before registering or executing scripts.

<a name="getUserScripts"></a>

### getUserScripts

```
getUserScripts(ids?: string[]): Promise<chrome.userScripts.RegisteredUserScript[]>
```

Retrieves registered user scripts, optionally filtered by script IDs.

<a name="getUserScriptsWorldConfigs"></a>

### getUserScriptsWorldConfigs

```
getUserScriptsWorldConfigs(): Promise<chrome.userScripts.WorldProperties[]>
```

Returns configurations for all script execution worlds.

<a name="registerUserScripts"></a>

### registerUserScripts

```
registerUserScripts(scripts: chrome.userScripts.RegisteredUserScript[]): Promise<void>
```

Registers one or more user scripts with the browser.

<a name="resetUserScriptsWorldConfigs"></a>

### resetUserScriptsWorldConfigs

```
resetUserScriptsWorldConfigs(worldId: string): Promise<void>
```

Resets the configuration of a specific world back to default settings.

<a name="unregisterUserScripts"></a>

### unregisterUserScripts

```
unregisterUserScripts(ids?: string[]): Promise<void>
```

Unregisters user scripts by ID. If no IDs provided, all scripts are unregistered.

<a name="updateUserScripts"></a>

### updateUserScripts

```
updateUserScripts(scripts: chrome.userScripts.RegisteredUserScript[]): Promise<void>
```

Updates existing user scripts with new definitions or metadata.

<a name="webnavigation"></a>

## webNavigation

**Documentation:** [Chrome WebNavigation API](https://developer.chrome.com/docs/extensions/reference/webNavigation)

A promise-based wrapper for the Chrome `webNavigation` API, providing methods to retrieve frame information and listen to navigation events.

### Methods

- [getAllFrames(tabId)](#getAllFrames)
- [getFrame(details)](#getFrame)

### Events

- [onWebNavigationBeforeNavigate(callback, filters)](#onWebNavigationBeforeNavigate)
- [onWebNavigationCommitted(callback, filters)](#onWebNavigationCommitted)
- [onWebNavigationCompleted(callback, filters)](#onWebNavigationCompleted)
- [onWebNavigationCreatedNavigationTarget(callback, filters)](#onWebNavigationCreatedNavigationTarget)
- [onWebNavigationDOMContentLoaded(callback, filters)](#onWebNavigationDOMContentLoaded)
- [onWebNavigationErrorOccurred(callback, filters)](#onWebNavigationErrorOccurred)
- [onWebNavigationHistoryStateUpdated(callback, filters)](#onWebNavigationHistoryStateUpdated)
- [onWebNavigationReferenceFragmentUpdated(callback, filters)](#onWebNavigationReferenceFragmentUpdated)
- [onWebNavigationTabReplaced(callback)](#onWebNavigationTabReplaced)

<a name="getAllFrames"></a>

### getAllFrames

```
getAllFrames(tabId: number): Promise<chrome.webNavigation.GetAllFrameResultDetails[]>
```

Retrieves information about all frames in the specified tab.

<a name="getFrame"></a>

### getFrame

```
getFrame(details: chrome.webNavigation.GetFrameDetails): Promise<chrome.webNavigation.GetFrameResultDetails | null>
```

Retrieves information about a specific frame. Rejects if the frame is not found.

<a name="onWebNavigationBeforeNavigate"></a>

### onWebNavigationBeforeNavigate

```
onWebNavigationBeforeNavigate(callback: (details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => void, filters?: chrome.webNavigation.WebNavigationEventFilter): () => void
```

Adds a listener that is called before a navigation occurs.

<a name="onWebNavigationCommitted"></a>

### onWebNavigationCommitted

```
onWebNavigationCommitted(callback: (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void, filters?: chrome.webNavigation.WebNavigationEventFilter): () => void
```

Adds a listener that is called when a navigation is committed.

<a name="onWebNavigationCompleted"></a>

### onWebNavigationCompleted

```
onWebNavigationCompleted(callback: (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void, filters?: chrome.webNavigation.WebNavigationEventFilter): () => void
```

Adds a listener that is called when a document, including its resources, is completely loaded.

<a name="onWebNavigationCreatedNavigationTarget"></a>

### onWebNavigationCreatedNavigationTarget

```
onWebNavigationCreatedNavigationTarget(callback: (details: chrome.webNavigation.WebNavigationSourceCallbackDetails) => void, filters?: chrome.webNavigation.WebNavigationEventFilter): () => void
```

Adds a listener that is called when a new window or tab is created to host a navigation.

<a name="onWebNavigationDOMContentLoaded"></a>

### onWebNavigationDOMContentLoaded

```
onWebNavigationDOMContentLoaded(callback: (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void, filters?: chrome.webNavigation.WebNavigationEventFilter): () => void
```

Adds a listener that is called when the page's DOM is fully constructed.

<a name="onWebNavigationErrorOccurred"></a>

### onWebNavigationErrorOccurred

```
onWebNavigationErrorOccurred(callback: (details: chrome.webNavigation.WebNavigationFramedErrorCallbackDetails) => void, filters?: chrome.webNavigation.WebNavigationEventFilter): () => void
```

Adds a listener that is called when an error occurs and a navigation is aborted.

<a name="onWebNavigationHistoryStateUpdated"></a>

### onWebNavigationHistoryStateUpdated

```
onWebNavigationHistoryStateUpdated(callback: (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void, filters?: chrome.webNavigation.WebNavigationEventFilter): () => void
```

Adds a listener that is called when a frame's history is updated to a new URL.

<a name="onWebNavigationReferenceFragmentUpdated"></a>

### onWebNavigationReferenceFragmentUpdated

```
onWebNavigationReferenceFragmentUpdated(callback: (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void, filters?: chrome.webNavigation.WebNavigationEventFilter): () => void
```

Adds a listener that is called when the reference fragment of a frame is updated.

<a name="onWebNavigationTabReplaced"></a>

### onWebNavigationTabReplaced

```
onWebNavigationTabReplaced(callback: (details: chrome.webNavigation.WebNavigationReplacementCallbackDetails) => void): () => void
```

Adds a listener that is called when a tab is replaced by another tab.

<a name="webrequest"></a>

## webRequest

**Documentation:** [Chrome WebRequest API](https://developer.chrome.com/docs/extensions/reference/webRequest)

A promise-based wrapper for the Chrome `webRequest` API, providing methods to observe and modify network requests through various lifecycle events.

### Methods

- [handlerWebRequestBehaviorChanged](#handlerWebRequestBehaviorChanged)

### Events

- [onWebRequestAuthRequired](#onWebRequestAuthRequired)
- [onWebRequestBeforeRedirect](#onWebRequestBeforeRedirect)
- [onWebRequestBeforeRequest](#onWebRequestBeforeRequest)
- [onWebRequestBeforeSendHeaders](#onWebRequestBeforeSendHeaders)
- [onWebRequestSendHeaders](#onWebRequestSendHeaders)
- [onWebRequestHeadersReceived](#onWebRequestHeadersReceived)
- [onWebRequestResponseStarted](#onWebRequestResponseStarted)
- [onWebRequestCompleted](#onWebRequestCompleted)
- [onWebRequestErrorOccurred](#onWebRequestErrorOccurred)

<a name="handlerWebRequestBehaviorChanged"></a>

### handlerWebRequestBehaviorChanged

```
handlerWebRequestBehaviorChanged(): Promise<void>
```

Notifies the browser that the extension's webRequest handling logic (filters or listeners) has changed, prompting the browser to update its internal event routing.

<a name="onWebRequestAuthRequired"></a>

### onWebRequestAuthRequired

```
onWebRequestAuthRequired(callback: (details: chrome.webRequest.OnAuthRequiredDetails, asyncCallback?: (response: chrome.webRequest.BlockingResponse) => void) => chrome.webRequest.BlockingResponse | void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener for authentication challenges. You can provide credentials, cancel the request, or take no action. Returns a function to remove the listener.

<a name="onWebRequestBeforeRedirect"></a>

### onWebRequestBeforeRedirect

```
onWebRequestBeforeRedirect(callback: (details: chrome.webRequest.OnBeforeRedirectDetails) => void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener fired before a server-initiated redirect occurs. Returns a function to remove the listener.

<a name="onWebRequestBeforeRequest"></a>

### onWebRequestBeforeRequest

```
onWebRequestBeforeRequest(callback: (details: chrome.webRequest.OnBeforeRequestDetails) => chrome.webRequest.BlockingResponse | void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener fired before a request is made. Can cancel or redirect the request by returning a BlockingResponse. Returns a function to remove the listener.

<a name="onWebRequestBeforeSendHeaders"></a>

### onWebRequestBeforeSendHeaders

```
onWebRequestBeforeSendHeaders(callback: (details: chrome.webRequest.OnBeforeSendHeadersDetails) => chrome.webRequest.BlockingResponse | void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener fired before HTTP request headers are sent. Can modify or cancel the request headers. Returns a function to remove the listener.

<a name="onWebRequestSendHeaders"></a>

### onWebRequestSendHeaders

```
onWebRequestSendHeaders(callback: (details: chrome.webRequest.OnSendHeadersDetails) => void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener fired after HTTP request headers are sent. Returns a function to remove the listener.

<a name="onWebRequestHeadersReceived"></a>

### onWebRequestHeadersReceived

```
onWebRequestHeadersReceived(callback: (details: chrome.webRequest.OnHeadersReceivedDetails) => chrome.webRequest.BlockingResponse | void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener fired when HTTP response headers are received. Can modify response headers or cancel the request. Returns a function to remove the listener.

<a name="onWebRequestResponseStarted"></a>

### onWebRequestResponseStarted

```
onWebRequestResponseStarted(callback: (details: chrome.webRequest.OnResponseStartedDetails) => void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener fired when the first byte of the response body is received. Returns a function to remove the listener.

<a name="onWebRequestCompleted"></a>

### onWebRequestCompleted

```
onWebRequestCompleted(callback: (details: chrome.webRequest.OnCompletedDetails) => void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener fired when a request is completed successfully. Returns a function to remove the listener.

<a name="onWebRequestErrorOccurred"></a>

### onWebRequestErrorOccurred

```
onWebRequestErrorOccurred(callback: (details: chrome.webRequest.OnErrorOccurredDetails) => void, filter: chrome.webRequest.RequestFilter, extraInfoSpec?: string[]): () => void
```

Adds a listener fired when a request encounters an error and is aborted. Returns a function to remove the listener.
