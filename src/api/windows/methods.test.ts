import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, createWindowFixture, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

describe.each(["chrome", "firefox"] as const)("window methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness({windows: [createWindowFixture({id: 7})]});
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("createWindow defaults the options and preserves undefined native results", async () => {
        harness.windows.create.setResult(undefined);
        await expect(api.createWindow()).resolves.toBeUndefined();
        expect(harness.windows.create.calls[0].args).toEqual([{}]);
        const options: chrome.windows.CreateData = {type: "popup", focused: false};
        const result = createWindowFixture({id: 8});
        harness.windows.create.setResult(result);
        await expect(api.createWindow(options)).resolves.toBe(result);
        expect(harness.windows.create.calls[1].args[0]).toBe(options);
    });

    test("window queries default options and preserve explicitly supplied query objects", async () => {
        const result = createWindowFixture({id: 7});
        harness.windows.get.setResult(result);
        harness.windows.getCurrent.setResult(result);
        harness.windows.getLastFocused.setResult(result);
        harness.windows.getAll.setResult([result]);
        const query = {populate: true};
        await expect(api.getWindow(7)).resolves.toBe(result);
        await expect(api.getCurrentWindow()).resolves.toBe(result);
        await expect(api.getLastFocusedWindow()).resolves.toBe(result);
        await expect(api.getAllWindows()).resolves.toEqual([result]);
        await api.getWindow(7, query);
        await api.getCurrentWindow(query);
        await api.getLastFocusedWindow(query);
        await api.getAllWindows(query);
        expect(harness.windows.get.calls.map(call => call.args)).toEqual([[7, {}], [7, query]]);

        for (const method of [harness.windows.getCurrent, harness.windows.getLastFocused, harness.windows.getAll]) {
            expect(method.calls.map(call => call.args)).toEqual([[{}], [query]]);
            expect(method.calls[1].args[0]).toBe(query);
        }
    });

    test("updateWindow changes the requested window and removeWindow resolves a callback without a result", async () => {
        await expect(api.updateWindow(7, {width: 640})).resolves.toMatchObject({id: 7, width: 640});
        await expect(api.removeWindow(7)).resolves.toBeUndefined();
        expect(harness.windows.values).toEqual([]);
        expect(harness.windows.remove.calls[0]).toMatchObject({args: [7], callbackCalls: [[]]});
    });

    test("native failures reject without changing window state", async () => {
        harness.windows.create.failNext(new Error("Creation denied"));
        await expect(api.createWindow()).rejects.toThrow("Creation denied");
        await expect(api.getWindow(999)).rejects.toThrow();
        await expect(api.updateWindow(999, {focused: true})).rejects.toThrow();
        await expect(api.removeWindow(999)).rejects.toThrow();
        expect(harness.windows.values.map(window => window.id)).toEqual([7]);
    });
});
