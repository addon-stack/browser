import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "../../../tests/api/availability";
import {createBrowserHarness, createManifestFixture, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

describe("sidebar icon support", () => {
    let restore: () => void = () => undefined;

    beforeEach(() => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        jest.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        restore();
        expect(console.error).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
        jest.restoreAllMocks();
    });

    test.each([
        ["firefox", 2, true], ["firefox", 3, true],
        ["opera", 2, false], ["opera", 3, false],
        ["chrome", 3, false],
    ] as const)("%s MV%s: capability and operation agree", async (profile, version, supported) => {
        const harness = createBrowserHarness();
        harness.runtime.setManifest(createManifestFixture({manifest_version: version}));
        restore = installBrowserGlobals(harness, {profile});
        const native = profile === "opera" ? harness.sidebar.opera.setIcon : harness.sidebar.firefox.setIcon;

        native.setResult(undefined);
        expect(api.canSetSidebarIcon()).toBe(supported);
        expect(native.calls).toHaveLength(0);

        const imageData = {width: 19, height: 19, data: new Uint8ClampedArray(19 * 19 * 4)} as ImageData;

        for (const details of [{path: "icon.png"}, {path: {24: "small.png", 40: "large.png"}, tabId: 0}, {imageData, tabId: 0}]) {
            if (supported) {
                await expect(api.setSidebarIcon(details)).resolves.toBeUndefined();
                expect(native.calls.at(-1)?.args[0]).toBe(details);
                expect(native.calls.at(-1)?.invocation).toBe("promise");
            } else {
                await expect(api.setSidebarIcon(details)).rejects.toBeInstanceOf(api.SidebarError);
                expect(native.calls).toHaveLength(0);
            }
        }

        if (profile === "opera") {
            await expect(api.setSidebarIcon({path: "icon.png"})).rejects.toThrow("temporarily unsupported in Opera due to a native browser bug");
        }

        expect(harness.runtime.getManifest.calls).toHaveLength(0);
    });

    test.each([
        {}, {chrome: {sidePanel: {}}}, {browser: {sidebarAction: {}}}, {opr: {sidebarAction: {}}},
    ])("missing methods reject without requiring a manifest: %j", async globals => {
        restore = installAvailabilityGlobals(globals);
        expect(api.canSetSidebarIcon()).toBe(false);
        await expect(api.setSidebarIcon({path: "icon.png"})).rejects.toBeInstanceOf(api.SidebarError);
    });

    test.each(["firefox", "opera"] as const)("%s observes method changes without native calls or caching", profile => {
        const harness = createBrowserHarness();
        harness.runtime.setManifest(createManifestFixture({manifest_version: 2}));
        restore = installBrowserGlobals(harness, {profile});
        const namespace = profile === "opera" ? "opr" : "browser";
        expect(api.canSetSidebarIcon()).toBe(profile === "firefox");
        harness.capabilities.set(`${namespace}.sidebarAction.setIcon`, false);
        expect(api.canSetSidebarIcon()).toBe(false);
        harness.capabilities.set(`${namespace}.sidebarAction.setIcon`, true);
        expect(api.canSetSidebarIcon()).toBe(profile === "firefox");
        expect(harness.sidebar[profile].setIcon.calls).toHaveLength(0);
    });

    test("keeps Opera icons blocked and title/path operations available across manifest changes", async () => {
        const harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "opera"});

        harness.sidebar.opera.setTitle.setResult(undefined);
        harness.sidebar.opera.getTitle.setResult("Panel");
        harness.sidebar.opera.setPanel.setResult(undefined);

        for (const version of [2, 3, 2] as const) {
            harness.runtime.setManifest(createManifestFixture({manifest_version: version}));
            expect(api.canSetSidebarIcon()).toBe(false);
            expect(api.canSetSidebarTitle()).toBe(true);
            expect(api.canGetSidebarTitle()).toBe(true);
            await api.setSidebarTitle("Panel");
            expect(await api.getSidebarTitle()).toBe("Panel");
            await api.setSidebarPath("panel.html");
        }

        expect(harness.sidebar.opera.setIcon.calls).toHaveLength(0);
        expect(harness.sidebar.opera.setPanel.calls).toHaveLength(3);
        expect(harness.runtime.getManifest.calls).toHaveLength(0);
    });

    test("Firefox does not need access to the manifest", async () => {
        const harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "firefox"});
        harness.sidebar.firefox.setIcon.setResult(undefined);

        harness.runtime.getManifest.setImplementation(() => {
            throw new Error("Manifest unavailable");
        });

        expect(api.canSetSidebarIcon()).toBe(true);
        await api.setSidebarIcon({path: "icon.png"});
        expect(harness.runtime.getManifest.calls).toHaveLength(0);
    });

    test.each(["access", "call", "version"])("Opera is blocked without reading the manifest: %s", async level => {
        const error = new Error("Manifest unavailable");

        const fail = jest.fn(() => {
            throw error;
        });

        const runtime = level === "access"
            ? Object.defineProperty({}, "getManifest", {get: fail})
            : {getManifest: level === "call" ? fail : () => Object.defineProperty({}, "manifest_version", {get: fail})};

        const setIcon = jest.fn();
        restore = installAvailabilityGlobals({chrome: {runtime}, opr: {sidebarAction: {setIcon}}});

        expect(api.canSetSidebarIcon()).toBe(false);
        await expect(api.setSidebarIcon({path: "icon.png"})).rejects.toBeInstanceOf(api.SidebarError);
        expect(setIcon).not.toHaveBeenCalled();
        expect(fail).not.toHaveBeenCalled();
    });

    describe.each(["browser", "opr"] as const)("%s.sidebarAction", globalName => {
        test("non-callable setIcon is unsupported", async () => {
            restore = installAvailabilityGlobals({[globalName]: {sidebarAction: {setIcon: true}}});
            expect(api.canSetSidebarIcon()).toBe(false);
            await expect(api.setSidebarIcon({path: "icon.png"})).rejects.toBeInstanceOf(api.SidebarError);
        });

        test.each(["global", "namespace", "method"])("%s access errors are safe for probes and preserved by setters", async level => {
            const error = new Error("Sidebar access denied");

            const fail = () => {
                throw error;
            };

            const native = Object.defineProperty({}, level === "method" ? "setIcon" : "sidebarAction", {get: fail});
            restore = installAvailabilityGlobals({[globalName]: level === "method" ? {sidebarAction: native} : native});

            if (level === "global") {
                Object.defineProperty(globalThis, globalName, {configurable: true, get: fail});
            }

            expect(api.canSetSidebarIcon()).toBe(false);
            await expect(api.setSidebarIcon({path: "icon.png"})).rejects.toBe(error);
        });
    });

    test.each([2, 3] as const)("Opera MV%s takes precedence over Firefox and sidePanel", async version => {
        const opera = jest.fn((_details: unknown, callback: () => void) => callback());
        const firefox = jest.fn();
        const native: Record<string, unknown> = {};

        restore = installAvailabilityGlobals({
            chrome: {runtime: {getManifest: () => ({manifest_version: version})}, sidePanel: {}},
            browser: {sidebarAction: {setIcon: firefox}},
            opr: {sidebarAction: native},
        });

        expect(api.canSetSidebarIcon()).toBe(false);
        await expect(api.setSidebarIcon({path: "icon.png"})).rejects.toBeInstanceOf(api.SidebarError);
        native.setIcon = opera;
        expect(api.canSetSidebarIcon()).toBe(false);
        await expect(api.setSidebarIcon({path: "icon.png"})).rejects.toBeInstanceOf(api.SidebarError);
        expect(opera).not.toHaveBeenCalled();
        expect(firefox).not.toHaveBeenCalled();
    });

    test("preserves synchronous Firefox argument errors without converting the map", async () => {
        const harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "firefox"});
        const error = new TypeError("Invalid tab ID");

        harness.sidebar.firefox.setIcon.setImplementation(() => {
            throw error;
        });

        const details = {path: {16: "icon.png"}};
        expect(api.canSetSidebarIcon()).toBe(true);
        await expect(api.setSidebarIcon(details)).rejects.toBe(error);
        expect(harness.sidebar.firefox.setIcon.calls[0].args[0]).toBe(details);
    });

    test.each([2, 3] as const)("Opera MV%s rejects before inspecting icon arguments", async version => {
        const harness = createBrowserHarness();
        harness.runtime.setManifest(createManifestFixture({manifest_version: version}));
        restore = installBrowserGlobals(harness, {profile: "opera"});

        const readPath = jest.fn(() => {
            throw new Error("Icon arguments must not be accessed");
        });

        const details = Object.defineProperty({tabId: 0}, "path", {get: readPath});
        await expect(api.setSidebarIcon(details)).rejects.toBeInstanceOf(api.SidebarError);
        expect(readPath).not.toHaveBeenCalled();
        expect(harness.sidebar.opera.setIcon.calls).toHaveLength(0);
    });
});
