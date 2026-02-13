import {browser} from "./browser";
import {getManifest, isManifestVersion3} from "./runtime";
import {callWithPromise, handleListener} from "./utils";

type Action = typeof chrome.action;
type BrowserAction = typeof chrome.browserAction;

type ColorArray = chrome.extensionTypes.ColorArray;
type TabIconDetails = chrome.action.TabIconDetails & chrome.browserAction.TabIconDetails;
type UserSettings = chrome.action.UserSettings;
type Color = string | ColorArray;

const action = <T = Action | BrowserAction>() =>
    (isManifestVersion3() ? browser().action : browser().browserAction) as T;

// Methods
export const disableAction = (tabId: number): Promise<void> => callWithPromise(cb => action().disable(tabId, cb));

export const enableAction = (tabId: number): Promise<void> => callWithPromise(cb => action().enable(tabId, cb));

export const getBadgeBgColor = (tabId?: number): Promise<ColorArray> =>
    callWithPromise(cb => action().getBadgeBackgroundColor({tabId}, cb));

export const getBadgeText = (tabId?: number): Promise<string> =>
    callWithPromise(cb => action().getBadgeText({tabId}, cb));

export const getBadgeTextColor = (tabId?: number): Promise<ColorArray> =>
    callWithPromise(cb => action<Action>().getBadgeTextColor({tabId}, cb));

export const getActionPopup = (tabId?: number): Promise<string> =>
    callWithPromise(cb => action().getPopup({tabId}, cb));

export const getActionTitle = (tabId?: number): Promise<string> =>
    callWithPromise(cb => action().getTitle({tabId}, cb));

export const getActionUserSetting = (): Promise<UserSettings> =>
    callWithPromise(cb => action<Action>().getUserSettings(cb));

export const isActionEnabled = (tabId: number): Promise<boolean> =>
    callWithPromise(cb => action<Action>().isEnabled(tabId, cb));

export const openActionPopup = (windowId?: number): Promise<void> =>
    callWithPromise(cb => action<Action>().openPopup({windowId}, cb));

export const setBadgeBgColor = (color: Color, tabId?: number): Promise<void> =>
    callWithPromise(cb => action().setBadgeBackgroundColor({color, tabId}, cb));

export const setBadgeText = (text: string | number, tabId?: number): Promise<void> =>
    callWithPromise(cb => action().setBadgeText({tabId, text: text.toString()}, cb));

export const setBadgeTextColor = (color: Color, tabId?: number): Promise<void> => {
    if (!isManifestVersion3()) {
        return Promise.resolve();
    }

    return callWithPromise(cb => action<Action>().setBadgeTextColor({color, tabId}, cb));
};

export const setActionIcon = (details: TabIconDetails): Promise<void> =>
    callWithPromise(cb => action().setIcon(details, cb));

export const setActionPopup = (popup: string, tabId?: number): Promise<void> =>
    callWithPromise(cb => action().setPopup({popup, tabId}, cb));

export const setActionTitle = (title: string, tabId?: number): Promise<void> =>
    callWithPromise(cb => action().setTitle({title, tabId}, cb));

// Custom Methods
export const getDefaultPopup = (): string => {
    const manifest = getManifest();

    return isManifestVersion3() ? manifest.action.default_popup : manifest.browser_action.default_popup;
};

export const clearBadgeText = (tabId?: number): Promise<void> => setBadgeText("", tabId);

// Events
export const onActionClicked = (callback: Parameters<typeof chrome.action.onClicked.addListener>[0]): (() => void) => {
    return handleListener(action().onClicked, callback);
};

export const onActionUserSettingsChanged = (
    callback: Parameters<typeof chrome.action.onUserSettingsChanged.addListener>[0]
): (() => void) => {
    return handleListener(action<Action>().onUserSettingsChanged, callback);
};
