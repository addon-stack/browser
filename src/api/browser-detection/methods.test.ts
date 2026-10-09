import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {
    BrowserFamily,
    BrowserGuessSource,
    BrowserName,
    guessBrowser,
    isBrowser,
    isBrowserFamily,
} from "./methods";

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

        expect(isBrowser(guess)).toBe(false);
        expect(isBrowser(guess, BrowserName.Edge)).toBe(true);
        expect(isBrowser(guess, BrowserName.Chrome, BrowserName.Edge)).toBe(true);
        expect(isBrowser(guess, BrowserName.Firefox)).toBe(false);
        expect(isBrowserFamily(guess, BrowserFamily.Chromium)).toBe(true);
        expect(isBrowserFamily(guess, BrowserFamily.Firefox)).toBe(false);
    });

    test.each([
        ["Microsoft Edge", BrowserName.Edge, BrowserFamily.Chromium],
        ["Opera", BrowserName.Opera, BrowserFamily.Chromium],
        ["Brave", BrowserName.Brave, BrowserFamily.Chromium],
        ["Vivaldi", BrowserName.Vivaldi, BrowserFamily.Chromium],
        ["Yandex", BrowserName.Yandex, BrowserFamily.Chromium],
        ["Arc", BrowserName.Arc, BrowserFamily.Chromium],
        ["Fennec", BrowserName.Firefox, BrowserFamily.Firefox],
        ["Safari", BrowserName.Safari, BrowserFamily.Safari],
        ["Google Chrome", BrowserName.Chrome, BrowserFamily.Chromium],
        ["Chromium", BrowserName.Chromium, BrowserFamily.Chromium],
        ["Custom Browser", BrowserName.Unknown, BrowserFamily.Unknown],
    ])("normalizes runtime name %s and keeps runtime information authoritative", async (rawName, name, family) => {
        harness.runtime.getBrowserInfo.setResult({name: rawName, vendor: "Vendor", version: "1.2", buildID: "build"});

        restoreGlobals = installBrowserGlobals(harness, {
            profile: "firefox", context: "none",
            globals: {navigator: {userAgentData: {brands: [{brand: "Microsoft Edge", version: "99"}]}}},
        });

        await expect(guessBrowser()).resolves.toEqual({name, family, rawName, vendor: "Vendor", version: "1.2", source: BrowserGuessSource.RuntimeBrowserInfo});
    });

    test("falls back to client hints when runtime.getBrowserInfo rejects", async () => {
        harness.runtime.getBrowserInfo.failNext(new Error("Unavailable"));

        restoreGlobals = installBrowserGlobals(harness, {
            profile: "firefox", context: "none",
            globals: {navigator: {userAgentData: {brands: [{brand: "Google Chrome", version: "126"}]}}},
        });

        await expect(guessBrowser()).resolves.toMatchObject({name: BrowserName.Chrome, source: BrowserGuessSource.UserAgentData});
    });

    test.each(["reject", "empty"] as const)("falls back to low entropy brands for %s high entropy hints", async mode => {
        const getHighEntropyValues = async () => {
            if (mode === "reject") throw new Error("Hints unavailable");

            return {fullVersionList: []};
        };

        restoreGlobals = installBrowserGlobals(harness, {
            profile: "chrome", context: "none",
            globals: {navigator: {userAgentData: {brands: [{brand: "Vivaldi", version: "7"}], getHighEntropyValues}}},
        });

        await expect(guessBrowser()).resolves.toMatchObject({name: BrowserName.Vivaldi, version: "7", source: BrowserGuessSource.UserAgentData});
    });

    test("prefers a specific brand over generic Chrome and Brave detection", async () => {
        const isBrave = jest.fn(async () => true);

        restoreGlobals = installBrowserGlobals(harness, {
            profile: "chrome", context: "none",
            globals: {navigator: {brave: {isBrave}, userAgentData: {brands: [
                {brand: "Google Chrome", version: "126"}, {brand: "Opera", version: "110"},
            ]}}},
        });

        await expect(guessBrowser()).resolves.toMatchObject({name: BrowserName.Opera, version: "110"});
        expect(isBrave).not.toHaveBeenCalled();
    });

    test.each(["false", "throw", "missing"] as const)("falls back to generic Chromium when Brave detection is %s", async mode => {
        const brave = mode === "missing" ? {} : {isBrave: async () => {
            if (mode === "throw") throw new Error("Brave unavailable");

            return false;
        }};

        restoreGlobals = installBrowserGlobals(harness, {
            profile: "chrome", context: "none",
            globals: {navigator: {brave, userAgentData: {brands: [{brand: "Chromium", version: "126"}]}}},
        });

        await expect(guessBrowser()).resolves.toEqual({name: BrowserName.Chromium, family: BrowserFamily.Chromium, rawName: "Chromium", version: "126", source: BrowserGuessSource.UserAgentData});
    });

    test("calls a synchronous Brave detector with its owning object", async () => {
        const brave = {isBrave() {
            expect(this).toBe(brave);

            return true;
        }};

        restoreGlobals = installBrowserGlobals(harness, {profile: "chrome", context: "none", globals: {navigator: {brave}}});
        await expect(guessBrowser()).resolves.toMatchObject({name: BrowserName.Brave, source: BrowserGuessSource.NavigatorBrave});
    });

    test.each([
        ["Chrome/126.0 OPR/110.1", BrowserName.Opera, "110.1"],
        ["Chrome/126.0 Vivaldi/7.1", BrowserName.Vivaldi, "7.1"],
        ["Chrome/126.0 YaBrowser/24.1", BrowserName.Yandex, "24.1"],
        ["Chrome/126.0 Arc/1.1", BrowserName.Arc, "1.1"],
        ["Firefox/126.0", BrowserName.Firefox, "126.0"],
        ["FxiOS/126.0", BrowserName.Firefox, "126.0"],
        ["Chrome/126.0 Safari/537.36", BrowserName.Chrome, "126.0"],
        ["CriOS/126.0", BrowserName.Chrome, "126.0"],
        ["Chromium/126.0", BrowserName.Chromium, "126.0"],
        ["Version/17.4 Safari/605.1.15", BrowserName.Safari, "17.4"],
    ])("reads the browser and version from %s", async (userAgent, name, version) => {
        restoreGlobals = installBrowserGlobals(harness, {profile: "chrome", context: "none", globals: {navigator: {userAgent}}});
        await expect(guessBrowser()).resolves.toMatchObject({name, version, source: BrowserGuessSource.UserAgent});
    });

    test.each([
        ["moz-extension://id/", BrowserName.Firefox, BrowserFamily.Firefox],
        ["safari-extension://id/", BrowserName.Safari, BrowserFamily.Safari],
        ["safari-web-extension://id/", BrowserName.Safari, BrowserFamily.Safari],
        ["https://example.test/", BrowserName.Unknown, BrowserFamily.Unknown],
        ["invalid URL", BrowserName.Unknown, BrowserFamily.Unknown],
    ])("uses the extension URL fallback for %s", async (url, name, family) => {
        harness.runtime.getURL.setResult(url);

        restoreGlobals = installBrowserGlobals(harness, {
            profile: "chrome", context: "none",
            globals: {navigator: {userAgent: "Unrecognized/1.0", userAgentData: {}}},
        });

        await expect(guessBrowser()).resolves.toEqual({name, family, source: name === BrowserName.Unknown ? BrowserGuessSource.Unknown : BrowserGuessSource.ExtensionUrl});
    });

    test("returns unknown when extension URL lookup throws", async () => {
        harness.runtime.getURL.failNext(new Error("URL unavailable"));
        restoreGlobals = installBrowserGlobals(harness, {profile: "chrome", context: "none", globals: {navigator: undefined}});
        await expect(guessBrowser()).resolves.toMatchObject({name: BrowserName.Unknown, source: BrowserGuessSource.Unknown});
    });
});
