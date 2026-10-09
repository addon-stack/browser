import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {addHistoryUrl, deleteAllHistory, deleteHistoryUrl, deleteRangeHistory, getHistoryVisits, searchHistory} from "./methods";

const url = "https://example.test/";

describe.each(["chrome", "firefox"] as const)("history methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const native = harness.configurable.active.history;
        native.addUrl.setResult(undefined);
        native.deleteUrl.setResult(undefined);
        native.deleteRange.setResult(undefined);
        native.deleteAll.setResult(undefined);
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("add and delete methods adapt URLs and preserve range/details objects", async () => {
        const native = harness.configurable.active.history;
        const details = {url};
        const range = {startTime: 0, endTime: 100};
        await expect(addHistoryUrl(url)).resolves.toBeUndefined();
        await expect(deleteHistoryUrl(details)).resolves.toBeUndefined();
        await expect(deleteRangeHistory(range)).resolves.toBeUndefined();
        await expect(deleteAllHistory()).resolves.toBeUndefined();
        expect(native.addUrl.calls[0].args).toEqual([{url}]);
        expect(native.deleteUrl.calls[0].args[0]).toBe(details);
        expect(native.deleteRange.calls[0].args[0]).toBe(range);
        expect(native.deleteAll.calls[0].args).toEqual([]);
    });

    test("getHistoryVisits wraps the URL and searchHistory preserves the query", async () => {
        const native = harness.configurable.active.history;

        const visits: chrome.history.VisitItem[] = [{
            id: "history-1", visitId: "visit-1", referringVisitId: "0", transition: "link", isLocal: true,
        }];

        const items = [{id: "history-1", url, title: "Example"}];
        const query = {text: "Example", startTime: 0, maxResults: 5};
        native.getVisits.setResult(visits);
        native.search.setResult(items);
        await expect(getHistoryVisits(url)).resolves.toBe(visits);
        await expect(searchHistory(query)).resolves.toBe(items);
        expect(native.getVisits.calls[0].args).toEqual([{url}]);
        expect(native.search.calls[0].args[0]).toBe(query);
    });

    test.each([
        ["addUrl", () => addHistoryUrl(url)],
        ["deleteUrl", () => deleteHistoryUrl({url})],
        ["deleteRange", () => deleteRangeHistory({startTime: 0, endTime: 100})],
        ["deleteAll", () => deleteAllHistory()],
        ["getVisits", () => getHistoryVisits(url)],
        ["search", () => searchHistory({text: ""})],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.configurable.active.history[name].failNext(new Error("History access denied"));
        await expect(invoke()).rejects.toThrow("History access denied");
    });
});
