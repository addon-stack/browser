import {setImmediate as nextTurn} from "node:timers/promises";
import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, createExtensionContextFixture, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const observe = <T>(operation: Promise<T>) => {
    let status: "pending" | "resolved" | "rejected" = "pending";

    const result = (async () => {
        try {
            const value = await operation;
            status = "resolved";

            return {status, value} as const;
        } catch (error) {
            status = "rejected";

            return {status, error} as const;
        }
    })();

    return {result, get status() {
        return status;
    }};
};

const chromeMethods = [
    ["getOptions", () => api.getSidebarOptions(4)],
    ["getPanelBehavior", api.getSidebarBehavior],
    ["setOptions", () => api.setSidebarOptions({path: "panel.html"})],
    ["setPanelBehavior", () => api.setSidebarBehavior({openPanelOnActionClick: true})],
    ["open", () => api.openSidebar({windowId: 7})],
    ["close", () => api.closeSidebar({windowId: 7})],
    ["getOptions", () => api.getSidebarPath(4)],
    ["setOptions", () => api.setSidebarPath("panel.html", 4)],
] as const;

const actionMethods = [
    ["getTitle", () => api.getSidebarTitle(4)],
    ["setTitle", () => api.setSidebarTitle("Panel", 4)],
    ["getPanel", () => api.getSidebarPath(4)],
    ["setPanel", () => api.setSidebarPath("panel.html", 4)],
] as const;

const badgeMethods = [
    ["setBadgeText", () => api.setSidebarBadgeText("New", 4)],
    ["setBadgeText", () => api.clearSidebarBadgeText(4)],
    ["getBadgeText", () => api.getSidebarBadgeText(4)],
    ["setBadgeTextColor", () => api.setSidebarBadgeTextColor("#ffffff", 4)],
    ["getBadgeTextColor", () => api.getSidebarBadgeTextColor(4)],
    ["setBadgeBackgroundColor", () => api.setSidebarBadgeBgColor("#000000", 4)],
    ["getBadgeBackgroundColor", () => api.getSidebarBadgeBgColor(4)],
] as const;

const visibilityMethods = [
    ["open", () => api.openSidebar({windowId: 7})],
    ["close", () => api.closeSidebar({windowId: 7})],
    ["toggle", api.toggleSidebar],
] as const;

