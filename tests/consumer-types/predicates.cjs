const assert = require("node:assert/strict");

(async () => {
    const format = process.argv[2];
    const api = format === "esm" ? await import("@addon-core/browser") : require("@addon-core/browser");
    const testing = format === "esm" ? await import("@addon-core/browser/testing") : require("@addon-core/browser/testing");

    assert.deepEqual(api.SidebarState, {Open: "open", Closed: "closed", Unknown: "unknown"});

    for (const probe of [
        api.isBackground, api.isManifestVersion3, api.isOpenSidebar,
        () => api.isDownloadExists(41), () => api.hasOffscreenUrl("offscreen.html"),
        () => api.hasOffscreenPath("offscreen.html"),
    ]) {
        assert.equal(await probe(), false);
    }

    assert.equal(await api.getSidebarState(), api.SidebarState.Unknown);
    await assert.rejects(api.hasOffscreen());

    for (const profile of ["chrome", "firefox"]) {
        const harness = testing.createBrowserHarness();
        const restore = testing.installBrowserGlobals(harness, {profile});

        try {
            harness.runtime.setManifest(testing.createManifestFixture({manifest_version: 3}));
            assert.equal(api.isManifestVersion3(), true);
            harness.runtime.setContexts([testing.createExtensionContextFixture({contextType: "SIDE_PANEL", windowId: 7})]);
            harness.sidebar.firefox.isOpen.setResult(true);
            assert.equal(await api.getSidebarState(7), api.SidebarState.Open);
            assert.equal(await api.isOpenSidebar(7), true);
            harness.runtime.setContexts([]);
            harness.sidebar.firefox.isOpen.setResult(false);
            assert.equal(await api.getSidebarState(7), api.SidebarState.Closed);
            assert.equal(await api.isOpenSidebar(7), false);

            const stateQuery = profile === "chrome" ? harness.runtime.getContexts : harness.sidebar.firefox.isOpen;
            stateQuery.failNext(new Error("State unavailable"));
            assert.equal(await api.getSidebarState(7), api.SidebarState.Unknown);
            stateQuery.failNext(new Error("State unavailable"));
            assert.equal(await api.isOpenSidebar(7), false);

            harness.runtime.getManifest.failNext(new Error("Manifest unavailable"));
            assert.equal(api.isManifestVersion3(), false);
            harness.runtime.getManifest.failNext(new Error("Manifest unavailable"));
            await assert.rejects(api.getBadgeText(), /Manifest unavailable/);

            const downloads = harness.configurable.active.downloads;
            downloads.search.setResult([]);
            assert.equal(await api.isDownloadExists(41), false);
            downloads.search.failNext(new Error("Search unavailable"));
            assert.equal(await api.isDownloadExists(41), false);
            downloads.search.failNext(new Error("Search unavailable"));
            await assert.rejects(api.showDownload(41), /Search unavailable/);

            for (const probe of [api.hasOffscreenUrl, api.hasOffscreenPath]) {
                harness.runtime.getContexts.failNext(new Error("Contexts unavailable"));
                assert.equal(await probe("offscreen.html"), false);
            }

            harness.configurable.active.offscreen.hasDocument.failNext(new Error("Native query failed"));
            await assert.rejects(api.hasOffscreen(), /Native query failed/);
        } finally {
            restore();
        }
    }

    console.log(`Verified ${format} predicate and state contracts from the installed package.`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
