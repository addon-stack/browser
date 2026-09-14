import {describe, expect, test} from "@jest/globals";
import {createBrowserHarness, createExtensionContextFixture, type OffscreenTestApi} from "../../../../src/testing";

const parameters = (): chrome.offscreen.CreateParameters => ({url: "offscreen.html?mode=test#ready", reasons: ["DOM_PARSER"], justification: "Test document"});

const deferred = () => {
    let resolve = (): void => undefined;
    let reject = (_reason: unknown): void => undefined;

    const promise = new Promise<void>((done, fail) => {
        resolve = done; reject = fail;
    });

    return {promise, resolve, reject};
};

describe("offscreen shared registry lifecycle", () => {
    test("retains namespace history and reset semantics for compatibility aliases", async () => {
        const harness = createBrowserHarness();
        await harness.browser.offscreen.createDocument(parameters());
        expect(harness.configurable.browserNamespaces.calls.map(call => call.api)).toEqual(["offscreen.createDocument"]);
        expect(harness.configurable.chromeNamespaces.calls.map(call => call.api)).toEqual(["offscreen.createDocument"]);
        expect(harness.calls.map(call => call.api)).toEqual(["offscreen.createDocument", "offscreen.beforeCreate"]);
        harness.offscreen.hasDocument.setResult(false);
        expect(await harness.chrome.offscreen.hasDocument()).toBe(false);
        harness.configurable.chromeNamespaces.reset();
        expect(harness.offscreen.createDocument.calls).toEqual([]);
        expect(await harness.browser.offscreen.hasDocument()).toBe(true);
    });

    test.each(["chrome", "browser"] as const)("%s creates and closes a document with native context fields", async facade => {
        const harness = createBrowserHarness();
        const api = harness[facade].offscreen;
        expect(await api.hasDocument()).toBe(false);
        await api.createDocument(parameters());
        const context = harness.offscreen.context!;
        expect(context.info).toMatchObject({kind: "offscreen", contextType: "OFFSCREEN_DOCUMENT", tabId: -1, frameId: 0, windowId: -1, incognito: false});
        expect(context.info.documentId).toBeDefined();
        expect(context.info.url).toBe("chrome-extension://test-extension-id/offscreen.html?mode=test#ready");
        expect(await harness[facade].runtime.getContexts({contextTypes: ["OFFSCREEN_DOCUMENT"]})).toMatchObject([{contextId: context.info.contextId}]);
        expect(harness.contexts.documents.get(context.info.documentId!)?.url).toBe(context.info.url);
        expect(await api.hasDocument()).toBe(true);
        await api.closeDocument();
        expect(context.disposed).toBe(true);
        expect(harness.contexts.documents.list()).toEqual([]);
        expect(await api.hasDocument()).toBe(false);
    });

    test("tracks manually registered contexts and rejects ambiguous native fixtures", async () => {
        const harness = createBrowserHarness({contexts: [{kind: "offscreen", contextId: "seed"}]});
        expect(await harness.chrome.offscreen.hasDocument()).toBe(true);
        await expect(harness.chrome.offscreen.createDocument(parameters())).rejects.toThrow("single offscreen");
        await harness.chrome.offscreen.closeDocument();
        harness.contexts.reset();
        expect(harness.offscreen.context?.info.contextId).toBe("seed");
        harness.contexts.create({kind: "offscreen"});
        await expect(harness.chrome.offscreen.hasDocument()).rejects.toThrow("multiple offscreen contexts");
        await expect(harness.chrome.offscreen.closeDocument()).rejects.toThrow("multiple offscreen contexts");
        expect(() => harness.calls).not.toThrow();
    });

    test("closes incomplete native fixtures without a registered document", async () => {
        const fixture = createExtensionContextFixture({contextType: "OFFSCREEN_DOCUMENT", documentId: undefined, documentUrl: undefined});
        const harness = createBrowserHarness({contexts: [fixture]});
        await harness.chrome.offscreen.closeDocument();
        expect(harness.contexts.list()).toEqual([]);
    });

    test("does not close unrelated contexts or root runtime message channels", async () => {
        const harness = createBrowserHarness({contexts: [{kind: "background", contextId: "worker"}]});
        await harness.chrome.offscreen.createDocument(parameters());
        harness.runtime.events.onMessage.on(() => true);
        const unrelated = harness.runtime.emitMessage({unrelated: true});
        let settled = false;

        const observed = unrelated.catch(() => {
            settled = true;
        });

        await harness.chrome.offscreen.closeDocument();
        expect(harness.contexts.get("worker")?.disposed).toBe(false);
        expect(settled).toBe(false);
        harness.runtime.closeMessageChannels();
        await observed;
        expect(settled).toBe(true);
    });

    test("closing disposes document-scoped work and listeners, including manual message emissions", async () => {
        const harness = createBrowserHarness();
        await harness.chrome.offscreen.createDocument(parameters());
        const context = harness.offscreen.context!;
        let cleaned = 0;

        context.onDispose(() => {
            cleaned++;
        });

        const gate = deferred();
        context.onMessage.on(() => gate.promise);
        const emitted = context.onMessage.emit({}, {}, () => undefined);
        const rejected = expect(emitted).rejects.toThrow("was disposed");
        const tracked = expect(context.track(new Promise(() => undefined))).rejects.toThrow("was disposed");
        await harness.chrome.offscreen.closeDocument();
        await rejected;
        await tracked;
        expect(cleaned).toBe(1);
        expect(context.signal.aborted).toBe(true);
        expect(context.onMessage.listenerCount()).toBe(0);
        gate.reject(new Error("late listener failure"));
        await Promise.resolve();
    });

    test("cleanup failures still remove the document and finish the close reservation", async () => {
        const harness = createBrowserHarness();
        await harness.chrome.offscreen.createDocument(parameters());

        harness.offscreen.context!.onDispose(() => {
            throw new Error("cleanup failed");
        });

        await expect(harness.chrome.offscreen.closeDocument()).rejects.toBeInstanceOf(AggregateError);
        expect(await harness.chrome.offscreen.hasDocument()).toBe(false);
        expect(harness.contexts.documents.list()).toEqual([]);
        await harness.chrome.offscreen.createDocument(parameters());
    });

    test("rejects repeated create and closing an absent document", async () => {
        const harness = createBrowserHarness();
        await expect(harness.chrome.offscreen.closeDocument()).rejects.toThrow("offscreen.closeDocument: no current offscreen document");
        await harness.chrome.offscreen.createDocument(parameters());
        await expect(harness.browser.offscreen.createDocument(parameters())).rejects.toThrow("single offscreen");
        expect(harness.contexts.documents.list()).toHaveLength(1);
    });
});