describe("sidebar methods: Chrome sidePanel", () => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "chrome"});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        restore();
    });

    test.each([undefined, 0, 4])("getSidebarOptions forwards tabId=%s and preserves options", async tabId => {
        const options: chrome.sidePanel.PanelOptions = {tabId, enabled: false, path: "panel.html?mode=test#ready"};
        harness.sidebar.sidePanel.getOptions.setResult(options);
        await expect(api.getSidebarOptions(tabId)).resolves.toBe(options);
        expect(harness.sidebar.sidePanel.getOptions.calls[0]).toMatchObject({args: [{tabId}], invocation: "callback"});
    });

    test("getSidebarBehavior preserves the native result", async () => {
        const behavior = {openPanelOnActionClick: false};
        harness.sidebar.sidePanel.getPanelBehavior.setResult(behavior);
        await expect(api.getSidebarBehavior()).resolves.toBe(behavior);
        expect(harness.sidebar.sidePanel.getPanelBehavior.calls[0].args).toEqual([]);
    });

    test("setSidebarOptions forwards options and defaults to an empty object", async () => {
        const options = {tabId: 0, path: "panel.html", enabled: false};
        const method = harness.sidebar.sidePanel.setOptions;
        method.setResult(undefined);
        await expect(api.setSidebarOptions(options)).resolves.toBeUndefined();
        await expect(api.setSidebarOptions()).resolves.toBeUndefined();
        expect(method.calls.map(call => call.args)).toEqual([[options], [{}]]);
        expect(method.calls[0].args[0]).toBe(options);
    });

    test("setSidebarBehavior forwards behavior and defaults to an empty object", async () => {
        const behavior = {openPanelOnActionClick: false};
        const method = harness.sidebar.sidePanel.setPanelBehavior;
        method.setResult(undefined);
        await expect(api.setSidebarBehavior(behavior)).resolves.toBeUndefined();
        await expect(api.setSidebarBehavior()).resolves.toBeUndefined();
        expect(method.calls.map(call => call.args)).toEqual([[behavior], [{}]]);
        expect(method.calls[0].args[0]).toBe(behavior);
    });

    test.each(["open", "close"] as const)("%s forwards window/tab options and handles an immediate callback", async name => {
        const method = harness.sidebar.sidePanel[name];
        const invoke = name === "open" ? api.openSidebar : api.closeSidebar;
        method.setResult(undefined);

        for (const options of [{windowId: 7}, {tabId: 0}, {windowId: 7, tabId: 4}]) {
            await expect(invoke(options)).resolves.toBeUndefined();
            expect(method.calls.at(-1)).toMatchObject({args: [options], invocation: "callback"});
            expect(method.calls.at(-1)?.args[0]).toBe(options);
        }
    });

    test.each(chromeMethods)("%s propagates an immediate runtime.lastError", async (name, invoke) => {
        harness.sidebar.sidePanel[name].failNext(new Error("Side panel denied"));
        await expect(invoke()).rejects.toThrow("Side panel denied");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test.each(chromeMethods)("missing %s rejects instead of silently succeeding", async (name, invoke) => {
        harness.capabilities.set(`sidePanel.${name}`, false);
        await expect(invoke()).rejects.toThrow();
    });

    test("setSidebarPath forwards a local resource and optional tab id", async () => {
        const method = harness.sidebar.sidePanel.setOptions;
        method.setResult(undefined);
        await api.setSidebarPath("panel.html?mode=test#ready", 0);
        await api.setSidebarPath("default.html");

        expect(method.calls.map(call => call.args)).toEqual([
            [{path: "panel.html?mode=test#ready", tabId: 0}], [{path: "default.html", tabId: undefined}],
        ]);
    });

    test("setSidebarPath waits for setOptions to finish", async () => {
        const method = harness.sidebar.sidePanel.setOptions;
        method.setImplementation((() => undefined) as unknown as typeof method.api);
        const operation = observe(api.setSidebarPath("panel.html", 4));
        await nextTurn();

        try {
            expect(operation.status).toBe("pending");
        } finally {
            method.calls[0].callback!();
            await operation.result;
        }

        expect(operation.status).toBe("resolved");
    });

    test("getSidebarOptions waits for a delayed result", async () => {
        const method = harness.sidebar.sidePanel.getOptions;
        method.setImplementation((() => undefined) as unknown as typeof method.api);
        const options = {path: "panel.html", tabId: 4, enabled: false};
        const operation = observe(api.getSidebarOptions(4));
        await nextTurn();

        try {
            expect(operation.status).toBe("pending");
        } finally {
            method.calls[0].callback!(options);
            await operation.result;
        }

        expect(await operation.result).toEqual({status: "resolved", value: options});
    });

    test.each(["panel.html?mode=test#ready", undefined])("getSidebarPath preserves the Chrome path %s", async path => {
        harness.sidebar.sidePanel.getOptions.setResult({path});
        await expect(api.getSidebarPath(4)).resolves.toBe(path);
        expect(harness.sidebar.sidePanel.getOptions.calls[0].args).toEqual([{tabId: 4}]);
    });

    test("isOpenSidebar selects side-panel contexts in the requested window", async () => {
        harness.runtime.setContexts([
            createExtensionContextFixture({contextId: "panel", contextType: "SIDE_PANEL", windowId: 7}),
            createExtensionContextFixture({contextId: "popup", contextType: "POPUP", windowId: 8}),
        ]);

        await expect(api.isOpenSidebar(7)).resolves.toBe(true);
        await expect(api.isOpenSidebar(8)).resolves.toBe(false);

        expect(harness.runtime.getContexts.calls.map(call => call.args)).toEqual([
            [{contextTypes: ["SIDE_PANEL"], windowIds: [7]}], [{contextTypes: ["SIDE_PANEL"], windowIds: [8]}],
        ]);
    });

    test("isOpenSidebar propagates context lookup errors", async () => {
        harness.runtime.getContexts.failNext(new Error("Contexts unavailable"));
        await expect(api.isOpenSidebar(7)).rejects.toThrow("Contexts unavailable");
    });

    test("capability checks detect supported open and close methods", () => {
        expect(api.canOpenSidebar()).toBe(true);
        expect(api.canCloseSidebar()).toBe(true);
    });

    test.each([
        ...actionMethods.filter(([name]) => name === "getTitle" || name === "setTitle"),
        ...badgeMethods,
        ["toggle", api.toggleSidebar],
        ["setIcon", () => api.setSidebarIcon({path: "icon.png"})],
    ] as const)("%s rejects when only sidePanel is available", async (_name, invoke) => {
        await expect(invoke()).rejects.toBeInstanceOf(api.SidebarError);
    });

    describe("capability and callback regressions", () => {
        test.each([
            ["open", api.canOpenSidebar], ["close", api.canCloseSidebar],
        ] as const)("capability check returns false when sidePanel.%s is missing", (name, probe) => {
            harness.capabilities.set(`sidePanel.${name}`, false);
            expect(probe()).toBe(false);
        });

        test.each(["open", "close"] as const)("%s waits for a delayed callback", async name => {
            const method = harness.sidebar.sidePanel[name];
            // Returning undefined models the native callback overload.
            method.setImplementation((() => undefined) as unknown as typeof method.api);
            const operation = observe((name === "open" ? api.openSidebar : api.closeSidebar)({windowId: 7}));
            await nextTurn();

            try {
                expect(operation.status).toBe("pending");
            } finally {
                method.calls[0].callback!();
                await operation.result;
            }

            expect(operation.status).toBe("resolved");
        });

        test.each(["open", "close"] as const)("%s rejects a delayed runtime.lastError", async name => {
            const method = harness.sidebar.sidePanel[name];
            method.setImplementation((() => undefined) as unknown as typeof method.api);
            const operation = observe((name === "open" ? api.openSidebar : api.closeSidebar)({windowId: 7}));
            await nextTurn();
            // Chrome exposes lastError only while the callback runs.
            const lastError = jest.spyOn(harness.chrome.runtime, "lastError", "get");
            lastError.mockReturnValue({message: "Delayed native failure"});

            try {
                method.calls[0].callback!();
            } finally {
                lastError.mockRestore();
            }

            expect(await operation.result).toMatchObject({status: "rejected", error: {message: "Delayed native failure"}});
        });

        test("isOpenSidebar preserves windowId=0 instead of matching another window", async () => {
            harness.runtime.setContexts([
                createExtensionContextFixture({contextType: "SIDE_PANEL", windowId: 7}),
            ]);

            await expect(api.isOpenSidebar(0)).resolves.toBe(false);
            expect(harness.runtime.getContexts.calls[0].args).toEqual([{contextTypes: ["SIDE_PANEL"], windowIds: [0]}]);
        });
    });
});

