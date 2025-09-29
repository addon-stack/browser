# management

Documentation: [Chrome Management API](https://developer.chrome.com/docs/extensions/reference/management)

A promise-based wrapper for the Chrome `management` API to manage extensions and apps.

## Methods

- [createAppShortcut(id)](#createAppShortcut)
- [generateAppForLink(url, title)](#generateAppForLink)
- [getExtensionInfo(id)](#getExtensionInfo)
- [getAllExtensionInfo()](#getAllExtensionInfo)
- [getPermissionWarningsById(id)](#getPermissionWarningsById)
- [getPermissionWarningsByManifest(manifestStr)](#getPermissionWarningsByManifest)
- [getCurrentExtension()](#getCurrentExtension)
- [launchExtensionApp(id)](#launchExtensionApp)
- [setExtensionEnabled(id, enabled)](#setExtensionEnabled)
- [setExtensionLaunchType(id, launchType)](#setExtensionLaunchType)
- [uninstallExtension(id, showConfirmDialog?)](#uninstallExtension)
- [uninstallCurrentExtension(showConfirmDialog?)](#uninstallCurrentExtension)

## Events

- [onExtensionDisabled(callback)](#onExtensionDisabled)
- [onExtensionEnabled(callback)](#onExtensionEnabled)
- [onExtensionInstalled(callback)](#onExtensionInstalled)
- [onExtensionUninstalled(callback)](#onExtensionUninstalled)

---

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

Sets the launch type (for example, regular or pinned) for the specified extension.

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
onExtensionDisabled(
  callback: (info: chrome.management.ExtensionInfo) => void
): () => void
```

Adds a listener that fires when an extension or app is disabled. Returns an unsubscribe function.

<a name="onExtensionEnabled"></a>

### onExtensionEnabled

```
onExtensionEnabled(
  callback: (info: chrome.management.ExtensionInfo) => void
): () => void
```

Adds a listener that fires when an extension or app is enabled. Returns an unsubscribe function.

<a name="onExtensionInstalled"></a>

### onExtensionInstalled

```
onExtensionInstalled(
  callback: (info: chrome.management.ExtensionInfo) => void
): () => void
```

Adds a listener that fires when an extension or app is installed. Returns an unsubscribe function.

<a name="onExtensionUninstalled"></a>

### onExtensionUninstalled

```
onExtensionUninstalled(
  callback: (extensionId: string) => void
): () => void
```

Adds a listener that fires when an extension or app is uninstalled, passing its ID. Returns an unsubscribe function.
