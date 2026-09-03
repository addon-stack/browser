import assert from "node:assert/strict";

const beforeChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
const beforeBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
const production = await import("@addon-core/browser");
const testing = await import("@addon-core/browser/testing");

assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "chrome"), beforeChrome);
assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "browser"), beforeBrowser);

const harness = testing.createBrowserHarness({
    manifest: testing.createManifestFixture({name: "ESM consumer"}),
    tabs: [testing.createTabFixture({id: 7, url: "http://127.0.0.1:62778/top.html#part"})],
    permissions: {origins: ["https://*.example.com/*"]},
});

harness.delays.downloadValidation.setResult(undefined);
harness.configurable.chrome.downloads.download.setResult(41);
harness.configurable.chrome.downloads.search.setResult([{exists: true, id: 41, state: "in_progress"}]);
const restore = testing.installBrowserGlobals(harness, {profile: "chrome"});
const unsubscribe = harness.runtime.events.onMessage.on(() => true);

try {
    assert.equal(production.getManifest().name, "ESM consumer");

    assert.deepEqual(
        (await production.queryTabs({url: ["http://127.0.0.1/*"], status: "complete"})).map(tab => tab.id),
        [7]
    );

    assert.equal(await production.containsPermissions({origins: ["https://shop.example.com/*"]}), true);
    assert.equal(await production.containsPermissions({origins: ["http://shop.example.com/*"]}), false);
    await assert.rejects(production.queryTabs({url: "https://bad*host/*"}), /tabs.query/);
    assert.equal(await production.download({url: "https://example.test/esm.zip"}), 41);

    assert.deepEqual(
        harness.delays.downloadValidation.calls.map(call => call.args),
        [[100]]
    );

    harness.configurable.chrome.downloads.search.setResult([
        {error: "USER_CANCELED", exists: true, id: 41, state: "interrupted"},
    ]);

    await assert.rejects(production.download({url: "https://example.test/blocked-esm.zip"}), error => {
        assert.ok(error instanceof production.BlockDownloadError);
        assert.equal(error.message, "Requires user permission to upload");

        return true;
    });

    assert.deepEqual(
        harness.delays.downloadValidation.calls.map(call => call.args),
        [[100], [100]]
    );

    const pendingResponse = production.sendMessage({kind: "unanswered"});
    harness.runtime.closeMessageChannels();

    await assert.rejects(pendingResponse, {
        message: 'Browser method "runtime.sendMessage" message channel closed before a response was received.',
    });
} finally {
    unsubscribe();
    restore();
    restore();
}

assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "chrome"), beforeChrome);
assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "browser"), beforeBrowser);
