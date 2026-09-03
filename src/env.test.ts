import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {isBackground} from "./env";
import {
    type BrowserHarness,
    type BrowserTestApi,
    createBrowserHarness,
    createManifestFixture,
    installBrowserGlobals,
    installGlobals,
} from "./testing";

describe("isBackground", () => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void = () => undefined;

    beforeEach(() => {
        harness = createBrowserHarness();
    });

    afterEach(() => {
        restoreGlobals();
        restoreGlobals = () => undefined;
    });

    const installProfile = (context: "backgroundPage" | "extensionPage" | "none" | "serviceWorker"): void => {
        restoreGlobals = installBrowserGlobals(harness, {context, profile: "chrome"});
    };

    test("returns false when the browser API is unavailable", () => {
        restoreGlobals = installBrowserGlobals(harness, {
            context: "none",
            globals: {browser: undefined, chrome: undefined},
            profile: "custom",
        });

        expect(isBackground()).toBe(false);
    });

    test("returns false when runtime is unavailable", () => {
        restoreGlobals = installGlobals({
            browser: undefined,
            chrome: {} as BrowserTestApi,
            location: undefined,
            window: undefined,
        });

        expect(isBackground()).toBe(false);
    });

    test("returns false when runtime.id is unavailable", () => {
        restoreGlobals = installGlobals({
            browser: undefined,
            chrome: {runtime: {getManifest: harness.runtime.getManifest.api}} as unknown as BrowserTestApi,
            location: undefined,
            window: undefined,
        });

        expect(isBackground()).toBe(false);
    });

    test("returns false when runtime.getManifest capability is unavailable", () => {
        harness.capabilities.set("runtime.getManifest", false);
        installProfile("none");

        expect(() => isBackground()).not.toThrow();
        expect(isBackground()).toBe(false);
    });

    test("returns false when runtime.getManifest is malformed", () => {
        const chromeApi = {
            ...harness.chrome,
            runtime: {...harness.chrome.runtime, getManifest: "manifest"},
        } as unknown as BrowserTestApi;

        restoreGlobals = installGlobals({
            browser: undefined,
            chrome: chromeApi,
            location: undefined,
            window: undefined,
        });

        expect(isBackground()).toBe(false);
    });

    test("identifies an MV3 service worker as background", () => {
        harness.runtime.setManifest(
            createManifestFixture({background: {service_worker: "service-worker.js"}, manifest_version: 3})
        );

        installProfile("serviceWorker");

        expect(isBackground()).toBe(true);
    });

    test("does not identify an MV3 extension document as background", () => {
        harness.runtime.setManifest(
            createManifestFixture({background: {service_worker: "service-worker.js"}, manifest_version: 3})
        );

        installProfile("extensionPage");

        expect(isBackground()).toBe(false);
    });

    test("identifies an MV2 generated background page as background", () => {
        harness.runtime.setManifest(
            createManifestFixture({background: {scripts: ["background.js"]}, manifest_version: 2})
        );

        installProfile("backgroundPage");

        expect(isBackground()).toBe(true);
    });

    test("does not identify a regular MV2 extension page as background", () => {
        harness.runtime.setManifest(
            createManifestFixture({background: {scripts: ["background.js"]}, manifest_version: 2})
        );

        installProfile("extensionPage");

        expect(isBackground()).toBe(false);
    });

    test("treats a malformed location value as a non-background extension page", () => {
        harness.runtime.setManifest(
            createManifestFixture({background: {scripts: ["background.js"]}, manifest_version: 2})
        );

        restoreGlobals = installBrowserGlobals(harness, {
            context: "extensionPage",
            globals: {location: {}},
            profile: "chrome",
        });

        expect(isBackground()).toBe(false);
    });
});
