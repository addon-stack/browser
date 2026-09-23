const assert = require("node:assert/strict");

module.exports = async function checkMessaging(production, testing) {
    for (const profile of ["chrome", "firefox"]) {
        const harness = testing.createBrowserHarness({tabs: [testing.createTabFixture({id: 7}), testing.createTabFixture({id: 8})]});
        const worker = harness.contexts.create({kind: "background", contextId: "worker"});
        const page = harness.contexts.create({kind: "extensionPage", contextId: "page"});
        const content = harness.contexts.create({kind: "contentScript", tabId: 7, frameId: 3, url: "https://frame.test/"});
        const before = ["window", "document", "location", "navigator", "chrome", "browser"].map(key => Object.getOwnPropertyDescriptor(globalThis, key));
        const register = testing.installBrowserGlobals(harness, {profile, environment: "preserve", messageContext: worker});
        const unsubscribe = production.onMessage(async (message, sender) => ({message, senderUrl: sender.url}));
        register();
        const restore = testing.installBrowserGlobals(harness, {profile, environment: "preserve", messageContext: page});

        try {
            assert.deepEqual(await production.sendMessage("hello"), {message: "hello", senderUrl: page.info.url});
            content.onMessage.on((message, _sender, respond) => respond({frame: 3, message}));
            assert.deepEqual(await production.sendTabMessage(7, {}, {documentId: content.info.documentId}), {frame: 3, message: {}});
            await assert.rejects(production.sendTabMessage(7, {}, {frameId: 0}), /Receiving end does not exist/);
            const view = harness.messaging.forContext(page);
            assert.equal(view.runtime.sendMessage.calls[0].invocation, "callback");
            harness.messaging.promiseListeners = "ignore";
            await assert.rejects(production.sendMessage("requires Promise listeners"), /The message port closed/);
            assert.equal(await view.browser.runtime.sendMessage("native Promise caller"), undefined);
            harness.messaging.promiseListeners = "accept";
            view.runtime.sendMessage.failNext(new Error("context-specific failure"));
            await assert.rejects(production.sendMessage({}), /context-specific failure/);
            assert.equal(view.chrome.runtime.lastError, undefined);
            unsubscribe();
            const tabPage = harness.contexts.create({kind: "extensionPage", tabId: 8});
            const removeTabListener = tabPage.onMessage.on((_message, _sender, respond) => respond());
            assert.equal(await production.sendTabMessage(8, "empty reply", {documentId: tabPage.info.documentId}), null);
            removeTabListener();
            const rejection = new Error("ignored receiver rejection");
            const removeRejected = tabPage.onMessage.on(() => Promise.reject(rejection));
            harness.messaging.promiseListeners = "ignore";
            await assert.rejects(production.sendTabMessage(8, "ignored"), /The message port closed/);
            assert.equal(harness.messaging.ignoredPromiseRejections[0].error, rejection);
            removeRejected();
            harness.messaging.reset();
            assert.equal(harness.messaging.promiseListeners, "accept");
            assert.deepEqual(harness.messaging.ignoredPromiseRejections, []);
            await production.createOffscreen({url: "offscreen.html", reasons: ["WORKERS"], justification: "Messaging consumer"});
            harness.offscreen.context.onMessage.on(() => true);
            const cancelled = assert.rejects(production.sendMessage({}), /message channel closed/);
            assert.equal(harness.messaging.pendingChannels.length, 1);
            await production.closeOffscreen();
            await cancelled;
            assert.equal(harness.messaging.pendingChannels.length, 0);
            harness.reset();
            assert.equal(harness.calls.length, 0);
            await assert.rejects(view.chrome.runtime.sendMessage({}), /sender context was disposed/);
        } finally {
            unsubscribe(); harness.reset(); restore();
        }

        assert.deepEqual(["window", "document", "location", "navigator", "chrome", "browser"].map(key => Object.getOwnPropertyDescriptor(globalThis, key)), before);
    }
};
