import {afterEach, expect, jest, test} from "@jest/globals";
import {createBrowserHarness, installBrowserGlobals, installGlobals} from "../../../../src/testing";

const restorers: Array<() => void> = [];

const keep = (restore: () => void): (() => void) => {
    restorers.push(restore);

    return restore;
};

afterEach(() => {
    jest.restoreAllMocks();

    while (restorers.length > 0) restorers.pop()?.();
});

const caught = (action: () => void): AggregateError => {
    try {
        action();
    } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);

        return error as AggregateError;
    }

    throw new Error("Expected restoration to report an AggregateError");
};

test.each(["false", "throw"] as const)("raw restore releases its stack entry when a descriptor returns %s", failure => {
    const baseline = createBrowserHarness();
    keep(installGlobals({chrome: baseline.chrome, browser: baseline.browser}));
    const beforeChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const beforeSafari = Object.getOwnPropertyDescriptor(globalThis, "safari");
    const outer = keep(installGlobals({safari: {outer: true}}));
    const harness = createBrowserHarness();
    const inner = keep(installGlobals({chrome: harness.chrome, browser: harness.browser}));
    const original = Reflect.defineProperty;
    const cause = new Error("Descriptor trap failed");

    const define = jest.spyOn(Reflect, "defineProperty").mockImplementation((target, key, descriptor) => {
        if (target === globalThis && key === "browser") {
            if (failure === "throw") throw cause;

            return false;
        }

        return original(target, key, descriptor);
    });

    const error = caught(inner);
    define.mockRestore();
    expect(error.errors).toHaveLength(1);
    expect(error.errors[0].message).toBe("Unable to restore global browser");

    if (failure === "throw") expect(error.errors[0].cause).toBe(cause);

    expect(Object.getOwnPropertyDescriptor(globalThis, "chrome")).toEqual(beforeChrome);
    expect(() => outer()).not.toThrow();
    expect(Object.getOwnPropertyDescriptor(globalThis, "safari")).toEqual(beforeSafari);

    const successor = keep(installGlobals({browser: createBrowserHarness().browser}));
    const afterSuccessor = Object.getOwnPropertyDescriptor(globalThis, "browser");
    expect(() => inner()).not.toThrow();
    expect(Object.getOwnPropertyDescriptor(globalThis, "browser")).toEqual(afterSuccessor);
    successor();
});

test("console restoration failure does not skip globals or profile cleanup", () => {
    keep(installGlobals({consoleError: console.error}));
    const beforeChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const beforeBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
    const harness = createBrowserHarness();
    const restore = keep(installBrowserGlobals(harness, {profile: "firefox", environment: "preserve", captureListenerErrors: true}));
    const original = Reflect.defineProperty;
    const cause = new Error("Console restore failed");

    const define = jest.spyOn(Reflect, "defineProperty").mockImplementation((target, key, descriptor) => {
        if (target === console && key === "error") throw cause;

        return original(target, key, descriptor);
    });

    const error = caught(restore);
    define.mockRestore();
    expect(error.errors[0]).toMatchObject({message: "Unable to restore global error", cause});
    expect(Object.getOwnPropertyDescriptor(globalThis, "chrome")).toEqual(beforeChrome);
    expect(Object.getOwnPropertyDescriptor(globalThis, "browser")).toEqual(beforeBrowser);
    expect(harness.runtime.getURL.api("")).toMatch(/^chrome-extension:/);
    expect(harness.sidebar.flavor).toBe("sidePanel");
    expect(harness.configurable.active).toBe(harness.configurable.chrome);
});

test("failed nested profile restore restores harness settings and never reapplies them on retry", () => {
    keep(installGlobals({browser: createBrowserHarness().browser}));
    const harness = createBrowserHarness();
    const outer = keep(installBrowserGlobals(harness, {profile: "chrome", environment: "preserve"}));
    const beforeChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const inner = keep(installBrowserGlobals(harness, {profile: "firefox", environment: "preserve"}));
    const original = Reflect.deleteProperty;

    const remove = jest.spyOn(Reflect, "deleteProperty").mockImplementation((target, key) => {
        if (target === globalThis && key === "browser") return false;

        return original(target, key);
    });

    caught(inner);
    remove.mockRestore();
    expect(Object.getOwnPropertyDescriptor(globalThis, "chrome")).toEqual(beforeChrome);
    expect(harness.runtime.getURL.api("")).toMatch(/^chrome-extension:/);
    expect(harness.sidebar.flavor).toBe("sidePanel");
    expect(harness.capabilities.has("runtime.getBrowserInfo")).toBe(false);
    expect(harness.configurable.active).toBe(harness.configurable.chrome);
    expect(() => outer()).not.toThrow();
    keep(installBrowserGlobals(harness, {profile: "opera", environment: "preserve"}));
    expect(() => inner()).not.toThrow();
    expect(harness.sidebar.flavor).toBe("operaSidebarAction");
});

