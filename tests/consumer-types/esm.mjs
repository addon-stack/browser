import assert from "node:assert/strict";

const beforeChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
const beforeBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
const production = await import("@addon-core/browser");
const testing = await import("@addon-core/browser/testing");

assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "chrome"), beforeChrome);
assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "browser"), beforeBrowser);
const harness = testing.createBrowserHarness({
    manifest: testing.createManifestFixture({name: "ESM consumer"}),
});
const restore = testing.installBrowserGlobals(harness, {profile: "chrome"});
const unsubscribe = harness.runtime.events.onMessage.on(() => true);

try {
    assert.equal(production.getManifest().name, "ESM consumer");
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
