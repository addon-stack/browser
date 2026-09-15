import {describe, expect, test} from "@jest/globals";
import {type BrowserScriptExecution, createBrowserHarness, createTabFixture} from "../../../../src/testing";

const setup = () => {
    const harness = createBrowserHarness({
        tabs: [createTabFixture({id: 8}), createTabFixture({id: 9}), createTabFixture({id: 10})],
        documents: [
            {documentId: "child", tabId: 8, frameId: 3, url: "https://frame.test/"},
            {documentId: "main", tabId: 8, frameId: 0, url: "https://page.test/"},
            {documentId: "other", tabId: 9, frameId: 0, url: "https://other.test/"},
        ],
        contexts: [
            {contextId: "content-a", kind: "contentScript", documentId: "main"},
            {contextId: "content-b", kind: "contentScript", documentId: "main"},
        ],
    });

    return harness;
};

const injection = {target: {tabId: 8}, func: () => "not run"};

describe("scripting targets and explicit execution", () => {
    test.each([
        [{tabId: 8}, ["main"]],
        [{tabId: 8, allFrames: false}, ["main"]],
        [{tabId: 8, allFrames: true}, ["main", "child"]],
        [{tabId: 8, frameIds: [3, 0, 3]}, ["main", "child"]],
        [{tabId: 8, documentIds: ["child"]}, ["child"]],
        [{tabId: 9}, ["other"]],
    ] satisfies [chrome.scripting.InjectionTarget, string[]][])("selects %j independently of execution", (target, ids) => {
        const harness = setup();
        const selected = harness.scripting.selectTargets(target);
        expect(selected.map(document => document.documentId)).toEqual(ids);
        expect(harness.scripting.executeScript.calls).toHaveLength(0);
        expect(Object.isFrozen(selected)).toBe(true);
        expect(selected.every(value => Object.isFrozen(value) && Object.isFrozen(value.contextIds))).toBe(true);
    });

    test.each([
        [null, "target must be an object"],
        [{tabId: -1}, "tabId"],
        [{tabId: 404}, "does not exist"],
        [{tabId: 10}, "no registered document"],
        [{tabId: 10, allFrames: true}, "no registered documents"],
        [{tabId: 8, frameIds: [99]}, "frame 99"],
        [{tabId: 8, documentIds: ["other"]}, "does not exist in tab 8"],
        [{tabId: 8, allFrames: true, frameIds: [0]}, "mutually exclusive"],
        [{tabId: 8, allFrames: true, documentIds: ["main"]}, "mutually exclusive"],
        [{tabId: 8, frameIds: [0], documentIds: ["main"]}, "mutually exclusive"],
        [{tabId: 8, frameIds: []}, "non-empty"],
        [{tabId: 8, documentIds: []}, "non-empty"],
        [{tabId: 8, frameIds: [-1]}, "non-negative"],
        [{tabId: 8, documentIds: [2]}, "document IDs"],
        [{tabId: 8, allFrames: "yes"}, "boolean"],
        [{tabId: 8, frameId: 0}, "unsupported target option"],
    ])("fails closed for %j", (target, message) => {
        expect(() => setup().scripting.selectTargets(target as chrome.scripting.InjectionTarget)).toThrow(`scripting.executeScript:`);
        expect(() => setup().scripting.selectTargets(target as chrome.scripting.InjectionTarget)).toThrow(message);
    });

    test("never invokes the input function implicitly or passes its closure to the adapter", async () => {
        const harness = setup();
        let calls = 0;

        const func = (_arg?: {nested: {value: number}}) => {
            calls++;

            return "secret";
        };

        await expect(harness.chrome.scripting.executeScript({...injection, func})).rejects.toThrow("no executor configured");
        const requests: BrowserScriptExecution[] = [];
        const args: [{nested: {value: number}}] = [{nested: {value: 1}}];
        const output = {nested: {value: 7}};

        harness.scripting.setExecutor(request => {
            requests.push(request);
            expect("func" in request.script).toBe(false);
            expect(request.script.kind).toBe("function");

            if (request.script.kind === "function") {
                expect(request.script.source).toBe(func.toString());
                const argument = request.script.args[0] as typeof args[0];
                expect(argument.nested.value).toBe(1);
                argument.nested.value = 99;
            }

            return output;
        });

        const results = await harness.chrome.scripting.executeScript({target: {tabId: 8, allFrames: true}, func, args});
        expect(requests.map(request => request.target.contextIds)).toEqual([["content-a", "content-b"], []]);

        expect(results).toEqual([
            {documentId: "main", frameId: 0, result: output},
            {documentId: "child", frameId: 3, result: output},
        ]);

        expect(calls).toBe(0);
        expect(args[0].nested.value).toBe(1);
        expect(results[0].result).not.toBe(output);
        expect(results[0].result).not.toBe(results[1].result);
        expect(harness.scripting.pendingExecutions).toBe(0);
    });

    test("awaits arbitrary thenables and forwards world, timing and files only as metadata", async () => {
        const harness = setup();
        const requests: BrowserScriptExecution[] = [];

        harness.scripting.setExecutor(request => {
            requests.push(request);

            return {then: (resolve: (value: string) => void) => resolve(request.target.documentId)};
        });

        expect(await harness.chrome.scripting.executeScript({...injection, world: "MAIN", injectImmediately: true})).toEqual([
            {frameId: 0, documentId: "main", result: "main"},
        ]);

        expect(requests[0]).toMatchObject({world: "MAIN", injectImmediately: true, script: {kind: "function", args: []}});
        await harness.chrome.scripting.executeScript({target: {tabId: 8}, files: ["first.js", "second.js"]});
        expect(requests[1]).toMatchObject({world: "ISOLATED", injectImmediately: false, script: {kind: "files", files: ["first.js", "second.js"]}});
    });

    test.each([
        null,
        {...injection, func: undefined},
        {...injection, files: ["a.js"]},
        {target: {tabId: 8}, files: []},
        {target: {tabId: 8}, files: ["a.js"], args: []},
        {...injection, args: "bad"},
        {...injection, args: [1n]},
        {...injection, args: Object.assign([], {toJSON: () => null})},
        {...injection, world: "OTHER"},
        {...injection, injectImmediately: 1},
        {...injection, func: Math.max},
        {...injection, unrecognized: true},
    ])("rejects invalid injections without running executor: %#", async value => {
        const harness = setup();
        let calls = 0;

        harness.scripting.setExecutor(() => {
            calls++;
        });

        await expect(harness.chrome.scripting.executeScript(value as typeof injection)).rejects.toThrow("scripting.executeScript");
        expect(calls).toBe(0);
    });

    test("configured results, implementation, failNext and reset retain method precedence", async () => {
        const harness = setup();
        harness.scripting.executeScript.setResult([{frameId: 19, documentId: "configured", result: "ready"}]);
        // Ready-made results intentionally bypass target selection and executor requirements.
        const details = {...injection, target: {tabId: 999}};
        expect((await harness.chrome.scripting.executeScript(details))[0].result).toBe("ready");
        harness.scripting.executeScript.queueResult([{frameId: 0, documentId: "queued"}]);
        harness.scripting.executeScript.failNext(new Error("denied"));
        await expect(harness.browser.scripting.executeScript(details)).rejects.toThrow("denied");
        expect((await harness.browser.scripting.executeScript(details))[0].documentId).toBe("queued");
        harness.scripting.executeScript.setImplementation(async () => []);
        expect(await harness.browser.scripting.executeScript(details)).toEqual([]);
        expect(harness.runtime.lastError).toBeUndefined();
        harness.scripting.executeScript.reset();
        expect(harness.scripting.executeScript.hasDefaultImplementation).toBe(true);
        await expect(harness.chrome.scripting.executeScript(injection)).rejects.toThrow("no executor configured");
        harness.scripting.setExecutor(() => 2);
        harness.scripting.executeScript.reset();
        expect((await harness.browser.scripting.executeScript(injection))[0].result).toBe(2);
        harness.scripting.reset();
        await expect(harness.browser.scripting.executeScript(injection)).rejects.toThrow("no executor configured");
    });

    test.each(["chrome", "browser"] as const)("%s callback success and scoped lastError", async facade => {
        const harness = setup();
        harness.scripting.setExecutor(() => "ok");

        await new Promise<void>(resolve => {
            const returned = harness[facade].scripting.executeScript(injection, results => {
                expect(results[0].result).toBe("ok");
                expect(harness.runtime.lastError).toBeUndefined();
                resolve();
            });

            expect(returned).toBeUndefined();
        });

        harness.scripting.setExecutor(() => {
            throw new Error("adapter failed");
        });

        await new Promise<void>(resolve => {
            harness[facade].scripting.executeScript(injection, results => {
                expect(results).toBeUndefined();
                expect(harness.runtime.lastError?.message).toMatch(/scripting.executeScript: executor failed/);
                resolve();
            });
        });

        expect(harness.runtime.lastError).toBeUndefined();
        expect(harness.scripting.executeScript.calls.map(call => call.callbackCalls.length)).toEqual([1, 1]);
    });
});

