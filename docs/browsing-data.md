# browsingData

Documentation: [Chrome Browsing Data API](https://developer.chrome.com/docs/extensions/reference/browsingData)

A promise-based wrapper for the Chrome `browsingData` API.

## Methods

- [removeBrowsingData(options, dataToRemove)](#removeBrowsingData)
- [removeAppcacheData(options?)](#removeAppcacheData)
- [removeCacheData(options?)](#removeCacheData)
- [removeCacheStorageData(options?)](#removeCacheStorageData)
- [removeCookiesData(options?)](#removeCookiesData)
- [removeDownloadsData(options?)](#removeDownloadsData)
- [removeFileSystemsData(options?)](#removeFileSystemsData)
- [removeFormData(options?)](#removeFormData)
- [removeHistoryData(options?)](#removeHistoryData)
- [removeIndexedDBData(options?)](#removeIndexedDBData)
- [removeLocalStorageData(options?)](#removeLocalStorageData)
- [removePasswordsData(options?)](#removePasswordsData)
- [removeServiceWorkersData(options?)](#removeServiceWorkersData)
- [removeWebSQLData(options?)](#removeWebSQLData)
- [getBrowsingDataSettings()](#getBrowsingDataSettings)

---

<a name="removeBrowsingData"></a>

### removeBrowsingData

```
removeBrowsingData(options: chrome.browsingData.RemovalOptions, dataToRemove: chrome.browsingData.DataTypeSet): Promise<void>
```

Clears the specified types of browsing data within the given time range.

<a name="removeAppcacheData"></a>

### removeAppcacheData

```
removeAppcacheData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears the application cache.

<a name="removeCacheData"></a>

### removeCacheData

```
removeCacheData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears the browser cache.

<a name="removeCacheStorageData"></a>

### removeCacheStorageData

```
removeCacheStorageData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears Cache Storage.

<a name="removeCookiesData"></a>

### removeCookiesData

```
removeCookiesData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears all cookies.

<a name="removeDownloadsData"></a>

### removeDownloadsData

```
removeDownloadsData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears download history.

<a name="removeFileSystemsData"></a>

### removeFileSystemsData

```
removeFileSystemsData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears file system data.

<a name="removeFormData"></a>

### removeFormData

```
removeFormData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears data entered into forms.

<a name="removeHistoryData"></a>

### removeHistoryData

```
removeHistoryData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears browsing history.

<a name="removeIndexedDBData"></a>

### removeIndexedDBData

```
removeIndexedDBData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears IndexedDB data.

<a name="removeLocalStorageData"></a>

### removeLocalStorageData

```
removeLocalStorageData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears Local Storage data.

<a name="removePasswordsData"></a>

### removePasswordsData

```
removePasswordsData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears saved passwords.

<a name="removeServiceWorkersData"></a>

### removeServiceWorkersData

```
removeServiceWorkersData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears Service Worker registrations.

<a name="removeWebSQLData"></a>

### removeWebSQLData

```
removeWebSQLData(options?: chrome.browsingData.RemovalOptions): Promise<void>
```

Clears WebSQL data.

<a name="getBrowsingDataSettings"></a>

### getBrowsingDataSettings

```
getBrowsingDataSettings(): Promise<chrome.browsingData.SettingsResult>
```

Retrieves the current browsing data removal settings.
