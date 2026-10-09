import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserTestApi, installGlobals} from "../../testing";
import {clearBadgeText, getBadgeText, getDefaultPopup, setBadgeText, setBadgeTextColor} from "./methods";

describe.each([2, 3])("action methods in MV%s", version => {
    let restoreGlobals: () => void;
    let lastError: chrome.runtime.LastError | undefined;
    const modernGet = jest.fn<(details: unknown, callback: (text: string) => void) => void>();
    const legacyGet = jest.fn<(details: unknown, callback: (text: string) => void) => void>();
    const modernSet = jest.fn<(details: unknown, callback: () => void) => void>();
    const legacySet = jest.fn<(details: unknown, callback: () => void) => void>();
    const setColor = jest.fn<(details: unknown, callback: () => void) => void>();

    beforeEach(() => {
        lastError = undefined;
        modernGet.mockImplementation((_details, callback) => callback("modern"));
        legacyGet.mockImplementation((_details, callback) => callback("legacy"));
        modernSet.mockImplementation((_details, callback) => callback());
        legacySet.mockImplementation((_details, callback) => callback());
        setColor.mockImplementation((_details, callback) => callback());

        const native = {
            runtime: {
                get lastError() {
                    return lastError;
                },
                getManifest: () => ({
                    manifest_version: version,
                    action: {default_popup: "modern.html"},
                    browser_action: {default_popup: "legacy.html"},
                }),
            },
            action: {getBadgeText: modernGet, setBadgeText: modernSet, setBadgeTextColor: setColor},
            browserAction: {getBadgeText: legacyGet, setBadgeText: legacySet},
        } as unknown as BrowserTestApi;

        restoreGlobals = installGlobals({chrome: native, browser: undefined});
    });

    afterEach(() => {
        restoreGlobals();
        jest.resetAllMocks();
    });

    test("routes native calls and default popup lookup through the selected manifest version", async () => {
        const selected = version === 3 ? modernGet : legacyGet;
        const other = version === 3 ? legacyGet : modernGet;
        await expect(getBadgeText(7)).resolves.toBe(version === 3 ? "modern" : "legacy");
        expect(selected).toHaveBeenCalledWith({tabId: 7}, expect.any(Function));
        expect(other).not.toHaveBeenCalled();
        expect(getDefaultPopup()).toBe(version === 3 ? "modern.html" : "legacy.html");
    });

    test("normalizes badge text and clears it using the selected native API", async () => {
        const selected = version === 3 ? modernSet : legacySet;
        const other = version === 3 ? legacySet : modernSet;
        await setBadgeText(123, 7);
        await clearBadgeText(7);
        expect(selected.mock.calls.map(([details]) => details)).toEqual([{tabId: 7, text: "123"}, {tabId: 7, text: ""}]);
        expect(other).not.toHaveBeenCalled();
    });

    test("setBadgeTextColor calls the modern API only in MV3", async () => {
        await expect(setBadgeTextColor("#fff", 7)).resolves.toBeUndefined();

        if (version === 3) {
            expect(setColor).toHaveBeenCalledWith({color: "#fff", tabId: 7}, expect.any(Function));
        } else {
            expect(setColor).not.toHaveBeenCalled();
        }
    });

    test("preserves native callback errors", async () => {
        lastError = {message: "Action access denied"};
        await expect(getBadgeText()).rejects.toThrow("Action access denied");
    });
});
