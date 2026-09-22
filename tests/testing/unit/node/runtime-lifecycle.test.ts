import {describe, expect, test} from "@jest/globals";
import {type BrowserScriptExecution, createBrowserHarness, createTabFixture} from "../../../../src/testing";
import {createNodeScriptRuntime, type NodeScriptRuntimeOptions} from "../../../../src/testing/node";

const seeds = [
    {documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"},
    {documentId: "child", tabId: 7, frameId: 3, parentFrameId: 0, url: "https://page.test/frame"},
];

const setup = (options: NodeScriptRuntimeOptions = {}) => {
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})], documents: seeds});
    const runtime = createNodeScriptRuntime({documents: harness.contexts.documents, ...options});
    harness.scripting.setExecutor(runtime.executor);
    const snapshot = harness.scripting.selectTargets({tabId: 7})[0];

    const request = (source: string, documentId = "main", world: "MAIN" | "ISOLATED" = "ISOLATED"): BrowserScriptExecution => ({
        target: {...snapshot, ...harness.contexts.documents.get(documentId), documentId}, script: {kind: "function", source, args: []},
        signal: new AbortController().signal, world, injectImmediately: false,
    });

    return {harness, runtime, request};
};

describe("document-bound Node runtime", () => {
    test.each([
        {field: "tabId", value: 99},
        {field: "frameId", value: 99},
        {field: "url", value: "https://other.test/"},
    ])("rejects mismatched $field before subscribing or mutating realm state", async ({field, value}) => {
        const {harness, runtime: unusedRuntime, request} = setup();
        unusedRuntime.dispose();
        let subscriptions = 0;

        const runtime = createNodeScriptRuntime({documents: {
            get: harness.contexts.documents.get,
            onRemoved(id, cleanup) {
                subscriptions++;

                return harness.contexts.documents.onRemoved(id, cleanup);
            },
        }});

        const original = request("() => { globalThis.value = 999; throw new Error('must not run'); }");
        const mismatched = {...original, target: {...original.target, [field]: value}};
        const error = `target ${field} does not match document "main" in the bound registry`;

        try {
            await expect(runtime.executor(mismatched)).rejects.toThrow(error);
            expect(subscriptions).toBe(0);
            expect(runtime.realmCount).toBe(0);
            expect(runtime.pendingExecutions).toBe(0);

            // A rejected request must not invalidate the initially absent realm.
            expect(await runtime.executor(request("() => 7"))).toBe(7);
            runtime.evaluate({documentId: "main"}, {source: "globalThis.value = 7"});
            const pending = runtime.executor(request("() => new Promise(resolve => { globalThis.release = resolve; })"));
            await expect(runtime.executor(mismatched)).rejects.toThrow(error);
            expect(runtime.pendingExecutions).toBe(1);
            expect(await runtime.executor(request("() => value"))).toBe(7);
            runtime.evaluate({documentId: "main"}, {source: "release(42)"});
            expect(await pending).toBe(42);
            expect(runtime.pendingExecutions).toBe(0);
            expect(subscriptions).toBe(1);

            expect(() => runtime.evaluate({documentId: "main"}, {source: "throw new Error('original failure')"})).toThrow("original failure");
            await expect(runtime.executor(mismatched)).rejects.toThrow(error);
            await expect(runtime.executor(request("() => 1"))).rejects.toThrow("realm invalidated by");
            await expect(runtime.executor(request("() => 1"))).rejects.toThrow("original failure");
            expect(runtime.realmCount).toBe(0);
            expect(subscriptions).toBe(1);
        } finally {
            runtime.dispose();
        }
    });

    test("bound mode rejects unknown IDs without allocating state; standalone remains independent", async () => {
        const {harness, runtime, request} = setup();
        expect(() => runtime.evaluate({documentId: "missing"}, {source: "globalThis.old = 1"})).toThrow('document "missing" does not exist');
        await expect(runtime.executor(request("() => 1", "missing"))).rejects.toThrow("bound registry");
        expect(runtime.realmCount).toBe(0);
        harness.contexts.documents.create({documentId: "missing", url: "https://new.test/"});
        expect(await runtime.executor(request("() => typeof old", "missing"))).toBe("undefined");
        const standalone = createNodeScriptRuntime();
        standalone.evaluate({documentId: "unregistered"}, {source: "globalThis.kept = 8"});
        harness.reset();
        expect(runtime.realmCount).toBe(0);
        expect(await standalone.executor(request("() => kept", "unregistered"))).toBe(8);
        standalone.dispose();
        runtime.dispose();
    });

    test("removal destroys both worlds and child documents and rejects direct pending calls", async () => {
        const {harness, runtime, request} = setup();
        const pending: Promise<void>[] = [];

        for (const document of seeds) {
            for (const world of ["MAIN", "ISOLATED"] as const) {
                runtime.evaluate({documentId: document.documentId, world}, {source: "globalThis.value = 1"});
                pending.push(expect(runtime.executor(request("() => new Promise(() => {})", document.documentId, world))).rejects.toThrow("was removed"));
            }
        }

        expect(runtime.realmCount).toBe(4);
        harness.contexts.documents.remove("main");
        await Promise.all(pending);
        expect(runtime.realmCount).toBe(0);
        expect(runtime.pendingExecutions).toBe(0);
        await expect(runtime.executor(request("() => 1"))).rejects.toThrow("does not exist");
        runtime.dispose();
    });

    test("one public subscription per document survives invalidation, re-subscribes for reused IDs, and detaches on dispose", async () => {
        const harness = createBrowserHarness({documents: [{documentId: "doc", url: "https://page.test/"}]});
        let added = 0;
        const active = new Set<() => void>();

        const runtime = createNodeScriptRuntime({documents: {
            get: harness.contexts.documents.get,
            onRemoved(id, cleanup) {
                added++;
                active.add(cleanup);
                const remove = harness.contexts.documents.onRemoved(id, cleanup);

                return () => {
                    active.delete(cleanup); remove();
                };
            },
        }});

        for (let life = 0; life < 3; life++) {
            for (const world of ["MAIN", "ISOLATED"] as const) {
                expect(() => runtime.evaluate({documentId: "doc", world}, {source: "throw new Error('invalid')"})).toThrow("invalid");
            }

            expect(added).toBe(life * 2 + 1);
            expect(active.size).toBe(1);
            expect(runtime.realmCount).toBe(0);
            harness.contexts.documents.remove("doc");
            expect(active.size).toBe(0);
            const document = harness.contexts.documents.create({documentId: "doc", url: "https://page.test/"});

            const direct: BrowserScriptExecution = {
                target: {...document, contextIds: []}, script: {kind: "function", source: "() => 1", args: []},
                signal: new AbortController().signal, world: "ISOLATED", injectImmediately: false,
            };

            expect(await runtime.executor(direct)).toBe(1);

            if (life < 2) {
                harness.contexts.documents.remove("doc");
                harness.contexts.documents.create({documentId: "doc", url: "https://page.test/"});
            }
        }

        expect(active.size).toBe(1);
        runtime.dispose();
        expect(active.size).toBe(0);
        harness.contexts.reset();
        expect(() => runtime.evaluate({documentId: "doc"}, {source: ""})).toThrow("runtime is disposed");
    });

    test.each(["contexts", "harness"])("%s reset cleans realms and invalidation markers, but runtime survives without automatic bootstrap/executor", async kind => {
        const {harness, runtime, request} = setup();

        for (let cycle = 0; cycle < 3; cycle++) {
            runtime.evaluate({documentId: "main"}, {source: "globalThis.manager = {value: 4}"});
            expect(() => runtime.evaluate({documentId: "main", world: "MAIN"}, {source: "throw 1"})).toThrow();
            const pending = harness.chrome.scripting.executeScript({target: {tabId: 7}, func: () => new Promise(() => {})});
            const rejected = expect(pending).rejects.toThrow("reset");

            if (kind === "contexts") harness.contexts.reset();
            else harness.reset();

            await rejected;
            expect(runtime.realmCount).toBe(0);
            expect(runtime.pendingExecutions).toBe(0);
            const injection = {target: {tabId: 7}, func: () => 1};
            await expect(harness.chrome.scripting.executeScript(injection)).rejects.toThrow("no executor configured");
            expect(await runtime.executor(request("() => typeof manager", "main", "MAIN"))).toBe("undefined");
            expect(await runtime.executor(request("() => typeof manager"))).toBe("undefined");
            harness.scripting.setExecutor(runtime.executor);
        }

        runtime.dispose();
    });

    test("scripting-only reset aborts work but preserves live realms and invalidation markers", async () => {
        const {harness, runtime, request} = setup();
        runtime.evaluate({documentId: "main"}, {source: "globalThis.value = 7"});
        expect(() => runtime.evaluate({documentId: "main", world: "MAIN"}, {source: "throw 1"})).toThrow();
        const pending = harness.chrome.scripting.executeScript({target: {tabId: 7}, func: () => new Promise(() => {})});
        const rejected = expect(pending).rejects.toThrow("reset");
        harness.scripting.reset();
        await rejected;
        expect(runtime.pendingExecutions).toBe(0);
        expect(runtime.realmCount).toBe(1);
        expect(await runtime.executor(request("() => value"))).toBe(7);
        await expect(runtime.executor(request("() => 1", "main", "MAIN"))).rejects.toThrow("realm invalidated");
        await expect(harness.chrome.scripting.executeScript({target: {tabId: 7}, func: () => 1})).rejects.toThrow("no executor configured");
        runtime.dispose();
    });

    test("removal from a diagnostic drops remaining outbox entries even when a replacement is bootstrapped immediately", async () => {
        let diagnostics = 0;

        const {harness, runtime, request} = setup({onScriptError: () => {
            diagnostics++;
            harness.contexts.documents.remove("main");
            harness.contexts.documents.create(seeds[0]);
            runtime.evaluate({documentId: "main"}, {source: "globalThis.newLife = true"});
        }});

        runtime.evaluate({documentId: "main"}, {source: "globalThis.replies = []"});
        const first = runtime.executor(request("() => new Promise((resolve, reject) => replies.push(reject))"));
        const second = runtime.executor(request("() => new Promise(resolve => replies.push(resolve))"));
        const rejections = [expect(first).rejects.toThrow("was removed"), expect(second).rejects.toThrow("was removed")];
        runtime.evaluate({documentId: "main"}, {source: "replies[0](new Error('first')); replies[1]('stale')"});
        await Promise.all(rejections);
        expect(diagnostics).toBe(1);
        expect(runtime.pendingExecutions).toBe(0);
        expect(runtime.realmCount).toBe(1);
        expect(await runtime.executor(request("() => [newLife, typeof replies]"))).toEqual([true, "undefined"]);
        runtime.dispose();
    });

    test("two bound runtimes with identical IDs cannot clean up or invalidate each other", async () => {
        const a = setup();
        const b = setup();
        a.runtime.evaluate({documentId: "main"}, {source: "globalThis.value = 1"});
        b.runtime.evaluate({documentId: "main"}, {source: "globalThis.value = 2"});
        a.harness.reset();
        expect(a.runtime.realmCount).toBe(0);
        expect(await b.runtime.executor(b.request("() => value"))).toBe(2);
        a.runtime.dispose();
        b.runtime.dispose();
    });

    test.each(["tab", "window"])("removing the owning %s cleans document-bound state via the public registry", async kind => {
        const {harness, runtime} = setup();
        runtime.evaluate({documentId: "main"}, {source: "globalThis.ready = true"});
        expect(() => runtime.evaluate({documentId: "child"}, {source: "throw 1"})).toThrow();

        if (kind === "tab") await harness.chrome.tabs.remove(7);
        else await harness.chrome.windows.remove((await harness.chrome.tabs.get(7)).windowId);

        expect(runtime.realmCount).toBe(0);
        expect(() => runtime.evaluate({documentId: "main"}, {source: ""})).toThrow("does not exist");
        runtime.dispose();
    });
});
