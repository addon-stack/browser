import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

import {installNativeApiFixture} from "../../../tests/api/native";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {clearAlarm, clearAllAlarm, createAlarm, createAlarmIfNotExists, getAlarm, getAllAlarm} from "./methods";

describe.each(["chrome", "firefox"] as const)("alarms methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    const alarm: chrome.alarms.Alarm = {
        name: "sync",
        periodInMinutes: 5,
        persistAcrossSessions: false,
        scheduledTime: 123456,
    };

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        harness.configurable.active.alarms.get.setResult(undefined);
        harness.configurable.active.alarms.getAll.setResult([]);
        harness.configurable.active.alarms.create.setResult(undefined);
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each([true, false])("clearAlarm preserves %s and forwards the name", async result => {
        const method = harness.configurable.active.alarms.clear;
        method.setResult(result);
        await expect(clearAlarm("sync")).resolves.toBe(result);
        expect(method.calls).toHaveLength(1);
        expect(method.calls[0].args).toEqual(["sync"]);
    });

    test.each([{alarms: []}, {alarms: [alarm]}])("clearAllAlarm reports the earlier collection $alarms and passes no native arguments", async ({alarms}) => {
        const method = harness.configurable.active.alarms.clearAll;
        harness.configurable.active.alarms.getAll.setResult(alarms);
        method.setResult(true);
        await expect(clearAllAlarm()).resolves.toBe(alarms.length > 0);
        expect(method.calls).toHaveLength(1);
        expect(method.calls[0].args).toEqual([]);
    });

    test("createAlarm forwards the name and the original schedule", async () => {
        const info = {delayInMinutes: 1, periodInMinutes: 5};
        await expect(createAlarm("sync", info)).resolves.toBeUndefined();
        const method = harness.configurable.active.alarms.create;
        expect(method.calls).toHaveLength(1);
        expect(method.calls[0].args).toEqual(["sync", info]);
        expect(method.calls[0].args[1]).toBe(info);
    });

    test.each([
        {label: "an existing alarm", result: alarm},
        {label: "a missing alarm", result: undefined},
    ])("getAlarm preserves $label and forwards the name", async ({result}) => {
        const method = harness.configurable.active.alarms.get;
        method.setResult(result);
        await expect(getAlarm("sync")).resolves.toBe(result);
        expect(method.calls).toHaveLength(1);
        expect(method.calls[0].args).toEqual(["sync"]);
    });

    test.each([
        {label: "registered alarms", result: [alarm]},
        {label: "an empty list", result: []},
    ])("getAllAlarm preserves $label and passes no native arguments", async ({result}) => {
        const method = harness.configurable.active.alarms.getAll;
        method.setResult(result);
        await expect(getAllAlarm()).resolves.toBe(result);
        expect(method.calls).toHaveLength(1);
        expect(method.calls[0].args).toEqual([]);
    });

    test.each([
        ["clear", () => clearAlarm("sync")],
        ["clearAll", () => clearAllAlarm()],
        ["create", () => createAlarm("sync", {periodInMinutes: 5})],
        ["get", () => getAlarm("sync")],
        ["getAll", () => getAllAlarm()],
    ] as const)("%s propagates native errors", async (name, invoke) => {
        harness.configurable.active.alarms[name].failNext(new Error("Alarm access denied"));
        await expect(invoke()).rejects.toThrow("Alarm access denied");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test("creates a missing alarm with the supplied name and schedule", async () => {
        const info = {periodInMinutes: 5};

        await expect(createAlarmIfNotExists("sync", info)).resolves.toBe(true);

        expect(harness.configurable.active.alarms.get.calls).toMatchObject([{args: ["sync"]}]);
        expect(harness.configurable.active.alarms.create.calls).toMatchObject([{args: ["sync", info]}]);
    });

    test("does not replace an existing alarm when given a different schedule", async () => {
        harness.configurable.active.alarms.get.setResult(alarm);

        await expect(createAlarmIfNotExists("sync", {periodInMinutes: 10})).resolves.toBe(false);

        expect(harness.configurable.active.alarms.create.calls).toHaveLength(0);
    });

    test("propagates lookup errors without attempting creation", async () => {
        harness.configurable.active.alarms.get.failNext(new Error("Alarm lookup failed"));

        await expect(createAlarmIfNotExists("sync", {periodInMinutes: 5})).rejects.toThrow("Alarm lookup failed");

        expect(harness.configurable.active.alarms.create.calls).toHaveLength(0);
    });

    test("propagates creation errors instead of reporting success", async () => {
        harness.configurable.active.alarms.create.failNext(new Error("Alarm creation failed"));

        await expect(createAlarmIfNotExists("sync", {periodInMinutes: 5})).rejects.toThrow("Alarm creation failed");
    });
});

