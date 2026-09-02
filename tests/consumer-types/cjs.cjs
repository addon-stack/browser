const assert = require("node:assert/strict");

const beforeChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
const beforeBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
const production = require("@addon-core/browser");
const testing = require("@addon-core/browser/testing");

assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "chrome"), beforeChrome);
assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "browser"), beforeBrowser);

async function checkConsumer() {
    const harness = testing.createBrowserHarness({
        manifest: testing.createManifestFixture({name: "CJS consumer"}),
    });
    harness.delays.downloadValidation.setResult(undefined);
    harness.configurable.chrome.downloads.download.setResult(42);
    harness.configurable.chrome.downloads.search.setResult([{exists: true, id: 42, state: "in_progress"}]);
    const restore = testing.installBrowserGlobals(harness, {profile: "chrome"});

    try {
        assert.equal(production.getManifest().name, "CJS consumer");
        assert.equal(typeof harness.runtime.closeMessageChannels, "function");
        assert.equal(await production.download({url: "https://example.test/cjs.zip"}), 42);
        assert.deepEqual(
            harness.delays.downloadValidation.calls.map(call => call.args),
            [[100]]
        );
        harness.configurable.chrome.downloads.search.setResult([
            {error: "USER_CANCELED", exists: true, id: 42, state: "interrupted"},
        ]);
        await assert.rejects(production.download({url: "https://example.test/blocked-cjs.zip"}), error => {
            assert.ok(error instanceof production.BlockDownloadError);
            assert.equal(error.message, "Requires user permission to upload");
            return true;
        });
        assert.deepEqual(
            harness.delays.downloadValidation.calls.map(call => call.args),
            [[100], [100]]
        );
    } finally {
        restore();
        restore();
    }

    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "chrome"), beforeChrome);
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "browser"), beforeBrowser);
}

checkConsumer().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
