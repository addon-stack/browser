# idle

Documentation: [Chrome Idle API](https://developer.chrome.com/docs/extensions/reference/idle)

A promise-based wrapper for the Chrome `idle` API to monitor user idle state.

## Methods

- [isAvailableIdle()](#isAvailableIdle)
- [getIdleAutoLockDelay()](#getIdleAutoLockDelay)
- [queryIdleState(detectionIntervalInSeconds)](#queryIdleState)
- [setIdleDetectionInterval(intervalInSeconds)](#setIdleDetectionInterval)

## Events

- [onIdleStateChanged(callback)](#onIdleStateChanged)

---

<a name="isAvailableIdle"></a>

### isAvailableIdle

```ts
isAvailableIdle(): boolean
```

Returns `true` when the `idle` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
It checks namespace presence only; it does not guarantee individual methods, permissions, or a successful operation.

```ts
import {isAvailableIdle} from "@addon-core/browser";

if (isAvailableIdle()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

<a name="getIdleAutoLockDelay"></a>

### getIdleAutoLockDelay

```
getIdleAutoLockDelay(): Promise<number>
```

Retrieves the number of seconds before the system auto-locks due to inactivity.

<a name="queryIdleState"></a>

### queryIdleState

```
queryIdleState(detectionIntervalInSeconds: number): Promise<chrome.idle.IdleState>
```

Queries the user's idle state within the specified detection interval.

<a name="setIdleDetectionInterval"></a>

### setIdleDetectionInterval

```
setIdleDetectionInterval(intervalInSeconds: number): void
```

Sets the interval, in seconds, used to detect idle state changes.

<a name="onIdleStateChanged"></a>

### onIdleStateChanged

```
onIdleStateChanged(
  callback: (newState: chrome.idle.IdleState) => void
): () => void
```

Adds a listener that fires when the user's idle state changes. Returns an unsubscribe function.
