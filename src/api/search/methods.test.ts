import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "../../../tests/api/availability";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {
    canGetSearchEngines,
    canQuerySearch,
    canSearchWithEngine,
    getDefaultSearchEngine,
    getSearchEngines,
    hasSearchEngine,
    querySearch,
    searchInCurrentTab,
    searchInNewTab,
    searchInNewWindow,
    searchInTab,
    searchWithEngine,
} from "./methods";

import type {SearchEngine, SearchTargetOptions} from "./types";

const text = "café & web extensions?";

const engines: SearchEngine[] = [
    {name: "Example", isDefault: false},
    {name: "Default", isDefault: true, alias: "@default", favIconUrl: "https://example.test/icon.png"},
];

describe.each(["chrome", "firefox"] as const)("search query through %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
        harness.configurable.active.search.query.setResult(undefined);
    });

    afterEach(() => restore());

    test.each<chrome.search.QueryInfo>([
        {text}, {text, tabId: 0}, {text, disposition: "CURRENT_TAB"},
        {text, disposition: "NEW_TAB"}, {text, disposition: "NEW_WINDOW"},
    ])("forwards query options unchanged: %j", async options => {
        await expect(querySearch(options)).resolves.toBeUndefined();
        expect(harness.configurable.active.search.query.calls[0].args[0]).toBe(options);
    });

    const helpers = [
        ["tab", () => searchInTab(text, 0), {text, tabId: 0}],
        ["current tab", () => searchInCurrentTab(text), {text, disposition: "CURRENT_TAB"}],
        ["new tab", () => searchInNewTab(text), {text, disposition: "NEW_TAB"}],
        ["new window", () => searchInNewWindow(text), {text, disposition: "NEW_WINDOW"}],
    ] as const;

    test.each(helpers)("search in %s uses query without creating another tab", async (_name, invoke, expected) => {
        await expect(invoke()).resolves.toBeUndefined();
        expect(harness.configurable.active.search.query.calls[0].args).toEqual([expected]);
        expect(harness.tabs.create.calls).toHaveLength(0);
    });

    test.each([
        ["query", () => querySearch({text})],
        ...helpers.map(([name, invoke]) => [name, invoke] as const),
    ])("%s preserves native errors", async (_name, invoke) => {
        harness.configurable.active.search.query.failNext(new Error("Search permission denied"));
        await expect(invoke()).rejects.toThrow("Search permission denied");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });
});

describe("Firefox search engines", () => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "firefox"});
        harness.configurable.active.search.get.setResult(engines);
        harness.configurable.active.search.search.setResult(undefined);
    });

    afterEach(() => restore());

    test("lists engines through a Promise-only call without a callback", async () => {
        await expect(getSearchEngines()).resolves.toBe(engines);

        expect(harness.configurable.active.search.get.calls[0]).toMatchObject({
            args: [], callback: undefined, invocation: "promise",
        });
    });

    test.each<SearchTargetOptions>([{}, {tabId: 0}, {disposition: "CURRENT_TAB"}, {disposition: "NEW_TAB"}, {disposition: "NEW_WINDOW"}])(
        "selects the named engine with target %j", async options => {
            const original = {...options};
            await expect(searchWithEngine(text, "Example", options)).resolves.toBeUndefined();

            expect(harness.configurable.active.search.search.calls[0]).toMatchObject({
                args: [{...options, query: text, engine: "Example"}], callback: undefined, invocation: "promise",
            });

            expect(options).toEqual(original);
            expect(harness.configurable.active.search.query.calls).toHaveLength(0);
        }
    );

    test("leaves the engine search default destination to Firefox", async () => {
        await searchWithEngine(text, "Example");
        expect(harness.configurable.active.search.search.calls[0].args).toEqual([{query: text, engine: "Example"}]);
    });

    test("returns the actual default engine, not the first item", async () => {
        await expect(getDefaultSearchEngine()).resolves.toBe(engines[1]);
    });

    test.each([{value: []}, {value: [engines[0]]}])("returns undefined when no default is listed: %j", async ({value}) => {
        harness.configurable.active.search.get.setResult(value);
        await expect(getDefaultSearchEngine()).resolves.toBeUndefined();
    });

    test.each([["Example", true], ["example", false], ["Missing", false]])("matches engine name %s exactly", async (name, expected) => {
        await expect(hasSearchEngine(name)).resolves.toBe(expected);
    });

    test("does not cache the engine list", async () => {
        await expect(hasSearchEngine("Example")).resolves.toBe(true);
        harness.configurable.active.search.get.setResult([]);
        await expect(hasSearchEngine("Example")).resolves.toBe(false);
        await expect(getDefaultSearchEngine()).resolves.toBeUndefined();
    });

    test.each([
        ["get", () => getSearchEngines()],
        ["get", () => getDefaultSearchEngine()],
        ["search", () => searchWithEngine(text, "Missing")],
    ] as const)("preserves rejection from search.%s", async (method, invoke) => {
        const error = new Error("Native search failure");
        harness.configurable.active.search[method].failNext(error);
        await expect(invoke()).rejects.toBe(error);
    });

    test("hasSearchEngine contains native rejection", async () => {
        harness.configurable.active.search.get.failNext(new Error("Access denied"));
        await expect(hasSearchEngine("Example")).resolves.toBe(false);
    });
});

