# webRequest

Documentation: [Chrome WebRequest API](https://developer.chrome.com/docs/extensions/reference/webRequest)

A promise-based wrapper for the Chrome `webRequest` API, providing methods to observe and modify network requests through various lifecycle events.

## Methods

- [handlerWebRequestBehaviorChanged()](#handlerWebRequestBehaviorChanged)

## Events

- [onWebRequestAuthRequired(callback, filter, extraInfoSpec?)](#onWebRequestAuthRequired)
- [onWebRequestBeforeRedirect(callback, filter, extraInfoSpec?)](#onWebRequestBeforeRedirect)
- [onWebRequestBeforeRequest(callback, filter, extraInfoSpec?)](#onWebRequestBeforeRequest)
- [onWebRequestBeforeSendHeaders(callback, filter, extraInfoSpec?)](#onWebRequestBeforeSendHeaders)
- [onWebRequestSendHeaders(callback, filter, extraInfoSpec?)](#onWebRequestSendHeaders)
- [onWebRequestHeadersReceived(callback, filter, extraInfoSpec?)](#onWebRequestHeadersReceived)
- [onWebRequestResponseStarted(callback, filter, extraInfoSpec?)](#onWebRequestResponseStarted)
- [onWebRequestCompleted(callback, filter, extraInfoSpec?)](#onWebRequestCompleted)
- [onWebRequestErrorOccurred(callback, filter, extraInfoSpec?)](#onWebRequestErrorOccurred)

---

<a name="handlerWebRequestBehaviorChanged"></a>

### handlerWebRequestBehaviorChanged

```
handlerWebRequestBehaviorChanged(): Promise<void>
```

Notifies the browser that the extension's webRequest handling logic (filters or listeners) has changed, prompting the browser to update its internal event routing.

<a name="onWebRequestAuthRequired"></a>

### onWebRequestAuthRequired

```
onWebRequestAuthRequired(
  callback: (
    details: chrome.webRequest.OnAuthRequiredDetails,
    asyncCallback?: (response: chrome.webRequest.BlockingResponse) => void
  ) => chrome.webRequest.BlockingResponse | void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener for authentication challenges. You can provide credentials, cancel the request, or take no action. Returns a function to remove the listener.

<a name="onWebRequestBeforeRedirect"></a>

### onWebRequestBeforeRedirect

```
onWebRequestBeforeRedirect(
  callback: (details: chrome.webRequest.OnBeforeRedirectDetails) => void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener fired before a server-initiated redirect occurs. Returns a function to remove the listener.

<a name="onWebRequestBeforeRequest"></a>

### onWebRequestBeforeRequest

```
onWebRequestBeforeRequest(
  callback: (details: chrome.webRequest.OnBeforeRequestDetails) => chrome.webRequest.BlockingResponse | void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener fired before a request is made. Can cancel or redirect the request by returning a BlockingResponse. Returns a function to remove the listener.

<a name="onWebRequestBeforeSendHeaders"></a>

### onWebRequestBeforeSendHeaders

```
onWebRequestBeforeSendHeaders(
  callback: (details: chrome.webRequest.OnBeforeSendHeadersDetails) => chrome.webRequest.BlockingResponse | void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener fired before HTTP request headers are sent. Can modify or cancel the request headers. Returns a function to remove the listener.

<a name="onWebRequestSendHeaders"></a>

### onWebRequestSendHeaders

```
onWebRequestSendHeaders(
  callback: (details: chrome.webRequest.OnSendHeadersDetails) => void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener fired after HTTP request headers are sent. Returns a function to remove the listener.

<a name="onWebRequestHeadersReceived"></a>

### onWebRequestHeadersReceived

```
onWebRequestHeadersReceived(
  callback: (details: chrome.webRequest.OnHeadersReceivedDetails) => chrome.webRequest.BlockingResponse | void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener fired when HTTP response headers are received. Can modify response headers or cancel the request. Returns a function to remove the listener.

<a name="onWebRequestResponseStarted"></a>

### onWebRequestResponseStarted

```
onWebRequestResponseStarted(
  callback: (details: chrome.webRequest.OnResponseStartedDetails) => void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener fired when the first byte of the response body is received. Returns a function to remove the listener.

<a name="onWebRequestCompleted"></a>

### onWebRequestCompleted

```
onWebRequestCompleted(
  callback: (details: chrome.webRequest.OnCompletedDetails) => void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener fired when a request is completed successfully. Returns a function to remove the listener.

<a name="onWebRequestErrorOccurred"></a>

### onWebRequestErrorOccurred

```
onWebRequestErrorOccurred(
  callback: (details: chrome.webRequest.OnErrorOccurredDetails) => void,
  filter: chrome.webRequest.RequestFilter,
  extraInfoSpec?: string[]
): () => void
```

Adds a listener fired when a request encounters an error and is aborted. Returns a function to remove the listener.
