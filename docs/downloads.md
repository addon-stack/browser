# downloads

Documentation: [Chrome Downloads API](https://developer.chrome.com/docs/extensions/reference/downloads)

A promise-based wrapper for the Chrome `downloads` API.

## Methods

- [acceptDownloadDanger(downloadId)](#acceptDownloadDanger)
- [cancelDownload(downloadId)](#cancelDownload)
- [download(options)](#download)
- [eraseDownload(query)](#eraseDownload)
- [getDownloadFileIcon(downloadId, options)](#getDownloadFileIcon)
- [openDownload(downloadId)](#openDownload)
- [pauseDownload(downloadId)](#pauseDownload)
- [removeDownloadFile(downloadId)](#removeDownloadFile)
- [resumeDownload(downloadId)](#resumeDownload)
- [searchDownloads(query)](#searchDownloads)
- [setDownloadsUiOptions(enabled)](#setDownloadsUiOptions)
- [showDownloadFolder()](#showDownloadFolder)
- [showDownload(downloadId)](#showDownload)
- [findDownload(downloadId)](#findDownload)
- [isDownloadExists(downloadId)](#isDownloadExists)
- [getDownloadState(downloadId?)](#getDownloadState)

## Events

- [onDownloadsChanged(callback)](#onDownloadsChanged)
- [onDownloadsCreated(callback)](#onDownloadsCreated)
- [onDownloadsDeterminingFilename(callback)](#onDownloadsDeterminingFilename)

---

<a name="acceptDownloadDanger"></a>

### acceptDownloadDanger

```
acceptDownloadDanger(downloadId: number): Promise<void>
```

Accepts a dangerous download, allowing it to proceed.

<a name="cancelDownload"></a>

### cancelDownload

```
cancelDownload(downloadId: number): Promise<void>
```

Cancels the specified download.

<a name="download"></a>

### download

```
download(options: chrome.downloads.DownloadOptions): Promise<number>
```

Initiates a download with the given options, resolving to the download ID. The wrapper sets `conflictAction: "uniquify"` by default and validates early errors. May throw `BlockDownloadError` if the download is interrupted (e.g., `USER_CANCELED`).

<a name="eraseDownload"></a>

### eraseDownload

```
eraseDownload(query: chrome.downloads.DownloadQuery): Promise<number[]>
```

Removes the download history entries that match the given query, returning the list of erased download IDs.

<a name="getDownloadFileIcon"></a>

### getDownloadFileIcon

```
getDownloadFileIcon(downloadId: number, options: chrome.downloads.GetFileIconOptions): Promise<string | undefined>
```

Retrieves the icon URL for the downloaded file, if available.

<a name="openDownload"></a>

### openDownload

```
openDownload(downloadId: number): Promise<void>
```

Opens the downloaded file.

<a name="pauseDownload"></a>

### pauseDownload

```
pauseDownload(downloadId: number): Promise<void>
```

Pauses an active download.

<a name="removeDownloadFile"></a>

### removeDownloadFile

```
removeDownloadFile(downloadId: number): Promise<void>
```

Deletes the downloaded file from the local disk.

<a name="resumeDownload"></a>

### resumeDownload

```
resumeDownload(downloadId: number): Promise<void>
```

Resumes a paused download.

<a name="searchDownloads"></a>

### searchDownloads

```
searchDownloads(query: chrome.downloads.DownloadQuery): Promise<chrome.downloads.DownloadItem[]>
```

Searches for downloads matching the specified query.

<a name="setDownloadsUiOptions"></a>

### setDownloadsUiOptions

```
setDownloadsUiOptions(enabled: boolean): Promise<void>
```

Enables or disables the browser's default download UI.

<a name="showDownloadFolder"></a>

### showDownloadFolder

```
showDownloadFolder(): void
```

Shows the default download folder in the file explorer.

<a name="showDownload"></a>

### showDownload

```
showDownload(downloadId: number): Promise<boolean>
```

Attempts to reveal the specified download in the file explorer, returning `true` if it exists.

<a name="findDownload"></a>

### findDownload

```
findDownload(downloadId: number): Promise<chrome.downloads.DownloadItem | undefined>
```

Retrieves the download item for the given download ID, if it exists.

<a name="isDownloadExists"></a>

### isDownloadExists

```
isDownloadExists(downloadId: number): Promise<boolean | undefined>
```

Checks whether a download with the specified ID exists.

<a name="getDownloadState"></a>

### getDownloadState

```
getDownloadState(downloadId?: number): Promise<chrome.downloads.State | undefined>
```

Retrieves the state (`in_progress`, `complete`, or `interrupted`) of the given download.

<a name="onDownloadsChanged"></a>

### onDownloadsChanged

```
onDownloadsChanged(
  callback: (downloadDelta: chrome.downloads.DownloadDelta) => void
): () => void
```

Adds a listener triggered when a download's state or properties change. Returns an unsubscribe function.

<a name="onDownloadsCreated"></a>

### onDownloadsCreated

```
onDownloadsCreated(
  callback: (downloadItem: chrome.downloads.DownloadItem) => void
): () => void
```

Adds a listener triggered when a new download is created. Returns an unsubscribe function.

<a name="onDownloadsDeterminingFilename"></a>

### onDownloadsDeterminingFilename

```
onDownloadsDeterminingFilename(
  callback: (
    downloadItem: chrome.downloads.DownloadItem,
    suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void
  ) => void
): () => void
```

Adds a listener triggered when a download's filename is being determined. Returns an unsubscribe function.
