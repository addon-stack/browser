import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../testing";
import {onCommand} from "./events";

describe.each(["chrome", "firefox"] as const)("commands events in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("onCommand forwards command names and optional tabs and unsubscribes independently", async () => {
        const event = harness.configurable.active.commands.onCommand;
        const tab = createTabFixture({id: 7});
        const callback = jest.fn();
        const otherCallback = jest.fn();
        const unsubscribe = onCommand(callback);
        const unsubscribeOther = onCommand(otherCallback);
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        await event.emit("sync", tab);
        await event.emit("open");
        expect(callback.mock.calls).toEqual([["sync", tab], ["open"]]);

        unsubscribe();
        unsubscribe();
        expect(event.listenerCount()).toBe(1);
        await event.emit("sync", tab);
        expect(callback).toHaveBeenCalledTimes(2);
        expect(otherCallback).toHaveBeenCalledTimes(3);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("resolves the API at subscription time and retains the original event for cleanup", () => {
        const firstEvent = harness.configurable.active.commands.onCommand;
        const unsubscribeFirst = onCommand(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.configurable.active.commands.onCommand;
        const unsubscribeSecond = onCommand(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
