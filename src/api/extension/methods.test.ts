import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

describe.each(["chrome", "firefox"] as const)("extension methods in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test.each([null, {name: "background"} as Window])("getBackgroundPage preserves %j", result => {
        const method = harness.configurable.active.extension.getBackgroundPage;
        method.setResult(result);
        expect(api.getBackgroundPage()).toBe(result);
        expect(method.calls[0].args).toEqual([]);
    });

    test("getViews forwards an optional filter and preserves the returned windows", () => {
        const method = harness.configurable.active.extension.getViews;
        const views = [{name: "popup"} as Window];
        const properties: chrome.extension.FetchProperties = {type: "popup", windowId: 3};
        method.setResult(views);
        expect(api.getViews(properties)).toBe(views);
        expect(api.getViews()).toBe(views);
        expect(method.calls.map(call => call.args)).toEqual([[properties], [undefined]]);
        expect(method.calls[0].args[0]).toBe(properties);
    });

    test.each([
        ["isAllowedFileSchemeAccess", api.isAllowedFileSchemeAccess],
        ["isAllowedIncognitoAccess", api.isAllowedIncognitoAccess],
    ] as const)("%s preserves both access results and native errors", async (name, invoke) => {
        const method = harness.configurable.active.extension[name];

        for (const result of [true, false]) {
            method.setResult(result);
            await expect(invoke()).resolves.toBe(result);
        }

        expect(method.calls.map(call => call.args)).toEqual([[], []]);
        method.failNext(new Error("Access check failed"));
        await expect(invoke()).rejects.toThrow("Access check failed");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test("setUpdateUrlData forwards the exact string and returns synchronously", () => {
        const method = harness.configurable.active.extension.setUpdateUrlData;
        method.setResult(undefined);
        expect(api.setUpdateUrlData("key=value&empty=")).toBeUndefined();
        expect(method.calls[0].args).toEqual(["key=value&empty="]);
    });

    test.each([
        ["getBackgroundPage", api.getBackgroundPage],
        ["getViews", api.getViews],
        ["setUpdateUrlData", () => api.setUpdateUrlData("")],
    ] as const)("%s preserves synchronous failures", (name, invoke) => {
        const error = new Error("Extension API failed");
        harness.configurable.active.extension[name].failNext(error);
        expect(invoke).toThrow(error);
    });
});
