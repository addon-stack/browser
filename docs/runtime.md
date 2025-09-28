# runtime

Documentation: [Chrome Runtime API](https://developer.chrome.com/docs/extensions/reference/runtime)

A wrapper for the Chrome `runtime` API, including messaging, updates, and lifecycle events.

## Methods

- [connect(extensionId, connectInfo?)](#connect)
- [connectNative(application)](#connectNative)
- [getContexts(filter)](#getContexts) [MV3]
- [getManifest()](#getManifest)
- [getId()](#getId)
- [getManifestVersion()](#getManifestVersion)
- [isManifestVersion3()](#isManifestVersion3)
- [getPackageDirectoryEntry()](#getPackageDirectoryEntry)
- [getPlatformInfo()](#getPlatformInfo)
- [getBrowserInfo()](#getBrowserInfo) [Firefox]
- [getUrl(path)](#getUrl)
- [openOptionsPage()](#openOptionsPage)
- [reload()](#reload)
- [requestUpdateCheck()](#requestUpdateCheck)
- [restart()](#restart) [MV3]
- [restartAfterDelay(seconds)](#restartAfterDelay) [MV3]
- [sendMessage(message)](#sendMessage)
- [setUninstallUrl(url)](#setUninstallUrl)

## Events

- [onConnect(callback)](#onConnect)
- [onConnectExternal(callback)](#onConnectExternal)
- [onInstalled(callback)](#onInstalled)
- [onMessage(callback)](#onMessage)
- [onMessageExternal(callback)](#onMessageExternal)
- [onRestartRequired(callback)](#onRestartRequired)
- [onStartup(callback)](#onStartup)
- [onSuspend(callback)](#onSuspend)
- [onSuspendCanceled(callback)](#onSuspendCanceled)
- [onUpdateAvailable(callback)](#onUpdateAvailable)
- [onUserScriptConnect(callback)](#onUserScriptConnect)
- [onUserScriptMessage(callback)](#onUserScriptMessage)

---

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

<a name="getBrowserInfo"></a>

### getBrowserInfo [Firefox]

```
getBrowserInfo(): Promise<{ name: string; vendor: string; version: string; buildID: string; }>
```

Returns information about the browser. Available only in Firefox.

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
requestUpdateCheck(): Promise<{ status: chrome.runtime.RequestUpdateCheckStatus; details?: chrome.runtime.UpdateCheckDetails; }>
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

Fires when a connection is made by another extension or content script. Returns an unsubscribe function.

<a name="onConnectExternal"></a>

### onConnectExternal

```
onConnectExternal(callback: (port: chrome.runtime.Port) => void): () => void
```

Fires when an external extension connects. Returns an unsubscribe function.

<a name="onInstalled"></a>

### onInstalled

```
onInstalled(callback: (details: chrome.runtime.InstalledDetails) => void): () => void
```

Fires when the extension is installed or updated. Returns an unsubscribe function.

<a name="onMessage"></a>

### onMessage

```
onMessage(
  callback: (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => void
): () => void
```

Fires when a message is sent to the extension. Returns an unsubscribe function.

<a name="onMessageExternal"></a>

### onMessageExternal

```
onMessageExternal(
  callback: (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => void
): () => void
```

Fires when a message is sent from another extension. Returns an unsubscribe function.

<a name="onRestartRequired"></a>

### onRestartRequired

```
onRestartRequired(callback: (reason: chrome.runtime.OnRestartRequiredReason) => void): () => void
```

Fires when a restart is required (e.g., after an OS or app update). Returns an unsubscribe function.

<a name="onStartup"></a>

### onStartup

```
onStartup(callback: () => void): () => void
```

Fires when the browser starts up. Returns an unsubscribe function.

<a name="onSuspend"></a>

### onSuspend

```
onSuspend(callback: () => void): () => void
```

Fires when the extension is being suspended. Returns an unsubscribe function.

<a name="onSuspendCanceled"></a>

### onSuspendCanceled

```
onSuspendCanceled(callback: () => void): () => void
```

Fires when a previously dispatched `onSuspend` event is canceled. Returns an unsubscribe function.

<a name="onUpdateAvailable"></a>

### onUpdateAvailable

```
onUpdateAvailable(callback: (details: chrome.runtime.UpdateAvailableDetails) => void): () => void
```

Fires when an update is available. Returns an unsubscribe function.

<a name="onUserScriptConnect"></a>

### onUserScriptConnect

```
onUserScriptConnect(callback: (port: chrome.runtime.Port) => void): () => void
```

Fires when a user script establishes a connection. Returns an unsubscribe function.

<a name="onUserScriptMessage"></a>

### onUserScriptMessage

```
onUserScriptMessage(
  callback: (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => void
): () => void
```

Fires when a message arrives from a user script. Returns an unsubscribe function.
