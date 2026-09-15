# Explicit Node script executor

`@addon-core/browser/testing/node` supplies `createNodeScriptExecutor()` for **trusted test code**. It evaluates
serialized `func` source in `node:vm`; it is a separate ESM/CJS/types entrypoint, never imported by the portable
`@addon-core/browser/testing` entrypoint. No dependency on Jest or another runner is required.

Importing either subpath does not install globals or enable execution. Register documents and install the executor
explicitly. The [scripting harness](scripting.md) still owns target selection, result envelopes and cancellation.

## Plain Node

```ts
import assert from "node:assert/strict";
import {executeScript} from "@addon-core/browser";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "@addon-core/browser/testing";
import {createNodeScriptExecutor} from "@addon-core/browser/testing/node";

const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})]});
harness.contexts.documents.create({tabId: 7, frameId: 0, url: "https://page.test/"});
harness.contexts.documents.create({tabId: 7, frameId: 3, url: "https://page.test/frame"});

harness.scripting.setExecutor(createNodeScriptExecutor({
    // Data fixtures, not DOM objects. Every target receives its own copy.
    globals: target => ({document: {title: target.frameId === 0 ? "Page" : "Frame"}}),
}));
const restore = installBrowserGlobals(harness);

try {
    const results = await executeScript<string>({
        target: {tabId: 7, allFrames: true},
        func: (prefix: string) => prefix + document.title,
        args: ["Title: "],
    });
    assert.deepEqual(results.map(item => item.result), ["Title: Page", "Title: Frame"]);
    assert.deepEqual(results.map(item => item.frameId), [0, 3]);
} finally {
    harness.reset();
    restore();
}
```

