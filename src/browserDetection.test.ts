import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {
    BrowserFamily,
    BrowserGuessSource,
    BrowserName,
    guessBrowser,
    isBrowser,
    isBrowserFamily,
} from "./browserDetection";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "./testing";

describe("browser detection", () => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void = () => undefined;

    beforeEach(() => {
        harness = createBrowserHarness();
    });

    afterEach(() => {
        restoreGlobals();
        restoreGlobals = () => undefined;
        jest.restoreAllMocks();
    });

    test("guesses Firefox using runtime.getBrowserInfo from the Firefox facade", async () => {
        harness.runtime.getBrowserInfo.setResult({
            buildID: "20260708000000",
            name: "Firefox",
            vendor: "Mozilla",
            version: "126.0",
        });
        restoreGlobals = installBrowserGlobals(harness, {context: "none", profile: "firefox"});

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Firefox,
            name: BrowserName.Firefox,
            rawName: "Firefox",
            source: BrowserGuessSource.RuntimeBrowserInfo,
            vendor: "Mozilla",
            version: "126.0",
        });
        expect(harness.runtime.getBrowserInfo.calls).toMatchObject([
            {args: [], callback: undefined, invocation: "promise"},
        ]);
    });

    test("guesses Edge using userAgentData fullVersionList", async () => {
        const getHighEntropyValues = jest.fn((_hints: string[]) =>
            Promise.resolve({
                fullVersionList: [
                    {brand: "Chromium", version: "126.0.0.0"},
                    {brand: "Microsoft Edge", version: "126.0.2592.87"},
                ],
            })
        );
        restoreGlobals = installBrowserGlobals(harness, {
            context: "none",
            globals: {
                navigator: {
                    userAgentData: {
                        brands: [
                            {brand: "Chromium", version: "126"},
                            {brand: "Microsoft Edge", version: "126"},
                        ],
                        getHighEntropyValues,
                    },
                },
            },
            profile: "chrome",
        });

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Chromium,
            name: BrowserName.Edge,
            rawName: "Microsoft Edge",
            source: BrowserGuessSource.UserAgentData,
            version: "126.0.2592.87",
        });
        expect(getHighEntropyValues).toHaveBeenCalledWith(["fullVersionList"]);
    });

    test("guesses Brave before generic Chromium brands", async () => {
        const isBrave = jest.fn(() => Promise.resolve(true));
        restoreGlobals = installBrowserGlobals(harness, {
            context: "none",
            globals: {
                navigator: {
                    brave: {isBrave},
                    userAgentData: {brands: [{brand: "Chromium", version: "126"}]},
                },
            },
            profile: "chrome",
        });

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Chromium,
            name: BrowserName.Brave,
            source: BrowserGuessSource.NavigatorBrave,
        });
        expect(isBrave).toHaveBeenCalledTimes(1);
    });

    test("guesses Edge using navigator.userAgent fallback", async () => {
        restoreGlobals = installBrowserGlobals(harness, {
            context: "none",
            globals: {
                navigator: {
                    userAgent:
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.87",
                },
            },
            profile: "chrome",
        });

        await expect(guessBrowser()).resolves.toMatchObject({
            family: BrowserFamily.Chromium,
            name: BrowserName.Edge,
            source: BrowserGuessSource.UserAgent,
            version: "126.0.2592.87",
        });
    });

    test("uses the Opera vendor marker when navigator hints are unavailable", async () => {
        restoreGlobals = installBrowserGlobals(harness, {
            context: "none",
            globals: {navigator: {}},
            profile: "opera",
        });

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Chromium,
            name: BrowserName.Opera,
            source: BrowserGuessSource.BrowserGlobal,
        });
        expect(globalThis.opr).toBeDefined();
        expect(globalThis.safari).toBeUndefined();
    });

    test("uses the Safari vendor marker and removes the Opera marker", async () => {
        restoreGlobals = installBrowserGlobals(harness, {
            context: "none",
            globals: {navigator: {}},
            profile: "safari",
        });

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Safari,
            name: BrowserName.Safari,
            source: BrowserGuessSource.BrowserGlobal,
        });
        expect(globalThis.safari).toBeDefined();
        expect(globalThis.opr).toBeUndefined();
    });

    test("falls back to Chromium for chrome-extension urls", async () => {
        restoreGlobals = installBrowserGlobals(harness, {
            context: "none",
            globals: {navigator: {}},
            profile: "chrome",
        });

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Chromium,
            name: BrowserName.Chromium,
            source: BrowserGuessSource.ExtensionUrl,
        });
        expect(harness.runtime.getURL.calls[0]?.args).toEqual([""]);
        expect("getBrowserInfo" in globalThis.chrome.runtime).toBe(false);
    });

    test("returns unknown when a custom profile removes all browser signals", async () => {
        restoreGlobals = installBrowserGlobals(harness, {
            context: "none",
            globals: {
                browser: undefined,
                chrome: undefined,
                navigator: undefined,
                opr: undefined,
                safari: undefined,
            },
            profile: "custom",
        });

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Unknown,
            name: BrowserName.Unknown,
            source: BrowserGuessSource.Unknown,
        });
    });

    test("checks browser names and families", () => {
        const guess = {
            family: BrowserFamily.Chromium,
            name: BrowserName.Edge,
            source: BrowserGuessSource.UserAgent,
        };

        expect(isBrowser(guess, BrowserName.Edge)).toBe(true);
        expect(isBrowser(guess, BrowserName.Chrome, BrowserName.Edge)).toBe(true);
        expect(isBrowser(guess, BrowserName.Firefox)).toBe(false);
        expect(isBrowserFamily(guess, BrowserFamily.Chromium)).toBe(true);
        expect(isBrowserFamily(guess, BrowserFamily.Firefox)).toBe(false);
    });
});
