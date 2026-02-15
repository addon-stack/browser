import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";
import type {FirefoxRuntime} from "./types";

type BrowserInfo = browser.runtime.BrowserInfo;

type Port = chrome.runtime.Port;
type Manifest = chrome.runtime.Manifest;
type PlatformInfo = chrome.runtime.PlatformInfo;
type ContextFilter = chrome.runtime.ContextFilter;
type ExtensionContext = chrome.runtime.ExtensionContext;

interface RequestUpdateCheck {
    status: `${chrome.runtime.RequestUpdateCheckStatus}`;
    details?: chrome.runtime.UpdateCheckDetails;
}

const runtime = () => browser().runtime as typeof chrome.runtime;

// Methods
export const connect = (extensionId: string, connectInfo?: object): Port => runtime().connect(extensionId, connectInfo);

export const connectNative = (application: string): Port => runtime().connectNative(application);

export const getContexts = (filter: ContextFilter): Promise<ExtensionContext[]> =>
    callWithPromise(cb => runtime().getContexts(filter, cb));

export const getManifest = (): Manifest => runtime().getManifest();

export const getPackageDirectoryEntry = (): Promise<FileSystemDirectoryEntry> =>
    callWithPromise(cb => runtime().getPackageDirectoryEntry(cb));

export const getPlatformInfo = (): Promise<PlatformInfo> => callWithPromise(cb => runtime().getPlatformInfo(cb));

export const getBrowserInfo = (): Promise<BrowserInfo> => {
    return (runtime() as unknown as FirefoxRuntime).getBrowserInfo();
};

export const getUrl = (path: string): string => runtime().getURL(path);

export const openOptionsPage = (): Promise<void> => callWithPromise(cb => runtime().openOptionsPage(cb));

export const reload = (): void => runtime().reload();

export const requestUpdateCheck = (): Promise<RequestUpdateCheck> =>
    callWithPromise(cb => runtime().requestUpdateCheck((status, details) => cb({status, details})));

export const restart = (): void => runtime().restart();

export const restartAfterDelay = (seconds: number): Promise<void> =>
    callWithPromise(cb => runtime().restartAfterDelay(seconds, cb));

export const sendMessage = <M = any, R = any>(message: M): Promise<R> =>
    callWithPromise(cb => runtime().sendMessage<M, R>(message, cb));

export const setUninstallUrl = (url: string): Promise<void> =>
    callWithPromise(cb => runtime().setUninstallURL(url, cb));

// Custom Methods
export const getId = (): string => runtime().id;

export const getManifestVersion = (): 2 | 3 => getManifest().manifest_version;

export const isManifestVersion3 = (): boolean => getManifestVersion() === 3;

// Events
export const onConnect = (callback: Parameters<typeof chrome.runtime.onConnect.addListener>[0]): (() => void) => {
    return handleListener(runtime().onConnect, callback);
};

export const onConnectExternal = (
    callback: Parameters<typeof chrome.runtime.onConnectExternal.addListener>[0]
): (() => void) => {
    return handleListener(runtime().onConnectExternal, callback);
};

export const onInstalled = (callback: Parameters<typeof chrome.runtime.onInstalled.addListener>[0]): (() => void) => {
    return handleListener(runtime().onInstalled, callback);
};

export const onMessage = (callback: Parameters<typeof chrome.runtime.onMessage.addListener>[0]): (() => void) => {
    return handleListener(runtime().onMessage, callback);
};

export const onMessageExternal = (
    callback: Parameters<typeof chrome.runtime.onMessageExternal.addListener>[0]
): (() => void) => {
    return handleListener(runtime().onMessageExternal, callback);
};

export const onRestartRequired = (
    callback: Parameters<typeof chrome.runtime.onRestartRequired.addListener>[0]
): (() => void) => {
    return handleListener(runtime().onRestartRequired, callback);
};

export const onStartup = (callback: Parameters<typeof chrome.runtime.onStartup.addListener>[0]): (() => void) => {
    return handleListener(runtime().onStartup, callback);
};

export const onSuspend = (callback: Parameters<typeof chrome.runtime.onSuspend.addListener>[0]): (() => void) => {
    return handleListener(runtime().onSuspend, callback);
};

export const onSuspendCanceled = (
    callback: Parameters<typeof chrome.runtime.onSuspendCanceled.addListener>[0]
): (() => void) => {
    return handleListener(runtime().onSuspendCanceled, callback);
};

export const onUpdateAvailable = (
    callback: Parameters<typeof chrome.runtime.onUpdateAvailable.addListener>[0]
): (() => void) => {
    return handleListener(runtime().onUpdateAvailable, callback);
};

export const onUserScriptConnect = (
    callback: Parameters<typeof chrome.runtime.onUserScriptConnect.addListener>[0]
): (() => void) => {
    return handleListener(runtime().onUserScriptConnect, callback);
};

export const onUserScriptMessage = (
    callback: Parameters<typeof chrome.runtime.onUserScriptMessage.addListener>[0]
): (() => void) => {
    return handleListener(runtime().onUserScriptMessage, callback);
};
