import assert from "node:assert/strict";

// Rollout detection accepts only two complete contracts, not arbitrary failures or missing fields.
export function checkMessageResponses(scenarios, label) {
    assert.deepEqual(scenarios.map(entry => entry.style), ["promise", "callback"]);
    const mode = scenarios[0].promise.kind === "value" ? "accept" : "ignore";

    for (const entry of scenarios) {
        assert.equal(entry.echo.kind, "value", "Receiver readiness must be established independently of Promise support");
        assert.equal(entry.echo.value.label, label);
        assert.deepEqual(entry["no-argument"], {kind: "null"});
        assert.deepEqual(entry["undefined-response"], {kind: "null"});

        const noResponse = entry.style === "promise" ? {kind: "undefined"}
            : {kind: "error", message: "The message port closed before a response was received."};

        assert.deepEqual(entry.silent, noResponse);
        assert.deepEqual(entry.promise, mode === "accept" ? {kind: "value", value: "from-promise"} : noResponse);
        assert.deepEqual(entry["promise-reject"], mode === "accept" ? {kind: "error", message: "probe promise rejection"} : noResponse);
    }

    return mode;
}
