import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

const filter: chrome.webNavigation.WebNavigationEventFilter = {url: [{hostEquals: "example.test"}]};

const details: chrome.webNavigation.WebNavigationFramedCallbackDetails = {
    documentId: "document-1",
    documentLifecycle: "active",
    frameId: 0,
    frameType: "outermost_frame",
    parentFrameId: -1,
    processId: 1,
    tabId: 7,
    timeStamp: 1,
    url: "https://example.test/",
};

const transition: chrome.webNavigation.WebNavigationTransitionCallbackDetails = {
    ...details,
    transitionQualifiers: [],
    transitionType: "link",
};

// Keep the public-to-native mapping independent of the codegen description.
const filteredEvents = [
    ["onWebNavigationBeforeNavigate", "onBeforeNavigate", details],
    ["onWebNavigationCommitted", "onCommitted", transition],
    ["onWebNavigationCompleted", "onCompleted", details],
    ["onWebNavigationCreatedNavigationTarget", "onCreatedNavigationTarget", {...details, sourceTabId: 8, sourceFrameId: 0, sourceProcessId: 1}],
    ["onWebNavigationDOMContentLoaded", "onDOMContentLoaded", details],
    ["onWebNavigationErrorOccurred", "onErrorOccurred", {...details, error: "net::ERR_FAILED"}],
    ["onWebNavigationHistoryStateUpdated", "onHistoryStateUpdated", transition],
    ["onWebNavigationReferenceFragmentUpdated", "onReferenceFragmentUpdated", transition],
] as const;

describe.each(["chrome", "firefox"] as const)("webNavigation events in %s", profile => {
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
        const event = harness.configurable.active.webNavigation[eventName];
        const callback = jest.fn<(_details: unknown) => void>();
        const otherCallback = jest.fn<(_details: unknown) => void>();
        const unsubscribe = api[name](callback, filter);
        const unsubscribeOther = api[name](otherCallback);
        const unsubscribeUndefined = api[name](() => undefined, undefined);
        const registrations = event.registrations();
        expect(registrations[0].args).toEqual([filter]);
        expect(registrations[0].args[0]).toBe(filter);
        expect(registrations[1].args).toEqual([undefined]);
        expect(registrations[2].args).toEqual([undefined]);
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

    test("onWebNavigationTabReplaced uses the basic template without a filter argument", async () => {
        const event = harness.configurable.active.webNavigation.onTabReplaced;
        const callback = jest.fn<Parameters<typeof api.onWebNavigationTabReplaced>[0]>();
        const unsubscribe = api.onWebNavigationTabReplaced(callback);
        const replacement = {replacedTabId: 8, tabId: 7, timeStamp: 1};
        expect(event.registrations()[0].args).toEqual([]);
        await event.emit(replacement);
        expect(callback).toHaveBeenCalledWith(replacement);
        unsubscribe();
        expect(event.listenerCount()).toBe(0);
    });

    test("contains synchronous and asynchronous callback failures", async () => {
        const error = new Error("Navigation callback failed");
        const log = jest.spyOn(console, "error").mockImplementation(() => undefined);

        const unsubscribe = api.onWebNavigationCompleted(() => {
            throw error;
        }, filter);

        const event = harness.configurable.active.webNavigation.onCompleted;
        await event.emit(details);
        expect(log).toHaveBeenCalledWith("Listener error:", error);
        unsubscribe();

        const unsubscribeAsync = api.onWebNavigationCompleted(async () => {
            throw error;
        });

        await expect(event.emit(details)).rejects.toBe(error);
        expect(log).toHaveBeenCalledWith("Listener in promise error:", error);
        unsubscribeAsync();
    });

    test("resolves the API at subscription time and removes listeners from the original event", () => {
        const firstEvent = harness.configurable.active.webNavigation.onCompleted;
        const unsubscribeFirst = api.onWebNavigationCompleted(() => undefined, filter);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.configurable.active.webNavigation.onCompleted;
        const unsubscribeSecond = api.onWebNavigationCompleted(() => undefined);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