Here `func` really runs, unlike a metadata-only executor or `executeScript.setResult(...)`. It cannot read the test's
lexical variables. Pass input through `args` or explicit globals, not a closure. Source must be a standalone function
expression; native/bound functions, method shorthand and transpilation/coverage helpers that reference outer scope
are not supported. Missing Istanbul helpers receive an explicit infrastructure diagnostic; see [coverage](#coverage-instrumentation).
Async functions and arbitrary thenables are awaited. For the production wrapper's generic,
use `executeScript<Promise<number>>` when `func` returns a Promise of a number.

## Realms and global fixtures

A **fresh VM context for every selected document on every call** owns its intrinsics, globals and arguments. There is
no persistent document execution state between injections. MAIN and ISOLATED both use this same fresh-realm policy;
`world` and `injectImmediately` remain metadata, not browser execution worlds, page scheduling or permissions.

By default there is no `window`, `document`, `location`, `chrome`, `browser`, `process`, `require`, `fetch` or
`setTimeout`. `() => document.title` without an explicit document fixture throws a guest `ReferenceError`, producing
the `null` script outcome described below. VM intrinsics such as `Object`, `JSON` and `Promise` are available; replacing
them through global fixtures is rejected. String/wasm code generation is disabled; no dynamic import loader is installed.

`globals` accepts a plain data dictionary or a synchronous `(target: BrowserScriptTarget) => dictionary` factory.
Static data is snapshotted when the executor is created; the factory is called for each execution. Values must be
JSON data: plain objects, arrays, strings, finite numbers, booleans and null. Cycles, accessors, symbols, functions,
class/DOM instances and other values fail explicitly. Depth is limited to 100. Copies are parsed inside the guest
realm; no mutable host reference is injected. Factory and diagnostic callbacks are trusted **host** code.

No files are loaded by this executor. Calls using `files` reject explicitly; configure a ready-made result or supply
your own executor for a file-based test. Registered content scripts do not execute automatically.

## Script exceptions versus infrastructure failures

The Node executor distinguishes two levels:

| Outcome | Result seen by the caller |
| --- | --- |
| `func` throws or its returned Promise rejects | That target has `result: null`; other target results survive; no API error or callback `lastError` |
| Missing guest global such as `document` | Same script-exception behavior; optional diagnostic includes `ReferenceError` |
| Executed code references an unavailable Istanbul `cov_*()` helper | Whole request fails with a coverage-instrumentation diagnostic, not a null script result |
| Bad globals/source, unsupported file/result, VM timeout, throwing diagnostic callback | Whole request fails under the general harness's API-named, document-specific error contract |

The first behavior matches **measured Chrome for Testing 148.0.7778.96**, not the generic adapter's fail-fast contract.
No `InjectionResult.error` property or automatic `console.error` is added. Current Chrome typings do not describe
every native null outcome; application tests should account for `null` at runtime.

Opt in to structured diagnostics when the test needs to assert the exception itself:

```ts
import {createNodeScriptExecutor, type NodeScriptException} from "@addon-core/browser/testing/node";

const errors: NodeScriptException[] = [];
harness.scripting.setExecutor(createNodeScriptExecutor({onScriptError: error => errors.push(error)}));

const results = await executeScript({target: {tabId: 7}, func: () => { throw new Error("BROKEN"); }});
assert.equal(results[0].result, null);
assert.equal(errors[0].message, "BROKEN");
assert.equal(errors[0].target.frameId, 0);
```

Diagnostics contain the target snapshot, error name and message, not a live guest Error object. A diagnostic callback
should not throw unless the test intentionally wants to fail the request. VM/infrastructure failures are not sent
to `onScriptError`.

The executor converts results to data **before** the portable harness's JSON boundary. Supported values are plain
enumerable objects and arrays plus JSON primitives; non-finite numbers, undefined, BigInt, functions and symbols
become null, including within objects/arrays. An ancestor cycle becomes null at that edge, e.g. `{self: null}`.
Date and RegExp results retain only their own enumerable fields, not their date value or regex state: bare instances
(including Invalid Date) become `{}`. A void function and explicit `return undefined` both produce an own `result`
property containing null. Unsupported branded results such as Map/Set and excessive depth reject, rather than claim
unmeasured vendor parity. This is a bounded codec, not a complete Chromium serializer. Result accessors are evaluated inside the VM.

The Chrome smoke compares synchronous child throws, child Promise rejections, body, cycle, BigInt, void/undefined,
Date/RegExp and their own fields/Invalid Date through both callback and Promise APIs. Its Node `document.body` is an explicit `{}` fixture; this comparison does **not**
implement or validate a DOM. These measurements do not establish Firefox/Safari serialization or exception semantics;
the explicit executor uses the same policy regardless of the installed browser profile.

## Coverage instrumentation

Istanbul can rewrite an application's function to call a module-scoped helper such as `cov_abc().s[0]++`. That helper
is not part of the serialized function and is unavailable in the guest. The Node executor recognizes the resulting
`ReferenceError` when its missing `cov_*` name matches a zero-argument call in the source and fails the whole request
with an `Istanbul coverage instrumentation` diagnostic naming the helper and remedy. Callback callers receive this
through scoped `runtime.lastError`; it is not delivered to `onScriptError` as an ordinary script exception.

This detection occurs **when the missing helper is reached**, not as a static preflight: it cannot undo preceding
execution. A harmless string/comment or a locally defined helper is not rejected merely for matching a regex. It is
a targeted Istanbul diagnostic, not a general JavaScript scope analyzer or recognition of every coverage tool.

Do not strip counters from source or inject the test runner's helpers into the VM. Supply uninstrumented code, for
example by excluding the modules containing injected functions from Jest's instrumentation:

```js
export default {
    // Add this to the existing Jest config; adapt the directory to the application.
    coveragePathIgnorePatterns: ["/src/injected/"],
};
```

Those modules will then be absent from the host coverage report; executing a serialized VM copy does not establish
source coverage for them. Tests still execute their functions. This Node-specific diagnostic does not constrain
metadata-only custom executors or ready-made `executeScript.setResult()` results.

## Cancellation and optional timeout

There is no default timeout and no implicit timer injection. The executor observes `request.signal`, so document
removal, reset or `harness.scripting.cancelExecutions()` can reject a pending async request; a late settlement is
observed and ignored. Reset clears the installed executor; re-install it explicitly for a subsequent test.

An AbortSignal cannot interrupt a synchronous loop. For trusted tests that need a synchronous guard, opt in:

```ts
harness.scripting.setExecutor(createNodeScriptExecutor({timeout: 100}));
```

This is a **wall-clock** VM limit in milliseconds (positive integer, at most 2147483647), not a deterministic scheduler
or an async deadline. It bounds each synchronous VM evaluation, including the initial function invocation. It does
not cover host callbacks or later Promise continuations; a loop after `await` can still block Node. Cancellation does
not terminate guest code or undo side effects. For hard limits on arbitrary work, use an externally supervised process.

`node:vm` is **not a security boundary**. Do not run untrusted code with this executor; realm separation prevents
accidental closure/state sharing, not hostile escape. See the [Node VM documentation](https://nodejs.org/api/vm.html),
including its security warning and timeout interactions with asynchronous work.

## Jest and jsdom

Use the same executor with Jest; the kit does not import Jest or change its timers. In jsdom, preserve the test's
environment and explicitly project only the data the injected function needs:

```ts
const restore = installBrowserGlobals(harness, {environment: "preserve"});
harness.scripting.setExecutor(createNodeScriptExecutor({
    globals: () => ({document: {title: document.title}}),
}));
try {
    const results = await executeScript<string>({target: {tabId: 7}, func: () => document.title});
    expect(results[0].result).toBe(document.title);
} finally {
    harness.reset();
    restore();
}
```

Register the tab/document first, as in the complete Node example. The host jsdom remains unchanged, and the guest
receives a data-only copy. Passing `dom.window` or a DOM node is rejected; DOM behavior still requires a different
explicit executor or a real-browser integration test.
