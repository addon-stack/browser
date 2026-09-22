import {browser as browserApi, getBrowserInfo, getSidebarPath} from "@addon-core/browser";
import {createBrowserHarness, createTabFixture} from "@addon-core/browser/testing";

// Compile with skipLibCheck disabled and Storage installed alongside the tarball.
// The upstream browser variable and our type-only aliases must coexist.
const tabs: Promise<chrome.tabs.Tab[]> = browser.tabs.query({active: true});
const globalTabs: Promise<chrome.tabs.Tab[]> = globalThis.browser.tabs.query({active: true});
const windowTabs: Promise<chrome.tabs.Tab[]> = window.browser.tabs.query({active: true});
const wrapperApi: typeof chrome = browserApi();
const info: Promise<browser.runtime.BrowserInfo> = getBrowserInfo();
const nativeInfo: Promise<browser.runtime.BrowserInfo> = browser.runtime.getBrowserInfo();
const sidebarPanel: Promise<string> = browser.sidebarAction.getPanel({tabId: 1});
const wrapperPanel: Promise<string | undefined> = getSidebarPath(1);
const operaPanel: Promise<string> = opr.sidebarAction.getPanel({tabId: 1});
const pixels: browser.sidebarAction.ImageDataType = new ImageData(1, 1);
const lastAccessed: number = createTabFixture().lastAccessed;
const harness = createBrowserHarness();

browser.tabs.query({active: true}, result => {
    const typed: chrome.tabs.Tab[] = result;
    void typed;
});

browser.sidebarAction.setIcon({imageData: pixels});
harness.runtime.getBrowserInfo.setResult({name: "Firefox", vendor: "Mozilla", version: "1", buildID: "test"});
harness.configurable.chrome.identity.getAuthToken.setResult({token: "test", grantedScopes: ["email"]});

// @ts-expect-error QueryInfo does not accept a tab ID filter.
browser.tabs.query({id: 1});
// @ts-expect-error BrowserInfo keeps its required vendor field.
harness.runtime.getBrowserInfo.setResult({name: "Firefox", version: "1", buildID: "test"});
// @ts-expect-error Hybrid token results are objects, not callback argument tuples.
harness.configurable.chrome.identity.getAuthToken.setResult(["test", ["email"]]);

void [tabs, globalTabs, windowTabs, wrapperApi, info, nativeInfo, sidebarPanel, wrapperPanel, operaPanel, lastAccessed];
