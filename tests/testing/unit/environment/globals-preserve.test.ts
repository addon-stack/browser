import {getUrl} from "../../../../src/runtime";
import {createBrowserHarness, installBrowserGlobals, installGlobals} from "../../../../src/testing/index";

const restorers: Array<() => void> = [];

afterEach(() => {
    jest.restoreAllMocks();

    while (restorers.length > 0) restorers.pop()?.();
});

const descriptors = () => Object.fromEntries(
    ["chrome", "browser", "opr", "safari", "navigator", "window", "document", "location"].map(key =>
        [key, Object.getOwnPropertyDescriptor(globalThis, key)]
    )
);

test("preserve keeps absent globals absent", () => {
    restorers.push(installGlobals({window: undefined, document: undefined, location: undefined}));
    const previous = descriptors();
    const harness = createBrowserHarness();
    const restore = installBrowserGlobals(harness, {environment: "preserve"});
    restorers.push(restore);
    expect(typeof chrome.runtime.getManifest).toBe("function");

    for (const name of ["window", "document", "location", "navigator"]) {
        expect(Object.getOwnPropertyDescriptor(globalThis, name)).toEqual(previous[name]);
    }

    restore();
    expect(descriptors()).toEqual(previous);
});

test("preserve never evaluates protected environment getters", () => {
    restorers.push(installGlobals({window: undefined, document: undefined, location: undefined, navigator: undefined}));

    for (const name of ["window", "document", "location", "navigator"]) {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            get() {
                throw new Error(`Unexpected access to ${name}`);
            },
        });
    }

    const before = descriptors();
    const restore = installBrowserGlobals(createBrowserHarness(), {profile: "firefox", environment: "preserve"});
    restorers.push(restore);
    restore();
    expect(descriptors()).toEqual(before);
});

test("nested profile restore returns URL scheme, capability, sidebar and active controls", () => {
    const harness = createBrowserHarness();
    const outer = installBrowserGlobals(harness, {profile: "chrome", environment: "preserve"});
    restorers.push(outer);
    const previous = descriptors();
    const inner = installBrowserGlobals(harness, {profile: "firefox", environment: "preserve"});
    restorers.push(inner);
    expect(getUrl("")).toMatch(/^moz-extension:/);
    expect(harness.configurable.active).toBe(harness.configurable.browser);
    inner();
    inner();
    expect(descriptors()).toEqual(previous);
    expect(getUrl("")).toMatch(/^chrome-extension:/);
    expect(harness.capabilities.has("runtime.getBrowserInfo")).toBe(false);
    expect(harness.sidebar.flavor).toBe("sidePanel");
    expect(harness.configurable.active).toBe(harness.configurable.chrome);
});

test("out-of-order restore fails without corrupting either installation and can be retried", () => {
    const first = createBrowserHarness({extensionId: "first"});
    const second = createBrowserHarness({extensionId: "second"});
    const before = descriptors();
    const outer = installBrowserGlobals(first, {environment: "preserve"});
    restorers.push(outer);
    const inner = installBrowserGlobals(second, {environment: "preserve", profile: "firefox"});
    restorers.push(inner);
    expect(() => outer()).toThrow("reverse installation order");
    expect(browser.runtime.id).toBe("second");
    inner();
    expect(chrome.runtime.id).toBe("first");
    outer();
    expect(descriptors()).toEqual(before);
});

test("failed installation rolls back preceding descriptors and harness profile changes", () => {
    const harness = createBrowserHarness();
    const before = descriptors();
    const original = Reflect.defineProperty;

    const define = jest.spyOn(Reflect, "defineProperty").mockImplementation((target, key, descriptor) => {
        if (target === globalThis && key === "safari") return false;

        return original(target, key, descriptor);
    });

    expect(() => installBrowserGlobals(harness, {environment: "preserve", profile: "safari"})).toThrow("Unable to install global");
    define.mockRestore();
    expect(descriptors()).toEqual(before);
    expect(harness.runtime.getURL.api("")).toMatch(/^chrome-extension:/);
    expect(harness.sidebar.flavor).toBe("sidePanel");
    expect(harness.configurable.active).toBe(harness.configurable.chrome);
    const restore = installBrowserGlobals(harness, {environment: "preserve"});
    restorers.push(restore);
    restore();
    expect(descriptors()).toEqual(before);
});

test("explicit capability and sidebar choices survive nested installations", () => {
    const harness = createBrowserHarness();
    harness.capabilities.set("runtime.getBrowserInfo", false);
    harness.sidebar.flavor = "none";
    harness.runtime.setUrlScheme("safari-web-extension");
    const restore = installBrowserGlobals(harness, {profile: "firefox", environment: "preserve"});
    restorers.push(restore);
    expect(harness.capabilities.has("runtime.getBrowserInfo")).toBe(false);
    expect(harness.sidebar.flavor).toBe("none");
    restore();
    expect(harness.runtime.getURL.api("")).toMatch(/^safari-web-extension:/);
    const next = installBrowserGlobals(harness, {profile: "chrome", environment: "preserve"});
    restorers.push(next);
    expect(harness.sidebar.flavor).toBe("none");
});

test("preserve rejects contradictory options before changing globals", () => {
    const harness = createBrowserHarness();
    const before = descriptors();
    expect(() => installBrowserGlobals(harness, {environment: "preserve", context: "serviceWorker"})).toThrow("cannot be combined");

    for (const key of ["window", "document", "location", "navigator"] as const) {
        expect(() => installBrowserGlobals(harness, {environment: "preserve", globals: {[key]: undefined}})).toThrow(`cannot override ${key}`);
    }

    expect(descriptors()).toEqual(before);
});

import {jest} from "@jest/globals";
