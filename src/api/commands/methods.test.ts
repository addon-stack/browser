import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {getAllCommands} from "./methods";

describe.each(["chrome", "firefox"] as const)("commands methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each([
        {label: "registered commands", commands: [{name: "sync", description: "Sync data", shortcut: "Ctrl+Shift+S"}, {}]},
        {label: "an empty list", commands: []},
    ])("getAllCommands preserves $label and passes no native arguments", async ({commands}) => {
        const method = harness.configurable.active.commands.getAll;
        method.setResult(commands);
        await expect(getAllCommands()).resolves.toBe(commands);
        expect(method.calls).toHaveLength(1);
        expect(method.calls[0].args).toEqual([]);
    });

    test("getAllCommands propagates native errors", async () => {
        harness.configurable.active.commands.getAll.failNext(new Error("Commands unavailable"));
        await expect(getAllCommands()).rejects.toThrow("Commands unavailable");
        expect(harness.runtime.lastError).toBeUndefined();
    });
});
