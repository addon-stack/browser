import {afterEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserTestApi, createBrowserEvent, installGlobals} from "./testing";
import {createListenerErrorCapture} from "./testing/listener-errors";
import {callWithPromise, checkLastError, handleListener, safeListener} from "./utils";

const runtimeApi = (lastError?: chrome.runtime.LastError): BrowserTestApi =>
    ({runtime: {lastError}}) as unknown as BrowserTestApi;

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
                // biome-ignore lint/suspicious/noThenProperty: This test intentionally models a non-Promise thenable.
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
});
