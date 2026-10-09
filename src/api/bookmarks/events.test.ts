import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

const node: chrome.bookmarks.BookmarkTreeNode = {id: "node", title: "Example", syncing: false};

// Independent of the codegen description; Firefox's portable events are listed first.
const events = [
    ["onBookmarkCreated", "onCreated", [node.id, node] satisfies Parameters<Parameters<typeof api.onBookmarkCreated>[0]>],
    ["onBookmarkRemoved", "onRemoved", [node.id, {parentId: "parent", index: 0, node}] satisfies Parameters<Parameters<typeof api.onBookmarkRemoved>[0]>],
    ["onBookmarkChanged", "onChanged", [node.id, {title: "Changed", url: "https://example.test/"}] satisfies Parameters<Parameters<typeof api.onBookmarkChanged>[0]>],
    ["onBookmarkMoved", "onMoved", [node.id, {parentId: "parent", oldParentId: "old", index: 0, oldIndex: 1}] satisfies Parameters<Parameters<typeof api.onBookmarkMoved>[0]>],
    ["onBookmarkChildrenReordered", "onChildrenReordered", ["parent", {childIds: ["b", "a"]}] satisfies Parameters<Parameters<typeof api.onBookmarkChildrenReordered>[0]>],
    ["onBookmarksImportBegan", "onImportBegan", [] satisfies Parameters<Parameters<typeof api.onBookmarksImportBegan>[0]>],
    ["onBookmarksImportEnded", "onImportEnded", [] satisfies Parameters<Parameters<typeof api.onBookmarksImportEnded>[0]>],
] as const;

describe.each(["chrome", "firefox"] as const)("bookmarks events in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;
    const supported = profile === "firefox" ? events.slice(0, 4) : events;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile, captureListenerErrors: true});

        if (profile === "firefox") {
            for (const [, name] of events.slice(4)) {
                Reflect.deleteProperty(harness.browser.bookmarks, name);
            }
        }
    });

    afterEach(() => restore());

    test.each(supported)("%s forwards payloads and unsubscribes independently", async (name, eventName, args) => {
        const event = harness.configurable.active.bookmarks[eventName];
        const callback = jest.fn();
        const other = jest.fn();
        const off = api[name](callback);
        const offOther = api[name](other);
        const emit = event.emit as (...args: unknown[]) => Promise<void>;
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        await emit(...args);
        expect(callback.mock.calls).toEqual([[...args]]);
        args.forEach((arg, index) => expect(callback.mock.calls[0][index]).toBe(arg));
        off();
        off();
        await emit(...args);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(other).toHaveBeenCalledTimes(2);
        offOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("contains sync errors and observes async callback failures", async () => {
        const error = new Error("Bookmark listener failed");

        const off = api.onBookmarkCreated(() => {
            throw error;
        });

        await expect(harness.configurable.active.bookmarks.onCreated.emit(node.id, node)).resolves.toBeUndefined();
        off();

        const offAsync = api.onBookmarkCreated(async () => {
            throw error;
        });

        await expect(harness.configurable.active.bookmarks.onCreated.emit(node.id, node)).rejects.toBe(error);
        offAsync();
        expect(harness.listenerErrors.entries.map(entry => entry.kind)).toEqual(["sync", "promise"]);
    });

    test("cleanup retains the original event when globals change", () => {
        const first = harness.configurable.active.bookmarks.onCreated;
        const off = api.onBookmarkCreated(() => undefined);
        restore();
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
        const second = harness.configurable.active.bookmarks.onCreated;
        const offSecond = api.onBookmarkCreated(() => undefined);
        off();
        expect(first.listenerCount()).toBe(0);
        expect(second.listenerCount()).toBe(1);
        offSecond();
    });

    if (profile === "firefox") {
        test("preserves a URL-only change without inventing a title", async () => {
            const callback = jest.fn();
            const off = api.onBookmarkChanged(callback);
            const info = {url: "https://example.test/changed"};
            // The raw harness follows Chrome's type, whereas Firefox omits title here.
            const emit = harness.configurable.active.bookmarks.onChanged.emit as (...args: unknown[]) => Promise<void>;
            await emit(node.id, info);
            expect(callback.mock.calls).toEqual([[node.id, info]]);
            expect(callback.mock.calls[0][1]).toBe(info);
            expect(info).not.toHaveProperty("title");
            off();
        });

        test.each(events.slice(4).map(([name]) => name))("%s does not invent an unsupported event", name => {
            expect(() => api[name](() => undefined)).toThrow(TypeError);
        });
    }
});
