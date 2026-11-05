# history

Documentation: [Chrome History API](https://developer.chrome.com/docs/extensions/reference/history)

A promise-based wrapper for the Chrome `history` API to manage browser history.

## Methods

- [isAvailableHistory()](#isAvailableHistory)
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

<a name="isAvailableHistory"></a>

### isAvailableHistory

```ts
isAvailableHistory(method?: ApiMethodName<typeof chrome.history>): boolean
```

The optional `method` is a native function name, for example `isAvailableHistory("search")`.
Import the public `ApiMethodName` type from `@addon-core/browser` for your own typed helpers.
This checks callable presence without invoking the method; permissions and argument support still require handling.

Returns `true` when the `history` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
Without an argument, it checks namespace presence only. Pass a native method name to also check that it is callable.
Neither form verifies permissions, argument support, or a successful operation. See [method availability](safari.md).

```ts
import {isAvailableHistory} from "@addon-core/browser";

if (isAvailableHistory()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

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
