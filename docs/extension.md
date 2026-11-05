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
isAvailableExtension(method?: ApiMethodName<typeof chrome.extension>): boolean
```

The optional `method` is a native function name, for example `isAvailableExtension("getViews")`.
Import the public `ApiMethodName` type from `@addon-core/browser` for your own typed helpers.
This checks callable presence without invoking the method; permissions and argument support still require handling.

Returns `true` when the `extension` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
Without an argument, it checks namespace presence only. Pass a native method name to also check that it is callable.
Neither form verifies permissions, argument support, or a successful operation. See [method availability](safari.md).

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
