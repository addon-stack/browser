import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

const extension: chrome.management.ExtensionInfo = {
    id: "extension-1", name: "Example", shortName: "Example", description: "Example extension", version: "1.0",
    enabled: true, mayDisable: true, isApp: false, offlineEnabled: false, optionsUrl: "",
    permissions: [], hostPermissions: [], type: "extension", installType: "normal",
};

// Keep the public names and native payloads independent of the codegen specification.
const events = [
    ["onExtensionDisabled", "onDisabled", [extension] satisfies Parameters<Parameters<typeof api.onExtensionDisabled>[0]>],
    ["onExtensionEnabled", "onEnabled", [extension] satisfies Parameters<Parameters<typeof api.onExtensionEnabled>[0]>],
    ["onExtensionInstalled", "onInstalled", [extension] satisfies Parameters<Parameters<typeof api.onExtensionInstalled>[0]>],
    ["onExtensionUninstalled", "onUninstalled", ["extension-1"] satisfies Parameters<Parameters<typeof api.onExtensionUninstalled>[0]>],
] as const;

describe.each(["chrome", "firefox"] as const)("management events in %s", profile => {
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
        const event = harness.configurable.active.management[eventName];
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
        const firstEvent = harness.configurable.active.management.onDisabled;
        const unsubscribeFirst = api.onExtensionDisabled(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.configurable.active.management.onDisabled;
        const unsubscribeSecond = api.onExtensionDisabled(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
