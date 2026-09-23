# Storage

The harness supplies in-memory `chrome.storage` and `browser.storage`, without mocking `@addon-core/storage` or
depending on a test runner. State belongs to one harness and is shared by its two facades. Areas are independent.

## Plain Node

```ts
import assert from "node:assert/strict";
import {createBrowserHarness, installBrowserGlobals} from "@addon-core/browser/testing";

const harness = createBrowserHarness({
    storage: {
        local: {settings: {theme: "light"}},
        managed: {requiredPolicy: true},
    },
});
const restore = installBrowserGlobals(harness, {profile: "chrome"});
const changes: unknown[] = [];
const unsubscribe = harness.storage.onChanged.on((items, area) => {
    changes.push({items, area});
});

try {
    await chrome.storage.local.set({settings: {theme: "dark"}});
    assert.deepEqual(await chrome.storage.local.get("settings"), {settings: {theme: "dark"}});
    await harness.storage.flushChanges();
    assert.equal(changes.length, 1);
    assert.deepEqual(harness.storage.local.data, {settings: {theme: "dark"}});
} finally {
    unsubscribe();
    harness.reset();
    restore();
}
```

Seeds, stored values, results, `.data` snapshots and automatic change payloads are detached from caller-owned objects.
Changing a snapshot does not update storage. Supply initial `managed` policy data in the constructor; its normal
`set`, `remove` and `clear` operations fail as read-only, even for an empty update. No enterprise policy loader exists.

## API and controls

Every area (`local`, `sync`, `session`, `managed`) supports:

- `get()` / `get(null)` / `get(undefined)`: all items.
- `get("key")`, `get(["a", "b"])`: existing selected keys; missing keys are omitted.
- `get({a: 10, b: false})`: existing values or supplied defaults; `get([])` and `get({})` return `{}`.
- `set({...})`: atomic merge; `remove("key")` / `remove(["a", "b"])`; `clear()`.
- `getKeys()`: a new array of keys; browser ordering is not guaranteed.
- Per-area `onChanged`, plus global `storage.onChanged(changes, areaName)`.

These methods accept callbacks or return Promises when no callback is supplied. This is a profile-independent
compatibility model, not a claim about all Firefox/Safari versions. Default operations commit and invoke callbacks
synchronously; Promise consumers observe normal Promise resolution. Browser IPC/event timing is not simulated.
`getKeys()` is enabled by default for every area and profile; profiles do not emulate browser-version availability,
so use `harness.capabilities.set("storage.local.getKeys", false)` (and the corresponding paths for other areas) when
testing compatibility with a browser version that lacks this method.

`getBytesInUse()` is state-backed for **local and sync** and counts UTF-8 key bytes plus JSON value bytes. For
**session and managed** it is an explicit configurable stub: an unconfigured call fails with the API name. Session's
native allocated-memory estimate is not reproduced. `setAccessLevel`, quota constant properties, permission checks
and per-context storage access restrictions are not exposed/modelled.

Controls live at `harness.storage.local.get`, `.set`, etc., with the existing `calls`, `setResult`, `queueResult`,
`setImplementation`, `failNext` and `reset` methods. `harness.calls` includes paths such as `storage.local.get`.
Configuring a result/implementation replaces normal behavior; it does not implicitly mutate state or emit changes.
The controls are shared by both facades, unlike `harness.configurable.chrome` and `.browser` stubs.

```ts
harness.storage.local.set.failNext(new Error("Storage unavailable"));
chrome.storage.local.set({count: 1}, () => {
    // Defined only during this callback. State and events were not changed.
    assert.equal(chrome.runtime.lastError?.message, "Storage unavailable");
});
assert.equal(chrome.runtime.lastError, undefined);

harness.storage.local.get.failNext(new Error("Read denied"));
await assert.rejects(harness.browser.storage.local.get(), /Read denied/);
// Promise errors never install runtime.lastError.
```

`harness.capabilities.set("storage.local.get", false)` physically removes the method from both facades. Re-enabling
it restores the same control. `harness.reset()` restores capabilities, clears calls/overrides/listeners and restores
all constructor seeds; `.get.reset()` alone resets that method's configuration/history, not area data.

## Changes, asynchronous listeners and reset

An automatic change contains `oldValue` only when a key existed and `newValue` only when it exists after the write.
Unchanged serialized values, missing removals and empty updates do not emit. Object key order is ignored for equality.
The per-area event and global event receive separate payloads. Within either event, normal snapshot dispatch applies:
listeners share that event's payload and removed listeners still run in an already-started dispatch.

State commits before listeners are started. Automatic dispatch starts synchronously and does **not** wait for listener
Promises before resolving a write. A listener failure cannot turn a committed write into an API error. Always use
`await harness.storage.flushChanges()` when asserting async listeners or checking automatic listener failures. It
drains pending returned Promises/thenables (including reentrant writes), throws one failure directly or multiple as
`AggregateError`, and consumes the recorded failures. No `console.error` interception is installed by Storage.
Manual `.onChanged.emit()` retains the [raw event contract](primitives.md): its returned Promise reports its failures.

