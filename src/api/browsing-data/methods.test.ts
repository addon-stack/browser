import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const removals = [
    ["removeAppcache", api.removeAppcacheData],
    ["removeCache", api.removeCacheData],
    ["removeCacheStorage", api.removeCacheStorageData],
    ["removeCookies", api.removeCookiesData],
    ["removeDownloads", api.removeDownloadsData],
    ["removeFileSystems", api.removeFileSystemsData],
    ["removeFormData", api.removeFormData],
    ["removeHistory", api.removeHistoryData],
    ["removeIndexedDB", api.removeIndexedDBData],
    ["removeLocalStorage", api.removeLocalStorageData],
    ["removePasswords", api.removePasswordsData],
    ["removeServiceWorkers", api.removeServiceWorkersData],
    ["removeWebSQL", api.removeWebSQLData],
] as const;

describe.each(["chrome", "firefox"] as const)("browsing-data methods in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test.each(removals)("%s forwards options and defaults to an empty object", async (name, invoke) => {
        const method = harness.configurable.active.browsingData[name];
        const options: chrome.browsingData.RemovalOptions = {since: 123, origins: ["https://example.test"]};
        method.setResult(undefined);
        await expect(invoke(options)).resolves.toBeUndefined();
        await expect(invoke()).resolves.toBeUndefined();
        expect(method.calls.map(call => call.args)).toEqual([[options], [{}]]);
        expect(method.calls[0].args[0]).toBe(options);
    });

    test("removeBrowsingData forwards both options and the selected data types", async () => {
        const options = {since: 123};
        const data = {cache: true, cookies: false};
        const method = harness.configurable.active.browsingData.remove;
        method.setResult(undefined);
        await expect(api.removeBrowsingData(options, data)).resolves.toBeUndefined();
        expect(method.calls[0].args).toEqual([options, data]);
        expect(method.calls[0].args[0]).toBe(options);
        expect(method.calls[0].args[1]).toBe(data);
    });

    test("getBrowsingDataSettings preserves native settings", async () => {
        const result: chrome.browsingData.SettingsResult = {
            options: {since: 0}, dataToRemove: {cache: true}, dataRemovalPermitted: {cache: false},
        };

        const method = harness.configurable.active.browsingData.settings;
        method.setResult(result);
        await expect(api.getBrowsingDataSettings()).resolves.toBe(result);
        expect(method.calls[0].args).toEqual([]);
    });

    test.each([
        ...removals.map(([name, invoke]) => [name, () => invoke()] as const),
        ["remove", () => api.removeBrowsingData({}, {cache: true})],
        ["settings", api.getBrowsingDataSettings],
    ] as const)("%s propagates native failures", async (name, invoke) => {
        harness.configurable.active.browsingData[name].failNext(new Error("Removal denied"));
        await expect(invoke()).rejects.toThrow("Removal denied");
        expect(harness.runtime.lastError).toBeUndefined();
    });
});