describe("sidebar methods: Firefox sidebarAction", () => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "firefox"});
    });

    afterEach(() => restore());

    test.each(visibilityMethods)("%s calls the native Promise API without arguments", async (name, invoke) => {
        const method = harness.sidebar.firefox[name];
        method.setResult(undefined);
        await expect(invoke()).resolves.toBeUndefined();
        expect(method.calls[0]).toMatchObject({args: [], callback: undefined, invocation: "promise"});
    });

    test.each([
        ...visibilityMethods,
        ["setPanel", () => api.setSidebarPath("panel.html", 4)],
        ["setTitle", () => api.setSidebarTitle("Panel", 4)],
        ["setIcon", () => api.setSidebarIcon({path: "icon.png", tabId: 4})],
    ] as const)("%s waits for the native Promise before resolving", async (name, invoke) => {
        let complete!: () => void;

        const pending = new Promise<void>(resolve => {
            complete = resolve;
        });

        harness.sidebar.firefox[name].setImplementation(() => pending);
        const operation = observe(invoke());
        await nextTurn();

        try {
            expect(operation.status).toBe("pending");
        } finally {
            complete();
            await operation.result;
        }

        expect(operation.status).toBe("resolved");
    });

    test.each([
        ...visibilityMethods, ...actionMethods,
        ["isOpen", () => api.isOpenSidebar(7)],
        ["setIcon", () => api.setSidebarIcon({path: "icon.png"})],
    ] as const)("%s propagates native Promise rejections", async (name, invoke) => {
        const error = new Error("Firefox sidebar denied");
        harness.sidebar.firefox[name].failNext(error);
        await expect(invoke()).rejects.toBe(error);
    });

    test.each(visibilityMethods)("%s propagates a delayed Promise rejection", async (name, invoke) => {
        let fail!: (error: Error) => void;

        const pending = new Promise<void>((_resolve, reject) => {
            fail = reject;
        });

        harness.sidebar.firefox[name].setImplementation(() => pending);
        const operation = observe(invoke());
        await nextTurn();
        const error = new Error("Delayed Firefox failure");

        try {
            expect(operation.status).toBe("pending");
        } finally {
            fail(error);
            await operation.result;
        }

        expect(await operation.result).toEqual({status: "rejected", error});
    });

    test.each([undefined, 0, 7])("isOpenSidebar forwards windowId=%s and preserves true/false", async windowId => {
        const method = harness.sidebar.firefox.isOpen;

        for (const result of [true, false]) {
            method.setResult(result);
            await expect(api.isOpenSidebar(windowId)).resolves.toBe(result);
            expect(method.calls.at(-1)).toMatchObject({args: [{windowId}], callback: undefined, invocation: "promise"});
        }
    });

    test("setSidebarIcon forwards icon details unchanged", async () => {
        const details = {path: {16: "small.png", 32: "large.png"}, tabId: 0};
        const method = harness.sidebar.firefox.setIcon;
        method.setResult(undefined);
        await expect(api.setSidebarIcon(details)).resolves.toBeUndefined();
        expect(method.calls[0].args[0]).toBe(details);
    });

    test.each([
        ["open", api.canOpenSidebar], ["close", api.canCloseSidebar],
    ] as const)("capability check follows Firefox %s availability", (name, probe) => {
        expect(probe()).toBe(true);
        harness.capabilities.set(`browser.sidebarAction.${name}`, false);
        expect(probe()).toBe(false);
    });

    test.each([
        ...visibilityMethods, ...actionMethods,
        ["isOpen", () => api.isOpenSidebar(7)],
        ["setIcon", () => api.setSidebarIcon({path: "icon.png"})],
    ] as const)("missing sidebarAction.%s rejects", async (name, invoke) => {
        harness.capabilities.set(`browser.sidebarAction.${name}`, false);
        await expect(invoke()).rejects.toThrow();
    });

    test.each(badgeMethods)("Opera-only %s rejects in Firefox", async (_name, invoke) => {
        await expect(invoke()).rejects.toBeInstanceOf(api.SidebarError);
    });
});

