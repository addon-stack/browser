import {createBrowserMethod} from "./method";

type SyncApi = (value: string) => number;
type CallbackApi = (value: string, callback: (result: number) => void) => void;
type PromiseApi = (value: string) => Promise<number>;
type DualApi = {
    (value: string): Promise<number>;
    (value: string, callback: (result: number) => void): void;
};
type PromiseTolerantApi = (value: string, callback?: (result: number) => void) => Promise<number>;
type HybridApi = (value: string, callback: (result: number) => void) => Promise<number> | undefined;

describe("createBrowserMethod", () => {
    test("records sync calls and returns a persistent result", () => {
        const method = createBrowserMethod<SyncApi, number>({name: "runtime.sync", invocation: "sync"});

        method.setResult(3);

        expect(method.api("input")).toBe(3);
        expect(method.calls).toEqual([
            {
                sequence: 1,
                args: ["input"],
                callback: undefined,
                invocation: "sync",
                callbackCalls: [],
            },
        ]);
        expect(Object.isFrozen(method.calls)).toBe(true);
        expect(Object.isFrozen(method.calls[0].args)).toBe(true);
    });

    test("names an unconfigured method in sync and Promise errors", async () => {
        const syncMethod = createBrowserMethod<SyncApi, number>({name: "runtime.sync", invocation: "sync"});
        const promiseMethod = createBrowserMethod<PromiseApi, number>({name: "tabs.query", invocation: "promise"});

        expect(() => syncMethod.api("input")).toThrow(
            'Browser method "runtime.sync" was called without a configured result or implementation.'
        );
        await expect(promiseMethod.api("input")).rejects.toThrow(
            'Browser method "tabs.query" was called without a configured result or implementation.'
        );
    });

    test("uses failNext before queued and persistent results", async () => {
        const method = createBrowserMethod<PromiseApi, number>({name: "tabs.get", invocation: "promise"});
        const failure = new Error("temporary failure");

        method.setResult(4);
        method.queueResult(2, 3);
        method.failNext(failure);

        await expect(method.api("first")).rejects.toBe(failure);
        await expect(method.api("second")).resolves.toBe(2);
        await expect(method.api("third")).resolves.toBe(3);
        await expect(method.api("fourth")).resolves.toBe(4);
    });

    test("turns synchronous implementation errors into Promise rejections", async () => {
        const failure = new Error("implementation failed");
        const method = createBrowserMethod<PromiseApi, number>({
            name: "tabs.get",
            invocation: "promise",
            implementation: (() => {
                throw failure;
            }) as PromiseApi,
        });

        await expect(method.api("input")).rejects.toBe(failure);
    });

    test("invokes callback methods and tracks callback calls", () => {
        const method = createBrowserMethod<CallbackApi, number>({
            name: "tabs.callback",
            invocation: "callback",
        });
        const callback = jest.fn();

        method.setResult(5);

        expect(method.api("input", callback)).toBeUndefined();
        expect(callback).toHaveBeenCalledWith(5);
        expect(method.calls[0]).toMatchObject({
            args: ["input"],
            callback,
            invocation: "callback",
            callbackCalls: [[5]],
        });
    });

    test("supports callback argument mapping for void and multiple result callbacks", () => {
        type MultiCallbackApi = (callback: (left: string, right: number) => void) => void;
        const method = createBrowserMethod<MultiCallbackApi, readonly [string, number]>({
            name: "runtime.multi",
            invocation: "callback",
            callbackArgs: value => value,
        });
        const callback = jest.fn();

        method.setResult(["value", 7]);
        method.api(callback);

        expect(callback).toHaveBeenCalledWith("value", 7);
    });

    test("selects callback or Promise behavior for dual methods at call time", async () => {
        const method = createBrowserMethod<DualApi, number>({name: "tabs.dual", invocation: "dual"});
        const callback = jest.fn();

        method.setResult(8);

        expect(method.api("callback", callback)).toBeUndefined();
        await expect(method.api("promise")).resolves.toBe(8);
        expect(callback).toHaveBeenCalledWith(8);
        expect(method.calls.map(call => call.invocation)).toEqual(["callback", "promise"]);
    });

    test("promise-tolerant methods ignore a trailing callback and always return a Promise", async () => {
        const method = createBrowserMethod<PromiseTolerantApi, number>({
            name: "runtime.promiseTolerant",
            invocation: "promise-tolerant",
        });
        const callback = jest.fn();

        method.setResult(9);

        await expect(method.api("input", callback)).resolves.toBe(9);
        expect(callback).not.toHaveBeenCalled();
        expect(method.calls[0]).toMatchObject({callback, invocation: "promise-tolerant", callbackCalls: []});
    });

    test("promise-only methods reject callback invocations without consuming configured results", async () => {
        const method = createBrowserMethod<PromiseApi, number>({name: "tabs.promise", invocation: "promise"});
        const unsafeApi = method.api as unknown as (...args: unknown[]) => Promise<number>;

        method.queueResult(10);

        await expect(unsafeApi("invalid", jest.fn())).rejects.toThrow(
            'Browser method "tabs.promise" is promise-only and does not accept a callback argument.'
        );
        await expect(method.api("valid")).resolves.toBe(10);
    });

    test("callback-only methods reject missing callbacks without consuming configured results", () => {
        const method = createBrowserMethod<CallbackApi, number>({name: "tabs.callback", invocation: "callback"});
        const unsafeApi = method.api as unknown as (...args: unknown[]) => void;
        const callback = jest.fn();

        method.queueResult(11);

        expect(() => unsafeApi("invalid")).toThrow(
            'Browser method "tabs.callback" requires a callback as its final argument.'
        );
        method.api("valid", callback);
        expect(callback).toHaveBeenCalledWith(11);
    });

    test("lets hybrid implementations call a callback and return a thenable", async () => {
        const method = createBrowserMethod<HybridApi, number>({name: "identity.getAuthToken", invocation: "hybrid"});
        const callback = jest.fn();
        const returned = Promise.resolve(13);

        method.setImplementation((_value, implementationCallback) => {
            implementationCallback(12);
            return returned;
        });

        expect(method.api("input", callback)).toBe(returned);
        await expect(returned).resolves.toBe(13);
        expect(callback).toHaveBeenCalledWith(12);
        expect(method.calls[0].callbackCalls).toEqual([[12]]);
    });

    test("exposes lastError only while a failed callback runs", () => {
        let lastError: unknown;
        const controller = {
            runWithLastError<T>(error: unknown, callback: () => T): T {
                lastError = error;
                try {
                    return callback();
                } finally {
                    lastError = undefined;
                }
            },
        };
        const method = createBrowserMethod<CallbackApi, number>({
            name: "tabs.get",
            invocation: "callback",
            lastError: controller,
        });
        const failure = new Error("missing tab");
        const observed: unknown[] = [];

        method.failNext(failure);
        method.api("input", () => observed.push(lastError));

        expect(observed).toEqual([failure]);
        expect(lastError).toBeUndefined();
    });

    test("does not silently lose callback failures without a lastError controller", () => {
        const method = createBrowserMethod<CallbackApi, number>({name: "tabs.get", invocation: "callback"});

        method.failNext(new Error("missing tab"));

        expect(() => method.api("input", jest.fn())).toThrow(
            'Browser method "tabs.get" cannot expose a callback error without a lastError controller.'
        );
    });

    test("keeps a default implementation across reset while clearing user configuration", () => {
        const defaultImplementation: SyncApi = value => value.length;
        const method = createBrowserMethod<SyncApi, number>({
            name: "runtime.default",
            invocation: "sync",
            implementation: defaultImplementation,
        });

        expect(method.hasDefaultImplementation).toBe(true);
        expect(method.api("abc")).toBe(3);

        method.setResult(20);
        expect(method.api("x")).toBe(20);

        method.reset();

        expect(method.calls).toEqual([]);
        expect(method.api("abcd")).toBe(4);
        expect(method.calls[0].sequence).toBe(1);
    });

    test("reports whether the current reset baseline has a default implementation", () => {
        const method = createBrowserMethod<SyncApi, number>({name: "runtime.default", invocation: "sync"});

        expect(method.hasDefaultImplementation).toBe(false);
        method.setImplementation(value => value.length);
        expect(method.hasDefaultImplementation).toBe(false);
        method.setDefaultImplementation(value => value.length + 1);
        expect(method.hasDefaultImplementation).toBe(true);
        method.setDefaultImplementation(undefined);
        expect(method.hasDefaultImplementation).toBe(false);
    });

    test("supports a shared sequence source", () => {
        let sequence = 40;
        const method = createBrowserMethod<SyncApi, number>({
            name: "runtime.sharedSequence",
            invocation: "sync",
            nextSequence: () => ++sequence,
        });

        method.setResult(1);
        method.api("input");

        expect(method.calls[0].sequence).toBe(41);
    });
});
