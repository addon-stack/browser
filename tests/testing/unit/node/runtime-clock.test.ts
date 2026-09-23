import {describe, expect, test} from "@jest/globals";
import {type BrowserScriptExecution, createBrowserHarness, createTabFixture} from "../../../../src/testing";
import {createNodeScriptRuntime, type NodeScriptRuntimeOptions} from "../../../../src/testing/node";

const setup = (options: NodeScriptRuntimeOptions = {}) => {
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})], documents: [
        {documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"},
        {documentId: "child", tabId: 7, frameId: 1, url: "https://page.test/child"},
    ]});

    const runtime = createNodeScriptRuntime({clock: true, documents: harness.contexts.documents, ...options});
    const clock = runtime.clock!;
    const evaluate = (source: string, documentId = "main", world: "MAIN" | "ISOLATED" = "ISOLATED") => runtime.evaluate({documentId, world}, {source});

    const request = (source: string, documentId = "main", world: "MAIN" | "ISOLATED" = "ISOLATED", signal = new AbortController().signal): BrowserScriptExecution => ({
        target: {...harness.contexts.documents.get(documentId)!, contextIds: []}, world,
        script: {kind: "function", source, args: []}, injectImmediately: false, signal,
    });

    const execute = (source: string, documentId = "main", world: "MAIN" | "ISOLATED" = "ISOLATED") => runtime.executor(request(source, documentId, world));

    return {harness, runtime, clock, evaluate, execute, request};
};

