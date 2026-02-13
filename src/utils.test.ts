import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {callWithPromise, handleListener, safeListener, throwRuntimeError} from "./utils";

describe("utils", () => {
    let originalChrome: any;
    let originalBrowser: any;
    let originalConsoleError: any;

    beforeEach(() => {
        originalChrome = globalThis.chrome;
        originalBrowser = globalThis.browser;
        originalConsoleError = console.error;
        console.error = jest.fn();

        delete (globalThis as any).chrome;
        delete (globalThis as any).browser;
    });

    afterEach(() => {
        globalThis.chrome = originalChrome;
        (globalThis as any).browser = originalBrowser;
        console.error = originalConsoleError;
        jest.resetAllMocks();
    });

    describe("throwRuntimeError", () => {
        test("should not throw if lastError is undefined", () => {
            globalThis.chrome = {runtime: {lastError: undefined}} as any;
            expect(() => throwRuntimeError()).not.toThrow();
        });

        test("should throw Error if lastError exists", () => {
            const errorMessage = "Some error";
            globalThis.chrome = {runtime: {lastError: {message: errorMessage}}} as any;
            expect(() => throwRuntimeError()).toThrow(errorMessage);
        });

        test("should throw Error if WebExtension API is not available", () => {
            expect(() => throwRuntimeError()).toThrow("WebExtension API not available in this context");
        });
    });

    describe("callWithPromise", () => {
        test("should resolve with result when successful", async () => {
            globalThis.chrome = {runtime: {lastError: undefined}} as any;
            const expectedResult = {foo: "bar"};
            const executor = (cb: any) => cb(expectedResult);

            const result = await callWithPromise(executor);
            expect(result).toBe(expectedResult);
        });

        test("should resolve with undefined when result is undefined", async () => {
            globalThis.chrome = {runtime: {lastError: undefined}} as any;
            const executor = (cb: any) => cb(undefined);

            const result = await callWithPromise(executor);
            expect(result).toBeUndefined();
        });

        test("should reject when lastError exists", async () => {
            const errorMessage = "Async error";
            globalThis.chrome = {runtime: {lastError: {message: errorMessage}}} as any;
            const executor = (cb: any) => cb(null);

            await expect(callWithPromise(executor)).rejects.toThrow(errorMessage);
        });

        test("should reject when lastError exists even if result is provided", async () => {
            const errorMessage = "Async error";
            globalThis.chrome = {runtime: {lastError: {message: errorMessage}}} as any;
            const executor = (cb: any) => cb({data: "some data"});

            await expect(callWithPromise(executor)).rejects.toThrow(errorMessage);
        });

        test("should reject when executor throws", async () => {
            const executor = () => {
                throw new Error("Executor error");
            };
            await expect(callWithPromise(executor)).rejects.toThrow("Executor error");
        });
    });

    describe("safeListener", () => {
        test("should execute listener and return result", () => {
            const expectedResult = "success";
            const listener = jest.fn().mockReturnValue(expectedResult);
            const wrapped = safeListener(listener);

            const result = wrapped("arg1");
            expect(listener).toHaveBeenCalledWith("arg1");
            expect(result).toBe(expectedResult);
        });

        test("should catch sync error and log it", () => {
            const error = new Error("Sync fail");
            const listener = () => {
                throw error;
            };
            const wrapped = safeListener(listener);

            const result = wrapped();
            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith("Listener error:", error);
        });

        test("should catch promise rejection and log it", async () => {
            const error = new Error("Async fail");
            const listener = () => Promise.reject(error);
            const wrapped = safeListener(listener);

            const result = wrapped();
            expect(result).toBeInstanceOf(Promise);

            // Wait for promise rejection to be handled
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(console.error).toHaveBeenCalledWith("Listener in promise error:", error);
        });
    });

    describe("handleListener", () => {
        test("should add listener and return unsubscribe function", () => {
            const addListener = jest.fn();
            const removeListener = jest.fn();
            const target = {addListener, removeListener} as any;
            const callback = () => {};

            const unsubscribe = handleListener(target, callback);

            expect(addListener).toHaveBeenCalled();
            expect(typeof unsubscribe).toBe("function");

            unsubscribe();
            expect(removeListener).toHaveBeenCalled();
        });
    });
});
