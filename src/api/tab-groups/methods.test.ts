import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "../../../tests/api/availability";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

import type {TabGroup} from "./types";

const group: chrome.tabGroups.TabGroup = {id: 7, windowId: 1, title: "Work", color: "blue", collapsed: false, shared: false};
const groups = [group];
const query = Object.freeze({windowId: 1, title: "W*", color: "blue" as const, collapsed: false, shared: false});
const update = Object.freeze({title: "Changed", color: "red" as const, collapsed: true});
const move = Object.freeze({index: -1, windowId: 2});

const calls = [
    ["get", () => api.getTabGroup(7), [7], group],
    ["query", () => api.queryTabGroups(), [{}], groups],
    ["query", () => api.queryTabGroups(undefined), [{}], groups],
    ["query", () => api.queryTabGroups(query), [query], groups],
    ["update", () => api.updateTabGroup(7, update), [7, update], group],
    ["update", () => api.updateTabGroup(7, {}), [7, {}], undefined],
    ["move", () => api.moveTabGroup(7, move), [7, move], group],
    ["move", () => api.moveTabGroup(7, {index: 0}), [7, {index: 0}], undefined],
] as const;

describe.each(["chrome", "firefox"] as const)("tab groups methods via %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test.each(calls)("%s preserves arguments and native result identity", async (method, invoke, args, result) => {
        const native = harness.configurable.active.tabGroups[method];
        native.setResult(result as never);
        await expect(invoke()).resolves.toBe(result);
        expect(native.calls).toHaveLength(1);
        expect(native.calls[0].args).toEqual(args);

        for (const options of [query, update, move]) {
            const index = (args as readonly unknown[]).indexOf(options);

            if (index >= 0) {
                expect(native.calls[0].args[index]).toBe(options);
            }
        }
    });

    test.each(calls.map(([method, invoke]) => [method, invoke] as const))("%s propagates native errors", async (method, invoke) => {
        harness.configurable.active.tabGroups[method].failNext(new Error("Group operation failed"));
        await expect(invoke()).rejects.toThrow("Group operation failed");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("preserves an empty query result and reads again on subsequent calls", async () => {
        const empty: chrome.tabGroups.TabGroup[] = [];
        const native = harness.configurable.active.tabGroups.query;
        native.setResult(empty);
        await expect(api.queryTabGroups()).resolves.toBe(empty);
        native.setResult(groups);
        await expect(api.queryTabGroups()).resolves.toBe(groups);
    });
});

describe("tab groups method boundaries", () => {
    let restore: () => void;

    beforeEach(() => {
        restore = installAvailabilityGlobals();
    });

    afterEach(() => restore());

    test.each(calls.map(([method, invoke]) => [method, invoke] as const))("%s rejects without extension globals", async (_method, invoke) => {
        await expect(invoke()).rejects.toThrow("WebExtension API not available");
    });

    test("waits for callback completion and retains the native receiver", async () => {
        let complete!: (value: TabGroup) => void;

        const native = {get: jest.fn(function (this: unknown, id: number, callback: typeof complete) {
            expect(this).toBe(native);
            expect(id).toBe(7);
            complete = callback;
        })};

        restore();
        restore = installAvailabilityGlobals({chrome: {runtime: {}, tabGroups: native}});
        let settled = false;
        const pending = api.getTabGroup(7);

        void pending.then(() => {
            settled = true;
        });

        await Promise.resolve();
        expect(settled).toBe(false);
        complete(group);
        await expect(pending).resolves.toBe(group);
    });

    test("retains Firefox Promise results without adding Chromium fields", async () => {
        const firefoxGroup: TabGroup = {id: 7, windowId: 1, color: "blue", collapsed: false};
        const failure = new Error("Missing group");
        const get = jest.fn<() => Promise<TabGroup>>().mockResolvedValueOnce(firefoxGroup).mockRejectedValueOnce(failure);
        restore();
        restore = installAvailabilityGlobals({browser: {runtime: {id: "firefox"}, tabGroups: {get}}});
        await expect(api.getTabGroup(7)).resolves.toBe(firefoxGroup);
        expect(firefoxGroup).not.toHaveProperty("shared");
        await expect(api.getTabGroup(7)).rejects.toBe(failure);
    });

    test.each(["namespace", "method", "invocation"])("preserves synchronous %s errors as rejections", async level => {
        const error = new Error("Context invalidated");

        const fail = () => {
            throw error;
        };

        const native = {get: fail};
        const chrome = {runtime: {}, tabGroups: native};

        if (level === "namespace") {
            Object.defineProperty(chrome, "tabGroups", {get: fail});
        }

        if (level === "method") {
            Object.defineProperty(native, "get", {get: fail});
        }

        restore();
        restore = installAvailabilityGlobals({chrome});
        await expect(api.getTabGroup(7)).rejects.toBe(error);
    });
});
