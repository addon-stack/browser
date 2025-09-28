# offscreen

Documentation: [Chrome Offscreen API](https://developer.chrome.com/docs/extensions/reference/offscreen)

A promise-based wrapper for the Chrome `offscreen` API to create and manage offscreen documents.

## Methods

- [createOffscreen(parameters)](#createOffscreen)
- [closeOffscreen()](#closeOffscreen)
- [hasOffscreen()](#hasOffscreen)

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
