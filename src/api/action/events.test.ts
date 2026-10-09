import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserTestApi, createBrowserEvent, createTabFixture, installGlobals} from "../../testing";
import {onActionClicked, onActionUserSettingsChanged} from "./events";

describe.each(["chrome", "browser"] as const)("action events with the %s global", globalName => {
    let version: number;
    let restoreGlobals: () => void;
    let modernClicked: ReturnType<typeof createBrowserEvent<[chrome.tabs.Tab]>>;
    let legacyClicked: ReturnType<typeof createBrowserEvent<[chrome.tabs.Tab]>>;
    let settings: ReturnType<typeof createBrowserEvent<Parameters<Parameters<typeof chrome.action.onUserSettingsChanged.addListener>[0]>>>;

    beforeEach(() => {
        version = 3;
        modernClicked = createBrowserEvent();
        legacyClicked = createBrowserEvent();
        settings = createBrowserEvent();

        // Distinct namespaces detect routing errors that a shared action/browserAction alias would hide.
        const native = {
            runtime: {id: "action-test", getManifest: () => ({manifest_version: version})},
            action: {onClicked: modernClicked.api, onUserSettingsChanged: settings.api},
            browserAction: {onClicked: legacyClicked.api},
        } as unknown as BrowserTestApi;

        restoreGlobals = installGlobals({chrome: undefined, browser: undefined, [globalName]: native});
    });

    afterEach(() => {
        restoreGlobals();
        jest.restoreAllMocks();
    });

    test.each([2, 3])("onActionClicked uses the MV%s namespace and unsubscribes independently", async manifestVersion => {
        version = manifestVersion;
        const selected = version === 3 ? modernClicked : legacyClicked;
        const other = version === 3 ? legacyClicked : modernClicked;
        const callback = jest.fn<Parameters<typeof onActionClicked>[0]>();
        const otherCallback = jest.fn<Parameters<typeof onActionClicked>[0]>();
        const unsubscribe = onActionClicked(callback);
        const unsubscribeOther = onActionClicked(otherCallback);
        const tab = createTabFixture({id: 7});
        expect(other.listenerCount()).toBe(0);
        expect(selected.registrations()[0].args).toEqual([]);
        await selected.emit(tab);
        expect(callback).toHaveBeenCalledWith(tab);
        unsubscribe();
        unsubscribe();
        await selected.emit(tab);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(otherCallback).toHaveBeenCalledTimes(2);
        unsubscribeOther();
        expect(selected.listenerCount()).toBe(0);
    });

    test("onActionUserSettingsChanged forwards MV3 settings and returns an unsubscribe function", async () => {
        const callback = jest.fn<Parameters<typeof onActionUserSettingsChanged>[0]>();
        const unsubscribe = onActionUserSettingsChanged(callback);
        const changes = {isOnToolbar: true};
        expect(settings.registrations()[0].args).toEqual([]);
        await settings.emit(changes);
        expect(callback).toHaveBeenCalledWith(changes);
        unsubscribe();
        await settings.emit(changes);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(settings.listenerCount()).toBe(0);
    });

    test("an unavailable MV2 settings event still throws without falling back to action", () => {
        version = 2;
        expect(() => onActionUserSettingsChanged(() => undefined)).toThrow(TypeError);
        expect(settings.listenerCount()).toBe(0);
    });

    test("selects the manifest version for each subscription and retains the original event for cleanup", () => {
        version = 2;
        const unsubscribeLegacy = onActionClicked(() => undefined);
        version = 3;
        const unsubscribeModern = onActionClicked(() => undefined);
        expect(legacyClicked.listenerCount()).toBe(1);
        expect(modernClicked.listenerCount()).toBe(1);
        unsubscribeLegacy();
        expect(legacyClicked.listenerCount()).toBe(0);
        expect(modernClicked.listenerCount()).toBe(1);
        unsubscribeModern();
        expect(modernClicked.listenerCount()).toBe(0);
    });

    test.each([2, 3])("contains synchronous and asynchronous callback errors in MV%s", async manifestVersion => {
        version = manifestVersion;
        const selected = version === 3 ? modernClicked : legacyClicked;
        const error = new Error("Action listener failed");
        const log = jest.spyOn(console, "error").mockImplementation(() => undefined);

        const unsubscribe = onActionClicked(() => {
            throw error;
        });

        const tab = createTabFixture();
        await selected.emit(tab);
        expect(log).toHaveBeenCalledWith("Listener error:", error);
        unsubscribe();

        const unsubscribeAsync = onActionClicked(async () => {
            throw error;
        });

        await expect(selected.emit(tab)).rejects.toBe(error);
        expect(log).toHaveBeenCalledWith("Listener in promise error:", error);
        unsubscribeAsync();
    });
});
