# idle

Documentation: [Chrome Idle API](https://developer.chrome.com/docs/extensions/reference/idle)

A promise-based wrapper for the Chrome `idle` API to monitor user idle state.

## Methods

- [getIdleAutoLockDelay()](#getIdleAutoLockDelay)
- [queryIdleState(detectionIntervalInSeconds)](#queryIdleState)
- [setIdleDetectionInterval(intervalInSeconds)](#setIdleDetectionInterval)

## Events

- [onIdleStateChanged(callback)](#onIdleStateChanged)

---

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
