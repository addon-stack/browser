# Context-bound messaging

`harness.messaging.forContext(context)` returns stable `chrome`/`browser` facades bound to a registered context.
Both facades use the same context-local message controls. No global current-context variable is changed when a
listener runs or resumes after `await`.

Use `installBrowserGlobals(harness, {messageContext: context})` to test real `@addon-core/browser` wrappers from that
context. `messageContext` accepts a live handle or its ID and is independent of the existing `context` option, which
only selects simulated environment markers. Foreign/disposed handles fail, even if another context reuses their ID.

## Plain Node: real application wrappers

```ts
import assert from "node:assert/strict";
import {onMessage, sendMessage, sendTabMessage} from "@addon-core/browser";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "@addon-core/browser/testing";

const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})]});
const worker = harness.contexts.create({kind: "background", contextId: "worker"});
const page = harness.contexts.create({kind: "extensionPage", contextId: "options"});
const content = harness.contexts.create({
    kind: "contentScript", tabId: 7, frameId: 3, url: "https://example.test/frame",
});

// Register the actual production listener against the worker's event.
const restoreWorker = installBrowserGlobals(harness, {messageContext: worker, environment: "preserve"});
const unsubscribe = onMessage(async message => ({received: message}));
restoreWorker(); // The subscription remains owned by worker, not by the installed globals.

content.onMessage.on((message, _sender, respond) => respond({frame: 3, received: message}));
const restorePage = installBrowserGlobals(harness, {messageContext: page, environment: "preserve"});
try {
    assert.deepEqual(await sendMessage("ping"), {received: "ping"});
    assert.deepEqual(await sendTabMessage(7, "ping", {frameId: 3}), {frame: 3, received: "ping"});
    assert.equal(harness.messaging.forContext(page).runtime.sendMessage.calls[0].invocation, "callback");
} finally {
    unsubscribe();
    try { harness.reset(); } finally { restorePage(); }
}
```

These are real package functions; no module mock is needed. The same pattern works in Jest/jsdom with
`environment: "preserve"`, retaining the existing DOM, navigator and location. Nested installs must be restored in
reverse order. Restoring globals does not unsubscribe a context's listeners or cancel its requests.

## Compatibility: explicit contextual mode

Without `messageContext`, existing root behavior is unchanged: `harness.runtime.sendMessage` dispatches only to the
root `runtime.onMessage` listeners with `runtime.messageSender`; root `tabs.sendMessage` remains configurable. Creating
contexts does not silently route root messages or migrate root listeners. Contextual sends never notify root listeners.

`view.runtime.sendMessage` and `view.tabs.sendMessage` are separate controls for that sender, supporting results,
implementations, queues, `failNext` and reset. Root method configuration does not configure contextual sends. Overrides
replace the whole method, including routing and cancellation; use normal stateful calls when testing delivery.
`view.runtime.onMessage` is exactly `context.onMessage`. Raw `context.onMessage.emit()` remains manual event dispatch,
not a request/response operation.

`view.calls`, `harness.messaging.calls` and the combined `harness.calls` identify outgoing requests with `contextId`.
They share chronological sequence numbers without duplicating calls. Other browser APIs share the existing harness
state and controls. The runtime/tabs messaging overlays are read-only; use method controls or capabilities to change
behavior. Capability removal is reflected in property lookup, `in`, `typeof` and property descriptors of existing views.

The raw capability matrix's `coverage` describes the root facade; `contextCoverage` and `contextInvocation` describe
the three contextual overrides (`runtime.sendMessage`, `runtime.onMessage`, `tabs.sendMessage`). Both are tested against
the actual controls, so contextual support does not falsely relabel the root configurable stub as stateful.

## Delivery and sender

- Runtime sends target registered extension contexts, excluding the sender, other contexts in its document and all
  content-script contexts. Tabs sends target content scripts and this extension's pages in the selected tab, including
  extension pages opened as tabs. Popups without a tab are not selected by a tab send.
- `frameId` and `documentId` restrict tabs delivery; when both are supplied, both must match. With neither, all
  registered content-script/extension-page contexts in the tab are eligible. Unknown options and invalid IDs fail explicitly.
