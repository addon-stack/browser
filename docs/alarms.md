# alarms

Documentation: [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms)

A promise-based wrapper for the Chrome `alarms` API.

## Methods

- [clearAlarm(name)](#clearAlarm)
- [clearAllAlarm()](#clearAllAlarm)
- [createAlarm(name, info)](#createAlarm)
- [createAlarmIfNotExists(name, info)](#createAlarmIfNotExists)
- [getAlarm(name)](#getAlarm)
- [getAllAlarm()](#getAllAlarm)

## Events

- [onAlarm(callback)](#onAlarm)
- [onSpecificAlarm(name, callback)](#onSpecificAlarm)

<a name="clearAlarm"></a>

### clearAlarm

```
clearAlarm(name: string): Promise<boolean>
```

Clears the alarm with the specified name, returning `true` if an existing alarm was found and cleared.

<a name="clearAllAlarm"></a>

### clearAllAlarm

```
clearAllAlarm(): Promise<boolean>
```

Clears all alarms, returning `true` if any alarms were found and cleared.

<a name="createAlarm"></a>

### createAlarm

```
createAlarm(name: string, info: chrome.alarms.AlarmCreateInfo): Promise<void>
```

Creates a new alarm or updates an existing one with the given name and scheduling options.

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
