import {browser} from "./browser";
import {callWithPromise} from "./utils";
import type {FirefoxSidebarAction, OperaSidebarAction, SidebarAction} from "./types";

type Color = string | ColorArray;
type ColorArray = chrome.extensionTypes.ColorArray;

type OpenOptions = chrome.sidePanel.OpenOptions;
type CloseOptions = chrome.sidePanel.CloseOptions;
type PanelOptions = chrome.sidePanel.PanelOptions;
type PanelBehavior = chrome.sidePanel.PanelBehavior;
type IconDetails = opr.sidebarAction.IconDetails;

// Available in Firefox and Opera
const sidebarAction = (): SidebarAction | undefined =>
    globalThis?.opr?.sidebarAction || globalThis?.browser?.sidebarAction;

const isAvailableOperaSidebar = (): boolean => globalThis?.opr?.sidebarAction !== undefined;

// Chromium standard
const sidePanel = (): typeof chrome.sidePanel | undefined => browser().sidePanel;

export class SidebarError extends Error {}

// Methods
export const getSidebarOptions = (tabId?: number): Promise<PanelOptions> =>
    callWithPromise(cb => {
        const sp = sidePanel();

        if (!sp) {
            throw new Error("The chrome.sidePanel.getOptions API is not supported for this browser");
        }

        sp.getOptions({tabId}, cb);
    });

export const getSidebarBehavior = (): Promise<PanelBehavior> =>
    callWithPromise(cb => {
        const sp = sidePanel();

        if (!sp) {
            throw new Error("The chrome.sidePanel.getPanelBehavior API is not supported in this browser");
        }

        sp.getPanelBehavior(cb);
    });

export const canOpenSidebar = (): boolean => {
    if (sidePanel()) {
        return true;
    }

    const sb = (sidebarAction() as FirefoxSidebarAction) || undefined;

    if (sb) {
        return !!sb.open;
    }

    return false;
};

export const canCloseSidebar = (): boolean => {
    if (sidePanel()) {
        return true;
    }

    const sb = (sidebarAction() as FirefoxSidebarAction) || undefined;

    if (sb) {
        return !!sb.close;
    }

    return false;
};

export const openSidebar = (options: OpenOptions): Promise<void> =>
    callWithPromise(async cb => {
        const sp = sidePanel();

        if (sp) {
            return sp.open(options, cb);
        }

        const sb = sidebarAction() as FirefoxSidebarAction | undefined;

        if (sb?.open) {
            const result = sb.open();

            if (result instanceof Promise) {
                await result;
            }

            return cb();
        }

        throw new SidebarError("The sidebarAction.open API is not supported in this browser");
    });

export const closeSidebar = (options: CloseOptions): Promise<void> =>
    callWithPromise(async cb => {
        const sp = sidePanel();

        if (sp) {
            return sp.close(options, cb);
        }

        const sb = sidebarAction() as FirefoxSidebarAction | undefined;

        if (sb?.close) {
            const result = sb.close();

            if (result instanceof Promise) {
                await result;
            }

            return cb();
        }

        throw new SidebarError("The sidebarAction.close API is not supported in this browser");
    });

export const setSidebarOptions = (options?: PanelOptions): Promise<void> =>
    callWithPromise(cb => {
        const sp = sidePanel();

        if (!sp) {
            throw new SidebarError("The chrome.sidePanel.setOptions API is not supported for this browser");
        }

        sp.setOptions(options || {}, cb);
    });

export const setSidebarBehavior = (behavior?: PanelBehavior): Promise<void> =>
    callWithPromise(cb => {
        const sp = sidePanel();

        if (!sp) {
            throw new SidebarError("The chrome.sidePanel.setPanelBehavior API is not supported in this browser");
        }

        sp.setPanelBehavior(behavior || {}, cb);
    });

export const isOpenSidebar = (windowId?: number): Promise<boolean> =>
    callWithPromise(async cb => {
        const sb = sidebarAction() as FirefoxSidebarAction | undefined;

        if (sb?.isOpen) {
            const result = sb.isOpen({windowId});

            if (result instanceof Promise) {
                return cb(await result);
            } else {
                return cb(result);
            }
        }

        throw new SidebarError("The sidebarAction.isOpen API is not supported in this browser");
    });

export const toggleSidebar = (): Promise<void> =>
    callWithPromise(async cb => {
        const sb = sidebarAction() as FirefoxSidebarAction | undefined;

        if (sb?.toggle) {
            const result = sb.toggle();

            if (result instanceof Promise) {
                await result;
            }

            return cb();
        }

        throw new SidebarError("The sidebarAction.toggle API is not supported in this browser");
    });

