import {getBrowsingDataSettings, removeAppcacheData, removeBrowsingData, removeCacheData, removeCacheStorageData, removeCookiesData, removeDownloadsData, removeFileSystemsData, removeFormData, removeHistoryData, removeIndexedDBData, removeLocalStorageData, removePasswordsData, removeServiceWorkersData, removeWebSQLData} from "@addon-core/browser";

type DataTypeSet = chrome.browsingData.DataTypeSet;
type RemovalOptions = chrome.browsingData.RemovalOptions;
type SettingsResult = chrome.browsingData.SettingsResult;

const methods = {removeBrowsingData, removeAppcacheData, removeCacheData, removeCacheStorageData, removeCookiesData, removeDownloadsData, removeFileSystemsData, removeFormData, removeHistoryData, removeIndexedDBData, removeLocalStorageData, removePasswordsData, removeServiceWorkersData, removeWebSQLData, getBrowsingDataSettings};

type Expected = {
    removeBrowsingData: (options: RemovalOptions, dataToRemove: DataTypeSet) => Promise<void>;
    removeAppcacheData: (options?: RemovalOptions) => Promise<void>;
    removeCacheData: (options?: RemovalOptions) => Promise<void>;
    removeCacheStorageData: (options?: RemovalOptions) => Promise<void>;
    removeCookiesData: (options?: RemovalOptions) => Promise<void>;
    removeDownloadsData: (options?: RemovalOptions) => Promise<void>;
    removeFileSystemsData: (options?: RemovalOptions) => Promise<void>;
    removeFormData: (options?: RemovalOptions) => Promise<void>;
    removeHistoryData: (options?: RemovalOptions) => Promise<void>;
    removeIndexedDBData: (options?: RemovalOptions) => Promise<void>;
    removeLocalStorageData: (options?: RemovalOptions) => Promise<void>;
    removePasswordsData: (options?: RemovalOptions) => Promise<void>;
    removeServiceWorkersData: (options?: RemovalOptions) => Promise<void>;
    removeWebSQLData: (options?: RemovalOptions) => Promise<void>;
    getBrowsingDataSettings: () => Promise<SettingsResult>;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
void [methods, signaturesUnchanged];
