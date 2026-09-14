/** @jest-environment jsdom */
import {getManifest, getUrl} from "../../../src/runtime";
import {createBrowserHarness, installBrowserGlobals} from "../../../src/testing/index";

const environment = () => Object.fromEntries(["window", "document", "location", "navigator"].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]
));

test("preserve retains the actual DOM, URL, navigator and all property descriptors", () => {
    const harness = createBrowserHarness();
    document.body.innerHTML = '<button id="example">Click</button>';
    const button = document.querySelector("button")!;
    let clicks = 0;

    button.addEventListener("click", () => {
        clicks += 1;
    });

    const before = environment();
    const identities = [window, document, location, navigator];
    const restore = installBrowserGlobals(harness, {environment: "preserve", profile: "chrome"});

    try {
        expect(environment()).toEqual(before);
        [window, document, location, navigator].forEach((value, index) => expect(value).toBe(identities[index]));
        expect(window.document).toBe(document);
        expect(window.location).toBe(location);
        expect(window.navigator).toBe(navigator);
        expect(getManifest().name).toBe("Test Extension");
        button.click();
        expect(clicks).toBe(1);
        const inner = installBrowserGlobals(harness, {environment: "preserve", profile: "firefox"});

        try {
            expect(getUrl("")).toMatch(/^moz-extension:/);
            expect(environment()).toEqual(before);
        } finally {
            inner();
        }

        expect(getUrl("")).toMatch(/^chrome-extension:/);
    } finally {
        restore();
    }

    expect(environment()).toEqual(before);
    expect(document.querySelector("button")).toBe(button);
});

test("a simulated installation failing on jsdom's non-configurable window rolls back API globals and harness state", () => {
    const harness = createBrowserHarness();
    const names = ["chrome", "browser", "opr", "safari", "window", "document", "location", "navigator"];
    const before = names.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
    expect(Object.getOwnPropertyDescriptor(globalThis, "window")?.configurable).toBe(false);
    expect(() => installBrowserGlobals(harness, {profile: "firefox"})).toThrow("Unable to install global window");
    expect(names.map(key => Object.getOwnPropertyDescriptor(globalThis, key))).toEqual(before);
    expect(harness.runtime.getURL.api("")).toMatch(/^chrome-extension:/);
    expect(harness.sidebar.flavor).toBe("sidePanel");
    const restore = installBrowserGlobals(harness, {environment: "preserve"});
    restore();
    expect(names.map(key => Object.getOwnPropertyDescriptor(globalThis, key))).toEqual(before);
});
