# offscreen

Documentation: [Chrome Offscreen API](https://developer.chrome.com/docs/extensions/reference/offscreen)

A promise-based wrapper for the Chrome `offscreen` API to create and manage offscreen documents.

## Methods

- [createOffscreen(parameters)](#createOffscreen)
- [closeOffscreen()](#closeOffscreen)
- [hasOffscreen()](#hasOffscreen)
- [getOffscreenContext()](#getOffscreenContext)
- [getOffscreenUrl()](#getOffscreenUrl)
- [getOffscreenPath()](#getOffscreenPath)
- [hasOffscreenUrl(url)](#hasOffscreenUrl)
- [hasOffscreenPath(path)](#hasOffscreenPath)

---

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

Checks whether the current offscreen document matches the given URL.

<a name="hasOffscreenPath"></a>

### hasOffscreenPath

```
hasOffscreenPath(path: string): Promise<boolean>
```

Checks whether the current offscreen document matches the given extension path. Query parameters and hash fragments are ignored.
