# commands

Documentation: [Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/commands)

A promise-based wrapper for the Chrome `commands` API.

## Methods

- [isAvailableCommands()](#isAvailableCommands)
- [getAllCommands()](#getAllCommands)

## Events

- [onCommand(callback)](#onCommand)
- [onSpecificCommand(command, callback)](#onSpecificCommand)
- [onSpecificCommands(handlers)](#onSpecificCommands)

---

<a name="isAvailableCommands"></a>

### isAvailableCommands

```ts
isAvailableCommands(): boolean
```

Returns `true` when the `commands` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
It checks namespace presence only; it does not guarantee individual methods, permissions, or a successful operation.

```ts
import {isAvailableCommands} from "@addon-core/browser";

if (isAvailableCommands()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

<a name="getAllCommands"></a>

### getAllCommands

```
getAllCommands(): Promise<chrome.commands.Command[]>
```

Retrieves all registered extension commands.

<a name="onCommand"></a>

### onCommand

```
onCommand(callback: (command: string, tab?: chrome.tabs.Tab) => void): () => void
```

Adds a listener for extension command events. Returns an unsubscribe function.

<a name="onSpecificCommand"></a>

### onSpecificCommand

```ts
onSpecificCommand(
    command: string,
    callback: (tab?: chrome.tabs.Tab) => any
): () => void
```

Adds a listener that triggers only when the specified command is invoked. The name match is exact and
case-sensitive. Returns an unsubscribe function that removes only this subscription.

The callback receives the tab supplied by the event, or `undefined` if no tab was supplied. It may be async;
synchronous errors and rejected Promises are logged by the listener wrapper.

```ts
import {onSpecificCommand} from "@addon-core/browser";

const unsubscribe = onSpecificCommand("sync", async tab => {
    console.log("Sync tab:", tab?.id);
    await syncData();
});

// Remove this subscription when it is no longer needed.
unsubscribe();
```

<a name="onSpecificCommands"></a>

### onSpecificCommands

```ts
onSpecificCommands(handlers: Record<string, (tab?: chrome.tabs.Tab) => any>): () => void
```

Subscribes to several named commands using one object: each key is a command name and each value is its callback.
When a command is invoked, the handler whose key exactly matches its name receives the tab supplied by the event,
or `undefined` if no tab was supplied. Names are case-sensitive. Unmatched names and inherited properties are
ignored; an empty object is also accepted.

Uses one underlying `onCommand` subscription for the entire object and returns one unsubscribe function that
removes it. Callbacks may be async; synchronous errors and rejected Promises are logged by the listener wrapper.

```ts
import {onSpecificCommands} from "@addon-core/browser";

const unsubscribe = onSpecificCommands({
    sync: async tab => {
        console.log("Sync tab:", tab?.id);
        await syncData();
    },
    cleanup: async tab => {
        console.log("Cleanup tab:", tab?.id);
        await cleanupData();
    },
});

// Remove the subscription for all handlers in this object.
unsubscribe();
```
