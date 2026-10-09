import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

// Keep the public names and native payloads independent of the codegen specification.
const events = [
    ["onCookieChanged", "onChanged", [{removed: true, cause: "explicit", cookie: {name: "session", value: "value", domain: "example.test", path: "/", storeId: "0", session: true, hostOnly: true, httpOnly: true, secure: true, sameSite: "lax"}}] satisfies Parameters<Parameters<typeof api.onCookieChanged>[0]>],
] as const;

describe.each(["chrome", "firefox"] as const)("cookies events in %s", profile => {
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
        const event = harness.configurable.active.cookies[eventName];
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
        const firstEvent = harness.configurable.active.cookies.onChanged;
        const unsubscribeFirst = api.onCookieChanged(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.configurable.active.cookies.onChanged;
        const unsubscribeSecond = api.onCookieChanged(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
