import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {onSpecificAlarm, onSpecificAlarms} from "./custom-events";

describe.each(["chrome", "firefox"] as const)("specific alarm listeners in %s", profile => {
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
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("filters names exactly, forwards the complete alarm, and unsubscribes", async () => {
        const callback = jest.fn<(alarm: chrome.alarms.Alarm) => void>();
        const event = harness.configurable.active.alarms.onAlarm;
        const unsubscribe = onSpecificAlarm("sync", callback);

        await event.emit({...alarm, name: "sync-other"});
        await event.emit({...alarm, name: "Sync"});
        await event.emit({...alarm, name: ""});
        expect(callback).not.toHaveBeenCalled();

        await event.emit(alarm);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0]?.[0]).toBe(alarm);

        unsubscribe();
        await event.emit(alarm);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(event.listenerCount()).toBe(0);
    });

    test("keeps matching subscriptions independent when one is removed", async () => {
        const event = harness.configurable.active.alarms.onAlarm;
        const callback = jest.fn();
        const otherCallback = jest.fn();
        const unsubscribe = onSpecificAlarm("sync", callback);
        const unsubscribeOther = onSpecificAlarm("sync", otherCallback);
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        unsubscribe();
        unsubscribe();
        await event.emit(alarm);
        expect(callback).not.toHaveBeenCalled();
        expect(otherCallback).toHaveBeenCalledWith(alarm);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("returns the callback result and the same Promise through the generated listener", async () => {
        const event = harness.configurable.active.alarms.onAlarm;
        const result = {handled: true};
        const promise = Promise.resolve(result);

        const callback = jest.fn<(alarm: chrome.alarms.Alarm) => unknown>()
            .mockReturnValueOnce(result)
            .mockReturnValueOnce(promise);

        const unsubscribe = onSpecificAlarm("sync", callback);
        const listener = event.registrations()[0].listener;
        expect(listener({...alarm, name: "other"})).toBeUndefined();
        expect(callback).not.toHaveBeenCalled();
        expect(listener(alarm)).toBe(result);
        expect(listener(alarm)).toBe(promise);
        await expect(promise).resolves.toBe(result);
        unsubscribe();
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

    describe("onSpecificAlarms", () => {
        test("routes exact names to their handlers through one subscription and unsubscribes all handlers", async () => {
            const event = harness.configurable.active.alarms.onAlarm;
            const sync = jest.fn();
            const cleanup = jest.fn();
            const cleanupAlarm = {...alarm, name: "cleanup"};
            const unsubscribe = onSpecificAlarms({sync, cleanup});
            expect(event.listenerCount()).toBe(1);
            expect(event.registrations()[0].args).toEqual([]);

            await event.emit({...alarm, name: "sync-other"});
            await event.emit({...alarm, name: "Sync"});
            await event.emit({...alarm, name: ""});
            expect(sync).not.toHaveBeenCalled();
            expect(cleanup).not.toHaveBeenCalled();

            await event.emit(alarm);
            expect(sync.mock.calls).toEqual([[alarm]]);
            expect(sync.mock.calls[0][0]).toBe(alarm);
            expect(cleanup).not.toHaveBeenCalled();
            await event.emit(cleanupAlarm);
            expect(cleanup.mock.calls).toEqual([[cleanupAlarm]]);
            expect(cleanup.mock.calls[0][0]).toBe(cleanupAlarm);
            expect(sync).toHaveBeenCalledTimes(1);

            unsubscribe();
            unsubscribe();
            await event.emit(alarm);
            await event.emit(cleanupAlarm);
            expect(event.listenerCount()).toBe(0);
            expect(sync).toHaveBeenCalledTimes(1);
            expect(cleanup).toHaveBeenCalledTimes(1);
        });

        test("keeps overlapping subscriptions independent", async () => {
            const event = harness.configurable.active.alarms.onAlarm;
            const callback = jest.fn();
            const otherCallback = jest.fn();
            const unsubscribe = onSpecificAlarms({sync: callback});
            const unsubscribeOther = onSpecificAlarms({sync: otherCallback});
            expect(event.listenerCount()).toBe(2);
            unsubscribe();
            unsubscribe();
            await event.emit(alarm);
            expect(callback).not.toHaveBeenCalled();
            expect(otherCallback).toHaveBeenCalledWith(alarm);
            expect(event.listenerCount()).toBe(1);
            unsubscribeOther();
            expect(event.listenerCount()).toBe(0);
        });

        test("accepts an empty map and ignores Object.prototype members", () => {
            const event = harness.configurable.active.alarms.onAlarm;
            const unsubscribe = onSpecificAlarms({});
            const listener = event.registrations()[0].listener;

            for (const name of ["sync", "constructor", "toString", "__proto__", "hasOwnProperty"]) {
                expect(listener({...alarm, name})).toBeUndefined();
            }

            expect(harness.listenerErrors.entries).toEqual([]);
            unsubscribe();
            expect(event.listenerCount()).toBe(0);
        });

        test("ignores inherited handlers", async () => {
            const inherited = jest.fn();
            const own = jest.fn();
            const handlers = Object.assign(Object.create({sync: inherited}), {cleanup: own});
            const unsubscribe = onSpecificAlarms(handlers);
            await harness.configurable.active.alarms.onAlarm.emit(alarm);
            expect(inherited).not.toHaveBeenCalled();
            const cleanupAlarm = {...alarm, name: "cleanup"};
            await harness.configurable.active.alarms.onAlarm.emit(cleanupAlarm);
            expect(own).toHaveBeenCalledWith(cleanupAlarm);
            unsubscribe();
        });

        test.each(["ordinary", "null-prototype"])("supports special own names in a %s object", async kind => {
            const event = harness.configurable.active.alarms.onAlarm;
            const names = ["", "constructor", "toString", "__proto__", "hasOwnProperty"];
            const callbacks = names.map(() => jest.fn());
            const entries = Object.fromEntries(names.map((name, index) => [name, callbacks[index]]));
            const handlers = kind === "ordinary" ? entries : Object.assign(Object.create(null), entries);
            const unsubscribe = onSpecificAlarms(handlers);

            for (const name of names) {
                await event.emit({...alarm, name});
            }

            callbacks.forEach((callback, index) => {
                expect(callback.mock.calls).toEqual([[{...alarm, name: names[index]}]]);
            });

            expect(event.listenerCount()).toBe(1);
            expect(harness.listenerErrors.entries).toEqual([]);
            unsubscribe();
        });

        test("returns the callback result and the original Promise", async () => {
            const event = harness.configurable.active.alarms.onAlarm;
            const result = {handled: true};
            const promise = Promise.resolve(result);

            const callback = jest.fn<(alarm: chrome.alarms.Alarm) => unknown>()
                .mockReturnValueOnce(result)
                .mockReturnValueOnce(promise);

            const unsubscribe = onSpecificAlarms({sync: callback});
            const listener = event.registrations()[0].listener;
            expect(listener({...alarm, name: "other"})).toBeUndefined();
            expect(callback).not.toHaveBeenCalled();
            expect(listener(alarm)).toBe(result);
            expect(listener(alarm)).toBe(promise);
            await expect(promise).resolves.toBe(result);
            unsubscribe();
        });

        test("logs synchronous handler errors and continues handling other alarms", async () => {
            const event = harness.configurable.active.alarms.onAlarm;
            const error = new Error("Mapped alarm listener failed");
            const cleanup = jest.fn();

            const unsubscribe = onSpecificAlarms({
                sync: () => {
                    throw error;
                },
                cleanup,
            });

            await expect(event.emit(alarm)).resolves.toBeUndefined();
            expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "sync"}]);
            await event.emit({...alarm, name: "cleanup"});
            expect(cleanup).toHaveBeenCalledTimes(1);
            unsubscribe();
        });

        test("forwards async handler rejections to the existing wrapper", async () => {
            const event = harness.configurable.active.alarms.onAlarm;
            const error = new Error("Async mapped alarm listener failed");

            const unsubscribe = onSpecificAlarms({
                sync: async () => {
                    throw error;
                },
            });

            await expect(event.emit(alarm)).rejects.toBe(error);
            expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "promise"}]);
            unsubscribe();
        });
    });
});
