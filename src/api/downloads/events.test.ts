import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

const item: chrome.downloads.DownloadItem = {
    id: 41,
    url: "https://download.example/file.zip",
    finalUrl: "https://download.example/file.zip",
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
};

const suggest = jest.fn<(suggestion?: chrome.downloads.FilenameSuggestion) => void>();

// Keep native payloads and public names independent of the generation description.
const events = [
    ["onDownloadsChanged", "onChanged", [{id: 41, state: {previous: "in_progress", current: "complete"}}] satisfies Parameters<Parameters<typeof api.onDownloadsChanged>[0]>],
    ["onDownloadsCreated", "onCreated", [item] satisfies Parameters<Parameters<typeof api.onDownloadsCreated>[0]>],
    ["onDownloadsDeterminingFilename", "onDeterminingFilename", [item, suggest] satisfies Parameters<Parameters<typeof api.onDownloadsDeterminingFilename>[0]>],
] as const;

describe.each(["chrome", "firefox"] as const)("downloads events in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile, captureListenerErrors: true});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each(events)("%s forwards native arguments and unsubscribes independently", async (name, eventName, args) => {
        const event = harness.configurable.active.downloads[eventName];
        const callback = jest.fn();
        const other = jest.fn();
        const unsubscribe = api[name](callback);
        const unsubscribeOther = api[name](other);
        const emit = event.emit as (...args: unknown[]) => Promise<void>;
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        await emit(...args);
        expect(callback.mock.calls).toEqual([[...args]]);
        args.forEach((arg, index) => expect(callback.mock.calls[0][index]).toBe(arg));

        unsubscribe();
        unsubscribe();
        expect(event.listenerCount()).toBe(1);
        await emit(...args);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(other).toHaveBeenCalledTimes(2);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("onDownloadsDeterminingFilename preserves true for a deferred suggestion", async () => {
        const suggestion: chrome.downloads.FilenameSuggestion = {filename: "archive.zip", conflictAction: "uniquify"};
        const respond = jest.fn<(suggestion?: chrome.downloads.FilenameSuggestion) => void>();
        let complete: () => void = () => undefined;

        const unsubscribe = api.onDownloadsDeterminingFilename((actualItem, actualSuggest) => {
            expect(actualItem).toBe(item);
            expect(actualSuggest).toBe(respond);

            complete = () => {
                actualSuggest(suggestion);
            };

            return true;
        });

        const listener = harness.configurable.active.downloads.onDeterminingFilename.registrations()[0].listener;
        expect(listener(item, respond)).toBe(true);
        expect(respond).not.toHaveBeenCalled();
        // Resume after the native listener has returned.
        await Promise.resolve();
        complete();
        expect(respond.mock.calls).toEqual([[suggestion]]);
        unsubscribe();
    });

    test("onDownloadsDeterminingFilename forwards a synchronous suggestion without arguments", () => {
        const respond = jest.fn<(suggestion?: chrome.downloads.FilenameSuggestion) => void>();
        const unsubscribe = api.onDownloadsDeterminingFilename((_item, actualSuggest) => actualSuggest());
        const listener = harness.configurable.active.downloads.onDeterminingFilename.registrations()[0].listener;
        expect(listener(item, respond)).toBeUndefined();
        expect(respond.mock.calls).toEqual([[]]);
        unsubscribe();
    });

    test.each(events)("%s preserves the callback Promise", async (name, eventName, args) => {
        const result = Promise.resolve("done");
        const unsubscribe = api[name](() => result);
        const listener = harness.configurable.active.downloads[eventName].registrations()[0].listener as (...args: unknown[]) => unknown;
        expect(listener(...args)).toBe(result);
        await expect(result).resolves.toBe("done");
        unsubscribe();
    });

    test.each(events)("%s keeps synchronous listener error handling", async (name, eventName, args) => {
        const error = new Error("Download listener failed");

        const unsubscribe = api[name](() => {
            throw error;
        });

        const emit = harness.configurable.active.downloads[eventName].emit as (...args: unknown[]) => Promise<void>;
        await expect(emit(...args)).resolves.toBeUndefined();
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "sync"}]);
        unsubscribe();
    });

    test.each(events)("%s preserves async listener rejections", async (name, eventName, args) => {
        const error = new Error("Async download listener failed");

        const unsubscribe = api[name](async () => {
            throw error;
        });

        const emit = harness.configurable.active.downloads[eventName].emit as (...args: unknown[]) => Promise<void>;
        await expect(emit(...args)).rejects.toBe(error);
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "promise"}]);
        unsubscribe();
    });

    test("resolves the API at subscription time and retains the original event for cleanup", () => {
        const first = harness.configurable.active.downloads.onCreated;
        const unsubscribeFirst = api.onDownloadsCreated(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const second = harness.configurable.active.downloads.onCreated;
        const unsubscribeSecond = api.onDownloadsCreated(() => undefined);
        unsubscribeFirst();
        expect(first.listenerCount()).toBe(0);
        expect(second.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
