import {describe, expect, test} from "@jest/globals";
import {closeOffscreen, createOffscreen, getTab, onMessage, sendMessage, sendTabMessage} from "../../../src";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../../src/testing";

describe.each(["chrome", "firefox"] as const)("real messaging wrappers in %s", profile => {
    test("registers per-context listeners through globals and sends real runtime/tab wrappers", async () => {
        const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})]});
        const worker = harness.contexts.create({kind: "background"});
        const page = harness.contexts.create({kind: "extensionPage"});
        const content = harness.contexts.create({kind: "contentScript", tabId: 7, url: "https://example.test/page"});
        const before = ["chrome", "browser", "window", "document", "navigator", "location"].map(key => Object.getOwnPropertyDescriptor(globalThis, key));
        const registerWorker = installBrowserGlobals(harness, {profile, environment: "preserve", messageContext: worker});
        const removeWorker = onMessage(async (message, sender) => ({kind: "worker", message, source: sender.url}));
        registerWorker();
        const registerContent = installBrowserGlobals(harness, {profile, environment: "preserve", messageContext: content});
        const removeContent = onMessage((message, _sender, respond) => respond({kind: "content", message}));
        registerContent();
        const restore = installBrowserGlobals(harness, {profile, environment: "preserve", messageContext: page});

        try {
            await expect(sendMessage({kind: "request"})).resolves.toEqual({kind: "worker", message: {kind: "request"}, source: page.info.url});
            await expect(sendTabMessage(7, "ping", {documentId: content.info.documentId})).resolves.toEqual({kind: "content", message: "ping"});
            await expect(sendTabMessage(7, {}, {frameId: 999})).rejects.toThrow("tabs.sendMessage: Could not establish connection");
            expect(harness.messaging.forContext(page).runtime.sendMessage.calls[0].invocation).toBe("callback");
            // Non-messaging adapters still expose their shared lastError through a bound facade.
            harness.tabs.get.failNext(new Error("shared adapter failure"));
            await expect(getTab(7)).rejects.toThrow("shared adapter failure");
            removeWorker();
            await expect(sendMessage({})).rejects.toThrow("Receiving end does not exist");
        } finally {
            removeContent(); harness.reset(); restore();
        }

        expect(["chrome", "browser", "window", "document", "navigator", "location"].map(key => Object.getOwnPropertyDescriptor(globalThis, key))).toEqual(before);
    });

    test("Offscreen removal cancels an awaited production sendMessage through callback lastError", async () => {
        const harness = createBrowserHarness();
        const source = harness.contexts.create({kind: "background"});
        const restore = installBrowserGlobals(harness, {profile, messageContext: source});

        try {
            await createOffscreen({url: "offscreen.html", reasons: ["WORKERS"], justification: "channel lifecycle"});
            harness.offscreen.context!.onMessage.on(() => true);
            const cancelled = expect(sendMessage({})).rejects.toThrow("runtime.sendMessage: message channel closed");
            await closeOffscreen();
            await cancelled;
            expect(harness.messaging.pendingChannels).toEqual([]);
        } finally {
            harness.reset(); restore();
        }
    });
});

test("nested installations restore messaging ownership without changing bound asynchronous senders", async () => {
    const harness = createBrowserHarness();
    const a = harness.contexts.create({kind: "extensionPage", url: "chrome-extension://test-extension-id/a.html"});
    const b = harness.contexts.create({kind: "extensionPage", url: "chrome-extension://test-extension-id/b.html"});
    const worker = harness.contexts.create({kind: "background"});
    worker.onMessage.on((_message, sender, respond) => respond(sender.url));
    const outer = installBrowserGlobals(harness, {messageContext: a});
    const inner = installBrowserGlobals(harness, {messageContext: b});

    try {
        await expect(sendMessage({})).resolves.toBe(b.info.url);
        await expect(harness.messaging.forContext(a).chrome.runtime.sendMessage({})).resolves.toBe(a.info.url);
        expect(() => outer()).toThrow("reverse installation order");
        inner();
        await expect(sendMessage({})).resolves.toBe(a.info.url);
    } finally {
        inner(); outer(); harness.reset();
    }
});

test.each(["sync", "promise", "thenable"] as const)("preserves production safeListener %s behavior with context dispatch", async kind => {
    const harness = createBrowserHarness();
    const source = harness.contexts.create({kind: "extensionPage"});
    const worker = harness.contexts.create({kind: "background"});
    const register = installBrowserGlobals(harness, {messageContext: worker});
    const failure = new Error("listener failed");

    const unsubscribe = onMessage(() => {
        if (kind === "sync") throw failure;

        if (kind === "promise") return Promise.reject(failure);

        return {then(_resolve: unknown, reject: (reason: unknown) => void) {
            reject(failure);
        }};
    });

    register();
    const restore = installBrowserGlobals(harness, {messageContext: source, captureListenerErrors: true});

    try {
        // safeListener swallowed the synchronous error; the callback-based wrapper now sees an unanswered port.
        if (kind === "sync") await expect(sendMessage({})).rejects.toThrow("The message port closed");
        else await expect(sendMessage({})).rejects.toThrow("listener failed");

        expect(harness.listenerErrors.entries).toHaveLength(kind === "thenable" ? 0 : 1);
    } finally {
        unsubscribe(); restore(); harness.reset();
    }
});

test("real onMessage(async ...) fails under ignore, while the explicit true/sendResponse idiom still works", async () => {
    const harness = createBrowserHarness();
    const worker = harness.contexts.create({kind: "background"});
    const page = harness.contexts.create({kind: "extensionPage"});
    const register = installBrowserGlobals(harness, {messageContext: worker});
    const unsubscribe = onMessage(async () => "from-promise");
    register();
    harness.messaging.promiseListeners = "ignore";
    const restore = installBrowserGlobals(harness, {messageContext: page});

    try {
        expect(harness.messaging.promiseListeners).toBe("ignore"); // Profile installation must not select a compatibility mode.
        await expect(sendMessage({})).rejects.toThrow("The message port closed");
        unsubscribe();
        const inner = installBrowserGlobals(harness, {messageContext: worker});

        const remove = onMessage((_message, _sender, respond) => {
            void Promise.resolve().then(() => respond("callback response"));

            return true;
        });

        inner();

        try {
            await expect(sendMessage({})).resolves.toBe("callback response");
        } finally {
            remove();
        }
    } finally {
        unsubscribe(); harness.reset(); restore();
    }
});

test("invalid binding options leave globals and profile settings unchanged", () => {
    const harness = createBrowserHarness();
    const source = harness.contexts.create({kind: "background"});
    const before = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    expect(() => installBrowserGlobals(harness, {messageContext: "missing", profile: "firefox"})).toThrow("live context");
    expect(() => installBrowserGlobals(harness, {messageContext: source, profile: "custom"})).toThrow("custom API globals");
    expect(() => installBrowserGlobals(harness, {messageContext: source, globals: {chrome: undefined}})).toThrow("custom API globals");
    expect(Object.getOwnPropertyDescriptor(globalThis, "chrome")).toEqual(before);
    expect(harness.runtime.urlScheme).toBe("chrome-extension");
});
