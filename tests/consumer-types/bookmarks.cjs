const assert = require("node:assert/strict");

async function main() {
    const api = process.argv[2] === "esm" ? await import("@addon-core/browser") : require("@addon-core/browser");
    assert.equal(api.isAvailableBookmarks(), false);
    const nodes = [{id: "node", title: "Example", type: "bookmark", syncing: false}];
    const listeners = new Set();
    const calls = [];

    globalThis.chrome = {runtime: {}, bookmarks: {
        get(ids, callback) {
            calls.push(ids);
            callback(nodes);
        },
        onCreated: {
            addListener: listener => listeners.add(listener),
            removeListener: listener => listeners.delete(listener),
        },
    }};

    try {
        assert.equal(api.isAvailableBookmarks(), true);
        assert.equal(await api.getBookmarks("node"), nodes);
        assert.deepEqual(calls, ["node"]);
        const events = [];
        const off = api.onBookmarkCreated((...args) => events.push(args));
        assert.equal(listeners.size, 1);
        [...listeners][0]("node", nodes[0]);
        assert.deepEqual(events, [["node", nodes[0]]]);
        off();
        assert.equal(listeners.size, 0);
    } finally {
        delete globalThis.chrome;
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
