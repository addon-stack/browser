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
- Complex APIs outside runtime, permissions, tabs, windows, storage, offscreen, and the modeled scripting APIs are configurable
  stubs. They do not simulate the browser unless the test supplies an implementation or result.
- [Scripting](scripting.md) models document selection and an explicit executor adapter, not JavaScript execution.
  It does not enforce host permissions, simulate DOM/execution worlds, load files or provide a Node sandbox.
  Target-context removal conservatively cancels the entire request; result copying is not browser serialization parity.
  Ready-made method results bypass target validation and lifetime tracking. CSS APIs remain configurable.
  Its strict adapter-failure policy differs from measured Chrome child-script exceptions; see the
  [native outcomes in the scripting contract](scripting.md#errors-pending-work-and-reset).
- [Storage](storage.md) models a Chromium-oriented enumerable-data subset, not persistence, remote sync, policy loading,
  write-rate limits or context access permissions. Only sync has default size/count quotas. Session/managed byte usage
  stays configurable. Default callbacks and change dispatch start synchronously; `flushChanges()` observes automatic
  listener failures separately from successful writes. Reset cannot cancel consumer code or detached async work.
  The `firefox` profile also uses this Chromium-oriented codec (`Date`/`RegExp` without enumerable properties become
  `{}`), so it must not be used to establish Firefox-specific serialization behavior without a real Firefox probe.
- Root `tabs.sendMessage()` and all `tabs.connect()` calls remain configurable stubs. Explicit [context-bound
  messaging](messaging.md) routes runtime/tab requests to registered listeners with per-context ownership. It does not
  load application code, isolate JavaScript realms or implement long-lived ports. Raw `onMessage.emit()` stays manual.
- Contextual messages/responses use JSON serialization in **every** profile, including Firefox/Safari, not structured
  clone. `messaging.promiseListeners` explicitly selects `accept` (default) or `ignore`; it is not inferred from a browser
  profile/version. Ignored Promise failures are observable in `ignoredPromiseRejections`, not used as replies. A listener
  that never responds produces `undefined` for a Promise caller but an unanswered-port `lastError` for a callback caller.
  Explicit `sendResponse()`/`sendResponse(undefined)` instead produce `null`. No receiver rejects in contextual mode,
  unlike the legacy root behavior below. Globals are
  not async-local: concurrent/nested sends must use explicit bound APIs to retain the sender across awaits.
- `runtime.getContexts()` reads registered extension contexts and excludes content scripts. Document/frame lifetimes
  and cleanup are explicit; updating a tab URL does not simulate navigation.
- [Offscreen](offscreen.md) creation/closure shares that registry, with explicit delay/failure gates and reset cancellation.
  It does not load HTML, create a DOM, enforce permissions/MV3 or API restrictions, model separate incognito profiles, or
  perform audio-based automatic closure. All kit profiles expose the same adapter, including Firefox/Safari profiles;
  native API availability is not implied. Disable methods through capabilities to test absence. Closing disposes
  context-owned work and routed responses but not unscoped root runtime message channels.
- Unbound/root `runtime.sendMessage()` resolves `undefined` when there are no message listeners. Chrome can instead report
  `Could not establish connection. Receiving end does not exist.` through callback-scoped `runtime.lastError` (or a
  rejected Promise).
- A synchronous `runtime.onMessage` listener return is not a response: every value except literal `true` is ignored.
  Return a Promise/thenable or call `sendResponse()` to answer; literal `true` only keeps the response channel open.
- A held-open root message channel has no automatic browser-lifecycle timeout. It remains pending until `sendResponse()` or
  `harness.runtime.closeMessageChannels()`; explicit closure rejects with the exact message
  `Browser method "runtime.sendMessage" message channel closed before a response was received.`; `harness.reset()` also
  closes pending message channels. Contextual channels additionally follow sender/receiver disposal, with the API-named
  error and explicit controls documented in [messaging](messaging.md#pending-channels-and-teardown).
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
cross-context execution/transport compatibility, content-script injection, browser UI, security boundaries, and browser-specific timing.
