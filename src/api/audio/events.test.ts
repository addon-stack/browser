import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

// Keep the public names and native payloads independent of the codegen specification.
const events = [
    ["onAudioDeviceListChanged", "onDeviceListChanged", [[{id: "speaker", deviceName: "Speaker", displayName: "Speaker", deviceType: "USB", isActive: true, level: 70, streamType: "OUTPUT"}]] satisfies Parameters<Parameters<typeof api.onAudioDeviceListChanged>[0]>],
    ["onAudioLevelChanged", "onLevelChanged", [{deviceId: "speaker", level: 30}] satisfies Parameters<Parameters<typeof api.onAudioLevelChanged>[0]>],
    ["onAudioMuteChanged", "onMuteChanged", [{streamType: "OUTPUT", isMuted: true}] satisfies Parameters<Parameters<typeof api.onAudioMuteChanged>[0]>],
] as const;

describe.each(["chrome", "firefox"] as const)("audio events in %s", profile => {
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
        const event = harness.configurable.active.audio[eventName];
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
        const firstEvent = harness.configurable.active.audio.onDeviceListChanged;
        const unsubscribeFirst = api.onAudioDeviceListChanged(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.configurable.active.audio.onDeviceListChanged;
        const unsubscribeSecond = api.onAudioDeviceListChanged(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
