import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {createAlarmIfNotExists, onSpecificAlarm} from "./alarms";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "./testing";

describe.each(["chrome", "firefox"] as const)("alarm helpers in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    const alarm: chrome.alarms.Alarm = {
        name: "sync",
        periodInMinutes: 5,
        persistAcrossSessions: false,
        scheduledTime: 123456,
    };

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile, captureListenerErrors: true});
        harness.configurable.active.alarms.get.setResult(undefined);
        harness.configurable.active.alarms.create.setResult(undefined);
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("creates a missing alarm with the supplied name and schedule", async () => {
        const info = {periodInMinutes: 5};

        await expect(createAlarmIfNotExists("sync", info)).resolves.toBe(true);

        expect(harness.configurable.active.alarms.get.calls).toMatchObject([{args: ["sync"]}]);
        expect(harness.configurable.active.alarms.create.calls).toMatchObject([{args: ["sync", info]}]);
    });

    test("does not replace an existing alarm when given a different schedule", async () => {
        harness.configurable.active.alarms.get.setResult(alarm);

        await expect(createAlarmIfNotExists("sync", {periodInMinutes: 10})).resolves.toBe(false);

        expect(harness.configurable.active.alarms.create.calls).toHaveLength(0);
    });

    test("propagates lookup errors without attempting creation", async () => {
        harness.configurable.active.alarms.get.failNext(new Error("Alarm lookup failed"));

        await expect(createAlarmIfNotExists("sync", {periodInMinutes: 5})).rejects.toThrow("Alarm lookup failed");

        expect(harness.configurable.active.alarms.create.calls).toHaveLength(0);
    });

    test("propagates creation errors instead of reporting success", async () => {
        harness.configurable.active.alarms.create.failNext(new Error("Alarm creation failed"));

        await expect(createAlarmIfNotExists("sync", {periodInMinutes: 5})).rejects.toThrow("Alarm creation failed");
    });

    test("filters names exactly, forwards the complete alarm, and unsubscribes", async () => {
        const callback = jest.fn<(alarm: chrome.alarms.Alarm) => void>();
        const event = harness.configurable.active.alarms.onAlarm;
        const unsubscribe = onSpecificAlarm("sync", callback);

        await event.emit({...alarm, name: "sync-other"});
        await event.emit({...alarm, name: "Sync"});
        expect(callback).not.toHaveBeenCalled();

        await event.emit(alarm);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0]?.[0]).toBe(alarm);

        unsubscribe();
        await event.emit(alarm);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(event.listenerCount()).toBe(0);
    });

    test("logs synchronous listener errors through the existing wrapper", async () => {
        const error = new Error("Alarm listener failed");

        onSpecificAlarm("sync", () => {
            throw error;
        });

        await expect(harness.configurable.active.alarms.onAlarm.emit(alarm)).resolves.toBeUndefined();
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "sync"}]);
    });

    test("forwards async listener rejections to the existing wrapper", async () => {
        const error = new Error("Async alarm listener failed");

        onSpecificAlarm("sync", async () => {
            throw error;
        });

        await expect(harness.configurable.active.alarms.onAlarm.emit(alarm)).rejects.toBe(error);
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "promise"}]);
    });
});
