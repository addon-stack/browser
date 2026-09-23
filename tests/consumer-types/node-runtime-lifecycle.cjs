const assert = require("node:assert/strict");

module.exports = async function checkRuntimeLifecycle(production, testing, nodeTesting) {
    const seed = {documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"};
    const harness = testing.createBrowserHarness({tabs: [testing.createTabFixture({id: 7})], documents: [seed]});
    const runtime = nodeTesting.createNodeScriptRuntime({documents: harness.contexts.documents});
    const restore = testing.installBrowserGlobals(harness, {environment: "preserve"});
    const injection = {target: {tabId: 7}, func: () => typeof globalThis.manager};

    try {
        // Deterministic IDs can collide across harnesses. Reject differing metadata before allocation.
        const other = testing.createBrowserHarness({
            tabs: [testing.createTabFixture({id: 7})],
            documents: [{...seed, url: "https://other.test/"}],
        });

        other.scripting.setExecutor(runtime.executor);
        await assert.rejects(other.browser.scripting.executeScript(injection), /target url does not match/);
        assert.equal(runtime.realmCount, 0);
        assert.equal(runtime.pendingExecutions, 0);
        other.reset();

        for (const style of ["promise", "callback"]) {
            harness.scripting.setExecutor(runtime.executor);
            assert.throws(() => runtime.evaluate({documentId: "absent"}, {source: ""}), /does not exist/);
            runtime.evaluate({documentId: "main"}, {source: "globalThis.manager = {value: 5}"});
            runtime.evaluate({documentId: "main", world: "MAIN"}, {source: "globalThis.manager = 1"});
            const wait = {...injection, func: () => new Promise(() => {})};

            const pending = style === "promise" ? harness.browser.scripting.executeScript(wait) : new Promise((resolve, reject) => {
                harness.chrome.scripting.executeScript(wait, result => {
                    if (harness.runtime.lastError) reject(new Error(harness.runtime.lastError.message));
                    else resolve(result);
                });
            });

            const rejected = assert.rejects(pending, /removed/);
            harness.contexts.documents.remove("main");
            await rejected;
            assert.equal(harness.runtime.lastError, undefined);
            assert.equal(runtime.realmCount, 0);
            assert.equal(runtime.pendingExecutions, 0);
            assert.throws(() => runtime.evaluate({documentId: "main"}, {source: ""}), /does not exist/);
            harness.contexts.documents.create(seed);
            assert.equal((await production.executeScript(injection))[0].result, "undefined");
            assert.throws(() => runtime.evaluate({documentId: "main"}, {source: "throw 1"}), /main/);
            harness.reset();
            assert.equal(runtime.realmCount, 0);
            await assert.rejects(production.executeScript(injection), /no executor configured/);
            harness.scripting.setExecutor(runtime.executor);
            assert.equal((await production.executeScript(injection))[0].result, "undefined");
            runtime.evaluate({documentId: "main"}, {source: "globalThis.manager = {value: 9}"});
            assert.equal((await production.executeScript({...injection, func: () => globalThis.manager.value}))[0].result, 9);
        }

        runtime.dispose();
        harness.reset();
        assert.throws(() => runtime.evaluate({documentId: "main"}, {source: ""}), /disposed/);
    } finally {
        runtime.dispose();
        harness.reset();
        restore();
    }
};