describe("WebKit alarm signatures", () => {
    let native: ReturnType<typeof installNativeApiFixture>["native"];
    let restore: () => void;

    beforeEach(() => {
        const fixture = installNativeApiFixture();
        native = fixture.native;
        restore = fixture.restore;
    });

    afterEach(() => restore());

    test.each(["safari-web-extension", "safari-extension", "webkit-extension"])("creates without a callback in %s", scheme => {
        native.runtime.getURL = path => `${scheme}://fixture/${path}`;

        const create = jest.fn((...args: unknown[]) => {
            expect(args).toHaveLength(2);
        });

        native.alarms = {create};
        const info = {delayInMinutes: 10};

        return expect(createAlarm("sync", info)).resolves.toBeUndefined();
    });

    test("waits for newer WebKit's native Promise and preserves its rejection", async () => {
        let finish!: () => void;

        const pending = new Promise<void>(resolve => {
            finish = resolve;
        });

        native.alarms = {create: jest.fn(() => pending)};
        let settled = false;

        const created = createAlarm("sync", {delayInMinutes: 1}).then(() => {
            settled = true;
        });

        await Promise.resolve();
        expect(settled).toBe(false);
        finish();
        await created;
        native.alarms.create = () => Promise.reject(new Error("Creation denied"));
        await expect(createAlarm("sync", {delayInMinutes: 1})).rejects.toThrow("Creation denied");
    });

    test("returns synchronous creation errors as rejected Promises", async () => {
        native.alarms = {create: () => {
            throw new Error("Invalid schedule");
        }};

        await expect(createAlarm("sync", {delayInMinutes: 1})).rejects.toThrow("Invalid schedule");
    });

    test("a second createAlarmIfNotExists call preserves the stored schedule", async () => {
        const alarms = new Map<string, chrome.alarms.Alarm>();

        const create = jest.fn((name: string, info: chrome.alarms.AlarmCreateInfo) => {
            alarms.set(name, {name, scheduledTime: info.when!, persistAcrossSessions: false});
        });

        native.alarms = {
            create,
            get: (name: string, callback: (value: chrome.alarms.Alarm | null) => void) => callback(alarms.get(name) ?? null),
            getAll: (callback: (values: chrome.alarms.Alarm[]) => void) => callback([...alarms.values()]),
        };

        await expect(getAlarm("sync")).resolves.toBeUndefined();
        await expect(createAlarmIfNotExists("sync", {when: 123456})).resolves.toBe(true);
        await expect(createAlarmIfNotExists("sync", {when: 987654})).resolves.toBe(false);
        expect((await getAllAlarm())[0].scheduledTime).toBe(123456);
        expect(create).toHaveBeenCalledTimes(1);
    });
});

describe("absent native alarms results", () => {
    let native: ReturnType<typeof installNativeApiFixture>["native"];
    let restore: () => void;

    beforeEach(() => {
        const fixture = installNativeApiFixture();
        native = fixture.native;
        restore = fixture.restore;
    });

    afterEach(() => restore());

    test.each(["callback", "promise"])("normalizes an absent result from %s", async mode => {
        const result = (value: unknown) => (...args: unknown[]) => {
            if (mode === "promise") {
                return Promise.resolve(value);
            }

            (args.at(-1) as (value: unknown) => void)(value);
        };

        native.alarms = {get: result(null)};
        await expect(getAlarm("missing")).resolves.toBeUndefined();
    });
});

