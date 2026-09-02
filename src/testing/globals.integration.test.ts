import {BrowserGuessSource, BrowserName, guessBrowser} from "../browserDetection";
import {getI18nUILanguage} from "../i18n";
import {getId} from "../runtime";
import {canOpenSidebar, getSidebarTitle, openSidebar, SidebarError, setSidebarTitle} from "../sidebar";
import {onTabCreated} from "../tabs";
import {createBrowserHarness, createTabFixture, installBrowserGlobals, installGlobals} from "./index";

const restorers: Array<() => void> = [];

afterEach(() => {
    while (restorers.length > 0) restorers.pop()?.();
});

describe("transactional browser globals", () => {
    test("leaves omitted globals untouched while explicit undefined removes one temporarily", () => {
        const harness = createBrowserHarness();
        const restoreOuter = installGlobals({browser: harness.browser, chrome: harness.chrome});
        restorers.push(restoreOuter);
        const chromeDescriptor = Reflect.getOwnPropertyDescriptor(globalThis, "chrome");
        const browserDescriptor = Reflect.getOwnPropertyDescriptor(globalThis, "browser");
        const restoreInner = installGlobals({browser: undefined});
        restorers.push(restoreInner);

        expect("browser" in globalThis).toBe(false);
        expect(Reflect.getOwnPropertyDescriptor(globalThis, "chrome")).toEqual(chromeDescriptor);

        restoreInner();
        expect(Reflect.getOwnPropertyDescriptor(globalThis, "browser")).toEqual(browserDescriptor);
        expect(Reflect.getOwnPropertyDescriptor(globalThis, "chrome")).toEqual(chromeDescriptor);
    });

    test("restores exact descriptors, absent globals, and tolerates repeated restore", () => {
        const keys = ["chrome", "browser", "opr", "safari", "navigator", "window", "location"] as const;
        const before = Object.fromEntries(keys.map(key => [key, Reflect.getOwnPropertyDescriptor(globalThis, key)]));
        const harness = createBrowserHarness();
        const restore = installBrowserGlobals(harness, {context: "serviceWorker", profile: "firefox"});
        restorers.push(restore);

        expect(globalThis.browser).toBe(harness.browser);
        expect(globalThis.chrome).toBe(harness.chrome);
        expect("window" in globalThis).toBe(false);
        expect("location" in globalThis).toBe(false);

        restore();
        restore();

        for (const key of keys) {
            expect(Reflect.getOwnPropertyDescriptor(globalThis, key)).toEqual(before[key]);
        }
    });

    test("distinguishes omitted globals from explicit undefined and restores profile markers", () => {
        const outerHarness = createBrowserHarness();
        const outerRestore = installGlobals({
            browser: outerHarness.browser,
            chrome: outerHarness.chrome,
            opr: {},
            safari: {marker: "original"},
        });
        restorers.push(outerRestore);
        const outerDescriptors = {
            browser: Reflect.getOwnPropertyDescriptor(globalThis, "browser"),
            chrome: Reflect.getOwnPropertyDescriptor(globalThis, "chrome"),
            opr: Reflect.getOwnPropertyDescriptor(globalThis, "opr"),
            safari: Reflect.getOwnPropertyDescriptor(globalThis, "safari"),
        };
        const profileHarness = createBrowserHarness();
        const restoreProfile = installBrowserGlobals(profileHarness, {profile: "chrome"});
        restorers.push(restoreProfile);

        expect(globalThis.chrome).toBe(profileHarness.chrome);
        expect("browser" in globalThis).toBe(false);
        expect("opr" in globalThis).toBe(false);
        expect("safari" in globalThis).toBe(false);

        restoreProfile();
        expect(Reflect.getOwnPropertyDescriptor(globalThis, "browser")).toEqual(outerDescriptors.browser);
        expect(Reflect.getOwnPropertyDescriptor(globalThis, "chrome")).toEqual(outerDescriptors.chrome);
        expect(Reflect.getOwnPropertyDescriptor(globalThis, "opr")).toEqual(outerDescriptors.opr);
        expect(Reflect.getOwnPropertyDescriptor(globalThis, "safari")).toEqual(outerDescriptors.safari);
    });
});

