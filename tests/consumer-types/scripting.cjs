const assert = require("node:assert/strict");

module.exports = async function checkScripting(production, testing) {
    const harness = testing.createBrowserHarness({tabs: [testing.createTabFixture({id: 17})]});
    const document = harness.contexts.documents.create({tabId: 17, url: "https://page.test/"});
    harness.contexts.documents.create({tabId: 17, frameId: 3, url: "https://frame.test/"});
    const restore = testing.installBrowserGlobals(harness, {profile: "firefox", environment: "preserve"});

    try {
        const input = {target: {tabId: 17, allFrames: true}, func: () => {
            throw new Error("must never run in the host");
        }};

        await assert.rejects(production.executeScript(input), /no executor configured/);

        harness.scripting.setExecutor(({target, script}) => {
            assert.equal(script.kind, "function");
            assert.equal("func" in script, false);

            return target.url;
        });

        assert.deepEqual((await production.executeScript(input)).map(value => value.result), ["https://page.test/", "https://frame.test/"]);
        assert.equal(harness.scripting.selectTargets({tabId: 17, documentIds: [document.documentId]}).length, 1);
        harness.scripting.executeScript.failNext(new Error("denied"));
        await assert.rejects(production.executeScript(input), /denied/);
        assert.equal(harness.runtime.lastError, undefined);
        let signal;

        harness.scripting.setExecutor(request => {
            signal = request.signal;

            return new Promise(() => {});
        });

        const operation = production.executeScript({...input, target: {tabId: 17}});
        const rejected = assert.rejects(operation, /scripting.executeScript: target document/);
        harness.contexts.documents.remove(document.documentId);
        await rejected;
        assert.equal(signal.aborted, true);
        assert.equal(harness.scripting.pendingExecutions, 0);
        harness.reset();
        await assert.rejects(production.executeScript(input), /no executor configured/);
    } finally {
        harness.reset();
        restore();
    }
};
