import {browser as browserApi} from "@addon-core/browser";
import {type BrowserStorageHarness, type BrowserStorageOptions, createBrowserHarness, type StorageAreaHarness, type StorageAreaTestApi, type StorageQuotaLimits, type StorageTestApi} from "@addon-core/browser/testing";
import {Storage, type StorageLocker} from "@addon-core/storage";

const limits: StorageQuotaLimits = {maxBytes: 1000};
const options: BrowserStorageOptions = {local: {count: 1}, quotas: {local: limits}};
const harness = createBrowserHarness({storage: options});
const controls: BrowserStorageHarness = harness.storage;
const area: StorageAreaHarness = controls.local;
const api: StorageTestApi = harness.browser.storage;
const local: StorageAreaTestApi = api.local;
const result: Promise<{count: number}> = local.get<{count: number}>("count");

local.get<{count: number}>("count", items => {
    const count: number = items.count; void count;
});

local.set<{count: number}>({count: 2}, () => undefined);
const browserResult: Promise<{count: number}> = browserApi().storage.local.get<{count: number}>("count");
area.get.setResult({count: 3});

const locker: StorageLocker = {async request(_name, task) {
    return await task();
}};

const store = new Storage<{count: number}>({locker, namespace: "app"});
const value: Promise<number | undefined> = store.get("count");
void [result, value, browserResult];