// Customs methods
export const setSidebarPath = (path: string, tabId?: number): Promise<void> =>
    callWithPromise(async cb => {
        if (sidePanel()) {
            await setSidebarOptions({tabId, path});

            return cb();
        }

        const sb = sidebarAction();

        if (sb) {
            const result = sb.setPanel({tabId, panel: path});

            if (result instanceof Promise) {
                await result;
            }

            return cb();
        }

        throw new Error("The sidebar set path API is not supported for this browser");
    });

export const getSidebarPath = async (tabId?: number): Promise<string | undefined> => {
    if (sidePanel()) {
        const options = await getSidebarOptions(tabId);

        return options.path;
    }

    const sb = sidebarAction() as OperaSidebarAction | undefined;

    if (sb?.getPanel) {
        const fullUrl = await callWithPromise<string>(cb => {
            if (isAvailableOperaSidebar()) {
                return sb.getPanel({tabId}, cb);
            }

            return (sb as any).getPanel({tabId});
        });

        return new URL(fullUrl).pathname;
    }

    throw new Error("The sidebar get path API is not supported for this browser");
};

export const setSidebarTitle = (title: string | number, tabId?: number): Promise<void> =>
    callWithPromise(async cb => {
        const sb = sidebarAction();

        if (sb?.setTitle) {
            const result = sb.setTitle({tabId, title: title.toString()});

            if (result instanceof Promise) {
                await result;
            }
            return cb();
        }

        throw new SidebarError("The sidebarAction.setTitle API is supported only in Opera or Firefox");
    });

export const setSidebarBadgeText = (text: string | number, tabId?: number): Promise<void> =>
    callWithPromise(cb => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb?.setBadgeText) {
            sb.setBadgeText({tabId, text: text.toString()});

            return cb();
        }

        throw new SidebarError("The sidebarAction.setBadgeText API is supported only in Opera");
    });

export const clearSidebarBadgeText = (tabId?: number): Promise<void> => setSidebarBadgeText("", tabId);

/**
 * Note (Opera): The opr.sidebarAction.setIcon API appears to be broken ("Access to extension API denied").
 * See: https://forums.opera.com/topic/75680/opr-sidebaraction-seticon-api-is-broken-access-to-extension-api-denied
 */
export const setSidebarIcon = (details: IconDetails): Promise<void> =>
    callWithPromise(async cb => {
        const sb = sidebarAction();

        if (sb?.setIcon) {
            if (isAvailableOperaSidebar()) {
                console.warn(
                    "The opr.sidebarAction.setIcon API is broken in Opera. More info: https://forums.opera.com/topic/75680/opr-sidebaraction-seticon-api-is-broken-access-to-extension-api-denied"
                );

                return cb();
            }

            const result = sb.setIcon(details);

            if (result instanceof Promise) {
                await result;
            }

            return cb();
        }

        throw new SidebarError("The sidebarAction.setIcon API is supported only in Opera or Firefox");
    });

export const setSidebarBadgeTextColor = (color: Color, tabId?: number): Promise<void> =>
    callWithPromise(cb => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb?.setBadgeTextColor) {
            sb.setBadgeTextColor({tabId, color});

            return cb();
        }

        throw new SidebarError("The sidebarAction.setBadgeTextColor API is supported only in Opera");
    });

export const setSidebarBadgeBgColor = (color: Color, tabId?: number): Promise<void> =>
    callWithPromise(cb => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb?.setBadgeBackgroundColor) {
            sb.setBadgeBackgroundColor({tabId, color});

            return cb();
        }

        throw new SidebarError("The sidebarAction.setBadgeBackgroundColor API is supported only in Opera");
    });

export const getSidebarTitle = (tabId?: number): Promise<string> =>
    callWithPromise<string>(cb => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb?.getTitle) {
            if (isAvailableOperaSidebar()) {
                return sb.getTitle({tabId}, cb);
            }

            return (sb as any).getTitle({tabId});
        }

        throw new SidebarError("The sidebarAction.getTitle API not available");
    });

export const getSidebarBadgeText = (tabId?: number): Promise<string> =>
    callWithPromise(cb => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb?.getBadgeText) {
            return sb.getBadgeText({tabId}, cb);
        }

        throw new SidebarError("The sidebarAction.getBadgeText API is supported only in Opera");
    });

export const getSidebarBadgeTextColor = (tabId?: number): Promise<ColorArray> =>
    callWithPromise(cb => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb?.getBadgeTextColor) {
            return sb.getBadgeTextColor({tabId}, cb);
        }

        throw new SidebarError("The sidebarAction.getBadgeTextColor API is supported only in Opera");
    });

export const getSidebarBadgeBgColor = (tabId?: number): Promise<ColorArray> =>
    callWithPromise(cb => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb?.getBadgeBackgroundColor) {
            return sb.getBadgeBackgroundColor({tabId}, cb);
        }

        throw new SidebarError("The sidebarAction.getBadgeBackgroundColor API is supported only in Opera");
    });
