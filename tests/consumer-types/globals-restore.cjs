const assert = require("node:assert/strict");

// This fixture makes a global permanently non-configurable. Run it in its own
// process for each module format and installer, never in a shared test realm.
async function checkRestoreFailure() {
    const testing = process.argv[2] === "esm"
        ? await import("@addon-core/browser/testing")
        : require("@addon-core/browser/testing");

    const profile = process.argv[3] === "profile";
    const beforeChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const beforeSafari = Object.getOwnPropertyDescriptor(globalThis, "safari");
    const beforeConsole = Object.getOwnPropertyDescriptor(console, "error");
    const outer = testing.installGlobals({safari: {outer: true}});
    const harness = testing.createBrowserHarness();
    const beforeCapability = Object.getOwnPropertyDescriptor(harness.browser.runtime, "getBrowserInfo");

    const inner = profile
        ? testing.installBrowserGlobals(harness, {profile: "firefox", environment: "preserve", captureListenerErrors: true})
        : testing.installGlobals({chrome: harness.chrome, browser: harness.browser});

    assert.throws(outer, /reverse installation order/);
    assert.equal(globalThis.browser, harness.browser);
    Object.defineProperty(globalThis, "browser", {configurable: false});

    assert.throws(inner, error => {
        assert.ok(error instanceof AggregateError);
        assert.equal(error.message, "Unable to restore browser globals");
        assert.deepEqual(error.errors.map(item => item.message), ["Unable to restore global browser"]);

        return true;
    });

    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "chrome"), beforeChrome);
    assert.deepEqual(Object.getOwnPropertyDescriptor(console, "error"), beforeConsole);
    assert.equal(globalThis.safari.outer, true);

    if (profile) {
        assert.match(harness.runtime.getURL.api(""), /^chrome-extension:/);
        assert.equal(harness.sidebar.flavor, "sidePanel");
        assert.equal(harness.configurable.active, harness.configurable.chrome);
        assert.deepEqual(Object.getOwnPropertyDescriptor(harness.browser.runtime, "getBrowserInfo"), beforeCapability);
    }

    assert.doesNotThrow(outer);
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "safari"), beforeSafari);
    assert.doesNotThrow(inner);
    assert.doesNotThrow(outer);
    const restoreNext = testing.installGlobals({safari: {next: true}});
    harness.runtime.setUrlScheme("safari-web-extension");
    assert.doesNotThrow(inner);
    assert.equal(globalThis.safari.next, true);
    assert.match(harness.runtime.getURL.api(""), /^safari-web-extension:/);
    restoreNext();
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "safari"), beforeSafari);
    // Cleanup cannot reverse someone else's non-configurable descriptor.
    assert.equal(Object.getOwnPropertyDescriptor(globalThis, "browser").configurable, false);
}

checkRestoreFailure().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
