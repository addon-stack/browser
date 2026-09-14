import {describe, expect, test} from "@jest/globals";
import {type BrowserContextMessaging, createBrowserHarness, createTabFixture} from "../../../../src/testing";

const fixture = () => {
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7}), createTabFixture({id: 8})]});
    const source = harness.contexts.create({kind: "extensionPage", contextId: "page"});
    const receiver = harness.contexts.create({kind: "background", contextId: "worker"});
    const page = harness.messaging.forContext(source);
    const worker = harness.messaging.forContext(receiver);

    return {harness, source, receiver, page, worker};
};

const deferred = () => {
    let resolve = (_value: unknown): void => {};
    let reject = (_error: unknown): void => {};

    const promise = new Promise<unknown>((done, fail) => {
        resolve = done; reject = fail;
    });

    return {promise, resolve, reject};
};

const send = (view: BrowserContextMessaging, facade: "chrome" | "browser", callback: boolean, message: unknown): Promise<unknown> => {
    if (!callback) return view[facade].runtime.sendMessage(message);

    return new Promise((resolve, reject) => {
        expect(view[facade].runtime.sendMessage(message, response => {
            const error = view[facade].runtime.lastError;

            if (error) reject(new Error(error.message));
            else resolve(response);
        })).toBeUndefined();
    });
};

