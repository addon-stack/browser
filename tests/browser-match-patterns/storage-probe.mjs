// Self-contained: serialized into the disposable extension and also run against the built kit.
export async function storageProbe(storage) {
    const report = {areas: {}, changes: [], serialization: {}};

    for (const area of ["local", "sync", "session"]) {
        await storage[area].clear();
        await storage[area].set({value: {nested: [1, null, "text"]}});
        report.areas[area] = await storage[area].get({value: false, fallback: 42});
        await storage[area].clear();
    }

    for (const [name, value] of Object.entries({
        date: new Date("2020-01-02T03:04:05.000Z"),
        regexp: /hello/gi,
        function: () => 42,
        undefined,
        nested: {absent: undefined, fn: () => 1, array: [undefined, () => 2, NaN, Infinity]},
        map: new Map([["key", 1]]),
    })) {
        try {
            await storage.local.set({[name]: value});
            report.serialization[name] = await storage.local.get(name);
        } catch {
            report.serialization[name] = "rejected";
        }
    }

    await storage.local.clear();
    let finish;

    const finished = new Promise(resolve => {
        finish = resolve;
    });

    const listener = (changes, area) => {
        if (area !== "local") return;

        // Ignore delayed cleanup events from the earlier serialization probes. Event/Promise ordering is not asserted.
        const selected = Object.fromEntries(Object.entries(changes).filter(([key]) => key === "key" || key === "done"));

        if (Object.keys(selected).length > 0) report.changes.push(selected);

        if (changes.done) finish();
    };

    storage.onChanged.addListener(listener);

    try {
        await storage.local.set({key: {b: 2, a: 1}});
        await storage.local.set({key: {a: 1, b: 2}});
        await storage.local.set({key: 3});
        await storage.local.remove(["key", "missing"]);
        await storage.local.set({done: true});
        await finished;
    } finally {
        storage.onChanged.removeListener(listener);
    }

    await storage.local.clear();
    await storage.local.set({ключ: "😀"});
    report.bytes = await storage.local.getBytesInUse();

    return report;
}
