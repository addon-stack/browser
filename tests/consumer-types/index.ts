import {containsPermissions, getManifest, onTabUpdated, queryTabs} from "@addon-core/browser";
import {
    type BrowserHarness,
    type BrowserMethod,
    createBrowserHarness,
    createManifestFixture,
    createTabFixture,
    installBrowserGlobals,
} from "@addon-core/browser/testing";

const harness: BrowserHarness = createBrowserHarness({
    manifest: createManifestFixture({name: "Typed consumer"}),
    tabs: [createTabFixture({id: 7})],
});

const restore = installBrowserGlobals(harness, {profile: "firefox"});
const manifestName: string = getManifest().name;
const queryResult: Promise<chrome.tabs.Tab[]> = queryTabs({active: true});

const matchedTabs: Promise<chrome.tabs.Tab[]> = harness.browser.tabs.query({
    url: ["http://127.0.0.1/*", "https://*.example.com/*"],
});

const hasHostAccess: Promise<boolean> = containsPermissions({origins: ["https://shop.example.com/*"]});
const browserQuery: typeof chrome.tabs.query = harness.browser.tabs.query;

const downloadValidationDelay: BrowserMethod<(milliseconds: number) => Promise<void>, void> =
    harness.delays.downloadValidation;

harness.tabs.query.setResult([]);
harness.configurable.browser.downloads.search.setResult([]);
harness.runtime.closeMessageChannels();

downloadValidationDelay.setImplementation(async milliseconds => {
    const duration: number = milliseconds;
    void duration;
});

downloadValidationDelay.setResult(undefined);

void browserQuery;
void manifestName;
void queryResult;
void matchedTabs;
void hasHostAccess;
restore();

onTabUpdated((tabId, changeInfo, tab) => {
    const id: number = tabId;
    const info: chrome.tabs.OnUpdatedInfo = changeInfo;
    const currentTab: chrome.tabs.Tab = tab;

    void id;
    void info;
    void currentTab;
});