describe.each(["firefox", "opera"] as const)("sidebarAction title and panel methods in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test.each([undefined, 0, 4])("getSidebarTitle passes tabId=%s and preserves the title", async tabId => {
        const method = harness.sidebar[profile].getTitle;
        method.setResult("Sidebar title");
        await expect(api.getSidebarTitle(tabId)).resolves.toBe("Sidebar title");
        expect(method.calls[0]).toMatchObject({args: [{tabId}], invocation: profile === "opera" ? "callback" : "promise"});
    });

    test.each(["Sidebar title", 0])("setSidebarTitle converts %s to text and preserves the tab scope", async title => {
        const method = harness.sidebar[profile].setTitle;
        method.setResult(undefined);
        await api.setSidebarTitle(title, 0);
        await api.setSidebarTitle(title);

        expect(method.calls.map(call => call.args)).toEqual([
            [{title: String(title), tabId: 0}], [{title: String(title), tabId: undefined}],
        ]);

        expect(method.calls[0].invocation).toBe(profile === "opera" ? "sync" : "promise");
    });

    test("setSidebarPath forwards the panel and tab scope", async () => {
        const method = harness.sidebar[profile].setPanel;
        method.setResult(undefined);
        await api.setSidebarPath("panel.html?mode=test#ready", 0);
        await api.setSidebarPath("default.html");

        expect(method.calls.map(call => call.args)).toEqual([
            [{panel: "panel.html?mode=test#ready", tabId: 0}], [{panel: "default.html", tabId: undefined}],
        ]);

        expect(method.calls[0].invocation).toBe(profile === "opera" ? "sync" : "promise");
    });

    // Deliberately no normalization expectation here: the common getSidebarPath
    // contract (leading slash, origin, query and fragment) needs a separate decision.
    test.each([undefined, 0, 4])("getSidebarPath queries tabId=%s with the browser's invocation style", async tabId => {
        const method = harness.sidebar[profile].getPanel;
        method.setResult(`${profile === "firefox" ? "moz" : "chrome"}-extension://extension-id/panel.html`);
        await api.getSidebarPath(tabId);
        expect(method.calls[0]).toMatchObject({args: [{tabId}], invocation: profile === "opera" ? "callback" : "promise"});
    });

    test.each([
        ["getOptions", api.getSidebarOptions], ["getPanelBehavior", api.getSidebarBehavior],
        ["setOptions", api.setSidebarOptions], ["setPanelBehavior", api.setSidebarBehavior],
    ] as const)("Chrome-only %s rejects", async (_name, invoke) => {
        await expect(invoke()).rejects.toThrow();
    });
});

