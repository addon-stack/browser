import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {getIdleAutoLockDelay, queryIdleState, setIdleDetectionInterval} from "./methods";

describe.each(["chrome", "firefox"] as const)("idle methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        harness.configurable.active.idle.setDetectionInterval.setResult(undefined);
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("getIdleAutoLockDelay preserves the native result", async () => {
        const method = harness.configurable.active.idle.getAutoLockDelay;
        method.setResult(0);
        await expect(getIdleAutoLockDelay()).resolves.toBe(0);
        expect(method.calls[0].args).toEqual([]);
    });

    test.each(["active", "idle", "locked"] as const)("queryIdleState preserves %s and forwards the interval", async state => {
        const method = harness.configurable.active.idle.queryState;
        method.setResult(state);
        await expect(queryIdleState(60)).resolves.toBe(state);
        expect(method.calls[0].args).toEqual([60]);
    });

    test("setIdleDetectionInterval stays synchronous", () => {
        expect(setIdleDetectionInterval(30)).toBeUndefined();

        expect(harness.configurable.active.idle.setDetectionInterval.calls[0]).toMatchObject({
            args: [30], callback: undefined, invocation: "sync",
        });
    });

    test.each([
        ["getAutoLockDelay", () => getIdleAutoLockDelay()],
        ["queryState", () => queryIdleState(60)],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.configurable.active.idle[name].failNext(new Error("Idle access denied"));
        await expect(invoke()).rejects.toThrow("Idle access denied");
    });

    test("setIdleDetectionInterval propagates synchronous errors", () => {
        harness.configurable.active.idle.setDetectionInterval.failNext(new Error("Invalid interval"));
        expect(() => setIdleDetectionInterval(0)).toThrow("Invalid interval");
    });
});
