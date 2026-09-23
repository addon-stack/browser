import {describe, expect, test} from "@jest/globals";
import {createBrowserHarness, createTabFixture} from "../../../../src/testing";

const fixture = (namespace: "runtime" | "tabs" = "runtime", facade: "chrome" | "browser" = "chrome", callback = false) => {
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7}), createTabFixture({id: 8})]});
    const worker = harness.contexts.create({kind: "background"});

    const receiver = harness.contexts.create(namespace === "runtime" ? {kind: "extensionPage"}
        : {kind: "contentScript", tabId: 7, url: "https://example.test/"});

    const view = harness.messaging.forContext(worker);
    const api = view[facade];

    const send = (): Promise<unknown> => {
        if (!callback) return namespace === "runtime" ? api.runtime.sendMessage("request") : api.tabs.sendMessage(7, "request");

        return new Promise((resolve, reject) => {
            const done = (value: unknown): void => {
                const error = api.runtime.lastError;

                if (error) reject(new Error(error.message));
                else resolve(value);
            };

            const result = namespace === "runtime" ? api.runtime.sendMessage("request", done) : api.tabs.sendMessage(7, "request", done);
            expect(result).toBeUndefined();
        });
    };

    return {harness, worker, receiver, view, send};
};

const scenarios = (["runtime", "tabs"] as const).flatMap(namespace => (["chrome", "browser"] as const)
    .flatMap(facade => [false, true].map(callback => ({namespace, facade, callback}))));

describe.each(scenarios)("$facade.$namespace compatibility (callback=$callback)", ({namespace, facade, callback}) => {
    test("explicit empty responses are null, distinct from an unanswered request", async () => {
        const {harness, receiver, send, view} = fixture(namespace, facade, callback);
        receiver.onMessage.on((_message, _sender, respond) => respond());
        await expect(send()).resolves.toBeNull();
        receiver.onMessage.reset();
        receiver.onMessage.on((_message, _sender, respond) => respond(undefined));
        await expect(send()).resolves.toBeNull();
        receiver.onMessage.reset();
        receiver.onMessage.on(() => undefined);

        if (callback) await expect(send()).rejects.toThrow(`${namespace}.sendMessage: The message port closed`);
        else await expect(send()).resolves.toBeUndefined();

        expect(view.chrome.runtime.lastError).toBeUndefined();
        expect(harness.messaging.pendingChannels).toEqual([]);
    });

    test("accept/ignore controls the returned Promise, not method invocation style", async () => {
        const {harness, receiver, send} = fixture(namespace, facade, callback);
        expect(harness.messaging.promiseListeners).toBe("accept");
        receiver.onMessage.on(async () => "from-promise");
        await expect(send()).resolves.toBe("from-promise");
        harness.messaging.promiseListeners = "ignore";

        if (callback) await expect(send()).rejects.toThrow("The message port closed");
        else await expect(send()).resolves.toBeUndefined();

        // Still-called synchronous sendResponse is independent of the returned Promise's interpretation.
        receiver.onMessage.reset();

        receiver.onMessage.on(async (_message, _sender, respond) => {
            respond("synchronous response");

            return "ignored return";
        });

        await expect(send()).resolves.toBe("synchronous response");
        receiver.onMessage.reset();

        receiver.onMessage.on((_message, _sender, respond) => {
            void Promise.resolve().then(() => respond("true response"));

            return true;
        });

        await expect(send()).resolves.toBe("true response");
        expect(harness.messaging.pendingChannels).toEqual([]);
    });
});

