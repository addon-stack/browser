const assert = require("node:assert/strict");

module.exports = async function checkOffscreen(production, testing) {
    for (const profile of ["chrome", "firefox"]) {
        const harness = testing.createBrowserHarness({contexts: [{contextId: "worker", kind: "background"}]});
        const restore = testing.installBrowserGlobals(harness, {profile, environment: "preserve"});
        const parameters = {url: "offscreen.html", reasons: ["DOM_PARSER"], justification: "Consumer fixture"};

        try {
            assert.equal(await production.hasOffscreen(), false);
            let releaseCreate;

            harness.offscreen.beforeCreate.setImplementation(() => new Promise(resolve => {
                releaseCreate = resolve;
            }));

            const creating = production.createOffscreen(parameters);
            assert.equal(await production.getOffscreenContext(), undefined);
            await assert.rejects(production.createOffscreen(parameters), /creation is already in progress/);
            releaseCreate();
            await creating;
            assert.equal(await production.hasOffscreen(), true);
            assert.equal(await production.getOffscreenPath(), "/offscreen.html");
            assert.equal(await production.hasOffscreenPath("offscreen.html"), true);
            assert.equal(await production.hasOffscreenUrl(production.getUrl("offscreen.html")), true);
            const context = harness.offscreen.context;
            assert.equal((await production.getOffscreenContext()).contextId, context.info.contextId);
            assert.equal(context.info.url, production.getUrl("offscreen.html"));
            await assert.rejects(production.createOffscreen(parameters), /single offscreen document/);

            const cancelled = assert.rejects(context.track(new Promise(() => {})), /was disposed/);
            context.onMessage.on(() => undefined);
            let releaseClose;

            harness.offscreen.beforeClose.setImplementation(() => new Promise(resolve => {
                releaseClose = resolve;
            }));

            const closing = production.closeOffscreen();
            assert.equal(await production.hasOffscreen(), true);
            releaseClose();
            await closing;
            await cancelled;
            assert.equal(context.signal.aborted, true);
            assert.equal(context.onMessage.listenerCount(), 0);
            assert.equal(harness.contexts.documents.get(context.info.documentId), undefined);
            assert.equal(await production.getOffscreenPath(), undefined);
            assert.equal(await production.hasOffscreen(), false);
            assert.deepEqual(harness.contexts.list().map(value => value.contextId), ["worker"]);

            harness.offscreen.createDocument.failNext(new Error("Consumer creation failure"));
            await assert.rejects(production.createOffscreen(parameters), /Consumer creation failure/);
            assert.equal(harness.offscreen.context, undefined);

            await new Promise(resolve => harness.chrome.offscreen.closeDocument(() => {
                assert.match(harness.chrome.runtime.lastError.message, /offscreen.closeDocument/);
                resolve();
            }));

            assert.equal(harness.chrome.runtime.lastError, undefined);

            // Reset cancels an unreleased creation gate and still allows the next operation.
            harness.offscreen.beforeCreate.setImplementation(() => new Promise(() => {}));
            const pending = assert.rejects(production.createOffscreen(parameters), /cancelled by reset/);
            harness.reset();
            await pending;
            await production.createOffscreen(parameters);
            await production.closeOffscreen();
        } finally {
            try {
                harness.reset();
            } finally {
                restore();
            }
        }
    }
};
