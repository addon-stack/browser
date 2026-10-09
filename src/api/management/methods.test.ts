import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const extension: chrome.management.ExtensionInfo = {
    id: "extension-1", name: "Example", shortName: "Example", description: "Example extension", version: "1.0",
    enabled: true, mayDisable: true, isApp: false, offlineEnabled: false, optionsUrl: "",
    permissions: [], hostPermissions: [], type: "extension", installType: "normal",
};

describe.each(["chrome", "firefox"] as const)("management methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const native = harness.configurable.active.management;
        native.createAppShortcut.setResult(undefined);
        native.launchApp.setResult(undefined);
        native.setEnabled.setResult(undefined);
        native.setLaunchType.setResult(undefined);
        native.uninstall.setResult(undefined);
        native.uninstallSelf.setResult(undefined);

        native.generateAppForLink.setImplementation(async (_url: string, _title: string, callback?: (result: chrome.management.ExtensionInfo) => void) => {
            callback?.(extension);

            return extension;
        });
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each([
        ["get", () => api.getExtensionInfo("extension-1"), ["extension-1"]],
        ["getSelf", () => api.getCurrentExtension(), []],
    ] as const)("%s returns extension info and forwards arguments", async (name, invoke, args) => {
        const method = harness.configurable.active.management[name];
        method.setResult(extension);
        await expect(invoke()).resolves.toBe(extension);
        expect(method.calls[0].args).toEqual(args);
    });

    test("generateAppForLink preserves callback results and forwards the URL and title", async () => {
        await expect(api.generateAppForLink("https://example.test/", "Example")).resolves.toBe(extension);
        expect(harness.configurable.active.management.generateAppForLink.calls[0].args).toEqual(["https://example.test/", "Example"]);
    });

    test("getAllExtensionInfo returns all native entries", async () => {
        const method = harness.configurable.active.management.getAll;
        const extensions = [extension];
        method.setResult(extensions);
        await expect(api.getAllExtensionInfo()).resolves.toBe(extensions);
        expect(method.calls[0].args).toEqual([]);
    });

    test.each([
        ["getPermissionWarningsById", () => api.getPermissionWarningsById("extension-1"), "extension-1"],
        ["getPermissionWarningsByManifest", () => api.getPermissionWarningsByManifest('{"permissions":["tabs"]}'), '{"permissions":["tabs"]}'],
    ] as const)("%s returns warnings for the specified input", async (name, invoke, input) => {
        const method = harness.configurable.active.management[name];
        const warnings = ["Read browsing history"];
        method.setResult(warnings);
        await expect(invoke()).resolves.toBe(warnings);
        expect(method.calls[0].args).toEqual([input]);
    });

    test.each([
        ["createAppShortcut", () => api.createAppShortcut("extension-1"), ["extension-1"]],
        ["launchApp", () => api.launchExtensionApp("extension-1"), ["extension-1"]],
        ["setEnabled", () => api.setExtensionEnabled("extension-1", false), ["extension-1", false]],
        ["setLaunchType", () => api.setExtensionLaunchType("extension-1", "OPEN_AS_WINDOW"), ["extension-1", "OPEN_AS_WINDOW"]],
    ] as const)("%s forwards control arguments", async (name, invoke, args) => {
        await expect(invoke()).resolves.toBeUndefined();
        expect(harness.configurable.active.management[name].calls[0].args).toEqual(args);
    });

    test.each([undefined, false, true])("uninstall wrappers pass showConfirmDialog=%s in an options object", async showConfirmDialog => {
        const native = harness.configurable.active.management;
        await expect(api.uninstallExtension("extension-1", showConfirmDialog)).resolves.toBeUndefined();
        await expect(api.uninstallCurrentExtension(showConfirmDialog)).resolves.toBeUndefined();
        expect(native.uninstall.calls[0].args).toEqual(["extension-1", {showConfirmDialog}]);
        expect(native.uninstallSelf.calls[0].args).toEqual([{showConfirmDialog}]);
    });

    test.each([
        ["createAppShortcut", () => api.createAppShortcut("extension-1")],
        ["generateAppForLink", () => api.generateAppForLink("https://example.test/", "Example")],
        ["get", () => api.getExtensionInfo("extension-1")],
        ["getAll", () => api.getAllExtensionInfo()],
        ["getPermissionWarningsById", () => api.getPermissionWarningsById("extension-1")],
        ["getPermissionWarningsByManifest", () => api.getPermissionWarningsByManifest("{}")],
        ["getSelf", () => api.getCurrentExtension()],
        ["launchApp", () => api.launchExtensionApp("extension-1")],
        ["setEnabled", () => api.setExtensionEnabled("extension-1", false)],
        ["setLaunchType", () => api.setExtensionLaunchType("extension-1", "OPEN_AS_WINDOW")],
        ["uninstall", () => api.uninstallExtension("extension-1")],
        ["uninstallSelf", () => api.uninstallCurrentExtension()],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.configurable.active.management[name].failNext(new Error("Management access denied"));
        await expect(invoke()).rejects.toThrow("Management access denied");
    });
});