describe("sidebar methods: Opera sidebarAction", () => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile: "opera"});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        restore();
    });

    test.each(["New", 0])("setSidebarBadgeText converts %s to text", async text => {
        const method = harness.sidebar.opera.setBadgeText;
        method.setResult(undefined);
        await api.setSidebarBadgeText(text, 0);
        await api.setSidebarBadgeText(text);

        expect(method.calls.map(call => call.args)).toEqual([
            [{text: String(text), tabId: 0}], [{text: String(text), tabId: undefined}],
        ]);

        expect(method.calls[0].invocation).toBe("sync");
    });

    test.each([undefined, 0, 4])("clearSidebarBadgeText sends empty text for tabId=%s", async tabId => {
        const method = harness.sidebar.opera.setBadgeText;
        method.setResult(undefined);
        await api.clearSidebarBadgeText(tabId);
        expect(method.calls[0].args).toEqual([{text: "", tabId}]);
    });

    test.each([undefined, 0, 4])("getSidebarBadgeText uses a callback and preserves empty text for tabId=%s", async tabId => {
        const method = harness.sidebar.opera.getBadgeText;
        method.setResult("");
        await expect(api.getSidebarBadgeText(tabId)).resolves.toBe("");
        expect(method.calls[0]).toMatchObject({args: [{tabId}], invocation: "callback"});
    });

    test.each([
        ["setBadgeTextColor", api.setSidebarBadgeTextColor],
        ["setBadgeBackgroundColor", api.setSidebarBadgeBgColor],
    ] as const)("%s forwards string and RGBA colors unchanged", async (name, invoke) => {
        const method = harness.sidebar.opera[name];
        method.setResult(undefined);
        const colors: Array<string | chrome.extensionTypes.ColorArray> = ["#123456", [1, 2, 3, 255]];

        for (const color of colors) {
            await invoke(color, 0);
            await invoke(color);
            expect(method.calls.at(-2)).toMatchObject({args: [{tabId: 0, color}], invocation: "sync"});
            expect(method.calls.at(-1)?.args).toEqual([{tabId: undefined, color}]);
        }
    });

    test.each([
        ["getBadgeTextColor", api.getSidebarBadgeTextColor],
        ["getBadgeBackgroundColor", api.getSidebarBadgeBgColor],
    ] as const)("%s preserves the RGBA result", async (name, invoke) => {
        const method = harness.sidebar.opera[name];
        const color: chrome.extensionTypes.ColorArray = [1, 2, 3, 255];
        method.setResult(color);

        for (const tabId of [undefined, 0, 4]) {
            await expect(invoke(tabId)).resolves.toBe(color);
            expect(method.calls.at(-1)).toMatchObject({args: [{tabId}], invocation: "callback"});
        }
    });

    test.each([...actionMethods, ...badgeMethods, ["setIcon", () => api.setSidebarIcon({path: "icon.png"})]] as const)("%s propagates native callback/synchronous errors", async (name, invoke) => {
        harness.sidebar.opera[name].failNext(new Error("Opera sidebar denied"));
        await expect(invoke()).rejects.toThrow("Opera sidebar denied");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test.each([...actionMethods, ...badgeMethods, ["setIcon", () => api.setSidebarIcon({path: "icon.png"})]] as const)("missing opr.sidebarAction.%s rejects", async (name, invoke) => {
        harness.capabilities.set(`opr.sidebarAction.${name}`, false);
        await expect(invoke()).rejects.toThrow();
    });

    test("getSidebarTitle waits for an Opera callback result", async () => {
        const method = harness.sidebar.opera.getTitle;
        method.setImplementation((() => undefined) as unknown as typeof method.api);
        const operation = observe(api.getSidebarTitle(4));
        await nextTurn();

        try {
            expect(operation.status).toBe("pending");
        } finally {
            method.calls[0].callback!("Delayed title");
            await operation.result;
        }

        expect(await operation.result).toEqual({status: "resolved", value: "Delayed title"});
    });

    test("capability checks return false for unavailable open/close", () => {
        expect(api.canOpenSidebar()).toBe(false);
        expect(api.canCloseSidebar()).toBe(false);
    });

    test.each([...visibilityMethods, ["isOpen", () => api.isOpenSidebar(7)]] as const)("%s rejects when Opera cannot perform it", async (_name, invoke) => {
        await expect(invoke()).rejects.toBeInstanceOf(api.SidebarError);
    });

    test("setSidebarIcon invokes the native method with a completion callback", async () => {
        const method = harness.sidebar.opera.setIcon;
        method.setResult(undefined);
        const details = {path: "icon.png", tabId: 4};
        await expect(api.setSidebarIcon(details)).resolves.toBeUndefined();
        expect(method.calls).toHaveLength(1);
        expect(method.calls[0].args[0]).toBe(details);
        expect(method.calls[0]).toMatchObject({invocation: "callback", callbackCalls: [[]]});
    });

    test("setSidebarIcon waits for the Opera completion callback", async () => {
        const method = harness.sidebar.opera.setIcon;
        let complete!: () => void;

        method.setImplementation((_details, callback) => {
            complete = callback!;
        });

        const operation = observe(api.setSidebarIcon({path: "icon.png"}));
        await nextTurn();

        try {
            expect(operation.status).toBe("pending");
        } finally {
            complete();
            await operation.result;
        }

        expect(operation.status).toBe("resolved");
        expect(method.calls[0].callbackCalls).toEqual([[]]);
    });

    test("setSidebarIcon rejects a delayed Opera runtime.lastError", async () => {
        const method = harness.sidebar.opera.setIcon;
        let complete!: () => void;

        method.setImplementation((_details, callback) => {
            complete = callback!;
        });

        const operation = observe(api.setSidebarIcon({path: "icon.png"}));
        await nextTurn();
        const lastError = jest.spyOn(harness.chrome.runtime, "lastError", "get");
        lastError.mockReturnValue({message: "Access to extension API denied"});

        try {
            complete();
        } finally {
            lastError.mockRestore();
        }

        expect(await operation.result).toMatchObject({
            status: "rejected", error: {message: "Access to extension API denied"},
        });
    });

    test("setSidebarIcon turns a synchronous native exception into a rejection", async () => {
        const error = new Error("Access to extension API denied");

        harness.sidebar.opera.setIcon.setImplementation(() => {
            throw error;
        });

        await expect(api.setSidebarIcon({path: "icon.png"})).rejects.toBe(error);
    });

    test("the Opera facade also accepts setIcon without its optional callback", () => {
        const method = harness.sidebar.opera.setIcon;
        method.setResult(undefined);
        expect(globalThis.opr.sidebarAction.setIcon({path: "icon.png"})).toBeUndefined();
        expect(method.calls[0]).toMatchObject({args: [{path: "icon.png"}], invocation: "sync", callback: undefined});
    });
});

describe("sidebar methods without a sidebar API", () => {
    let restore: () => void;

    beforeEach(() => {
        const harness = createBrowserHarness();
        harness.sidebar.flavor = "none";
        restore = installBrowserGlobals(harness, {profile: "chrome"});
    });

    afterEach(() => restore());

    test("capability checks return false", () => {
        expect(api.canOpenSidebar()).toBe(false);
        expect(api.canCloseSidebar()).toBe(false);
    });

    test.each([
        ...chromeMethods, ...actionMethods, ...badgeMethods,
        ["toggle", api.toggleSidebar], ["isOpen", api.isOpenSidebar],
        ["setIcon", () => api.setSidebarIcon({path: "icon.png"})],
    ] as const)("%s rejects instead of succeeding without an API", async (_name, invoke) => {
        await expect(invoke()).rejects.toThrow();
    });
});
