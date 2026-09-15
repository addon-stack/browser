import {describe, expect, test} from "@jest/globals";
import {executeScript, isAvailableScripting} from "../../../src/scripting";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../../src/testing";

describe("real executeScript wrapper with fake globals", () => {
    test.each(["chrome", "firefox", "safari"] as const)("%s routes through the executor and existing controls", async profile => {
        const harness = createBrowserHarness({tabs: [createTabFixture({id: 5})]});
        harness.contexts.create({kind: "contentScript", tabId: 5, url: "https://page.test/"});
        harness.scripting.setExecutor(({target}) => target.url);
        const restore = installBrowserGlobals(harness, {profile});

        try {
            expect(isAvailableScripting()).toBe(true);
            const results = await executeScript<string>({target: {tabId: 5}, func: () => location.href});
            expect(results[0].result).toBe("https://page.test/");
            expect(harness.scripting.executeScript.calls[0].callbackCalls).toHaveLength(1);
            expect(harness.scripting.executeScript.calls[0].args).toHaveLength(1);
            harness.scripting.executeScript.failNext(new Error("no permission"));
            await expect(executeScript({target: {tabId: 5}, func: () => 1})).rejects.toThrow("no permission");
            expect(harness.runtime.lastError).toBeUndefined();
            harness.capabilities.set("scripting.executeScript", false);
            expect(harness.chrome.scripting.executeScript).toBeUndefined();
            expect(harness.browser.scripting.executeScript).toBeUndefined();
            harness.capabilities.set("scripting.executeScript", true);
            expect((await executeScript({target: {tabId: 5}, func: () => 1}))[0].result).toBe("https://page.test/");
        } finally {
            harness.reset();
            restore();
        }
    });

    test("concurrent requests settle separately, and callback cancellation occurs only once", async () => {
        const harness = createBrowserHarness({tabs: [createTabFixture({id: 5})]});
        const document = harness.contexts.documents.create({tabId: 5, url: "https://page.test/"});
        const finish: ((value: unknown) => void)[] = [];

        harness.scripting.setExecutor(() => new Promise(resolve => {
            finish.push(resolve);
        }));

        const restore = installBrowserGlobals(harness);

        try {
            const first = executeScript({target: {tabId: 5}, func: () => 1});
            const second = executeScript({target: {tabId: 5}, func: () => 2});
            finish[1]("second");
            expect((await second)[0].result).toBe("second");
            expect(harness.scripting.pendingExecutions).toBe(1);
            const rejected = expect(first).rejects.toThrow("scripting.executeScript: target document");
            harness.contexts.documents.remove(document.documentId);
            await rejected;
            finish[0]("ignored late result");
            await Promise.resolve();
            expect(harness.scripting.executeScript.calls.map(call => call.callbackCalls.length)).toEqual([1, 1]);
            expect(harness.runtime.lastError).toBeUndefined();
            expect(harness.scripting.pendingExecutions).toBe(0);
        } finally {
            harness.reset();
            restore();
        }
    });
});
