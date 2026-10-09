import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {addHostAccessRequest, containsPermissions, getAllPermissions, removeHostAccessRequest, removePermissions, requestPermissions} from "./methods";

const permissions: chrome.permissions.Permissions = {permissions: ["tabs"], origins: ["https://example.test/*"]};

describe.each(["chrome", "firefox"] as const)("permissions methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("request, contains, getAll and remove operate on the same permission state", async () => {
        const native = harness.permissions;
        await expect(containsPermissions(permissions)).resolves.toBe(false);
        await expect(requestPermissions(permissions)).resolves.toBe(true);
        await expect(containsPermissions(permissions)).resolves.toBe(true);
        await expect(getAllPermissions()).resolves.toEqual(permissions);
        await expect(removePermissions(permissions)).resolves.toBe(true);
        await expect(removePermissions(permissions)).resolves.toBe(false);
        await expect(containsPermissions(permissions)).resolves.toBe(false);
        expect(native.contains.calls[0].args[0]).toBe(permissions);
        expect(native.request.calls[0].args[0]).toBe(permissions);
        expect(native.remove.calls[0].args[0]).toBe(permissions);
        expect(native.getAll.calls[0].args).toEqual([]);
    });

    test("requestPermissions preserves a denied request", async () => {
        harness.permissions.request.setResult(false);
        await expect(requestPermissions(permissions)).resolves.toBe(false);
    });

    test("host access wrappers forward requests and default to empty options", async () => {
        const native = harness.permissions;
        const request = {tabId: 7, pattern: "https://example.test/*"};
        native.addHostAccessRequest.setResult(undefined);
        native.removeHostAccessRequest.setResult(undefined);
        await expect(addHostAccessRequest(request)).resolves.toBeUndefined();
        await addHostAccessRequest();
        await expect(removeHostAccessRequest(request)).resolves.toBeUndefined();
        await removeHostAccessRequest();
        expect(native.addHostAccessRequest.calls.map(call => call.args)).toEqual([[request], [{}]]);
        expect(native.removeHostAccessRequest.calls.map(call => call.args)).toEqual([[request], [{}]]);
        expect(native.addHostAccessRequest.calls[0].args[0]).toBe(request);
        expect(native.removeHostAccessRequest.calls[0].args[0]).toBe(request);
    });

    test.each([
        ["addHostAccessRequest", () => addHostAccessRequest()],
        ["contains", () => containsPermissions(permissions)],
        ["getAll", () => getAllPermissions()],
        ["remove", () => removePermissions(permissions)],
        ["removeHostAccessRequest", () => removeHostAccessRequest()],
        ["request", () => requestPermissions(permissions)],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.permissions[name].failNext(new Error("Permission request failed"));
        await expect(invoke()).rejects.toThrow("Permission request failed");
    });
});
