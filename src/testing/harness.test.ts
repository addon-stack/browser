import {installBrowserGlobals, installGlobals} from "./globals";
import {createBrowserHarness} from "./harness";

describe("browser profiles and globals", () => {
    test("keeps Firefox facades live after installation and restores exact descriptors", () => {
        const browserDescriptor = Object.getOwnPropertyDescriptor(globalThis, "browser");
        const chromeDescriptor = Object.getOwnPropertyDescriptor(globalThis, "chrome");
        const harness = createBrowserHarness({extensionId: "initial-id"});
        const restore = installBrowserGlobals(harness, {context: "serviceWorker", profile: "firefox"});

        expect(globalThis.browser).toBe(harness.browser);
        expect(globalThis.chrome).toBe(harness.chrome);
        expect(globalThis.window).toBeUndefined();
        expect(globalThis.location).toBeUndefined();
        expect(globalThis.browser.sidebarAction).toBeDefined();

        harness.runtime.setExtensionId("changed-id");
        expect(globalThis.browser.runtime.id).toBe("changed-id");

        harness.capabilities.set("runtime.getBrowserInfo", false);
        expect("getBrowserInfo" in globalThis.browser.runtime).toBe(false);
        harness.capabilities.set("runtime.getBrowserInfo", true);
        expect(typeof globalThis.browser.runtime.getBrowserInfo).toBe("function");

        harness.sidebar.flavor = "none";
        expect(globalThis.browser.sidebarAction).toBeUndefined();

        restore();
        restore();
        expect(Object.getOwnPropertyDescriptor(globalThis, "browser")).toEqual(browserDescriptor);
        expect(Object.getOwnPropertyDescriptor(globalThis, "chrome")).toEqual(chromeDescriptor);
    });

    test.each([
        ["chrome", false, false, false],
        ["opera", false, true, false],
        ["safari", true, false, true],
    ] as const)("installs a coherent %s profile", (profile, hasBrowser, hasOpera, hasSafari) => {
        const harness = createBrowserHarness();
        const restore = installBrowserGlobals(harness, {profile});

        expect(typeof globalThis.browser !== "undefined").toBe(hasBrowser);
        expect(typeof globalThis.opr !== "undefined").toBe(hasOpera);
        expect(typeof globalThis.safari !== "undefined").toBe(hasSafari);
        expect(globalThis.window?.location).toBe(globalThis.location);

        restore();
    });

    test("captures only known listener errors and forwards unknown console errors", () => {
        const forwarded: unknown[][] = [];
        const harness = createBrowserHarness();
        const restoreConsole = installGlobals({consoleError: (...args) => forwarded.push(args)});
        const restore = installBrowserGlobals(harness, {captureListenerErrors: true});
        const restoreNested = installBrowserGlobals(harness, {captureListenerErrors: true});
        const syncError = new Error("sync failure");

        console.error("Listener error:", syncError);
        console.error("unrelated", 42);

        expect(harness.listenerErrors.entries).toEqual([{args: [], error: syncError, kind: "sync"}]);
        expect(harness.listenerErrors.raw).toEqual([["unrelated", 42]]);
        expect(forwarded).toEqual([["unrelated", 42]]);

        restoreNested();
        restore();
        restoreConsole();
    });
});
