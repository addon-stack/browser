import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {getAllFrames, getFrame} from "./methods";

const frame: chrome.webNavigation.GetAllFrameResultDetails = {
    documentId: "document-1",
    documentLifecycle: "active",
    errorOccurred: false,
    frameId: 0,
    frameType: "outermost_frame",
    parentFrameId: -1,
    processId: 1,
    url: "https://example.test/",
};

describe.each(["chrome", "firefox"] as const)("webNavigation methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("getAllFrames wraps the tab ID and normalizes a null native result to an empty list", async () => {
        const method = harness.configurable.active.webNavigation.getAllFrames;
        const frames = [frame];
        method.queueResult(frames, null);
        await expect(getAllFrames(7)).resolves.toBe(frames);
        await expect(getAllFrames(999)).resolves.toEqual([]);
        expect(method.calls.map(call => call.args)).toEqual([[{tabId: 7}], [{tabId: 999}]]);
    });

    test("getFrame forwards frame and document selectors and preserves null results", async () => {
        const method = harness.configurable.active.webNavigation.getFrame;
        const details = {tabId: 7, frameId: 0};
        const document = {documentId: "document-1"};
        method.queueResult(frame, null);
        await expect(getFrame(details)).resolves.toBe(frame);
        await expect(getFrame(document)).resolves.toBeNull();
        expect(method.calls[0].args[0]).toBe(details);
        expect(method.calls[1].args[0]).toBe(document);
    });

    test("native failures reject instead of producing missing-frame results", async () => {
        const error = new Error("Navigation access denied");
        harness.configurable.active.webNavigation.getAllFrames.failNext(error);
        harness.configurable.active.webNavigation.getFrame.failNext(error);
        await expect(getAllFrames(7)).rejects.toThrow(error.message);
        await expect(getFrame({tabId: 7, frameId: 0})).rejects.toThrow(error.message);
    });
});