describe("guest virtual clock", () => {
    test("opt-in, does not patch host globals, and leaves queueMicrotask unavailable", async () => {
        const host = [Date, performance, setTimeout, clearTimeout, setInterval, clearInterval];
        const {runtime, execute} = setup({clock: undefined});
        expect(runtime.clock).toBeUndefined();
        expect(await execute("() => [typeof setTimeout, typeof performance, typeof queueMicrotask, typeof Date]")).toEqual(["undefined", "undefined", "undefined", "function"]);
        runtime.dispose();
        const enabled = setup();
        expect(await enabled.execute("() => typeof queueMicrotask")).toBe("undefined");
        expect([Date, performance, setTimeout, clearTimeout, setInterval, clearInterval]).toEqual(host);
        enabled.runtime.dispose();
    });

    test("advance is synchronous and preserves the measured Chrome timer/microtask order", async () => {
        const {runtime, clock, evaluate, execute} = setup();

        evaluate(`globalThis.order = [];
            setTimeout(() => { order.push('a'); Promise.resolve().then(() => order.push('after-a')); }, 0);
            setTimeout(() => order.push('b'), 0);
            Promise.resolve().then(() => order.push('c'));`);

        expect(await execute("() => order")).toEqual(["c"]);
        expect(clock.advance(0)).toBeUndefined();
        expect(await execute("() => order")).toEqual(["c", "a", "after-a", "b"]);
        runtime.dispose();
    });

    test("registration order spans realms, including microtasks and rearms", async () => {
        const completed: string[] = [];

        const {runtime, clock, evaluate, execute} = setup({onScriptError: error => {
            completed.push(error.message);
        }});

        // Allocate main first but register child's timer first: Map insertion order must not win.
        evaluate("");
        evaluate("/* child realm */", "child");
        const first = execute("() => new Promise((_, reject) => setTimeout(() => reject(new Error('child')), 10))", "child");
        const second = execute("() => new Promise((_, reject) => Promise.resolve().then(() => setTimeout(() => reject(new Error('main')), 10)))");
        clock.advance(10);
        expect(completed).toEqual(["child", "main"]);
        expect(await Promise.all([first, second])).toEqual([null, null]);
        runtime.dispose();
    });

    test("clock/date/performance are coherent, including newly allocated worlds", async () => {
        const {runtime, clock, execute} = setup({clock: {epoch: 1000}});
        expect(clock.now).toBe(1000);
        const read = "() => [Date.now(), +new Date(), performance.now(), performance.timeOrigin, +new Date(42), Date() === new Date().toString(), Date.parse('1970-01-01T00:00:00Z'), Date.UTC(1970,0,1)]";
        expect(await execute(read)).toEqual([1000, 1000, 0, 1000, 42, true, 0, 0]);
        clock.advance(125);
        expect(await execute(read)).toEqual([1125, 1125, 125, 1000, 42, true, 0, 0]);
        expect(await execute(read, "main", "MAIN")).toEqual([1125, 1125, 0, 1125, 42, true, 0, 0]);
        expect(clock.now).toBe(1125);
        runtime.dispose();
    });

    test("nested async retries run at 0..2700 ms without host await hops", async () => {
        const {runtime, clock, execute, evaluate} = setup();
        evaluate("globalThis.attempts = 0");

        const pending = execute(`async () => {
            for (let n = 0; n < 10; n++) {
                attempts++;
                if (n === 9) return {ok: false, attempts, time: Date.now()};
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }`);

        clock.advance(2699);
        expect(runtime.pendingExecutions).toBe(1);
        expect(await execute("() => attempts")).toBe(9);
        clock.advance(1);
        expect(runtime.pendingExecutions).toBe(0);
        expect(await pending).toEqual({ok: false, attempts: 10, time: 2700});
        runtime.dispose();
    });

    test("late registration succeeds and unrelated concurrent responses never mix", async () => {
        const {runtime, clock, execute, evaluate} = setup();

        const pending = execute(`async () => {
            for (let n = 0; n < 10; n++) {
                if (globalThis.manager) return manager.value;
                if (n === 9) throw new Error('not found');
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }`);

        const other = execute("() => new Promise(resolve => setTimeout(() => resolve('other'), 50))", "child");
        clock.advance(50);
        expect(await other).toBe("other");
        expect(runtime.pendingExecutions).toBe(1);
        clock.advance(250);
        evaluate("globalThis.manager = {value: 'late'}");
        clock.advance(300);
        expect(await pending).toBe("late");
        runtime.dispose();
    });

    test("intervals, argument passing, this and cross-clear share a realm-local ID pool", async () => {
        const {runtime, clock, evaluate, execute} = setup();

        evaluate(`globalThis.values = [];
            const cancelled = setTimeout(() => values.push('bad'), 1); clearInterval(cancelled);
            const interval = setInterval(function (value) {
                values.push([value, Date.now(), this === globalThis]);
                if (values.length === 3) clearTimeout(interval);
            }, 10, 'tick');`);

        clock.runAll({maxTimers: 3});
        expect(clock.now).toBe(30);
        expect(await execute("() => values")).toEqual([["tick", 10, true], ["tick", 20, true], ["tick", 30, true]]);
        runtime.dispose();
    });

    test("nested timers are registered at firing time; a microtask can cancel the next timer", async () => {
        const {runtime, clock, evaluate, execute} = setup();

        evaluate(`globalThis.values = [];
            setTimeout(() => {
                values.push(Date.now());
                setTimeout(() => values.push(Date.now()), 5);
                Promise.resolve().then(() => clearTimeout(second));
            }, 10);
            const second = setTimeout(() => values.push('bad'), 10);`);

        clock.advance(100);
        expect(await execute("() => values")).toEqual([10, 15]);
        expect(clock.now).toBe(100);
        runtime.dispose();
    });

    test("budget error identifies interval and realm; remaining timers can be cancelled", async () => {
        const {runtime, clock, evaluate, execute} = setup();
        evaluate("globalThis.ticks = 0; globalThis.timer = setInterval(() => ticks++, 10)");
        expect(() => clock.runAll({maxTimers: 3})).toThrow('after 3 timers; last interval 10 ms in document "main" world ISOLATED');
        expect(clock.now).toBe(30);
        expect(await execute("() => ticks")).toBe(3);
        evaluate("clearInterval(timer)");
        expect(clock.runAll()).toBeUndefined();
        runtime.dispose();
    });

    test("advance has a deterministic default budget against zero-delay recursion", () => {
        const {runtime, clock, evaluate} = setup();
        evaluate("function again() { setTimeout(again, 0); } again()");
        expect(() => clock.advance(0)).toThrow('after 10000 timers; last timeout 0 ms in document "main"');
        expect(clock.now).toBe(0);
        runtime.dispose();
    });

    test.each(["remove", "reset", "dispose"])("%s drops timers, rejects pending requests and cannot leak into a reused ID", async action => {
        const {harness, runtime, clock, execute} = setup();
        const rejected = expect(execute("() => new Promise(resolve => setTimeout(resolve, 300))")).rejects.toThrow();

        if (action === "remove") harness.contexts.documents.remove("main");
        else if (action === "reset") harness.reset();
        else runtime.dispose();

        await rejected;
        expect(runtime.realmCount).toBe(0);

        if (action === "dispose") {
            expect(() => clock.advance(1000)).toThrow("disposed");
        } else {
            clock.runAll();
            expect(clock.now).toBe(0);

            if (action === "remove") harness.contexts.documents.create({documentId: "main", tabId: 7, url: "https://new.test/"});

            const pending = execute("() => new Promise(resolve => setTimeout(() => resolve('new'), 1))");
            clock.advance(1);
            expect(await pending).toBe("new");
        }

        runtime.dispose();
    });

    test("script rejection diagnostics can remove a realm and bootstrap its replacement during advance", async () => {
        const {runtime, clock, harness, evaluate, execute} = setup({onScriptError: () => {
            harness.contexts.documents.remove("main");
            harness.contexts.documents.create({documentId: "main", tabId: 7, url: "https://new.test/"});
            evaluate("globalThis.fired = false; setTimeout(() => fired = true, 5)");
        }});

        const pending = execute("() => new Promise((_, reject) => setTimeout(() => reject(new Error('diagnostic')), 5))");
        const rejection = expect(pending).rejects.toThrow("was removed");
        evaluate("setTimeout(() => { throw new Error('old timer must not fire'); }, 5)");
        clock.advance(10);
        await rejection;
        expect(await execute("() => fired")).toBe(true);
        expect(runtime.realmCount).toBe(1);
        runtime.dispose();
    });

    test("disposing during drain stops advance and nested advancement fails explicitly", async () => {
        const {runtime, clock, execute} = setup({onScriptError: () => {
            expect(() => clock.advance(1)).toThrow("already in progress");
            runtime.dispose();
        }});

        const rejection = expect(execute("() => new Promise((_, reject) => setTimeout(() => reject('stop'), 1))")).rejects.toThrow("disposed");
        expect(() => clock.advance(5)).toThrow("disposed");
        await rejection;
    });

    test.each(["() => { throw new Error('timer failure'); }", "async () => { await 0; throw new Error('timer failure'); }"])("uncaught timer callback failures invalidate the realm: %s", async callback => {
        const {runtime, clock, execute, evaluate} = setup();
        const rejected = expect(execute("() => new Promise(() => {})")).rejects.toThrow("timer failure");
        evaluate(`setTimeout(${callback}, 1)`);
        expect(() => clock.advance(1)).toThrow("timer failure");
        await rejected;
        expect(runtime.realmCount).toBe(0);
        await expect(execute("() => 1")).rejects.toThrow("realm invalidated");
        evaluate("globalThis.ok = true");
        clock.runAll();
        expect(await execute("() => ok")).toBe(true);
        runtime.dispose();
    });

    test("abort cancels the response, not the realm's unrelated timers", async () => {
        const {runtime, clock, evaluate, execute, request} = setup();
        const controller = new AbortController();
        evaluate("globalThis.count = 0");
        const rejected = expect(runtime.executor(request("() => new Promise(resolve => setTimeout(() => { count++; resolve(1); }, 10))", "main", "ISOLATED", controller.signal))).rejects.toThrow("aborted");
        controller.abort();
        await rejected;
        clock.advance(10);
        expect(await execute("() => count")).toBe(1);
        expect(runtime.pendingExecutions).toBe(0);
        runtime.dispose();
    });

    test.each([false, null, [], {epoch: NaN}, {epoch: 1.5}, {epoch: null}, {epoch: 8640000000000001}, {unexpected: 1}])("rejects invalid clock options: %j", clock => {
        expect(() => createNodeScriptRuntime({clock} as NodeScriptRuntimeOptions)).toThrow("clock");
    });

    test("invalid advances and budgets leave time unchanged", () => {
        const {runtime, clock} = setup();

        for (const value of [-1, 0.5, NaN, Infinity, 8640000000000001]) expect(() => clock.advance(value)).toThrow("advance");

        for (const value of [0, -1, 0.5, NaN, Infinity]) expect(() => clock.runAll({maxTimers: value})).toThrow("maxTimers");

        expect(clock.now).toBe(0);
        runtime.dispose();
    });

    test("world-local IDs and independent runtime clocks cannot cancel or advance each other", async () => {
        const a = setup();
        const b = setup();
        a.evaluate("globalThis.fired = 0; setTimeout(() => fired++, 10)");
        a.evaluate("globalThis.fired = 0; setTimeout(() => fired++, 10); clearTimeout(1)", "main", "MAIN");
        b.evaluate("globalThis.fired = 0; setTimeout(() => fired++, 10)");
        a.clock.advance(10);
        expect(await a.execute("() => fired")).toBe(1);
        expect(await a.execute("() => fired", "main", "MAIN")).toBe(0);
        expect(b.clock.now).toBe(0);
        expect(await b.execute("() => fired")).toBe(0);
        b.clock.advance(10);
        expect(await b.execute("() => fired")).toBe(1);
        a.runtime.dispose(); b.runtime.dispose();
    });

    test("a reset during a diagnostic removes every old queue but does not rewind time", async () => {
        const {harness, runtime, clock, execute, evaluate} = setup({onScriptError: () => harness.reset()});
        const rejected = expect(execute("() => new Promise((_, reject) => setTimeout(() => reject('reset'), 5))")).rejects.toThrow();
        evaluate("setTimeout(() => { throw new Error('stale'); }, 6)", "child");
        clock.advance(100);
        await rejected;
        expect(runtime.realmCount).toBe(0);
        expect(clock.now).toBe(100);
        expect(await execute("() => [Date.now(), performance.now()]")).toEqual([100, 0]);
        runtime.dispose();
    });

    test("scripting reset cancels responses while keeping the document's guest timers", async () => {
        const {harness, runtime, clock, evaluate, execute} = setup();
        harness.scripting.setExecutor(runtime.executor);
        evaluate("globalThis.ready = false; setTimeout(() => ready = true, 10)");
        const rejected = expect(harness.chrome.scripting.executeScript({target: {tabId: 7}, func: () => new Promise(resolve => setTimeout(resolve, 10))})).rejects.toThrow("reset");
        harness.scripting.reset();
        await rejected;
        clock.advance(10);
        expect(await execute("() => ready")).toBe(true);
        runtime.dispose();
    });

    test.each([null, false, [], {extra: 1}, {maxTimers: null}])("invalid runAll options fail explicitly: %j", value => {
        const {runtime, clock} = setup();
        expect(() => clock.runAll(value as never)).toThrow("clock");
        runtime.dispose();
    });

    test("guest delay policy is explicit and does not evaluate strings", async () => {
        const {runtime, execute, clock} = setup();

        expect(await execute(`() => ['code', Infinity, NaN, '10', 2147483648].map(value => {
            try { if (value === 'code') setTimeout('globalThis.bad = true', 0); else setTimeout(() => {}, value); return false; }
            catch (error) { return error instanceof TypeError; }
        })`)).toEqual([true, true, true, true, true]);

        const negative = execute("() => new Promise(resolve => setTimeout(() => resolve(Date.now()), -5))");
        clock.advance(0);
        expect(await negative).toBe(0);
        const fractional = execute("() => new Promise(resolve => setTimeout(() => resolve(Date.now()), 1.9))");
        clock.advance(1);
        expect(await fractional).toBe(1);
        runtime.dispose();
    });
});
