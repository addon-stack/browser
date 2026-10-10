import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {
    type BrowserHarness,
    createBrowserEvent,
    createBrowserHarness,
    createInstalledDetailsFixture,
    createMessageSenderFixture,
    installBrowserGlobals,
} from "../../testing";
import * as api from "./events";

const port: chrome.runtime.Port = {
    name: "channel",
    disconnect: jest.fn(),
    postMessage: jest.fn(),
    onDisconnect: createBrowserEvent<[chrome.runtime.Port]>().api as chrome.runtime.Port["onDisconnect"],
    onMessage: createBrowserEvent<[unknown, chrome.runtime.Port]>().api as chrome.runtime.Port["onMessage"],
};

const message = {kind: "ping"};
const sender = createMessageSenderFixture();
const sendResponse = jest.fn<(response?: unknown) => void>();

// Keep native payloads and public event names independent of the generation specification.
const events = [
    ["onConnect", [port] satisfies Parameters<Parameters<typeof api.onConnect>[0]>],
    ["onConnectExternal", [port] satisfies Parameters<Parameters<typeof api.onConnectExternal>[0]>],
    ["onInstalled", [createInstalledDetailsFixture({reason: "update", previousVersion: "1.0"})] satisfies Parameters<Parameters<typeof api.onInstalled>[0]>],
    ["onMessage", [message, sender, sendResponse] satisfies Parameters<Parameters<typeof api.onMessage>[0]>],
    ["onMessageExternal", [message, sender, sendResponse] satisfies Parameters<Parameters<typeof api.onMessageExternal>[0]>],
    ["onRestartRequired", ["periodic"] satisfies Parameters<Parameters<typeof api.onRestartRequired>[0]>],
    ["onStartup", [] satisfies Parameters<Parameters<typeof api.onStartup>[0]>],
    ["onSuspend", [] satisfies Parameters<Parameters<typeof api.onSuspend>[0]>],
    ["onSuspendCanceled", [] satisfies Parameters<Parameters<typeof api.onSuspendCanceled>[0]>],
    ["onUpdateAvailable", [{version: "2.0"}] satisfies Parameters<Parameters<typeof api.onUpdateAvailable>[0]>],
    ["onUserScriptConnect", [port] satisfies Parameters<Parameters<typeof api.onUserScriptConnect>[0]>],
    ["onUserScriptMessage", [message, sender, sendResponse] satisfies Parameters<Parameters<typeof api.onUserScriptMessage>[0]>],
] as const;

const messageEvents = ["onMessage", "onMessageExternal", "onUserScriptMessage"] as const;

describe.each(["chrome", "firefox"] as const)("runtime events in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile, captureListenerErrors: true});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each(events)("%s forwards the native payload and unsubscribes independently", async (name, args) => {
        const event = harness.runtime.events[name];
        const callback = jest.fn();
        const otherCallback = jest.fn();
        const unsubscribe = api[name](callback);
        const unsubscribeOther = api[name](otherCallback);
        const emit = event.emit as (...args: unknown[]) => Promise<void>;
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        await emit(...args);
        expect(callback.mock.calls).toEqual([[...args]]);
        args.forEach((arg, index) => expect(callback.mock.calls[0][index]).toBe(arg));

        unsubscribe();
        unsubscribe();
        expect(event.listenerCount()).toBe(1);
        await emit(...args);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(otherCallback).toHaveBeenCalledTimes(2);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test.each(messageEvents)("%s forwards sendResponse and preserves listener return values", async name => {
        const event = harness.runtime.events[name];
        const response = {kind: "pong"};
        const respond = jest.fn<(response?: unknown) => void>();
        const promise = Promise.resolve(response);
        let result: unknown = true;

        const unsubscribe = api[name]((actualMessage, actualSender, actualRespond) => {
            expect(actualMessage).toBe(message);
            expect(actualSender).toBe(sender);
            expect(actualRespond).toBe(respond);
            actualRespond(response);

            return result;
        });

        const listener = event.registrations()[0].listener;

        for (const value of [true, false, undefined, promise]) {
            result = value;
            expect(listener(message, sender, respond)).toBe(value);
        }

        expect(respond.mock.calls).toEqual([[response], [response], [response], [response]]);
        await expect(promise).resolves.toBe(response);
        unsubscribe();
    });

    test.each(messageEvents)("%s keeps synchronous listener error handling", async name => {
        const error = new Error("Message listener failed");

        const unsubscribe = api[name](() => {
            throw error;
        });

        await expect(harness.runtime.events[name].emit(message, sender, sendResponse)).resolves.toBeUndefined();
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "sync"}]);
        unsubscribe();
    });

    test.each(messageEvents)("%s forwards async listener rejections to the existing wrapper", async name => {
        const error = new Error("Async message listener failed");

        const unsubscribe = api[name](async () => {
            throw error;
        });

        await expect(harness.runtime.events[name].emit(message, sender, sendResponse)).rejects.toBe(error);
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "promise"}]);
        unsubscribe();
    });

    test("resolves the API at subscription time and retains the original event for cleanup", () => {
        const firstEvent = harness.runtime.events.onMessage;
        const unsubscribeFirst = api.onMessage(() => undefined);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.runtime.events.onMessage;
        const unsubscribeSecond = api.onMessage(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
