const assert = require("node:assert/strict");
const {execFileSync} = require("node:child_process");

// Supervise intentional infinite loops externally, without inheriting runner async hooks.
// This verifies the optional VM limit, not recoverability under every Node instrumentation setup.
const checkRuntimeTimeout = async source => {
    const assert = require("node:assert/strict");
    const {createBrowserHarness, createTabFixture} = require("@addon-core/browser/testing");
    const {createNodeScriptRuntime} = require("@addon-core/browser/testing/node");

    const harness = createBrowserHarness({
        tabs: [createTabFixture({id: 7})],
        documents: [{documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"}],
    });

    const runtime = createNodeScriptRuntime({timeout: 50});

    const request = {
        target: harness.scripting.selectTargets({tabId: 7})[0],
        script: {kind: "function", source, args: []},
        world: "ISOLATED", injectImmediately: false, signal: new AbortController().signal,
    };

    await assert.rejects(runtime.executor(request), /timed out/);
    assert.equal(runtime.pendingExecutions, 0);
    assert.equal(runtime.realmCount, 0);
    await assert.rejects(runtime.executor({...request, script: {kind: "function", source: "() => 1", args: []}}), /realm invalidated by.*timed out.*bootstrap it again/);
    runtime.evaluate({documentId: "main"}, {source: ""});
    assert.equal(await runtime.executor({...request, script: {kind: "function", source: "() => 1", args: []}}), 1);
    runtime.dispose();
    console.log("runtime-timeout-verified");
};

module.exports = async function checkNodeScripting(production, testing, nodeTesting) {
    await require("./node-clock.cjs")(production, testing, nodeTesting);
    await require("./node-runtime-lifecycle.cjs")(production, testing, nodeTesting);
    assert.equal("createNodeScriptExecutor" in testing, false);
    assert.equal("createNodeScriptExecutor" in production, false);
    assert.equal("createNodeScriptRuntime" in testing, false);
    assert.equal("createNodeScriptRuntime" in production, false);
    assert.deepEqual(Object.keys(nodeTesting).sort(), ["createNodeScriptExecutor", "createNodeScriptRuntime"]);

    for (const source of ["() => { while (true) {} }", "async () => { await Promise.resolve(); while (true) {} }"]) {
        const output = execFileSync(process.execPath, ["-e", `(${checkRuntimeTimeout.toString()})(${JSON.stringify(source)}).catch(error => { console.error(error); process.exitCode = 1; })`], {
            cwd: __dirname, timeout: 5000, encoding: "utf8",
        });

        assert.equal(output.trim(), "runtime-timeout-verified");
    }

    const harness = testing.createBrowserHarness({
        tabs: [testing.createTabFixture({id: 7})],
        documents: [
            {documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"},
            {documentId: "child", tabId: 7, frameId: 3, url: "https://page.test/frame"},
        ],
    });

    const errors = [];

    const executor = nodeTesting.createNodeScriptExecutor({
        globals: target => ({document: {title: target.documentId}}),
        onScriptError: error => errors.push(error),
    });

    harness.scripting.setExecutor(executor);
    const restore = testing.installBrowserGlobals(harness, {environment: "preserve"});
    const runtime = nodeTesting.createNodeScriptRuntime();

    try {
        const results = await production.executeScript({
            target: {tabId: 7, allFrames: true},
            func: async prefix => {
                if (globalThis.document.title === "child") throw new Error("child failed");

                return prefix + globalThis.document.title;
            },
            args: ["result:"],
        });

        assert.deepEqual(results, [
            {frameId: 0, documentId: "main", result: "result:main"},
            {frameId: 3, documentId: "child", result: null},
        ]);

        assert.deepEqual(errors.map(error => [error.target.documentId, error.message]), [["child", "child failed"]]);
        assert.equal(harness.runtime.lastError, undefined);

        const privateValue = 42;
        assert.equal(privateValue, 42);
        assert.equal((await production.executeScript({target: {tabId: 7}, func: () => privateValue}))[0].result, null);
        assert.equal(errors.at(-1).name, "ReferenceError");

        const [serialized] = await production.executeScript({target: {tabId: 7}, func: () => ({
            date: new Date("2020-01-02T03:04:05.000Z"), regexp: /probe/gi,
        })});

        assert.deepEqual(serialized.result, {date: {}, regexp: {}});
        const [voidResult] = await production.executeScript({target: {tabId: 7}, func: () => {}});
        assert.equal(voidResult.result, null);
        assert.equal(Object.hasOwn(voidResult, "result"), true);

        const cov_published_fixture = () => ({s: [0]});
        assert.equal(cov_published_fixture().s[0], 0);
        const diagnosticCount = errors.length;

        await assert.rejects(production.executeScript({target: {tabId: 7}, func: () => {
            cov_published_fixture().s[0]++;

            return 1;
        }}), /scripting.executeScript.*Istanbul coverage instrumentation.*cov_published_fixture/);

        assert.equal(errors.length, diagnosticCount);
        assert.equal(harness.scripting.pendingExecutions, 0);

        const mutate = {target: {tabId: 7, allFrames: true}, func: () => {
            const title = globalThis.document.title;
            globalThis.document.title = "changed";

            return title;
        }};

        for (let index = 0; index < 2; index++) {
            assert.deepEqual((await production.executeScript(mutate)).map(result => result.result), ["main", "child"]);
        }

        const operation = production.executeScript({target: {tabId: 7}, func: () => new Promise(() => {})});
        const rejected = assert.rejects(operation, /scripting.executeScript/);
        harness.reset();
        await rejected;
        assert.equal(harness.scripting.pendingExecutions, 0);
        await assert.rejects(production.executeScript(mutate), /no executor configured/);

        harness.scripting.setExecutor(runtime.executor);
        runtime.evaluate({documentId: "main"}, {source: "class Counter { async add() { return ++this.value; } constructor() { this.value = 0; } } globalThis.counter = new Counter();", filename: "counter.js"});

        for (const expected of [1, 2]) {
            assert.equal((await production.executeScript({target: {tabId: 7}, func: async () => globalThis.counter.add()}))[0].result, expected);
        }

        assert.equal((await production.executeScript({target: {tabId: 7}, world: "MAIN", func: () => typeof globalThis.counter}))[0].result, "undefined");

        const deferred = production.executeScript({target: {tabId: 7}, func: () => new Promise(resolve => {
            globalThis.reply = resolve;
        })});

        runtime.evaluate({documentId: "main"}, {source: "reply(42)"});
        assert.equal((await deferred)[0].result, 42);

        assert.throws(() => runtime.evaluate({documentId: "main"}, {source: "throw new Error('bootstrap failed')", filename: "broken.js"}), /bootstrap failed/);
        const injection = {target: {tabId: 7}, func: () => typeof globalThis.counter};
        await assert.rejects(production.executeScript(injection), /scripting.executeScript.*realm invalidated by.*broken.js.*bootstrap it again/);

        const lastError = await new Promise(resolve => {
            harness.chrome.scripting.executeScript(injection, () => resolve(harness.runtime.lastError?.message));
        });

        assert.match(lastError, /realm invalidated by.*broken.js.*bootstrap it again/);
        assert.equal(harness.runtime.lastError, undefined);
        assert.equal(runtime.realmCount, 1); // Unaffected MAIN world only; failed calls do not recreate ISOLATED.
        assert.throws(() => runtime.evaluate({documentId: "main"}, {source: "throw new Error('retry failed')", filename: "retry.js"}), /retry failed/);
        await assert.rejects(production.executeScript(injection), /realm invalidated by.*retry.js.*retry failed/);
        runtime.evaluate({documentId: "main"}, {source: "globalThis.counter = {add: async () => 9}"});
        assert.equal((await production.executeScript({target: {tabId: 7}, func: async () => globalThis.counter.add()}))[0].result, 9);

        const pending = production.executeScript({target: {tabId: 7}, func: () => new Promise(() => {})});
        const disposed = assert.rejects(pending, /runtime is disposed/);
        runtime.dispose();
        await disposed;
        assert.equal(runtime.realmCount, 0);
        assert.equal(runtime.pendingExecutions, 0);
    } finally {
        runtime.dispose();
        harness.reset();
        restore();
    }
};
