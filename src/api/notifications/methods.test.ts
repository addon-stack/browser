import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {
    clearAllNotifications,
    clearNotification,
    createNotification,
    getAllNotifications,
    getNotificationPermissionLevel,
    updateNotification,
} from "./methods";

describe.each(["chrome", "firefox"] as const)("notification methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each([undefined, "", "notification-1"])("createNotification merges defaults and selects the overload for ID %s", async id => {
        const method = harness.configurable.active.notifications.create;
        const options = {title: "Title", priority: 1};
        const finalOptions = {type: "basic", title: "Title", message: "", iconUrl: "", priority: 1};
        method.setResult("native-id");
        await expect(createNotification(options, id)).resolves.toBe("native-id");
        expect(method.calls[0].args).toEqual(id ? [id, finalOptions] : [finalOptions]);
        expect(options).toEqual({title: "Title", priority: 1});
    });

    test("read, update and clear wrappers preserve native arguments and results", async () => {
        const native = harness.configurable.active.notifications;
        const notifications = {"notification-1": true} as const;
        const options = {message: "Updated"};
        native.getAll.setResult(notifications);
        native.getPermissionLevel.setResult("denied");
        native.update.setResult(true);
        native.clear.setResult(false);
        await expect(getAllNotifications()).resolves.toBe(notifications);
        await expect(getNotificationPermissionLevel()).resolves.toBe("denied");
        await expect(updateNotification(options, "notification-1")).resolves.toBe(true);
        await expect(clearNotification("missing")).resolves.toBe(false);
        expect(native.getAll.calls[0].args).toEqual([]);
        expect(native.getPermissionLevel.calls[0].args).toEqual([]);
        expect(native.update.calls[0].args).toEqual(["notification-1", options]);
        expect(native.update.calls[0].args[1]).toBe(options);
        expect(native.clear.calls[0].args).toEqual(["missing"]);
    });

    test.each([
        ["create", () => createNotification({})],
        ["clear", () => clearNotification("notification-1")],
        ["getAll", () => getAllNotifications()],
        ["getPermissionLevel", () => getNotificationPermissionLevel()],
        ["update", () => updateNotification({}, "notification-1")],
    ] as const)("%s propagates native errors", async (name, invoke) => {
        const error = new Error("Notifications access denied");
        harness.configurable.active.notifications[name].failNext(error);
        await expect(invoke()).rejects.toThrow(error.message);
    });

    test("clearAllNotifications clears each returned ID and awaits completion", async () => {
        const native = harness.configurable.active.notifications;
        native.getAll.setResult({first: true, second: true});
        const callbacks: Array<(result: boolean) => void> = [];

        native.clear.setImplementation(async (_id: string, callback?: (result: boolean) => void) => {
            const result = await new Promise<boolean>(resolve => callbacks.push(resolve));
            callback?.(result);

            return result;
        });

        let completed = false;

        const result = (async () => {
            await clearAllNotifications();
            completed = true;
        })();

        await Promise.resolve();
        await Promise.resolve();
        expect(native.clear.calls.map(call => call.args)).toEqual([["first"], ["second"]]);
        expect(completed).toBe(false);
        callbacks[0](true);
        await Promise.resolve();
        expect(completed).toBe(false);
        callbacks[1](true);
        await expect(result).resolves.toBeUndefined();
    });

    test("clearAllNotifications handles an empty list", async () => {
        const native = harness.configurable.active.notifications;
        native.getAll.setResult({});
        await expect(clearAllNotifications()).resolves.toBeUndefined();
        expect(native.clear.calls).toHaveLength(0);
    });

    test.each(["getAll", "clear"] as const)("clearAllNotifications propagates %s errors", async name => {
        const native = harness.configurable.active.notifications;
        native.getAll.setResult({first: true});
        native[name].failNext(new Error("Cannot clear notifications"));
        await expect(clearAllNotifications()).rejects.toThrow("Cannot clear notifications");
    });
});
