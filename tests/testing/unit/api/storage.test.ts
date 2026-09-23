import {describe, expect, test} from "@jest/globals";
import {createBrowserHarness, type StorageQuotaLimits} from "../../../../src/testing";

describe("storage areas", () => {
    test.each(["local", "sync", "session"] as const)("%s implements get variants, updates, remove and clear", async area => {
        const harness = createBrowserHarness({storage: {[area]: {a: 1, nested: {value: 2}}}});
        const api = harness.chrome.storage[area];
        expect(await api.get()).toEqual({a: 1, nested: {value: 2}});
        expect(await api.get(null)).toEqual(await api.get());
        expect(await api.get("a")).toEqual({a: 1});
        expect(await api.get(["a", "missing", "a"])).toEqual({a: 1});
        expect(await api.get({a: 8, fallback: [9]})).toEqual({a: 1, fallback: [9]});
        expect(await api.get([])).toEqual({});
        expect(await api.get({})).toEqual({});
        await api.set({a: 3, b: 4});
        expect(await harness.browser.storage[area].getKeys()).toEqual(["a", "nested", "b"]);
        await api.remove(["a", "missing"]);
        expect(await api.get()).toEqual({nested: {value: 2}, b: 4});
        await api.clear();
        expect(await api.get()).toEqual({});
        await harness.storage.flushChanges();
    });

    test.each(["local", "sync", "session", "managed"] as const)("%s supports callbacks and scopes lastError", async area => {
        const harness = createBrowserHarness({storage: {[area]: {a: 1}}});
        const api = harness.chrome.storage[area];
        let value: unknown;

        expect(api.get(result => {
            value = result;
        })).toBeUndefined();

        expect(value).toEqual({a: 1});

        expect(api.get("a", result => {
            value = result;
        })).toBeUndefined();

        expect(value).toEqual({a: 1});
        harness.storage[area].get.failNext(new Error("read denied"));
        let message: string | undefined;

        api.get(result => {
            value = result;
            message = harness.chrome.runtime.lastError?.message;
            expect(harness.browser.runtime.lastError?.message).toBe(message);
        });

        expect(value).toBeUndefined();
        expect(message).toBe("read denied");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
        harness.storage[area].get.failNext(new Error("promise denied"));
        await expect(api.get()).rejects.toThrow("promise denied");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("callback mutations return no Promise and record no result arguments", () => {
        const harness = createBrowserHarness();
        const api = harness.chrome.storage.local;
        let calls = 0;

        expect(api.set({a: 1}, () => {
            calls++;
        })).toBeUndefined();

        expect(api.remove("a", () => {
            calls++;
        })).toBeUndefined();

        expect(api.clear(() => {
            calls++;
        })).toBeUndefined();

        expect(calls).toBe(3);
        expect(harness.storage.local.set.calls[0].callbackCalls).toEqual([[]]);
        expect(harness.storage.local.set.calls[0].args).toEqual([{a: 1}]);
    });

    test.each(["set", "remove", "clear"] as const)("managed.%s is read-only with both error channels", async method => {
        const harness = createBrowserHarness({storage: {managed: {policy: true}}});

        const invoke = (callback?: () => void): unknown => Reflect.apply(harness.chrome.storage.managed[method], null, [
            ...(method === "set" ? [{policy: false}] : method === "remove" ? ["policy"] : []),
            ...(callback ? [callback] : []),
        ]);

        await expect(invoke()).rejects.toThrow(`storage.managed.${method}: managed storage is read-only`);
        let calls = 0;

        invoke(() => {
            calls++;
            expect(harness.chrome.runtime.lastError?.message).toContain("read-only");
        });

        expect(calls).toBe(1);
        expect(harness.chrome.runtime.lastError).toBeUndefined();
        expect(harness.storage.managed.data).toEqual({policy: true});
    });

    test("does not invoke a throwing callback twice or label it as an API error", () => {
        const harness = createBrowserHarness();
        let calls = 0;

        expect(() => harness.chrome.storage.local.get(() => {
            calls++; throw new Error("consumer");
        })).toThrow("consumer");

        expect(calls).toBe(1);
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("snapshots inputs, outputs, defaults, seeds and event payloads", async () => {
        const seed = {nested: {values: [1]}};
        const harness = createBrowserHarness({storage: {local: seed}});
        seed.nested.values.push(2);
        const input = {value: {array: [3]}};
        const written = harness.chrome.storage.local.set(input);
        input.value.array.push(4);
        await written;
        const output = await harness.chrome.storage.local.get<{value: {array: number[]}}>();
        output.value.array.push(5);
        const data = harness.storage.local.data;
        delete data.value;
        const fallback = {missing: {value: [6]}};
        const defaults = await harness.chrome.storage.local.get(fallback);
        expect(defaults.missing).not.toBe(fallback.missing);

        harness.storage.local.onChanged.on(changes => {
            (changes.value.newValue as {array: number[]}).array.push(99);
        });

        await harness.chrome.storage.local.set({value: {array: [7]}});
        await harness.storage.flushChanges();
        expect(await harness.chrome.storage.local.get()).toEqual({nested: {values: [1]}, value: {array: [7]}});
        harness.reset();
        expect(harness.storage.local.data).toEqual({nested: {values: [1]}});
    });

    test("isolates areas and harnesses; facades share state but not capability containers", async () => {
        const one = createBrowserHarness();
        const two = createBrowserHarness();
        await one.chrome.storage.local.set({key: 1});
        expect(await one.browser.storage.local.get()).toEqual({key: 1});

        for (const area of ["sync", "session", "managed"] as const) expect(await one.chrome.storage[area].get()).toEqual({});

        expect(await two.chrome.storage.local.get()).toEqual({});
        expect(one.chrome.storage.local).not.toBe(one.browser.storage.local);
        one.capabilities.set("storage.local.get", false);
        expect(one.capabilities.has("storage.local.get")).toBe(false);
        expect("get" in one.chrome.storage.local).toBe(false);
        expect("get" in one.browser.storage.local).toBe(false);
        one.capabilities.set("storage.local.get", true);
        expect(await one.browser.storage.local.get()).toEqual({key: 1});
        one.capabilities.set("storage.local.get", false);
        one.reset();
        expect(await one.chrome.storage.local.get()).toEqual({});
    });

    test("uses existing controls without mutating data on failures or configured results", async () => {
        const harness = createBrowserHarness({storage: {local: {seed: true}}});
        harness.storage.local.set.failNext(new Error("disk unavailable"));
        await expect(harness.chrome.storage.local.set({a: 1})).rejects.toThrow("disk unavailable");
        harness.storage.local.set.setResult(undefined);
        await harness.chrome.storage.local.set({a: 2});
        expect(harness.storage.local.data).toEqual({seed: true});
        harness.storage.local.get.queueResult({queued: 1}, {queued: 2});
        expect(await harness.browser.storage.local.get()).toEqual({queued: 1});
        expect(await harness.chrome.storage.local.get()).toEqual({queued: 2});
        harness.storage.local.get.setImplementation(createBrowserHarness({storage: {local: {custom: true}}}).chrome.storage.local.get);
        expect(await harness.chrome.storage.local.get()).toEqual({custom: true});

        expect(harness.calls.map(call => call.api)).toEqual([
            "storage.local.set", "storage.local.set", "storage.local.get", "storage.local.get", "storage.local.get",
        ]);

        harness.reset();
        expect(harness.calls).toEqual([]);
        expect(await harness.chrome.storage.local.get()).toEqual({seed: true});
    });
});

describe("storage codec and quotas", () => {
    test("models the Chromium enumerable-value subset without toJSON", async () => {
        const harness = createBrowserHarness();
        const api = harness.chrome.storage.local;

        await api.set({date: new Date("2020-01-01Z"), regexp: /x/g, map: new Map(), omitted: undefined, fn: () => 3,
            value: {toJSON() {
                throw new Error("must not execute");
            }, array: [undefined, () => 1, NaN, Infinity]},
        });

        expect(await api.get()).toEqual({date: {}, regexp: {}, map: {}, value: {array: [null, null, null, null]}});
        await api.set({key: 1});
        await api.set({key: undefined});
        expect(await api.get("key")).toEqual({key: 1});
    });

    test("handles prototype-sensitive keys without prototype pollution", async () => {
        const harness = createBrowserHarness();
        const data = JSON.parse('{"__proto__":{"safe":1},"constructor":2,"toString":3}');
        await harness.chrome.storage.local.set(data);
        expect(await harness.chrome.storage.local.get()).toEqual(data);
        await harness.chrome.storage.local.remove("__proto__");
        expect(Object.hasOwn(harness.storage.local.data, "__proto__")).toBe(false);
        expect(Object.getPrototypeOf(harness.storage.local.data)).toBe(Object.prototype);
    });

    test.each(["bigint", "cycle", "accessor", "depth"])("rejects %s atomically with the API name", async kind => {
        const harness = createBrowserHarness({storage: {local: {safe: true}}});
        const value: Record<string, unknown> = {};

        if (kind === "bigint") value.bad = 1n;

        if (kind === "cycle") value.bad = value;

        if (kind === "accessor") Object.defineProperty(value, "bad", {enumerable: true, get() {
            throw new Error("do not execute");
        }});

        if (kind === "depth") {
            let nested = value;

            for (let index = 0; index < 102; index++) {
                const next = {}; nested.next = next; nested = next;
            }
        }

        await expect(harness.chrome.storage.local.set({valid: 1, value})).rejects.toThrow("storage.local.set:");
        expect(harness.storage.local.data).toEqual({safe: true});
    });

    test.each([42, [1], true])("rejects invalid key selector %p", async keys => {
        const harness = createBrowserHarness();
        await expect(Reflect.apply(harness.chrome.storage.local.get, null, [keys])).rejects.toThrow("storage.local.get:");
        await expect(Reflect.apply(harness.chrome.storage.local.remove, null, [keys])).rejects.toThrow("storage.local.remove:");
    });

    test.each([null, [], 1])("rejects invalid set dictionary %p", async values => {
        const harness = createBrowserHarness();
        await expect(Reflect.apply(harness.chrome.storage.local.set, null, [values])).rejects.toThrow("storage.local.set:");
    });

    test.each([
        [{maxBytes: 3}, "QUOTA_BYTES"],
        [{maxBytesPerItem: 3}, "QUOTA_BYTES_PER_ITEM"],
        [{maxItems: 0}, "MAX_ITEMS"],
    ] as const)("enforces atomic quota %p", async (limits: StorageQuotaLimits, error: string) => {
        const harness = createBrowserHarness({storage: {quotas: {local: limits}}});
        await expect(harness.chrome.storage.local.set({a: "abc"})).rejects.toThrow(error);
        expect(harness.storage.local.data).toEqual({});
        let message: string | undefined;

        harness.chrome.storage.local.set({a: "abc"}, () => {
            message = harness.chrome.runtime.lastError?.message;
        });

        expect(message).toContain(error);
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("counts UTF-8 bytes, deduplicates keys and frees quota on replacement/removal", async () => {
        const harness = createBrowserHarness({storage: {quotas: {local: {maxBytes: 14}}}});
        const api = harness.chrome.storage.local;
        await api.set({ключ: "😀"});
        expect(await api.getBytesInUse()).toBe(14);
        expect(await api.getBytesInUse(["ключ", "ключ"])).toBe(14);
        expect(await api.getBytesInUse([])).toBe(0);
        await expect(api.set({x: 1})).rejects.toThrow("QUOTA_BYTES");
        await api.set({ключ: 0});
        await api.set({x: 1});
        await api.remove("ключ");
        expect(await api.getBytesInUse()).toBe(2);
    });

    test("applies sync defaults, permits explicit opt-out, leaves memory estimates configurable", async () => {
        const harness = createBrowserHarness();
        await expect(harness.chrome.storage.sync.set({large: "x".repeat(8192)})).rejects.toThrow("QUOTA_BYTES_PER_ITEM");
        const unlimited = createBrowserHarness({storage: {quotas: {sync: false}}});
        await unlimited.chrome.storage.sync.set({large: "x".repeat(8192)});
        await expect(harness.chrome.storage.session.getBytesInUse()).rejects.toThrow("storage.session.getBytesInUse");
        harness.storage.session.getBytesInUse.setResult(50);
        expect(await harness.chrome.storage.session.getBytesInUse()).toBe(50);
        expect(() => createBrowserHarness({storage: {quotas: {sync: {maxBytes: -1}}}})).toThrow("invalid quota");
        expect(() => createBrowserHarness({storage: {sync: {large: "x".repeat(8192)}}})).toThrow("fixtures");
    });

    test("enforces the default sync item count and total quota without partial writes", async () => {
        const harness = createBrowserHarness();
        const changes: unknown[] = [];

        harness.storage.onChanged.on(change => {
            changes.push(change);
        });

        await expect(harness.chrome.storage.sync.set(Object.fromEntries(
            Array.from({length: 513}, (_, index) => [String(index), 1])
        ))).rejects.toThrow("MAX_ITEMS");

        await expect(harness.chrome.storage.sync.set(Object.fromEntries(
            Array.from({length: 103}, (_, index) => [String(index), "x".repeat(1000)])
        ))).rejects.toThrow("QUOTA_BYTES");

        expect(harness.storage.sync.data).toEqual({});
        await harness.storage.flushChanges();
        expect(changes).toEqual([]);
    });
});

describe("automatic storage events", () => {
    test("emits accurate changes only for changed keys; global and area payloads are detached", async () => {
        const harness = createBrowserHarness();
        const events: unknown[] = [];
        const local: unknown[] = [];

        const unsubscribe = harness.storage.onChanged.on((changes, area) => {
            events.push([changes, area]);
        });

        harness.storage.local.onChanged.on(changes => {
            local.push(changes);
        });

        const api = harness.chrome.storage.local;
        await api.set({a: {x: 1, y: 2}});
        await api.set({a: {y: 2, x: 1}});
        await api.set({a: 2, b: 3});
        await api.remove(["a", "missing"]);
        await api.clear();
        await api.clear();
        await harness.storage.flushChanges();

        expect(events).toEqual([
            [{a: {newValue: {x: 1, y: 2}}}, "local"],
            [{a: {oldValue: {x: 1, y: 2}, newValue: 2}, b: {newValue: 3}}, "local"],
            [{a: {oldValue: 2}}, "local"], [{b: {oldValue: 3}}, "local"],
        ]);

        expect(local[0]).not.toBe((events[0] as unknown[])[0]);
        unsubscribe();
        unsubscribe();
        await api.set({a: 1});
        expect(events).toHaveLength(4);
    });

    test("writes do not wait on listeners; flush observes async errors and reentrant writes", async () => {
        const harness = createBrowserHarness();
        const errors = [new Error("sync"), new Error("async")];

        harness.storage.local.onChanged.on(() => {
            throw errors[0];
        });

        harness.storage.onChanged.on(async (_, area) => {
            if (area === "local") await harness.chrome.storage.sync.set({nested: 1});

            throw errors[1];
        });

        await harness.chrome.storage.local.set({a: 1});
        await expect(harness.storage.flushChanges()).rejects.toBeInstanceOf(AggregateError);
        expect(harness.storage.sync.data).toEqual({nested: 1});
        expect(harness.storage.local.data).toEqual({a: 1});
        await harness.storage.flushChanges();
    });

    test("reset cancels pending drains, removes subscriptions and ignores late listener failures", async () => {
        const harness = createBrowserHarness({storage: {managed: {policy: 1}}});
        let fail: (error: Error) => void = () => undefined;

        harness.storage.onChanged.on(() => new Promise((_, reject) => {
            fail = reject;
        }));

        await harness.chrome.storage.local.set({a: 1});
        const pending = harness.storage.flushChanges();
        const rejected = expect(pending).rejects.toThrow("storage.flushChanges: harness reset");
        harness.reset();
        await rejected;
        fail(new Error("late"));
        await harness.storage.flushChanges();
        expect(harness.storage.onChanged.listenerCount()).toBe(0);
        expect(harness.storage.local.onChanged.listenerCount()).toBe(0);
        expect(harness.storage.local.data).toEqual({});
        expect(harness.storage.managed.data).toEqual({policy: 1});
    });

    test("reset from an area listener prevents the stale global dispatch", async () => {
        const harness = createBrowserHarness();
        const events: unknown[] = [];

        harness.storage.local.onChanged.on(() => {
            harness.reset();

            harness.storage.onChanged.on(changes => {
                events.push(changes);
            });
        });

        await harness.chrome.storage.local.set({old: true});
        await harness.storage.flushChanges();
        expect(events).toEqual([]);
    });
});
