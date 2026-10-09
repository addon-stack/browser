import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "../../../tests/api/availability";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const node: chrome.bookmarks.BookmarkTreeNode = {
    id: "node-1", parentId: "folder-1", index: 0, title: "Example", url: "https://example.test/",
    syncing: false, type: "bookmark", dateAdded: 123, dateLastUsed: 456,
};

const nodes = [node];
const ids: [string, ...string[]] = [node.id, "node-2"];
const details = Object.freeze({title: "Example", url: node.url, parentId: "folder-1", index: 0});
const changes = Object.freeze({title: "Changed", url: "https://changed.test/"});
const destination = Object.freeze({parentId: "folder-2", index: 1});
const query = Object.freeze({query: "Example", title: "Example", url: node.url});

const calls = [
    ["get", () => api.getBookmarks(node.id), [node.id], nodes],
    ["get", () => api.getBookmarks(ids), [ids], nodes],
    ["getTree", () => api.getBookmarkTree(), [], nodes],
    ["getSubTree", () => api.getBookmarkSubTree(node.id), [node.id], nodes],
    ["getChildren", () => api.getBookmarkChildren("folder-1"), ["folder-1"], nodes],
    ["getRecent", () => api.getRecentBookmarks(7), [7], nodes],
    ["search", () => api.searchBookmarks("Example"), ["Example"], nodes],
    ["search", () => api.searchBookmarks(query), [query], nodes],
    ["create", () => api.createBookmark(details), [details], node],
    ["update", () => api.updateBookmark(node.id, changes), [node.id, changes], node],
    ["move", () => api.moveBookmark(node.id, destination), [node.id, destination], node],
    ["remove", () => api.removeBookmark(node.id), [node.id], undefined],
    ["removeTree", () => api.removeBookmarkTree("folder-1"), ["folder-1"], undefined],
] as const;

describe.each(["chrome", "firefox"] as const)("bookmarks methods in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test.each(calls)("%s preserves native arguments, result shape and fields", async (method, invoke, args, result) => {
        const native = harness.configurable.active.bookmarks[method];
        native.setResult(result as never);
        await expect(invoke()).resolves.toBe(result);
        expect(native.calls).toHaveLength(1);
        expect(native.calls[0].args).toEqual(args);
        args.forEach((arg, index) => expect(native.calls[0].args[index]).toBe(arg));
    });

    test.each(calls.map(([method, invoke]) => [method, invoke] as const))("%s propagates native failures", async (method, invoke) => {
        harness.configurable.active.bookmarks[method].failNext(new Error("Bookmarks access denied"));
        await expect(invoke()).rejects.toThrow("Bookmarks access denied");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("preserves folder creation and Firefox separator options", async () => {
        const native = harness.configurable.active.bookmarks.create;
        const folder = {title: "Folder", parentId: "parent"};
        const separator: chrome.bookmarks.CreateDetails = {parentId: "parent", type: "separator"};
        native.setResult(node);
        await api.createBookmark(folder);
        await api.createBookmark(separator);
        expect(native.calls.map(call => call.args)).toEqual([[folder], [separator]]);
    });

    test("does not replace empty lists or cache results", async () => {
        const empty: chrome.bookmarks.BookmarkTreeNode[] = [];
        harness.configurable.active.bookmarks.search.setResult(empty);
        await expect(api.searchBookmarks("missing")).resolves.toBe(empty);
        harness.configurable.active.bookmarks.search.setResult(nodes);
        await expect(api.searchBookmarks("missing")).resolves.toBe(nodes);
    });
});

describe("bookmarks invocation boundaries", () => {
    let restore: () => void;

    beforeEach(() => {
        restore = installAvailabilityGlobals();
    });

    afterEach(() => restore());

    test.each(calls.map(([method, invoke]) => [method, invoke] as const))("%s rejects without extension globals", async (_method, invoke) => {
        await expect(invoke()).rejects.toThrow("WebExtension API not available");
    });

    test("waits for callbacks and retains the native receiver", async () => {
        let complete!: (value: chrome.bookmarks.BookmarkTreeNode[]) => void;

        const bookmarks = {get: jest.fn(function (this: unknown, id: string, callback: typeof complete) {
            expect(this).toBe(bookmarks);
            expect(id).toBe(node.id);
            complete = callback;
        })};

        restore();
        restore = installAvailabilityGlobals({chrome: {runtime: {}, bookmarks}});
        const pending = api.getBookmarks(node.id);
        expect(bookmarks.get).toHaveBeenCalledTimes(1);
        complete(nodes);
        await expect(pending).resolves.toBe(nodes);
    });

    test("supports Promise completion and preserves rejections", async () => {
        const error = new Error("Context invalidated");
        const get = jest.fn<() => Promise<chrome.bookmarks.BookmarkTreeNode[]>>();
        get.mockResolvedValueOnce(nodes).mockRejectedValueOnce(error);
        restore();
        restore = installAvailabilityGlobals({browser: {runtime: {id: "firefox"}, bookmarks: {get}}});
        await expect(api.getBookmarks(node.id)).resolves.toBe(nodes);
        await expect(api.getBookmarks(node.id)).rejects.toBe(error);
    });

    test.each(["namespace", "method", "invocation"])("preserves synchronous %s failures as rejections", async level => {
        const error = new Error("Invalid native call");

        const fail = () => {
            throw error;
        };

        const bookmarks = {get: fail};
        const chrome = {runtime: {}, bookmarks};

        if (level === "namespace") {
            Object.defineProperty(chrome, "bookmarks", {get: fail});
        } else if (level === "method") {
            Object.defineProperty(bookmarks, "get", {get: fail});
        }

        restore();
        restore = installAvailabilityGlobals({chrome});
        await expect(api.getBookmarks(node.id)).rejects.toBe(error);
    });
});
