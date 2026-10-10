import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installGlobals} from "../../src/testing";

type AvailabilityGlobals = Partial<Record<"chrome" | "browser" | "opr", unknown>>;

// Deliberately incomplete globals model missing APIs and unavailable contexts.
export const installAvailabilityGlobals = (values: AvailabilityGlobals = {}): (() => void) =>
    installGlobals({chrome: undefined, browser: undefined, opr: undefined, ...values} as Parameters<typeof installGlobals>[0]);

export function describeNamespaceAvailability(namespace: string, isAvailable: () => boolean): void {
    describe(`${namespace} availability`, () => {
        let restore: () => void;

        const useGlobals = (values: AvailabilityGlobals) => {
            restore();
            restore = installAvailabilityGlobals(values);
        };

        beforeEach(() => {
            restore = installAvailabilityGlobals();
            jest.spyOn(console, "error").mockImplementation(() => undefined);
            jest.spyOn(console, "warn").mockImplementation(() => undefined);
        });

        afterEach(() => {
            restore();
            jest.restoreAllMocks();
        });

        test.each(["chrome", "browser"])("detects the namespace through the %s global without probing methods", globalName => {
            const api = new Proxy({id: "availability-test"}, {
                get(target, property) {
                    if (property === "id") {
                        return target.id;
                    }

                    throw new Error("Namespace checks must not access methods");
                },
            });

            useGlobals({[globalName]: {runtime: {id: "availability-test"}, [namespace]: api}});
            expect(isAvailable()).toBe(true);
        });

        test("returns false without extension globals and does not log", () => {
            expect(isAvailable()).toBe(false);
            expect(console.error).not.toHaveBeenCalled();
            expect(console.warn).not.toHaveBeenCalled();
        });

        test.each([undefined, null])("returns false when the namespace is %s", value => {
            useGlobals({chrome: {[namespace]: value}});
            expect(isAvailable()).toBe(false);
        });

        test("observes namespace removal and restoration on every call", () => {
            const native: Record<string, unknown> = {[namespace]: {}};
            useGlobals({chrome: native});
            expect(isAvailable()).toBe(true);
            delete native[namespace];
            expect(isAvailable()).toBe(false);
            native[namespace] = {};
            expect(isAvailable()).toBe(true);
        });

        test("contains namespace access errors without logging", () => {
            const native = Object.defineProperty({}, namespace, {get: () => {
                throw new Error("Access denied");
            }});

            useGlobals({chrome: native});
            expect(isAvailable()).toBe(false);
            expect(console.error).not.toHaveBeenCalled();
            expect(console.warn).not.toHaveBeenCalled();
        });

        test("contains global API access errors", () => {
            Object.defineProperty(globalThis, "chrome", {configurable: true, get: () => {
                throw new Error("Context invalidated");
            }});

            expect(isAvailable()).toBe(false);
        });

        test("uses chrome when browser has no extension identity", () => {
            useGlobals({browser: {}, chrome: {[namespace]: {}}});
            expect(isAvailable()).toBe(true);
        });

        if (namespace !== "runtime") {
            test("does not fill a missing browser namespace from chrome", () => {
                useGlobals({browser: {runtime: {id: "firefox"}}, chrome: {[namespace]: {}}});
                expect(isAvailable()).toBe(false);
            });
        }
    });
}
