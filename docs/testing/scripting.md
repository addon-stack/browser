# Scripting targets and explicit executors

`scripting.executeScript` can use registered documents to select frames and wrap the result of a test-supplied
executor. It never executes `func`, evaluates JavaScript, reads files or creates a DOM by itself. Without an executor
or a configured method result, calls fail with a `scripting.executeScript` configuration error.

## Plain Node: test the real wrapper

```ts
import assert from "node:assert/strict";
import {executeScript} from "@addon-core/browser";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "@addon-core/browser/testing";

const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})]});
harness.contexts.documents.create({tabId: 7, frameId: 0, url: "https://page.test/"});
harness.contexts.documents.create({tabId: 7, frameId: 3, url: "https://frame.test/"});

// A metadata-only executor: this tests application routing, not the injected function's behavior.
harness.scripting.setExecutor(({target}) => `title for ${target.url}`);
const restore = installBrowserGlobals(harness);

try {
    const results = await executeScript<string>({
        target: {tabId: 7, allFrames: true},
        func: () => document.title,
    });
    assert.deepEqual(results.map(item => item.result), ["title for https://page.test/", "title for https://frame.test/"]);
} finally {
    harness.reset();
    restore();
}
```

## Target selection

`harness.scripting.selectTargets(target)` is a synchronous, read-only control, independent of execution and method
call history. It returns frozen `BrowserScriptTarget` snapshots: document metadata and associated `contextIds`.

- `tabId` is required and must refer to an in-memory tab. A tab alone does not register its document.
- Omitted selectors or `allFrames: false` select frame `0`; `allFrames: true` selects all registered documents in that tab.
- `frameIds` and `documentIds` select specific documents, always restricted to that tab. Combining selectors is rejected.
- There is one target per document, including documents without content-script contexts. Multiple contexts sharing a
  document do not produce duplicate results. Duplicate selector IDs are deduplicated.
- Unknown options, empty selector arrays, missing tabs/documents/frames and an empty target set fail explicitly.
  This strict validation is a test-kit contract, not a claim about every browser's partial-injection behavior.
- Results use the selected document's `frameId` and `documentId`, with frame `0` first. Other frames are sorted by ID
  for determinism; real browsers do not guarantee their order.

Background workers and non-tab Offscreen documents are not injection targets. Creating an extension context in a
tab does not grant native scripting permission. Host permissions, restricted URLs and per-context API availability
are not enforced by this target model.

## Executor contract

```ts
import type {BrowserScriptExecutor} from "@addon-core/browser/testing";

const executor: BrowserScriptExecutor = request => {
    // request.target: document snapshot + contextIds
    // request.signal: aborts when this operation is cancelled
    // request.world: "ISOLATED" (default) or "MAIN"
    // request.injectImmediately: boolean (default false)
    if (request.script.kind === "function") {
        // request.script.source: serialized function text, NOT the live function
        // request.script.args: a separate JSON snapshot for each target
        return {documentId: request.target.documentId, received: request.script.args};
    }
    throw new Error("This executor does not support files");
};
```

Install it with `harness.scripting.setExecutor(executor)`; remove it with `setExecutor(undefined)`. These changes affect
future calls; pending requests keep their captured executor until they settle or are cancelled. Each selected
document gets one invocation. Returned values and arbitrary thenables are awaited and wrapped by the kit; executors
must not return an `InjectionResult` envelope themselves. Results cross a JSON-copy boundary before delivery,
so caller/target results do not share mutable references. Top-level `undefined` is preserved; otherwise normal JSON
conversions apply (for example Date becomes a string, undefined object fields disappear). Cycles, BigInt and
nonserializable top-level results reject. This portable subset works without `structuredClone` in jsdom and is
consistent across profiles; it is not an emulation of browser-specific result serialization.

Function arguments use JSON serialization in all profiles, including its normal omission/null conversions;
cycles and BigInt reject. Functions are serialized with `Function.prototype.toString`; native/bound functions reject.
The original function and its closure are never passed to the executor. The adapter itself is trusted test code and
can access its own closure: this is not a security sandbox or proof of isolation for a custom evaluator.

For `files`, the executor receives paths in order, once per target; the kit neither resolves nor loads those paths.
The adapter must explicitly support this form or throw. `world` and `injectImmediately` are validated metadata,
not separate JavaScript realms or a simulated page-loading scheduler. The portable entrypoint includes no evaluator,
DOM, file loader, execution-world persistence, permission enforcement or automatic content-script execution.
An explicit [Node executor](node.md) is available separately from `@addon-core/browser/testing/node`.
The alternative [persistent Node runtime](node-runtime.md) uses the same adapter contract with classic-script bootstrap
and document/world state. Bind it to `harness.contexts.documents` for automatic realm cleanup on removal/reset, or use
standalone mode with explicit disposal. Reset never reinstalls the executor or replays bootstrap.

