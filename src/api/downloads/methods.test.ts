import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const url = "https://download.example/file.zip";

const createItem = (overrides: Partial<chrome.downloads.DownloadItem> = {}): chrome.downloads.DownloadItem => ({
    id: 41,
    url,
    finalUrl: url,
    referrer: "",
    filename: "/downloads/file.zip",
    mime: "application/zip",
    startTime: "2026-01-01T00:00:00.000Z",
    state: "in_progress",
    paused: false,
    canResume: false,
    danger: "safe",
    incognito: false,
    exists: true,
    bytesReceived: 0,
    totalBytes: 100,
    fileSize: 100,
    ...overrides,
});

const voidMethods = [
    ["acceptDanger", api.acceptDownloadDanger],
    ["cancel", api.cancelDownload],
    ["open", api.openDownload],
    ["pause", api.pauseDownload],
    ["removeFile", api.removeDownloadFile],
    ["resume", api.resumeDownload],
] as const;

describe.each(["chrome", "firefox"] as const)("downloads methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        harness.delays.downloadValidation.setResult(undefined);
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each(voidMethods)("%s forwards the download id and resolves without a value", async (name, invoke) => {
        const method = harness.configurable.active.downloads[name];
        method.setResult(undefined);
        await expect(invoke(41)).resolves.toBeUndefined();
        expect(method.calls).toHaveLength(1);
        expect(method.calls[0].args).toEqual([41]);
    });

    test.each([true, false])("setDownloadsUiOptions forwards enabled=%s", async enabled => {
        const method = harness.configurable.active.downloads.setUiOptions;
        method.setResult(undefined);
        await expect(api.setDownloadsUiOptions(enabled)).resolves.toBeUndefined();
        expect(method.calls[0].args).toEqual([{enabled}]);
    });

    test.each([{ids: [41, 42]}, {ids: []}])("eraseDownload preserves $ids and the query", async ({ids}) => {
        const query: chrome.downloads.DownloadQuery = {state: "complete"};
        const method = harness.configurable.active.downloads.erase;
        method.setResult(ids);
        await expect(api.eraseDownload(query)).resolves.toBe(ids);
        expect(method.calls[0].args).toEqual([query]);
        expect(method.calls[0].args[0]).toBe(query);
    });

    test.each(["data:image/png;base64,icon", undefined])("getDownloadFileIcon preserves %s", async result => {
        const options: chrome.downloads.GetFileIconOptions = {size: 32};
        const method = harness.configurable.active.downloads.getFileIcon;
        method.setResult(result);
        await expect(api.getDownloadFileIcon(41, options)).resolves.toBe(result);
        expect(method.calls[0].args).toEqual([41, options]);
        expect(method.calls[0].args[1]).toBe(options);
    });

    test.each([{items: [createItem()]}, {items: []}])("searchDownloads preserves $items and the original query", async ({items}) => {
        const query: chrome.downloads.DownloadQuery = {limit: 10, orderBy: ["-startTime"]};
        const method = harness.configurable.active.downloads.search;
        method.setResult(items);
        await expect(api.searchDownloads(query)).resolves.toBe(items);
        expect(method.calls[0].args).toEqual([query]);
        expect(method.calls[0].args[0]).toBe(query);
    });

    test.each([
        ...voidMethods.map(([name, invoke]) => [name, () => invoke(41)] as const),
        ["download", () => api.download({url})],
        ["erase", () => api.eraseDownload({id: 41})],
        ["getFileIcon", () => api.getDownloadFileIcon(41, {size: 32})],
        ["search", () => api.searchDownloads({id: 41})],
        ["setUiOptions", () => api.setDownloadsUiOptions(false)],
    ] as const)("%s propagates native errors", async (name, invoke) => {
        harness.configurable.active.downloads[name].failNext(new Error("Download access denied"));
        await expect(invoke()).rejects.toThrow("Download access denied");
        expect(harness.runtime.lastError).toBeUndefined();

        if (name === "download") {
            expect(harness.delays.downloadValidation.calls).toHaveLength(0);
            expect(harness.configurable.active.downloads.search.calls).toHaveLength(0);
        }
    });

    test("showDownloadFolder calls the native method without arguments", () => {
        const method = harness.configurable.active.downloads.showDefaultFolder;
        method.setResult(undefined);
        expect(api.showDownloadFolder()).toBeUndefined();
        expect(method.calls[0].args).toEqual([]);
    });

    test("showDownloadFolder preserves synchronous errors", () => {
        const error = new Error("Folder unavailable");
        harness.configurable.active.downloads.showDefaultFolder.failNext(error);
        expect(() => api.showDownloadFolder()).toThrow(error);
    });

    test("findDownload returns only the first result and queries the requested id", async () => {
        const item = createItem();
        harness.configurable.active.downloads.search.setResult([item, createItem({id: 42})]);
        await expect(api.findDownload(41)).resolves.toBe(item);
        expect(harness.configurable.active.downloads.search.calls[0].args).toEqual([{id: 41}]);
    });

    test("findDownload returns undefined when the item is missing", async () => {
        harness.configurable.active.downloads.search.setResult([]);
        await expect(api.findDownload(41)).resolves.toBeUndefined();
    });

    test.each([
        {items: [createItem()], exists: true, shown: true},
        {items: [createItem({exists: false})], exists: false, shown: false},
        {items: [], exists: undefined, shown: false},
    ])("isDownloadExists returns $exists and showDownload returns $shown", async ({items, exists, shown}) => {
        const native = harness.configurable.active.downloads;
        native.search.setResult(items);
        native.show.setResult(undefined);
        await expect(api.isDownloadExists(41)).resolves.toBe(exists);
        await expect(api.showDownload(41)).resolves.toBe(shown);
        expect(native.show.calls.map(call => call.args)).toEqual(shown ? [[41]] : []);
    });

    test("showDownload propagates a native show failure", async () => {
        const error = new Error("Cannot reveal file");
        harness.configurable.active.downloads.search.setResult([createItem()]);
        harness.configurable.active.downloads.show.failNext(error);
        await expect(api.showDownload(41)).rejects.toBe(error);
    });

    test.each(["in_progress", "interrupted", "complete"] as const)("getDownloadState returns %s and accepts id zero", async state => {
        harness.configurable.active.downloads.search.setResult([createItem({id: 0, state})]);
        await expect(api.getDownloadState(0)).resolves.toBe(state);
        expect(harness.configurable.active.downloads.search.calls[0].args).toEqual([{id: 0}]);
    });

    test("getDownloadState skips lookup without an id and preserves a missing item", async () => {
        await expect(api.getDownloadState()).resolves.toBeUndefined();
        expect(harness.configurable.active.downloads.search.calls).toHaveLength(0);
        harness.configurable.active.downloads.search.setResult([]);
        await expect(api.getDownloadState(41)).resolves.toBeUndefined();
    });

    test.each([
        ["findDownload", api.findDownload],
        ["isDownloadExists", api.isDownloadExists],
        ["getDownloadState", api.getDownloadState],
        ["showDownload", api.showDownload],
    ] as const)("%s propagates search errors", async (_name, invoke) => {
        harness.configurable.active.downloads.search.failNext(new Error("Lookup failed"));
        await expect(invoke(41)).rejects.toThrow("Lookup failed");
        expect(harness.configurable.active.downloads.show.calls).toHaveLength(0);
    });

    test.each([undefined, "overwrite"] as const)("download applies conflictAction=%s without mutating options", async conflictAction => {
        const options: chrome.downloads.DownloadOptions = {url, filename: "archive.zip", saveAs: true};

        if (conflictAction) options.conflictAction = conflictAction;

        const original = {...options};
        harness.configurable.active.downloads.download.setResult(41);
        harness.configurable.active.downloads.search.setResult([createItem()]);
        await expect(api.download(options)).resolves.toBe(41);

        expect(harness.configurable.active.downloads.download.calls[0].args).toEqual([
            {...original, conflictAction: conflictAction ?? "uniquify"},
        ]);

        expect(options).toEqual(original);

        expect(harness.calls.map(call => call.api)).toEqual([
            "downloads.download", "delays.downloadValidation", "downloads.search",
        ]);

        expect(harness.delays.downloadValidation.calls[0].args).toEqual([100]);
        expect(harness.configurable.active.downloads.search.calls[0].args).toEqual([{id: 41}]);
    });

    test.each([undefined, null, "41"])("download rejects an invalid native id %s before validation", async id => {
        harness.configurable.active.downloads.download.setResult(id as unknown as number);
        await expect(api.download({url})).rejects.toThrow("Download id not created");
        expect(harness.delays.downloadValidation.calls).toHaveLength(0);
        expect(harness.configurable.active.downloads.search.calls).toHaveLength(0);
    });

    test.each([
        {items: [], message: "Download item not found after created", blocked: true},
        {items: [createItem({state: "interrupted", error: "USER_CANCELED"})], message: "Requires user permission to upload", blocked: true},
        {items: [createItem({state: "interrupted", error: "NETWORK_FAILED"})], message: "Download error: NETWORK_FAILED", blocked: false},
    ])("download preserves error classification: $message", async ({items, message, blocked}) => {
        harness.configurable.active.downloads.download.setResult(41);
        harness.configurable.active.downloads.search.setResult(items);
        const pending = api.download({url});
        await expect(pending).rejects.toBeInstanceOf(Error);
        await expect(pending).rejects.toHaveProperty("message", message);

        if (blocked) await expect(pending).rejects.toBeInstanceOf(api.BlockDownloadError);
        else await expect(pending).rejects.not.toBeInstanceOf(api.BlockDownloadError);
    });

    test("download propagates a validation delay failure without searching", async () => {
        const error = new Error("Validation failed");
        harness.configurable.active.downloads.download.setResult(41);
        harness.delays.downloadValidation.failNext(error);
        await expect(api.download({url})).rejects.toBe(error);
        expect(harness.configurable.active.downloads.search.calls).toHaveLength(0);
    });

    test("download propagates search errors after validation", async () => {
        harness.configurable.active.downloads.download.setResult(41);
        harness.configurable.active.downloads.search.failNext(new Error("Validation lookup failed"));
        await expect(api.download({url})).rejects.toThrow("Validation lookup failed");
        expect(harness.delays.downloadValidation.calls).toHaveLength(1);
    });

    test("download accepts id zero and a completed item", async () => {
        harness.configurable.active.downloads.download.setResult(0);
        harness.configurable.active.downloads.search.setResult([createItem({id: 0, state: "complete"})]);
        await expect(api.download({url})).resolves.toBe(0);
    });

    test("resolves the downloads API when a method is called", async () => {
        const first = harness.configurable.active.downloads.search;
        first.setResult([]);
        await api.searchDownloads({id: 1});
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const second = harness.configurable.active.downloads.search;
        second.setResult([]);
        await api.searchDownloads({id: 2});
        expect(first.calls.map(call => call.args)).toEqual([[{id: 1}]]);
        expect(second.calls.map(call => call.args)).toEqual([[{id: 2}]]);
    });
});
