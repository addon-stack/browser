const assert = require("node:assert/strict");

const names = [
    "isAvailableAction", "isAvailableAlarms", "isAvailableAudio", "isAvailableBookmarks", "isAvailableBrowsingData", "isAvailableCommands",
    "isAvailableContextMenus", "isAvailableCookies", "isAvailableDnr", "isAvailableDocumentScan", "isAvailableDownloads", "isAvailableExtension",
    "isAvailableHistory", "isAvailableI18n", "isAvailableIdentity", "isAvailableIdle", "isAvailableManagement",
    "isAvailableNotifications", "isAvailableOffscreen", "isAvailablePermissions", "isAvailableRuntime", "isAvailableScripting", "isAvailableSearch",
    "isAvailableSidebar", "isAvailableTabCapture", "isAvailableTabGroups", "isAvailableTabs", "isAvailableTopSites", "isAvailableUserScripts", "isAvailableWebNavigation",
    "isAvailableWebRequest", "isAvailableWindows",
];

(async () => {
    const api = process.argv[2] === "esm" ? await import("@addon-core/browser") : require("@addon-core/browser");
    assert.deepEqual(Object.keys(api).filter(name => name.startsWith("isAvailable")).sort(), [...names].sort());

    for (const name of names) {
        assert.equal(api[name](), false, `${name} must return false without extension globals`);
    }

    globalThis.chrome = {tabs: {}, userScripts: {}, notifications: {}};
    assert.equal(api.isAvailableTabs(), true);
    assert.equal(api.isAvailableNotifications(), true);
    assert.equal(api.isAvailableScripting(), false);
    assert.equal(api.isAvailableUserScripts(), true);
    delete globalThis.chrome.tabs;
    assert.equal(api.isAvailableTabs(), false);

    Object.defineProperty(globalThis.chrome, "userScripts", {get() {
        throw new Error("Access denied");
    }});

    assert.equal(api.isAvailableUserScripts(), false);
    console.log(`Verified ${process.argv[2]} availability exports from the installed package.`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
