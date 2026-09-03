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
