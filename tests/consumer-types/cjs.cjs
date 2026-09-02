const assert = require("node:assert/strict");

const beforeChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
const beforeBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
const production = require("@addon-core/browser");
const testing = require("@addon-core/browser/testing");

assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "chrome"), beforeChrome);
assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "browser"), beforeBrowser);

const harness = testing.createBrowserHarness({
    manifest: testing.createManifestFixture({name: "CJS consumer"}),
});
const restore = testing.installBrowserGlobals(harness, {profile: "chrome"});

try {
    assert.equal(production.getManifest().name, "CJS consumer");
    assert.equal(typeof harness.runtime.closeMessageChannels, "function");
} finally {
    restore();
    restore();
}

assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "chrome"), beforeChrome);
assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "browser"), beforeBrowser);