describe("context-bound messaging", () => {
    test.each(["chrome", "browser"] as const)("%s delivers through callback and Promise without changing legacy root behavior", async facade => {
        const {harness, page, worker} = fixture();
        worker.runtime.onMessage.on((message, _sender, respond) => respond({echo: message}));
        await expect(send(page, facade, true, "callback")).resolves.toEqual({echo: "callback"});
        await expect(send(page, facade, false, "promise")).resolves.toEqual({echo: "promise"});
        expect(page.runtime.sendMessage.calls.map(call => call.invocation)).toEqual(["callback", "promise"]);
        expect(harness.messaging.calls).toEqual(harness.calls);
        expect(harness.calls.map(call => call.contextId)).toEqual(["page", "page"]);
        expect(harness.runtime.sendMessage.calls).toEqual([]);
        await expect(harness[facade].runtime.sendMessage("legacy")).resolves.toBeUndefined();
        await expect(harness[facade].tabs.sendMessage(7, "legacy")).rejects.toThrow("without a configured result");
    });

    test("runtime selects extension recipients, excluding sender document, content scripts and other incognito scope", async () => {
        const {harness, page, worker, source} = fixture();
        const sameDocument = harness.contexts.create({kind: "extensionPage", documentId: source.info.documentId});
        const content = harness.contexts.create({kind: "contentScript", tabId: 7, url: "https://example.test/"});
        const privatePage = harness.contexts.create({kind: "extensionPage", incognito: true});
        const offscreen = harness.contexts.create({kind: "offscreen"});
        const received: string[] = [];

        for (const context of [source, sameDocument, content, privatePage, offscreen, worker.context]) {
            context.onMessage.on(() => {
                received.push(context.info.contextId);
            });
        }

        await expect(page.chrome.runtime.sendMessage("hello")).resolves.toBeUndefined();
        expect(received).toEqual(["worker", offscreen.info.contextId]);
        received.length = 0;
        await harness.messaging.forContext(content).chrome.runtime.sendMessage("from content");
        expect(received).toEqual(["page", "worker", sameDocument.info.contextId, offscreen.info.contextId]);
    });

    test("routes tabs by frame/document and never sends a targeted request to another frame", async () => {
        const {harness, worker} = fixture();
        const main = harness.contexts.create({kind: "contentScript", tabId: 7, url: "https://example.test/"});
        const child = harness.contexts.create({kind: "contentScript", tabId: 7, frameId: 3, url: "https://frame.test/"});
        const other = harness.contexts.create({kind: "contentScript", tabId: 8, url: "https://other.test/"});
        const received: string[] = [];

        for (const context of [main, child, other]) context.onMessage.on((_message, _sender, respond) => {
            received.push(context.info.documentId!);
            respond(context.info.documentId);
        });

        await expect(worker.chrome.tabs.sendMessage(7, {}, {frameId: 3})).resolves.toBe(child.info.documentId);
        expect(received).toEqual([child.info.documentId]);
        received.length = 0;
        await expect(worker.browser.tabs.sendMessage(7, {}, {documentId: main.info.documentId})).resolves.toBe(main.info.documentId);
        expect(received).toEqual([main.info.documentId]);
        received.length = 0;
        await expect(worker.chrome.tabs.sendMessage(7, {})).resolves.toBe(main.info.documentId);
        expect(received).toEqual([main.info.documentId, child.info.documentId]);
        await expect(worker.chrome.tabs.sendMessage(7, {}, {frameId: 0, documentId: child.info.documentId})).rejects.toThrow("Receiving end does not exist");
        await expect(worker.chrome.tabs.sendMessage(999, {})).rejects.toThrow("tabs.sendMessage: No tab with id: 999.");
        await expect(harness.messaging.forContext(child).chrome.tabs.sendMessage(7, {})).rejects.toThrow("content scripts must use runtime.sendMessage");
    });

    test("sender comes from the sending frame, with detached tab and document metadata", async () => {
        const {harness, worker} = fixture();
        const content = harness.contexts.create({kind: "contentScript", tabId: 7, frameId: 2, url: "https://frame.test/sub"});
        const source = harness.messaging.forContext(content);
        const originalTab = await harness.chrome.tabs.get(7);
        worker.runtime.onMessage.on((_message, sender, respond) => respond(sender));
        const result = await source.chrome.runtime.sendMessage({});
        expect(result).toMatchObject({id: harness.runtime.id, url: "https://frame.test/sub", origin: "https://frame.test", frameId: 2, documentId: content.info.documentId, documentLifecycle: "active", tab: {id: 7}});
        result.tab.url = "changed";
        expect((await harness.chrome.tabs.get(7)).url).toBe(originalTab.url);
    });

    test.each([true, false])("tabs callback/Promise responses, listener errors and document disposal (callback=%s)", async callback => {
        const {harness, worker, page} = fixture();
        const content = harness.contexts.create({kind: "contentScript", tabId: 7, frameId: 3, url: "https://example.test/"});

        const request = (): Promise<unknown> => callback ? new Promise((resolve, reject) => {
            expect(worker.chrome.tabs.sendMessage(7, "ping", {frameId: 3}, response => {
                const error = worker.chrome.runtime.lastError;
                expect(page.chrome.runtime.lastError).toBeUndefined();

                if (error) reject(new Error(error.message));
                else resolve(response);
            })).toBeUndefined();
        }) : worker.browser.tabs.sendMessage(7, "ping", {frameId: 3});

        content.onMessage.on(async message => ({reply: message}));
        await expect(request()).resolves.toEqual({reply: "ping"});
        content.onMessage.reset();
        content.onMessage.on(() => Promise.reject(new Error("frame failed")));
        await expect(request()).rejects.toThrow("frame failed");
        content.onMessage.reset();
        content.onMessage.on(() => true);
        const closed = expect(request()).rejects.toThrow("tabs.sendMessage: message channel closed");
        harness.contexts.documents.remove(content.info.documentId!);
        await closed;
        await expect(request()).rejects.toThrow("Receiving end does not exist");
        expect(worker.chrome.runtime.lastError).toBeUndefined();
        expect(harness.messaging.pendingChannels).toEqual([]);
    });

    test("JSON-clones each listener's input and responses, consistently across facades", async () => {
        const {page, worker} = fixture();
        const payload = {nested: {value: 1}, date: new Date("2020-01-01T00:00:00.000Z"), absent: undefined};
        let reply = {nested: {value: 2}};

        worker.runtime.onMessage.on(message => {
            message.nested.value = 99;
        });

        worker.runtime.onMessage.on((message, _sender, respond) => {
            expect(message).toEqual({nested: {value: 1}, date: "2020-01-01T00:00:00.000Z"});
            respond(reply);
        });

        const response = page.browser.runtime.sendMessage(payload);
        reply.nested.value = 100;
        await expect(response).resolves.toEqual({nested: {value: 2}});
        expect(payload.nested.value).toBe(1);
        reply = {nested: {value: 3}};
    });

    test.each([undefined, null, "value", 0, false])("accepts JSON-compatible top-level input %p", async value => {
        const {page, worker} = fixture();
        worker.runtime.onMessage.on((message, _sender, respond) => respond(message));
        await expect(page.chrome.runtime.sendMessage(value)).resolves.toEqual(value ?? null);
    });

    test("rejects invalid message/response serialization without leaking channels", async () => {
        const {harness, page, worker} = fixture();
        const cycle: {self?: unknown} = {}; cycle.self = cycle;
        worker.runtime.onMessage.on(() => Promise.resolve(1n));
        await expect(page.chrome.runtime.sendMessage(cycle)).rejects.toThrow("could not serialize");
        await expect(page.chrome.runtime.sendMessage("request")).rejects.toThrow("could not serialize");
        worker.runtime.onMessage.reset();
        worker.runtime.onMessage.on((_message, _sender, respond) => respond(Symbol("bad")));
        await expect(page.chrome.runtime.sendMessage("request")).rejects.toThrow("could not serialize");
        expect(harness.messaging.pendingChannels).toEqual([]);
    });

    test("disposal in a message toJSON cannot leave an orphaned channel", async () => {
        const {harness, page, worker, source} = fixture();
        worker.runtime.onMessage.on(() => true);

        await expect(page.chrome.runtime.sendMessage({toJSON() {
            harness.contexts.remove(source.info.contextId);

            return {};
        }})).rejects.toThrow("sender context was disposed");

        expect(harness.messaging.pendingChannels).toEqual([]);
    });

    test("concurrent requests keep independent replies and stable sender bindings across awaits", async () => {
        const {harness, page, worker} = fixture();
        const a = deferred(); const b = deferred();
        worker.runtime.onMessage.on(message => message === "a" ? a.promise : b.promise);
        const first = page.chrome.runtime.sendMessage("a");
        const second = page.browser.runtime.sendMessage("b");
        expect(harness.messaging.pendingChannels.map(channel => channel.id)).toEqual([1, 2]);
        b.resolve("b response"); await expect(second).resolves.toBe("b response");
        a.resolve("a response"); await expect(first).resolves.toBe("a response");
        expect(harness.messaging.pendingChannels).toEqual([]);
        worker.runtime.onMessage.reset();
        page.runtime.onMessage.on((_message, sender, respond) => respond(sender.url));

        worker.runtime.onMessage.on(async () => {
            await Promise.resolve();

            return worker.chrome.runtime.sendMessage("nested");
        });

        await expect(page.chrome.runtime.sendMessage("outer")).resolves.toBe(worker.context.info.url);
    });
});

