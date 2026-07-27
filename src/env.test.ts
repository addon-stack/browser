import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {isBackground} from "./env";

describe("isBackground", () => {
    let originalBrowserDescriptor: PropertyDescriptor | undefined;
    let originalChromeDescriptor: PropertyDescriptor | undefined;
    let originalWindowDescriptor: PropertyDescriptor | undefined;
    let originalLocationDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalBrowserDescriptor = Object.getOwnPropertyDescriptor(globalThis, "browser");
        originalChromeDescriptor = Object.getOwnPropertyDescriptor(globalThis, "chrome");
        originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
        originalLocationDescriptor = Object.getOwnPropertyDescriptor(globalThis, "location");

        delete (globalThis as any).browser;
        delete (globalThis as any).chrome;
        delete (globalThis as any).window;
        delete (globalThis as any).location;
    });

    afterEach(() => {
        restoreGlobalProperty("browser", originalBrowserDescriptor);
        restoreGlobalProperty("chrome", originalChromeDescriptor);
        restoreGlobalProperty("window", originalWindowDescriptor);
        restoreGlobalProperty("location", originalLocationDescriptor);
        jest.resetAllMocks();
    });

    const setGlobalProperty = (name: string, value: unknown): void => {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            value,
            writable: true,
        });
    };

    const restoreGlobalProperty = (name: string, descriptor: PropertyDescriptor | undefined): void => {
        if (descriptor) {
            Object.defineProperty(globalThis, name, descriptor);

            return;
        }

        delete (globalThis as any)[name];
    };

    const setRuntime = (runtime: object | undefined): void => {
        setGlobalProperty("chrome", runtime ? {runtime} : {});
    };

    const setWindow = (pathname: string): void => {
        setGlobalProperty("window", {});
        setGlobalProperty("location", {pathname});
    };

    test("returns false when the browser API is unavailable", () => {
        expect(isBackground()).toBe(false);
    });

    test("returns false when runtime is unavailable", () => {
        setRuntime(undefined);

        expect(isBackground()).toBe(false);
    });

    test("returns false when runtime.id is unavailable", () => {
        setRuntime({getManifest: jest.fn()});

        expect(isBackground()).toBe(false);
    });

    test("returns false without throwing when runtime.getManifest is unavailable", () => {
        setRuntime({id: "extension-id", getManifest: undefined});

        expect(() => isBackground()).not.toThrow();
        expect(isBackground()).toBe(false);
    });

    test("returns false when runtime.getManifest is not a function", () => {
        setRuntime({id: "extension-id", getManifest: "manifest"});

        expect(isBackground()).toBe(false);
    });

    test("identifies an MV3 service worker as background", () => {
        setRuntime({
            getManifest: jest.fn(() => ({
                background: {service_worker: "service-worker.js"},
                manifest_version: 3,
            })),
            id: "extension-id",
        });

        expect(isBackground()).toBe(true);
    });

    test("does not identify an MV3 extension document as background", () => {
        setRuntime({
            getManifest: jest.fn(() => ({
                background: {service_worker: "service-worker.js"},
                manifest_version: 3,
            })),
            id: "extension-id",
        });
        setWindow("/popup.html");

        expect(isBackground()).toBe(false);
    });

    test("identifies an MV2 generated background page as background", () => {
        setRuntime({
            getManifest: jest.fn(() => ({
                background: {scripts: ["background.js"]},
                manifest_version: 2,
            })),
            id: "extension-id",
        });
        setWindow("/_generated_background_page.html");

        expect(isBackground()).toBe(true);
    });

    test("does not identify a regular extension page as background", () => {
        setRuntime({
            getManifest: jest.fn(() => ({
                background: {scripts: ["background.js"]},
                manifest_version: 2,
            })),
            id: "extension-id",
        });
        setWindow("/popup.html");

        expect(isBackground()).toBe(false);
    });
});