test("tabs sends reach only the selected extension-page tab/frame/document and supply worker origin", async () => {
    const {harness, view, worker} = fixture();
    const page = harness.contexts.create({kind: "extensionPage", tabId: 8, url: harness.runtime.getURL.api("options.html")});
    const frame = harness.contexts.create({kind: "extensionPage", tabId: 8, frameId: 3, url: harness.runtime.getURL.api("frame.html")});
    const other = harness.contexts.create({kind: "extensionPage", tabId: 7});
    const popup = harness.contexts.create({kind: "extensionPage", contextType: "POPUP"});
    const delivered: string[] = [];

    for (const context of [page, frame, other, popup]) context.onMessage.on((_message, sender, respond) => {
        delivered.push(context.info.contextId);
        respond(sender);
    });

    for (const options of [{frameId: 3}, {documentId: frame.info.documentId}, {frameId: 3, documentId: frame.info.documentId}]) {
        delivered.length = 0;

        await expect(view.chrome.tabs.sendMessage(8, {}, options)).resolves.toEqual({
            id: harness.runtime.id, url: worker.info.url, origin: "chrome-extension://test-extension-id",
        });

        expect(delivered).toEqual([frame.info.contextId]);
    }

    delivered.length = 0;
    await view.browser.tabs.sendMessage(8, {});
    expect(delivered).toEqual([page.info.contextId, frame.info.contextId]);
    await expect(view.chrome.tabs.sendMessage(8, {}, {frameId: 0, documentId: frame.info.documentId})).rejects.toThrow("Receiving end");
    // runtime's worker sender intentionally omits origin, unlike tabs.sendMessage's sender.
    await expect(view.chrome.runtime.sendMessage({})).resolves.toEqual({id: harness.runtime.id, url: worker.info.url});
});

test("ignore observes rejections in an immutable diagnostic buffer without using them as responses", async () => {
    const {harness, worker, receiver, send} = fixture();
    const error = new Error("ignored rejection");
    harness.messaging.promiseListeners = "ignore";
    receiver.onMessage.on(() => Promise.reject(error));
    await expect(send()).resolves.toBeUndefined();
    const entries = harness.messaging.ignoredPromiseRejections;
    expect(entries).toEqual([{channelId: 1, api: "runtime.sendMessage", sourceContextId: worker.info.contextId, recipientContextId: receiver.info.contextId, error}]);
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries[0])).toBe(true);
    expect(entries[0].error).toBe(error);
    harness.messaging.reset();
    expect(harness.messaging.ignoredPromiseRejections).toEqual([]);
    expect(harness.messaging.promiseListeners).toBe("accept");
});

test("ignore never keeps its sendResponse alive or waits for an unresolved Promise/thenable", async () => {
    const {harness, receiver, send} = fixture();
    harness.messaging.promiseListeners = "ignore";
    let late = (_value: unknown): void => {};
    let held = (_value: unknown): void => {};

    receiver.onMessage.on((_message, _sender, respond) => {
        late = respond;

        return {then() {/* Deliberately unresolved foreign thenable. */}};
    });

    await expect(send()).resolves.toBeUndefined();
    expect(harness.messaging.pendingChannels).toEqual([]);

    receiver.onMessage.on((_message, _sender, respond) => {
        held = respond;

        return true;
    });

    const response = send();
    late("not a response");
    expect(harness.messaging.pendingChannels).toHaveLength(1);
    held("winner");
    await expect(response).resolves.toBe("winner");
});

test("a send snapshots its mode even when a listener changes the harness setting", async () => {
    const {harness, receiver, send} = fixture();

    receiver.onMessage.on(async () => {
        harness.messaging.promiseListeners = "ignore";

        return "accepted";
    });

    await expect(send()).resolves.toBe("accepted");
    await expect(send()).resolves.toBeUndefined();
});

test("reset invalidates late ignored rejections and restores accept without leaking into another harness", async () => {
    const {harness, receiver, send} = fixture();
    const other = fixture();
    harness.messaging.promiseListeners = "ignore";
    let rejectLate = (_error: unknown): void => {};

    receiver.onMessage.on(() => new Promise((_resolve, reject) => {
        rejectLate = reject;
    }));

    await expect(send()).resolves.toBeUndefined();
    harness.reset();
    rejectLate(new Error("old request"));
    await Promise.resolve();
    expect(harness.messaging.ignoredPromiseRejections).toEqual([]);
    expect(harness.messaging.promiseListeners).toBe("accept");
    expect(other.harness.messaging.promiseListeners).toBe("accept");
    expect(other.harness.messaging.ignoredPromiseRejections).toEqual([]);
    expect(() => Reflect.set(harness.messaging, "promiseListeners", "auto")).toThrow('must be "accept" or "ignore"');
    expect(harness.messaging.promiseListeners).toBe("accept");
});
