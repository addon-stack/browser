import {BlockDownloadError, download} from "../downloads";
import {findTabById, getTab, getTabUrl} from "../tabs";
import {getUserScripts} from "../userScripts";
import {createBrowserHarness, createTabFixture, installGlobals} from "./index";

const restorers: Array<() => void> = [];

afterEach(() => {
    while (restorers.length > 0) restorers.pop()?.();
});

describe("current production behavior through the browser harness", () => {
    test("uses the callback-schema getScripts method without weakening promise-only methods", async () => {
        const harness = createBrowserHarness();
        restorers.push(installGlobals({browser: undefined, chrome: harness.chrome}));
        const scripts: chrome.userScripts.RegisteredUserScript[] = [
            {id: "configured-script", js: [{file: "content.js"}], matches: ["https://example.test/*"]},
        ];
        harness.configurable.chrome.userScripts.getScripts.setResult(scripts);

        await expect(getUserScripts(["configured-script"])).resolves.toEqual(scripts);
        expect(harness.configurable.chrome.userScripts.getScripts.calls[0]).toMatchObject({
            args: [{ids: ["configured-script"]}],
            callback: expect.any(Function),
            invocation: "callback",
        });
    });

    describe.each(["chrome", "browser"] as const)("tab lookup through the %s facade", facade => {
        let harness: ReturnType<typeof createBrowserHarness>;

        beforeEach(() => {
            harness = createBrowserHarness();
            restorers.push(
                installGlobals({
                    browser: facade === "browser" ? harness.browser : undefined,
                    chrome: facade === "chrome" ? harness.chrome : undefined,
                })
            );
        });

        test("returns an existing tab and its URL", async () => {
            const tab = createTabFixture({id: 7, url: "https://example.test/existing"});
            harness.tabs.set([tab]);

            await expect(findTabById(7)).resolves.toEqual(tab);
            await expect(getTabUrl(7)).resolves.toBe(tab.url);
        });

        test("returns undefined for a missing tab without changing the direct getTab rejection", async () => {
            await expect(findTabById(999)).resolves.toBeUndefined();
            await expect(getTab(999)).rejects.toThrow("No tab with id: 999.");
        });

        test("reports the dedicated missing-tab error from getTabUrl", async () => {
            await expect(getTabUrl(999)).rejects.toThrow('Tab id "999" not exist');
        });

        test("preserves the error for an existing tab without a URL", async () => {
            harness.tabs.set([createTabFixture({id: 7, url: undefined})]);

            await expect(getTabUrl(7)).rejects.toThrow("URL not exist by tab id 7");
        });

        test("normalizes every lookup rejection to undefined, not just missing-tab errors", async () => {
            harness.tabs.get.failNext(new Error("Tabs unavailable"));
            await expect(findTabById(7)).resolves.toBeUndefined();

            harness.tabs.get.failNext(new Error("Tabs unavailable"));
            await expect(getTabUrl(7)).rejects.toThrow('Tab id "7" not exist');
        });
    });

    test("download succeeds after the production 100 ms delay", async () => {
        const harness = createBrowserHarness();
        restorers.push(installGlobals({browser: undefined, chrome: harness.chrome}));
        harness.configurable.chrome.downloads.download.setResult(41);
        harness.configurable.chrome.downloads.search.setResult([
            {error: undefined, exists: true, id: 41, state: "in_progress"} as chrome.downloads.DownloadItem,
        ]);
        const startedAt = performance.now();

        await expect(download({url: "https://download.example/file.zip"})).resolves.toBe(41);

        expect(performance.now() - startedAt).toBeGreaterThanOrEqual(90);
        expect(harness.configurable.chrome.downloads.download.calls[0]?.args).toEqual([
            {conflictAction: "uniquify", url: "https://download.example/file.zip"},
        ]);
    });

    test("download preserves the exact BlockDownloadError class after the production delay", async () => {
        const harness = createBrowserHarness();
        restorers.push(installGlobals({browser: undefined, chrome: harness.chrome}));
        harness.configurable.chrome.downloads.download.setResult(42);
        harness.configurable.chrome.downloads.search.setResult([
            {error: "USER_CANCELED", exists: true, id: 42, state: "interrupted"} as chrome.downloads.DownloadItem,
        ]);
        const startedAt = performance.now();

        let failure: unknown;
        try {
            await download({url: "https://download.example/requires-permission.zip"});
        } catch (error) {
            failure = error;
        }

        expect(performance.now() - startedAt).toBeGreaterThanOrEqual(90);
        expect(failure).toBeInstanceOf(BlockDownloadError);
        expect(failure).toMatchObject({message: "Requires user permission to upload"});
    });
});