test.each([[false, false], [true, false], [true, true]])("profile failure does not block cleanup (global failure: %s, throw: %s)", (failGlobal, throwProfile) => {
    keep(installGlobals({browser: createBrowserHarness().browser}));
    const outer = keep(installGlobals({safari: {outer: true}}));
    const harness = createBrowserHarness();
    const previous = Object.getOwnPropertyDescriptor(harness.browser.runtime, "getBrowserInfo");
    const restore = keep(installBrowserGlobals(harness, {profile: "firefox", environment: "preserve"}));
    const original = Reflect.deleteProperty;
    const cause = new Error("Profile descriptor trap failed");

    const remove = jest.spyOn(Reflect, "deleteProperty").mockImplementation((target, key) => {
        if (target === harness.chrome.runtime && key === "getBrowserInfo") {
            if (throwProfile) throw cause;

            return false;
        }

        return original(target, key);
    });

    const originalDefine = Reflect.defineProperty;

    const define = jest.spyOn(Reflect, "defineProperty").mockImplementation((target, key, descriptor) => {
        if (failGlobal && target === globalThis && key === "browser") return false;

        return originalDefine(target, key, descriptor);
    });

    const error = caught(restore);
    remove.mockRestore();
    define.mockRestore();
    const messages = (error: Error): string[] => [error.message, ...(error instanceof AggregateError ? error.errors.flatMap(messages) : [])];
    expect(messages(error)).toContain("Unable to restore harness chrome.runtime.getBrowserInfo");

    if (failGlobal) expect(messages(error)).toContain("Unable to restore global browser");

    if (throwProfile) expect(error.errors[1].errors[0].cause).toBe(cause);

    expect(Object.getOwnPropertyDescriptor(harness.browser.runtime, "getBrowserInfo")).toEqual(previous);
    expect(harness.configurable.active).toBe(harness.configurable.chrome);
    expect(() => outer()).not.toThrow();
    expect(() => restore()).not.toThrow();
});

test("installation failure preserves both the original error and a profile rollback error", () => {
    const harness = createBrowserHarness();
    const profileError = new Error("Profile rollback failed");

    jest.spyOn(harness, "captureProfileState").mockReturnValue(() => {
        throw profileError;
    });

    const original = Reflect.defineProperty;

    const define = jest.spyOn(Reflect, "defineProperty").mockImplementation((target, key, descriptor) => {
        if (target === globalThis && key === "safari") return false;

        return original(target, key, descriptor);
    });

    const error = caught(() => installBrowserGlobals(harness, {profile: "safari", environment: "preserve"}));
    define.mockRestore();
    expect(error.errors).toHaveLength(2);
    expect(error.errors[0].message).toBe("Unable to install global safari");
    expect(error.errors[1]).toBe(profileError);
    const restore = keep(installGlobals({safari: {next: true}}));
    expect(() => restore()).not.toThrow();
});

test("out-of-order restore of one harness leaves the active inner profile untouched", () => {
    const harness = createBrowserHarness();
    const outer = keep(installBrowserGlobals(harness, {profile: "chrome", environment: "preserve"}));
    const inner = keep(installBrowserGlobals(harness, {profile: "firefox", environment: "preserve"}));
    expect(() => outer()).toThrow("reverse installation order");
    expect(harness.runtime.getURL.api("")).toMatch(/^moz-extension:/);
    expect(harness.sidebar.flavor).toBe("firefoxSidebarAction");
    expect(harness.configurable.active).toBe(harness.configurable.browser);
    inner();
    expect(() => outer()).not.toThrow();
});
