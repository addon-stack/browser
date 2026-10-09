const assert = require("node:assert/strict");

(async () => {
    const api = process.argv[2] === "esm" ? await import("@addon-core/browser") : require("@addon-core/browser");

    for (const check of [api.isAvailableSearch, api.canQuerySearch, api.canGetSearchEngines, api.canSearchWithEngine]) {
        assert.equal(check(), false);
    }

    assert.equal(await api.hasSearchEngine("Example"), false);

    const calls = [];

    globalThis.chrome = {runtime: {}, search: {query(options, callback) {
        assert.equal(this, globalThis.chrome.search);
        calls.push(options);
        callback();
    }}};

    assert.equal(api.canQuerySearch(), true);
    assert.equal(api.canGetSearchEngines(), false);
    assert.equal(api.canSearchWithEngine(), false);
    await api.querySearch({text: "one"});
    await api.searchInTab("two", 0);
    await api.searchInCurrentTab("three");
    await api.searchInNewTab("four");
    await api.searchInNewWindow("five");

    assert.deepEqual(calls, [
        {text: "one"}, {text: "two", tabId: 0}, {text: "three", disposition: "CURRENT_TAB"},
        {text: "four", disposition: "NEW_TAB"}, {text: "five", disposition: "NEW_WINDOW"},
    ]);

    const engines = [{name: "Example", isDefault: true}];

    globalThis.browser = {runtime: {id: "firefox"}, search: {
        async query() {},
        async get(...args) {
            assert.equal(this, globalThis.browser.search);
            assert.deepEqual(args, []);

            return engines;
        },
        async search(...args) {
            assert.equal(this, globalThis.browser.search);
            assert.deepEqual(args, [{query: "six", engine: "Example", tabId: 0}]);
        },
    }};

    assert.equal(api.canGetSearchEngines(), true);
    assert.equal(api.canSearchWithEngine(), true);
    assert.equal(await api.getSearchEngines(), engines);
    assert.equal(await api.getDefaultSearchEngine(), engines[0]);
    assert.equal(await api.hasSearchEngine("Example"), true);
    await api.searchWithEngine("six", "Example", {tabId: 0});

    globalThis.browser.search.get = async () => {
        throw new Error("Access denied");
    };

    assert.equal(await api.hasSearchEngine("Example"), false);
    await assert.rejects(api.getSearchEngines(), /Access denied/);
    await assert.rejects(api.getDefaultSearchEngine(), /Access denied/);
    delete globalThis.browser.search;
    assert.equal(api.isAvailableSearch(), false);
    assert.equal(api.canQuerySearch(), false);
    await assert.rejects(api.searchInNewTab("seven"), TypeError);
    console.log(`Verified ${process.argv[2]} search methods from the installed package.`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
