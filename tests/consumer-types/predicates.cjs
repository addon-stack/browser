const assert = require("node:assert/strict");

(async () => {
    const format = process.argv[2];
    const api = format === "esm" ? await import("@addon-core/browser") : require("@addon-core/browser");
    const testing = format === "esm" ? await import("@addon-core/browser/testing") : require("@addon-core/browser/testing");

    assert.deepEqual(api.SidebarState, {Open: "open", Closed: "closed", Unknown: "unknown"});

    assert.equal(api.canSetSidebarTitle(), false);
    assert.equal(api.canGetSidebarTitle(), false);
    assert.equal(api.canSetSidebarIcon(), false);
    await assert.rejects(api.setSidebarIcon({path: "icon.png"}), api.SidebarError);

    for (const profile of ["chrome", "firefox", "opera"]) {
        const harness = testing.createBrowserHarness();
        const restore = testing.installBrowserGlobals(harness, {profile});

        try {
            assert.equal(api.canSetSidebarTitle(), profile !== "chrome");
            assert.equal(api.canGetSidebarTitle(), profile !== "chrome");

            for (const manifest_version of [2, 3]) {
                harness.runtime.setManifest(testing.createManifestFixture({manifest_version}));
                const supported = profile === "firefox";
                assert.equal(api.canSetSidebarIcon(), supported);
                harness.sidebar.firefox.setIcon.setResult(undefined);
                harness.sidebar.opera.setIcon.setResult(undefined);
                const details = {path: {24: "small.png", 40: "medium.png", 64: "large.png"}, tabId: 0};
                const operation = api.setSidebarIcon(details);

                if (supported) {
                    await operation;
                    assert.equal(harness.sidebar.firefox.setIcon.calls.at(-1).args[0], details);
                } else {
                    await assert.rejects(operation, api.SidebarError);
                    assert.equal(harness.sidebar.firefox.setIcon.calls.length, 0);
                    assert.equal(harness.sidebar.opera.setIcon.calls.length, 0);
                }
            }
        } finally {
            restore();
        }
    }

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