describe("alarm removal result compatibility", () => {
    let native: ReturnType<typeof installNativeApiFixture>["native"];
    let restore: () => void;
    let stored: Set<string>;

    beforeEach(() => {
        const fixture = installNativeApiFixture();
        native = fixture.native;
        restore = fixture.restore;
        stored = new Set(["existing"]);

        native.alarms = {
            get: jest.fn((name: string, callback: (value: object | null) => void) => callback(stored.has(name) ? {name} : null)),
            getAll: jest.fn((callback: (values: object[]) => void) => callback([...stored].map(name => ({name})))),
            clear: jest.fn((name: string, callback: (result?: boolean) => void) => {
                stored.delete(name); callback();
            }),
            clearAll: jest.fn((callback: (result?: boolean) => void) => {
                stored.clear(); callback();
            }),
        };
    });

    afterEach(() => restore());

    test("legacy WebKit derives clear results from the pre-read", async () => {
        await expect(clearAlarm("existing")).resolves.toBe(true);
        expect(stored.has("existing")).toBe(false);
        await expect(clearAlarm("existing")).resolves.toBe(false);
        stored.add("again");
        await expect(clearAllAlarm()).resolves.toBe(true);
        await expect(clearAllAlarm()).resolves.toBe(false);
    });

    test("a native boolean takes precedence over WebKit's earlier snapshot", async () => {
        native.alarms.clear.mockImplementation((_name: string, callback: (result: boolean) => void) => callback(false));
        await expect(clearAlarm("existing")).resolves.toBe(false);
        expect(native.alarms.get).toHaveBeenCalledTimes(1);
        expect(native.alarms.getAll).not.toHaveBeenCalled();
    });

    test.each(["chrome-extension", "moz-extension"])("%s clearAlarm never performs a pre-read", async scheme => {
        native.runtime.getURL = path => `${scheme}://fixture/${path}`;
        native.alarms.clear.mockImplementation((_name: string, callback: (result: boolean) => void) => callback(true));
        await expect(clearAlarm("existing")).resolves.toBe(true);
        expect(native.alarms.get).not.toHaveBeenCalled();
        expect(native.alarms.getAll).not.toHaveBeenCalled();
    });

    test("unexpected non-WebKit clear results reject", async () => {
        native.runtime.getURL = path => `chrome-extension://fixture/${path}`;

        await expect(clearAlarm("existing"))
            .rejects.toThrow("The alarms.clear API did not return a boolean removal result");

        expect(native.alarms.get).not.toHaveBeenCalled();
    });

    describe.each(["chrome-extension", "moz-extension", "webkit-extension"])("clearAllAlarm in %s", scheme => {
        test.each([true, false, undefined])("ignores native result %s and reads before clearing", async result => {
            native.runtime.getURL = path => `${scheme}://fixture/${path}`;

            native.alarms.clearAll.mockImplementation((callback: (result?: boolean) => void) => {
                stored.clear();
                callback(result);
            });

            await expect(clearAllAlarm()).resolves.toBe(true);
            expect(stored.size).toBe(0);
            await expect(clearAllAlarm()).resolves.toBe(false);
            expect(native.alarms.getAll).toHaveBeenCalledTimes(2);
            expect(native.alarms.getAll.mock.invocationCallOrder[0]).toBeLessThan(native.alarms.clearAll.mock.invocationCallOrder[0]);
            expect(native.alarms.get).not.toHaveBeenCalled();
        });

        test("a read error rejects without clearing", async () => {
            native.runtime.getURL = path => `${scheme}://fixture/${path}`;

            native.alarms.getAll.mockImplementation(() => {
                throw new Error("Lookup denied");
            });

            await expect(clearAllAlarm()).rejects.toThrow("Lookup denied");
            expect(native.alarms.clearAll).not.toHaveBeenCalled();
        });

        test("a deletion error rejects instead of returning the snapshot", async () => {
            native.runtime.getURL = path => `${scheme}://fixture/${path}`;

            native.alarms.clearAll.mockImplementation(() => {
                throw new Error("Removal denied");
            });

            await expect(clearAllAlarm()).rejects.toThrow("Removal denied");
            expect(native.alarms.getAll).toHaveBeenCalledTimes(1);
        });
    });

    test.each(["get", "getAll"])("WebKit %s failures reject before deletion", async method => {
        native.alarms[method].mockImplementation(() => {
            throw new Error("Lookup denied");
        });

        await expect(method === "get" ? clearAlarm("existing") : clearAllAlarm()).rejects.toThrow("Lookup denied");
        expect(native.alarms.clear).not.toHaveBeenCalled();
        expect(native.alarms.clearAll).not.toHaveBeenCalled();
    });

    test("WebKit removal failures are not replaced by the pre-read result", async () => {
        native.alarms.clear.mockImplementation(() => {
            throw new Error("Removal denied");
        });

        await expect(clearAlarm("existing")).rejects.toThrow("Removal denied");
    });
});
