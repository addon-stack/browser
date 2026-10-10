import {afterEach, describe, expect, jest, test} from "@jest/globals";

import {installAvailabilityGlobals} from "../../../tests/api/availability";
import {isAvailableSidebar} from "./availability";
import {canCloseSidebar, canOpenSidebar} from "./methods";

describe("sidebar availability", () => {
    let restore: () => void = () => undefined;

    afterEach(() => {
        restore();
        jest.restoreAllMocks();
    });

    test.each([
        {profile: "Chrome", globals: {chrome: {sidePanel: {}}}},
        {profile: "Firefox", globals: {browser: {runtime: {id: "firefox"}, sidebarAction: {}}}},
        {profile: "Opera", globals: {chrome: {}, opr: {sidebarAction: {}}}},
    ])("detects $profile without requiring open or close methods", ({globals}) => {
        restore = installAvailabilityGlobals(globals);
        expect(isAvailableSidebar()).toBe(true);
        expect(canOpenSidebar()).toBe(false);
        expect(canCloseSidebar()).toBe(false);
    });

    test("observes API removal and restoration", () => {
        const native: {sidePanel?: object} = {sidePanel: {}};
        restore = installAvailabilityGlobals({chrome: native});
        expect(isAvailableSidebar()).toBe(true);
        delete native.sidePanel;
        expect(isAvailableSidebar()).toBe(false);
        native.sidePanel = {};
        expect(isAvailableSidebar()).toBe(true);
    });

    test("does not access sidebarAction when sidePanel is selected", () => {
        const opera = Object.defineProperty({}, "sidebarAction", {get: () => {
            throw new Error("The unselected API must not be read");
        }});

        restore = installAvailabilityGlobals({chrome: {sidePanel: {}}, opr: opera});
        expect(isAvailableSidebar()).toBe(true);
    });

    test("uses Opera before Firefox when both sidebar actions exist", () => {
        const firefox = {runtime: {id: "firefox"}};

        Object.defineProperty(firefox, "sidebarAction", {get: () => {
            throw new Error("The unselected API must not be read");
        }});

        restore = installAvailabilityGlobals({browser: firefox, opr: {sidebarAction: {}}});
        expect(isAvailableSidebar()).toBe(true);
    });

    test.each([{}, {chrome: {}}, {browser: {runtime: {id: "firefox"}}}])("returns false when no sidebar API can be selected: %j", globals => {
        restore = installAvailabilityGlobals(globals);
        expect(isAvailableSidebar()).toBe(false);
    });

    test("contains access errors without logging or trying another API", () => {
        const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

        const native = Object.defineProperty({}, "sidePanel", {get: () => {
            throw new Error("Access denied");
        }});

        restore = installAvailabilityGlobals({chrome: native, opr: {sidebarAction: {}}});
        expect(isAvailableSidebar()).toBe(false);
        expect(error).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });
});