## Errors, pending work and reset

Both facades retain the original callback/Promise overloads. Errors reject Promises; callback calls return
`undefined` and expose `runtime.lastError` only during the callback. Executor failures include the API name, target
document ID and failure details in the
message and retain the original error as `cause` on the Promise path. The public wrapper uses the callback path,
whose `lastError.message` does not preserve that cause.

`pendingExecutions` counts requests, not frames. Any failed target fails the whole request and aborts siblings;
partial results are not returned. Requests remain pending while their adapter's Promise is pending. There is no
implicit timer. `harness.scripting.cancelExecutions()` rejects current requests and aborts their signals.

This describes **adapter failures**, not native exceptions in injected code. Measured Chrome for Testing
148.0.7778.96 resolves both callback and Promise `allFrames` calls when only the child throws/rejects: the main
result survives, the child result is `null`, and neither `error` nor `runtime.lastError` is present. Chrome returns
`{}` for `document.body`, `{self: null}` for a self-referencing object, and `null` for BigInt. The general kit's JSON
boundary also produces `{}` for a plain jsdom body, but intentionally rejects cycles/BigInt. These differences
are not proof of Firefox/Safari behavior. Chrome also returns explicit `result: null` for void/undefined and only own
enumerable fields for Date/RegExp (bare instances and Invalid Date become `{}`). The browser smoke locks in these outcomes separately from
target-routing comparisons and compares them with the opt-in Node executor, which distinguishes injected-code errors
from infrastructure failures. Installing that executor is an explicit choice of its documented result codec and
exception policy; it does not change the generic adapter contract above.

Removing a target document, its parent frame or its tab/window cancels the request. Removing any context associated
with a target **at dispatch time** also cancels it, even if another context still shares that document. Removing an
unrelated context does not. Later-created contexts do not join an already dispatched request. This conservative
lifetime policy is explicit test infrastructure, not browser parity. `documents.onRemoved(id, cleanup)` subscribes
to a specific document lifetime; it returns an unsubscribe function and does not follow a reused ID.

`harness.reset()`, `harness.contexts.reset()` and `harness.scripting.reset()` cancel pending work, remove internal
subscriptions and clear the executor. Context/harness reset restores initial document/context fixtures. A late
adapter result/rejection stays observed but cannot revive a cancelled request. Abort cannot forcibly stop trusted
adapter code or undo its external side effects; adapters should cooperate with the signal.

`harness.scripting.executeScript.reset()` only clears method configuration/history and preserves the installed
executor. `setResult`, `queueResult`, `setImplementation` and `failNext` retain their existing precedence. These
method-level overrides bypass target selection, executor invocation and lifetime tracking: use them deliberately
when testing ready-made results/errors rather than modeled execution.

## Jest and jsdom

Use the same API from Jest; no module mock or fake timers are needed:

```ts
import {expect, test} from "@jest/globals";
import {executeScript} from "@addon-core/browser";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "@addon-core/browser/testing";

test("application requests the child frame", async () => {
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})]});
    harness.contexts.documents.create({tabId: 7, frameId: 3, url: "https://frame.test/"});
    harness.scripting.setExecutor(({target}) => target.frameId);
    // In jsdom, preserve the test's window/document/location/navigator.
    const restore = installBrowserGlobals(harness, {environment: "preserve"});
    try {
        const results = await executeScript<number>({target: {tabId: 7, frameIds: [3]}, func: () => 42});
        expect(results[0].result).toBe(3); // adapter value, not evaluation of func
        expect(harness.scripting.executeScript.calls[0].args[0]).toMatchObject({target: {frameIds: [3]}});
    } finally {
        harness.reset();
        restore();
    }
});
```

Preserving jsdom does not make its document an injection target or execute scripts inside it. Register targets
explicitly; keep DOM execution tests separate until a suitable executor is supplied.

## Evidence and boundaries

The [Chrome scripting reference](https://developer.chrome.com/docs/extensions/reference/api/scripting) defines
main-frame defaults, selectors, per-frame results, function serialization and Promise handling. The real-browser
smoke compares selectors, frame/document IDs, main-first ordering, duplicate-frame selection and two invalid-target
cases through callback and Promise APIs. Target comparisons use actual Chrome execution and a metadata-only fake
executor. Separate outcome comparisons execute the same source in the Node executor; neither check validates a
complete DOM, all execution-world behavior or every browser error. Closure isolation is checked in Node unit tests. See
[running the smoke](match-patterns.md). Firefox/Safari profile unit tests exercise compatibility facades, not those
browsers' runtimes.