describe("browser profiles and routing", () => {
    test("models a content script as a deterministic host page instead of an extension page", () => {
        const harness = createBrowserHarness();
        const restoreExtensionPage = installBrowserGlobals(harness, {context: "extensionPage", profile: "chrome"});
        restorers.push(restoreExtensionPage);

        expect(globalThis.location.pathname).toBe("/index.html");
        expect(globalThis.location.href).toBeUndefined();

        restoreExtensionPage();
        const restoreContentScript = installBrowserGlobals(harness, {context: "contentScript", profile: "chrome"});
        restorers.push(restoreContentScript);

        expect(globalThis.location).toMatchObject({
            href: "https://example.test/content/page.html",
            origin: "https://example.test",
            pathname: "/content/page.html",
            protocol: "https:",
        });
        expect(globalThis.window.location).toBe(globalThis.location);
    });

    test("routes to browser when runtime.id exists and falls back to chrome when it does not", () => {
        const harness = createBrowserHarness();
        harness.configurable.chrome.i18n.getUILanguage.setResult("chrome-language");
        harness.configurable.browser.i18n.getUILanguage.setResult("browser-language");
        const restoreFirefox = installBrowserGlobals(harness, {profile: "firefox"});
        restorers.push(restoreFirefox);

        expect(getI18nUILanguage()).toBe("browser-language");

        restoreFirefox();
        const browserWithoutRuntimeId = harness.createProfileFacade("browser", true);
        Reflect.deleteProperty(browserWithoutRuntimeId.runtime, "id");
        const restoreFallback = installBrowserGlobals(harness, {
            globals: {browser: browserWithoutRuntimeId, chrome: harness.chrome},
            profile: "custom",
        });
        restorers.push(restoreFallback);

        expect(getI18nUILanguage()).toBe("chrome-language");
    });

    test("throws a clear production error when neither namespace is available", () => {
        const harness = createBrowserHarness();
        restorers.push(
            installBrowserGlobals(harness, {
                globals: {browser: undefined, chrome: undefined},
                profile: "custom",
            })
        );

        expect(() => getId()).toThrow("WebExtension API not available in this context");
    });

    test("removes a disabled method from the already-installed facade and changes detection fallback", async () => {
        const harness = createBrowserHarness();
        restorers.push(installBrowserGlobals(harness, {profile: "firefox"}));

        expect(typeof globalThis.browser?.runtime.getBrowserInfo).toBe("function");
        harness.capabilities.set("runtime.getBrowserInfo", false);
        expect("getBrowserInfo" in (globalThis.browser?.runtime ?? {})).toBe(false);

        await expect(guessBrowser()).resolves.toMatchObject({
            name: BrowserName.Firefox,
            source: BrowserGuessSource.UserAgent,
        });

        harness.reset();
        expect(typeof globalThis.browser?.runtime.getBrowserInfo).toBe("function");
    });

    test.each([
        ["chrome", true, false, false],
        ["firefox", false, true, false],
        ["opera", false, false, true],
        ["safari", false, false, false],
    ] as const)("%s installs only its coherent sidebar flavor", (profile, hasSidePanel, hasFirefoxSidebar, hasOperaSidebar) => {
        const harness = createBrowserHarness();
        const restore = installBrowserGlobals(harness, {profile});

        try {
            expect(Boolean(globalThis.chrome?.sidePanel)).toBe(hasSidePanel);
            expect(Boolean(globalThis.browser?.sidebarAction)).toBe(hasFirefoxSidebar);
            expect(Boolean(globalThis.opr?.sidebarAction)).toBe(hasOperaSidebar);
            expect(canOpenSidebar()).toBe(hasSidePanel || hasFirefoxSidebar);
        } finally {
            restore();
        }
    });

    test("executes Chrome, Firefox, and Opera sidebar methods with their real invocation styles", async () => {
        const chromeHarness = createBrowserHarness();
        chromeHarness.sidebar.sidePanel.open.setResult(undefined);
        const restoreChrome = installBrowserGlobals(chromeHarness, {profile: "chrome"});
        restorers.push(restoreChrome);
        await expect(openSidebar({windowId: 1})).resolves.toBeUndefined();
        expect(chromeHarness.sidebar.sidePanel.open.calls[0]).toMatchObject({invocation: "callback"});
        restoreChrome();

        const firefoxHarness = createBrowserHarness();
        firefoxHarness.sidebar.firefox.open.setResult(undefined);
        const restoreFirefox = installBrowserGlobals(firefoxHarness, {profile: "firefox"});
        restorers.push(restoreFirefox);
        await expect(openSidebar({windowId: 1})).resolves.toBeUndefined();
        expect(firefoxHarness.sidebar.firefox.open.calls[0]).toMatchObject({invocation: "promise"});
        restoreFirefox();

        const operaHarness = createBrowserHarness();
        operaHarness.sidebar.opera.setTitle.setResult(undefined);
        operaHarness.sidebar.opera.getTitle.setResult("Opera title");
        restorers.push(installBrowserGlobals(operaHarness, {profile: "opera"}));

        await expect(setSidebarTitle("Configured title", 4)).resolves.toBeUndefined();
        await expect(getSidebarTitle(4)).resolves.toBe("Opera title");
        expect(operaHarness.sidebar.opera.setTitle.calls[0]).toMatchObject({
            args: [{tabId: 4, title: "Configured title"}],
            callback: undefined,
            invocation: "sync",
        });
        expect(operaHarness.sidebar.opera.getTitle.calls[0]).toMatchObject({invocation: "callback"});
    });

    test("none flavor exposes the real SidebarError path", async () => {
        const harness = createBrowserHarness();
        harness.sidebar.flavor = "none";
        restorers.push(
            installBrowserGlobals(harness, {
                globals: {browser: undefined, chrome: harness.chrome, opr: undefined, safari: undefined},
                profile: "custom",
            })
        );

        await expect(openSidebar({windowId: 1})).rejects.toBeInstanceOf(SidebarError);
        await expect(openSidebar({windowId: 1})).rejects.toThrow(
            "The sidebarAction.open API is not supported in this browser"
        );
    });
});

