# notifications

Documentation: [Chrome Notifications API](https://developer.chrome.com/docs/extensions/reference/notifications)

A promise-based wrapper for the Chrome `notifications` API to create and manage desktop notifications.

## Methods

- [clearNotification(notificationId)](#clearNotification)
- [createNotification(options, notificationId?)](#createNotification)
- [getAllNotifications()](#getAllNotifications)
- [getNotificationPermissionLevel()](#getNotificationPermissionLevel)
- [updateNotification(options, notificationId)](#updateNotification)
- [isAvailableNotifications()](#isAvailableNotifications)
- [clearAllNotifications()](#clearAllNotifications)

## Events

- [onNotificationsButtonClicked(callback)](#onNotificationsButtonClicked)
- [onNotificationsClicked(callback)](#onNotificationsClicked)
- [onNotificationsClosed(callback)](#onNotificationsClosed)
- [onNotificationsPermissionLevelChanged(callback)](#onNotificationsPermissionLevelChanged)

---

<a name="clearNotification"></a>

### clearNotification

```
clearNotification(notificationId: string): Promise<boolean>
```

Clears the notification with the specified ID, resolving to `true` if the notification existed and was cleared.

<a name="createNotification"></a>

### createNotification

```
createNotification(
  options: chrome.notifications.NotificationOptions,
  notificationId?: string
): Promise<string>
```

Creates a notification with the given options and optional ID, returning the notification ID.

<a name="getAllNotifications"></a>

### getAllNotifications

```
getAllNotifications(): Promise<object>
```

Retrieves all currently displayed notifications. The returned object maps notification IDs to `true` values, as provided by `chrome.notifications.getAll`.

<a name="getNotificationPermissionLevel"></a>

### getNotificationPermissionLevel

```
getNotificationPermissionLevel(): Promise<string>
```

Gets the current permission level for notifications (e.g., `"granted"` or `"denied"`).

<a name="updateNotification"></a>

### updateNotification

```
updateNotification(
  options: chrome.notifications.NotificationOptions,
  notificationId: string
): Promise<boolean>
```

Updates an existing notification with new options, resolving to `true` if the notification was updated.

<a name="isAvailableNotifications"></a>

### isAvailableNotifications

```
isAvailableNotifications(): boolean
```

Returns `true` if the `chrome.notifications` API is available in the current environment, otherwise `false`.

<a name="clearAllNotifications"></a>

### clearAllNotifications

```
clearAllNotifications(): Promise<void>
```

Clears all currently displayed notifications.

<a name="onNotificationsButtonClicked"></a>

### onNotificationsButtonClicked

```
onNotificationsButtonClicked(
  callback: (notificationId: string, buttonIndex: number) => void
): () => void
```

Adds a listener for when a button on a notification is clicked. Returns an unsubscribe function.

<a name="onNotificationsClicked"></a>

### onNotificationsClicked

```
onNotificationsClicked(
  callback: (notificationId: string) => void
): () => void
```

Adds a listener for when a notification itself is clicked. Returns an unsubscribe function.

<a name="onNotificationsClosed"></a>

### onNotificationsClosed

```
onNotificationsClosed(
  callback: (notificationId: string, byUser: boolean) => void
): () => void
```

Adds a listener for when a notification is closed, including whether it was closed by the user. Returns an unsubscribe function.

<a name="onNotificationsPermissionLevelChanged"></a>

### onNotificationsPermissionLevelChanged

```
onNotificationsPermissionLevelChanged(
  callback: (level: chrome.notifications.PermissionLevel) => void
): () => void
```

Adds a listener for changes to the notifications permission level. Returns an unsubscribe function.
