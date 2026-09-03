# Testing without a browser

`@addon-core/browser/testing` is a framework-agnostic test kit for code that uses `@addon-core/browser`. It provides
deterministic fixtures, configurable methods and events, and a stateful in-memory browser harness. Importing the
testing subpath does not install globals or otherwise change the process.

## Quick start with plain Node

```ts
import assert from "node:assert/strict";
import {getManifest, queryTabs} from "@addon-core/browser";
import {
    createBrowserHarness,
    createManifestFixture,
    createTabFixture,
    installBrowserGlobals,
} from "@addon-core/browser/testing";

const harness = createBrowserHarness({
    manifest: createManifestFixture({name: "Consumer extension"}),
    tabs: [createTabFixture({active: true, id: 7})],
});
const restore = installBrowserGlobals(harness, {profile: "chrome"});

try {
    assert.equal(getManifest().name, "Consumer extension");
    assert.deepEqual(
        (await queryTabs({active: true})).map(tab => tab.id),
        [7]
    );
} finally {
    restore();
}
```

The production functions are imported from `@addon-core/browser` and execute unchanged. Only the browser globals
they read are supplied by the test.

## What the kit provides

- [Fixtures](testing/fixtures.md) create fresh, deterministic Chrome-typed data.
- [Primitives](testing/primitives.md) provide runner-independent methods and browser events.
- [Harness and globals](testing/harness.md) provide browser profiles, state, capabilities, reset, and exact global
  restoration.
- [URL patterns and host permissions](testing/match-patterns.md) cover wildcard tab queries and granted-origin checks.
- [Jest usage](testing/jest.md) shows how to combine the kit with Jest without making the kit depend on Jest.
- [Limitations](testing/limitations.md) describes intentional differences from real browsers.

## Choosing the right kind of test double

A fixture is only data. A configurable stub records calls and returns or throws exactly what the test configured. A
stateful fake models a small documented part of browser behavior, such as tabs and permissions. A real-browser
integration test runs the extension in Chrome, Firefox, Safari, or another browser.

Use this kit for deterministic unit and integration tests around your application code. Keep real-browser tests for
browser compatibility, manifest behavior, security boundaries, lifecycle timing, and vendor-specific behavior.

## Reset and isolation

Every harness owns independent state. Call `harness.reset()` between tests when reusing one harness, or create a fresh
harness per test. Always call the restore function returned by `installBrowserGlobals()` in `finally`; it is safe to
call more than once and restores the original property descriptors.
