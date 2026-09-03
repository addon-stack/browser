import {browser} from "./browser";
import {callWithPromise} from "./utils";

type DataTypeSet = chrome.browsingData.DataTypeSet;
type RemovalOptions = chrome.browsingData.RemovalOptions;
type SettingsResult = chrome.browsingData.SettingsResult;

const browsingData = () => browser().browsingData;

// Methods
export const removeBrowsingData = (options: RemovalOptions, dataToRemove: DataTypeSet): Promise<void> =>
    callWithPromise(cb => browsingData().remove(options, dataToRemove, cb));

export const removeAppcacheData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeAppcache(options || {}, cb));

export const removeCacheData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeCache(options || {}, cb));

export const removeCacheStorageData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeCacheStorage(options || {}, cb));

export const removeCookiesData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeCookies(options || {}, cb));

export const removeDownloadsData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeDownloads(options || {}, cb));

export const removeFileSystemsData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeFileSystems(options || {}, cb));

export const removeFormData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeFormData(options || {}, cb));

export const removeHistoryData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeHistory(options || {}, cb));

export const removeIndexedDBData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeIndexedDB(options || {}, cb));

export const removeLocalStorageData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeLocalStorage(options || {}, cb));

export const removePasswordsData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removePasswords(options || {}, cb));

export const removeServiceWorkersData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeServiceWorkers(options || {}, cb));

export const removeWebSQLData = (options?: RemovalOptions): Promise<void> =>
    callWithPromise(cb => browsingData().removeWebSQL(options || {}, cb));

export const getBrowsingDataSettings = (): Promise<SettingsResult> =>
    callWithPromise(cb => browsingData().settings(cb));
