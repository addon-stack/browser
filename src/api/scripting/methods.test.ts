import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const scripts: chrome.scripting.RegisteredContentScript[] = [{id: "content", matches: ["https://example.test/*"], js: ["content.js"]}];
const injection: chrome.scripting.ScriptInjection<[number], Promise<number>> = {target: {tabId: 7}, func: async value => value + 1, args: [1]};
const css: chrome.scripting.CSSInjection = {target: {tabId: 7}, css: "body { color: red; }"};

describe.each(["chrome", "firefox"] as const)("scripting methods in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test.each([{result: [{frameId: 0, documentId: "doc", result: 2}]}, {result: []}])("executeScript preserves $result and the injection", async ({result}) => {
        harness.scripting.executeScript.setResult(result);
        const pending: Promise<chrome.scripting.InjectionResult<number>[]> = api.executeScript<Promise<number>>(injection);
        await expect(pending).resolves.toBe(result);
        expect(harness.scripting.executeScript.calls[0].args).toEqual([injection]);
        expect(harness.scripting.executeScript.calls[0].args[0]).toBe(injection);
    });

    test.each(["getRegisteredContentScripts", "unregisterContentScripts"] as const)("%s preserves filters and defaults to an empty object", async name => {
        harness.scripting.getRegisteredContentScripts.setResult(scripts);
        harness.scripting.unregisterContentScripts.setResult(undefined);
        const filter = {ids: ["content"]};
        const result = name === "getRegisteredContentScripts" ? scripts : undefined;
        await expect(api[name](filter)).resolves.toBe(result);
        await expect(api[name]()).resolves.toBe(result);
        expect(harness.scripting[name].calls.map(call => call.args)).toEqual([[filter], [{}]]);
        expect(harness.scripting[name].calls[0].args[0]).toBe(filter);
    });

    test.each([
        ["insertCSS", api.insertCss],
        ["removeCSS", api.removeCss],
    ] as const)("%s forwards the original CSS injection", async (name, invoke) => {
        harness.scripting[name].setResult(undefined);
        await expect(invoke(css)).resolves.toBeUndefined();
        expect(harness.scripting[name].calls[0].args).toEqual([css]);
        expect(harness.scripting[name].calls[0].args[0]).toBe(css);
    });

    test.each(["registerContentScripts", "updateContentScripts"] as const)("%s forwards the original script definitions", async name => {
        harness.scripting[name].setResult(undefined);
        await expect(api[name](scripts)).resolves.toBeUndefined();
        expect(harness.scripting[name].calls[0].args).toEqual([scripts]);
        expect(harness.scripting[name].calls[0].args[0]).toBe(scripts);
    });

    test.each([
        ["executeScript", () => api.executeScript(injection)],
        ["getRegisteredContentScripts", api.getRegisteredContentScripts],
        ["insertCSS", () => api.insertCss(css)],
        ["removeCSS", () => api.removeCss(css)],
        ["registerContentScripts", () => api.registerContentScripts(scripts)],
        ["unregisterContentScripts", api.unregisterContentScripts],
        ["updateContentScripts", () => api.updateContentScripts(scripts)],
    ] as const)("%s propagates native errors", async (name, invoke) => {
        harness.scripting[name].failNext(new Error("Scripting denied"));
        await expect(invoke()).rejects.toThrow("Scripting denied");
        expect(harness.runtime.lastError).toBeUndefined();
    });
});
