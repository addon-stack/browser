const assert = require("node:assert/strict");

module.exports = async function checkContexts(production, testing) {
    const harness = testing.createBrowserHarness({
        tabs: [testing.createTabFixture({id: 9})],
        contexts: [{contextId: "worker", kind: "background"}],
    });

    const before = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const restore = testing.installBrowserGlobals(harness, {environment: "preserve"});

    try {
        assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "navigator"), before);
        const document = harness.contexts.documents.create({tabId: 9, url: "https://example.test/"});
        const content = harness.contexts.create({kind: "contentScript", documentId: document.documentId});
        const offscreen = harness.contexts.create({kind: "offscreen"});
        const matches = await production.getContexts({contextTypes: ["OFFSCREEN_DOCUMENT"]});
        assert.equal(matches.length, 1);
        assert.equal(matches[0].contextId, offscreen.info.contextId);
        assert.equal(await production.getOffscreenPath(), "/offscreen.html");
        assert.equal((await production.getContexts({tabIds: [9]})).length, 0);
        let delivered = 0;

        const unsubscribe = content.onMessage.on(() => {
            delivered += 1;
        });

        await content.onMessage.emit({}, {}, () => undefined);
        assert.equal(delivered, 1);
        unsubscribe();

        const pending = content.track(new Promise(() => undefined));
        const canceled = assert.rejects(pending, /was disposed/);
        await harness.chrome.tabs.remove(9);
        await canceled;
        assert.equal(content.onMessage.listenerCount(), 0);
        harness.reset();
        assert.equal(offscreen.disposed, true);
        assert.deepEqual(harness.contexts.list().map(value => value.contextId), ["worker"]);
        assert.equal(harness.contexts.documents.list().length, 0);
        assert.equal((await production.getContexts({})).length, 1);
    } finally {
        restore();
    }
};
