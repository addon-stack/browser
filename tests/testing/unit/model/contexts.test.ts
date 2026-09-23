import {getContexts} from "../../../../src/runtime";
import {
    type BrowserContextInfo,
    createBrowserHarness,
    createExtensionContextFixture,
    createTabFixture,
    installBrowserGlobals,
} from "../../../../src/testing/index";

const makeHarness = () => createBrowserHarness({tabs: [createTabFixture({id: 7}), createTabFixture({id: 8, windowId: 2})]});

test("registers documents before scripts, separates contexts, and projects only native runtime types", async () => {
    const harness = makeHarness();
    const main = harness.contexts.documents.create({tabId: 7, url: "https://example.test/"});
    expect(harness.contexts.list()).toEqual([]);
    const content = harness.contexts.create({kind: "contentScript", documentId: main.documentId});
    const background = harness.contexts.create({kind: "background"});
    const offscreen = harness.contexts.create({kind: "offscreen"});
    expect(offscreen.info).toMatchObject({tabId: -1, frameId: 0, windowId: -1});
    expect(harness.contexts.documents.get(offscreen.info.documentId!)?.frameId).toBe(0);
    const popup = harness.contexts.create({kind: "extensionPage", contextType: "POPUP"});
    expect(content.info).toMatchObject({tabId: 7, frameId: 0, windowId: 1, documentUrl: "https://example.test/"});
    expect(background.info.url).toMatch(/background.js$/);
    expect(harness.contexts.list()).toHaveLength(4);
    const restore = installBrowserGlobals(harness, {environment: "preserve"});

    try {
        const native = await getContexts({});
        expect(native.map(value => value.contextId)).toEqual([background.info.contextId, offscreen.info.contextId, popup.info.contextId]);
        expect(native.every(value => !("kind" in value) && !("url" in value))).toBe(true);
        await expect(getContexts({contextTypes: ["OFFSCREEN_DOCUMENT"]})).resolves.toMatchObject([{contextId: offscreen.info.contextId}]);
        const callbackResults: chrome.runtime.ExtensionContext[][] = [];
        harness.chrome.runtime.getContexts({contextTypes: ["POPUP"]}, values => callbackResults.push(values));
        expect(callbackResults).toEqual([[expect.objectContaining({contextId: popup.info.contextId})]]);
    } finally {
        restore();
    }
});

test("filters by kind and every native selector with AND semantics and detached snapshots", () => {
    const harness = makeHarness();
    const ctx = harness.contexts.create({kind: "contentScript", url: "https://example.test/a", tabId: 7});
    const original = ctx.info;

    const filter = {
        kinds: ["contentScript" as const], contextIds: [original.contextId], documentIds: [original.documentId!],
        documentUrls: [original.documentUrl!], documentOrigins: [original.documentOrigin!],
        frameIds: [0], tabIds: [7], windowIds: [1], incognito: false,
    };

    expect(harness.contexts.list(filter)).toEqual([original]);
    expect(harness.contexts.list({...filter, tabIds: [8]})).toEqual([]);
    expect(harness.contexts.list({contextIds: []})).toEqual([]);
    expect(harness.contexts.list({contextTypes: ["TAB"]})).toEqual([]);
    expect(() => harness.contexts.list({unknown: true} as never)).toThrow("unsupported context filter");
    const snapshot = harness.contexts.list()[0] as BrowserContextInfo;
    snapshot.documentUrl = "changed";
    const doc = harness.contexts.documents.get(original.documentId!)!;
    doc.url = "changed";
    expect(ctx.info).toEqual(original);
    expect(harness.contexts.documents.get(original.documentId!)?.url).toBe(original.documentUrl);
});

test("retained documents and newly registered scripts observe their tab's current window", () => {
    const harness = makeHarness();
    const document = harness.contexts.documents.create({url: "https://example.test/", tabId: 7});
    const first = harness.contexts.create({kind: "contentScript", documentId: document.documentId});
    harness.tabs.set([createTabFixture({id: 7, windowId: 2})]);
    expect(first.disposed).toBe(false);
    expect(first.info.windowId).toBe(2);
    expect(harness.contexts.documents.get(document.documentId)?.windowId).toBe(2);
    const second = harness.contexts.create({kind: "contentScript", documentId: document.documentId, windowId: 2});
    expect(second.info.windowId).toBe(2);
    expect(harness.contexts.list({windowIds: [2]})).toHaveLength(2);
});

