import {afterEach, describe, expect, test} from "@jest/globals";
import {browser} from "./browser";

// Deliberately partial globals exercise contexts without a complete extension API.
const installGlobals = (values: {browser: unknown; chrome: unknown}): (() => void) => {
    const originals = ["browser", "chrome"].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);

    for (const [name, value] of Object.entries(values)) {
        Object.defineProperty(globalThis, name, {configurable: true, writable: true, value});
    }

    return () => {
        for (const [name, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    };
};

describe("browser API selection", () => {
    let restore: () => void = () => undefined;

    afterEach(() => {
        restore();
    });

    test("prefers browser with an extension id over chrome", () => {
        const firefox = {runtime: {id: "firefox"}};
        restore = installGlobals({browser: firefox, chrome: {runtime: {id: "chrome"}}});
        expect(browser()).toBe(firefox);
    });

    test.each([undefined, {}, {runtime: {}}, {runtime: {id: ""}}])("falls back to chrome for browser=%j", candidate => {
        const chrome = {runtime: {id: "chrome"}};
        restore = installGlobals({browser: candidate, chrome});
        expect(browser()).toBe(chrome);
    });

    test("works with only the browser namespace", () => {
        const firefox = {runtime: {id: "firefox"}};
        restore = installGlobals({browser: firefox, chrome: undefined});
        expect(browser()).toBe(firefox);
    });

    test.each([undefined, {runtime: {}}])("throws when neither namespace can be selected", candidate => {
        restore = installGlobals({browser: candidate, chrome: undefined});
        expect(() => browser()).toThrow("WebExtension API not available in this context");
    });

    test("resolves globals on each call", () => {
        const first = {runtime: {id: "first"}};
        const second = {runtime: {id: "second"}};
        restore = installGlobals({browser: undefined, chrome: first});
        expect(browser()).toBe(first);
        restore();
        restore = installGlobals({browser: undefined, chrome: second});
        expect(browser()).toBe(second);
    });
});
