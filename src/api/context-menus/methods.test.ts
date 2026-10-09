import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {createContextMenus, createOrUpdateContextMenu, removeAllContextMenus, removeContextMenus, updateContextMenus} from "./methods";

describe.each(["chrome", "firefox"] as const)("contextMenus methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const native = harness.configurable.active.contextMenus;
        native.create.setResult("native-menu-id");
        native.update.setResult(undefined);
        native.remove.setResult(undefined);
        native.removeAll.setResult(undefined);
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("create and update preserve properties and normalize omitted options", async () => {
        const native = harness.configurable.active.contextMenus;
        const properties = {title: "Open", enabled: false};
        await expect(createContextMenus(properties)).resolves.toBeUndefined();
        await createContextMenus();
        await expect(updateContextMenus(7, properties)).resolves.toBeUndefined();
        await updateContextMenus("item");
        expect(native.create.calls.map(call => call.args)).toEqual([[properties], [{}]]);
        expect(native.update.calls.map(call => call.args)).toEqual([[7, properties], ["item", {}]]);
        expect(native.create.calls[0].args[0]).toBe(properties);
        expect(native.update.calls[0].args[1]).toBe(properties);
    });

    test("remove accepts both ID types and removeAll sends no arguments", async () => {
        const native = harness.configurable.active.contextMenus;
        await expect(removeContextMenus(7)).resolves.toBeUndefined();
        await removeContextMenus("item");
        await expect(removeAllContextMenus()).resolves.toBeUndefined();
        expect(native.remove.calls.map(call => call.args)).toEqual([[7], ["item"]]);
        expect(native.removeAll.calls[0].args).toEqual([]);
    });

    test("createOrUpdate creates with a string ID without mutating properties", async () => {
        const native = harness.configurable.active.contextMenus;
        const properties = {title: "Open"};
        await expect(createOrUpdateContextMenu(7, properties)).resolves.toBeUndefined();
        expect(native.create.calls[0].args).toEqual([{id: "7", title: "Open"}]);
        expect(native.update.calls).toHaveLength(0);
        expect(properties).toEqual({title: "Open"});
    });

    test("createOrUpdate falls back to update with the original ID after a create failure", async () => {
        const native = harness.configurable.active.contextMenus;
        const properties = {title: "Updated"};
        native.create.failNext(new Error("Duplicate menu ID"));
        await expect(createOrUpdateContextMenu(7, properties)).resolves.toBeUndefined();
        expect(native.update.calls[0].args).toEqual([7, properties]);
        expect(native.update.calls[0].args[1]).toBe(properties);
        expect(native.create.calls[0].sequence).toBeLessThan(native.update.calls[0].sequence);
    });

    test("createOrUpdate propagates a failed update", async () => {
        const native = harness.configurable.active.contextMenus;
        native.create.failNext(new Error("Duplicate menu ID"));
        native.update.failNext(new Error("Menu update denied"));
        await expect(createOrUpdateContextMenu("item", {})).rejects.toThrow("Menu update denied");
    });

    test.each([
        ["create", () => createContextMenus()],
        ["update", () => updateContextMenus("item")],
        ["remove", () => removeContextMenus("item")],
        ["removeAll", () => removeAllContextMenus()],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.configurable.active.contextMenus[name].failNext(new Error("Menu access denied"));
        await expect(invoke()).rejects.toThrow("Menu access denied");
    });
});
