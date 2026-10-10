import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

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

    test.each([true, false])("clearAllAlarm preserves %s and passes no native arguments", async result => {
        const method = harness.configurable.active.alarms.clearAll;
        method.setResult(result);
        await expect(clearAllAlarm()).resolves.toBe(result);
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
