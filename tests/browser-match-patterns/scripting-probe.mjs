// Serialized into the extension worker. Also used with an explicit metadata-only fake executor in Node.
export async function scriptingTargetsProbe(api, tabId, frames) {
    const child = frames.find(frame => frame.frameId !== 0);

    if (!child) throw new Error("Scripting probe requires a loaded child frame");

    const entries = [];

    const call = (injection, style) => style === "promise" ? api.scripting.executeScript(injection) : new Promise((resolve, reject) => {
        api.scripting.executeScript(injection, results => {
            if (api.runtime.lastError) reject(new Error(api.runtime.lastError.message));
            else resolve(results);
        });
    });

    for (const style of ["promise", "callback"]) {
        const targets = [
            {tabId},
            {tabId, allFrames: true},
            {tabId, frameIds: [child.frameId]},
            {tabId, documentIds: [child.documentId]},
            {tabId, frameIds: [child.frameId, 0, child.frameId]},
        ];

        for (const target of targets) {
            const results = await call({target, func: input => ({url: globalThis.location.href, input}), args: ["probe"]}, style);
            const includesMain = results.some(result => result.frameId === 0);

            if (includesMain && results[0].frameId !== 0) throw new Error("Main frame result must come first");

            entries.push({style, target, results: [...results].sort((a, b) => a.frameId - b.frameId)});
        }

        for (const target of [
            {tabId, frameIds: [2147483647]},
            {tabId, allFrames: true, frameIds: [0]},
        ]) {
            let failed = false;

            try {
                await call({target, func: () => 1}, style);
            } catch {
                failed = true;
            }

            if (!failed) throw new Error(`Scripting accepted invalid target ${JSON.stringify(target)}`);

            entries.push({style, target, failed});
        }
    }

    return entries;
}

// Execution failures are distinct from invalid targets. Do not compare these with a throwing custom adapter.
export async function scriptingOutcomesProbe(api, tabId) {
    const cases = [
        ["throw-child", () => {
            if (globalThis.location.pathname === "/frame") throw new Error("SCRIPT_CHILD_BOOM");

            return "main-ok";
        }],
        ["reject-child", async () => {
            if (globalThis.location.pathname === "/frame") throw new Error("SCRIPT_CHILD_REJECT");

            return "main-ok";
        }],
        ["body", () => globalThis.document.body],
        ["cycle", () => {
            const value = {}; value.self = value;

            return value;
        }],
        ["bigint", () => 1n],
        ["void", () => {}],
        ["undefined", () => undefined],
        ["date", () => new Date("2020-01-02T03:04:05.000Z")],
        ["regexp", () => /probe/gi],
        ["branded-properties", () => ({
            date: Object.assign(new Date("2020-01-02T03:04:05.000Z"), {note: "date"}),
            regexp: Object.assign(/probe/gi, {note: "regexp"}),
            invalidDate: new Date(NaN),
        })],
    ];

    const entries = [];

    for (const style of ["promise", "callback"]) {
        for (const [scenario, func] of cases) {
            const injection = {target: {tabId, allFrames: true}, func};

            const result = style === "promise"
                ? {results: await api.scripting.executeScript(injection), lastError: api.runtime.lastError?.message ?? null}
                : await new Promise(resolve => {
                    api.scripting.executeScript(injection, results => {
                        resolve({results, lastError: api.runtime.lastError?.message ?? null});
                    });
                });

            entries.push({
                style, scenario, lastError: result.lastError,
                results: result.results?.map(value => ({...value, hasResult: Object.hasOwn(value, "result")})).sort((a, b) => a.frameId - b.frameId),
            });
        }
    }

    return entries;
}
