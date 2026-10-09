import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

// Keep this contract independent of the generator's specification.
const events = [
    ["onNotificationsButtonClicked", "onButtonClicked", ["notification-1", 2]],
    ["onNotificationsClicked", "onClicked", ["notification-1"]],
    ["onNotificationsClosed", "onClosed", ["notification-1", true]],
    ["onNotificationsPermissionLevelChanged", "onPermissionLevelChanged", ["denied"]],
] as const;

describe.each(["chrome", "firefox"] as const)("notification events in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
        jest.restoreAllMocks();
    });

    test.each(events)("%s forwards arguments and removes only its own listener", async (name, eventName, args) => {
        const event = harness.configurable.active.notifications[eventName];
        const callback = jest.fn();
        const otherCallback = jest.fn();
        const unsubscribe = api[name](callback);
        const unsubscribeOther = api[name](otherCallback);
        const emit = event.emit as (...args: unknown[]) => Promise<void>;
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        await emit(...args);
        expect(callback).toHaveBeenCalledWith(...args);

        unsubscribe();
        expect(event.listenerCount()).toBe(1);
        await emit(...args);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(otherCallback).toHaveBeenCalledTimes(2);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test.each(events.map(([name]) => name))("%s throws when the namespace is absent without warning or a no-op fallback", name => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        const native = Reflect.get(globalThis, profile === "chrome" ? "chrome" : "browser") as object;
        Reflect.deleteProperty(native, "notifications");
        expect(() => api[name](() => undefined)).toThrow(TypeError);
        expect(warn).not.toHaveBeenCalled();
    });

    test.each(events)("%s throws when the individual native event is absent", (name, eventName, _args) => {
        harness.capabilities.set(`notifications.${eventName}`, false);
        expect(() => api[name](() => undefined)).toThrow(TypeError);
    });

    test("resolves the current API at subscription time and retains the event for cleanup", () => {
        const firstEvent = harness.configurable.active.notifications.onClicked;
        const unsubscribeFirst = api.onNotificationsClicked(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.configurable.active.notifications.onClicked;
        const unsubscribeSecond = api.onNotificationsClicked(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
