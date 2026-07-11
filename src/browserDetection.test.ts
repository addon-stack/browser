import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {
    BrowserFamily,
    BrowserGuessSource,
    BrowserName,
    guessBrowser,
    isBrowser,
    isBrowserFamily,
} from "./browserDetection";

describe("browser detection", () => {
    let originalBrowser: any;
    let originalChrome: any;
    let originalNavigatorDescriptor: PropertyDescriptor | undefined;
    let originalOprDescriptor: PropertyDescriptor | undefined;
    let originalSafariDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalBrowser = globalThis.browser;
        originalChrome = globalThis.chrome;
        originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
        originalOprDescriptor = Object.getOwnPropertyDescriptor(globalThis, "opr");
        originalSafariDescriptor = Object.getOwnPropertyDescriptor(globalThis, "safari");

        delete (globalThis as any).browser;
        delete (globalThis as any).chrome;
        delete (globalThis as any).navigator;
        delete (globalThis as any).opr;
        delete (globalThis as any).safari;
    });

    afterEach(() => {
        (globalThis as any).browser = originalBrowser;
        globalThis.chrome = originalChrome;
        restoreGlobalProperty("navigator", originalNavigatorDescriptor);
        restoreGlobalProperty("opr", originalOprDescriptor);
        restoreGlobalProperty("safari", originalSafariDescriptor);
        jest.resetAllMocks();
    });

    const setGlobalProperty = (name: string, value: any): void => {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            value,
            writable: true,
        });
    };

    const restoreGlobalProperty = (name: string, descriptor: PropertyDescriptor | undefined): void => {
        if (descriptor) {
            Object.defineProperty(globalThis, name, descriptor);

            return;
        }

        delete (globalThis as any)[name];
    };

    test("guesses Firefox using runtime.getBrowserInfo", async () => {
        const getBrowserInfo = jest.fn(() =>
            Promise.resolve({buildID: "20260708000000", name: "Firefox", vendor: "Mozilla", version: "126.0"})
        );
        (globalThis as any).browser = {
            runtime: {
                getBrowserInfo,
                id: "firefox-extension-id",
            },
        };

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Firefox,
            name: BrowserName.Firefox,
            rawName: "Firefox",
            source: BrowserGuessSource.RuntimeBrowserInfo,
            vendor: "Mozilla",
            version: "126.0",
        });
        expect(getBrowserInfo).toHaveBeenCalledTimes(1);
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
        setGlobalProperty("navigator", {
            userAgentData: {
                brands: [
                    {brand: "Chromium", version: "126"},
                    {brand: "Microsoft Edge", version: "126"},
                ],
                getHighEntropyValues,
            },
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
        setGlobalProperty("navigator", {
            brave: {isBrave},
            userAgentData: {
                brands: [{brand: "Chromium", version: "126"}],
            },
        });

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Chromium,
            name: BrowserName.Brave,
            source: BrowserGuessSource.NavigatorBrave,
        });
        expect(isBrave).toHaveBeenCalledTimes(1);
    });

    test("guesses Edge using navigator.userAgent fallback", async () => {
        setGlobalProperty("navigator", {
            userAgent:
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.87",
        });

        await expect(guessBrowser()).resolves.toMatchObject({
            family: BrowserFamily.Chromium,
            name: BrowserName.Edge,
            source: BrowserGuessSource.UserAgent,
            version: "126.0.2592.87",
        });
    });

    test("falls back to Chromium for chrome-extension urls", async () => {
        const getURL = jest.fn((_path: string) => "chrome-extension://extension-id/");
        globalThis.chrome = {
            runtime: {
                getURL,
                id: "extension-id",
            },
        } as any;

        await expect(guessBrowser()).resolves.toEqual({
            family: BrowserFamily.Chromium,
            name: BrowserName.Chromium,
            source: BrowserGuessSource.ExtensionUrl,
        });
        expect(getURL).toHaveBeenCalledWith("");
    });

    test("returns unknown when no browser signals are available", async () => {
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
