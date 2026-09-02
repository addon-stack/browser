# Testing limitations

The test kit models a documented subset of WebExtension behavior. Passing tests do not prove equivalent behavior in
Chrome, Firefox, Safari, Opera, or any other real browser.

## Intentional differences

- `tabs.query()` uses AND equality matching for `status`, `lastFocusedWindow`, `windowId`, `windowType`, `active`,
  `index`, `currentWindow`, `highlighted`, `discarded`, `frozen`, `autoDiscardable`, `pinned`, `splitViewId`, `audible`,
  `muted`, `groupId`, `title`, and `url`. `title` and `url` accept literal values only in v1; browser match patterns
  and wildcards fail explicitly instead of returning a potentially incorrect result. Use `tabs.get()` for an ID.
- Complex APIs outside runtime, permissions, tabs, windows, and the scripting content-script registry are configurable
  stubs. They do not simulate the browser unless the test supplies an implementation or result.
- `tabs.sendMessage()` and `tabs.connect()` are configurable stubs. The kit does not create content-script contexts,
  route messages to a particular tab/frame, or simulate long-lived ports.
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
- Browser-event dispatch uses a listener snapshot. A listener removed by another listener during the same `emit()` is
  still called for that dispatch; Chrome and DOM events skip a listener removed before its turn.
- The production `download()` helper currently includes a real 100 ms delay. The kit does not install fake timers or
  claim full timing determinism. A scheduler seam is tracked in
  [GitHub issue #24](https://github.com/addon-stack/browser/issues/24).

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

Use real-browser integration tests for permissions prompts, URL-pattern semantics, service-worker suspension,
cross-context messaging, content-script injection, browser UI, security boundaries, and browser-specific timing.
