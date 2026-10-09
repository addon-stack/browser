import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {onAlarm} from "./events";

describe.each(["chrome", "firefox"] as const)("alarms events in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("onAlarm forwards all alarms unchanged and unsubscribes independently", async () => {
        const event = harness.configurable.active.alarms.onAlarm;
        const alarm: chrome.alarms.Alarm = {name: "sync", scheduledTime: 123456, persistAcrossSessions: false};
        const otherAlarm = {...alarm, name: "other"};
        const callback = jest.fn();
        const otherCallback = jest.fn();
        const unsubscribe = onAlarm(callback);
        const unsubscribeOther = onAlarm(otherCallback);
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        await event.emit(alarm);
        await event.emit(otherAlarm);
        expect(callback.mock.calls).toEqual([[alarm], [otherAlarm]]);
        expect(callback.mock.calls[0][0]).toBe(alarm);
        expect(callback.mock.calls[1][0]).toBe(otherAlarm);

        unsubscribe();
        unsubscribe();
        expect(event.listenerCount()).toBe(1);
        await event.emit(alarm);
        expect(callback).toHaveBeenCalledTimes(2);
        expect(otherCallback).toHaveBeenCalledTimes(3);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("resolves the API at subscription time and retains the original event for cleanup", () => {
        const firstEvent = harness.configurable.active.alarms.onAlarm;
        const unsubscribeFirst = onAlarm(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.configurable.active.alarms.onAlarm;
        const unsubscribeSecond = onAlarm(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
