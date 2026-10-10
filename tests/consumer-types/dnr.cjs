const assert = require("node:assert/strict");

async function main() {
    const api = process.argv[2] === "esm" ? await import("@addon-core/browser") : require("@addon-core/browser");
    assert.equal(api.isAvailableDnr(), false);
    const rules = [{id: 1, action: {type: "block"}, condition: {urlFilter: "example.test"}}];
    const listeners = new Set();

    globalThis.chrome = {runtime: {}, declarativeNetRequest: {
        getDynamicRules(callback) {
            callback(rules);
        },
        onRuleMatchedDebug: {
            addListener: listener => listeners.add(listener),
            removeListener: listener => listeners.delete(listener),
        },
    }};

    try {
        assert.equal(api.isAvailableDnr(), true);
        assert.equal(await api.getDnrDynamicRules(), rules);
        const info = {rule: {ruleId: 1, rulesetId: "_dynamic"}, request: {url: "https://example.test/"}};
        const received = [];
        const off = api.onDnrRuleMatchedDebug(value => received.push(value));
        assert.equal(listeners.size, 1);
        [...listeners][0](info);
        assert.equal(received[0], info);
        off();
        assert.equal(listeners.size, 0);
    } finally {
        delete globalThis.chrome;
    }
}

main().catch(error => {
    console.error(error); process.exitCode = 1;
});