describe("offscreen operation gates", () => {
    test("delays registration, snapshots inputs, and reserves the singleton during creation", async () => {
        const harness = createBrowserHarness();
        const gate = deferred();
        harness.offscreen.beforeCreate.setImplementation(() => gate.promise);
        const input = parameters();
        const creating = harness.chrome.offscreen.createDocument(input);
        input.url = "changed.html";
        input.reasons.length = 0;
        expect(harness.offscreen.beforeCreate.calls[0].args).toEqual([parameters()]);
        expect(harness.contexts.list()).toEqual([]);
        expect(await harness.chrome.offscreen.hasDocument()).toBe(false);
        await expect(harness.browser.offscreen.createDocument(parameters())).rejects.toThrow("already in progress");
        await expect(harness.chrome.offscreen.closeDocument()).rejects.toThrow("creation is still in progress");
        gate.resolve();
        await creating;
        expect(harness.offscreen.context?.info.url).toContain("/offscreen.html?mode=test#ready");
    });

    test("revalidates the singleton after an externally registered context appears during creation", async () => {
        const harness = createBrowserHarness();
        const gate = deferred();
        harness.offscreen.beforeCreate.setImplementation(() => gate.promise);
        const creating = harness.chrome.offscreen.createDocument(parameters());
        const external = harness.contexts.create({kind: "offscreen"});
        gate.resolve();
        await expect(creating).rejects.toThrow("single offscreen");
        expect(harness.offscreen.context).toBe(external);
        expect(harness.contexts.documents.list()).toHaveLength(1);
    });

    test("failed creation never registers partial state, and can be retried", async () => {
        const harness = createBrowserHarness();
        const error = new Error("document load failed");
        harness.offscreen.beforeCreate.failNext(error);
        await expect(harness.chrome.offscreen.createDocument(parameters())).rejects.toBe(error);
        expect(harness.contexts.list()).toEqual([]);
        expect(harness.contexts.documents.list()).toEqual([]);
        await harness.chrome.offscreen.createDocument(parameters());
        expect(await harness.chrome.offscreen.hasDocument()).toBe(true);
    });

    test("delays closure, leaves the document readable, and failures keep it alive", async () => {
        const harness = createBrowserHarness();
        await harness.chrome.offscreen.createDocument(parameters());
        const context = harness.offscreen.context;
        const gate = deferred();
        harness.offscreen.beforeClose.setImplementation(() => gate.promise);
        const closing = harness.chrome.offscreen.closeDocument();
        expect(await harness.chrome.offscreen.hasDocument()).toBe(true);
        await expect(harness.browser.offscreen.closeDocument()).rejects.toThrow("closure is already in progress");
        await expect(harness.chrome.offscreen.createDocument(parameters())).rejects.toThrow("single offscreen");
        gate.reject(new Error("close failed"));
        await expect(closing).rejects.toThrow("close failed");
        expect(harness.offscreen.context).toBe(context);
        expect(context?.disposed).toBe(false);
        harness.offscreen.beforeClose.reset();
        await harness.chrome.offscreen.closeDocument();
    });

    test.each(["harness", "registry", "runtime"] as const)("%s reset cancels creating, rejects late work and allows immediate retry", async target => {
        const harness = createBrowserHarness();
        const gate = deferred();
        harness.offscreen.beforeCreate.setImplementation(() => gate.promise);
        const creating = harness.chrome.offscreen.createDocument(parameters());
        const cancelled = expect(creating).rejects.toThrow("offscreen.createDocument: operation cancelled by reset");

        if (target === "harness") harness.reset();

        if (target === "registry") harness.contexts.reset();

        if (target === "runtime") harness.runtime.reset();

        await cancelled;
        await harness.chrome.offscreen.createDocument({...parameters(), url: "new.html"});
        const replacement = harness.offscreen.context;
        gate.resolve();
        await Promise.resolve();
        expect(harness.offscreen.context).toBe(replacement);
        expect(harness.contexts.list()).toHaveLength(1);
    });

    test("a delayed close cannot remove a replacement that reuses the fixture ID", async () => {
        const harness = createBrowserHarness({contexts: [{contextId: "seed", kind: "offscreen"}]});
        const old = harness.offscreen.context!;
        const gate = deferred();
        harness.offscreen.beforeClose.setImplementation(() => gate.promise);
        const closing = harness.chrome.offscreen.closeDocument();
        const cancelled = expect(closing).rejects.toThrow("cancelled by reset");
        harness.reset();
        await cancelled;
        const replacement = harness.offscreen.context!;
        expect(replacement).not.toBe(old);
        expect(replacement.info.contextId).toBe(old.info.contextId);
        gate.reject(new Error("late close rejection"));
        await Promise.resolve();
        expect(replacement.disposed).toBe(false);
        expect(harness.offscreen.context).toBe(replacement);
    });

    test("manual context disposal terminates a delayed close immediately", async () => {
        const harness = createBrowserHarness();
        await harness.chrome.offscreen.createDocument(parameters());
        const gate = deferred();
        harness.offscreen.beforeClose.setImplementation(() => gate.promise);
        const closing = harness.chrome.offscreen.closeDocument();
        const cancelled = expect(closing).rejects.toThrow("was disposed");
        harness.contexts.documents.remove(harness.offscreen.context!.info.documentId!);
        await cancelled;
        gate.resolve();
        await harness.chrome.offscreen.createDocument(parameters());
    });

    test("reset completes other cleanup even if an internal reset observer throws", async () => {
        const harness = createBrowserHarness({contexts: [{kind: "background", contextId: "worker"}]});
        const old = harness.contexts.get("worker")!;

        const remove = harness.runtime.onContextsReset(() => {
            throw new Error("observer failed");
        });

        const gate = deferred();
        harness.offscreen.beforeCreate.setImplementation(() => gate.promise);
        const creating = expect(harness.chrome.offscreen.createDocument(parameters())).rejects.toThrow("cancelled by reset");
        expect(() => harness.reset()).toThrow("context cleanup failed");
        await creating;
        expect(old.disposed).toBe(true);
        expect(harness.contexts.get("worker")?.disposed).toBe(false);
        remove();
        gate.reject(new Error("late"));
        await harness.chrome.offscreen.createDocument(parameters());
    });
});

