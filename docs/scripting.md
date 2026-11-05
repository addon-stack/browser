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

```ts
isAvailableScripting(method?: ApiMethodName<typeof chrome.scripting>): boolean
```

The optional `method` is a native function name, for example `isAvailableScripting("executeScript")`.
Import the public `ApiMethodName` type from `@addon-core/browser` for your own typed helpers.
This checks callable presence without invoking the method; permissions and argument support still require handling.

Returns `true` when the `scripting` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
Without an argument, it checks namespace presence only. Pass a native method name to also check that it is callable.
Neither form verifies permissions, argument support, or a successful operation. See [method availability](safari.md).

```ts
import {isAvailableScripting} from "@addon-core/browser";

if (isAvailableScripting()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```