`reset()` discards old dispatch bookkeeping, removes subscriptions and rejects waiting `flushChanges()` calls with
`storage.flushChanges: harness reset before listeners completed.` Late results from old listeners are observed but
not reported into the next test. Reset cannot stop user code, detached work, or a custom implementation already
executing: consumers must dispose their own subscriptions/work. A listener that never finishes needs an explicit
reset; there is no hidden timeout. Flush sees only returned work, not a consumer's private queue or fire-and-forget
Promise. For those, wait for the consumer's own completion signal, as in the example below.

## Real `@addon-core/storage` consumer (Jest / jsdom)

```ts
/** @jest-environment jsdom */
import {expect, test} from "@jest/globals";
import {Storage, type StorageLocker} from "@addon-core/storage";
import {createBrowserHarness, installBrowserGlobals} from "@addon-core/browser/testing";

test("persists a namespaced setting and notifies the application", async () => {
    const harness = createBrowserHarness();
    const restore = installBrowserGlobals(harness, {environment: "preserve"});
    // Serial test only: use the consumer's injectable locker; this does not model Web Locks contention.
    const locker: StorageLocker = {async request(_name, task) { return await task(); }};
    const settings = new Storage<{theme: string}>({namespace: "app", locker});
    let notify: (theme: string | undefined) => void = () => undefined;
    const changed = new Promise<string | undefined>(resolve => { notify = resolve; });
    const unsubscribe = settings.watch({theme: value => { notify(value); }});
    try {
        await settings.set("theme", "dark");
        expect(await changed).toBe("dark");
        expect(await settings.get("theme")).toBe("dark");
        await settings.remove("theme");
        expect(await settings.get("theme")).toBeUndefined();
        await harness.storage.flushChanges();
    } finally {
        unsubscribe();
        harness.reset();
        restore();
    }
});
```

There is no module mock. Construct the consumer after installing globals. Node consumers can use the same code with
`node:assert` instead of Jest and omit the jsdom annotation. Preserve mode keeps the existing DOM and navigator.
Web Locks, consumer-manager cleanup and consumer async queues remain the application's responsibility.

The clean-consumer check installs the fresh browser tarball and **published `@addon-core/storage@0.7.0`**. That version
depends on `@addon-core/browser@^0.5.0`, so npm may install its own nested browser version; the test intentionally keeps
the published dependency tree without overrides. Both wrappers access the installed fake globals. The check covers
ESM and CJS kit imports (Storage itself is imported as ESM), TypeScript, jsdom, both API profiles, all writable areas,
namespace isolation, subscriptions/watch/unsubscribe, update/remove/clear, MonoStorage, managed reads and error paths.

**Known consumer defect in 0.7.0:** `getStoredItems` calls `Object.entries(result)` before reaching the wrapper's
`lastError` check. An injected read failure therefore rejects with `TypeError: Cannot convert undefined or null to
object`, losing the original error message. The consumer check explicitly records this behavior; the fake does not
return a misleading empty success object to hide it. Write errors retain their original message. Fixing the provider
belongs to `@addon-core/storage`, not this test-kit change. Raw Storage error channels are tested independently.

## Serialization and quotas

This is a Chromium-oriented **enumerable-data subset**, consistent across kit profiles:

- Strings, booleans, null, finite numbers, arrays and enumerable own data properties are recursively copied.
- `undefined`, functions and symbols are omitted from dictionaries; in arrays they become `null`. Array holes and
  non-finite numbers also become `null`. Omitting a value from `set` leaves an existing key unchanged.
- `toJSON` is not invoked. Objects such as Date, RegExp and Map with no enumerable own properties become `{}`.
- Cycles, BigInt, accessor properties and nesting deeper than 100 explicitly fail with the API name. Accessors are
  rejected rather than executed. Proxies, exotic objects, cross-realm behavior and arbitrary host objects are not a
  compatibility contract; use plain data or configure a result explicitly.

The dedicated codec is intentionally not `JSON.parse(JSON.stringify(value))`. The Chrome 148 smoke verifies the
Date/RegExp/function/undefined examples above, nested arrays, no-op suppression, change payloads and UTF-8 accounting.
This is narrower evidence than full browser parity; see the [Chrome storage reference](https://developer.chrome.com/docs/extensions/reference/api/storage).

Sync has default static limits: 102400 total bytes, 8192 bytes per item, 512 items. Other areas have no default quota.
Explicit size/count limits use this same JSON-byte model, **not** a session-memory estimate. Quotas validate the whole
candidate state before committing; a failure changes nothing and emits nothing. Constructor seeds must also fit.

```ts
const harness = createBrowserHarness({storage: {
    quotas: {
        local: {maxBytes: 1024, maxItems: 8},
        sync: false, // explicit opt-out from sync defaults
    },
}});
```

A supplied quota object replaces the defaults for that area. No write-rate timers, sync server, disk persistence,
`unlimitedStorage` inference, enterprise policy schema, storage-session lifecycle or access-level enforcement exists.
Real browser integration tests are required for those properties. Deleting a registered context does not clear shared
storage; context-aware access controls are outside this step.

## Verification

```sh
npm test -- --runInBand tests/testing/unit/api/storage.test.ts
npm run test:consumer-types
npm run test:browser-match-patterns -- "/absolute/path/to/chrome-for-testing"
```

The existing discoverable browser smoke also compares Storage using isolated temporary extension profiles, and runs
in the reusable CI/release pipeline. It checks Chromium only, not Firefox or Safari. Build before running it directly.
