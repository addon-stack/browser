import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {
    closeOffscreen,
    createOffscreen,
    getOffscreenContext,
    getOffscreenPath,
    getOffscreenUrl,
    hasOffscreen,
    hasOffscreenPath,
    hasOffscreenUrl,
} from "./offscreen";
import {type BrowserHarness, createBrowserHarness, createExtensionContextFixture, installGlobals} from "./testing";

describe("offscreen", () => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness({extensionId: "extension-id"});
        harness.configurable.chrome.offscreen.closeDocument.setResult(undefined);
        harness.configurable.chrome.offscreen.createDocument.setResult(undefined);
        harness.configurable.chrome.offscreen.hasDocument.setResult(false);
        restoreGlobals = installGlobals({browser: undefined, chrome: harness.chrome});
    });

    afterEach(() => {
        restoreGlobals();
    });

    const setOffscreenContext = (documentUrl = "chrome-extension://extension-id/offscreen.html"): void => {
        harness.runtime.setContexts([
            createExtensionContextFixture({
                contextId: "context-id",
                contextType: "OFFSCREEN_DOCUMENT",
                documentUrl,
            }),
        ]);
    };

    test("should close the current offscreen document", async () => {
        await expect(closeOffscreen()).resolves.toBeUndefined();

        expect(harness.configurable.chrome.offscreen.closeDocument.calls).toMatchObject([
            {args: [], callbackCalls: [[]], invocation: "callback"},
        ]);
    });

    test("should create an offscreen document", async () => {
        const parameters: chrome.offscreen.CreateParameters = {
            justification: "Process audio in an offscreen document",
            reasons: ["AUDIO_PLAYBACK"],
            url: "offscreen.html",
        };

        await expect(createOffscreen(parameters)).resolves.toBeUndefined();

        expect(harness.configurable.chrome.offscreen.createDocument.calls).toMatchObject([
            {args: [parameters], callbackCalls: [[]], invocation: "callback"},
        ]);
    });

    test("should check whether an offscreen document exists", async () => {
        await expect(hasOffscreen()).resolves.toBe(false);

        harness.configurable.chrome.offscreen.hasDocument.setResult(true);

        await expect(hasOffscreen()).resolves.toBe(true);
        expect(harness.configurable.chrome.offscreen.hasDocument.calls).toHaveLength(2);
    });

    test("should return the current offscreen context from stateful runtime contexts", async () => {
        const offscreenContext = createExtensionContextFixture({
            contextId: "context-id",
            contextType: "OFFSCREEN_DOCUMENT",
            documentUrl: "chrome-extension://extension-id/offscreen.html",
        });

        harness.runtime.setContexts([
            createExtensionContextFixture({contextId: "popup-id", contextType: "POPUP"}),
            offscreenContext,
        ]);

        await expect(getOffscreenContext()).resolves.toEqual(offscreenContext);

        expect(harness.runtime.getContexts.calls).toMatchObject([
            {
                args: [{contextTypes: ["OFFSCREEN_DOCUMENT"]}],
                callbackCalls: [[[offscreenContext]]],
                invocation: "callback",
            },
        ]);
    });

    test("should return the current offscreen url", async () => {
        setOffscreenContext();

        await expect(getOffscreenUrl()).resolves.toBe("chrome-extension://extension-id/offscreen.html");
    });

    test("should return the current offscreen pathname", async () => {
        setOffscreenContext("chrome-extension://extension-id/offscreen.html?mode=audio#ready");

        await expect(getOffscreenPath()).resolves.toBe("/offscreen.html");
    });

    test("should return undefined path for non-extension urls", async () => {
        setOffscreenContext("https://example.com/offscreen.html");

        await expect(getOffscreenPath()).resolves.toBeUndefined();
    });

    test("should check the current offscreen url", async () => {
        setOffscreenContext();

        await expect(hasOffscreenUrl("chrome-extension://extension-id/offscreen.html")).resolves.toBe(true);
        await expect(hasOffscreenUrl("chrome-extension://extension-id/other.html")).resolves.toBe(false);
    });

    test("should check the current offscreen path by pathname", async () => {
        setOffscreenContext("chrome-extension://extension-id/offscreen.html?mode=audio#ready");

        await expect(hasOffscreenPath("/offscreen.html")).resolves.toBe(true);
        await expect(hasOffscreenPath("/offscreen.html?mode=video#other")).resolves.toBe(true);
        await expect(hasOffscreenPath("other.html")).resolves.toBe(false);
    });
});
