import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "./availability";

export function describeSafePredicate(name: string, probe: () => boolean | Promise<boolean>): void {
    describe(`${name} safe predicate`, () => {
        let restore: () => void = () => undefined;

        beforeEach(() => {
            jest.spyOn(console, "error").mockImplementation(() => undefined);
            jest.spyOn(console, "warn").mockImplementation(() => undefined);
        });

        afterEach(() => {
            try {
                expect(console.error).not.toHaveBeenCalled();
                expect(console.warn).not.toHaveBeenCalled();
            } finally {
                restore();
                jest.restoreAllMocks();
            }
        });

        test.each([{}, {chrome: {}}, {browser: {runtime: {id: "firefox"}}}])("returns false without required APIs: %j", async globals => {
            restore = installAvailabilityGlobals(globals);
            expect(await probe()).toBe(false);
        });

        test("contains global access errors", async () => {
            restore = installAvailabilityGlobals();

            Object.defineProperty(globalThis, "chrome", {configurable: true, get: () => {
                throw new Error("Context invalidated");
            }});

            expect(await probe()).toBe(false);
        });

        test("contains API member access errors", async () => {
            const denyAccess = () => {
                throw new Error("API access denied");
            };

            const native = Object.defineProperties({}, {
                runtime: {get: denyAccess},
                downloads: {get: denyAccess},
            });

            restore = installAvailabilityGlobals({chrome: native});
            expect(await probe()).toBe(false);
        });
    });
}
