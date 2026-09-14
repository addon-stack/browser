import {
    containsPermissions,
    createAlarmIfNotExists,
    getManifest,
    onSpecificAlarm,
    onTabUpdated,
    queryTabs,
} from "@addon-core/browser";
import {
    type BrowserContext,
    type BrowserContextInfo,
    type BrowserDocument,
    type BrowserHarness,
    type BrowserMethod,
    type BrowserOffscreenHarness,
    createBrowserHarness,
    createManifestFixture,
    createTabFixture,
    installBrowserGlobals,
    type OffscreenTestApi,
} from "@addon-core/browser/testing";

const harness: BrowserHarness = createBrowserHarness({
    manifest: createManifestFixture({name: "Typed consumer"}),
    tabs: [createTabFixture({id: 7})],
});

const restore = installBrowserGlobals(harness, {profile: "firefox"});
const document: BrowserDocument = harness.contexts.documents.create({tabId: 7, url: "https://example.test/"});
const context: BrowserContext = harness.contexts.create({kind: "contentScript", documentId: document.documentId});
const contexts: readonly BrowserContextInfo[] = harness.contexts.list({kinds: ["contentScript"], tabIds: [7]});
const tracked: Promise<number> = context.track(Promise.resolve(1));
const cleanup: () => void = context.onDispose(() => undefined);
void contexts;
void tracked;
cleanup();
const manifestName: string = getManifest().name;
const queryResult: Promise<chrome.tabs.Tab[]> = queryTabs({active: true});

const matchedTabs: Promise<chrome.tabs.Tab[]> = harness.browser.tabs.query({
    url: ["http://127.0.0.1/*", "https://*.example.com/*"],
});

const hasHostAccess: Promise<boolean> = containsPermissions({origins: ["https://shop.example.com/*"]});
const alarmCreated: Promise<boolean> = createAlarmIfNotExists("sync", {periodInMinutes: 5});

const unsubscribeAlarm: () => void = onSpecificAlarm("sync", async alarm => {
    const currentAlarm: chrome.alarms.Alarm = alarm;
    void currentAlarm;
});

const browserQuery: typeof chrome.tabs.query = harness.browser.tabs.query;

const downloadValidationDelay: BrowserMethod<(milliseconds: number) => Promise<void>, void> =
    harness.delays.downloadValidation;

harness.tabs.query.setResult([]);
harness.configurable.browser.downloads.search.setResult([]);
harness.runtime.closeMessageChannels();

const offscreen: BrowserOffscreenHarness = harness.offscreen;
const offscreenApi: OffscreenTestApi = harness.browser.offscreen;
const offscreenExists: Promise<boolean> = offscreenApi.hasDocument();

offscreenApi.hasDocument((exists: boolean) => {
    void exists;
});

offscreen.beforeCreate.setImplementation(async parameters => {
    const url: string = parameters.url;
    void url;
});

offscreen.beforeClose.failNext(new Error("Closure failed"));
const offscreenContext: BrowserContext | undefined = offscreen.context;
const legacyCreate: typeof chrome.offscreen.createDocument = harness.configurable.browser.offscreen.createDocument.api;
void offscreenExists;
void offscreenContext;
void legacyCreate;

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
void alarmCreated;
unsubscribeAlarm();
restore();
installBrowserGlobals(harness, {environment: "preserve"})();

onTabUpdated((tabId, changeInfo, tab) => {
    const id: number = tabId;
    const info: chrome.tabs.OnUpdatedInfo = changeInfo;
    const currentTab: chrome.tabs.Tab = tab;

    void id;
    void info;
    void currentTab;
});
