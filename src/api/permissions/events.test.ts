import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

// Keep the public names and native payloads independent of the codegen specification.
const events = [
    ["onPermissionsAdded", "onAdded", [{permissions: ["tabs"], origins: ["https://example.test/*"]}] satisfies Parameters<Parameters<typeof api.onPermissionsAdded>[0]>],
    ["onPermissionsRemoved", "onRemoved", [{permissions: ["tabs"], origins: ["https://example.test/*"]}] satisfies Parameters<Parameters<typeof api.onPermissionsRemoved>[0]>],
] as const;

describe.each(["chrome", "firefox"] as const)("permissions events in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each(events)("%s forwards the native payload and unsubscribes independently", async (name, eventName, args) => {
        const event = harness.permissions[eventName];
        const callback = jest.fn();
        const otherCallback = jest.fn();
        const unsubscribe = api[name](callback);
        const unsubscribeOther = api[name](otherCallback);
        const emit = event.emit as (...args: unknown[]) => Promise<void>;
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        await emit(...args);
        expect(callback).toHaveBeenCalledWith(...args);

        unsubscribe();
        unsubscribe();
        expect(event.listenerCount()).toBe(1);
        await emit(...args);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(otherCallback).toHaveBeenCalledTimes(2);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("resolves the API at subscription time and retains the original event for cleanup", () => {
        const firstEvent = harness.permissions.onAdded;
        const unsubscribeFirst = api.onPermissionsAdded(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.permissions.onAdded;
        const unsubscribeSecond = api.onPermissionsAdded(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