test("events, cleanup and operations are owned by each context", async () => {
    const harness = makeHarness();
    const left = harness.contexts.create({contextId: "left", kind: "background"});
    const right = harness.contexts.create({contextId: "right", kind: "background"});
    const received: string[] = [];

    const unsubscribe = left.onMessage.on(message => {
        received.push(String(message));
    });

    right.onMessage.on(() => {
        received.push("wrong context");
    });

    await left.onMessage.emit("hello", {}, () => undefined);
    unsubscribe();
    await left.onMessage.emit("ignored", {}, () => undefined);
    expect(received).toEqual(["hello"]);
    let release!: (value: string) => void;

    const operation = left.track(new Promise<string>(resolve => {
        release = resolve;
    }));

    const canceled = expect(operation).rejects.toThrow('context "left" was disposed');
    const cleanups: string[] = [];

    left.onDispose(() => {
        cleanups.push("left");
    });

    const stopCleanup = left.onDispose(() => {
        cleanups.push("unregistered");
    });

    stopCleanup();
    harness.contexts.remove("left");
    harness.contexts.remove("left");
    await canceled;
    release("late");
    expect(left.signal.aborted).toBe(true);
    expect(left.disposed).toBe(true);
    expect(left.onMessage.listenerCount()).toBe(0);
    expect(cleanups).toEqual(["left"]);
    expect(right.disposed).toBe(false);
    expect(() => left.onMessage.api.addListener(() => undefined)).toThrow("disposed");
    expect(() => left.onMessage.on(() => undefined)).toThrow("disposed");
    await expect(left.onMessage.emit("closed", {}, () => undefined)).rejects.toThrow("disposed");
    await expect(right.track(Promise.resolve("right"))).resolves.toBe("right");
    await expect(right.track(Promise.reject(new Error("source failure")))).rejects.toThrow("source failure");
});

test("document removal cascades through child frames without touching another tab", async () => {
    const harness = makeHarness();
    const root = harness.contexts.documents.create({documentId: "root", tabId: 7, url: "https://example.test/"});
    harness.contexts.documents.create({documentId: "child", tabId: 7, frameId: 3, parentFrameId: 0, url: "https://frame.test/"});
    harness.contexts.documents.create({documentId: "grandchild", tabId: 7, frameId: 4, parentFrameId: 3, url: "https://frame.test/child"});
    const child = harness.contexts.create({kind: "contentScript", documentId: "child"});
    const grandchild = harness.contexts.create({kind: "contentScript", documentId: "grandchild"});
    const other = harness.contexts.create({kind: "contentScript", tabId: 8, url: "https://other.test/"});
    child.onMessage.on(() => new Promise(() => undefined));
    const pending = child.onMessage.emit({}, {}, () => undefined);
    const canceled = expect(pending).rejects.toThrow("disposed");
    harness.contexts.documents.remove(root.documentId);
    await canceled;
    expect(child.disposed).toBe(true);
    expect(grandchild.disposed).toBe(true);
    expect(other.disposed).toBe(false);
    expect(harness.contexts.documents.list().map(value => value.tabId)).toEqual([8]);
});

test.each(["tab", "window", "setTabs", "setWindows"])("%s deletion disposes contexts and documents", async mode => {
    const harness = makeHarness();
    const context = harness.contexts.create({kind: "contentScript", tabId: 7, url: "https://example.test/"});

    if (mode === "tab") await harness.chrome.tabs.remove(7);
    else if (mode === "window") await harness.chrome.windows.remove(1);
    else if (mode === "setTabs") harness.tabs.set([createTabFixture({id: 8, windowId: 2})]);
    else harness.windows.set([{id: 2, focused: true, alwaysOnTop: false, incognito: false}]);

    expect(context.disposed).toBe(true);
    expect(harness.contexts.list()).toEqual([]);
    expect(harness.contexts.documents.list()).toEqual([]);
});

test("reset restores fixture copies, replaces handles, removes subscriptions and rejects pending work", async () => {
    const seed = createExtensionContextFixture({contextId: "seed"});
    const harness = createBrowserHarness({contexts: [seed]});
    const another = createBrowserHarness({contexts: [seed]});
    seed.contextId = "mutated input";
    const previous = harness.contexts.get("seed")!;
    previous.onMessage.on(() => undefined);

    previous.onDispose(() => {
        throw new Error("cleanup failed");
    });

    const pending = previous.track(new Promise(() => undefined));
    const canceled = expect(pending).rejects.toThrow("disposed");
    harness.runtime.addContext(createExtensionContextFixture({contextId: "added"}));
    expect(() => harness.reset()).toThrow("cleanup failed");
    await canceled;
    expect(harness.runtime.contexts.map(context => context.contextId)).toEqual(["seed"]);
    const next = harness.contexts.get("seed")!;
    expect(next).not.toBe(previous);
    expect(next.onMessage.listenerCount()).toBe(0);
    expect(previous.disposed).toBe(true);
    expect(another.contexts.get("seed")?.disposed).toBe(false);
    harness.reset();
    expect(harness.runtime.contexts.map(context => context.contextId)).toEqual(["seed"]);
});

