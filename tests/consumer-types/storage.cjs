const assert = require("node:assert/strict");

// The actual published consumer is ESM-only; this function also exercises the CJS kit entrypoint.
module.exports = async function checkStorage(testing, environment = "simulate") {
    const {Storage, MonoStorage} = await import("@addon-core/storage");

    for (const profile of ["chrome", "firefox"]) {
        const harness = testing.createBrowserHarness({storage: {managed: {policy: "required"}}});
        const restore = testing.installBrowserGlobals(harness, {profile, environment});
        const subscriptions = [];

        // A serial scenario needs no competing lock owners. Web Locks are consumer infrastructure,
        // not a browser-test-kit capability. Never patch navigator.locks for this check.
        const locker = {async request(_name, task) {
            return await task();
        }};

        try {
            for (const area of ["local", "sync", "session"]) {
                const store = new Storage({area, namespace: "app", locker});
                const other = new Storage({area, namespace: "other", locker});
                await other.set("keep", true);
                const changes = [];
                let resolveChange;

                const changed = new Promise(resolve => {
                    resolveChange = resolve;
                });

                const unsubscribe = store.subscribe(change => {
                    changes.push(change); resolveChange();
                });

                subscriptions.push(unsubscribe);
                await store.set("count", 1);
                await changed;
                assert.deepEqual(changes[0], {count: {oldValue: undefined, newValue: 1}});
                assert.equal(await store.get("count"), 1);
                assert.deepEqual(await store.get(["count", "missing"]), {count: 1});
                assert.deepEqual(await store.getAll(), {count: 1});
                assert.deepEqual(await other.getAll(), {keep: true});
                assert.equal(await store.update("count", value => value + 1), 2);
                let resolveWatch;

                const watched = new Promise(resolve => {
                    resolveWatch = resolve;
                });

                const unwatch = store.watch({count: (value, old) => {
                    resolveWatch([value, old]);
                }});

                subscriptions.push(unwatch);
                await store.set("count", 3);
                assert.deepEqual(await watched, [3, 2]);
                unwatch();
                unsubscribe();
                const observed = changes.length;
                await store.remove("count");
                assert.equal(await store.get("count"), undefined);
                await store.set({a: 1, b: 2});
                await store.clear();
                assert.deepEqual(await store.getAll(), {});
                assert.deepEqual(await other.getAll(), {keep: true});
                assert.equal(changes.length, observed);
                harness.storage[area].get.failNext(new Error("read unavailable"));
                // Locks in the published 0.7.0 consumer defect: getStoredItems enumerates the undefined
                // error result before invoking callWithPromise's lastError-checking callback.
                // Do not disguise it by supplying a successful-looking {} from the fake.
                await assert.rejects(store.get("count"), {name: "TypeError", message: "Cannot convert undefined or null to object"});
                harness.storage[area].set.failNext(new Error("write unavailable"));
                await assert.rejects(store.set("count", 4), /write unavailable/);
                assert.equal(harness.chrome.runtime.lastError, undefined);
            }

            const mono = new MonoStorage("bucket", new Storage({locker}));
            await mono.set({a: 1, b: 2});
            assert.deepEqual(await mono.getAll(), {a: 1, b: 2});
            await mono.remove("a");
            assert.deepEqual(await mono.getAll(), {b: 2});
            await mono.clear();
            assert.deepEqual(await mono.getAll(), {});
            const policy = new Storage({area: "managed", locker});
            assert.equal(await policy.get("policy"), "required");
            await assert.rejects(policy.set("policy", "optional"), /read-only/);
            await harness.storage.flushChanges();
            harness.reset();
            assert.deepEqual(await new Storage({locker}).getAll(), {});
            assert.equal(await policy.get("policy"), "required");
            assert.equal(harness.storage.onChanged.listenerCount(), 0);
        } finally {
            subscriptions.forEach(unsubscribe => unsubscribe());
            harness.reset();
            restore();
        }
    }
};
