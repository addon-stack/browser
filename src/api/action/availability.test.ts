import {afterEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "../../../tests/api/availability";
import {isAvailableAction} from "./availability";

describe("action availability", () => {
    let restore: () => void = () => undefined;

    afterEach(() => {
        restore();
        jest.restoreAllMocks();
    });

    describe.each(["chrome", "browser"])("with the %s global", globalName => {
        test.each([2, 3])("checks only the namespace selected for MV%s", version => {
            const namespace = version === 3 ? "action" : "browserAction";

            const native = {
                runtime: {id: "action-test", getManifest: () => ({manifest_version: version})},
                action: {},
                browserAction: {},
            };

            restore = installAvailabilityGlobals({[globalName]: native});
            expect(isAvailableAction()).toBe(true);
            Reflect.deleteProperty(native, namespace);
            expect(isAvailableAction()).toBe(false);
            Object.assign(native, {[namespace]: {}});
            expect(isAvailableAction()).toBe(true);
        });
    });

    test("reevaluates the manifest version on every call", () => {
        let version = 2;
        restore = installAvailabilityGlobals({chrome: {runtime: {getManifest: () => ({manifest_version: version})}, action: {}}});
        expect(isAvailableAction()).toBe(false);
        version = 3;
        expect(isAvailableAction()).toBe(true);
    });

    test("returns false when the manifest cannot be read and stays silent", () => {
        const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

        restore = installAvailabilityGlobals({chrome: {action: {}, runtime: {getManifest: () => {
            throw new Error("Context invalidated");
        }}}});

        expect(isAvailableAction()).toBe(false);
        expect(error).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });

    test("contains errors while accessing the selected namespace", () => {
        const native = {runtime: {getManifest: () => ({manifest_version: 3})}};

        Object.defineProperty(native, "action", {get: () => {
            throw new Error("Access denied");
        }});

        restore = installAvailabilityGlobals({chrome: native});
        expect(isAvailableAction()).toBe(false);
    });

    test("returns false outside an extension context", () => {
        restore = installAvailabilityGlobals();
        expect(isAvailableAction()).toBe(false);
    });
});
