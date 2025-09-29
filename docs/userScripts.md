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

```
isAvailableUserScripts(): boolean
```

Returns `true` if the `chrome.userScripts` API is available in the current environment (typically Manifest V3), otherwise `false`.
