import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {getAllCookie, getAllCookieStores, getCookie, getCookiePartitionKey, removeCookie, setCookie} from "./methods";

const cookie: chrome.cookies.Cookie = {
    name: "session", value: "value", domain: "example.test", path: "/", storeId: "0",
    session: true, hostOnly: true, httpOnly: true, secure: true, sameSite: "lax",
};

const details = {url: "https://example.test/", name: "session", storeId: "0"};

describe.each(["chrome", "firefox"] as const)("cookies methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("get and set preserve cookie results, null and input details", async () => {
        const native = harness.configurable.active.cookies;
        const options = {...details, value: "new-value", partitionKey: {topLevelSite: "https://example.test"}};
        native.get.queueResult(cookie, null);
        native.set.queueResult(cookie, null);
        await expect(getCookie(details)).resolves.toBe(cookie);
        await expect(getCookie(details)).resolves.toBeNull();
        await expect(setCookie(options)).resolves.toBe(cookie);
        await expect(setCookie(options)).resolves.toBeNull();
        expect(native.get.calls.map(call => call.args)).toEqual([[details], [details]]);
        expect(native.set.calls.map(call => call.args)).toEqual([[options], [options]]);
        expect(native.set.calls[0].args[0]).toBe(options);
    });

    test("getAll forwards filters and defaults to an empty object", async () => {
        const method = harness.configurable.active.cookies.getAll;
        const cookies = [cookie];
        method.setResult(cookies);
        await expect(getAllCookie(details)).resolves.toBe(cookies);
        await expect(getAllCookie()).resolves.toBe(cookies);
        expect(method.calls.map(call => call.args)).toEqual([[details], [{}]]);
    });

    test("getAllCookieStores preserves stores and removeCookie forwards details", async () => {
        const native = harness.configurable.active.cookies;
        const stores = [{id: "0", tabIds: [7]}];
        native.getAllCookieStores.setResult(stores);

        native.remove.setImplementation(async (_details: chrome.cookies.CookieDetails, callback?: (result: chrome.cookies.CookieDetails) => void) => {
            callback?.(details);

            return details;
        });

        await expect(getAllCookieStores()).resolves.toBe(stores);
        await expect(removeCookie(details)).resolves.toBe(details);
        expect(native.getAllCookieStores.calls[0].args).toEqual([]);
        expect(native.remove.calls[0].args[0]).toBe(details);
    });

    test("getCookiePartitionKey unwraps the native result and preserves frame selectors", async () => {
        const method = harness.configurable.active.cookies.getPartitionKey;
        const frame = {tabId: 7, frameId: 0, documentId: "document-1"};
        const partitionKey = {topLevelSite: "https://example.test", hasCrossSiteAncestor: false};
        method.setResult({partitionKey});
        await expect(getCookiePartitionKey(frame)).resolves.toBe(partitionKey);
        expect(method.calls[0].args[0]).toBe(frame);
    });

    test.each([
        ["get", () => getCookie(details)],
        ["getAll", () => getAllCookie()],
        ["getAllCookieStores", () => getAllCookieStores()],
        ["remove", () => removeCookie(details)],
        ["set", () => setCookie(details)],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.configurable.active.cookies[name].failNext(new Error("Cookie access denied"));
        await expect(invoke()).rejects.toThrow("Cookie access denied");
    });
});
