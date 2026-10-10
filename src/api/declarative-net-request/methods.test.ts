import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "../../../tests/api/availability";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const rule: chrome.declarativeNetRequest.Rule = {id: 1, action: {type: "block"}, condition: {urlFilter: "example.test"}};
const rules = [rule];
const filter = Object.freeze({ruleIds: [1]});
const update = Object.freeze({removeRuleIds: [2], addRules: rules});
const rulesets = Object.freeze({enableRulesetIds: ["static"], disableRulesetIds: ["other"]});
const staticOptions = Object.freeze({rulesetId: "static", disableRuleIds: [1]});
const matchedFilter = Object.freeze({tabId: 42, minTimeStamp: 123});
const action = Object.freeze({displayActionCountAsBadgeText: true});
const request: chrome.declarativeNetRequest.TestMatchRequestDetails = {url: "https://example.test/", type: "xmlhttprequest"};
const regex = Object.freeze({regex: "[", isCaseSensitive: true, requireCapturing: false});
const support: chrome.declarativeNetRequest.IsRegexSupportedResult = {isSupported: false, reason: "syntaxError"};
const outcome = {matchedRules: [{ruleId: 1, rulesetId: "_dynamic", extensionId: "another-extension"}]};

const calls = [
    ["getDynamicRules", () => api.getDnrDynamicRules(), [], rules],
    ["getDynamicRules", () => api.getDnrDynamicRules(undefined), [], rules],
    ["getDynamicRules", () => api.getDnrDynamicRules(filter), [filter], rules],
    ["updateDynamicRules", () => api.updateDnrDynamicRules(update), [update], undefined],
    ["getSessionRules", () => api.getDnrSessionRules(), [], rules],
    ["getSessionRules", () => api.getDnrSessionRules(filter), [filter], rules],
    ["updateSessionRules", () => api.updateDnrSessionRules(update), [update], undefined],
    ["getEnabledRulesets", () => api.getDnrEnabledRulesets(), [], ["static"]],
    ["updateEnabledRulesets", () => api.updateDnrEnabledRulesets(rulesets), [rulesets], undefined],
    ["getDisabledRuleIds", () => api.getDnrDisabledRuleIds(staticOptions), [staticOptions], [1]],
    ["updateStaticRules", () => api.updateDnrStaticRules(staticOptions), [staticOptions], undefined],
    ["getAvailableStaticRuleCount", () => api.getDnrAvailableStaticRuleCount(), [], 0],
    ["getMatchedRules", () => api.getDnrMatchedRules(), [], {rulesMatchedInfo: []}],
    ["getMatchedRules", () => api.getDnrMatchedRules(matchedFilter), [matchedFilter], {rulesMatchedInfo: []}],
    ["setExtensionActionOptions", () => api.setDnrExtensionActionOptions(action), [action], undefined],
    ["testMatchOutcome", () => api.testDnrMatchOutcome(request), [request], outcome],
    ["isRegexSupported", () => api.getDnrRegexSupport(regex), [regex], support],
] as const;

