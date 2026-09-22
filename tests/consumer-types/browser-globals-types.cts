import {browser as browserApi, getBrowserInfo} from "@addon-core/browser";
import {createBrowserHarness} from "@addon-core/browser/testing";

const tabs: Promise<chrome.tabs.Tab[]> = browser.tabs.query({active: true});
const info: Promise<browser.runtime.BrowserInfo> = getBrowserInfo();
const api: typeof chrome = browserApi();
const panel: Promise<string> = browser.sidebarAction.getPanel({});
const harness = createBrowserHarness();
harness.configurable.browser.identity.getAuthToken.queueResult({token: "test"});
void [tabs, info, api, panel];
