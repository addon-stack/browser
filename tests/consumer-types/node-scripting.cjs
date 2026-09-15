const assert = require("node:assert/strict");

module.exports = async function checkNodeScripting(production, testing, nodeTesting) {
    assert.equal("createNodeScriptExecutor" in testing, false);
    assert.equal("createNodeScriptExecutor" in production, false);
    assert.deepEqual(Object.keys(nodeTesting), ["createNodeScriptExecutor"]);

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
    } finally {
        harness.reset();
        restore();
    }
};
