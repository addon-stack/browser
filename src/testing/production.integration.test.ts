import {BlockDownloadError, download} from "../downloads";
import {findTabById, getTab, getTabUrl} from "../tabs";
import {getUserScripts} from "../userScripts";
import {createBrowserHarness, createTabFixture, installBrowserGlobals, installGlobals} from "./index";

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

    describe.each(["chrome", "firefox"] as const)("download with a controlled delay in %s", profile => {
        let harness: ReturnType<typeof createBrowserHarness>;
        const url = "https://download.example/file.zip";
        const createDownloadItemFixture = (
            overrides: Partial<chrome.downloads.DownloadItem> = {}
        ): chrome.downloads.DownloadItem => ({
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

        beforeEach(() => {
            harness = createBrowserHarness();
            restorers.push(installBrowserGlobals(harness, {profile}));
            harness.configurable.active.downloads.download.setResult(41);
            harness.configurable.active.downloads.search.setResult([createDownloadItemFixture()]);
            harness.delays.downloadValidation.setResult(undefined);
        });

        test("succeeds with an immediate wait while requesting the unchanged 100 ms delay", async () => {
            await expect(download({url})).resolves.toBe(41);

            expect(harness.delays.downloadValidation.calls).toMatchObject([
                {args: [100], callback: undefined, invocation: "promise"},
            ]);
            expect(harness.configurable.active.downloads.download.calls[0]?.args).toEqual([
                {conflictAction: "uniquify", url},
            ]);
            expect(harness.calls.map(call => call.api)).toEqual([
                "downloads.download",
                "delays.downloadValidation",
                "downloads.search",
            ]);
        });

        test("does not search until the test releases the delay", async () => {
            let release: () => void = () => undefined;
            let signalStarted: () => void = () => undefined;
            const gate = new Promise<void>(resolve => {
                release = resolve;
            });
            const started = new Promise<void>(resolve => {
                signalStarted = resolve;
            });
            harness.delays.downloadValidation.setImplementation(() => {
                signalStarted();
                return gate;
            });

            const pending = download({url});
            try {
                await started;
                expect(harness.configurable.active.downloads.search.calls).toHaveLength(0);
            } finally {
                release();
            }

            await expect(pending).resolves.toBe(41);
            expect(harness.configurable.active.downloads.search.calls[0]?.args).toEqual([{id: 41}]);
        });

        test("preserves a delay failure and does not query the item", async () => {
            const error = new Error("Validation wait failed");
            harness.delays.downloadValidation.failNext(error);

            await expect(download({url})).rejects.toBe(error);
            expect(harness.configurable.active.downloads.search.calls).toHaveLength(0);
            expect(harness.runtime.lastError).toBeUndefined();
        });

        test("does not schedule validation if download creation fails", async () => {
            harness.configurable.active.downloads.download.failNext(new Error("Download unavailable"));

            await expect(download({url})).rejects.toThrow("Download unavailable");
            expect(harness.delays.downloadValidation.calls).toHaveLength(0);
            expect(harness.configurable.active.downloads.search.calls).toHaveLength(0);
        });

        test.each([
            [[], "Download item not found after created"],
            [
                [createDownloadItemFixture({error: "USER_CANCELED", state: "interrupted"})],
                "Requires user permission to upload",
            ],
        ] as const)("preserves the exact BlockDownloadError for %j", async (items, message) => {
            harness.configurable.active.downloads.search.setResult([...items]);
            const pending = download({url});

            await expect(pending).rejects.toBeInstanceOf(BlockDownloadError);
            await expect(pending).rejects.toHaveProperty("message", message);
            expect(harness.delays.downloadValidation.calls[0]?.args).toEqual([100]);
        });

        test("preserves the ordinary error for other interruptions", async () => {
            harness.configurable.active.downloads.search.setResult([
                createDownloadItemFixture({error: "NETWORK_FAILED", state: "interrupted"}),
            ]);
            const pending = download({url});

            await expect(pending).rejects.toHaveProperty("message", "Download error: NETWORK_FAILED");
            await expect(pending).rejects.not.toBeInstanceOf(BlockDownloadError);
        });
    });
});
