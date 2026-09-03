import {afterEach, describe, expect, test} from "@jest/globals";
import {containsPermissions, getAllPermissions, removePermissions, requestPermissions} from "../permissions";
import {onInstalled} from "../runtime";
import {executeScript, insertCss} from "../scripting";
import {queryTabs} from "../tabs";
import {
    createBrowserHarness,
    createInstalledDetailsFixture,
    createManifestFixture,
    createTabFixture,
    installBrowserGlobals,
} from "./index";

const restorers: Array<() => void> = [];
afterEach(() => {
    while (restorers.length) restorers.pop()?.();
});

describe.each(["chrome", "firefox"] as const)("match patterns through real wrappers: %s", profile => {
    const install = (options: Parameters<typeof createBrowserHarness>[0] = {}) => {
        const harness = createBrowserHarness(options);
        restorers.push(installBrowserGlobals(harness, {profile}));
        return harness;
    };

    test("combines URL alternatives with AND filters without hiding inactive or frozen tabs", async () => {
        const harness = install({
            tabs: [
                createTabFixture({id: 1, active: false, url: "http://127.0.0.1:62778/top.html"}),
                createTabFixture({id: 2, active: false, frozen: true, url: "https://shop.example.com/page#section"}),
                createTabFixture({id: 3, url: "https://example.com/page", status: "loading"}),
                createTabFixture({id: 4, url: "https://example.com/page", discarded: true}),
                createTabFixture({id: 5, url: "https://example.com.evil.test/page"}),
            ],
        });
        const query: chrome.tabs.QueryInfo = {
            url: ["http://127.0.0.1/*", "https://*.example.com/*"],
            status: "complete",
            discarded: false,
        };

        expect((await queryTabs(query)).map(tab => tab.id)).toEqual([1, 2]);
        expect((await queryTabs({...query, frozen: false})).map(tab => tab.id)).toEqual([1]);
        expect(harness.tabs.query.calls[0]?.args).toEqual([query]);
        expect(harness.tabs.values.find(tab => tab.id === 2)?.frozen).toBe(true);
    });

    test("ignores fragments but retains literal query-string characters", async () => {
        install({tabs: [createTabFixture({id: 1, url: "https://example.com/search?q=a+b#part"})]});
        await expect(queryTabs({url: "https://example.com/search?q=a+b"})).resolves.toHaveLength(1);
        await expect(queryTabs({url: "https://example.com/search?q=a*"})).resolves.toHaveLength(1);
        await expect(queryTabs({url: "https://example.com/search"})).resolves.toEqual([]);
    });

    test("validates every query pattern before filtering even an empty tab collection", async () => {
        install();
        await expect(queryTabs({url: ["<all_urls>", "https://bad*host/*"]})).rejects.toThrow("tabs.query");
        await expect(queryTabs({url: "ws://example.com/*"})).rejects.toThrow("Unsupported match pattern");
        await expect(queryTabs({title: "page*"})).rejects.toThrow("title match patterns are not supported");
        await expect(queryTabs({id: 1} as chrome.tabs.QueryInfo)).rejects.toThrow('filter "id"');
    });

    test.each([
        ["<all_urls>", "https://example.com/*", true],
        ["https://*.example.com/*", "https://shop.example.com/*", true],
        ["https://shop.example.com/*", "https://*.example.com/*", false],
        ["https://example.com/*", "http://example.com/*", false],
        ["https://example.com/a", "https://example.com/b", true],
        ["http://127.0.0.1/*", "http://127.0.0.1:62778/*", true],
        ["http://127.0.0.1:62778/*", "http://127.0.0.1/*", false],
    ] as const)("checks origin coverage: %s covers %s = %s", async (granted, requested, expected) => {
        install({permissions: {origins: [granted]}});
        await expect(containsPermissions({origins: [requested]})).resolves.toBe(expected);
    });

    test("requires every named permission and every requested origin", async () => {
        install({permissions: {permissions: ["tabs", "scripting"], origins: ["https://*.example.com/*"]}});
        await expect(
            containsPermissions({
                permissions: ["tabs", "scripting"],
                origins: ["https://example.com/*", "https://shop.example.com/*"],
            })
        ).resolves.toBe(true);
        await expect(containsPermissions({permissions: ["tabs", "storage"]})).resolves.toBe(false);
        await expect(containsPermissions({origins: ["https://example.com/*", "http://example.com/*"]})).resolves.toBe(
            false
        );
        await expect(containsPermissions({})).resolves.toBe(true);
        // Validation must not be masked by an absent named permission or an earlier matching pattern.
        await expect(containsPermissions({permissions: ["storage"], origins: ["invalid"]})).rejects.toThrow(
            "permissions.contains"
        );
    });

    test("uses explicitly granted permissions, not manifest declarations", async () => {
        const harness = install({
            manifest: createManifestFixture({
                host_permissions: ["<all_urls>"],
                optional_host_permissions: ["https://*.example.com/*"],
            }),
        });
        await expect(containsPermissions({origins: ["https://example.com/*"]})).resolves.toBe(false);
        await harness.permissions.grant({origins: ["https://*.example.com/*"]});
        await expect(containsPermissions({origins: ["https://example.com/*"]})).resolves.toBe(true);
        await harness.permissions.revoke({origins: ["https://*.example.com/*"]});
        await expect(containsPermissions({origins: ["https://example.com/*"]})).resolves.toBe(false);
    });

    test("updates coverage after request/remove/set/reset without changing getAll representation", async () => {
        const harness = install({permissions: {origins: ["https://example.com/original"]}});
        const added: chrome.permissions.Permissions[] = [];
        harness.permissions.onAdded.on(value => added.push(value));
        await requestPermissions({origins: ["http://*.example.com/*"]});
        await expect(containsPermissions({origins: ["http://shop.example.com/path"]})).resolves.toBe(true);
        expect(added).toEqual([{origins: ["http://*.example.com/*"], permissions: []}]);
        await expect(removePermissions({origins: ["http://*.example.com/*"]})).resolves.toBe(true);
        await expect(containsPermissions({origins: ["http://shop.example.com/path"]})).resolves.toBe(false);
        harness.permissions.set({origins: ["<all_urls>"]});
        await expect(containsPermissions({origins: ["http://other.example/*"]})).resolves.toBe(true);
        harness.reset();
        await expect(getAllPermissions()).resolves.toEqual({
            origins: ["https://example.com/original"],
            permissions: [],
        });
        await expect(containsPermissions({origins: ["http://other.example/*"]})).resolves.toBe(false);
        await expect(containsPermissions({origins: ["https://example.com/new"]})).resolves.toBe(true);
    });

    test("revocation remains exact-entry removal, not subtraction from a wildcard grant", async () => {
        const harness = install({permissions: {origins: ["https://*.example.com/*"]}});
        await expect(removePermissions({origins: ["https://shop.example.com/*"]})).resolves.toBe(false);
        await expect(containsPermissions({origins: ["https://shop.example.com/*"]})).resolves.toBe(true);
        expect(harness.permissions.value.origins).toEqual(["https://*.example.com/*"]);
    });

    test("retains result overrides, failNext, reset and callback-scoped lastError", async () => {
        const harness = install({permissions: {origins: ["<all_urls>"]}});
        harness.permissions.contains.setResult(false);
        await expect(containsPermissions({origins: ["https://example.com/*"]})).resolves.toBe(false);
        harness.permissions.contains.failNext(new Error("Permission lookup failed"));
        let observed: string | undefined;
        harness.chrome.permissions.contains({}, () => {
            observed = harness.runtime.lastError?.message;
        });
        expect(observed).toBe("Permission lookup failed");
        expect(harness.runtime.lastError).toBeUndefined();
        harness.reset();
        await expect(containsPermissions({origins: ["https://example.com/*"]})).resolves.toBe(true);
    });

    test("supports raw callback and Promise calls, with synchronous callback argument validation", async () => {
        const harness = install({
            tabs: [createTabFixture({url: "https://example.com/path"})],
            permissions: {origins: ["https://*.example.com/*"]},
        });
        const api = profile === "chrome" ? harness.chrome : harness.browser;
        let callbackTabs: chrome.tabs.Tab[] = [];
        expect(
            api.tabs.query({url: "https://*.example.com/*"}, tabs => {
                callbackTabs = tabs;
            })
        ).toBeUndefined();
        expect(callbackTabs).toHaveLength(1);
        await expect(api.tabs.query({url: "https://*.example.com/*"})).resolves.toHaveLength(1);
        let callbackPermission: boolean | undefined;
        expect(
            api.permissions.contains({origins: ["https://example.com/*"]}, result => {
                callbackPermission = result;
            })
        ).toBeUndefined();
        expect(callbackPermission).toBe(true);
        await expect(api.permissions.contains({origins: ["https://example.com/*"]})).resolves.toBe(true);
        for (const method of [api.permissions.contains, api.permissions.request, api.permissions.remove]) {
            expect(() => method({origins: ["bad"]}, () => undefined)).toThrow("Invalid match pattern");
            await expect(method({origins: ["bad"]})).rejects.toThrow("Invalid match pattern");
        }
        expect(() => api.tabs.query({url: "bad"}, () => undefined)).toThrow("tabs.query");
        expect(harness.runtime.lastError).toBeUndefined();
        expect(harness.permissions.value.origins).toEqual(["https://*.example.com/*"]);
    });

    test("an application install handler waits for CSS before JS on matching, permitted tabs", async () => {
        const harness = install({
            tabs: [createTabFixture({id: 1, active: false, url: "https://shop.example.com/page"})],
            permissions: {origins: ["https://*.example.com/*"]},
        });
        let releaseCss: () => void = () => undefined;
        let cssStarted: () => void = () => undefined;
        const started = new Promise<void>(resolve => {
            cssStarted = resolve;
        });
        const cssCompletion = new Promise<void>(resolve => {
            releaseCss = resolve;
        });
        harness.scripting.insertCSS.setImplementation(
            (_injection: chrome.scripting.CSSInjection, callback?: () => void) => {
                cssStarted();
                return cssCompletion.then(() => {
                    callback?.();
                });
            }
        );
        harness.scripting.executeScript.setResult([]);

        // Representative application code; these are real package wrappers, not module mocks.
        const unsubscribe = onInstalled(async () => {
            if (!(await containsPermissions({origins: ["https://shop.example.com/*"]}))) return;
            const tabs = await queryTabs({url: "https://*.example.com/*", status: "complete", discarded: false});
            for (const tab of tabs) {
                if (tab.id === undefined) continue;
                const target = {tabId: tab.id};
                await insertCss({target, files: ["content.css"]});
                await executeScript({target, files: ["content.js"]});
            }
        });
        const dispatch = harness.runtime.events.onInstalled.emit(createInstalledDetailsFixture());
        try {
            await started;
            expect(harness.scripting.executeScript.calls).toHaveLength(0);
            releaseCss();
            await dispatch;
            expect(harness.scripting.executeScript.calls.map(call => call.args)).toEqual([
                [{target: {tabId: 1}, files: ["content.js"]}],
            ]);
        } finally {
            releaseCss();
            await dispatch;
            unsubscribe();
        }
    });
});

