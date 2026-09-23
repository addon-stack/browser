# Guest virtual clocks

`createNodeScriptRuntime({clock: true})` explicitly installs guest-owned timers and time sources. Nothing advances
by wall time. No Jest/Sinon clock is used, and host `Date`, `performance` and timers are never patched.
The fresh-realm `createNodeScriptExecutor()` is unchanged. This feature is only in `@addon-core/browser/testing/node`.

## Public contract

```ts
interface NodeScriptClockOptions { readonly epoch?: number }
interface NodeScriptClockRunOptions { readonly maxTimers?: number }
interface NodeScriptClock {
    readonly now: number;
    advance(ms: number): void;
    runAll(options?: NodeScriptClockRunOptions): void;
}
// createNodeScriptRuntime({clock?: true | NodeScriptClockOptions})
// runtime.clock: NodeScriptClock | undefined
```

Omit `clock` to retain the existing runtime behavior: no timers/performance, native guest Date. `true` is equivalent
to `{epoch: 0}`. Epoch is an integer Unix timestamp within the JavaScript Date range; invalid options fail explicitly.
`clock.now` is the absolute virtual timestamp shared by the runtime's worlds/documents, not elapsed time.

Each realm owns its callbacks, timer IDs and arguments. Only JSON timer metadata crosses into the host. A single
host-owned registration counter merges those queues by deadline, then registration order; neither realm Map order
nor local timer IDs determine cross-document ties. Rearming an interval counts as a new queue insertion before its
callback runs. This is an explicit kit ordering contract, not a model of parallel browser renderer processes.

`advance(ms)` fires every timer due at or before the new timestamp, including timers scheduled by callbacks or guest
microtasks. It finishes at that timestamp. `advance(0)` runs currently due timers. Negative, fractional, non-finite
advances and Date overflow are rejected without advancing time. `runAll()` jumps between deadlines until queues are
empty. Neither method returns a Promise or contains host `await` checkpoints.

Each callback runs in `runInContext`, with `afterEvaluate` guest microtasks followed by the runtime's existing
completion `drain()`. The clock does **not** run host Promise continuations: advance first, then await your request.
Async timer callbacks do not pause the clock; subsequent awaited guest work can schedule more timers.

## Plain Node (also usable inside Jest/jsdom)

```ts
import assert from "node:assert/strict";
import {executeScript} from "@addon-core/browser";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "@addon-core/browser/testing";
import {createNodeScriptRuntime} from "@addon-core/browser/testing/node";

const harness = createBrowserHarness({
    tabs: [createTabFixture({id: 7})],
    documents: [{documentId: "main", tabId: 7, url: "https://page.test/"}],
});
const runtime = createNodeScriptRuntime({documents: harness.contexts.documents, clock: {epoch: 1000}});
const clock = runtime.clock!;
const restore = installBrowserGlobals(harness, {environment: "preserve"});
harness.scripting.setExecutor(runtime.executor);

try {
    const pending = executeScript({target: {tabId: 7}, func: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {time: Date.now(), elapsed: performance.now()};
    }});
    clock.advance(299);
    assert.equal(runtime.pendingExecutions, 1);
    clock.advance(1);
    assert.deepEqual((await pending)[0].result, {time: 1300, elapsed: 300});
} finally {
    runtime.dispose();
    harness.reset();
    restore();
}
```

Use the same setup/teardown in Jest hooks without `jest.useFakeTimers()`. In jsdom, `environment: "preserve"` keeps
the host DOM but does not copy it into the guest. Inline injected functions must be uninstrumented; the existing
[coverage limitation](node.md#coverage-instrumentation) still applies. Keep coverage tests for application code separate.

## Time sources and supported timer subset

- `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval` use realm-local numeric IDs; either clear function can
  cancel either timer kind. Unknown IDs are no-ops. Callbacks receive supplied arguments and guest `globalThis` as `this`.
- Only function handlers are accepted, never strings. Delay defaults to 0; finite numeric values up to 2147483647 ms
  are accepted, fractions truncated and negative values clamped to 0. Strings/NaN/infinities/overflow fail explicitly.
- No nested-timer 4 ms clamp, background throttling, animation frames, idle callbacks or real-time execution is modeled.
- Guest Date is replaced: `Date.now()`, `new Date()` and `Date()` follow virtual time; explicit constructor arguments,
  parsing and UTC helpers retain native behavior. Formatting still uses the host machine's locale/timezone.
- `performance` is added, not replaced: `timeOrigin` is the virtual timestamp when the realm is created; `now()` is
  elapsed virtual milliseconds since then. Other Performance APIs are absent.
- `queueMicrotask` is not provided. Use guest Promise microtasks; this is not a complete browser event loop.

## Budgets, errors and reentrancy

`advance` has a 10,000-callback budget per call. `runAll({maxTimers})` can override its own default of 10,000.
An uncleared interval or self-rescheduling zero-delay timeout eventually exceeds that budget. The synchronous error
identifies how many callbacks fired and the last timer's kind, delay, document and world. Time remains at the last
processed deadline; state and queues are preserved so the test can cancel the timer or dispose the runtime.

The callback budget does not interrupt a synchronous loop or an infinite guest microtask chain. The existing opt-in
wall-clock VM `timeout` and its [async-hooks caveat](node-runtime.md#scope-and-safety) still apply. No timeout is enabled
implicitly by the clock. An uncaught timer callback throw, or observed rejection of its returned Promise, is an
infrastructure failure at a VM checkpoint: the realm is invalidated and pending requests reject. This fail-fast timer
policy is a kit contract, not Chrome's detached-error reporting. A rejection of a **tracked injected function** still
uses the measured per-target `null`/`onScriptError` behavior; clocks do not change that codec.

Diagnostic callbacks can remove/reset documents, dispose the runtime or explicitly bootstrap a replacement. The
clock reselects from live queues after every callback/drain; it cannot fire an old realm's next timer. Nested
`advance`/`runAll` calls fail explicitly instead of interleaving clock operations. Dispose during advancement stops it
with a disposed error. No host callback is installed inside the guest to control these operations.

## Lifecycle and acceptance

Deleting a document, registry/harness reset, VM invalidation or dispose drops the corresponding realm queues.
Reusing an ID starts with empty queues and a new Performance origin. A registry reset is nonterminal; dispose is
terminal. Neither rewinding time nor replaying bootstrap happens automatically: `clock.now` remains monotonic across
document resets; create a new runtime for a fresh epoch. Reset still requires an explicit `setExecutor()`.
`scripting.reset()` and per-request abort cancel results but preserve live realm state/timers. They cannot undo guest
side effects; late completions of cancelled requests remain ignored.

The standalone acceptance uses an inline retry loop: attempt 1 at 0, attempt 10 at 2700 (nine waits of 300 ms).
It checks 2699/2700, late registration, concurrent requests and deletion while pending without Addon Bone or wall time.
The real Relay consumer check is separate, with current failure behavior explicitly tied to
[Addon Bone #109](https://github.com/addon-stack/addon-bone/issues/109). Host `timeoutMs` is omitted in these scenarios.
With a consumer's 4000 ms host timeout enabled, awaiting a pending request without advancing guest time can still
produce a real-time `InjectScriptTimeoutError`; host timers remain the consumer test infrastructure's responsibility.

The Chrome smoke measured `Promise c → timeout a → a's microtask → timeout b` before implementation on Chrome for
Testing 148.0.7778.96 and compares that same function against this runtime. It does not validate virtual time itself,
cross-document scheduling, interval clamping/throttling, Firefox or Safari behavior.
