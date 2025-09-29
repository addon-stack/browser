# webNavigation

Documentation: [Chrome Web Navigation API](https://developer.chrome.com/docs/extensions/reference/webNavigation)

A promise-based wrapper for the Chrome `webNavigation` API, providing methods to retrieve frame information and listen to navigation events.

## Methods

- [getAllFrames(tabId)](#getAllFrames)
- [getFrame(details)](#getFrame)

## Events

- [onWebNavigationBeforeNavigate(callback, filters?)](#onWebNavigationBeforeNavigate)
- [onWebNavigationCommitted(callback, filters?)](#onWebNavigationCommitted)
- [onWebNavigationCompleted(callback, filters?)](#onWebNavigationCompleted)
- [onWebNavigationCreatedNavigationTarget(callback, filters?)](#onWebNavigationCreatedNavigationTarget)
- [onWebNavigationDOMContentLoaded(callback, filters?)](#onWebNavigationDOMContentLoaded)
- [onWebNavigationErrorOccurred(callback, filters?)](#onWebNavigationErrorOccurred)
- [onWebNavigationHistoryStateUpdated(callback, filters?)](#onWebNavigationHistoryStateUpdated)
- [onWebNavigationReferenceFragmentUpdated(callback, filters?)](#onWebNavigationReferenceFragmentUpdated)
- [onWebNavigationTabReplaced(callback)](#onWebNavigationTabReplaced)

---

<a name="getAllFrames"></a>

### getAllFrames

```
getAllFrames(tabId: number): Promise<chrome.webNavigation.GetAllFrameResultDetails[]>
```

Retrieves information about all frames in the specified tab.

<a name="getFrame"></a>

### getFrame

```
getFrame(details: chrome.webNavigation.GetFrameDetails): Promise<chrome.webNavigation.GetFrameResultDetails | null>
```

Retrieves information about a specific frame. Rejects if no matching frame is found.

<a name="onWebNavigationBeforeNavigate"></a>

### onWebNavigationBeforeNavigate

```
onWebNavigationBeforeNavigate(
  callback: (details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => void,
  filters?: chrome.webNavigation.WebNavigationEventFilter
): () => void
```

Adds a listener that is called before a navigation occurs.

<a name="onWebNavigationCommitted"></a>

### onWebNavigationCommitted

```
onWebNavigationCommitted(
  callback: (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void,
  filters?: chrome.webNavigation.WebNavigationEventFilter
): () => void
```

Adds a listener that is called when a navigation is committed.

<a name="onWebNavigationCompleted"></a>

### onWebNavigationCompleted

```
onWebNavigationCompleted(
  callback: (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void,
  filters?: chrome.webNavigation.WebNavigationEventFilter
): () => void
```

Adds a listener that is called when a document, including its resources, is completely loaded.

<a name="onWebNavigationCreatedNavigationTarget"></a>

### onWebNavigationCreatedNavigationTarget

```
onWebNavigationCreatedNavigationTarget(
  callback: (details: chrome.webNavigation.WebNavigationSourceCallbackDetails) => void,
  filters?: chrome.webNavigation.WebNavigationEventFilter
): () => void
```

Adds a listener that is called when a new window or tab is created to host a navigation.

<a name="onWebNavigationDOMContentLoaded"></a>

### onWebNavigationDOMContentLoaded

```
onWebNavigationDOMContentLoaded(
  callback: (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void,
  filters?: chrome.webNavigation.WebNavigationEventFilter
): () => void
```

Adds a listener that is called when the page's DOM is fully constructed.

<a name="onWebNavigationErrorOccurred"></a>

### onWebNavigationErrorOccurred

```
onWebNavigationErrorOccurred(
  callback: (details: chrome.webNavigation.WebNavigationFramedErrorCallbackDetails) => void,
  filters?: chrome.webNavigation.WebNavigationEventFilter
): () => void
```

Adds a listener that is called when an error occurs and a navigation is aborted.

<a name="onWebNavigationHistoryStateUpdated"></a>

### onWebNavigationHistoryStateUpdated

```
onWebNavigationHistoryStateUpdated(
  callback: (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void,
  filters?: chrome.webNavigation.WebNavigationEventFilter
): () => void
```

Adds a listener that is called when a frame's history is updated to a new URL.

<a name="onWebNavigationReferenceFragmentUpdated"></a>

### onWebNavigationReferenceFragmentUpdated

```
onWebNavigationReferenceFragmentUpdated(
  callback: (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void,
  filters?: chrome.webNavigation.WebNavigationEventFilter
): () => void
```

Adds a listener that is called when the reference fragment of a frame is updated.

<a name="onWebNavigationTabReplaced"></a>

### onWebNavigationTabReplaced

```
onWebNavigationTabReplaced(
  callback: (details: chrome.webNavigation.WebNavigationReplacementCallbackDetails) => void
): () => void
```

Adds a listener that is called when a tab is replaced by another tab.