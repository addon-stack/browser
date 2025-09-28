# permissions

Documentation: [Chrome Permissions API](https://developer.chrome.com/docs/extensions/reference/permissions)

A promise-based wrapper for the Chrome `permissions` API to request and manage extension permissions.

## Methods

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
