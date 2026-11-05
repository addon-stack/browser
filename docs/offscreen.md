# offscreen

Documentation: [Chrome Offscreen API](https://developer.chrome.com/docs/extensions/reference/offscreen)

A promise-based wrapper for the Chrome `offscreen` API to create and manage offscreen documents.

## Methods

- [isAvailableOffscreen()](#isAvailableOffscreen)
- [createOffscreen(parameters)](#createOffscreen)
- [closeOffscreen()](#closeOffscreen)
- [hasOffscreen()](#hasOffscreen)
- [getOffscreenContext()](#getOffscreenContext)
- [getOffscreenUrl()](#getOffscreenUrl)
- [getOffscreenPath()](#getOffscreenPath)
- [hasOffscreenUrl(url)](#hasOffscreenUrl)
- [hasOffscreenPath(path)](#hasOffscreenPath)

---

<a name="isAvailableOffscreen"></a>

### isAvailableOffscreen

```ts
isAvailableOffscreen(method?: ApiMethodName<typeof chrome.offscreen>): boolean
```

The optional `method` is a native function name, for example `isAvailableOffscreen("hasDocument")`.
Import the public `ApiMethodName` type from `@addon-core/browser` for your own typed helpers.
This checks callable presence without invoking the method; permissions and argument support still require handling.

Returns `true` when the `offscreen` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
Without an argument, it checks namespace presence only. Pass a native method name to also check that it is callable.
Neither form verifies permissions, argument support, or a successful operation. See [method availability](safari.md).

```ts
import {isAvailableOffscreen} from "@addon-core/browser";

if (isAvailableOffscreen()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

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

Directly proxies the native `offscreen.hasDocument()` method. Resolves to its boolean result and preserves
native errors as Promise rejections; this method does not convert failures into `false`.

<a name="getOffscreenContext"></a>

### getOffscreenContext

```
getOffscreenContext(): Promise<chrome.runtime.ExtensionContext | undefined>
```

Returns the current offscreen document context, if one is open.

<a name="getOffscreenUrl"></a>

### getOffscreenUrl

```
getOffscreenUrl(): Promise<string | undefined>
```

Returns the current offscreen document URL, if one is open.

<a name="getOffscreenPath"></a>

### getOffscreenPath

```
getOffscreenPath(): Promise<string | undefined>
```

Returns the current offscreen document path within the extension, if one is open. Query parameters and hash fragments are not included.

<a name="hasOffscreenUrl"></a>

### hasOffscreenUrl

```
hasOffscreenUrl(url: string): Promise<boolean>
```

Returns `true` when the current offscreen document matches the given URL. Returns `false` when no match
can be confirmed, including missing APIs or failed context queries. Does not throw, reject, log, or cache.
Use `getOffscreenUrl()` when query errors must remain observable.

<a name="hasOffscreenPath"></a>

### hasOffscreenPath

```
hasOffscreenPath(path: string): Promise<boolean>
```

Returns `true` when the current offscreen document matches the given extension path. Query parameters
and hash fragments are ignored. Returns `false` when no match can be confirmed, including API access,
context lookup, and URL parsing failures. Does not throw, reject, log, or cache.
Use `getOffscreenPath()` when query errors must remain observable.