test("invalid registrations are atomic and duplicate frame/document/context identifiers are rejected", () => {
    const harness = makeHarness();
    const document = harness.contexts.documents.create({documentId: "doc", url: "https://example.test/", tabId: 7});
    expect(() => harness.contexts.documents.create({url: "https://other.test/", tabId: 7})).toThrow("already has a document");
    expect(() => harness.contexts.documents.create({...document})).toThrow("already exists");
    expect(() => harness.contexts.documents.create({url: "relative/path"})).toThrow("invalid absolute URL");
    expect(() => harness.contexts.documents.create({url: "https://example.test/", tabId: 999})).toThrow("does not exist");
    expect(() => harness.contexts.create({kind: "contentScript", documentId: "missing"})).toThrow("does not exist");
    expect(() => harness.contexts.create({kind: "contentScript", documentId: "doc", tabId: 8})).toThrow("disagrees");
    harness.contexts.create({contextId: "ctx", kind: "contentScript", documentId: "doc"});
    expect(() => harness.contexts.create({contextId: "ctx", kind: "offscreen"})).toThrow("duplicate");
    expect(harness.contexts.documents.list()).toEqual([document]);
    expect(harness.contexts.list()).toHaveLength(1);
});

test("legacy runtime controls share the registry and validate replacements before disposing resources", async () => {
    const harness = makeHarness();
    const native = createExtensionContextFixture({contextId: "native"});
    harness.runtime.addContext(native);
    const handle = harness.contexts.get("native")!;
    handle.onMessage.on(() => undefined);
    expect(() => harness.runtime.setContexts([native, native])).toThrow("invalid runtime context replacement");
    expect(handle.disposed).toBe(false);
    expect(handle.onMessage.listenerCount()).toBe(1);
    expect(harness.runtime.contexts).toEqual([native]);
    harness.runtime.setContexts([createExtensionContextFixture({contextId: "replacement"})]);
    expect(handle.disposed).toBe(true);
    harness.runtime.removeContext("replacement");
    expect(harness.contexts.list()).toEqual([]);
    harness.runtime.getContexts.setResult([native]);
    await expect(harness.browser.runtime.getContexts({})).resolves.toEqual([native]);
    expect(harness.contexts.list()).toEqual([]);
    harness.reset();
    await expect(harness.browser.runtime.getContexts({})).resolves.toEqual([]);
});

test("native document fixtures and content scripts share document lifetime without replacing each other", async () => {
    const native = createExtensionContextFixture({
        contextId: "extension-tab", contextType: "TAB", tabId: 7, frameId: 0, windowId: 1,
        documentId: "native-document", documentUrl: "chrome-extension://test-extension-id/options.html",
    });

    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})], contexts: [native]});
    const content = harness.contexts.create({kind: "contentScript", documentId: "native-document"});
    expect(harness.contexts.documents.get("native-document")?.url).toBe(native.documentUrl);
    expect(harness.contexts.list()).toHaveLength(2);
    harness.runtime.setContexts([native]);
    expect(content.disposed).toBe(false);
    expect(harness.contexts.list()).toHaveLength(2);
    const extension = harness.contexts.get("extension-tab")!;
    harness.contexts.documents.remove("native-document");
    expect(content.disposed).toBe(true);
    expect(extension.disposed).toBe(true);
    await expect(harness.browser.runtime.getContexts({})).resolves.toEqual([]);
    harness.reset();
    expect(harness.contexts.documents.get("native-document")?.url).toBe(native.documentUrl);
    expect(harness.runtime.contexts).toEqual([native]);
});

test("reset restores new document and context fixtures after tab removal using isolated copies", async () => {
    const document = {documentId: "initial", tabId: 7, url: "https://example.test/initial"};
    const context = {contextId: "initial-script", kind: "contentScript" as const, documentId: "initial"};
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})], documents: [document], contexts: [context]});
    const before = harness.contexts.list();
    const previous = harness.contexts.get("initial-script")!;
    previous.onMessage.on(() => undefined);
    document.url = "https://mutated.test/";
    context.contextId = "mutated";
    await harness.browser.tabs.remove(7);
    harness.reset();
    expect(harness.contexts.list()).toEqual(before);
    expect(harness.contexts.documents.list()[0]?.url).toBe("https://example.test/initial");
    expect(previous.disposed).toBe(true);
    expect(harness.contexts.get("initial-script")?.onMessage.listenerCount()).toBe(0);
});

