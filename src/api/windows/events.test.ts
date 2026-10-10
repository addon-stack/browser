import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, createWindowFixture, installBrowserGlobals} from "../../testing";
import * as api from "./events";

import type {WindowEventFilter} from "./types";

const filter: WindowEventFilter = {windowTypes: ["normal", "popup"]};
const window = createWindowFixture({id: 7});

// Keep the public-to-native mapping independent of the codegen description.
const filteredEvents = [
    ["onWindowCreated", "onCreated", window],
    ["onWindowFocusChanged", "onFocusChanged", 7],
    ["onWindowRemoved", "onRemoved", 7],
] as const;

describe.each(["chrome", "firefox"] as const)("window events in %s", profile => {
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

    test.each(filteredEvents)("%s forwards filters and payloads and unsubscribes independently", async (name, eventName, payload) => {
        const event = harness.windows.events[eventName];
        const callback = jest.fn<(_payload: unknown) => void>();
        const otherCallback = jest.fn<(_payload: unknown) => void>();
        const unsubscribe = api[name](callback, filter);
        const unsubscribeOther = api[name](otherCallback);
        const unsubscribeUndefined = api[name](() => undefined, undefined);
        const registrations = event.registrations();
        expect(registrations[0].args).toEqual([filter]);
        expect(registrations[0].args[0]).toBe(filter);
        expect(registrations[1].args).toEqual([]);
        expect(registrations[2].args).toEqual([]);
        const emit = event.emit as (payload: unknown) => Promise<void>;
        await emit(payload);
        expect(callback).toHaveBeenCalledWith(payload);

        unsubscribe();
        unsubscribe();
        await emit(payload);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(otherCallback).toHaveBeenCalledTimes(2);
        unsubscribeOther();
        unsubscribeUndefined();
        expect(event.listenerCount()).toBe(0);
    });

    test("onWindowBoundsChanged uses the basic template without a filter argument", async () => {
        const event = harness.windows.events.onBoundsChanged;
        const callback = jest.fn<Parameters<typeof api.onWindowBoundsChanged>[0]>();
        const unsubscribe = api.onWindowBoundsChanged(callback);
        expect(event.registrations()[0].args).toEqual([]);
        await event.emit(window);
        expect(callback).toHaveBeenCalledWith(window);
        unsubscribe();
        expect(event.listenerCount()).toBe(0);
    });

    test("contains synchronous and asynchronous callback failures", async () => {
        const error = new Error("Window callback failed");
        const log = jest.spyOn(console, "error").mockImplementation(() => undefined);

        const unsubscribe = api.onWindowCreated(() => {
            throw error;
        }, filter);

        await harness.windows.events.onCreated.emit(window);
        expect(log).toHaveBeenCalledWith("Listener error:", error);
        unsubscribe();

        const unsubscribeAsync = api.onWindowCreated(async () => {
            throw error;
        });

        await expect(harness.windows.events.onCreated.emit(window)).rejects.toBe(error);
        expect(log).toHaveBeenCalledWith("Listener in promise error:", error);
        unsubscribeAsync();
    });

    test("resolves the API at subscription time and removes listeners from the original event", () => {
        const firstEvent = harness.windows.events.onCreated;
        const unsubscribeFirst = api.onWindowCreated(() => undefined, filter);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.windows.events.onCreated;
        const unsubscribeSecond = api.onWindowCreated(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
