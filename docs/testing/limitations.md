# Testing limitations

The test kit models a documented subset of WebExtension behavior. Passing tests do not prove equivalent behavior in
Chrome, Firefox, Safari, Opera, or any other real browser.

## Intentional differences

- `tabs.query()` uses AND equality matching for `status`, `lastFocusedWindow`, `windowId`, `windowType`, `active`,
  `index`, `currentWindow`, `highlighted`, `discarded`, `frozen`, `autoDiscardable`, `pinned`, `splitViewId`, `audible`,
  `muted`, `groupId`, and `title`. `title` accepts literal values only; title wildcards fail explicitly. `url` supports
  the documented [HTTP/HTTPS/file match-pattern subset](match-patterns.md), with OR inside URL arrays. Use `tabs.get()`
  for an ID. URL/title visibility is not gated by permissions, and no implicit active/frozen filter is applied.
- The matcher is profile-independent. `<all_urls>` covers only HTTP, HTTPS and file in this kit; other pattern
  schemes and unsupported syntax fail explicitly. Serialized paths/queries are compared without Chromium's
  percent-decoding equivalence rules; URL fragments are ignored. This is not a full vendor pattern engine.
- `permissions.contains()` models pattern containment for explicitly granted origins, ignoring paths. It does not
  infer grants from the manifest or simulate prompts, restricted pages, file-access toggles or user site-access
  policy. Grant storage and removal remain exact-entry operations, without partial wildcard subtraction.
- Complex APIs outside runtime, permissions, tabs, windows, storage, and the scripting content-script registry are configurable
  stubs. They do not simulate the browser unless the test supplies an implementation or result.
- [Storage](storage.md) models a Chromium-oriented enumerable-data subset, not persistence, remote sync, policy loading,
  write-rate limits or context access permissions. Only sync has default size/count quotas. Session/managed byte usage
  stays configurable. Default callbacks and change dispatch start synchronously; `flushChanges()` observes automatic
  listener failures separately from successful writes. Reset cannot cancel consumer code or detached async work.
  The `firefox` profile also uses this Chromium-oriented codec (`Date`/`RegExp` without enumerable properties become
  `{}`), so it must not be used to establish Firefox-specific serialization behavior without a real Firefox probe.
- `tabs.sendMessage()` and `tabs.connect()` are configurable stubs. The [context registry](contexts.md) can represent
  content scripts, documents and frames, but does not load application code, route messages between them or simulate
  long-lived ports. Context-local `onMessage.emit()` is a separate manual event, not a routed request/response channel.
- `runtime.getContexts()` reads registered extension contexts and excludes content scripts. Document/frame lifetimes
  and cleanup are explicit; updating a tab URL does not simulate navigation. `offscreen.createDocument()`,
  `hasDocument()` and `closeDocument()` remain configurable stubs and do not modify this registry yet.
- `runtime.sendMessage()` resolves `undefined` when there are no message listeners. Chrome can instead report
  `Could not establish connection. Receiving end does not exist.` through callback-scoped `runtime.lastError` (or a
  rejected Promise).
- A synchronous `runtime.onMessage` listener return is not a response: every value except literal `true` is ignored.
  Return a Promise/thenable or call `sendResponse()` to answer; literal `true` only keeps the response channel open.
- A held-open message channel has no automatic browser-lifecycle timeout. It remains pending until `sendResponse()` or
  `harness.runtime.closeMessageChannels()`; explicit closure rejects with the exact message
  `Browser method "runtime.sendMessage" message channel closed before a response was received.`; `harness.reset()` also
  closes pending message channels.
- Browser profiles model routing and common compatibility shapes, not complete vendor parity. In the Firefox profile,
  production wrappers normally use `harness.browser`; configuring the separate `harness.chrome` facade does not change
  that routing.
- `environment: "preserve"` installs API namespaces and vendor markers without changing `window`, `document`,
  `location` or `navigator`. UA-based detection still sees the original environment, not a simulated profile UA.
  Context registration does not install globals or provide isolated JavaScript realms. Tracked operations reject on
  disposal, but external work must cooperate with `context.signal` to stop its own side effects.
- Global restoration cannot undo a property made non-configurable by the test or application. An in-order restore
  attempts the remaining descriptors and harness settings, reports failures, and releases its stack entry; repeated
  calls are no-ops even after failure. An out-of-order call changes nothing and can be retried after restoring the inner
  installation. Use isolated processes for tests that irreversibly change globals.
- Browser-event dispatch uses a listener snapshot. A listener removed by another listener during the same `emit()` is
  still called for that dispatch; Chrome and DOM events skip a listener removed before its turn.
- The production `download()` helper retains its real 100 ms validation delay by default, including after
  `harness.reset()`. Tests can skip or defer only that wait through
  [`harness.delays.downloadValidation`](harness.md#download-validation-delay). The kit does not patch global timers or
  simulate browser download lifecycle timing, so this control does not establish real-browser parity.

## Listener behavior

Raw `createBrowserEvent().emit()` waits for Promises and arbitrary thenables and surfaces listener failures. Production
`onXxx()` helpers wrap callbacks with `safeListener`, so their observable behavior differs:

- a synchronous throw is logged as `Listener error:`, becomes `undefined`, and does not reject raw emit;
- a native Promise rejection is logged as `Listener in promise error:`, while the original returned Promise remains
  rejected;
- a custom or cross-realm thenable is not logged because production checks `instanceof Promise`, but the event
  primitive still assimilates it and rejects.

`captureListenerErrors` only structures the existing `console.error` calls. It does not hook listeners directly and is
never enabled by default.

Use real-browser integration tests for permissions prompts, full vendor URL-pattern semantics, service-worker suspension,
cross-context messaging, content-script injection, browser UI, security boundaries, and browser-specific timing.
