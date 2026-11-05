# alarms

Documentation: [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms)

A promise-based wrapper for the Chrome `alarms` API.

## Methods

- [isAvailableAlarms()](#isAvailableAlarms)
- [clearAlarm(name)](#clearAlarm)
- [clearAllAlarm()](#clearAllAlarm)
- [createAlarm(name, info)](#createAlarm)
- [createAlarmIfNotExists(name, info)](#createAlarmIfNotExists)
- [getAlarm(name)](#getAlarm)
- [getAllAlarm()](#getAllAlarm)

## Events

- [onAlarm(callback)](#onAlarm)
- [onSpecificAlarm(name, callback)](#onSpecificAlarm)
- [onSpecificAlarms(handlers)](#onSpecificAlarms)

<a name="isAvailableAlarms"></a>

### isAvailableAlarms

```ts
isAvailableAlarms(method?: ApiMethodName<typeof chrome.alarms>): boolean
```

The optional `method` is a native function name, for example `isAvailableAlarms("clear")`.
Import the public `ApiMethodName` type from `@addon-core/browser` for your own typed helpers.
This checks callable presence without invoking the method; permissions and argument support still require handling.

Returns `true` when the `alarms` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
Without an argument, it checks namespace presence only. Pass a native method name to also check that it is callable.
Neither form verifies permissions, argument support, or a successful operation. See [method availability](safari.md).

```ts
import {isAvailableAlarms} from "@addon-core/browser";

if (isAvailableAlarms()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

<a name="clearAlarm"></a>

### clearAlarm

```
clearAlarm(name: string): Promise<boolean>
```

Clears the alarm with the specified name and preserves a native boolean when provided. WebKit first reads whether
the alarm exists; older implementations that report no removal result use this earlier observation. That fallback
is not atomic: another context or alarm firing can change the state between the read and deletion.
Chromium and Firefox perform no pre-read. An unexpected missing/non-boolean result outside the legacy WebKit fallback
rejects the Promise rather than silently reporting `false`. Read and deletion errors also reject.

<a name="clearAllAlarm"></a>

### clearAllAlarm

```
clearAllAlarm(): Promise<boolean>
```

Clears all alarms and returns whether the collection read immediately before deletion was nonempty. Every browser
uses `getAll` followed by `clearAll`; native removal results are ignored. This gives one boolean contract despite
Chromium returning `true` for an empty collection and Firefox 159/legacy WebKit reporting no result.
The read and deletion are not atomic: another context or alarm firing may change the collection between them.
Read and deletion errors reject instead of returning the earlier observation.

This changes the previous native-result behavior: an empty Chromium collection now returns `false`.

<a name="createAlarm"></a>

### createAlarm

```
createAlarm(name: string, info: chrome.alarms.AlarmCreateInfo): Promise<void>
```

Creates a new alarm or updates an existing one with the given name and scheduling options.
The wrapper uses WebKit's supported two-argument call, handling both its older synchronous return and newer Promise.
Native synchronous errors and Promise rejections reject the public `Promise<void>`.

<a name="createAlarmIfNotExists"></a>

### createAlarmIfNotExists

```ts
createAlarmIfNotExists(name: string, info: chrome.alarms.AlarmCreateInfo): Promise<boolean>
```

Creates an alarm only if no alarm with the given name exists. Returns `true` after creation, or `false` if the alarm
already exists. An existing alarm keeps its schedule and the supplied `info` is ignored. Lookup and creation errors
reject the returned Promise.

The lookup and creation are separate operations, so concurrent calls for the same name are not atomic and may both
attempt to create the alarm.

```ts
await createAlarmIfNotExists("sync", {periodInMinutes: 5});
```

<a name="getAlarm"></a>

### getAlarm

```
getAlarm(name: string): Promise<chrome.alarms.Alarm | undefined>
```

Retrieves details for the alarm with the specified name, or `undefined` if it does not exist.

<a name="getAllAlarm"></a>

### getAllAlarm

```
getAllAlarm(): Promise<chrome.alarms.Alarm[]>
```

Retrieves all set alarms.

<a name="onAlarm"></a>

### onAlarm

```
onAlarm(callback: (alarm: chrome.alarms.Alarm) => void): () => void
```

Adds a listener that triggers when an alarm goes off. Returns an unsubscribe function.

<a name="onSpecificAlarm"></a>

### onSpecificAlarm

```ts
onSpecificAlarm(name: string, callback: (alarm: chrome.alarms.Alarm) => void): () => void
```

Adds a listener that triggers only when the alarm name exactly matches `name`. Passes the complete alarm object to
the callback and returns an unsubscribe function. The callback may be async; synchronous errors and rejected Promises
are logged by the listener wrapper.

```ts
const unsubscribe = onSpecificAlarm("sync", async alarm => {
    console.log("Scheduled time:", alarm.scheduledTime);
    await syncData();
});

// Remove this listener when it is no longer needed.
unsubscribe();
```

<a name="onSpecificAlarms"></a>

### onSpecificAlarms

```ts
onSpecificAlarms(handlers: Record<string, (alarm: chrome.alarms.Alarm) => void>): () => void
```

Subscribes to several named alarms using one object: each key is an alarm name and each value is its callback.
When an alarm fires, the handler whose key exactly matches `alarm.name` receives the complete alarm object.
Names are case-sensitive. Unmatched names and inherited properties are ignored; an empty object is also accepted.

Uses one underlying `onAlarm` subscription for the entire object and returns one unsubscribe function that
removes it. Callbacks may be async; synchronous errors and rejected Promises are logged by the listener wrapper.

```ts
import {onSpecificAlarms} from "@addon-core/browser";

const unsubscribe = onSpecificAlarms({
    sync: async alarm => {
        console.log("Sync scheduled time:", alarm.scheduledTime);
        await syncData();
    },
    cleanup: async alarm => {
        console.log("Cleanup scheduled time:", alarm.scheduledTime);
        await cleanupData();
    },
});

// Remove the subscription for all handlers in this object.
unsubscribe();
```
