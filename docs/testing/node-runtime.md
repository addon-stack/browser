# Persistent Node script runtime

`createNodeScriptRuntime()` is an opt-in alternative to the [fresh-realm Node executor](node.md), exported only from
`@addon-core/browser/testing/node`. It preserves guest state between injections, separately for each
`(documentId, world)` pair. Different runtime instances never share that state. Omitted `world` means `ISOLATED`.

The runtime supports classic-script bootstrap, state, guest microtasks and optional document lifecycle binding.
Virtual guest clocks are **not implemented yet**. The existing
`createNodeScriptExecutor()` keeps its fresh-realm behavior unchanged.

## Bootstrap a guest-owned object

```ts
import assert from "node:assert/strict";
import {executeScript} from "@addon-core/browser";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "@addon-core/browser/testing";
import {createNodeScriptRuntime} from "@addon-core/browser/testing/node";

const harness = createBrowserHarness({
    tabs: [createTabFixture({id: 7})],
    documents: [{documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"}],
});
const runtime = createNodeScriptRuntime({documents: harness.contexts.documents});
harness.scripting.setExecutor(runtime.executor);
const restore = installBrowserGlobals(harness, {environment: "preserve"});

try {
    runtime.evaluate({documentId: "main"}, {
        filename: "counter-bootstrap.js",
        source: `
            class Counter {
                constructor() { this.value = 0; }
                async add(amount) { return this.value += amount; }
            }
            globalThis.counter = new Counter();
        `,
    });

    for (const expected of [2, 4]) {
        const [result] = await executeScript<Promise<number>>({
            target: {tabId: 7},
            func: async (amount: number) => {
                const guest = globalThis as typeof globalThis & {counter: {add(value: number): Promise<number>}};
                return guest.counter.add(amount);
            },
            args: [2],
        });
        assert.equal(result.result, expected);
    }
} finally {
    runtime.dispose();
    harness.reset();
    restore();
}
```

The class and its instance are created **inside** the guest. No live host manager, function or test closure is passed
into the VM. The example also works in Jest/jsdom: `environment: "preserve"` preserves the host DOM, but does not
copy that DOM into the guest. Use the same teardown in `afterEach` if setup spans several test hooks.