describe.each(["chrome", "firefox"] as const)("DNR native invocation via %s facade", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    // Configurable doubles test invocation contracts, not browser feature availability.
    test.each(calls)("%s preserves arguments and native result identity", async (method, invoke, args, result) => {
        const native = harness.configurable.active.declarativeNetRequest[method];
        native.setResult(result as never);
        await expect(invoke()).resolves.toBe(result);
        expect(native.calls).toHaveLength(1);
        expect(native.calls[0].args).toEqual(args);
        args.forEach((arg, index) => expect(native.calls[0].args[index]).toBe(arg));
    });

    test.each(calls.map(([method, invoke]) => [method, invoke] as const))("%s propagates native failure", async (method, invoke) => {
        harness.configurable.active.declarativeNetRequest[method].failNext(new Error("DNR rejected"));
        await expect(invoke()).rejects.toThrow("DNR rejected");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("does not cache rules or convert an empty result", async () => {
        const empty: chrome.declarativeNetRequest.Rule[] = [];
        const native = harness.configurable.active.declarativeNetRequest.getDynamicRules;
        native.setResult(empty);
        await expect(api.getDnrDynamicRules()).resolves.toBe(empty);
        native.setResult(rules);
        await expect(api.getDnrDynamicRules()).resolves.toBe(rules);
    });

    if (profile === "firefox") {
        test("forwards Firefox-only match options through the Promise overload", async () => {
            const native = harness.configurable.active.declarativeNetRequest.testMatchOutcome;
            const options = {includeOtherExtensions: true};
            native.setResult(outcome);
            await expect(api.testDnrMatchOutcome(request, options)).resolves.toBe(outcome);
            expect(native.calls[0].args).toEqual([request, options]);
            expect(native.calls[0].args[1]).toBe(options);
            native.failNext(new Error("Feedback disabled"));
            await expect(api.testDnrMatchOutcome(request, options)).rejects.toThrow("Feedback disabled");
        });

        test.each([
            ["getMatchedRules", () => api.getDnrMatchedRules()],
            ["setExtensionActionOptions", () => api.setDnrExtensionActionOptions(action)],
        ] as const)("does not synthesize unsupported %s", async (name, invoke) => {
            Reflect.deleteProperty(harness.browser.declarativeNetRequest, name);
            await expect(invoke()).rejects.toThrow(TypeError);
        });
    }
});

describe("DNR method boundaries", () => {
    let restore: () => void;

    beforeEach(() => {
        restore = installAvailabilityGlobals();
    });

    afterEach(() => restore());

    test.each(calls.map(([method, invoke]) => [method, invoke] as const))("%s rejects without extension globals", async (_method, invoke) => {
        await expect(invoke()).rejects.toThrow("WebExtension API not available");
    });

    test("waits for callback completion and preserves the receiver", async () => {
        let complete!: (value: chrome.declarativeNetRequest.Rule[]) => void;

        const native = {getDynamicRules: jest.fn(function (this: unknown, callback: typeof complete) {
            expect(this).toBe(native);
            complete = callback;
        })};

        restore();
        restore = installAvailabilityGlobals({chrome: {runtime: {}, declarativeNetRequest: native}});
        let settled = false;
        const pending = api.getDnrDynamicRules();

        void pending.then(() => {
            settled = true;
        });

        await Promise.resolve();
        expect(settled).toBe(false);
        expect(native.getDynamicRules).toHaveBeenCalledWith(expect.any(Function));
        complete(rules);
        await expect(pending).resolves.toBe(rules);
    });

    test("preserves Safari matched-request results without inventing rule IDs", async () => {
        const result = {rulesMatchedInfo: [{request: {url: "https://example.test/"}, tabId: 7, timeStamp: 123}]};
        restore();

        restore = installAvailabilityGlobals({browser: {runtime: {id: "safari"}, declarativeNetRequest: {
            getMatchedRules: async () => result,
        }}});

        await expect(api.getDnrMatchedRules()).resolves.toBe(result);
        expect(result.rulesMatchedInfo[0]).not.toHaveProperty("rule");
    });

    test("passes exactly two arguments to Firefox's options overload", async () => {
        const options = {includeOtherExtensions: true};
        const error = new Error("Native rejection");

        const testMatchOutcome = jest.fn<(...args: unknown[]) => Promise<typeof outcome>>()
            .mockResolvedValueOnce(outcome).mockRejectedValueOnce(error);

        restore();
        restore = installAvailabilityGlobals({browser: {runtime: {id: "firefox"}, declarativeNetRequest: {testMatchOutcome}}});
        await expect(api.testDnrMatchOutcome(request, options)).resolves.toBe(outcome);
        expect(testMatchOutcome).toHaveBeenCalledWith(request, options);
        await expect(api.testDnrMatchOutcome(request, options)).rejects.toBe(error);
    });

    test.each(["namespace", "method", "invocation"])("retains synchronous %s errors as rejections", async level => {
        const error = new Error("Native context invalidated");

        const fail = () => {
            throw error;
        };

        const native = {getDynamicRules: fail};
        const chrome = {runtime: {}, declarativeNetRequest: native};

        if (level === "namespace") {
            Object.defineProperty(chrome, "declarativeNetRequest", {get: fail});
        }

        if (level === "method") {
            Object.defineProperty(native, "getDynamicRules", {get: fail});
        }

        restore();
        restore = installAvailabilityGlobals({chrome});
        await expect(api.getDnrDynamicRules()).rejects.toBe(error);
    });
});
