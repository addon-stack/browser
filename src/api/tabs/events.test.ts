import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../testing";
import * as api from "./events";

const tab = createTabFixture({id: 7});

// Keep the public names and native events independent of the generator's specification.
const events = [
    ["onTabActivated", "onActivated", [{tabId: 7, windowId: 1}]],
    ["onTabAttached", "onAttached", [7, {newWindowId: 1, newPosition: 0}]],
    ["onTabCreated", "onCreated", [tab]],
    ["onTabDetached", "onDetached", [7, {oldWindowId: 1, oldPosition: 0}]],
    ["onTabHighlighted", "onHighlighted", [{tabIds: [7], windowId: 1}]],
    ["onTabMoved", "onMoved", [7, {windowId: 1, fromIndex: 0, toIndex: 1}]],
    ["onTabRemoved", "onRemoved", [7, {windowId: 1, isWindowClosing: false}]],
    ["onTabReplaced", "onReplaced", [7, 8]],
    ["onTabUpdated", "onUpdated", [7, {status: "complete"}, tab]],
    ["onTabZoomChange", "onZoomChange", [{tabId: 7, oldZoomFactor: 1, newZoomFactor: 2, zoomSettings: {}}]],
] as const;

describe.each(["chrome", "firefox"] as const)("tab events in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each(events)("%s forwards arguments and removes only its own listener", async (name, eventName, args) => {
        const event = harness.tabs.events[eventName];
        const callback = jest.fn();
        const otherCallback = jest.fn();
        const unsubscribe = api[name](callback);
        const unsubscribeOther = api[name](otherCallback);
        // Each row exercises a different native callback signature.
        const emit = event.emit as (...args: unknown[]) => Promise<void>;
        expect(event.listenerCount()).toBe(2);
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

    test("resolves the current API at subscription time and retains the event for cleanup", () => {
        const firstEvent = harness.tabs.events.onUpdated;
        const unsubscribeFirst = api.onTabUpdated(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.tabs.events.onUpdated;
        const unsubscribeSecond = api.onTabUpdated(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
