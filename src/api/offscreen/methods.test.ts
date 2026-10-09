import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, createExtensionContextFixture, installBrowserGlobals, installGlobals} from "../../testing";
import {
    closeOffscreen,
    createOffscreen,
    getOffscreenContext,
    getOffscreenPath,
    getOffscreenUrl,
    hasOffscreen,
    hasOffscreenPath,
    hasOffscreenUrl,
} from "./methods";

describe("offscreen", () => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness({extensionId: "extension-id"});
        restoreGlobals = installGlobals({browser: undefined, chrome: harness.chrome});
    });

    afterEach(() => {
        harness.reset();
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
        setOffscreenContext();
        await expect(closeOffscreen()).resolves.toBeUndefined();
        expect(harness.offscreen.context).toBeUndefined();

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
        await expect(getOffscreenPath()).resolves.toBe("/offscreen.html");

        expect(harness.configurable.chrome.offscreen.createDocument.calls).toMatchObject([
            {args: [parameters], callbackCalls: [[]], invocation: "callback"},
        ]);
    });

    test("should check whether an offscreen document exists", async () => {
        await expect(hasOffscreen()).resolves.toBe(false);

        await createOffscreen({url: "offscreen.html", reasons: ["DOM_PARSER"], justification: "Test lifecycle"});

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

describe.each(["chrome", "firefox"] as const)("offscreen method edge cases in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    const parameters: chrome.offscreen.CreateParameters = {
        reasons: ["AUDIO_PLAYBACK"], url: "offscreen.html", justification: "Play audio",
    };

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test("creates, checks and closes the document through the selected facade", async () => {
        await expect(hasOffscreen()).resolves.toBe(false);
        await expect(createOffscreen(parameters)).resolves.toBeUndefined();
        await expect(hasOffscreen()).resolves.toBe(true);
        await expect(closeOffscreen()).resolves.toBeUndefined();
        await expect(hasOffscreen()).resolves.toBe(false);
        expect(harness.configurable.active.offscreen.createDocument.calls[0].args[0]).toBe(parameters);
        expect(harness.configurable.active.offscreen.closeDocument.calls[0].args).toEqual([]);
    });

    test.each([
        ["closeDocument", closeOffscreen],
        ["createDocument", () => createOffscreen(parameters)],
        ["hasDocument", hasOffscreen],
    ] as const)("%s propagates native failures", async (name, invoke) => {
        harness.configurable.active.offscreen[name].failNext(new Error("Offscreen failed"));
        await expect(invoke()).rejects.toThrow("Offscreen failed");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test("missing documents preserve undefined results and false comparisons", async () => {
        await expect(getOffscreenContext()).resolves.toBeUndefined();
        await expect(getOffscreenUrl()).resolves.toBeUndefined();
        await expect(getOffscreenPath()).resolves.toBeUndefined();
        await expect(hasOffscreenUrl("offscreen.html")).resolves.toBe(false);
        await expect(hasOffscreenPath("offscreen.html")).resolves.toBe(false);
    });

    test.each([
        ["getOffscreenContext", getOffscreenContext],
        ["getOffscreenUrl", getOffscreenUrl],
        ["getOffscreenPath", getOffscreenPath],
        ["hasOffscreenUrl", () => hasOffscreenUrl("offscreen.html")],
        ["hasOffscreenPath", () => hasOffscreenPath("offscreen.html")],
    ] as const)("%s propagates context lookup errors", async (_name, invoke) => {
        harness.runtime.getContexts.failNext(new Error("Contexts unavailable"));
        await expect(invoke()).rejects.toThrow("Contexts unavailable");
    });

    test("uses the first context and preserves absent documentUrl", async () => {
        const first = createExtensionContextFixture({contextType: "OFFSCREEN_DOCUMENT", documentUrl: undefined});
        harness.runtime.getContexts.setResult([first, createExtensionContextFixture({documentUrl: "https://example.test"})]);
        await expect(getOffscreenContext()).resolves.toBe(first);
        await expect(getOffscreenUrl()).resolves.toBeUndefined();
        await expect(getOffscreenPath()).resolves.toBeUndefined();
    });

    test("rejects malformed document URLs", async () => {
        harness.runtime.getContexts.setResult([createExtensionContextFixture({documentUrl: "invalid URL"})]);
        await expect(getOffscreenPath()).rejects.toHaveProperty("name", "TypeError");
    });
});
