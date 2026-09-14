# Test contexts and documents

`harness.contexts` is an in-memory registry owned by one harness. It models background contexts, extension pages,
offscreen documents and content scripts. Documents and frames exist independently of a registered content script.
Registration does not load code, change globals or create a DOM. Explicitly bound [messaging facades](messaging.md)
route messages to registered context-local listeners; root messaging remains a separate compatibility mode.

## Registering documents and contexts

```ts
import {
    createBrowserHarness,
    createTabFixture,
} from "@addon-core/browser/testing";

const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})]});
const mainDocument = harness.contexts.documents.create({
    documentId: "page-main",
    tabId: 7,
    url: "https://example.test/page",
});
const frameDocument = harness.contexts.documents.create({
    documentId: "page-frame",
    tabId: 7,
    frameId: 3,
    parentFrameId: 0,
    url: "https://frame.example.test/",
});

const background = harness.contexts.create({contextId: "background", kind: "background"});
const content = harness.contexts.create({
    contextId: "content-frame",
    kind: "contentScript",
    documentId: frameDocument.documentId,
});
const offscreen = harness.contexts.create({kind: "offscreen"});
```

Document IDs and context IDs are different identifiers. Omitted IDs are deterministic counters local to this harness.
The top frame defaults to `frameId: 0`; use `parentFrameId` to describe child-frame relationships and register parents
before children. A tab/frame can have only one registered document. To model navigation, remove the old document and
create a new one. Removing the main document removes all registered frames in that tab; removing a child also removes
its known descendants. There is no implicit navigation simulation when changing `tabs.update().url`.

New tab documents require a tab in the harness. Their window and incognito state come from that tab. Extension
contexts require an extension URL; content-script URLs come from their host document. Offscreen documents have
`tabId: -1`, `windowId: -1` and a top-level `frameId: 0`, as observed in the Chromium probe. The raw registry allows arbitrary fixtures; the [Offscreen adapter](offscreen.md) enforces a single
document for API creation and reports ambiguous multi-context fixtures explicitly.

New background contexts default to documentless workers with a `background.js` script URL. An explicit registered
`documentId` can represent a background page. Extension pages default to `index.html`, offscreen to `offscreen.html`.
For extension pages, `contextType` can select `TAB`, `POPUP`, `SIDE_PANEL` or `DEVELOPER_TOOLS`.

`context.info` and the document `get()`/`list()` methods return detached snapshots. `context.info.url` identifies the
worker script or document; document-backed contexts also have native `documentId`, `documentUrl` and `documentOrigin`.
Worker script URLs are not invented as native document fields.
Installing a different browser profile does not rewrite previously registered URLs. Register new contexts after
installing that profile to use its URL scheme, or supply native fixtures with explicit browser-specific URLs.

## Runtime queries and fixtures

`harness.runtime.getContexts` reads this registry. It remains configurable through `setResult`, `setImplementation`
and `failNext`; those overrides do not mutate the registry. Production `getContexts()`, `getOffscreenContext()`,
`getOffscreenPath()` and related query helpers observe registered extension contexts through fake globals.

```ts
const offscreenContexts = await harness.browser.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
});
const frameContexts = harness.contexts.list({kinds: ["contentScript"], tabIds: [7], frameIds: [3]});
```

All specified filters combine with AND; values within an array combine with OR; an empty array matches nothing.
Native context filters are supported, and `contexts.list()` additionally accepts `kinds`. Unknown filters throw.
Content scripts are visible through `contexts.list()` but are excluded from `runtime.getContexts()`; they are not
misrepresented as Chrome `TAB` contexts.

Constructor `contexts` accepts both the new `{kind, ...}` options and existing Chrome `ExtensionContext` fixtures:

```ts
const harness = createBrowserHarness({
    contexts: [{contextId: "background", kind: "background"}],
    documents: [{documentId: "options", url: "chrome-extension://test-extension-id/options.html"}],
});
```

Existing `runtime.contexts`, `addContext`, `removeContext` and `setContexts` use the same registry. Native fixture
fields remain intact, including intentionally incomplete fixtures used for malformed-context tests. Native fixtures
with both a document ID and URL also register their document. `setContexts` replaces extension contexts, disposes
their resources, and leaves content-script contexts intact; invalid replacements fail before removing anything.
Document state has its own lifecycle and is removed explicitly or through tab removal/reset.

## Subscriptions and lifetime

Each context has an independent manual `onMessage` event:

```ts
const unsubscribe = content.onMessage.on((message, sender) => {
    // Verify context-local input.
});
await content.onMessage.emit({type: "refresh"}, {id: harness.runtime.id}, () => {});
unsubscribe();
```

This is raw event dispatch: `emit()` waits for listener promises but does not return a message response.
Context-bound `runtime.sendMessage()` and `tabs.sendMessage()` deliver to these same listeners through the separate
request/response dispatcher. There are no implicit subscriptions to other contexts or to root runtime events.

Use `onDispose` for synchronous cleanup and `track` to bind an asynchronous operation's observed lifetime:

```ts
const unsubscribe = content.onMessage.on(() => {});
const unregisterCleanup = content.onDispose(unsubscribe);
const observed = content.track(new Promise<void>(() => {}));
// Attach a rejection handler before removing/resetting a context with pending operations.
const settled = observed.catch(error => error);
harness.contexts.remove(content.info.contextId);
await settled;
```

Removal clears context-owned listeners, aborts `context.signal`, rejects outstanding tracked operations with
`Browser test context "<id>" was disposed`, and runs cleanup callbacks. `onDispose()` returns an unregister function;
it does not invoke cleanup itself. Cleanup failures are aggregated after the other callbacks have run. Reusing a
disposed handle for registration or emission fails. Late results/rejections from tracked promises are observed and
cannot settle the returned operation again.

`track()` cannot stop arbitrary external code or undo its side effects. Operations that mutate application state must
cooperate with `context.signal`. It does not create a JavaScript realm or a security boundary.

Removing a context leaves its document available as an injection target. Removing the document or its tab also removes
all associated contexts. Stateful `tabs.remove`, `windows.remove` and fixture setters that remove tabs perform this
cleanup. Manually emitting `tabs.onRemoved` only dispatches an event; it does not change state.

## Reset and scope

`harness.reset()` restores tabs/windows and the original context/document fixtures, removes runtime-added contexts,
clears subscriptions, and cancels tracked operations. Old handles remain disposed; retrieve new handles with
`harness.contexts.get(id)`. Fixture callbacks/subscriptions are never automatically reinstated. If a cleanup throws,
the other components still reset and an error is reported afterward.

`harness.contexts.reset()` restores the registry, cancels pending stateful Offscreen operations and resets their controls.
Its initial tab fixtures must still exist; use `harness.reset()`
after changing/removing tabs to restore the whole model. Each harness has separate counters, state and lifetimes.

Offscreen and context-bound messaging share this registry and its disposal mechanism. Script execution is a
subsequent feature. The registry does not promise browser
lifecycle timing, worker suspension, permissions enforcement or concurrent execution of application modules in
separate realms. The Chromium smoke compares runtime-query visibility/filtering and basic Offscreen lifecycle; Firefox and Safari behavior is not
inferred from that check.
