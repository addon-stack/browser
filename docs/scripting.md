# scripting

Documentation: [Chrome Scripting API](https://developer.chrome.com/docs/extensions/reference/scripting)

A promise-based wrapper for the Chrome `scripting` API to inject scripts and styles, and manage content scripts.

## Methods

- [executeScript(injection)](#executeScript)
- [getRegisteredContentScripts(filter?)](#getRegisteredContentScripts)
- [insertCss(injection)](#insertCss)
- [registerContentScripts(scripts)](#registerContentScripts)
- [removeCss(injection)](#removeCss)
- [unregisterContentScripts(filter?)](#unregisterContentScripts)
- [updateContentScripts(scripts)](#updateContentScripts)
- [isAvailableScripting()](#isAvailableScripting)

---

<a name="executeScript"></a>

### executeScript

```
executeScript<T = any>(
  injection: chrome.scripting.ScriptInjection<any, T>
): Promise<chrome.scripting.InjectionResult<chrome.scripting.Awaited<T>>[]>
```

Executes a script in the specified target and returns the injection results.

<a name="getRegisteredContentScripts"></a>

### getRegisteredContentScripts

```
getRegisteredContentScripts(
  filter?: chrome.scripting.ContentScriptFilter
): Promise<chrome.scripting.RegisteredContentScript[]>
```

Retrieves registered content scripts, optionally filtered by criteria.

<a name="insertCss"></a>

### insertCss

```
insertCss(injection: chrome.scripting.CSSInjection): Promise<void>
```

Injects CSS into specified target pages.

<a name="registerContentScripts"></a>

### registerContentScripts

```
registerContentScripts(
  scripts: chrome.scripting.RegisteredContentScript[]
): Promise<void>
```

Registers one or more content scripts programmatically.

<a name="removeCss"></a>

### removeCss

```
removeCss(injection: chrome.scripting.CSSInjection): Promise<void>
```

Removes previously injected CSS from specified target pages.

<a name="unregisterContentScripts"></a>

### unregisterContentScripts

```
unregisterContentScripts(
  filter?: chrome.scripting.ContentScriptFilter
): Promise<void>
```

Unregisters content scripts matching the given filter.

<a name="updateContentScripts"></a>

### updateContentScripts

```
updateContentScripts(
  scripts: chrome.scripting.RegisteredContentScript[]
): Promise<void>
```

Updates existing content scripts with new definitions.

<a name="isAvailableScripting"></a>

### isAvailableScripting

```
isAvailableScripting(): boolean
```

Checks if the Scripting API is available in the current browser.
