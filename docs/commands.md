# commands

Documentation: [Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/commands)

A promise-based wrapper for the Chrome `commands` API.

## Methods

- [getAllCommands()](#getAllCommands)

## Events

- [onCommand(callback)](#onCommand)
- [onSpecificCommand(command, callback)](#onSpecificCommand)

---

<a name="getAllCommands"></a>

### getAllCommands

```
getAllCommands(): Promise<chrome.commands.Command[]>
```

Retrieves all registered extension commands.

<a name="onCommand"></a>

### onCommand

```
onCommand(callback: (command: string, tab: chrome.tabs.Tab) => void): () => void
```

Adds a listener for extension command events. Returns an unsubscribe function.

<a name="onSpecificCommand"></a>

### onSpecificCommand

```
onSpecificCommand(
  command: string,
  callback: (tab?: chrome.tabs.Tab) => any
): () => void
```

Adds a listener that triggers only when the specified command is invoked. Returns an unsubscribe function.
