# alarms

Documentation: [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms)

A promise-based wrapper for the Chrome `alarms` API.

## Methods

- [clearAlarm(name)](#clearAlarm)
- [clearAllAlarm()](#clearAllAlarm)
- [createAlarm(name, info)](#createAlarm)
- [getAlarm(name)](#getAlarm)
- [getAllAlarm()](#getAllAlarm)

## Events

- [onAlarm(callback)](#onAlarm)

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