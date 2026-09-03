import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {onSpecificCommand} from "./commands";
import {type BrowserHarness, createBrowserHarness, createTabFixture, installBrowserGlobals} from "./testing";

describe.each(["chrome", "firefox"] as const)("specific command listeners in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile, captureListenerErrors: true});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("filters commands, forwards the optional tab, and unsubscribes", async () => {
        const tab = createTabFixture({id: 7});
        const callback = jest.fn<(tab?: chrome.tabs.Tab) => void>();
        const event = harness.configurable.active.commands.onCommand;
        const unsubscribe = onSpecificCommand("sync", callback);

        await event.emit("sync-other", tab);
        expect(callback).not.toHaveBeenCalled();

        await event.emit("sync", tab);
        expect(callback.mock.calls).toEqual([[tab]]);

        await event.emit("sync");
        expect(callback.mock.calls).toEqual([[tab], [undefined]]);

        unsubscribe();
        await event.emit("sync", tab);
        expect(callback).toHaveBeenCalledTimes(2);
        expect(event.listenerCount()).toBe(0);
    });

    test("keeps synchronous error handling", async () => {
        const error = new Error("Command listener failed");

        onSpecificCommand("sync", () => {
            throw error;
        });

        await expect(harness.configurable.active.commands.onCommand.emit("sync")).resolves.toBeUndefined();
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "sync"}]);
    });

    test("forwards async listener rejections to the existing wrapper", async () => {
        const error = new Error("Async command listener failed");

        onSpecificCommand("sync", async () => {
            throw error;
        });

        await expect(harness.configurable.active.commands.onCommand.emit("sync")).rejects.toBe(error);
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "promise"}]);
    });
});
