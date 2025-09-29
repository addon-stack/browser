# history

Documentation: [Chrome History API](https://developer.chrome.com/docs/extensions/reference/history)

A promise-based wrapper for the Chrome `history` API to manage browser history.

## Methods

- [addHistoryUrl(url)](#addHistoryUrl)
- [deleteAllHistory()](#deleteAllHistory)
- [deleteRangeHistory(range)](#deleteRangeHistory)
- [deleteHistoryUrl(details)](#deleteHistoryUrl)
- [getHistoryVisits(url)](#getHistoryVisits)
- [searchHistory(query)](#searchHistory)

## Events

- [onHistoryVisited(callback)](#onHistoryVisited)
- [onHistoryVisitRemoved(callback)](#onHistoryVisitRemoved)

---

<a name="addHistoryUrl"></a>

### addHistoryUrl

```
addHistoryUrl(url: string): Promise<void>
```

Adds the specified URL to the browser history.

<a name="deleteAllHistory"></a>

### deleteAllHistory

```
deleteAllHistory(): Promise<void>
```

Deletes all entries from the browser history.

<a name="deleteRangeHistory"></a>

### deleteRangeHistory

```
deleteRangeHistory(range: chrome.history.Range): Promise<void>
```

Removes all history entries within the specified time range.

<a name="deleteHistoryUrl"></a>

### deleteHistoryUrl

```
deleteHistoryUrl(details: chrome.history.UrlDetails): Promise<void>
```

Deletes all occurrences of the given URL from the history.

<a name="getHistoryVisits"></a>

### getHistoryVisits

```
getHistoryVisits(url: string): Promise<chrome.history.VisitItem[]>
```

Retrieves the visit history for the specified URL.

<a name="searchHistory"></a>

### searchHistory

```
searchHistory(query: chrome.history.HistoryQuery): Promise<chrome.history.HistoryItem[]>
```

Searches the browser history with the given query, returning matching history items.

<a name="onHistoryVisited"></a>

### onHistoryVisited

```
onHistoryVisited(callback: (result: chrome.history.HistoryItem) => void): () => void
```

Adds a listener triggered when the browser records a page visit. Returns an unsubscribe function.

<a name="onHistoryVisitRemoved"></a>

### onHistoryVisitRemoved

```
onHistoryVisitRemoved(callback: (removed: chrome.history.RemovedResult) => void): () => void
```

Adds a listener triggered when URLs are removed from the history, providing details of the removal. Returns an unsubscribe function.
