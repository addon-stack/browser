import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type ExtensionInfo = chrome.management.ExtensionInfo;
type LaunchType = chrome.management.LaunchType;

const management = () => browser().management;

// Methods
export const createAppShortcut = async (id: string): Promise<void> =>
    callWithPromise(cb => management().createAppShortcut(id, cb));

export const generateAppForLink = async (url: string, title: string): Promise<ExtensionInfo> =>
    callWithPromise(cb => management().generateAppForLink(url, title, cb));

export const getExtensionInfo = async (id: string): Promise<ExtensionInfo> =>
    callWithPromise(cb => management().get(id, cb));

export const getAllExtensionInfo = async (): Promise<ExtensionInfo[]> => callWithPromise(cb => management().getAll(cb));

export const getPermissionWarningsById = async (id: string): Promise<string[]> =>
    callWithPromise(cb => management().getPermissionWarningsById(id, cb));

export const getPermissionWarningsByManifest = async (manifestStr: string): Promise<string[]> =>
    callWithPromise(cb => management().getPermissionWarningsByManifest(manifestStr, cb));

export const getCurrentExtension = async (): Promise<ExtensionInfo> => callWithPromise(cb => management().getSelf(cb));

export const launchExtensionApp = async (id: string): Promise<void> =>
    callWithPromise(cb => management().launchApp(id, cb));

export const setExtensionEnabled = async (id: string, enabled: boolean): Promise<void> =>
    callWithPromise(cb => management().setEnabled(id, enabled, cb));

export const setExtensionLaunchType = async (id: string, launchType: `${LaunchType}`): Promise<void> =>
    callWithPromise(cb => management().setLaunchType(id, launchType, cb));

export const uninstallExtension = async (id: string, showConfirmDialog?: boolean): Promise<void> =>
    callWithPromise(cb => management().uninstall(id, {showConfirmDialog}, cb));

export const uninstallCurrentExtension = async (showConfirmDialog?: boolean): Promise<void> =>
    callWithPromise(cb => management().uninstallSelf({showConfirmDialog}, cb));

// Events
export const onExtensionDisabled = (
    callback: Parameters<typeof chrome.management.onDisabled.addListener>[0]
): (() => void) => {
    return handleListener(management().onDisabled, callback);
};

export const onExtensionEnabled = (
    callback: Parameters<typeof chrome.management.onEnabled.addListener>[0]
): (() => void) => {
    return handleListener(management().onEnabled, callback);
};

export const onExtensionInstalled = (
    callback: Parameters<typeof chrome.management.onInstalled.addListener>[0]
): (() => void) => {
    return handleListener(management().onInstalled, callback);
};

export const onExtensionUninstalled = (
    callback: Parameters<typeof chrome.management.onUninstalled.addListener>[0]
): (() => void) => {
    return handleListener(management().onUninstalled, callback);
};