describe("offscreen controls and validation", () => {
    test("legacy controls alias the stateful methods and call history has no duplicates", async () => {
        const harness = createBrowserHarness();
        expect(harness.configurable.chrome.offscreen.createDocument).toBe(harness.offscreen.createDocument);
        expect(harness.configurable.browser.offscreen.createDocument).toBe(harness.offscreen.createDocument);
        expect(harness.configurable.browserNamespaces.method("offscreen.createDocument")).toBe(harness.offscreen.createDocument);
        await harness.chrome.offscreen.createDocument(parameters());
        expect(harness.calls.map(call => call.api)).toEqual(["offscreen.createDocument", "offscreen.beforeCreate"]);
        harness.configurable.browser.offscreen.closeDocument.setResult(undefined);
        await harness.browser.offscreen.closeDocument();
        expect(harness.offscreen.context).toBeDefined();
        harness.offscreen.closeDocument.reset();
        await harness.chrome.offscreen.closeDocument();
        harness.configurable.chrome.offscreen.createDocument.failNext(new Error("configured error"));
        await expect(harness.browser.offscreen.createDocument(parameters())).rejects.toThrow("configured error");
    });

    test("callback calls return undefined, complete asynchronously, and have scoped lastError", async () => {
        const harness = createBrowserHarness();
        let called = false;

        const created = new Promise<void>(resolve => {
            expect(harness.chrome.offscreen.createDocument(parameters(), () => {
                called = true; resolve();
            })).toBeUndefined();
        });

        expect(called).toBe(false);
        await created;
        expect(harness.offscreen.createDocument.calls[0].callbackCalls).toEqual([[]]);

        const error = new Promise<void>(resolve => {
            harness.chrome.offscreen.createDocument(parameters(), () => {
                expect(harness.chrome.runtime.lastError?.message).toContain("single offscreen");
                expect(harness.browser.runtime.lastError).toBe(harness.chrome.runtime.lastError);
                resolve();
            });
        });

        await error;
        expect(harness.runtime.lastError).toBeUndefined();

        await new Promise<void>(resolve => harness.browser.offscreen.hasDocument(value => {
            expect(value).toBe(true); resolve();
        }));

        await new Promise<void>(resolve => harness.browser.offscreen.closeDocument(resolve));
        expect(harness.offscreen.closeDocument.calls[0].callbackCalls).toEqual([[]]);
    });

    test("reset delivers callback cancellation once and does not leak lastError", async () => {
        const harness = createBrowserHarness();
        const gate = deferred();
        harness.offscreen.beforeCreate.setImplementation(() => gate.promise);
        let calls = 0;

        const cancelled = new Promise<void>(resolve => harness.chrome.offscreen.createDocument(parameters(), () => {
            calls++;
            expect(harness.runtime.lastError?.message).toContain("cancelled by reset");
            resolve();
        }));

        harness.reset();
        await cancelled;
        expect(harness.runtime.lastError).toBeUndefined();
        gate.resolve();
        await Promise.resolve();
        expect(calls).toBe(1);
        expect(harness.offscreen.context).toBeUndefined();
    });

    test("capabilities physically remove all three methods without changing registry state", async () => {
        const harness = createBrowserHarness();
        await harness.chrome.offscreen.createDocument(parameters());

        for (const member of ["createDocument", "closeDocument", "hasDocument"] as const) {
            harness.capabilities.set(`offscreen.${member}`, false);
            expect(member in harness.chrome.offscreen).toBe(false);
            expect(member in harness.browser.offscreen).toBe(false);
            expect(harness.capabilities.has(`offscreen.${member}`)).toBe(false);
            harness.capabilities.set(`offscreen.${member}`, true);
            expect(typeof harness.chrome.offscreen[member]).toBe("function");
        }

        expect(harness.contexts.list()).toHaveLength(1);
        harness.capabilities.set("offscreen.hasDocument", false);
        harness.reset();
        expect(await harness.chrome.offscreen.hasDocument()).toBe(false);
    });

    test("isolates gates, state and callbacks between harnesses", async () => {
        const one = createBrowserHarness();
        const two = createBrowserHarness();
        one.offscreen.beforeCreate.failNext(new Error("only one"));
        await two.browser.offscreen.createDocument(parameters());
        await expect(one.chrome.offscreen.createDocument(parameters())).rejects.toThrow("only one");
        one.reset();
        expect(await two.chrome.offscreen.hasDocument()).toBe(true);
    });

    test.each([
        null, {}, {...parameters(), url: ""}, {...parameters(), url: "https://example.test/offscreen.html"},
        {...parameters(), url: "chrome-extension://another-id/offscreen.html"}, {...parameters(), url: "http://["},
        {...parameters(), reasons: []}, {...parameters(), reasons: ["UNKNOWN"]},
        {...parameters(), justification: 42}, {...parameters(), extra: true},
    ])("rejects invalid creation parameters without leaving state: %p", async input => {
        const harness = createBrowserHarness();
        await expect(Reflect.apply(harness.chrome.offscreen.createDocument, null, [input])).rejects.toThrow("offscreen.createDocument:");
        expect(harness.contexts.list()).toEqual([]);
        expect(harness.contexts.documents.list()).toEqual([]);
        expect(harness.offscreen.beforeCreate.calls).toEqual([]);
    });

    test("normalizes relative and absolute same-extension URLs without claiming file availability", async () => {
        const harness = createBrowserHarness();
        const api: OffscreenTestApi = harness.chrome.offscreen;
        await api.createDocument({...parameters(), url: "/nested/../offscreen.html?mode=test#ready"});
        expect(harness.offscreen.context?.info.url).toBe("chrome-extension://test-extension-id/offscreen.html?mode=test#ready");
        await api.closeDocument();
        await api.createDocument({...parameters(), url: "chrome-extension://test-extension-id/absolute.html"});
        expect(harness.offscreen.context?.info.url).toBe("chrome-extension://test-extension-id/absolute.html");
    });
});