- Only contexts with the same `incognito` value are selected. This is filtering, not complete split-incognito support.
- Only recipients with registered listeners count as receiving endpoints. No matching endpoint rejects with an API-named
  `Could not establish connection. Receiving end does not exist.` error. A listener that returns synchronously without
  responding exhausts its response opportunity. When all opportunities are exhausted, a Promise invocation resolves
  `undefined`; a callback invocation gets `runtime.lastError` with `The message port closed before a response was received.`
  (prefixed with the API name). The package's production wrappers pass a callback, so they reject in this case.
- `sender` is a detached snapshot derived from the source context and current tab state, not the root sender fixture.
  It includes extension ID, URL, available document metadata and tab/frame information when applicable. It does not
  simulate opaque origins, navigation or document lifecycle transitions beyond the registered active document. Worker
  sends include the extension origin for `tabs.sendMessage`, but omit it for `runtime.sendMessage`, as observed in the
  Chromium probe.
- Explicit same-extension runtime IDs are accepted. Cross-extension/native messaging, TLS channel IDs, Web Locks,
  long-lived `Port`/`connect`, and loading application modules are outside this model. Content scripts use runtime
  messaging; contextual `tabs.sendMessage` from a content script fails rather than inventing that browser capability.

The routing model follows the [Chrome runtime API](https://developer.chrome.com/docs/extensions/reference/api/runtime#method-sendMessage)
and [tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-sendMessage), plus measured delivery
to an extension's own tab pages (the tabs reference describes content scripts only).

## Responses and errors

All selected listeners start synchronously in registry/registration order; their order is a deterministic kit convention,
not a guarantee of real-browser scheduling. Dispatch uses a listener snapshot, but skips contexts disposed before their
turn. Removing a listener does not cancel a previously returned Promise or held response.

- A listener can answer synchronously with `sendResponse`, return literal `true` and answer later, or return a Promise/
  thenable when `promiseListeners` is `"accept"` (the default). Other synchronous return values are ignored.
- `true` keeps only that listener's response active. It cannot enable another listener's late `sendResponse`.
- The first response **or listener error** settles the request. Other listeners still run; losing/late Promise rejections
  are observed, and their results cannot settle it again. This is distinct from the legacy root dispatcher's aggregated
  error fallback and from raw event `emit()`. Listener errors retain the original thrown/rejected value; the kit does
  not add Chrome's renderer-generated `Uncaught Error:` prefix or reproduce every vendor error string.
- Promise invocation rejects on failure. Callback invocation returns `undefined`, calls the callback asynchronously for
  normal dispatch, and exposes `runtime.lastError` only in that sender's facades during the callback. Primitive configured
  results/errors retain their existing synchronous callback behavior. Non-messaging shared adapters still expose their
  shared lastError through the bound view.

Production `onMessage()` still applies `safeListener`: synchronous throws are logged and swallowed; native Promise
rejections are logged and remain rejected; custom thenables reject without that Promise-specific log. The kit does not
change this production behavior. If a swallowed synchronous error leaves no response, a callback-based send still
fails with the unanswered-port error; raw event emit continues to succeed. Use `captureListenerErrors` for opt-in
console capture as described in [limitations](limitations.md).

### Promise-listener compatibility

```ts
harness.messaging.promiseListeners = "ignore";
// onMessage(async () => "reply") no longer answers contextual sends.
// return true + a later sendResponse("reply") still works.
harness.messaging.promiseListeners = "accept";
```

`accept` uses Promise/thenable fulfillment as a response and rejection as a listener error. `ignore` treats that return
as no response: it does not keep this listener's `sendResponse` alive, await its settlement or convert a late rejection
into a request failure. A synchronous `sendResponse` already made by the listener is still valid. Another listener's
literal `true` can keep its own response active.

Ignored rejections are observed and available in `harness.messaging.ignoredPromiseRejections`, as immutable snapshots
of `{channelId, api, sourceContextId, recipientContextId, error}`. Error identity is retained. This buffer is separate
from opt-in console capture; it prevents unhandled rejections in the test process without silently losing the failure.
It does not reproduce browser console/unhandled-rejection reporting. Production `safeListener` may still log its error.

The setting is snapshotted at the start of each send and is independent of browser profile and callback/Promise method
style. Installing/restoring globals does not change it. Messaging/registry/runtime/harness reset restores `accept`,
clears the rejection buffer and prevents late pre-reset rejections from entering a new test's buffer. Method reset
does not change this setting. Root messaging, raw event emit and explicit method overrides are unaffected.

Chrome documents Promise-listener support from version 148 with gradual rollout and a `devtools_page` exception.
See the [Chrome messaging documentation](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#responses).
Choose `ignore` explicitly to test applications targeting environments without support; neither a profile name nor
a successful local browser probe implies universal availability. Synchronous first-error behavior is not version-gated
by this switch. Firefox/Safari profiles also use the chosen model, not full vendor parity.

## Serialization

Contextual messages and responses use JSON serialization in every kit profile, unlike the legacy root dispatcher's
in-process values. A snapshot is made before delivery and each listener receives its own decoded message and sender.
Changing one listener's data cannot mutate another listener's input or the original payload. Responses are detached too.

JSON-compatible coercions apply: Date uses its JSON representation, undefined object properties disappear, and a
top-level undefined message/explicit response becomes `null`. In particular, `sendResponse()` and
`sendResponse(undefined)` both answer with `null`; neither is equivalent to not answering. Cycles, BigInt and non-serializable top-level values fail
with an API-named error. No browser message-size quota is enforced. The Firefox/Safari profiles intentionally do **not**
provide structured-clone messaging; use a real vendor test for Date/Map/RegExp and other non-JSON transport behavior.

## Pending channels and teardown

`harness.messaging.pendingChannels` exposes detached records with ID, API name, source and selected recipient IDs.
There are no automatic timeouts. Close held channels explicitly or remove their owning contexts:

```ts
const source = harness.messaging.forContext(page);
worker.onMessage.on(() => true);
const pending = source.chrome.runtime.sendMessage("held");
const cancelled = assert.rejects(pending, /message channel closed/);
harness.messaging.closeChannels(worker); // Force-close routed requests involving this context.
await cancelled;
```

Removing the sender rejects its pending requests. Removing a receiving context invalidates only its responses; another
live receiver may still answer. If no possible responder remains, the channel rejects. Closing Offscreen or removing a
document/tab/window uses the same disposal mechanism. Late responses cannot affect a replacement with a reused ID.

`messaging.closeChannels()` force-closes all contextual channels; `runtime.closeMessageChannels()` closes both root and
contextual channels. Closing Offscreen never indiscriminately closes unrelated root channels.

`harness.reset()` restores initial fixtures, clears message controls/listeners and rejects pending calls. Registry/runtime
reset also cancels contextual channels. `messaging.reset()` clears contextual controls, local message listeners and
channels without removing contexts. A method's `reset()` clears its configuration/history, not an already pending call.
Attach rejection handlers before teardown and await cancelled wrapper calls before restoring globals: callbacks still
read `runtime.lastError` through the installed namespace. Arbitrary custom implementation work is not forcibly stopped.

## Concurrency boundary

Bound facades preserve the sender across arbitrary awaits:

```ts
const workerApi = harness.messaging.forContext(worker).chrome;
worker.onMessage.on(async message => {
    await Promise.resolve();
    return workerApi.runtime.sendMessage({forwarded: message});
});
```

However, all production wrappers in one JavaScript realm read the currently installed global namespace. Registering a
listener under one installation does not make later global reads inside its body context-local. Do not overlap global
installations to simulate concurrent execution of independent application modules. Use the explicit bound APIs for
nested/concurrent sends; serialize tests using global-dependent modules, or run them in separate real browser contexts.
This kit does not supply async-local globals, isolated realms, separate DOMs or script execution.

The Chromium smoke covers worker/Offscreen, worker/content-frame and worker/extension-tab delivery, frame/document
targeting, sender data, JSON payloads and held-channel closure through callback and Promise method calls. It additionally
measures Promise-listener success/rejection, empty explicit responses and no response using tagged outcomes (so JSON
report transport cannot discard `undefined`). An explicit page readiness handshake prevents a missing listener from
being mistaken for a routing failure. Promise support is reported and the fake is compared in the observed mode; an
unknown response/error fails instead of being treated as unavailable support. The probe normalizes only the kit's API
prefix and Chrome's `Uncaught Error:` prefix in error reports.

This does not establish rollout availability for every user, cross-context execution isolation or full vendor
equivalence. Unit tests exercise both compatibility modes independently of the installed browser. Fresh-tarball
consumers test the real wrappers with ESM/CJS, TypeScript and jsdom.
