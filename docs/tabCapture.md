# tabCapture

Documentation: [Chrome Tab Capture API](https://developer.chrome.com/docs/extensions/reference/tabCapture)

A promise-based wrapper for the Chrome `tabCapture` API to capture and retrieve tab media streams.

## Methods

- [createTabCapture(options)](#createTabCapture)
- [getCapturedTabs()](#getCapturedTabs)
- [getCaptureMediaStreamId(options)](#getCaptureMediaStreamId)

## Events

- [onCaptureStatusChanged(callback)](#onCaptureStatusChanged)

---

<a name="createTabCapture"></a>

### createTabCapture

```
createTabCapture(options: chrome.tabCapture.CaptureOptions): Promise<MediaStream | null>
```

Captures the visible media stream of a tab based on the specified options. Resolves with the `MediaStream` if successful, or `null` otherwise.

<a name="getCapturedTabs"></a>

### getCapturedTabs

```
getCapturedTabs(): Promise<chrome.tabCapture.CaptureInfo[]>
```

Retrieves details of all active tab capture sessions. Resolves with an array of `CaptureInfo` objects.

<a name="getCaptureMediaStreamId"></a>

### getCaptureMediaStreamId

```
getCaptureMediaStreamId(options: chrome.tabCapture.GetMediaStreamOptions): Promise<string>
```

Generates a media stream ID for capturing a tab via `navigator.mediaDevices.getUserMedia`. Resolves with the stream ID.

<a name="onCaptureStatusChanged"></a>

### onCaptureStatusChanged

```
onCaptureStatusChanged(
  callback: (info: chrome.tabCapture.CaptureInfo) => void
): () => void
```

Adds a listener for tab capture status changes (started, stopped, source changed). Returns an unsubscribe function.