For application managers, the consumer builds a standalone classic/IIFE bundle and supplies its JavaScript text as
`source`. `codeGeneration.strings: false` forbids `eval`/`new Function`, including bootstrap shims that use them;
the bundle must work without runtime string compilation. This kit does not read files, compile TypeScript, resolve
packages or know about Relay or other application managers. `executeScript({files: [...]})` remains unsupported by this adapter. Instrumented application functions still
have the [coverage limitation and explicit missing-helper diagnostic](node.md#coverage-instrumentation); keep host
coverage tests separate from VM scenarios rather than disabling coverage for an entire subsystem.

## Bootstrap and asynchronous execution

`evaluate(realm, {source, filename?})` is a **synchronous classic script**, not a module or an async readiness API.
Global `var`/`let`/class declarations retain classic-script scope. Completion values are ignored. Already runnable
guest microtasks drain at the end of the VM entry, but bootstrap must not depend on an unobserved asynchronous
initialization/rejection. Detached asynchronous work is not tracked; a detached rejected Promise can surface as an
unhandled rejection in Node. Run async operations through `executor`/`executeScript` for tracked results instead.

The VM uses `microtaskMode: "afterEvaluate"`. Guest functions, Promises and mutable results stay in the guest;
the host receives serialized JSON completion packets with request IDs and resolves its own Promises. It does not
await a guest Promise directly. A later `evaluate()` or injection can resolve an earlier pending operation, including
out of order, without exchanging the responses of independent requests. For example, bootstrap may synchronously
call a resolver previously stored in guest `globalThis` by an injected function.

There are no host timers or external callbacks injected to advance pending guest work automatically. A Promise
with no resolution source stays pending until explicit cancellation/disposal. `pendingExecutions` reports tracked
executor calls, not detached guest Promises; `realmCount` reports allocated document/world environments.
Future virtual-clock steps must each enter the VM and drain completion packets after that entry; resolving a guest
Promise without delivering its queued completion is not a completed clock step. Virtual clocks are not available yet.

See [Node's microtask and cross-context Promise documentation](https://nodejs.org/api/vm.html#when-microtaskmode-is-afterevaluate-beware-sharing-promises-between-contexts).

## Errors and cleanup

- A function throw/rejected result produces per-target `null`, optionally observed through `onScriptError`, using
  the existing Node executor's [measured result codec](node.md#script-exceptions-versus-infrastructure-failures).
  An ordinary script failure does not discard persistent state or undo prior side effects.
- Compilation errors, synchronous bootstrap throws and VM timeouts invalidate that realm and reject its pending
  executions. Their errors include the document, world and filename. Other realms remain available. Subsequent
  executor calls for the failed pair reject with `realm invalidated by …; bootstrap it again with runtime.evaluate()`;
  they do not silently allocate an empty realm. The saved reason is diagnostic text, not a retained guest Error.
- Only a successful explicit `evaluate()` recovers the pair in a fresh realm. A failed recovery discards its partial
  state and records the latest VM failure; invalid call arguments leave the existing reason unchanged. Even an empty
  classic script counts as explicit recovery: the kit does not verify that an application manager was registered.
  This fail-closed recovery policy is a kit contract, not Chrome rollback. A pair never invalidated may still be lazily
  created by its first executor call without bootstrap.
- Aborting an executor request releases its pending result, ignores late replies and preserves its realm and sibling
  requests. It does not stop arbitrary code or undo mutations. The general scripting harness can still cancel an
  entire multi-target request when one target is removed or an adapter fails.
- `dispose()` rejects pending calls and drops all runtime-owned realm references and invalidation records. It is idempotent and terminal;
  create a new runtime for the next test. Calling `evaluate()` or `executor` after disposal fails explicitly.

## Standalone and document-bound modes

| Contract | No `documents` option | `documents: harness.contexts.documents` |
| --- | --- | --- |
| Document ID accepted by `evaluate()`/direct executor | Any non-empty ID | Must exist in the bound registry; otherwise infrastructure error |
| Registry document removal/reset | Does not clean runtime state | Rejects pending work, drops both worlds and their invalidation records |
| Reuse of a removed document ID | Requires manual disposal/new runtime | New lifetime starts clean and subscribes again |
| `dispose()` | Terminal cleanup | Terminal cleanup, also unsubscribes |

The binding uses only public `documents.get()` and `documents.onRemoved()`; it does not access internal reset hooks.
There is one lazy subscription per document, shared by both worlds. It survives VM invalidation even when no realm
remains. Document removal clears the subscription and the saved failure reasons, whereas a VM failure preserves the
subscription and blocks only that world until explicit successful bootstrap. Child-document, tab and window removal
follow the same registry cleanup path. Other documents/runtime instances are unaffected.

`harness.contexts.reset()` and `harness.reset()` remove the old document lifetimes before restoring seed fixtures.
The bound runtime survives and can subscribe to those new lifetimes. Both resets clear the installed scripting
executor; neither the executor nor bootstrap is restored automatically:

```ts
harness.reset();
harness.scripting.setExecutor(runtime.executor);
runtime.evaluate({documentId: "main"}, {source: bootstrapSource, filename: "manager.iife.js"});
```

Here `bootstrapSource` is the consumer's classic-script bundle. In Jest this sequence can be used for the next test's
setup, with `harness.reset()` in `afterEach` and `runtime.dispose()` when the suite is finished. Restore any installed
globals separately. A narrower `harness.scripting.reset()` only detaches the executor and cancels harness requests:
live document realms and invalidation records remain intact. Direct executor calls not owned by scripting remain
pending until their signal is aborted, their document is removed or the runtime is disposed.

In standalone mode, explicitly dispose the runtime before resetting the harness or reusing document IDs for a new
lifetime. Do not share a runtime between harnesses: IDs can collide, and bound mode has exactly one owning registry.
Before subscribing or allocating a realm, the bound executor checks document existence and compares the request's
`tabId`, `frameId` and `url` with that document. A mismatch rejects with an infrastructure error without changing
runtime state. This catches inconsistent snapshots, not provenance: identical metadata in two harnesses is still
indistinguishable. `evaluate()` has no target snapshot and checks only document existence.

### Optional real Relay consumer check

With a local Addon Bone checkout and its development dependencies installed:

```sh
npm run test:relay-consumer -- /path/to/addon-bone
```

This read-only consumer check uses that checkout's esbuild to bundle the actual RelayManager into guest classic code
and the actual RelayScriptingAdapter for the host. It exercises persistent calls, an undefined result, remote errors,
deferred responses, document removal, invalidation and reset against the built Browser entrypoints. The consumer
owns the bootstrap build; no Relay implementation or dependency is added to the published kit. It is optional and
not part of standalone Browser CI because it requires the separate consumer source tree. The ordinary clean-consumer
check covers lifecycle semantics through ESM/CJS/TypeScript/jsdom from a fresh Browser tarball.
This is not real-browser validation and does not exercise manager-registration retries or virtual timers.

Missing-manager acceptance for the virtual-clock stage is tracked in
[Addon Bone #109](https://github.com/addon-stack/addon-bone/issues/109): both missing-manager branches must return
an error envelope, and Relay must independently validate malformed/null responses. Prefer accepting the fixed
contract; if the consumer fix is deferred, explicitly label any current-behavior regression with that issue.
The guest-clock scenario must omit the consumer's host `timeoutMs` to keep the two clocks independent.

## Scope and safety

No `chrome`, `browser`, `window`, `document`, `location`, Node APIs, module loader, `fetch` or timers are installed.
In particular, a full content bundle that registers `chrome.runtime.onMessage` cannot run without a future explicit
API bridge. Standalone scripting-based managers can be bootstrapped without such a bridge.

MAIN and ISOLATED own separate VM realms here, but there is no shared DOM, browser scheduling, CSP or permission
model. `injectImmediately` remains metadata. The Chrome smoke compares state across successive calls and frame/world
isolation through callback and Promise APIs, not full execution-world parity or automatic navigation lifetimes.
The internal global `__addon_core_script_runtime__` is reserved for the packet driver; guest code must not modify
that driver or replace the VM intrinsics it depends on.

An optional positive integer `timeout` sets a **wall-clock limit per VM entry**, including guest microtasks drained by
that entry. It is disabled by default and is not an overall asynchronous deadline. Unlike the fresh executor, this
runtime can bound loops in its own `afterEvaluate` microtasks. It does not limit host code or provide a deterministic
step budget. `AbortSignal` cannot interrupt a running synchronous loop. Use external process supervision for hard limits.

**VM termination caveat:** in local Node 20.19.5 and 24.5.0 probes, timing out a guest microtask with active
`async_hooks` can corrupt Node's async stack and terminate the process, even after catching the timeout. This also
reproduces using `node:vm` alone; Jest on Node 20 exposed it during validation. Do not rely on a recoverable rejection
for such loops in an instrumented process. Our infinite-microtask timeout checks run in externally supervised clean
consumer subprocesses, without runner hooks. Normal asynchronous runtime tests also run inside Jest. No host hooks
are disabled or patched by the kit; opt-in VM timeout is not a substitute for process isolation.

Virtual guest timers/clocks belong to a later stage. Host timers, including a consumer's request timeout, are always
the consumer test infrastructure's responsibility; this runtime does not patch them. As with the existing executor,
[`node:vm` is not a security boundary](https://nodejs.org/api/vm.html): use trusted test code only.
