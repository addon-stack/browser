const assert = require("node:assert/strict");

(async () => {
    const api = process.argv[2] === "esm" ? await import("@addon-core/browser") : require("@addon-core/browser");
    assert.equal(api.isAvailableTopSites(), false);
    await assert.rejects(api.getTopSites(), /WebExtension API not available/);
    const sites = [{url: "https://example.test/", title: "Example", favicon: null, type: "url"}];

    globalThis.chrome = {runtime: {}, topSites: {get(callback) {
        assert.equal(this, globalThis.chrome.topSites);
        assert.equal(typeof callback, "function");
        callback(sites);
    }}};

    assert.equal(api.isAvailableTopSites(), true);
    assert.equal(await api.getTopSites(), sites);
    assert.equal(await api.getTopSites(undefined), sites);
    const options = {limit: 1, includeFavicon: true};

    globalThis.browser = {runtime: {id: "firefox"}, topSites: {async get(...args) {
        assert.equal(this, globalThis.browser.topSites);
        assert.deepEqual(args, [options]);

        return sites;
    }}};

    assert.equal(await api.getTopSites(options), sites);
    const failure = new Error("Access denied");

    globalThis.browser.topSites.get = async () => {
        throw failure;
    };

    await assert.rejects(api.getTopSites(options), error => error === failure);
    delete globalThis.browser.topSites;
    assert.equal(api.isAvailableTopSites(), false);
    await assert.rejects(api.getTopSites(), TypeError);
    console.log(`Verified ${process.argv[2]} topSites methods from the installed package.`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
