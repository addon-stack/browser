import {afterEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserTestApi, createBrowserEvent, installGlobals} from "../testing";
import {createListenerErrorCapture} from "../testing/environment/listener-errors";
import {callBrowserMethod, callWithPromise, checkLastError, handleListener, safeListener} from "./utils";

const runtimeApi = (lastError?: chrome.runtime.LastError): BrowserTestApi =>
    ({runtime: {lastError}}) as unknown as BrowserTestApi;

const createBrowserMethodApi = (
    runtime: {id?: string; lastError?: chrome.runtime.LastError} = {id: "test-extension"}
): BrowserTestApi => ({runtime}) as BrowserTestApi;

describe("utils", () => {
    let restoreGlobals: () => void = () => undefined;

    afterEach(() => {
        restoreGlobals();
        restoreGlobals = () => undefined;
        jest.restoreAllMocks();
    });

    const setGlobals = (values: Parameters<typeof installGlobals>[0]): void => {
        restoreGlobals();
        restoreGlobals = installGlobals(values);
    };

    describe("checkLastError", () => {
        test("should not throw if lastError is undefined", () => {
            setGlobals({browser: undefined, chrome: runtimeApi()});

            expect(() => checkLastError()).not.toThrow();
        });

        test("should throw Error if lastError exists", () => {
            const errorMessage = "Some error";
            setGlobals({browser: undefined, chrome: runtimeApi({message: errorMessage})});

            expect(() => checkLastError()).toThrow(errorMessage);
        });

        test("should throw Error if WebExtension API is not available", () => {
            setGlobals({browser: undefined, chrome: undefined});

            expect(() => checkLastError()).toThrow("WebExtension API not available in this context");
        });
    });

    describe("callWithPromise", () => {
        test("should resolve with result when successful", async () => {
            setGlobals({browser: undefined, chrome: runtimeApi()});
            const expectedResult = {foo: "bar"};
            const executor = (callback: (result: typeof expectedResult) => void): void => callback(expectedResult);

            await expect(callWithPromise(executor)).resolves.toBe(expectedResult);
        });

        test("should resolve with undefined when result is undefined", async () => {
            setGlobals({browser: undefined, chrome: runtimeApi()});
            const executor = (callback: (result: undefined) => void): void => callback(undefined);

            await expect(callWithPromise(executor)).resolves.toBeUndefined();
        });

        test("should reject when lastError exists", async () => {
            const errorMessage = "Async error";
            setGlobals({browser: undefined, chrome: runtimeApi({message: errorMessage})});
            const executor = (callback: (result: null) => void): void => callback(null);

            await expect(callWithPromise(executor)).rejects.toThrow(errorMessage);
        });

        test("should reject when lastError exists even if result is provided", async () => {
            const errorMessage = "Async error";
            setGlobals({browser: undefined, chrome: runtimeApi({message: errorMessage})});
            const executor = (callback: (result: {data: string}) => void): void => callback({data: "some data"});

            await expect(callWithPromise(executor)).rejects.toThrow(errorMessage);
        });

        test("should resolve with result from returned Promise", async () => {
            const expectedResult = {foo: "bar"};
            const executor = (): Promise<typeof expectedResult> => Promise.resolve(expectedResult);

            await expect(callWithPromise(executor)).resolves.toBe(expectedResult);
        });

        test("should reject when returned Promise rejects", async () => {
            const error = new Error("Promise fail");
            const executor = (): Promise<never> => Promise.reject(error);

            await expect(callWithPromise(executor)).rejects.toBe(error);
        });
    });

    describe("safeListener", () => {
        test("should execute listener and return result", () => {
            const listener = jest.fn<(argument: string) => string>(() => "success");
            const wrapped = safeListener(listener);

            expect(wrapped("arg1")).toBe("success");
            expect(listener).toHaveBeenCalledWith("arg1");
        });

        test("should suppress and capture a synchronous listener error", async () => {
            const capture = createListenerErrorCapture();
            setGlobals({consoleError: capture.handler});
            const error = new Error("Sync fail");
            const event = createBrowserEvent<[]>();

            event.api.addListener(
                safeListener(() => {
                    throw error;
                })
            );

            await expect(event.emit()).resolves.toBeUndefined();
            expect(capture.entries).toEqual([{args: [], error, kind: "sync"}]);
        });

        test("should log a native Promise rejection while preserving the rejection", async () => {
            const capture = createListenerErrorCapture();
            setGlobals({consoleError: capture.handler});
            const error = new Error("Async fail");
            const event = createBrowserEvent<[]>();
            event.api.addListener(safeListener(() => Promise.reject(error)));

            await expect(event.emit()).rejects.toBe(error);
            expect(capture.entries).toEqual([{args: [], error, kind: "promise"}]);
        });

        test("should not log a custom thenable rejection, while the event still observes it", async () => {
            const capture = createListenerErrorCapture();
            setGlobals({consoleError: capture.handler});
            const error = new Error("Thenable fail");

            const thenable = {
                // This test intentionally models a non-Promise thenable.
                then(_resolve: (value: never) => void, reject: (reason: unknown) => void): void {
                    reject(error);
                },
            };

            const event = createBrowserEvent<[]>();
            event.api.addListener(safeListener(() => thenable));

            await expect(event.emit()).rejects.toBe(error);
            expect(capture.entries).toEqual([]);
        });

        test("should preserve and forward unknown console errors", () => {
            const forward = jest.fn<(...args: unknown[]) => void>();
            const capture = createListenerErrorCapture(forward);
            const error = new Error("Unrecognized");

            capture.handler("Unexpected prefix", error, {source: "test"});

            expect(capture.raw).toEqual([["Unexpected prefix", error, {source: "test"}]]);
            expect(forward).toHaveBeenCalledWith("Unexpected prefix", error, {source: "test"});
        });
    });

    describe("handleListener", () => {
        test("should add listener and return unsubscribe function", () => {
            const event = createBrowserEvent<[string]>();
            const callback = jest.fn<(value: string) => void>();

            const unsubscribe = handleListener(event.api as chrome.events.Event<(value: string) => void>, callback);

            expect(event.listenerCount()).toBe(1);
            unsubscribe();
            expect(event.listenerCount()).toBe(0);
        });
    });

    describe("callBrowserMethod", () => {
        test.each([
            "chrome only",
            "browser aliases chrome",
            "Firefox with shared namespaces",
            "separate browser",
            "browser only",
            "separate roots with shared API namespaces",
            "browser without an extension ID",
        ])("selects one invocation for %s", async scenario => {
            const chromeApi = createBrowserMethodApi();

            const browserApi = ["browser aliases chrome", "Firefox with shared namespaces"].includes(scenario)
                ? chromeApi
                : createBrowserMethodApi();

            const getBrowserInfo = jest.fn(async () => ({name: "Firefox", vendor: "Mozilla", version: "157", buildID: "test"}));

            if (scenario === "Firefox with shared namespaces") {
                browserApi.runtime.getBrowserInfo = getBrowserInfo;
            }

            if (scenario === "separate roots with shared API namespaces") {
                browserApi.runtime = chromeApi.runtime;
            }

            if (scenario === "browser without an extension ID") {
                browserApi.runtime = {...browserApi.runtime, id: ""};
            }

            setGlobals({
                browser: scenario === "chrome only" ? undefined : browserApi,
                chrome: scenario === "browser only" ? undefined : chromeApi,
            });

            const result = {value: 42};
            const callback = jest.fn((_api: typeof chrome, done: (value: typeof result) => void) => done(result));
            const promise = jest.fn(async (_api: typeof chrome) => result);
            const pending = callBrowserMethod({callback, promise});
            const usesCallback = ["chrome only", "browser aliases chrome", "browser without an extension ID"].includes(scenario);

            // Native calls must start immediately, without an asynchronous browser-detection step.
            if (usesCallback) {
                expect(callback).toHaveBeenCalledTimes(1);
                expect(callback.mock.calls[0][0]).toBe(chromeApi);
                expect(callback.mock.calls[0][1]).toEqual(expect.any(Function));
                expect(promise).not.toHaveBeenCalled();
            } else {
                expect(promise).toHaveBeenCalledTimes(1);
                expect(promise.mock.calls[0][0]).toBe(browserApi);
                expect(callback).not.toHaveBeenCalled();
            }

            await expect(pending).resolves.toBe(result);
            expect(getBrowserInfo).not.toHaveBeenCalled();
        });

        test("waits for callback completion and retains callback-scoped lastError", async () => {
            const runtime: {id: string; lastError?: chrome.runtime.LastError} = {id: "test-extension"};
            const api = createBrowserMethodApi(runtime);
            setGlobals({browser: api, chrome: api});
            let complete!: (value: string) => void;
            const promise = jest.fn(async () => "unexpected");

            const pending = callBrowserMethod({
                callback: (_api, done) => {
                    complete = done;
                },
                promise,
            });

            const settled = jest.fn();
            void pending.then(settled, settled);
            await Promise.resolve();
            expect(settled).not.toHaveBeenCalled();

            runtime.lastError = {message: "Native failure"};
            complete("ignored");
            delete runtime.lastError;

            await expect(pending).rejects.toThrow("Native failure");
            expect(promise).not.toHaveBeenCalled();
        });

        test.each(["callback", "promise"] as const)("retains a Promise rejection in the %s branch without retrying", async branch => {
            const api = createBrowserMethodApi();
            setGlobals({browser: branch === "promise" ? api : undefined, chrome: branch === "callback" ? api : undefined});
            const error = new Error("Native rejection");
            const callback = jest.fn(() => Promise.reject(error));
            const promise = jest.fn(() => Promise.reject(error));

            await expect(callBrowserMethod({callback, promise})).rejects.toBe(error);
            expect(callback).toHaveBeenCalledTimes(branch === "callback" ? 1 : 0);
            expect(promise).toHaveBeenCalledTimes(branch === "promise" ? 1 : 0);
        });

        test.each(["callback", "promise"] as const)("turns a synchronous %s failure into a rejection without retrying", async branch => {
            const api = createBrowserMethodApi();
            setGlobals({browser: branch === "promise" ? api : undefined, chrome: branch === "callback" ? api : undefined});
            const error = new Error("Invalid arguments");

            const callback = jest.fn(() => {
                throw error;
            });

            const promise = jest.fn(() => {
                throw error;
            });

            await expect(callBrowserMethod({callback, promise})).rejects.toBe(error);
            expect(callback).toHaveBeenCalledTimes(branch === "callback" ? 1 : 0);
            expect(promise).toHaveBeenCalledTimes(branch === "promise" ? 1 : 0);
        });

        test("rejects when no extension API exists without invoking either branch", async () => {
            setGlobals({browser: undefined, chrome: undefined});
            const callback = jest.fn(() => {});
            const promise = jest.fn(async () => undefined);

            await expect(callBrowserMethod({callback, promise})).rejects.toThrow("WebExtension API not available");
            expect(callback).not.toHaveBeenCalled();
            expect(promise).not.toHaveBeenCalled();
        });
    });
});
