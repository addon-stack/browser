import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./events";

const filter: chrome.webRequest.RequestFilter = {urls: ["https://example.test/*"], types: ["xmlhttprequest"]};

const details: chrome.webRequest.WebRequestDetails = {
    documentLifecycle: "active",
    frameId: 0,
    frameType: "outermost_frame",
    method: "GET",
    parentFrameId: -1,
    requestId: "request-1",
    tabId: 7,
    timeStamp: 1,
    type: "xmlhttprequest",
    url: "https://example.test/data",
};

const responseDetails = {...details, fromCache: false, statusCode: 200, statusLine: "HTTP/1.1 200 OK"};

const authDetails: chrome.webRequest.OnAuthRequiredDetails = {
    ...details,
    challenger: {host: "example.test", port: 443},
    isProxy: false,
    scheme: "basic",
    statusCode: 401,
    statusLine: "HTTP/1.1 401 Unauthorized",
};

// Keep this public-to-native mapping independent of the generator's specification.
const events = [
    ["onWebRequestAuthRequired", "onAuthRequired", authDetails],
    ["onWebRequestBeforeRedirect", "onBeforeRedirect", {...responseDetails, redirectUrl: "https://example.test/next"}],
    ["onWebRequestBeforeRequest", "onBeforeRequest", details],
    ["onWebRequestBeforeSendHeaders", "onBeforeSendHeaders", details],
    ["onWebRequestCompleted", "onCompleted", responseDetails],
    ["onWebRequestErrorOccurred", "onErrorOccurred", {...details, fromCache: false, error: "net::ERR_FAILED"}],
    ["onWebRequestHeadersReceived", "onHeadersReceived", responseDetails],
    ["onWebRequestResponseStarted", "onResponseStarted", responseDetails],
    ["onWebRequestSendHeaders", "onSendHeaders", details],
] as const;

describe.each(["chrome", "firefox"] as const)("webRequest events in %s", profile => {
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

    test.each(events)("%s forwards registration and callback arguments and unsubscribes independently", async (name, eventName, payload) => {
        const event = harness.configurable.active.webRequest[eventName];
        const callback = jest.fn<(_details: unknown) => undefined>();
        const otherCallback = jest.fn<(_details: unknown) => undefined>();
        const options: [] = [];
        const unsubscribe = api[name](callback, filter, options);
        const unsubscribeOther = api[name](otherCallback, filter);
        const registrations = event.registrations();
        expect(registrations).toHaveLength(2);
        expect(registrations[0].args[0]).toBe(filter);
        expect(registrations[0].args[1]).toBe(options);
        expect(registrations[1].args).toEqual([filter, undefined]);
        // The table contains each native event's distinct details object.
        const emit = event.emit as (payload: unknown) => Promise<void>;
        await emit(payload);
        expect(callback).toHaveBeenCalledWith(payload);

        unsubscribe();
        unsubscribe();
        expect(event.listenerCount()).toBe(1);
        await emit(payload);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(otherCallback).toHaveBeenCalledTimes(2);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("preserves the synchronous blocking response and event-specific options", () => {
        const response: chrome.webRequest.BlockingResponse = {cancel: true};
        const options: Parameters<typeof api.onWebRequestBeforeRequest>[2] = ["blocking", "requestBody"];
        const unsubscribe = api.onWebRequestBeforeRequest(() => response, filter, options);
        const [registration] = harness.configurable.active.webRequest.onBeforeRequest.registrations();
        expect(registration.args[1]).toBe(options);
        expect(registration.listener(details)).toBe(response);
        unsubscribe();
    });

    test("forwards the optional authentication callback and preserves returned credentials", () => {
        const response: chrome.webRequest.BlockingResponse = {authCredentials: {username: "test", password: "test"}};
        const asyncCallback = jest.fn<(response: chrome.webRequest.BlockingResponse) => void>();

        const callback = jest.fn<Parameters<typeof api.onWebRequestAuthRequired>[0]>((_, respond) => {
            respond?.(response);

            return undefined;
        });

        const unsubscribe = api.onWebRequestAuthRequired(callback, filter, ["asyncBlocking"]);
        const event = harness.configurable.active.webRequest.onAuthRequired;
        expect(event.registrations()[0].listener(authDetails, asyncCallback)).toBeUndefined();
        expect(callback).toHaveBeenCalledWith(authDetails, asyncCallback);
        expect(asyncCallback).toHaveBeenCalledWith(response);
        unsubscribe();

        const unsubscribeBlocking = api.onWebRequestAuthRequired(() => response, filter, ["blocking"]);
        expect(event.registrations()[0].listener(authDetails)).toBe(response);
        unsubscribeBlocking();
    });

    test("contains callback errors through safeListener", () => {
        const error = new Error("listener failed");
        const log = jest.spyOn(console, "error").mockImplementation(() => undefined);

        const unsubscribe = api.onWebRequestBeforeRequest(() => {
            throw error;
        }, filter);

        const [registration] = harness.configurable.active.webRequest.onBeforeRequest.registrations();
        expect(registration.listener(details)).toBeUndefined();
        expect(log).toHaveBeenCalledWith("Listener error:", error);
        unsubscribe();
    });

    test("resolves the current API at subscription time and retains the event for cleanup", () => {
        const firstEvent = harness.configurable.active.webRequest.onBeforeRequest;
        const unsubscribeFirst = api.onWebRequestBeforeRequest(() => undefined, filter);
        restoreGlobals();
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const secondEvent = harness.configurable.active.webRequest.onBeforeRequest;
        const unsubscribeSecond = api.onWebRequestBeforeRequest(() => undefined, filter);
        unsubscribeFirst();
        expect(firstEvent.listenerCount()).toBe(0);
        expect(secondEvent.listenerCount()).toBe(1);
        unsubscribeSecond();
    });
});