test("invalid grant batches and set are rejected without partial mutation", async () => {
    const harness = createBrowserHarness({permissions: {permissions: ["tabs"]}});
    expect(() => harness.permissions.set({origins: ["https://ok.test/*", "bad"]})).toThrow("match pattern");
    await expect(harness.permissions.grant({permissions: ["scripting"], origins: ["bad"]})).rejects.toThrow(
        "match pattern"
    );
    expect(harness.permissions.value).toEqual({origins: [], permissions: ["tabs"]});
    expect(() => createBrowserHarness({permissions: {origins: ["bad"]}})).toThrow("match pattern");
});

test("URL overrides/reset and origin state stay isolated between harnesses", async () => {
    const first = createBrowserHarness({
        tabs: [createTabFixture({id: 1, url: "https://example.com/page"})],
        permissions: {origins: ["<all_urls>"]},
    });
    const second = createBrowserHarness();
    first.tabs.query.setResult([]);
    await expect(first.chrome.tabs.query({url: "https://example.com/*"})).resolves.toEqual([]);
    first.reset();
    await expect(first.chrome.tabs.query({url: "https://example.com/*"})).resolves.toHaveLength(1);
    await expect(second.chrome.tabs.query({url: "https://example.com/*"})).resolves.toEqual([]);
    await expect(second.chrome.permissions.contains({origins: ["https://example.com/*"]})).resolves.toBe(false);
});
