import type {FirefoxRuntime} from "../../types";
import {browser} from "../browser";
import {callWithPromise} from "../utils";

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

export const getId = (): string => runtime().id;

export const getManifestVersion = (): 2 | 3 => getManifest().manifest_version;

export const isManifestVersion3 = (): boolean => getManifestVersion() === 3;
