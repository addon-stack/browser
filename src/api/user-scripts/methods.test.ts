import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const scripts: chrome.userScripts.RegisteredUserScript[] = [{id: "user", matches: ["https://example.test/*"], js: [{code: "1 + 1"}]}];
const injection: chrome.userScripts.UserScriptInjection = {target: {tabId: 7}, js: [{code: "1 + 1"}]};

describe.each(["chrome", "firefox"] as const)("user-scripts methods in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test("configureUserScriptsWorld forwards properties and defaults to an empty object", async () => {
        const method = harness.configurable.active.userScripts.configureWorld;
        const properties = {worldId: "isolated", messaging: true};
        method.setResult(undefined);
        await expect(api.configureUserScriptsWorld(properties)).resolves.toBeUndefined();
        await expect(api.configureUserScriptsWorld()).resolves.toBeUndefined();
        expect(method.calls.map(call => call.args)).toEqual([[properties], [{}]]);
        expect(method.calls[0].args[0]).toBe(properties);
        expect(method.calls.every(call => call.invocation === "promise" && call.callback === undefined)).toBe(true);
    });

    test.each([undefined, [], ["user"]])("getUserScripts and unregisterUserScripts normalize ids=%j", async ids => {
        const native = harness.configurable.active.userScripts;
        native.getScripts.setResult(scripts);
        native.unregister.setResult(undefined);
        await expect(api.getUserScripts(ids)).resolves.toBe(scripts);
        await expect(api.unregisterUserScripts(ids)).resolves.toBeUndefined();
        const filter = ids?.length ? {ids} : {};
        expect(native.getScripts.calls[0].args).toEqual([filter]);
        expect(native.unregister.calls[0].args).toEqual([filter]);
        expect(native.unregister.calls[0].invocation).toBe("promise");
    });

    test.each([undefined, "", "isolated"])("resetUserScriptsWorldConfigs preserves worldId=%s and argument count", async worldId => {
        const method = harness.configurable.active.userScripts.resetWorldConfiguration;
        method.setResult(undefined);
        await expect(api.resetUserScriptsWorldConfigs(worldId)).resolves.toBeUndefined();
        expect(method.calls[0].args).toEqual(worldId === undefined ? [] : [worldId]);
        expect(method.calls[0].invocation).toBe("promise");
    });

    test("getUserScriptsWorldConfigs preserves the native configurations", async () => {
        const method = harness.configurable.active.userScripts.getWorldConfigurations;
        const result = [{worldId: "isolated", messaging: false}];
        method.setResult(result);
        await expect(api.getUserScriptsWorldConfigs()).resolves.toBe(result);
        expect(method.calls[0].args).toEqual([]);
        expect(method.calls[0].invocation).toBe("promise");
    });

    test("executeUserScript preserves injection results and forwards the original injection", async () => {
        const method = harness.configurable.active.userScripts.execute;
        const result: chrome.userScripts.InjectionResult[] = [{documentId: "doc", frameId: 0, result: 2}];
        method.setResult(result);
        await expect(api.executeUserScript(injection)).resolves.toBe(result);
        expect(method.calls[0].args).toEqual([injection]);
        expect(method.calls[0].args[0]).toBe(injection);
        expect(method.calls[0].invocation).toBe("promise");
    });

    test.each([
        ["register", api.registerUserScripts],
        ["update", api.updateUserScripts],
    ] as const)("%s forwards script definitions through the native Promise", async (name, invoke) => {
        const method = harness.configurable.active.userScripts[name];
        method.setResult(undefined);
        await expect(invoke(scripts)).resolves.toBeUndefined();
        expect(method.calls[0].args).toEqual([scripts]);
        expect(method.calls[0].args[0]).toBe(scripts);
        expect(method.calls[0].invocation).toBe("promise");
    });

    test.each([
        ["configureWorld", api.configureUserScriptsWorld],
        ["getScripts", api.getUserScripts],
        ["getWorldConfigurations", api.getUserScriptsWorldConfigs],
        ["execute", () => api.executeUserScript(injection)],
        ["register", () => api.registerUserScripts(scripts)],
        ["resetWorldConfiguration", api.resetUserScriptsWorldConfigs],
        ["unregister", api.unregisterUserScripts],
        ["update", () => api.updateUserScripts(scripts)],
    ] as const)("%s propagates native failures", async (name, invoke) => {
        harness.configurable.active.userScripts[name].failNext(new Error("User script denied"));
        await expect(invoke()).rejects.toThrow("User script denied");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test("isAvailableUserScripts checks the current namespace", () => {
        expect(api.isAvailableUserScripts()).toBe(true);
        const facade = profile === "firefox" ? globalThis.browser : globalThis.chrome;
        Reflect.deleteProperty(facade, "userScripts");
        expect(api.isAvailableUserScripts()).toBe(false);
    });
});
