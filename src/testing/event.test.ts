import {describe, expect, jest, test} from "@jest/globals";
import {createBrowserEvent} from "./event";

describe("createBrowserEvent", () => {
    test("preserves listener identity and supports idempotent unsubscribe", async () => {
        const event = createBrowserEvent<[value: string]>();
        const listener = jest.fn();

        event.api.addListener(listener);
        event.api.addListener(listener);

        expect(event.listenerCount()).toBe(1);
        expect(event.api.hasListener(listener)).toBe(true);

        const unsubscribe = event.on(listener);
        unsubscribe();
        unsubscribe();

        expect(event.api.hasListener(listener)).toBe(false);
        await event.emit("ignored");
        expect(listener).not.toHaveBeenCalled();
    });

    test("starts a snapshot of every listener synchronously and awaits async results", async () => {
        const event = createBrowserEvent<[value: number]>();
        const calls: string[] = [];
        let release: (() => void) | undefined;

        event.api.addListener(value => {
            calls.push(`first:${value}`);
            return new Promise<void>(resolve => {
                release = resolve;
            });
        });
        event.api.addListener(value => {
            calls.push(`second:${value}`);
        });

        const emitted = event.emit(2);

        expect(calls).toEqual(["first:2", "second:2"]);

        release?.();
        await emitted;
    });

    test("uses an emission snapshot when listeners change during emission", async () => {
        const event = createBrowserEvent<[]>();
        const second = jest.fn();
        const first = jest.fn(() => event.api.removeListener(second));

        event.api.addListener(first);
        event.api.addListener(second);

        await event.emit();
        await event.emit();

        expect(first).toHaveBeenCalledTimes(2);
        expect(second).toHaveBeenCalledTimes(1);
    });

    test("assimilates arbitrary thenables", async () => {
        const event = createBrowserEvent<[]>();
        const failure = new Error("thenable failed");

        event.api.addListener(() => ({
            // biome-ignore lint/suspicious/noThenProperty: this intentionally models a non-Promise thenable.
            then(_resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
                reject(failure);
            },
        }));

        await expect(event.emit()).rejects.toBe(failure);
    });

    test("runs every listener before rethrowing one failure", async () => {
        const event = createBrowserEvent<[]>();
        const failure = new Error("listener failed");
        const remaining = jest.fn();

        event.api.addListener(() => {
            throw failure;
        });
        event.api.addListener(remaining);

        await expect(event.emit()).rejects.toBe(failure);
        expect(remaining).toHaveBeenCalledTimes(1);
    });

    test("aggregates multiple failures after all listeners settle", async () => {
        const event = createBrowserEvent<[]>();
        const first = new Error("first");
        const second = new Error("second");

        event.api.addListener(() => {
            throw first;
        });
        event.api.addListener(() => Promise.reject(second));

        try {
            await event.emit();
            throw new Error("Expected emit to reject");
        } catch (error) {
            expect(error).toBeInstanceOf(AggregateError);
            expect((error as AggregateError).errors).toEqual([first, second]);
        }
    });

    test("isolates instances and resets listeners", () => {
        const first = createBrowserEvent<[]>();
        const second = createBrowserEvent<[]>();
        const listener = jest.fn();

        first.api.addListener(listener);
        second.api.addListener(listener);
        first.reset();

        expect(first.listenerCount()).toBe(0);
        expect(second.listenerCount()).toBe(1);
    });

    test("records optional registration arguments", () => {
        const event = createBrowserEvent<[value: string], [filter: {url: string}]>();
        const listener = jest.fn();
        const filter = {url: "https://example.com"};

        event.api.addListener(listener, filter);

        expect(event.registrations()).toEqual([{listener, args: [filter]}]);
        expect(Object.isFrozen(event.registrations())).toBe(true);

        event.api.removeListener(listener);
        expect(event.registrations()).toEqual([]);
    });
});
