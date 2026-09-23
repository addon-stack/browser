const assert = require("node:assert/strict");
const {execFileSync} = require("node:child_process");

// No runner async hooks in these intentionally nonterminating guest callbacks.
const timerTimeoutProbe = source => {
    const assert = require("node:assert/strict");
    const {createNodeScriptRuntime} = require("@addon-core/browser/testing/node");
    const runtime = createNodeScriptRuntime({clock: true, timeout: 50});
    runtime.evaluate({documentId: "loop"}, {source: `setTimeout(${source}, 0)`});
    assert.throws(() => runtime.clock.advance(0), /timed out/);
    assert.equal(runtime.realmCount, 0);
    runtime.dispose();
};

module.exports = async function checkClock(production, testing, nodeTesting) {
    for (const source of ["() => { while (true) {} }", "async () => { await 0; while (true) {} }"]) {
        execFileSync(process.execPath, ["-e", `(${timerTimeoutProbe.toString()})(${JSON.stringify(source)})`], {cwd: __dirname, timeout: 5000});
    }

    const harness = testing.createBrowserHarness({
        tabs: [testing.createTabFixture({id: 7})],
        documents: [{documentId: "main", tabId: 7, url: "https://page.test/"}],
    });

    const runtime = nodeTesting.createNodeScriptRuntime({clock: {epoch: 0}, documents: harness.contexts.documents});
    const restore = testing.installBrowserGlobals(harness, {environment: "preserve"});
    const clock = runtime.clock;
    const target = {tabId: 7};

    try {
        harness.scripting.setExecutor(runtime.executor);
        assert.equal(clock.now, 0);

        // Inline protocol emulation, intentionally independent of Addon Bone and issue #109.
        const retry = async () => {
            for (let attempts = 1; attempts <= 10; attempts++) {
                if (attempts === 10) return {ok: false, attempts, time: Date.now()};

                await new Promise(resolve => setTimeout(resolve, 300));
            }
        };

        for (const style of ["promise", "callback"]) {
            const start = clock.now;
            const injection = {target, func: retry};

            const pending = style === "promise" ? production.executeScript(injection) : new Promise((resolve, reject) => {
                harness.chrome.scripting.executeScript(injection, result => {
                    if (harness.runtime.lastError) reject(new Error(harness.runtime.lastError.message));
                    else resolve(result);
                });
            });

            assert.equal(clock.advance(2699), undefined);
            assert.equal(runtime.pendingExecutions, 1);
            clock.advance(1);
            assert.equal(runtime.pendingExecutions, 0);
            assert.deepEqual((await pending)[0].result, {ok: false, attempts: 10, time: start + 2700});
        }

        const pending = production.executeScript({target, func: () => new Promise(resolve => setTimeout(resolve, 300))});
        const rejected = assert.rejects(pending, /removed/);
        harness.contexts.documents.remove("main");
        await rejected;
        const now = clock.now;
        clock.runAll({maxTimers: 1});
        assert.equal(clock.now, now);
        harness.reset();
        harness.scripting.setExecutor(runtime.executor);
        runtime.evaluate({documentId: "main"}, {source: "globalThis.count = 0; const id = setInterval(() => { if (++count === 2) clearInterval(id); }, 5)"});
        clock.runAll({maxTimers: 2});
        const [result] = await production.executeScript({target, func: () => [globalThis.count, Date.now(), performance.now()]});
        assert.deepEqual(result.result, [2, now + 10, 10]);
        runtime.dispose();
        assert.throws(() => clock.advance(0), /disposed/);
    } finally {
        runtime.dispose(); harness.reset(); restore();
    }
};
