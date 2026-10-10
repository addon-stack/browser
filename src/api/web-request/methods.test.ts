import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {handlerWebRequestBehaviorChanged} from "./methods";

describe.each(["chrome", "firefox"] as const)("webRequest methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        restoreGlobals();
    });

    test("handlerWebRequestBehaviorChanged resolves after the native callback without adding arguments", async () => {
        const method = harness.configurable.active.webRequest.handlerBehaviorChanged;
        method.setResult(undefined);

        await expect(handlerWebRequestBehaviorChanged()).resolves.toBeUndefined();

        expect(method.calls).toHaveLength(1);
        expect(method.calls[0]).toMatchObject({args: [], callback: expect.any(Function), callbackCalls: [[]]});
    });

    test("handlerWebRequestBehaviorChanged rejects native errors and allows a later successful call", async () => {
        const method = harness.configurable.active.webRequest.handlerBehaviorChanged;
        method.setResult(undefined);
        method.failNext(new Error("Behavior change failed"));

        await expect(handlerWebRequestBehaviorChanged()).rejects.toThrow("Behavior change failed");
        await expect(handlerWebRequestBehaviorChanged()).resolves.toBeUndefined();

        expect(method.calls).toHaveLength(2);
    });

    test("handlerWebRequestBehaviorChanged waits for a native Promise when the callback is unused", async () => {
        let complete!: () => void;

        const nativeResult = new Promise<void>(resolve => {
            complete = resolve;
        });

        const native = jest.spyOn(harness.configurable.active.webRequest.api, "handlerBehaviorChanged")
            .mockImplementation(() => nativeResult);

        const result = handlerWebRequestBehaviorChanged();
        expect(native).toHaveBeenCalledTimes(1);
        expect(await Promise.race([result, Promise.resolve("pending")])).toBe("pending");
        complete();
        await expect(result).resolves.toBeUndefined();
    });

    test("handlerWebRequestBehaviorChanged preserves a rejected native Promise", async () => {
        const error = new Error("Promise failure");

        jest.spyOn(harness.configurable.active.webRequest.api, "handlerBehaviorChanged")
            .mockImplementation(async () => {
                throw error;
            });

        await expect(handlerWebRequestBehaviorChanged()).rejects.toBe(error);
    });

    test("handlerWebRequestBehaviorChanged converts a synchronous native failure to a rejection", async () => {
        const error = new Error("Native method unavailable");

        jest.spyOn(harness.configurable.active.webRequest.api, "handlerBehaviorChanged")
            .mockImplementation(() => {
                throw error;
            });

        await expect(handlerWebRequestBehaviorChanged()).rejects.toBe(error);
    });
});
