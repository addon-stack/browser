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
isAvailableIdle(method?: ApiMethodName<typeof chrome.idle>): boolean
```

The optional `method` is a native function name, for example `isAvailableIdle("queryState")`.
Import the public `ApiMethodName` type from `@addon-core/browser` for your own typed helpers.
This checks callable presence without invoking the method; permissions and argument support still require handling.

Returns `true` when the `idle` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
Without an argument, it checks namespace presence only. Pass a native method name to also check that it is callable.
Neither form verifies permissions, argument support, or a successful operation. See [method availability](safari.md).

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