describe("search capability and error boundaries", () => {
    let restore: () => void;

    const useSearch = (native: unknown) => {
        restore();
        restore = installAvailabilityGlobals({chrome: {runtime: {}, search: native}});
    };

    beforeEach(() => {
        restore = installAvailabilityGlobals();
        jest.spyOn(console, "warn").mockImplementation(() => undefined);
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        restore();
        jest.restoreAllMocks();
    });

    const checks = [["query", canQuerySearch], ["get", canGetSearchEngines], ["search", canSearchWithEngine]] as const;

    test.each(checks)("checks search.%s independently without invoking it", (method, check) => {
        const invoke = jest.fn(() => {
            throw new Error("Must not probe");
        });

        const native: Record<string, unknown> = {[method]: invoke};
        useSearch(native);
        expect(check()).toBe(true);

        for (const [other, otherCheck] of checks) {
            expect(otherCheck()).toBe(other === method);
        }

        expect(invoke).not.toHaveBeenCalled();
        delete native[method];
        expect(check()).toBe(false);
        native[method] = invoke;
        expect(check()).toBe(true);
    });

    test.each([undefined, null, {}, {query: true, get: "get", search: {}}])("returns false for absent/non-callable methods: %j", async native => {
        useSearch(native);

        for (const [, check] of checks) {
            expect(check()).toBe(false);
        }

        await expect(hasSearchEngine("Example")).resolves.toBe(false);
    });

    test("is safe without extension globals", async () => {
        for (const [, check] of checks) {
            expect(check()).toBe(false);
        }

        await expect(hasSearchEngine("Example")).resolves.toBe(false);
    });

    test.each(["global", "namespace", "method", "invocation"])("contains %s access failures only in predicates", async level => {
        const fail = () => {
            throw new Error("Context invalidated");
        };

        const native = {query: fail, get: fail, search: fail};
        useSearch(native);

        if (level === "global") {
            Object.defineProperty(globalThis, "chrome", {configurable: true, get: fail});
        } else if (level === "namespace") {
            Object.defineProperty(globalThis.chrome, "search", {get: fail});
        } else if (level === "method") {
            for (const [method] of checks) {
                Object.defineProperty(native, method, {get: fail});
            }
        }

        for (const [, check] of checks) {
            expect(check()).toBe(level === "invocation");
        }

        await expect(hasSearchEngine("Example")).resolves.toBe(false);
        await expect(querySearch({text})).rejects.toThrow("Context invalidated");
        await expect(getSearchEngines()).rejects.toThrow("Context invalidated");
        await expect(getDefaultSearchEngine()).rejects.toThrow("Context invalidated");
        await expect(searchWithEngine(text, "Example")).rejects.toThrow("Context invalidated");
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
    });

    test("does not fill missing Firefox methods from the chrome global", () => {
        restore();

        restore = installAvailabilityGlobals({
            browser: {runtime: {id: "firefox"}, search: {}},
            chrome: {search: {query() {}, get() {}, search() {}}},
        });

        for (const [, check] of checks) {
            expect(check()).toBe(false);
        }
    });

    test("operations reject if search is unavailable (Safari), with no implicit URL fallback", async () => {
        useSearch(undefined);
        await expect(querySearch({text})).rejects.toBeInstanceOf(TypeError);
        await expect(getSearchEngines()).rejects.toBeInstanceOf(TypeError);
        await expect(searchWithEngine(text, "Example")).rejects.toBeInstanceOf(TypeError);
        await expect(searchInNewTab(text)).rejects.toBeInstanceOf(TypeError);
    });

    test("query awaits a Promise-returning API and preserves its receiver", async () => {
        let complete!: () => void;
        let settled = false;

        const native = {query: jest.fn(function (this: unknown, options: chrome.search.QueryInfo) {
            expect(this).toBe(native);
            expect(options).toEqual({text});

            return new Promise<void>(resolve => {
                complete = resolve;
            });
        })};

        useSearch(native);
        const pending = querySearch({text});

        void pending.then(() => {
            settled = true;
        });

        await Promise.resolve();
        expect(settled).toBe(false);
        complete();
        await expect(pending).resolves.toBeUndefined();
    });

    test("query preserves Promise rejection", async () => {
        const error = new Error("Promise query failed");
        useSearch({query: () => Promise.reject(error)});
        await expect(querySearch({text})).rejects.toBe(error);
    });
});
