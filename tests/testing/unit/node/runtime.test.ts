import {describe, expect, test} from "@jest/globals";
import {executeScript} from "../../../../src/scripting";
import {type BrowserScriptExecution, createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../../../src/testing";
import {createNodeScriptRuntime, type NodeScriptException, type NodeScriptRuntimeOptions} from "../../../../src/testing/node";

const setup = (options?: NodeScriptRuntimeOptions) => {
    const harness = createBrowserHarness({
        tabs: [createTabFixture({id: 7})],
        documents: [
            {documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"},
            {documentId: "child", tabId: 7, frameId: 3, url: "https://page.test/frame"},
        ],
    });

    const runtime = createNodeScriptRuntime(options);
    harness.scripting.setExecutor(runtime.executor);

    const request = (source: string, controller = new AbortController()): BrowserScriptExecution => ({
        target: harness.scripting.selectTargets({tabId: 7})[0],
        script: {kind: "function", source, args: []}, world: "ISOLATED",
        injectImmediately: false, signal: controller.signal,
    });

    return {harness, runtime, request};
};

const main = {documentId: "main"};
const target = {tabId: 7};

describe("persistent Node script runtime", () => {
    test("classic bootstrap registers a guest singleton whose async methods persist through production calls", async () => {
        const {harness, runtime, request} = setup();
        const restore = installBrowserGlobals(harness);

        runtime.evaluate(main, {source: `
            class Counter { constructor() { this.value = 0; } async add(value) { await Promise.resolve(); return this.value += value; } }
            globalThis.manager = new Counter();
            let lexical = 40;
        `, filename: "counter-bootstrap.js"});

        try {
            for (const expected of [2, 4]) {
                const results = await executeScript({target, func: async (amount: number) => {
                    const state = globalThis as typeof globalThis & {manager: {add(value: number): Promise<number>}};

                    return state.manager.add(amount);
                }, args: [2]});

                expect(results[0].result).toBe(expected);
            }

            expect(await runtime.executor(request("() => lexical + 2"))).toBe(42);
            expect(runtime.realmCount).toBe(1);
            expect(runtime.pendingExecutions).toBe(0);
        } finally {
            runtime.dispose();
            harness.reset();
            restore();
        }
    });

    test("document, world and runtime identities own independent state", async () => {
        const {harness, runtime, request} = setup();

        const increment = () => {
            const state = globalThis as typeof globalThis & {count?: number};

            return state.count = (state.count ?? 0) + 1;
        };

        for (const world of ["MAIN", "ISOLATED"] as const) {
            expect((await harness.browser.scripting.executeScript({target: {tabId: 7, allFrames: true}, world, func: increment})).map(item => item.result)).toEqual([1, 1]);
            expect((await harness.browser.scripting.executeScript({target, world, func: increment}))[0].result).toBe(2);
        }

        expect(runtime.realmCount).toBe(4);
        const separate = createNodeScriptRuntime();
        expect(await separate.executor(request("() => typeof count"))).toBe("undefined");
        separate.dispose();
        runtime.dispose();
    });

    test("microtasks drain in the guest; overlapping requests complete by ID, not dispatch order", async () => {
        const {runtime, request} = setup();
        runtime.evaluate(main, {source: "globalThis.replies = []"});
        const first = runtime.executor(request("() => new Promise(resolve => replies.push(resolve))"));
        const second = runtime.executor(request("() => new Promise(resolve => replies.push(resolve))"));
        expect(first).toBeInstanceOf(Promise);
        expect(runtime.pendingExecutions).toBe(2);
        runtime.evaluate(main, {source: "Promise.resolve().then(() => Promise.resolve()).then(() => replies[1]({answer: 2}))"});
        expect(await second).toEqual({answer: 2});
        expect(runtime.pendingExecutions).toBe(1);
        runtime.evaluate(main, {source: "replies[0]({then(resolve) { resolve({answer: 1}); }})"});
        expect(await first).toEqual({answer: 1});
        expect(runtime.pendingExecutions).toBe(0);
        runtime.dispose();
    });

    test("no test closure, driver locals, host functions, browser APIs, DOM or timers leak into a realm", async () => {
        const errors: NodeScriptException[] = [];
        const {harness, runtime, request} = setup({onScriptError: error => errors.push(error)});
        const privateValue = 42;
        expect(privateValue).toBe(42);
        expect((await harness.chrome.scripting.executeScript({target, func: () => privateValue}))[0].result).toBeNull();
        expect(errors[0].message).toBe("privateValue is not defined");
        expect(await runtime.executor(request("() => [typeof invoke, typeof outbox, typeof process, typeof require, typeof chrome, typeof browser, typeof window, typeof document, typeof setTimeout]"))).toEqual(Array(9).fill("undefined"));
        const args = [{value: 1}];
        const call = request("value => { value.value++; globalThis.saved = value; return value; }");
        const result = await runtime.executor({...call, script: {kind: "function", source: call.script.kind === "function" ? call.script.source : "", args}});
        expect(result).toEqual({value: 2});
        expect(args).toEqual([{value: 1}]);
        (result as {value: number}).value = 9;
        expect(await runtime.executor(request("() => saved.value"))).toBe(2);
        runtime.dispose();
    });

    test("abort releases one pending request without destroying state or another request", async () => {
        const {runtime, request} = setup();
        runtime.evaluate(main, {source: "globalThis.replies = []; globalThis.count = 3"});
        const controller = new AbortController();
        const first = runtime.executor(request("() => new Promise(resolve => replies.push(resolve))", controller));
        const rejected = expect(first).rejects.toThrow("execution aborted");
        const second = runtime.executor(request("() => new Promise(resolve => replies.push(resolve))"));
        controller.abort();
        await rejected;
        expect(runtime.pendingExecutions).toBe(1);
        runtime.evaluate(main, {source: "replies[0](100); replies[1](count)"});
        expect(await second).toBe(3);
        expect(runtime.realmCount).toBe(1);
        expect(runtime.pendingExecutions).toBe(0);
        await expect(runtime.executor(request("() => 1", controller))).rejects.toThrow("execution aborted");
        runtime.dispose();
    });

    test("manual disposal releases all pending requests and realms and is terminal and idempotent", async () => {
        const {runtime, request} = setup();
        runtime.evaluate({documentId: "child", world: "MAIN"}, {source: "globalThis.count = 1"});
        const operation = runtime.executor(request("() => new Promise(() => {})"));
        const rejected = expect(operation).rejects.toThrow("runtime is disposed");
        runtime.dispose();
        runtime.dispose();
        await rejected;
        expect(runtime.realmCount).toBe(0);
        expect(runtime.pendingExecutions).toBe(0);
        expect(() => runtime.evaluate(main, {source: "1"})).toThrow("runtime is disposed");
        await expect(runtime.executor(request("() => 1"))).rejects.toThrow("runtime is disposed");
    });

    test("disposal from a diagnostic cannot resolve or resurrect pending requests", async () => {
        const {runtime, request} = setup({onScriptError: () => runtime.dispose()});
        const pending = runtime.executor(request("() => new Promise(() => {})"));
        const rejected = expect(pending).rejects.toThrow("runtime is disposed");
        await expect(runtime.executor(request("() => { throw new Error('fail') }"))).rejects.toThrow("runtime is disposed");
        await rejected;
        expect(runtime.realmCount).toBe(0);
        expect(runtime.pendingExecutions).toBe(0);
    });

    test("argument serialization cannot execute a request canceled during a host getter", async () => {
        const {runtime, request} = setup();
        const controller = new AbortController();

        const args = [{get value() {
            controller.abort();

            return 1;
        }}];

        await expect(runtime.executor({...request("() => 1", controller), script: {kind: "function", source: "() => 1", args}})).rejects.toThrow("execution aborted");
        expect(runtime.realmCount).toBe(0);
        const invalid = Object.assign([], {toJSON: () => ({not: "an array"})});
        await expect(runtime.executor({...request("() => 1"), script: {kind: "function", source: "() => 1", args: invalid}})).rejects.toThrow("args must serialize to an array");
        expect(runtime.realmCount).toBe(0);
        runtime.dispose();
    });

    test.each(["throw new Error('bootstrap failed')", "let =", "throw Object.create(null)"])("failed bootstrap invalidates only its realm: %s", async source => {
        const {runtime, request} = setup();
        runtime.evaluate(main, {source: "globalThis.count = 1"});
        runtime.evaluate({documentId: "main", world: "MAIN"}, {source: "globalThis.count = 7"});
        const rejected = expect(runtime.executor(request("() => new Promise(() => {})"))).rejects.toThrow("broken.js");
        expect(() => runtime.evaluate(main, {source, filename: "broken.js"})).toThrow(/document "main" world ISOLATED, broken.js/);
        await rejected;
        expect(runtime.realmCount).toBe(1);

        for (let attempt = 0; attempt < 2; attempt++) {
            await expect(runtime.executor(request("() => typeof count"))).rejects.toThrow(/realm invalidated by.*document "main" world ISOLATED, broken.js.*bootstrap it again/);
            expect(runtime.realmCount).toBe(1);
        }

        expect(await runtime.executor({...request("() => count"), world: "MAIN"})).toBe(7);
        runtime.evaluate(main, {source: "globalThis.count = 10", filename: "recovered.js"});
        expect(await runtime.executor(request("() => count"))).toBe(10);
        expect(runtime.realmCount).toBe(2);
        runtime.dispose();
    });

    test("failed recovery stays invalidated with the latest VM failure; only successful evaluate clears it", async () => {
        const {runtime, request} = setup();
        expect(() => runtime.evaluate(main, {source: "throw new Error('original')", filename: "original.js"})).toThrow("original");
        expect(() => runtime.evaluate(main, {source: "globalThis.partial = true; throw new Error('retry failed')", filename: "retry.js"})).toThrow("retry failed");
        // Invalid arguments never count as a recovery or replace the last VM failure.
        expect(() => runtime.evaluate(main, {source: "1", filename: ""})).toThrow("filename");
        await expect(runtime.executor(request("() => 1"))).rejects.toThrow(/realm invalidated by.*retry.js.*retry failed/);
        expect(runtime.realmCount).toBe(0);
        runtime.evaluate(main, {source: "globalThis.ready = true"});
        expect(await runtime.executor(request("() => [typeof partial, ready]"))).toEqual(["undefined", true]);
        // An empty classic script is an explicit recovery too; the kit does not check application managers.
        expect(() => runtime.evaluate(main, {source: "throw 2"})).toThrow();
        runtime.evaluate(main, {source: ""});
        expect(await runtime.executor(request("() => typeof ready"))).toBe("undefined");
        runtime.dispose();
        await expect(runtime.executor(request("() => 1"))).rejects.toThrow("runtime is disposed");
    });

    test("injection compilation failures invalidate only the selected document and runtime instance", async () => {
        const {runtime, request} = setup();
        runtime.evaluate({documentId: "child"}, {source: "globalThis.ready = 8"});
        await expect(runtime.executor(request("() => {"))).rejects.toThrow("addon-core-injection-1.js");
        await expect(runtime.executor(request("() => 1"))).rejects.toThrow(/realm invalidated by.*addon-core-injection-1.js/);
        const child = {...request("() => ready"), target: {...request("() => 1").target, documentId: "child"}};
        expect(await runtime.executor(child)).toBe(8);
        const separate = createNodeScriptRuntime();
        expect(await separate.executor(request("() => 2"))).toBe(2);
        separate.dispose();
        runtime.dispose();
    });

    test("bootstrap rejects eval and Function code generation and requires explicit recovery", async () => {
        const {runtime, request} = setup();

        for (const source of ["eval('1')", "new Function('return 1')()"]) {
            expect(() => runtime.evaluate(main, {source})).toThrow("Code generation from strings disallowed");
            await expect(runtime.executor(request("() => 1"))).rejects.toThrow("realm invalidated by");
        }

        runtime.evaluate(main, {source: "globalThis.ready = 1"});
        expect(await runtime.executor(request("() => ready"))).toBe(1);
        runtime.dispose();
    });

    test("script failures preserve the realm and reuse the measured codec and coverage diagnostics", async () => {
        const errors: NodeScriptException[] = [];
        const {runtime, request} = setup({onScriptError: error => errors.push(error)});
        runtime.evaluate(main, {source: "globalThis.count = 8"});

        for (const source of ["() => { throw new Error('script failed') }", "async () => { await Promise.resolve(); throw new Error('script failed') }"]) {
            expect(await runtime.executor(request(source))).toBeNull();
        }

        expect(errors.map(error => error.message)).toEqual(["script failed", "script failed"]);
        expect(await runtime.executor(request("() => count"))).toBe(8);
        expect(await runtime.executor(request("() => ({date: new Date(), regexp: /x/})"))).toEqual({date: {}, regexp: {}});
        expect(await runtime.executor(request("() => {}"))).toBeNull();
        await expect(runtime.executor(request("() => new Map()"))).rejects.toThrow("Unsupported executor result type");
        await expect(runtime.executor(request("async () => { await Promise.resolve(); cov_runtime_missing().s[0]++; }"))).rejects.toThrow(/Istanbul coverage instrumentation.*cov_runtime_missing/);
        expect(errors).toHaveLength(2);
        expect(runtime.pendingExecutions).toBe(0);
        runtime.dispose();
    });

    // Infinite guest-microtask loops are checked in an isolated clean-consumer process: VM termination plus
    // active async hooks can corrupt Node's async stack, including hooks installed by Jest on Node 20.
    test("opt-in timeout covers synchronous invocation", async () => {
        const {runtime, request} = setup({timeout: 50});
        const source = "() => { while (true) {} }";
        await expect(runtime.executor(request(source))).rejects.toThrow("timed out");
        expect(runtime.realmCount).toBe(0);
        expect(runtime.pendingExecutions).toBe(0);
        await expect(runtime.executor(request("() => 1"))).rejects.toThrow(/realm invalidated by.*timed out/);
        runtime.evaluate(main, {source: ""});
        expect(await runtime.executor(request("() => 1"))).toBe(1);
        runtime.dispose();
    });

    test.each([0, -1, 0.1, Infinity, 2147483648])("invalid timeout %s is rejected", timeout => {
        expect(() => createNodeScriptRuntime({timeout})).toThrow("timeout must be a positive integer");
    });

    test("rejects unsupported inputs explicitly, without creating a realm", async () => {
        const {runtime, request} = setup();
        expect(() => runtime.evaluate({documentId: ""}, {source: "1"})).toThrow("documentId");
        expect(() => runtime.evaluate(main, {source: "1", filename: ""})).toThrow("filename");
        await expect(runtime.executor({...request("() => 1"), script: {kind: "files", files: ["bundle.js"]}})).rejects.toThrow("files are unsupported");
        expect(runtime.realmCount).toBe(0);
        runtime.dispose();
    });
});
