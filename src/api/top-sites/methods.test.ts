import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "../../../tests/api/availability";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {getTopSites} from "./methods";

import type {TopSite, TopSitesOptions} from "./types";

const sites: TopSite[] = [
    {url: "https://second.test/", title: "Second"},
    {url: "https://first.test/", title: "First", favicon: null, type: "url"},
    {url: "https://search.test/", title: "Search", favicon: "data:image/png;base64,AA==", type: "search"},
];

describe.each(["chrome", "firefox"] as const)("topSites through %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
        harness.configurable.active.topSites.get.setResult(sites);
    });

    afterEach(() => restore());

    test("preserves native order, fields and the original result", async () => {
        await expect(getTopSites()).resolves.toBe(sites);
        expect(harness.configurable.active.topSites.get.calls[0].args).toEqual([]);
    });

    test("explicit undefined uses the common no-options signature", async () => {
        await expect(getTopSites(undefined)).resolves.toBe(sites);
        expect(harness.configurable.active.topSites.get.calls[0].args).toEqual([]);
    });

    test("does not cache or replace empty results", async () => {
        await expect(getTopSites()).resolves.toBe(sites);
        const empty: TopSite[] = [];
        harness.configurable.active.topSites.get.setResult(empty);
        await expect(getTopSites()).resolves.toBe(empty);
        expect(harness.configurable.active.topSites.get.calls).toHaveLength(2);
    });

    test("preserves the native failure channel instead of returning an empty list", async () => {
        harness.configurable.active.topSites.get.failNext(new Error("Top sites access denied"));
        await expect(getTopSites()).rejects.toThrow("Top sites access denied");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });
});

describe("Firefox topSites options", () => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "firefox"});
        harness.configurable.active.topSites.get.setResult(sites);
    });

    afterEach(() => restore());

    test.each<TopSitesOptions>([
        {}, {limit: 1}, {limit: 100}, {includeFavicon: true},
        {includeBlocked: true, includePinned: true, includeSearchShortcuts: true, onePerDomain: false},
        {newtab: true, limit: 12, includeFavicon: false, includePinned: false},
    ])("forwards options unchanged without a callback: %j", async options => {
        Object.freeze(options);
        await expect(getTopSites(options)).resolves.toBe(sites);
        const call = harness.configurable.active.topSites.get.calls[0];
        expect(call.args).toEqual([options]);
        expect(call.args[0]).toBe(options);
        expect(call.callback).toBeUndefined();
        expect(call.invocation).toBe("promise");
    });

    test("preserves options-call rejection", async () => {
        const error = new Error("Invalid native options");
        harness.configurable.active.topSites.get.failNext(error);
        await expect(getTopSites({limit: -1})).rejects.toBe(error);
    });
});

describe("topSites invocation boundaries", () => {
    let restore: () => void;

    beforeEach(() => {
        restore = installAvailabilityGlobals();
    });

    afterEach(() => restore());

    const useTopSites = (native: unknown) => {
        restore();
        restore = installAvailabilityGlobals({chrome: {runtime: {}, topSites: native}});
    };

    test("rejects without extension globals", async () => {
        await expect(getTopSites()).rejects.toThrow("WebExtension API not available");
    });

    test.each([undefined, {}, {get: true}])("rejects an unavailable native method: %j", async native => {
        useTopSites(native);
        await expect(getTopSites()).rejects.toBeInstanceOf(TypeError);
        await expect(getTopSites({limit: 1})).rejects.toBeInstanceOf(TypeError);
    });

    test.each(["namespace", "method", "invocation"])("preserves synchronous %s errors as rejections", async level => {
        const error = new Error("Context invalidated");

        const fail = () => {
            throw error;
        };

        const native = {get: fail};
        useTopSites(native);

        if (level === "namespace") {
            Object.defineProperty(globalThis.chrome, "topSites", {get: fail});
        } else if (level === "method") {
            Object.defineProperty(native, "get", {get: fail});
        }

        await expect(getTopSites()).rejects.toBe(error);
        await expect(getTopSites({})).rejects.toBe(error);
    });

    test("awaits callbacks and keeps the native receiver", async () => {
        let complete!: (result: TopSite[]) => void;

        const native = {get: jest.fn(function (this: unknown, callback: typeof complete) {
            expect(this).toBe(native);
            complete = callback;
        })};

        useTopSites(native);
        const pending = getTopSites();
        expect(native.get).toHaveBeenCalledTimes(1);
        complete(sites);
        await expect(pending).resolves.toBe(sites);
    });

    test.each([undefined, {includeFavicon: true}])("awaits a Promise result with options %j", async options => {
        let complete!: (result: TopSite[]) => void;

        const native = {get: function (this: unknown) {
            expect(this).toBe(native);

            return new Promise<TopSite[]>(resolve => {
                complete = resolve;
            });
        }};

        useTopSites(native);
        const pending = getTopSites(options);
        complete(sites);
        await expect(pending).resolves.toBe(sites);
    });

    test("does not discard options when Chromium rejects the overload", async () => {
        const error = new TypeError("No matching signature");

        const get = jest.fn<(options: TopSitesOptions) => never>(() => {
            throw error;
        });

        useTopSites({get});
        const options = {limit: 1};
        await expect(getTopSites(options)).rejects.toBe(error);
        expect(get).toHaveBeenCalledTimes(1);
        expect(get).toHaveBeenCalledWith(options);
    });
});
