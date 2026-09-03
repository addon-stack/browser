import {
    getDownloadValidationDelayKey,
    nativeDownloadValidationDelay,
    waitForDownloadValidation,
} from "../internal/download-validation";
import {type BrowserTestApi, createBrowserHarness, installBrowserGlobals} from "./index";

const expectNativeTask = async (pending: Promise<void>): Promise<void> => {
    let settled = false;

    const observed = pending.then(() => {
        settled = true;
    });

    // Native timers run in a later task, not in the Promise microtask queue.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    await observed;
    expect(settled).toBe(true);
};

describe("download validation delay control", () => {
    test("keeps the native task-based default when no hook is installed", async () => {
        await expectNativeTask(waitForDownloadValidation({}, 0));
        await expectNativeTask(nativeDownloadValidationDelay(0));
    });

    test("uses an internal non-enumerable hook shared by both facades of one harness", async () => {
        const harness = createBrowserHarness();
        const key = getDownloadValidationDelayKey();
        harness.delays.downloadValidation.setResult(undefined);

        for (const api of [harness.chrome.downloads, harness.browser.downloads]) {
            expect(Object.getOwnPropertyDescriptor(api, key)).toMatchObject({
                enumerable: false,
                value: harness.delays.downloadValidation.api,
            });

            await waitForDownloadValidation(api, 100);
        }

        expect(harness.delays.downloadValidation.calls.map(call => call.args)).toEqual([[100], [100]]);
        expect(harness.calls.map(call => call.api)).toEqual(["delays.downloadValidation", "delays.downloadValidation"]);
    });

    test("does not share delay configuration or history between harness instances", async () => {
        const first = createBrowserHarness();
        const second = createBrowserHarness();
        const failure = new Error("Second scheduler failed");
        first.delays.downloadValidation.setResult(undefined);
        second.delays.downloadValidation.failNext(failure);

        expect(first.delays.downloadValidation.api).not.toBe(second.delays.downloadValidation.api);
        await waitForDownloadValidation(first.chrome.downloads, 100);
        expect(second.delays.downloadValidation.calls).toHaveLength(0);
        first.reset();

        await expect(waitForDownloadValidation(second.browser.downloads, 100)).rejects.toBe(failure);
        expect(first.delays.downloadValidation.calls).toHaveLength(0);
        expect(second.delays.downloadValidation.calls).toHaveLength(1);
    });

    test.each(["chrome", "browser"] as const)("preserves the hook in a cloned %s facade across reset", async name => {
        const harness = createBrowserHarness();
        const facade = harness.createProfileFacade(name, false);
        harness.delays.downloadValidation.setResult(undefined);

        expect(facade.downloads).not.toBe(harness[name].downloads);

        expect(Object.getOwnPropertyDescriptor(facade.downloads, getDownloadValidationDelayKey())).toMatchObject({
            enumerable: false,
            value: harness.delays.downloadValidation.api,
        });

        await waitForDownloadValidation(facade.downloads, 100);
        expect(harness.delays.downloadValidation.calls[0]?.args).toEqual([100]);

        harness.reset();

        await expectNativeTask(waitForDownloadValidation(facade.downloads, 0));
        expect(harness.delays.downloadValidation.calls[0]).toMatchObject({sequence: 1, args: [0]});
    });

    test("reset clears custom results, implementations, queues and errors and restores native delay", async () => {
        const harness = createBrowserHarness();
        const delay = harness.delays.downloadValidation;
        delay.setResult(undefined);
        await delay.api(100);

        delay.setImplementation(async () => {
            throw new Error("Custom delay must be cleared");
        });

        delay.queueResult(undefined);
        delay.failNext(new Error("Queued error must be cleared"));

        harness.reset();

        expect(delay.calls).toHaveLength(0);
        expect(harness.calls).toHaveLength(0);
        expect(delay.hasDefaultImplementation).toBe(true);
        await expectNativeTask(waitForDownloadValidation(harness.chrome.downloads, 0));
        expect(delay.calls[0]).toMatchObject({sequence: 1, args: [0], invocation: "promise"});
    });

    test.each([
        "chrome",
        "firefox",
        "safari",
        "opera",
    ] as const)("profile installation preserves the hook without replacing timers: %s", async profile => {
        const timerDescriptor = Object.getOwnPropertyDescriptor(globalThis, "setTimeout");
        const harness = createBrowserHarness();
        harness.delays.downloadValidation.setResult(undefined);
        const restore = installBrowserGlobals(harness, {profile});

        try {
            const facade = (
                profile === "firefox" || profile === "safari" ? globalThis.browser : globalThis.chrome
            ) as BrowserTestApi;

            await waitForDownloadValidation(facade.downloads, 100);
            expect(harness.delays.downloadValidation.calls[0]?.args).toEqual([100]);
            expect(Object.getOwnPropertyDescriptor(globalThis, "setTimeout")).toEqual(timerDescriptor);

            harness.reset();
            harness.delays.downloadValidation.setResult(undefined);
            await waitForDownloadValidation(facade.downloads, 100);
            expect(harness.delays.downloadValidation.calls).toHaveLength(1);
        } finally {
            restore();
        }

        expect(Object.getOwnPropertyDescriptor(globalThis, "setTimeout")).toEqual(timerDescriptor);
    });

    test("assimilates custom thenables from a valid hook", async () => {
        const calls: number[] = [];

        const namespace = {
            [getDownloadValidationDelayKey()]: (milliseconds: number) => ({
                // Exercises assimilation of a custom thenable.
                then(resolve: () => void) {
                    calls.push(milliseconds);
                    resolve();
                },
            }),
        };

        await waitForDownloadValidation(namespace, 100);
        expect(calls).toEqual([100]);
    });

    test("fails explicitly for a present non-function hook", async () => {
        const namespace = {[getDownloadValidationDelayKey()]: null};

        await expect(async () => waitForDownloadValidation(namespace, 100)).rejects.toThrow(
            'Browser method "downloads.download" has an invalid download validation delay hook: expected a function.'
        );
    });

    test.each([undefined, 0, {}])("fails explicitly for a hook with a non-thenable result: %j", async result => {
        const namespace = {[getDownloadValidationDelayKey()]: () => result};

        await expect(async () => waitForDownloadValidation(namespace, 100)).rejects.toThrow(
            'Browser method "downloads.download" has an invalid download validation delay hook: expected a Promise or thenable result.'
        );
    });

    test("preserves a hook throw without scheduling a fallback wait", async () => {
        const error = new Error("Scheduler threw");

        const namespace = {
            [getDownloadValidationDelayKey()]: () => {
                throw error;
            },
        };

        await expect(async () => waitForDownloadValidation(namespace, 100)).rejects.toBe(error);
    });
});
