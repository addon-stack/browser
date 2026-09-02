# Browser test harness and globals

`createBrowserHarness()` owns the fake state and call history. `installBrowserGlobals()` chooses how that state is
exposed to production code.

```ts
import {getAllPermissions, requestPermissions} from "@addon-core/browser";
import {
    createBrowserHarness,
    createPermissionsFixture,
    installBrowserGlobals,
} from "@addon-core/browser/testing";

const harness = createBrowserHarness({
    permissions: createPermissionsFixture({permissions: ["tabs"]}),
});
const restore = installBrowserGlobals(harness, {
    context: "serviceWorker",
    profile: "chrome",
});

try {
    await requestPermissions({permissions: ["downloads"]});
    const current = await getAllPermissions();
    // current.permissions contains tabs and downloads
} finally {
    restore();
}
```

Profiles are `chrome`, `firefox`, `opera`, `safari`, and `custom`. Contexts are `extensionPage`, `serviceWorker`,
`backgroundPage`, `contentScript`, and `none`. A profile installs a coherent set of `chrome`, `browser`, `opr`,
`safari`, `navigator`, `window`, and `location` markers and temporarily removes conflicting markers.
The `contentScript` context uses the deterministic host-page URL `https://example.test/content/page.html`, while
extension pages use an extension-style `/index.html` path.

The Chrome and browser facades are different objects backed by the same harness state. In a Firefox profile,
production wrappers normally route to `harness.browser` because `browser.runtime.id` exists. `harness.chrome` remains
available for explicit compatibility tests, but ordinary wrapper calls do not reach it. Sidebar helpers and browser
detection also inspect globals directly.

## Stateful and configurable controls

`harness.runtime`, `harness.permissions`, `harness.tabs`, `harness.windows`, and `harness.scripting` expose the stateful
controls and their methods/events. A namespace can still contain configurable members: for example,
`tabs.sendMessage` and `tabs.connect` record calls but do not invent tab-context message or port routing. Complex
namespaces are explicit configurable stubs:

```ts
harness.configurable.chrome.downloads.search.setResult([]);
harness.configurable.chrome.downloads.download.failNext(new Error("Downloads disabled"));

// Chronological calls across stateful and configurable methods:
harness.calls;
```

Use `.browser` instead of `.chrome` when configuring a Firefox or Safari profile. `harness.configurable.active` follows
the last profile selected by `installBrowserGlobals()`.

## Download validation delay

The production `download(options)` helper waits 100 ms before checking the created download. A fresh harness preserves
that default. To skip only this validation wait deterministically, opt in through the test-only delay control:

```ts
harness.delays.downloadValidation.setResult(undefined);
```

The real `download(options)` function still runs, and its raw `downloads.download` and `downloads.search` results must
be configured as usual. After it reaches validation, `harness.delays.downloadValidation.calls` records the requested
delay with `args: [100]`.

Use `setImplementation()` to hold validation until the test releases it:

```ts
let releaseValidation = () => {};
const validationGate = new Promise<void>(resolve => {
    releaseValidation = resolve;
});

harness.delays.downloadValidation.setImplementation(() => validationGate);
// Start download(options) with configured raw results.
// After it reaches the delay hook, release validation when ready:
releaseValidation();
```

The hook belongs to this harness's fake facades. It does not replace global timers, affect unrelated harnesses, or add
a scheduler argument to the production API. `harness.reset()` clears its calls and configuration and restores the real
100 ms default. This control does not model browser download completion, permissions, or lifecycle timing.

## Installing exact globals

Use `installGlobals()` for low-level scenarios:

```ts
import {installGlobals} from "@addon-core/browser/testing";

const restore = installGlobals({
    browser: undefined, // temporarily remove it
    chrome: customChromeApi,
    navigator: {userAgent: "Test Browser/1"},
});

try {
    // run application code
} finally {
    restore();
}
```

An omitted field is untouched; an explicitly supplied `undefined` temporarily removes that global. Restoration is
idempotent and restores exact original property descriptors, including globals that were originally absent.

## Capabilities

Capabilities are method-level. Disabling one physically removes the member so feature detection remains meaningful:

```ts
harness.capabilities.set("runtime.getBrowserInfo", false);
```

An unknown capability name fails explicitly. `harness.reset()` restores state, methods, events, call history, and the
default capability set.

## Runtime errors and listener errors

`runtime.sendMessage` is connected to the harness `runtime.onMessage` event. Listeners receive the configured sender,
may call `sendResponse`, return a Promise or thenable response, or return `true` to keep the response channel open for
a later `sendResponse`. The first response wins. `harness.runtime.emitMessage()` uses the same dispatch path and
returns its response.

```ts
import {onMessage, sendMessage} from "@addon-core/browser";

const unsubscribe = onMessage((_message, _sender, sendResponse) => {
    queueMicrotask(() => sendResponse({ok: true}));
    return true;
});

const response = await sendMessage({kind: "ping"});
unsubscribe();
// response is {ok: true}
```

A listener that returns `true` without eventually calling `sendResponse()` leaves the test Promise pending, just as it
leaves the modeled response channel open. Close such channels explicitly when testing teardown or failure behavior:

```ts
import assert from "node:assert/strict";

const unsubscribe = harness.runtime.events.onMessage.on(() => true);
const pendingResponse = harness.browser.runtime.sendMessage({kind: "ping"});

harness.runtime.closeMessageChannels();
await assert.rejects(pendingResponse, {
    message: 'Browser method "runtime.sendMessage" message channel closed before a response was received.',
});
unsubscribe();
```

`harness.reset()` closes pending channels as part of reset. Synchronous listener returns other than literal `true` are
ignored; use `sendResponse()` or return a Promise/thenable for a response. With no listeners, the harness resolves
`undefined` instead of reproducing Chrome's `Receiving end does not exist` error.

For a callback-style method configured to fail, `chrome.runtime.lastError` exists only during the callback. The same
failure through a Promise rejects without setting `lastError`.

```ts
let observed: chrome.runtime.LastError | undefined;

harness.tabs.query.failNext(new Error("Tabs unavailable"));
harness.chrome.tabs.query({}, () => {
    observed = harness.chrome.runtime.lastError;
});

// observed?.message === "Tabs unavailable"
// harness.chrome.runtime.lastError === undefined after the callback
```

`captureListenerErrors: true` is opt-in sugar over a temporary `console.error` wrapper. Known `safeListener` prefixes
are recorded as structured listener errors. Unknown calls are retained as raw entries and forwarded to the original
`console.error`; the default does not intercept or silence the console.

When a harness is reused, reset all state and controls explicitly:

```ts
harness.reset();
// call history and listeners are empty; initial fixtures and capabilities are restored
```
