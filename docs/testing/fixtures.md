# Testing fixtures

Fixture factories return current `@types/chrome` types with deterministic minimal defaults. Every call returns fresh
objects and arrays, so changing one fixture cannot mutate another.

```ts
import {
    createExtensionContextFixture,
    createInjectionResultFixture,
    createInstalledDetailsFixture,
    createManifestFixture,
    createMessageSenderFixture,
    createPermissionsFixture,
    createTabFixture,
    createWindowFixture,
} from "@addon-core/browser/testing";

const manifest = createManifestFixture({name: "Test extension"});
const tab = createTabFixture({active: true, id: 4, url: "https://example.test/page"});
const window = createWindowFixture({focused: true, id: 2});
const permissions = createPermissionsFixture({permissions: ["tabs"]});
```

`createTabFixture` and `createWindowFixture` deliberately include the `Fixture` suffix because the production package
already exports functions named `createTab` and `createWindow`.

The remaining factories create `chrome.runtime.InstalledDetails`, `chrome.runtime.MessageSender`,
`chrome.runtime.ExtensionContext`, and `chrome.scripting.InjectionResult` values. Override only fields relevant to the
test; IDs and URLs are stable rather than random.