describe("context channel responses and teardown", () => {
    test("only the first response or error wins, while all listeners still start", async () => {
        const {page, worker} = fixture();
        const seen: string[] = [];

        worker.runtime.onMessage.on((_message, _sender, respond) => {
            seen.push("one"); respond("first");
        });

        worker.runtime.onMessage.on(() => {
            seen.push("two"); throw new Error("late failure");
        });

        await expect(page.chrome.runtime.sendMessage({})).resolves.toBe("first");
        expect(seen).toEqual(["one", "two"]);
        worker.runtime.onMessage.reset();

        worker.runtime.onMessage.on(() => {
            throw new Error("first error");
        });

        worker.runtime.onMessage.on((_message, _sender, respond) => respond("too late"));
        await expect(page.chrome.runtime.sendMessage({})).rejects.toThrow("first error");
    });

    test("one listener's return true does not extend another listener's response lifetime", async () => {
        const {harness, page, worker} = fixture();
        let late = (_response?: unknown): void => {};
        let held = (_response?: unknown): void => {};

        worker.runtime.onMessage.on((_message, _sender, respond) => {
            late = respond;
        });

        worker.runtime.onMessage.on((_message, _sender, respond) => {
            held = respond;

            return true;
        });

        const request = page.chrome.runtime.sendMessage({});
        late("not allowed");
        expect(harness.messaging.pendingChannels).toHaveLength(1);
        held("allowed");
        await expect(request).resolves.toBe("allowed");
    });

    test("observes arbitrary thenables and losing Promise rejections", async () => {
        const {page, worker} = fixture();
        const losing = deferred();
        worker.runtime.onMessage.on(() => losing.promise);

        worker.runtime.onMessage.on(() => ({then(resolve: (value: string) => void) {
            resolve("thenable");
        }}));

        await expect(page.browser.runtime.sendMessage({})).resolves.toBe("thenable");
        losing.reject(new Error("ignored late rejection"));
        await Promise.resolve();
        worker.runtime.onMessage.reset();

        worker.runtime.onMessage.on(() => Object.defineProperty({}, "then", {get() {
            throw new Error("getter failed");
        }}));

        await expect(page.browser.runtime.sendMessage({})).rejects.toThrow("getter failed");
    });

    test.each([true, false])("missing recipients and listener errors use the right failure channel (callback=%s)", async callback => {
        const {page, worker} = fixture();
        await expect(send(page, "chrome", callback, {})).rejects.toThrow("runtime.sendMessage: Could not establish connection");
        worker.runtime.onMessage.on(() => Promise.reject(new Error("handler failed")));
        await expect(send(page, "browser", callback, {})).rejects.toThrow("handler failed");
        expect(page.chrome.runtime.lastError).toBeUndefined();
        expect(worker.chrome.runtime.lastError).toBeUndefined();
    });

    test("lastError is visible only in the sending context's callback and restored afterward", async () => {
        const {harness, page, worker} = fixture();

        await new Promise<void>(resolve => page.chrome.runtime.sendMessage({}, () => {
            expect(page.browser.runtime.lastError?.message).toContain("Receiving end");
            expect(worker.chrome.runtime.lastError).toBeUndefined();
            expect(harness.runtime.lastError).toBeUndefined();
            resolve();
        }));

        expect(page.browser.runtime.lastError).toBeUndefined();
    });

    test.each(["sender", "receiver", "root-close", "context-close", "reset"])("%s terminates held channels and ignores late replies", async cause => {
        const {harness, page, worker} = fixture();
        let late = (_response?: unknown): void => {};

        worker.runtime.onMessage.on((_message, _sender, respond) => {
            late = respond;

            return true;
        });

        const pending = page.chrome.runtime.sendMessage({});
        const cancelled = expect(pending).rejects.toThrow("message channel closed");

        if (cause === "sender") harness.contexts.remove("page");
        else if (cause === "receiver") harness.contexts.remove("worker");
        else if (cause === "root-close") harness.runtime.closeMessageChannels();
        else if (cause === "context-close") harness.messaging.closeChannels("worker");
        else harness.reset();

        await cancelled;
        expect(harness.messaging.pendingChannels).toEqual([]);
        late("late");
        await expect(pending).rejects.toThrow("message channel closed");
    });

    test("removing one receiver leaves another possible response alive", async () => {
        const {harness, page, worker} = fixture();
        const second = harness.contexts.create({kind: "offscreen"});
        let reply = (_response?: unknown): void => {};
        worker.runtime.onMessage.on(() => true);

        second.onMessage.on((_message, _sender, respond) => {
            reply = respond;

            return true;
        });

        const pending = page.chrome.runtime.sendMessage({});
        harness.contexts.remove("worker");
        expect(harness.messaging.pendingChannels).toHaveLength(1);
        reply("survivor");
        await expect(pending).resolves.toBe("survivor");
    });

    test("disposing a selected context during dispatch skips it and closing the last receiver rejects", async () => {
        const {harness, page, worker} = fixture();
        const removed = harness.contexts.create({kind: "offscreen"});
        let invoked = false;

        worker.runtime.onMessage.on(() => {
            harness.contexts.remove(removed.info.contextId);

            return true;
        });

        removed.onMessage.on(() => {
            invoked = true;
        });

        const closed = expect(page.chrome.runtime.sendMessage({})).rejects.toThrow("message channel closed");
        expect(invoked).toBe(false);
        expect(harness.messaging.pendingChannels).toHaveLength(1);
        harness.contexts.remove("worker");
        await closed;
        expect(harness.messaging.pendingChannels).toEqual([]);
    });

    test("a disposed receiver's late Promise cannot answer a replacement request with the same context ID", async () => {
        const {harness, page, worker} = fixture();
        const old = deferred();
        worker.runtime.onMessage.on(() => old.promise);
        const closed = expect(page.chrome.runtime.sendMessage("old")).rejects.toThrow("message channel closed");
        harness.contexts.remove("worker");
        await closed;
        const replacement = harness.contexts.create({kind: "background", contextId: "worker"});
        const next = deferred();
        replacement.onMessage.on(() => next.promise);
        const response = page.chrome.runtime.sendMessage("new");
        old.resolve("stale answer");
        await Promise.resolve();
        expect(harness.messaging.pendingChannels).toHaveLength(1);
        next.resolve("new answer");
        await expect(response).resolves.toBe("new answer");
    });

    test("reset still clears channels, subscriptions and controls when another disposal cleanup throws", async () => {
        const {harness, page, worker} = fixture();
        worker.runtime.onMessage.on(() => true);

        worker.context.onDispose(() => {
            throw new Error("cleanup failed");
        });

        const closed = expect(page.chrome.runtime.sendMessage({})).rejects.toThrow("message channel closed");
        expect(() => harness.reset()).toThrow("cleanup failed");
        await closed;
        expect(harness.messaging.pendingChannels).toEqual([]);
        expect(harness.calls).toEqual([]);
        expect(worker.runtime.onMessage.listenerCount()).toBe(0);
        harness.reset();
    });

    test("Offscreen close and tab removal terminate exactly the affected routed requests", async () => {
        const {harness, page, worker} = fixture();
        await harness.chrome.offscreen.createDocument({url: "offscreen.html", reasons: ["DOM_PARSER"], justification: "routing"});
        const offscreen = harness.offscreen.context!;
        const content = harness.contexts.create({kind: "contentScript", tabId: 7, url: "https://example.test/"});
        offscreen.onMessage.on(() => true);
        content.onMessage.on(() => true);
        const one = expect(page.chrome.runtime.sendMessage({})).rejects.toThrow("message channel closed");
        const two = expect(worker.chrome.tabs.sendMessage(7, {})).rejects.toThrow("message channel closed");
        await harness.chrome.offscreen.closeDocument(); await one;
        expect(harness.messaging.pendingChannels).toHaveLength(1);
        await harness.chrome.tabs.remove(7); await two;
        expect(harness.messaging.pendingChannels).toEqual([]);
    });

    test("reset returns fixtures, cancels calls and invalidates handles without confusing reused IDs", async () => {
        const harness = createBrowserHarness({contexts: [{kind: "background", contextId: "a"}, {kind: "extensionPage", contextId: "b"}]});
        const before = harness.messaging.forContext("a");
        harness.messaging.forContext("b").runtime.onMessage.on(() => true);
        const cancelled = expect(before.chrome.runtime.sendMessage({})).rejects.toThrow("closed");
        harness.reset(); await cancelled;
        expect(harness.calls).toEqual([]);
        const after = harness.messaging.forContext("a");
        expect(after).not.toBe(before);
        expect(after.runtime.onMessage.listenerCount()).toBe(0);
        await expect(before.chrome.runtime.sendMessage({})).rejects.toThrow("sender context was disposed");
        expect(() => harness.messaging.forContext(before.context)).toThrow("live context");
    });

    test("binds only own live contexts; configurations and state do not cross harness boundaries", async () => {
        const first = fixture(); const second = fixture();
        expect(() => first.harness.messaging.forContext(second.source)).toThrow("belonging to this harness");
        expect(() => first.harness.messaging.forContext("unknown")).toThrow("live context");
        expect(first.harness.messaging.forContext("page")).toBe(first.page);
        first.page.runtime.sendMessage.setResult("configured");
        await expect(first.page.chrome.runtime.sendMessage({})).resolves.toBe("configured");
        await expect(second.page.chrome.runtime.sendMessage({})).rejects.toThrow("Receiving end");
        first.harness.messaging.reset();
        await expect(first.page.chrome.runtime.sendMessage({})).rejects.toThrow("Receiving end");
    });

    test("live facade capabilities stay absent for in/typeof/descriptors and are restored by reset", () => {
        const {harness, page} = fixture();

        for (const path of ["runtime.sendMessage", "runtime.onMessage", "tabs.sendMessage"]) {
            const [namespace, member] = path.split(".");
            harness.capabilities.set(path, false);
            const api = Reflect.get(page.chrome, namespace);
            expect(member in api).toBe(false);
            expect(Reflect.get(api, member)).toBeUndefined();
            expect(Object.getOwnPropertyDescriptor(api, member)).toBeUndefined();
            harness.capabilities.set(path, true);
            expect(member in api).toBe(true);
        }

        expect(typeof page.chrome.runtime.toString).toBe("function");
        expect(() => Reflect.set(page.chrome.runtime, "sendMessage", () => {})).toThrow("read-only");
        expect(Reflect.deleteProperty(page.chrome.runtime, "sendMessage")).toBe(false);
        expect(Object.keys(page.chrome.runtime)).toContain("sendMessage");
    });
});

