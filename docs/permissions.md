# permissions

Documentation: [Chrome Permissions API](https://developer.chrome.com/docs/extensions/reference/permissions)

A promise-based wrapper for the Chrome `permissions` API to request and manage extension permissions.

## Methods

- [isAvailablePermissions()](#isAvailablePermissions)
- [containsPermissions(permissions)](#containsPermissions)
- [getAllPermissions()](#getAllPermissions)
- [requestPermissions(permissions)](#requestPermissions)
- [removePermissions(permissions)](#removePermissions)
- [addHostAccessRequest(request?)](#addHostAccessRequest)
- [removeHostAccessRequest(request?)](#removeHostAccessRequest)

## Events

- [onPermissionsAdded(callback)](#onPermissionsAdded)
- [onPermissionsRemoved(callback)](#onPermissionsRemoved)

---

<a name="isAvailablePermissions"></a>

### isAvailablePermissions

```ts
isAvailablePermissions(): boolean
```

Returns `true` when the `permissions` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
It checks namespace presence only; it does not guarantee individual methods, permissions, or a successful operation.

```ts
import {isAvailablePermissions} from "@addon-core/browser";

if (isAvailablePermissions()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

<a name="containsPermissions"></a>

### containsPermissions

```
containsPermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
```

Checks whether the extension has the specified permissions.

<a name="getAllPermissions"></a>

### getAllPermissions

```
getAllPermissions(): Promise<chrome.permissions.Permissions>
```

Retrieves all granted permissions.

<a name="requestPermissions"></a>

### requestPermissions

```
requestPermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
```

Prompts the user to grant additional permissions.

<a name="removePermissions"></a>

### removePermissions

```
removePermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
```

Removes the specified permissions if granted.

<a name="addHostAccessRequest"></a>

### addHostAccessRequest

```
addHostAccessRequest(request?: chrome.permissions.AddHostAccessRequest): Promise<void>
```

Requests additional host access at runtime.

<a name="removeHostAccessRequest"></a>

### removeHostAccessRequest

```
removeHostAccessRequest(request?: chrome.permissions.RemoveHostAccessRequest): Promise<void>
```

Clears a previously requested host access.

<a name="onPermissionsAdded"></a>

### onPermissionsAdded

```
onPermissionsAdded(callback: (permissions: chrome.permissions.Permissions) => void): () => void
```

Fires when new permissions are granted.

<a name="onPermissionsRemoved"></a>

### onPermissionsRemoved

```
onPermissionsRemoved(callback: (permissions: chrome.permissions.Permissions) => void): () => void
```

Fires when permissions are removed.
