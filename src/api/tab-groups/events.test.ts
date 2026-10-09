import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

import type {TabGroup} from "./types";

const events = [
    ["onTabGroupCreated", "onCreated"],
    ["onTabGroupUpdated", "onUpdated"],
    ["onTabGroupMoved", "onMoved"],
    ["onTabGroupRemoved", "onRemoved"],
] as const;

describe.each(["chrome", "firefox"] as const)("tab groups events via %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;
    const group: TabGroup = {id: 7, windowId: 1, title: "Work", color: "blue", collapsed: false};

    if (profile === "chrome") {
        group.shared = false;
    }

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile, captureListenerErrors: true});
    });

    afterEach(() => restore());

    test.each(events)("%s preserves native payloads and independent subscriptions", async (name, eventName) => {
        const event = harness.configurable.active.tabGroups[eventName];
        const args = profile === "firefox" && eventName === "onRemoved" ? [group, {isWindowClosing: false}] : [group];
        // The raw harness follows Chrome's signature; Firefox supplies additional removal data.
        const emit = event.emit as (...args: unknown[]) => Promise<void>;
        const callback = jest.fn();
        const other = jest.fn();
        const off = api[name](callback);
        const offOther = api[name](other);
        expect(event.registrations().map(item => item.args)).toEqual([[], []]);
        await emit(...args);
        expect(callback.mock.calls).toEqual([args]);
        args.forEach((arg, index) => expect(callback.mock.calls[0][index]).toBe(arg));
        off();
        off();
        await emit(...args);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(other).toHaveBeenCalledTimes(2);
        offOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("cleanup retains the subscribed event after globals change", () => {
        const first = harness.configurable.active.tabGroups.onCreated;
        const off = api.onTabGroupCreated(() => undefined);
        restore();
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
        const second = harness.configurable.active.tabGroups.onCreated;
        const offSecond = api.onTabGroupCreated(() => undefined);
        off();
        expect(first.listenerCount()).toBe(0);
        expect(second.listenerCount()).toBe(1);
        offSecond();
    });

    test.each(events)("%s retains an unavailable event's failure", (name, eventName) => {
        Reflect.deleteProperty(profile === "chrome" ? harness.chrome.tabGroups : harness.browser.tabGroups, eventName);
        expect(() => api[name](() => undefined)).toThrow(TypeError);
    });
});
