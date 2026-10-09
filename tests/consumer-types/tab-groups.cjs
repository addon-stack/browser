const assert = require("node:assert/strict");

async function main() {
    const api = process.argv[2] === "esm" ? await import("@addon-core/browser") : require("@addon-core/browser");
    assert.equal(api.isAvailableTabGroups(), false);
    const group = {id: 7, windowId: 1, color: "blue", collapsed: false};
    const listeners = new Set();

    const onRemoved = {
        addListener: listener => listeners.add(listener),
        removeListener: listener => listeners.delete(listener),
    };

    globalThis.chrome = {runtime: {id: "chromium"}, tabGroups: {
        get(id, callback) {
            assert.equal(id, 7);
            callback(group);
        },
        onRemoved,
    }, tabs: {
        ungroup(ids, callback) {
            assert.equal(this, globalThis.chrome.tabs);
            assert.deepEqual(ids, [7, 8]);
            callback();
        },
    }};

    try {
        assert.equal(api.isAvailableTabGroups(), true);
        assert.equal(await api.getTabGroup(7), group);
        assert.equal(await api.ungroupTab([7, 8]), undefined);
        globalThis.browser = globalThis.chrome;
        assert.equal(await api.ungroupTab([7, 8]), undefined);
        const received = [];
        const off = api.onTabGroupRemoved((...args) => received.push(args));
        [...listeners][0](group);
        assert.deepEqual(received, [[group]]);
        off();
        assert.equal(listeners.size, 0);

        globalThis.browser = {runtime: {id: "firefox", getBrowserInfo() {
            throw new Error("Namespace selection must not call getBrowserInfo");
        }}, tabGroups: {get: async () => group, onRemoved}, tabs: {
            async ungroup(...args) {
                assert.equal(args.length, 1);
                assert.equal(this, globalThis.browser.tabs);
                assert.deepEqual(args[0], [7, 8]);
            },
        }};

        assert.equal(await api.getTabGroup(7), group);
        assert.equal(await api.ungroupTab([7, 8]), undefined);
        const offFirefox = api.onTabGroupRemoved((...args) => received.push(args));
        const info = {isWindowClosing: true};
        [...listeners][0](group, info);
        assert.equal(received[1][0], group);
        assert.equal(received[1][1], info);
        offFirefox();
        assert.equal(listeners.size, 0);
        globalThis.chrome = globalThis.browser;
        assert.equal(await api.ungroupTab([7, 8]), undefined);
    } finally {
        delete globalThis.chrome;
        delete globalThis.browser;
    }
}

main().catch(error => {
    console.error(error); process.exitCode = 1;
});