describe("raw events and production listener error handling", () => {
    test("keeps raw errors observable while capturing safeListener behavior", async () => {
        const forwarded: unknown[][] = [];
        const restoreConsole = installGlobals({consoleError: (...args) => forwarded.push(args)});
        restorers.push(restoreConsole);
        const harness = createBrowserHarness();
        restorers.push(installBrowserGlobals(harness, {captureListenerErrors: true, profile: "chrome"}));
        const tab = createTabFixture();

        const rawFailure = new Error("raw listener failed");
        harness.tabs.events.onCreated.api.addListener(() => {
            throw rawFailure;
        });
        await expect(harness.tabs.events.onCreated.emit(tab)).rejects.toBe(rawFailure);

        harness.tabs.events.onCreated.reset();
        const syncFailure = new Error("sync listener failed");
        const unsubscribeSync = onTabCreated(() => {
            throw syncFailure;
        });
        await expect(harness.tabs.events.onCreated.emit(tab)).resolves.toBeUndefined();
        unsubscribeSync();
        expect(harness.listenerErrors.entries).toEqual([{args: [], error: syncFailure, kind: "sync"}]);

        harness.tabs.events.onCreated.reset();
        harness.listenerErrors.reset();
        const promiseFailure = new Error("promise listener failed");
        const unsubscribePromise = onTabCreated(async () => {
            throw promiseFailure;
        });
        await expect(harness.tabs.events.onCreated.emit(tab)).rejects.toBe(promiseFailure);
        unsubscribePromise();
        expect(harness.listenerErrors.entries).toEqual([{args: [], error: promiseFailure, kind: "promise"}]);

        harness.tabs.events.onCreated.reset();
        harness.listenerErrors.reset();
        const thenableFailure = new Error("custom thenable failed");
        const thenable = {
            // biome-ignore lint/suspicious/noThenProperty: This intentionally models a non-Promise thenable.
            then(_resolve: (value: never) => void, reject: (reason: unknown) => void): void {
                reject(thenableFailure);
            },
        };
        const unsubscribeThenable = onTabCreated((() => thenable) as unknown as Parameters<typeof onTabCreated>[0]);
        await expect(harness.tabs.events.onCreated.emit(tab)).rejects.toBe(thenableFailure);
        unsubscribeThenable();
        expect(harness.listenerErrors.entries).toEqual([]);

        console.error("unrecognized listener output", 7);
        expect(harness.listenerErrors.raw).toEqual([["unrecognized listener output", 7]]);
        expect(forwarded).toEqual([["unrecognized listener output", 7]]);
    });
});
