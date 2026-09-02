# Testing primitives

The primitives have no dependency on a test runner or mocking framework.

## Browser events

```ts
import {createBrowserEvent} from "@addon-core/browser/testing";

const event = createBrowserEvent<[chrome.runtime.InstalledDetails]>();
const listener = async (details: chrome.runtime.InstalledDetails) => {
    // assertions or application work
};

event.api.addListener(listener);
event.api.hasListener(listener); // true
const unsubscribe = event.on(listener);

await event.emit({reason: "install"});
unsubscribe();
event.api.removeListener(listener);
event.reset();
```

Listeners are identified by reference. `emit()` takes a listener snapshot, starts every listener synchronously, and
then waits for Promises and other thenables. One listener failure is rethrown directly; multiple failures produce an
`AggregateError`.

## Configurable methods

```ts
import {createBrowserMethod} from "@addon-core/browser/testing";

const method = createBrowserMethod<typeof chrome.tabs.query, chrome.tabs.Tab[]>({
    name: "tabs.query",
    invocation: "dual",
});

method.setResult([]);
method.queueResult([{id: 2} as chrome.tabs.Tab]);
method.failNext(new Error("Temporary failure"));

await method.api({active: true});
method.calls; // immutable snapshots with arguments, callback, style and sequence
method.reset();
```

An unconfigured call fails and names the API. The supported invocation styles are:

- `sync`: returns or throws synchronously;
- `callback`: requires a trailing callback and returns `undefined`;
- `promise`: rejects a call that supplies a callback and otherwise returns a Promise;
- `dual`: a supplied callback receives the result, otherwise the method returns a Promise;
- `promise-tolerant`: accepts but ignores a trailing callback and always returns a Promise;
- `hybrid`: a custom implementation may invoke a callback and return a thenable.

`setResult()` configures a persistent result, `queueResult()` appends FIFO results, `setImplementation()` replaces the
implementation, and each `failNext()` appends one FIFO failure. These names intentionally do not imitate Jest's mock
API. `hasDefaultImplementation` reports whether the method has a harness-owned reset baseline. `reset()` preserves
that baseline while clearing calls, queued outcomes, and consumer-provided configuration.

For callback failures, `runtime.lastError` is present only while the callback runs. Promise failures reject and do not
create `runtime.lastError`.
