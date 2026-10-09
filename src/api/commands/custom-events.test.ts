import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../testing";
import {onSpecificCommand, onSpecificCommands} from "./custom-events";

describe.each(["chrome", "firefox"] as const)("specific command listeners in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile, captureListenerErrors: true});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("filters commands, forwards the optional tab, and unsubscribes", async () => {
        const tab = createTabFixture({id: 7});
        const callback = jest.fn<(tab?: chrome.tabs.Tab) => void>();
        const event = harness.configurable.active.commands.onCommand;
        const unsubscribe = onSpecificCommand("sync", callback);

        await event.emit("sync-other", tab);
        await event.emit("Sync", tab);
        await event.emit("", tab);
        expect(callback).not.toHaveBeenCalled();

        await event.emit("sync", tab);
        expect(callback.mock.calls).toEqual([[tab]]);

        await event.emit("sync");
        expect(callback.mock.calls).toEqual([[tab], [undefined]]);

        unsubscribe();
        await event.emit("sync", tab);
        expect(callback).toHaveBeenCalledTimes(2);
        expect(event.listenerCount()).toBe(0);
    });

    test("keeps matching subscriptions independent when one is removed", async () => {
        const event = harness.configurable.active.commands.onCommand;
        const callback = jest.fn();
        const otherCallback = jest.fn();
        const unsubscribe = onSpecificCommand("sync", callback);
        const unsubscribeOther = onSpecificCommand("sync", otherCallback);
        expect(event.registrations().map(registration => registration.args)).toEqual([[], []]);
        unsubscribe();
        unsubscribe();
        await event.emit("sync");
        expect(callback).not.toHaveBeenCalled();
        expect(otherCallback).toHaveBeenCalledWith(undefined);
        unsubscribeOther();
        expect(event.listenerCount()).toBe(0);
    });

    test("returns the callback result and the same Promise through the generated listener", async () => {
        const event = harness.configurable.active.commands.onCommand;
        const result = {handled: true};
        const promise = Promise.resolve(result);

        const callback = jest.fn<(tab?: chrome.tabs.Tab) => unknown>()
            .mockReturnValueOnce(result)
            .mockReturnValueOnce(promise);

        const unsubscribe = onSpecificCommand("sync", callback);
        const listener = event.registrations()[0].listener;
        expect(listener("other")).toBeUndefined();
        expect(callback).not.toHaveBeenCalled();
        expect(listener("sync")).toBe(result);
        expect(listener("sync")).toBe(promise);
        await expect(promise).resolves.toBe(result);
        unsubscribe();
    });

    test("keeps synchronous error handling", async () => {
        const error = new Error("Command listener failed");

        onSpecificCommand("sync", () => {
            throw error;
        });

        await expect(harness.configurable.active.commands.onCommand.emit("sync")).resolves.toBeUndefined();
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "sync"}]);
    });

    test("forwards async listener rejections to the existing wrapper", async () => {
        const error = new Error("Async command listener failed");

        onSpecificCommand("sync", async () => {
            throw error;
        });

        await expect(harness.configurable.active.commands.onCommand.emit("sync")).rejects.toBe(error);
        expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "promise"}]);
    });

    describe("onSpecificCommands", () => {
        test("routes exact names to their handlers, forwards optional tabs, and unsubscribes all handlers", async () => {
            const event = harness.configurable.active.commands.onCommand;
            const tab = createTabFixture({id: 7});
            const otherTab = createTabFixture({id: 8});
            const sync = jest.fn();
            const cleanup = jest.fn();
            const unsubscribe = onSpecificCommands({sync, cleanup});
            expect(event.listenerCount()).toBe(1);
            expect(event.registrations()[0].args).toEqual([]);

            await event.emit("sync-other", tab);
            await event.emit("Sync", tab);
            await event.emit("", tab);
            expect(sync).not.toHaveBeenCalled();
            expect(cleanup).not.toHaveBeenCalled();

            await event.emit("sync", tab);
            expect(sync.mock.calls).toEqual([[tab]]);
            expect(sync.mock.calls[0][0]).toBe(tab);
            expect(cleanup).not.toHaveBeenCalled();
            await event.emit("cleanup", otherTab);
            expect(cleanup.mock.calls).toEqual([[otherTab]]);
            expect(cleanup.mock.calls[0][0]).toBe(otherTab);
            expect(sync).toHaveBeenCalledTimes(1);

            await event.emit("sync");
            await event.emit("cleanup");
            expect(sync.mock.calls).toEqual([[tab], [undefined]]);
            expect(cleanup.mock.calls).toEqual([[otherTab], [undefined]]);

            unsubscribe();
            unsubscribe();
            await event.emit("sync", tab);
            await event.emit("cleanup", otherTab);
            expect(event.listenerCount()).toBe(0);
            expect(sync).toHaveBeenCalledTimes(2);
            expect(cleanup).toHaveBeenCalledTimes(2);
        });

        test("keeps overlapping subscriptions independent", async () => {
            const event = harness.configurable.active.commands.onCommand;
            const callback = jest.fn();
            const otherCallback = jest.fn();
            const unsubscribe = onSpecificCommands({sync: callback});
            const unsubscribeOther = onSpecificCommands({sync: otherCallback});
            expect(event.listenerCount()).toBe(2);
            unsubscribe();
            unsubscribe();
            await event.emit("sync");
            expect(callback).not.toHaveBeenCalled();
            expect(otherCallback).toHaveBeenCalledWith(undefined);
            expect(event.listenerCount()).toBe(1);
            unsubscribeOther();
            expect(event.listenerCount()).toBe(0);
        });

        test("accepts an empty map and ignores Object.prototype members", () => {
            const event = harness.configurable.active.commands.onCommand;
            const unsubscribe = onSpecificCommands({});
            const listener = event.registrations()[0].listener;

            for (const name of ["sync", "constructor", "toString", "__proto__", "hasOwnProperty"]) {
                expect(listener(name)).toBeUndefined();
            }

            expect(harness.listenerErrors.entries).toEqual([]);
            unsubscribe();
            expect(event.listenerCount()).toBe(0);
        });

        test("ignores inherited handlers", async () => {
            const inherited = jest.fn();
            const own = jest.fn();
            const handlers = Object.assign(Object.create({sync: inherited}), {cleanup: own});
            const unsubscribe = onSpecificCommands(handlers);
            await harness.configurable.active.commands.onCommand.emit("sync");
            expect(inherited).not.toHaveBeenCalled();
            await harness.configurable.active.commands.onCommand.emit("cleanup");
            expect(own).toHaveBeenCalledWith(undefined);
            unsubscribe();
        });

        test.each(["ordinary", "null-prototype"])("supports special own names in a %s object", async kind => {
            const event = harness.configurable.active.commands.onCommand;
            const names = ["", "constructor", "toString", "__proto__", "hasOwnProperty"];
            const callbacks = names.map(() => jest.fn());
            const entries = Object.fromEntries(names.map((name, index) => [name, callbacks[index]]));
            const handlers = kind === "ordinary" ? entries : Object.assign(Object.create(null), entries);
            const unsubscribe = onSpecificCommands(handlers);
            const tabs = names.map((_, index) => createTabFixture({id: index + 1}));

            for (const [index, name] of names.entries()) {
                await event.emit(name, tabs[index]);
            }

            callbacks.forEach((callback, index) => {
                expect(callback.mock.calls).toEqual([[tabs[index]]]);
            });

            expect(event.listenerCount()).toBe(1);
            expect(harness.listenerErrors.entries).toEqual([]);
            unsubscribe();
        });

        test("returns the callback result and the original Promise", async () => {
            const event = harness.configurable.active.commands.onCommand;
            const result = {handled: true};
            const promise = Promise.resolve(result);

            const callback = jest.fn<(tab?: chrome.tabs.Tab) => unknown>()
                .mockReturnValueOnce(result)
                .mockReturnValueOnce(promise);

            const unsubscribe = onSpecificCommands({sync: callback});
            const listener = event.registrations()[0].listener;
            expect(listener("other")).toBeUndefined();
            expect(callback).not.toHaveBeenCalled();
            expect(listener("sync")).toBe(result);
            expect(listener("sync")).toBe(promise);
            await expect(promise).resolves.toBe(result);
            unsubscribe();
        });

        test("logs synchronous handler errors and continues handling other commands", async () => {
            const event = harness.configurable.active.commands.onCommand;
            const error = new Error("Mapped command listener failed");
            const cleanup = jest.fn();

            const unsubscribe = onSpecificCommands({
                sync: () => {
                    throw error;
                },
                cleanup,
            });

            await expect(event.emit("sync")).resolves.toBeUndefined();
            expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "sync"}]);
            await event.emit("cleanup");
            expect(cleanup).toHaveBeenCalledTimes(1);
            unsubscribe();
        });

        test("forwards async handler rejections to the existing wrapper", async () => {
            const event = harness.configurable.active.commands.onCommand;
            const error = new Error("Async mapped command listener failed");

            const unsubscribe = onSpecificCommands({
                sync: async () => {
                    throw error;
                },
            });

            await expect(event.emit("sync")).rejects.toBe(error);
            expect(harness.listenerErrors.entries).toEqual([{args: [], error, kind: "promise"}]);
            unsubscribe();
        });
    });
});
