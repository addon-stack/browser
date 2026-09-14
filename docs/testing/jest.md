# Using the test kit with Jest

The kit itself does not import Jest. A Jest suite can install a fresh harness in normal lifecycle hooks:

```ts
import {afterEach, beforeEach, expect, test} from "@jest/globals";
import {getManifest} from "@addon-core/browser";
import {
    createBrowserHarness,
    createManifestFixture,
    installBrowserGlobals,
} from "@addon-core/browser/testing";

let restore: () => void;

beforeEach(() => {
    const harness = createBrowserHarness({
        manifest: createManifestFixture({name: "Jest fixture"}),
    });
    restore = installBrowserGlobals(harness, {profile: "chrome"});
});

afterEach(() => restore());

test("reads the real wrapper through fake globals", () => {
    expect(getManifest().name).toBe("Jest fixture");
});
```

## Preserving jsdom

Install `jest-environment-jsdom` in the consuming application's dev dependencies and use `environment: "preserve"`.
The kit does not depend on jsdom; this option keeps the existing DOM, location, navigator, listeners and object identities.

```ts
/** @jest-environment jsdom */
import {expect, test} from "@jest/globals";
import {getManifest} from "@addon-core/browser";
import {createBrowserHarness, installBrowserGlobals} from "@addon-core/browser/testing";

test("uses browser APIs alongside the application's DOM", () => {
    const harness = createBrowserHarness();
    const existingDocument = document;
    const restore = installBrowserGlobals(harness, {
        profile: "chrome",
        environment: "preserve",
    });

    try {
        const button = document.createElement("button");
        button.textContent = getManifest().name;
        document.body.append(button);
        expect(document).toBe(existingDocument);
        expect(button.textContent).toBe(harness.runtime.manifest.name);
        button.remove();
    } finally {
        harness.reset();
        restore();
    }
});
```

Restoring globals does not undo application DOM mutations. Clean those up using the application's usual test hooks.
Do not combine preserve mode with `context`; use [simulation mode](harness.md#preserving-an-existing-environment)
in Node when testing generated context globals. Nested installations must restore in reverse order.

## Supplying fixtures to a module mock

Fixtures are plain data and can also be returned from an application-level module mock:

```ts
import {jest} from "@jest/globals";
import {createTabFixture} from "@addon-core/browser/testing";

jest.mock("./current-tab", () => ({
    loadCurrentTab: jest.fn(async () => createTabFixture({active: true, id: 9})),
}));
```

This is separate from the main harness workflow. Prefer fake globals when the goal is to exercise the real
`@addon-core/browser` wrapper; use a module mock when the wrapper itself is intentionally outside the test boundary.