test("runtime query errors retain callback lastError and Promise semantics without changing state", async () => {
    const harness = createBrowserHarness({contexts: [{kind: "background", contextId: "background"}]});
    const seen: Array<string | undefined> = [];
    harness.runtime.getContexts.failNext(new Error("query failed"));

    harness.chrome.runtime.getContexts({}, () => {
        seen.push(harness.chrome.runtime.lastError?.message);
    });

    expect(seen).toEqual(["query failed"]);
    expect(harness.chrome.runtime.lastError).toBeUndefined();
    harness.runtime.getContexts.failNext(new Error("promise failed"));
    await expect(harness.browser.runtime.getContexts({})).rejects.toThrow("promise failed");
    expect(harness.browser.runtime.lastError).toBeUndefined();
    await expect(harness.browser.runtime.getContexts({kinds: ["background"]} as never)).rejects.toThrow("unsupported runtime context filter");
    harness.capabilities.set("runtime.getContexts", false);
    expect("getContexts" in harness.browser.runtime).toBe(false);
    expect(harness.contexts.list()).toHaveLength(1);
    harness.capabilities.set("runtime.getContexts", true);
    await expect(harness.browser.runtime.getContexts({contextIds: ["background"]})).resolves.toHaveLength(1);
});

test("context validation rejects inconsistent frames and extension URLs without partial registration", () => {
    const harness = makeHarness();
    const root = harness.contexts.documents.create({url: "https://example.test/", tabId: 7});
    expect(() => harness.contexts.documents.create({url: root.url, tabId: 7, frameId: 3, parentFrameId: 9})).toThrow("parentFrameId");
    expect(() => harness.contexts.documents.create({url: root.url, tabId: 7, frameId: 2, windowId: 999})).toThrow("disagrees");
    expect(() => harness.contexts.create({kind: "background", windowId: 7})).toThrow("cannot belong");
    expect(() => harness.contexts.create({kind: "background", documentId: ""})).toThrow("must not be empty");
    expect(() => harness.contexts.create({kind: "offscreen", url: "https://example.test/"})).toThrow("must belong to this extension");
    expect(() => harness.contexts.create({kind: "offscreen", tabId: 8})).toThrow("must not belong");
    expect(() => harness.contexts.create({kind: "offscreen", frameId: -1})).toThrow("requires frameId 0");
    expect(() => harness.contexts.create({kind: "offscreen", frameId: 2})).toThrow("requires frameId 0");
    expect(() => harness.contexts.create({kind: "background", contextType: "POPUP"})).toThrow("only valid for extension pages");
    expect(harness.contexts.documents.list()).toEqual([root]);
    expect(harness.contexts.list()).toEqual([]);
});

test("cleanup failure does not skip other contexts, and late rejected operations stay observed", async () => {
    const harness = makeHarness();
    const one = harness.contexts.create({kind: "background"});
    const two = harness.contexts.create({kind: "offscreen"});
    const cleaned: string[] = [];
    let rejectSource!: (error: Error) => void;

    const tracked = one.track(new Promise((_, reject) => {
        rejectSource = reject;
    }));

    const canceled = expect(tracked).rejects.toThrow("disposed");

    one.onDispose(() => {
        expect(() => harness.contexts.create({kind: "background"})).toThrow("during reset");
        throw new Error("cleanup fault");
    });

    two.onDispose(() => {
        cleaned.push("second context");
    });

    harness.scripting.executeScript.setResult([]);
    expect(() => harness.reset()).toThrow("cleanup failed");
    await canceled;
    rejectSource(new Error("late source rejection"));
    expect(cleaned).toEqual(["second context"]);
    expect(harness.contexts.list()).toEqual([]);
    expect(two.disposed).toBe(true);
    await expect(one.track(Promise.reject(new Error("already closed source")))).rejects.toThrow("disposed");
    await expect(harness.chrome.scripting.executeScript({target: {tabId: 7}, func: () => 1})).rejects.toThrow("no executor configured");
});

test.each(["tabs", "windows", "setTabs", "setWindows"])("%s removal finishes despite a context cleanup failure", async mode => {
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7}), createTabFixture({id: 8})]});
    const one = harness.contexts.create({kind: "contentScript", tabId: 7, url: "https://example.test/"});
    const two = harness.contexts.create({kind: "contentScript", tabId: 8, url: "https://other.test/"});

    one.onDispose(() => {
        throw new Error("cleanup fault");
    });

    if (mode === "tabs") await expect(harness.browser.tabs.remove([7, 8])).rejects.toThrow("context cleanup failed");
    else if (mode === "windows") await expect(harness.browser.windows.remove(1)).rejects.toThrow("context cleanup failed");
    else if (mode === "setTabs") expect(() => harness.tabs.set([])).toThrow("context cleanup failed");
    else expect(() => harness.windows.set([])).toThrow("context cleanup failed");

    expect(one.disposed).toBe(true);
    expect(two.disposed).toBe(true);
    expect(harness.tabs.values).toEqual([]);
    expect(harness.contexts.documents.list()).toEqual([]);
    expect(harness.contexts.list()).toEqual([]);
});
