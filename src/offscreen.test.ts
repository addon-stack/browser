import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
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

describe("offscreen", () => {
    let originalChrome: any;
    let contexts: chrome.runtime.ExtensionContext[];

    beforeEach(() => {
        originalChrome = globalThis.chrome;
        contexts = [];

        globalThis.chrome = {
            runtime: {
                id: "extension-id",
                lastError: undefined,
                getContexts: jest.fn((filter: chrome.runtime.ContextFilter, cb: (result: any) => void) => {
                    const result = contexts.filter(context => {
                        if (filter.contextTypes && !filter.contextTypes.includes(context.contextType)) {
                            return false;
                        }

                        return !(
                            filter.documentUrls &&
                            (!context.documentUrl || !filter.documentUrls.includes(context.documentUrl))
                        );
                    });

                    cb(result);
                }),
                getURL: jest.fn((path: string) => `chrome-extension://extension-id/${path.replace(/^\/+/, "")}`),
            },
            offscreen: {
                closeDocument: jest.fn((cb: () => void) => cb()),
                createDocument: jest.fn((_parameters: chrome.offscreen.CreateParameters, cb: () => void) => cb()),
                hasDocument: jest.fn((cb: (result: boolean) => void) => cb(contexts.length !== 0)),
            },
        } as any;
    });

    afterEach(() => {
        globalThis.chrome = originalChrome;
        jest.resetAllMocks();
    });

    test("should close the current offscreen document", async () => {
        await expect(closeOffscreen()).resolves.toBeUndefined();
        expect(globalThis.chrome.offscreen.closeDocument).toHaveBeenCalledWith(expect.any(Function));
    });

    test("should create an offscreen document", async () => {
        const parameters: chrome.offscreen.CreateParameters = {
            justification: "Process audio in an offscreen document",
            reasons: ["AUDIO_PLAYBACK"],
            url: "offscreen.html",
        };

        await expect(createOffscreen(parameters)).resolves.toBeUndefined();
        expect(globalThis.chrome.offscreen.createDocument).toHaveBeenCalledWith(parameters, expect.any(Function));
    });

    test("should check whether an offscreen document exists", async () => {
        await expect(hasOffscreen()).resolves.toBe(false);

        contexts = [
            {
                contextId: "context-id",
                contextType: "OFFSCREEN_DOCUMENT",
                documentUrl: "chrome-extension://extension-id/offscreen.html",
                frameId: 0,
                incognito: false,
                tabId: -1,
                windowId: -1,
            },
        ];

        await expect(hasOffscreen()).resolves.toBe(true);
        expect(globalThis.chrome.offscreen.hasDocument).toHaveBeenCalledWith(expect.any(Function));
    });

    test("should return the current offscreen context", async () => {
        const offscreenContext = {
            contextId: "context-id",
            contextType: "OFFSCREEN_DOCUMENT",
            documentUrl: "chrome-extension://extension-id/offscreen.html",
            frameId: 0,
            incognito: false,
            tabId: -1,
            windowId: -1,
        } as chrome.runtime.ExtensionContext;

        contexts = [
            {
                ...offscreenContext,
                contextId: "popup-id",
                contextType: "POPUP",
            },
            offscreenContext,
        ];

        await expect(getOffscreenContext()).resolves.toBe(offscreenContext);
        expect(globalThis.chrome.runtime.getContexts).toHaveBeenCalledWith(
            {contextTypes: ["OFFSCREEN_DOCUMENT"]},
            expect.any(Function)
        );
    });

    test("should return the current offscreen url", async () => {
        contexts = [
            {
                contextId: "context-id",
                contextType: "OFFSCREEN_DOCUMENT",
                documentUrl: "chrome-extension://extension-id/offscreen.html",
                frameId: 0,
                incognito: false,
                tabId: -1,
                windowId: -1,
            },
        ];

        await expect(getOffscreenUrl()).resolves.toBe("chrome-extension://extension-id/offscreen.html");
    });

    test("should return the current offscreen pathname", async () => {
        contexts = [
            {
                contextId: "context-id",
                contextType: "OFFSCREEN_DOCUMENT",
                documentUrl: "chrome-extension://extension-id/offscreen.html?mode=audio#ready",
                frameId: 0,
                incognito: false,
                tabId: -1,
                windowId: -1,
            },
        ];

        await expect(getOffscreenPath()).resolves.toBe("/offscreen.html");
    });

    test("should return undefined path for non-extension urls", async () => {
        contexts = [
            {
                contextId: "context-id",
                contextType: "OFFSCREEN_DOCUMENT",
                documentUrl: "https://example.com/offscreen.html",
                frameId: 0,
                incognito: false,
                tabId: -1,
                windowId: -1,
            },
        ];

        await expect(getOffscreenPath()).resolves.toBeUndefined();
    });

    test("should check the current offscreen url", async () => {
        contexts = [
            {
                contextId: "context-id",
                contextType: "OFFSCREEN_DOCUMENT",
                documentUrl: "chrome-extension://extension-id/offscreen.html",
                frameId: 0,
                incognito: false,
                tabId: -1,
                windowId: -1,
            },
        ];

        await expect(hasOffscreenUrl("chrome-extension://extension-id/offscreen.html")).resolves.toBe(true);
        await expect(hasOffscreenUrl("chrome-extension://extension-id/other.html")).resolves.toBe(false);
    });

    test("should check the current offscreen path by pathname", async () => {
        contexts = [
            {
                contextId: "context-id",
                contextType: "OFFSCREEN_DOCUMENT",
                documentUrl: "chrome-extension://extension-id/offscreen.html?mode=audio#ready",
                frameId: 0,
                incognito: false,
                tabId: -1,
                windowId: -1,
            },
        ];

        await expect(hasOffscreenPath("/offscreen.html")).resolves.toBe(true);
        await expect(hasOffscreenPath("/offscreen.html?mode=video#other")).resolves.toBe(true);
        await expect(hasOffscreenPath("other.html")).resolves.toBe(false);
    });
});
