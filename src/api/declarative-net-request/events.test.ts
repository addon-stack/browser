import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {onDnrRuleMatchedDebug} from "./events";

const info: chrome.declarativeNetRequest.MatchedRuleInfoDebug = {
    rule: {ruleId: 1, rulesetId: "_dynamic"},
    request: {requestId: "req-1", url: "https://example.test/", method: "GET", tabId: 3, frameId: 0, parentFrameId: -1, type: "xmlhttprequest"},
};

describe("DNR debug event", () => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "chrome", captureListenerErrors: true});
    });

    afterEach(() => restore());

    test("forwards native payloads and unsubscribes independently and idempotently", async () => {
        const event = harness.configurable.active.declarativeNetRequest.onRuleMatchedDebug;
        const callback = jest.fn();
        const other = jest.fn();
        const off = onDnrRuleMatchedDebug(callback);
        const offOther = onDnrRuleMatchedDebug(other);
        expect(event.registrations().map(value => value.args)).toEqual([[], []]);
        await event.emit(info);
        expect(callback).toHaveBeenCalledWith(info);
        expect(callback.mock.calls[0][0]).toBe(info);
        off(); off();
        await event.emit(info);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(other).toHaveBeenCalledTimes(2);
        offOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("retains the original event for cleanup after globals change", () => {
        const first = harness.configurable.active.declarativeNetRequest.onRuleMatchedDebug;
        const off = onDnrRuleMatchedDebug(() => undefined);
        restore();
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "chrome"});
        const second = harness.configurable.active.declarativeNetRequest.onRuleMatchedDebug;
        const offSecond = onDnrRuleMatchedDebug(() => undefined);
        off();
        expect(first.listenerCount()).toBe(0);
        expect(second.listenerCount()).toBe(1);
        offSecond();
    });

    test("handles sync errors and retains async listener completion", async () => {
        const event = harness.configurable.active.declarativeNetRequest.onRuleMatchedDebug;
        const error = new Error("Listener failed");

        const off = onDnrRuleMatchedDebug(() => {
            throw error;
        });

        await expect(event.emit(info)).resolves.toBeUndefined();
        off();

        const offAsync = onDnrRuleMatchedDebug(async () => {
            throw error;
        });

        await expect(event.emit(info)).rejects.toBe(error);
        offAsync();
        expect(harness.listenerErrors.entries.map(entry => entry.kind)).toEqual(["sync", "promise"]);
    });

    test("does not silently subscribe when the browser has no debug event", () => {
        Reflect.deleteProperty(harness.chrome.declarativeNetRequest, "onRuleMatchedDebug");
        expect(() => onDnrRuleMatchedDebug(() => undefined)).toThrow(TypeError);
    });
});
