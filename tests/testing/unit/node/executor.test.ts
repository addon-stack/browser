import {describe, expect, test} from "@jest/globals";
import {executeScript} from "../../../../src/scripting";
import {type BrowserScriptExecution, createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../../../src/testing";
import {createNodeScriptExecutor, type NodeScriptException, type NodeScriptExecutorOptions} from "../../../../src/testing/node";
import {injectedFunction} from "./injected-function";

const setup = (options?: NodeScriptExecutorOptions) => {
    const harness = createBrowserHarness({
        tabs: [createTabFixture({id: 7})],
        documents: [
            {documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"},
            {documentId: "child", tabId: 7, frameId: 3, url: "https://page.test/frame"},
        ],
    });

    harness.scripting.setExecutor(createNodeScriptExecutor(options));

    return harness;
};

const target = {tabId: 7};
const allFrames = {tabId: 7, allFrames: true};

describe("Node script executor", () => {
    test("executes serialized functions and async results through real production wrappers", async () => {
        const harness = setup();
        const restore = installBrowserGlobals(harness);

        try {
            const results = await executeScript<Promise<number>>({target: allFrames, func: async (a: number, b: number) => a + b, args: [2, 3]});
            expect(results).toEqual([{frameId: 0, documentId: "main", result: 5}, {frameId: 3, documentId: "child", result: 5}]);
            expect(harness.scripting.executeScript.calls[0].callbackCalls).toHaveLength(1);
        } finally {
            try {
                harness.reset();
            } finally {
                restore();
            }
        }
    });

    test("no host closure, driver closure, Node globals or DOM appear implicitly", async () => {
        const errors: NodeScriptException[] = [];
        const harness = setup({onScriptError: error => errors.push(error)});
        const privateValue = "test-closure";
        expect(privateValue).toBe("test-closure");
        const result = await harness.chrome.scripting.executeScript({target, func: () => privateValue});
        expect(result[0].result).toBeNull();
        expect(errors[0]).toMatchObject({name: "ReferenceError", message: "privateValue is not defined", target: {documentId: "main"}});
        const fn = "host-driver-name";
        expect(fn).toBeDefined();

        expect((await harness.chrome.scripting.executeScript({
            target,
            func: () => [typeof fn, typeof process, typeof require, typeof document, typeof window, typeof chrome, typeof setTimeout],
        }))[0].result).toEqual(Array(7).fill("undefined"));
    });

    test("globals and arguments belong to each new realm, not host or sibling calls", async () => {
        const globals = {document: {title: "original"}, window: {width: 10}};
        const harness = setup({globals});
        globals.document.title = "changed-after-construction";
        const args: [{value: number}] = [{value: 1}];

        const injection = {
            target: allFrames, args,
            func: (argument: {value: number}) => {
                const state = globalThis as typeof globalThis & {counter?: number};
                state.counter = (state.counter ?? 0) + 1;
                const title = document.title;
                document.title = "guest mutation";
                argument.value++;

                return {title, count: state.counter, argument, realmOwned: Object.getPrototypeOf(argument) === Object.prototype};
            },
        };

        for (let call = 0; call < 2; call++) {
            const values = (await harness.chrome.scripting.executeScript(injection)).map(result => result.result);
            expect(values).toEqual(Array(2).fill({title: "original", count: 1, argument: {value: 2}, realmOwned: true}));
            expect(values[0]).not.toBe(values[1]);
        }

        expect(args[0].value).toBe(1);
        expect(globals.document.title).toBe("changed-after-construction");
    });

    test("globals factory receives the target; both execution worlds use independent fresh realms", async () => {
        const harness = setup({globals: document => ({document: {title: document.documentId}})});

        for (const world of ["MAIN", "ISOLATED"] as const) {
            const results = await harness.browser.scripting.executeScript({target: allFrames, world, func: () => document.title});
            expect(results.map(result => result.result)).toEqual(["main", "child"]);
        }
    });

    test.each([false, true])("script exception is per-target null, not an API error (async=%s)", async asynchronous => {
        const errors: NodeScriptException[] = [];

        const harness = setup({
            globals: document => ({location: {pathname: document.frameId === 0 ? "/page" : "/frame"}}),
            onScriptError: error => errors.push(error),
        });

        const func: () => string | Promise<string> = asynchronous ? async () => {
            if (location.pathname === "/frame") throw new Error("child failed");

            return "main-ok";
        } : () => {
            if (location.pathname === "/frame") throw new Error("child failed");

            return "main-ok";
        };

        for (const callback of [false, true]) {
            const results = callback ? await new Promise<chrome.scripting.InjectionResult<unknown>[]>(resolve => {
                harness.chrome.scripting.executeScript({target: allFrames, func}, values => {
                    expect(harness.runtime.lastError).toBeUndefined();
                    resolve(values);
                });
            }) : await harness.browser.scripting.executeScript({target: allFrames, func});

            expect(results.map(value => value.result)).toEqual(["main-ok", null]);
        }

        expect(errors.map(error => [error.target.documentId, error.message])).toEqual([["child", "child failed"], ["child", "child failed"]]);
    });

    test("missing document is a reported script ReferenceError with a null result", async () => {
        const errors: NodeScriptException[] = [];
        const harness = setup({onScriptError: error => errors.push(error)});
        expect((await harness.chrome.scripting.executeScript({target, func: () => document.title}))[0].result).toBeNull();
        expect(errors[0]).toMatchObject({name: "ReferenceError", message: "document is not defined"});
    });

    test("serializes measured Chrome result cases before the general kit's JSON boundary", async () => {
        const harness = setup({globals: {document: {body: {}}}});

        const functions: (() => unknown)[] = [
            () => document.body,
            () => {
                const value: {self?: unknown} = {}; value.self = value;

                return value;
            },
            () => 1n,
            () => undefined,
            () => ({then: (resolve: (value: number) => void) => resolve(42)}),
        ];

        for (const [index, func] of functions.entries()) {
            expect((await harness.chrome.scripting.executeScript({target, func}))[0].result).toEqual([{}, {self: null}, null, null, 42][index]);
        }

        await expect(harness.chrome.scripting.executeScript({target, func: () => new Map()})).rejects.toThrow("Unsupported executor result type");
    });

    test("void/undefined have explicit null results and Date/RegExp preserve enumerable data only", async () => {
        const harness = setup();

        for (const func of [() => {}, () => undefined]) {
            const [result] = await harness.chrome.scripting.executeScript({target, func});
            expect(result.result).toBeNull();
            expect(Object.hasOwn(result, "result")).toBe(true);
        }

        const results = await harness.chrome.scripting.executeScript({
            target: allFrames,
            func: () => ({
                date: Object.assign(new Date("2020-01-02T03:04:05.000Z"), {note: "date"}),
                regexp: Object.assign(/probe/gi, {note: "regexp"}),
                invalidDate: new Date(NaN),
            }),
        });

        expect(results.map(result => result.result)).toEqual(Array(2).fill({date: {note: "date"}, regexp: {note: "regexp"}, invalidDate: {}}));
        expect(results[0].result).not.toBe(results[1].result);
    });

    test.each([false, true])("missing Istanbul helper rejects as infrastructure (async=%s)", async asynchronous => {
        const diagnostics: NodeScriptException[] = [];
        const harness = setup({onScriptError: error => diagnostics.push(error)});
        const cov_node_fixture = () => ({s: [0]});
        expect(cov_node_fixture().s[0]).toBe(0);

        const func: () => number | Promise<number> = asynchronous ? async () => {
            await Promise.resolve();
            cov_node_fixture().s[0]++;

            return 1;
        } : () => {
            cov_node_fixture().s[0]++;

            return 1;
        };

        await expect(harness.browser.scripting.executeScript({target: allFrames, func})).rejects.toThrow(/scripting.executeScript: executor failed for document "main".*Istanbul coverage instrumentation.*cov_node_fixture/);

        const lastError = await new Promise<string | undefined>(resolve => {
            harness.chrome.scripting.executeScript({target, func}, () => resolve(harness.runtime.lastError?.message));
        });

        expect(lastError).toMatch(/Istanbul coverage instrumentation.*uninstrumented source/);
        expect(harness.runtime.lastError).toBeUndefined();
        expect(harness.scripting.pendingExecutions).toBe(0);
        expect(diagnostics).toEqual([]);

        // Neither metadata-only adapters nor explicit results should inherit a Node-specific coverage restriction.
        harness.scripting.setExecutor(() => 12);
        expect((await harness.chrome.scripting.executeScript({target, func}))[0].result).toBe(12);
        harness.scripting.setExecutor(createNodeScriptExecutor());
        harness.scripting.executeScript.setResult([{frameId: 0, documentId: "ready", result: 13}]);
        expect((await harness.chrome.scripting.executeScript({target, func}))[0].result).toBe(13);
    });

    test("a real Jest-instrumented application function gets actionable diagnostics under coverage", async () => {
        const harness = setup();
        const operation = harness.chrome.scripting.executeScript({target, func: injectedFunction, args: [2]});

        if (/\bcov_[\w$]+\(\)/.test(injectedFunction.toString())) {
            await expect(operation).rejects.toThrow("Istanbul coverage instrumentation");
        } else {
            expect((await operation)[0].result).toBe(3);
        }
    });

    test("coverage-like literals, comments and locally bound helpers are not rejected", async () => {
        const harness = setup();

        const [result] = await harness.chrome.scripting.executeScript({target, func: () => {
            // cov_comment().s[0]++ is documentation, not injected instrumentation.
            const cov_local = () => 5;

            return {text: "cov_example().s[0]++", regex: /cov_regex\(\)/.source, local: cov_local()};
        }});

        expect(result.result).toEqual({text: "cov_example().s[0]++", regex: "cov_regex\\(\\)", local: 5});

        expect((await harness.chrome.scripting.executeScript({target, func: () => {
            throw new Error("cov_example is not defined");
        }}))[0].result).toBeNull();
    });

    test.each([0, -1, 1.5, Infinity, 2147483648])("invalid opt-in timeout %s", timeout => {
        expect(() => createNodeScriptExecutor({timeout})).toThrow("timeout must be a positive integer");
    });

    test("opt-in VM timeout covers the invocation itself and remains an infrastructure error", async () => {
        const harness = setup({timeout: 50});

        await expect(harness.chrome.scripting.executeScript({target, func: () => {
            while (true) {/* intentional */}
        }})).rejects.toThrow("timed out");

        expect(harness.scripting.pendingExecutions).toBe(0);
        expect((await harness.chrome.scripting.executeScript({target, func: () => 1}))[0].result).toBe(1);
    });

    test.each(["document", "reset", "cancel"])("never-settling script releases the request on %s", async kind => {
        const harness = setup();
        const operation = harness.chrome.scripting.executeScript({target, func: () => new Promise(() => undefined)});
        const rejected = expect(operation).rejects.toThrow("scripting.executeScript");

        if (kind === "document") harness.contexts.documents.remove("main");
        else if (kind === "reset") harness.reset();
        else harness.scripting.cancelExecutions();

        await rejected;
        expect(harness.scripting.pendingExecutions).toBe(0);
    });

    test("files, bad globals and observer failures are API failures, never null script results", async () => {
        const harness = setup();
        await expect(harness.chrome.scripting.executeScript({target, files: ["unread.js"]})).rejects.toThrow("files are unsupported");
        expect(() => createNodeScriptExecutor({globals: {fn: () => 1}})).toThrow("only JSON data");

        expect(() => createNodeScriptExecutor({globals: {get value() {
            throw new Error("must not invoke getter");
        }}})).toThrow("accessors");

        const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
        expect(() => createNodeScriptExecutor({globals: cyclic})).toThrow("cycles");
        expect(() => createNodeScriptExecutor({globals: {date: new Date()}})).toThrow("class instances");
        const invalid = setup({globals: {JSON: {}}});
        await expect(invalid.chrome.scripting.executeScript({target, func: () => 1})).rejects.toThrow("Cannot replace intrinsic global");

        const observer = setup({onScriptError: () => {
            throw new Error("observer failed");
        }});

        await expect(observer.chrome.scripting.executeScript({target, func: () => {
            throw 1;
        }})).rejects.toThrow("observer failed");
    });

    test("abort during globals configuration cannot execute the guest; explicit results still bypass execution", async () => {
        const controller = new AbortController();

        const executor = createNodeScriptExecutor({globals: () => {
            controller.abort();

            return {};
        }});

        const request: BrowserScriptExecution = {
            target: setup().scripting.selectTargets(target)[0], script: {kind: "function", source: "() => 1", args: []},
            world: "ISOLATED", injectImmediately: false, signal: controller.signal,
        };

        await expect(executor(request)).rejects.toThrow("execution aborted");
        const harness = setup();
        harness.scripting.executeScript.setResult([{frameId: 0, documentId: "ready", result: 8}]);
        expect((await harness.chrome.scripting.executeScript({target: {tabId: 999}, func: () => 1}))[0].result).toBe(8);
    });

    test("the executor observes pending AbortSignal directly, independently of the harness", async () => {
        const controller = new AbortController();
        const executor = createNodeScriptExecutor();

        const request: BrowserScriptExecution = {
            target: setup().scripting.selectTargets(target)[0],
            script: {kind: "function", source: "() => new Promise(() => {})", args: []},
            world: "ISOLATED", injectImmediately: false, signal: controller.signal,
        };

        const operation = executor(request);
        const rejected = expect(operation).rejects.toThrow("execution aborted");
        controller.abort("test cancellation");
        await rejected;
        await expect(executor(request)).rejects.toThrow("execution aborted");
    });

    test("compilation errors reject; guest dynamic code generation is disabled", async () => {
        const errors: NodeScriptException[] = [];
        const executor = createNodeScriptExecutor({onScriptError: error => errors.push(error)});

        const request: BrowserScriptExecution = {
            target: setup().scripting.selectTargets(target)[0],
            script: {kind: "function", source: "() => {", args: []},
            world: "ISOLATED", injectImmediately: false, signal: new AbortController().signal,
        };

        expect(() => executor(request)).toThrow();
        expect(errors).toEqual([]);
        const harness = setup({onScriptError: error => errors.push(error)});
        expect((await harness.chrome.scripting.executeScript({target, func: () => (0, eval)("1 + 1")}))[0].result).toBeNull();
        expect(errors[0].name).toBe("EvalError");
    });
});
