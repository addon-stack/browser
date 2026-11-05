# userScripts

Documentation: [Chrome User Scripts API](https://developer.chrome.com/docs/extensions/reference/userScripts)

A promise-based wrapper around the Chrome `userScripts` API. Note: This API is available in Manifest V3.

## Methods

- [configureUserScriptsWorld(properties?)](#configureUserScriptsWorld)
- [getUserScripts(ids?)](#getUserScripts)
- [getUserScriptsWorldConfigs()](#getUserScriptsWorldConfigs)
- [executeUserScript(injection)](#executeUserScript)
- [registerUserScripts(scripts)](#registerUserScripts)
- [resetUserScriptsWorldConfigs(worldId?)](#resetUserScriptsWorldConfigs)
- [unregisterUserScripts(ids?)](#unregisterUserScripts)
- [updateUserScripts(scripts)](#updateUserScripts)
- [isAvailableUserScripts()](#isAvailableUserScripts)

---

<a name="configureUserScriptsWorld"></a>

### configureUserScriptsWorld

```
configureUserScriptsWorld(properties?: chrome.userScripts.WorldProperties): Promise<void>
```

Configures the execution world for user scripts. If `properties` is omitted, defaults are used.

<a name="getUserScripts"></a>

### getUserScripts

```
getUserScripts(ids?: string[]): Promise<chrome.userScripts.RegisteredUserScript[]>
```

Retrieves registered user scripts. When `ids` is provided, returns only scripts with matching IDs.

<a name="getUserScriptsWorldConfigs"></a>

### getUserScriptsWorldConfigs

```
getUserScriptsWorldConfigs(): Promise<chrome.userScripts.WorldProperties[]>
```

Returns the currently configured user script worlds.

<a name="executeUserScript"></a>

### executeUserScript

```
executeUserScript(injection: chrome.userScripts.UserScriptInjection): Promise<chrome.userScripts.InjectionResult[]>
```

Executes a user script with the provided injection parameters and resolves with the results from all frames where it executed.

<a name="registerUserScripts"></a>

### registerUserScripts

```
registerUserScripts(scripts: chrome.userScripts.RegisteredUserScript[]): Promise<void>
```

Registers one or more user scripts.

<a name="resetUserScriptsWorldConfigs"></a>

### resetUserScriptsWorldConfigs

```
resetUserScriptsWorldConfigs(worldId?: string): Promise<void>
```

Resets the configuration of a specific world by ID, or all worlds if `worldId` is omitted.

<a name="unregisterUserScripts"></a>

### unregisterUserScripts

```
unregisterUserScripts(ids?: string[]): Promise<void>
```

Unregisters user scripts. When `ids` are provided, only scripts with those IDs are removed; otherwise, all registered scripts are removed.

<a name="updateUserScripts"></a>

### updateUserScripts

```
updateUserScripts(scripts: chrome.userScripts.RegisteredUserScript[]): Promise<void>
```

Updates previously registered user scripts with new definitions.

<a name="isAvailableUserScripts"></a>

### isAvailableUserScripts

```ts
isAvailableUserScripts(method?: ApiMethodName<typeof chrome.userScripts>): boolean
```

The optional `method` is a native function name, for example `isAvailableUserScripts("getScripts")`.
Import the public `ApiMethodName` type from `@addon-core/browser` for your own typed helpers.
This checks callable presence without invoking the method; permissions and argument support still require handling.

Returns `true` when the `userScripts` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
Without an argument, it checks namespace presence only. Pass a native method name to also check that it is callable.
Neither form verifies permissions, argument support, or a successful operation. See [method availability](safari.md).

In Chrome, the namespace can remain defined after user-script access is revoked until the context reloads.
This check does not call `getScripts()` to probe that access. See [Chrome’s availability guidance](https://developer.chrome.com/docs/extensions/reference/api/userScripts#check_for_api_availability).

```ts
import {isAvailableUserScripts} from "@addon-core/browser";

if (isAvailableUserScripts()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```