describe("script execution lifetime", () => {
    test("argument serialization cannot resurrect an executor cleared by reset", async () => {
        const harness = setup();
        let executed = false;

        harness.scripting.setExecutor(() => {
            executed = true;
        });

        const operation = harness.chrome.scripting.executeScript({
            target: {tabId: 8}, func: (value: unknown) => value,
            args: [{toJSON: () => {
                harness.reset();

                return {};
            }}],
        });

        await expect(operation).rejects.toThrow("cancelled by reset");
        expect(executed).toBe(false);
        expect(harness.scripting.pendingExecutions).toBe(0);
    });

    test("results use an explicit JSON subset, without retaining references or accepting cycles", async () => {
        const harness = setup();
        harness.scripting.setExecutor(() => ({date: new Date("2024-01-01T00:00:00.000Z"), missing: undefined}));
        expect((await harness.chrome.scripting.executeScript(injection))[0].result).toEqual({date: "2024-01-01T00:00:00.000Z"});
        harness.scripting.setExecutor(() => undefined);
        expect((await harness.chrome.scripting.executeScript(injection))[0].result).toBeUndefined();
        const cyclic: {self?: unknown} = {};
        cyclic.self = cyclic;

        for (const value of [cyclic, 1n, () => 1, Symbol("bad")]) {
            harness.scripting.setExecutor(() => value);
            await expect(harness.chrome.scripting.executeScript(injection)).rejects.toThrow("scripting.executeScript: executor failed");
            expect(harness.scripting.pendingExecutions).toBe(0);
        }
    });

    test("document cleanup is isolated, unsubscribable, and finishes despite a failing observer", () => {
        const harness = setup();
        const cleaned: string[] = [];

        const unsubscribe = harness.contexts.documents.onRemoved("child", () => {
            cleaned.push("unsubscribed");
        });

        unsubscribe();

        harness.contexts.documents.onRemoved("main", () => {
            throw new Error("observer failed");
        });

        harness.contexts.documents.onRemoved("child", () => {
            cleaned.push("child");
        });

        const context = harness.contexts.get("content-a")!;
        expect(() => harness.contexts.documents.remove("main")).toThrow("document cleanup failed");
        expect(context.disposed).toBe(true);
        expect(cleaned).toEqual(["child"]);
        expect(harness.contexts.documents.get("other")).toBeDefined();
        harness.contexts.documents.create({documentId: "main", tabId: 8, frameId: 0, url: "https://replacement.test/"});
        expect(() => harness.contexts.documents.remove("main")).not.toThrow();
        expect(() => harness.contexts.documents.onRemoved("missing", () => undefined)).toThrow("does not exist");
    });

    test.each(["document", "context", "tab", "window", "reset", "contexts-reset", "cancel"])("%s cancellation settles even a never-resolving adapter", async action => {
        const harness = setup();
        const requests: BrowserScriptExecution[] = [];
        let finish: (value: unknown) => void = () => undefined;

        harness.scripting.setExecutor(request => {
            requests.push(request);

            return new Promise(resolve => {
                finish = resolve;
            });
        });

        const operation = harness.chrome.scripting.executeScript(injection);
        const rejected = expect(operation).rejects.toThrow("scripting.executeScript:");
        expect(harness.scripting.pendingExecutions).toBe(1);

        if (action === "document") harness.contexts.documents.remove("main");
        else if (action === "context") harness.contexts.remove("content-a");
        else if (action === "tab") await harness.chrome.tabs.remove(8);
        else if (action === "window") await harness.chrome.windows.remove((await harness.chrome.tabs.get(8)).windowId);
        else if (action === "reset") harness.reset();
        else if (action === "contexts-reset") harness.contexts.reset();
        else harness.scripting.cancelExecutions();

        await rejected;
        expect(requests[0].signal.aborted).toBe(true);
        expect(harness.scripting.pendingExecutions).toBe(0);
        finish("too late");
        await Promise.resolve();
        expect(harness.scripting.pendingExecutions).toBe(0);
    });

    test("removal of a document without contexts cancels and reused IDs do not inherit subscriptions", async () => {
        const harness = setup();
        harness.scripting.setExecutor(() => new Promise(() => undefined));
        const operation = harness.browser.scripting.executeScript({...injection, target: {tabId: 8, frameIds: [3]}});
        const rejection = expect(operation).rejects.toThrow('document "child" was removed');
        harness.contexts.documents.remove("child");
        await rejection;
        harness.contexts.documents.create({documentId: "child", tabId: 8, frameId: 3, url: "https://new.test/"});
        harness.scripting.setExecutor(({target}) => target.url);
        expect((await harness.browser.scripting.executeScript({...injection, target: {tabId: 8, frameIds: [3]}}))[0].result).toBe("https://new.test/");
    });

    test("independent operations/harnesses, late rejection and sibling failure", async () => {
        const harness = setup();
        const other = setup();
        const requests: BrowserScriptExecution[] = [];
        let rejectLate: (reason: unknown) => void = () => undefined;

        harness.scripting.setExecutor(request => {
            requests.push(request);

            if (request.target.frameId === 3) throw new Error("child failed");

            return new Promise((_resolve, reject) => {
                rejectLate = reject;
            });
        });

        const operation = harness.chrome.scripting.executeScript({...injection, target: {tabId: 8, allFrames: true}});
        other.scripting.setExecutor(() => "other");
        await expect(operation).rejects.toMatchObject({message: 'scripting.executeScript: executor failed for document "child": child failed', cause: {message: "child failed"}});
        expect(requests.every(request => request.signal.aborted)).toBe(true);
        rejectLate(new Error("observed late rejection"));
        expect((await other.chrome.scripting.executeScript(injection))[0].result).toBe("other");
        expect(harness.scripting.pendingExecutions).toBe(0);
    });
});
