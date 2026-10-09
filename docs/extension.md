# extension

Documentation: [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/extension)

A promise-based wrapper for the Chrome `extension` API.

## Methods

- [isAvailableExtension()](#isAvailableExtension)
- [getBackgroundPage()](#getBackgroundPage)
- [getViews(properties?)](#getViews)
- [isAllowedFileSchemeAccess()](#isAllowedFileSchemeAccess)
- [isAllowedIncognitoAccess()](#isAllowedIncognitoAccess)
- [setUpdateUrlData(data)](#setUpdateUrlData)

---

<a name="isAvailableExtension"></a>

### isAvailableExtension

```ts
isAvailableExtension(): boolean
```

Returns `true` when the `extension` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
It checks namespace presence only; it does not guarantee individual methods, permissions, or a successful operation.

```ts
import {isAvailableExtension} from "@addon-core/browser";

if (isAvailableExtension()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

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