describe("message argument validation", () => {
    test.each([
        [], ["foreign-extension", {payload: true}], [undefined, {}, {unknown: true}],
        [undefined, {}, {includeTlsChannelId: true}], [undefined, {}, {}, "extra"],
    ])("rejects unsupported runtime arguments %p", async (...args) => {
        const {page} = fixture();
        await expect(Reflect.apply(page.chrome.runtime.sendMessage, undefined, args)).rejects.toThrow("runtime.sendMessage:");
    });

    test.each([
        [-1, {}], [7], [7, {}, {unknown: true}], [7, {}, {frameId: -1}],
        [7, {}, {documentId: ""}], [7, {}, {documentId: 1}], [7, {}, {}, "extra"],
    ])("rejects unsupported tab arguments %p", async (...args) => {
        const {worker} = fixture();
        await expect(Reflect.apply(worker.chrome.tabs.sendMessage, undefined, args)).rejects.toThrow("tabs.sendMessage:");
    });

    test("accepts explicit same-extension ID and optional empty/null options", async () => {
        const {harness, page, worker} = fixture();
        worker.runtime.onMessage.on((message, _sender, respond) => respond(message));
        await expect(page.chrome.runtime.sendMessage(harness.runtime.id, {data: 1}, {})).resolves.toEqual({data: 1});
        await expect(Reflect.apply(page.chrome.runtime.sendMessage, undefined, ["literal", null])).resolves.toBe("literal");
        await expect(page.chrome.runtime.sendMessage({data: 2}, {})).resolves.toEqual({data: 2});
    });
});
