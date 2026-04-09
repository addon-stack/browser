# utils

Low-level helpers used across the package to handle common Chrome API patterns, error handling, and listeners.

## Methods

- [checkLastError()](#checkLastError)
- [callWithPromise(executor)](#callWithPromise)
- [safeListener(listener)](#safeListener)
- [handleListener(target, callback)](#handleListener)

---

<a name="checkLastError"></a>

### checkLastError

```ts
checkLastError(): void
```

Throws an `Error` if `chrome.runtime.lastError` is set. This is primarily used inside legacy callback-style code to ensure that any runtime errors are captured and propagated as standard exceptions.

```ts
import { checkLastError } from "@addon-core/browser/utils";

chrome.runtime.getPlatformInfo(() => {
  checkLastError(); // throws if lastError is present
  // continue safely
});
```

---

<a name="callWithPromise"></a>

### callWithPromise

```ts
callWithPromise<T>(executor: (callback: (result: T) => void) => any): Promise<T>
```

Wraps a callback-style Chrome API into a `Promise`. This is the core utility used throughout this package to provide a modern async/await interface. It automatically calls `checkLastError()` within the callback.

```ts
import { callWithPromise } from "@addon-core/browser/utils";

export function getPlatformInfo(): Promise<chrome.runtime.PlatformInfo> {
  return callWithPromise(cb =>
    chrome.runtime.getPlatformInfo(info => cb(info))
  );
}
```

---

<a name="safeListener"></a>

### safeListener

```ts
safeListener<T extends (...args: any[]) => any>(listener: T): T
```

Wraps any listener function so that synchronous errors are caught and logged to the console. It also catches and logs rejected promises from async listeners. This ensures that one failing listener doesn't break the extension's execution flow.

```ts
import { safeListener } from "@addon-core/browser/utils";

chrome.runtime.onMessage.addListener(
  safeListener((msg, sender, sendResponse) => {
    // your code that might throw or return a rejected promise
  })
);
```

---

<a name="handleListener"></a>

### handleListener

```ts
handleListener<T extends (...args: any[]) => void>(target: chrome.events.Event<T>, callback: T): () => void
```

Subscribes to a `chrome.events.Event` (like `chrome.tabs.onUpdated`) using `safeListener` and returns an unsubscribe function (`() => void`). This makes it easier to manage listener lifecycles.

```ts
import { handleListener } from "@addon-core/browser/utils";

const off = handleListener(
  chrome.tabs.onUpdated,
  (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      console.log("Tab finished loading:", tabId);
    }
  }
);

// Later, to remove the listener
off();
```
