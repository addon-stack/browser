import {requireApiMethod} from "../../internal/api-method";
import {browser} from "../browser";
import {callWithPromise} from "../utils";

import type {FirefoxRuntime} from "../../types";

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
    callWithPromise(cb => requireApiMethod(runtime(), "runtime", "getContexts")(filter, cb));

export const getManifest = (): Manifest => runtime().getManifest();

export const getPackageDirectoryEntry = (): Promise<FileSystemDirectoryEntry> =>
    callWithPromise(cb => requireApiMethod(runtime(), "runtime", "getPackageDirectoryEntry")(cb));

export const getPlatformInfo = (): Promise<PlatformInfo> => callWithPromise(cb => runtime().getPlatformInfo(cb));

export const getBrowserInfo = async (): Promise<BrowserInfo> =>
    requireApiMethod(runtime() as unknown as FirefoxRuntime, "runtime", "getBrowserInfo")();

export const getUrl = (path: string): string => runtime().getURL(path);

export const openOptionsPage = (): Promise<void> => callWithPromise(cb => runtime().openOptionsPage(cb));

export const reload = (): void => runtime().reload();

export const requestUpdateCheck = (): Promise<RequestUpdateCheck> =>
    callWithPromise(cb => requireApiMethod(runtime(), "runtime", "requestUpdateCheck")((status, details) => cb({status, details})));

export const restart = (): void => requireApiMethod(runtime(), "runtime", "restart")();

export const restartAfterDelay = (seconds: number): Promise<void> =>
    callWithPromise(cb => requireApiMethod(runtime(), "runtime", "restartAfterDelay")(seconds, cb));

export const sendMessage = <M = any, R = any>(message: M): Promise<R> =>
    callWithPromise(cb => runtime().sendMessage<M, R>(message, cb));

export const setUninstallUrl = (url: string): Promise<void> =>
    callWithPromise(cb => runtime().setUninstallURL(url, cb));

export const getId = (): string => runtime().id;

export const getManifestVersion = (): 2 | 3 => getManifest().manifest_version;

export const isManifestVersion3 = (): boolean => {
    try {
        return getManifestVersion() === 3;
    } catch {
        return false;
    }
};
