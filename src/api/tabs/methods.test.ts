import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, createTabFixture, installBrowserGlobals, installGlobals} from "../../testing";
import * as api from "./methods";

const url = "https://example.test/existing";

describe.each(["chrome", "firefox"] as const)("tab methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("queryTabs accepts an omitted filter and returns all tabs", async () => {
        const tabs = [createTabFixture({id: 7, index: 0}), createTabFixture({id: 8, index: 1})];
        harness.tabs.set(tabs);

        await expect(api.queryTabs()).resolves.toEqual(tabs);
        expect(harness.tabs.query.calls[0]?.args).toEqual([{}]);
    });

    test.each([7, [7, 8] as [number, ...number[]]].map(tabIds => [tabIds] as const))("ungroupTab preserves IDs %j and uses the facade's invocation style", async tabIds => {
        const native = harness.tabs.ungroup;
        native.setResult(undefined);
        await expect(api.ungroupTab(tabIds)).resolves.toBeUndefined();
        expect(native.calls[0].args).toEqual([tabIds]);
        expect(native.calls[0].args[0]).toBe(tabIds);
        expect(native.calls[0].invocation).toBe(profile === "firefox" ? "promise" : "callback");
        expect(native.calls[0].callbackCalls).toEqual(profile === "firefox" ? [] : [[]]);
    });

    test("ungroupTab retains native failure", async () => {
        harness.tabs.ungroup.failNext(new Error("No tab with id: 999"));
        await expect(api.ungroupTab(999)).rejects.toThrow("No tab with id: 999");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("queryTabIds preserves numeric IDs including zero and skips absent IDs", async () => {
        harness.tabs.query.setResult([
            createTabFixture({id: 0}),
            createTabFixture({id: undefined}),
            createTabFixture({id: 7}),
        ]);

        await expect(api.queryTabIds({active: true})).resolves.toEqual([0, 7]);
        expect(harness.tabs.query.calls[0]?.args).toEqual([{active: true}]);
    });

    test("getActiveTab selects the active tab only from the current window", async () => {
        harness.tabs.set([
            createTabFixture({id: 7, windowId: 1, active: false}),
            createTabFixture({id: 8, windowId: 1, active: true}),
            createTabFixture({id: 9, windowId: 2, active: true}),
        ]);

        await expect(api.getActiveTab()).resolves.toMatchObject({id: 8});
    });

    test("getActiveTab rejects when there is no active tab, while getCurrentTab returns undefined", async () => {
        await expect(api.getActiveTab()).rejects.toThrow("Tab not found");
        await expect(api.getCurrentTab()).resolves.toBeUndefined();
    });

    test("findTab and findTabByUrl return the first matching tab or undefined", async () => {
        const first = createTabFixture({id: 7, index: 0, active: false, url});
        harness.tabs.set([first, createTabFixture({id: 8, index: 1, active: true, url})]);

        await expect(api.findTab({active: false})).resolves.toEqual(first);
        await expect(api.findTabByUrl(url)).resolves.toEqual(first);
        await expect(api.findTab({windowId: 999})).resolves.toBeUndefined();
        await expect(api.findTabByUrl("https://example.test/missing")).resolves.toBeUndefined();
    });

    test("moveTab and moveTabs preserve scalar and array arguments and results", async () => {
        const tab = createTabFixture({id: 7});
        const tabs = [tab, createTabFixture({id: 8})];
        const properties = {index: 0, windowId: 2};
        harness.tabs.move.queueResult(tab, tabs);

        await expect(api.moveTab(7, properties)).resolves.toBe(tab);
        await expect(api.moveTabs([7, 8], properties)).resolves.toBe(tabs);

        expect(harness.tabs.move.calls.map(call => call.args)).toEqual([
            [7, properties],
            [[7, 8], properties],
        ]);
    });

    test.each([undefined, false, true])("reloadTab handles bypassCache=%s and a callback without a result", async bypassCache => {
        harness.tabs.reload.setResult(undefined);

        await expect(api.reloadTab(7, bypassCache)).resolves.toBeUndefined();
        expect(harness.tabs.reload.calls[0]).toMatchObject({args: [7, {bypassCache}], callbackCalls: [[]]});
    });

    test("sendTabMessage preserves the response and defaults only the omitted options", async () => {
        const message = {type: "status"};
        const response = {ready: true};
        const options = {frameId: 0};
        harness.tabs.sendMessage.setResult(response);

        await expect(api.sendTabMessage<typeof message, typeof response>(7, message)).resolves.toBe(response);
        await expect(api.sendTabMessage(7, message, options)).resolves.toBe(response);

        expect(harness.tabs.sendMessage.calls.map(call => call.args)).toEqual([
            [7, message, {}],
            [7, message, options],
        ]);
    });

    test("selection highlights a tab without activating it, while activation changes the active tab", async () => {
        harness.tabs.set([
            createTabFixture({id: 7, windowId: 1, active: false, highlighted: false}),
            createTabFixture({id: 8, windowId: 1, active: true}),
        ]);

        await expect(api.updateTabAsSelected(7)).resolves.toMatchObject({id: 7, active: false, highlighted: true});
        await expect(api.updateTabAsActive(7)).resolves.toMatchObject({id: 7, active: true});
        expect(harness.tabs.values.find(tab => tab.id === 8)?.active).toBe(false);
    });

    test("removeTab removes the requested tab and rejects a missing tab", async () => {
        harness.tabs.set([createTabFixture({id: 7}), createTabFixture({id: 8})]);

        await expect(api.removeTab(7)).resolves.toBeUndefined();
        expect(harness.tabs.values.map(tab => tab.id)).toEqual([8]);
        await expect(api.removeTab(7)).rejects.toThrow("No tab with id: 7.");
    });

    test("createTab forwards native errors without reporting a created tab", async () => {
        harness.tabs.create.failNext(new Error("Creation denied"));

        await expect(api.createTab({url})).rejects.toThrow("Creation denied");
        expect(harness.tabs.values).toEqual([]);
    });

    test.each([7, 0])("openOrCreateTabByUrl selects the first matching tab with ID %s without creating another", async id => {
        harness.tabs.set([
            createTabFixture({id, index: 0, url, active: false, highlighted: false}),
            createTabFixture({id: 8, index: 1, url, active: true, highlighted: false}),
        ]);

        await expect(api.openOrCreateTabByUrl(url)).resolves.toBeUndefined();
        expect(harness.tabs.values).toHaveLength(2);
        expect(harness.tabs.values[0]).toMatchObject({id, active: false, highlighted: true});
        expect(harness.tabs.values[1]).toMatchObject({id: 8, active: true, highlighted: false});
        expect(harness.tabs.create.calls).toHaveLength(0);
    });

    test("openOrCreateTabByUrl creates a tab when no URL matches", async () => {
        await expect(api.openOrCreateTabByUrl(url)).resolves.toBeUndefined();

        expect(harness.tabs.values).toHaveLength(1);
        expect(harness.tabs.values[0].url).toBe(url);
        expect(harness.tabs.update.calls).toHaveLength(0);
    });

    test.each([7, 8, 0])("openOrCreateTab selects matching ID %s among tabs sharing a URL", async id => {
        harness.tabs.set([
            createTabFixture({id: 7, index: 0, url, active: true, highlighted: false}),
            createTabFixture({id: 8, index: 1, url, active: false, highlighted: false}),
            createTabFixture({id: 0, index: 2, url, active: false, highlighted: false}),
        ]);

        await expect(api.openOrCreateTab(createTabFixture({id, url}))).resolves.toBeUndefined();
        expect(harness.tabs.values).toHaveLength(3);
        expect(harness.tabs.values.find(tab => tab.id === id)?.highlighted).toBe(true);
        expect(harness.tabs.values.filter(tab => tab.id !== id).every(tab => !tab.highlighted)).toBe(true);
        expect(harness.tabs.values.filter(tab => tab.active).map(tab => tab.id)).toEqual([7]);
        expect(harness.tabs.create.calls).toHaveLength(0);
    });

    test.each([undefined, 999])("openOrCreateTab creates a tab for an absent or stale ID: %s", async id => {
        const existing = createTabFixture({id: 7, url, highlighted: false});
        harness.tabs.set([existing]);

        await expect(api.openOrCreateTab(createTabFixture({id, url}))).resolves.toBeUndefined();

        expect(harness.tabs.values).toHaveLength(2);
        expect(harness.tabs.values[0]).toEqual({...existing, active: false});
        expect(harness.tabs.values[1].url).toBe(url);
        expect(harness.tabs.create.calls).toHaveLength(1);
        expect(harness.tabs.update.calls).toHaveLength(0);
    });

    test("openOrCreateTab creates a tab when the requested ID belongs to a different URL", async () => {
        const existing = [
            createTabFixture({id: 7, index: 0, url, highlighted: false}),
            createTabFixture({id: 8, index: 1, url: "https://example.test/other", active: false, highlighted: false}),
        ];

        harness.tabs.set(existing);

        await expect(api.openOrCreateTab(createTabFixture({id: 8, url}))).resolves.toBeUndefined();

        expect(harness.tabs.values).toHaveLength(3);
        expect(harness.tabs.values.slice(0, 2)).toEqual(existing.map(tab => ({...tab, active: false})));
        expect(harness.tabs.values[2].url).toBe(url);
        expect(harness.tabs.create.calls).toHaveLength(1);
        expect(harness.tabs.update.calls).toHaveLength(0);
    });

    test("openOrCreateTab creates without a URL when the requested tab has no URL", async () => {
        const existing = createTabFixture({id: 7, url});
        harness.tabs.set([existing]);

        await expect(api.openOrCreateTab(createTabFixture({id: 7, url: undefined}))).resolves.toBeUndefined();

        expect(harness.tabs.values).toHaveLength(2);
        expect(harness.tabs.values[0]).toEqual({...existing, active: false});
        expect(harness.tabs.create.calls.map(call => call.args)).toEqual([[{url: undefined}]]);
        expect(harness.tabs.query.calls).toHaveLength(0);
        expect(harness.tabs.update.calls).toHaveLength(0);
    });

    describe.each([
        ["openOrCreateTab", () => api.openOrCreateTab(createTabFixture({id: 7, url}))],
        ["openOrCreateTabByUrl", () => api.openOrCreateTabByUrl(url)],
    ] as const)("%s failures", (_name, invoke) => {
        test("propagates a lookup failure without creating a duplicate", async () => {
            harness.tabs.query.failNext(new Error("Lookup failed"));

            await expect(invoke()).rejects.toThrow("Lookup failed");
            expect(harness.tabs.create.calls).toHaveLength(0);
            expect(harness.tabs.update.calls).toHaveLength(0);
            expect(harness.tabs.values).toEqual([]);
        });

        test("propagates a selection failure without creating a duplicate", async () => {
            const existing = createTabFixture({id: 7, url, highlighted: false});
            harness.tabs.set([existing]);
            harness.tabs.update.failNext(new Error("Selection failed"));

            await expect(invoke()).rejects.toThrow("Selection failed");
            expect(harness.tabs.create.calls).toHaveLength(0);
            expect(harness.tabs.values).toEqual([existing]);
        });

        test("propagates a creation failure", async () => {
            harness.tabs.create.failNext(new Error("Creation failed"));

            await expect(invoke()).rejects.toThrow("Creation failed");
            expect(harness.tabs.update.calls).toHaveLength(0);
            expect(harness.tabs.values).toEqual([]);
        });
    });
});

test.each(["chrome", "firefox"] as const)("ungroupTab supports shared %s namespaces", async profile => {
    const harness = createBrowserHarness();
    const nativeApi = profile === "chrome" ? harness.chrome : harness.browser;
    const restore = installGlobals({browser: nativeApi, chrome: nativeApi});
    harness.tabs.ungroup.setResult(undefined);

    try {
        const pending = api.ungroupTab([7, 8]);

        expect(harness.tabs.ungroup.calls).toHaveLength(1);
        expect(harness.tabs.ungroup.calls[0].invocation).toBe(profile === "chrome" ? "callback" : "promise");
        await expect(pending).resolves.toBeUndefined();
    } finally {
        restore();
    }
});
