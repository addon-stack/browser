import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {createTabCapture, getCapturedTabs, getCaptureMediaStreamId} from "./methods";

describe.each(["chrome", "firefox"] as const)("tabCapture methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("createTabCapture preserves the stream or null and forwards capture options", async () => {
        const method = harness.configurable.active.tabCapture.capture;
        // Opaque native result: the wrapper must pass it through without accessing stream internals.
        const stream = {id: "stream-1"} as MediaStream;
        const options = {audio: true, video: false};
        method.queueResult(stream, null);
        await expect(createTabCapture(options)).resolves.toBe(stream);
        await expect(createTabCapture(options)).resolves.toBeNull();
        expect(method.calls.map(call => call.args)).toEqual([[options], [options]]);
        expect(method.calls[0].args[0]).toBe(options);
    });

    test("getCapturedTabs preserves native capture entries", async () => {
        const method = harness.configurable.active.tabCapture.getCapturedTabs;
        const captures: chrome.tabCapture.CaptureInfo[] = [{tabId: 7, status: "active", fullscreen: false}];
        method.setResult(captures);
        await expect(getCapturedTabs()).resolves.toBe(captures);
        expect(method.calls[0].args).toEqual([]);
    });

    test("getCaptureMediaStreamId forwards target and consumer tab IDs", async () => {
        const method = harness.configurable.active.tabCapture.getMediaStreamId;
        const options = {targetTabId: 7, consumerTabId: 8};
        method.setResult("stream-id");
        await expect(getCaptureMediaStreamId(options)).resolves.toBe("stream-id");
        expect(method.calls[0].args[0]).toBe(options);
    });

    test.each([
        ["capture", () => createTabCapture({audio: true})],
        ["getCapturedTabs", () => getCapturedTabs()],
        ["getMediaStreamId", () => getCaptureMediaStreamId({targetTabId: 7})],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.configurable.active.tabCapture[name].failNext(new Error("Capture denied"));
        await expect(invoke()).rejects.toThrow("Capture denied");
    });
});
