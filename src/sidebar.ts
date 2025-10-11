import {browser} from "./browser";
import {throwRuntimeError} from "./runtime";
import type {FirefoxSidebarAction, OperaSidebarAction, SidebarAction} from "./types";

type Color = string | ColorArray;
type ColorArray = chrome.extensionTypes.ColorArray;

type OpenOptions = chrome.sidePanel.OpenOptions;
type PanelOptions = chrome.sidePanel.PanelOptions;
type PanelBehavior = chrome.sidePanel.PanelBehavior;
type IconDetails = opr.sidebarAction.IconDetails;

// Available in Firefox and Opera
const sidebarAction = (): SidebarAction | undefined =>
    globalThis?.opr?.sidebarAction || globalThis?.browser?.sidebarAction;

const isAvailableOperaSidebar = (): boolean => globalThis?.opr?.sidebarAction !== undefined;

// Chromium standard
const sidePanel = (): typeof chrome.sidePanel | undefined => browser().sidePanel;

// Methods
export const getSidebarOptions = (tabId?: number): Promise<PanelOptions> =>
    new Promise<PanelOptions>((resolve, reject) => {
        const sp = sidePanel();

        if (!sp) {
            throw new Error("The chrome.sidePanel.getOptions API is not supported for this browser");
        }

        sp.getOptions({tabId}, options => {
            try {
                throwRuntimeError();

                resolve(options);
            } catch (e) {
                reject(e);
            }
        });
    });

export const getSidebarBehavior = (): Promise<PanelBehavior> =>
    new Promise<PanelBehavior>((resolve, reject) => {
        const sp = sidePanel();

        if (!sp) {
            throw new Error("The chrome.sidePanel.getPanelBehavior API is not supported in this browser");
        }

        sp.getPanelBehavior(behavior => {
            try {
                throwRuntimeError();

                resolve(behavior);
            } catch (e) {
                reject(e);
            }
        });
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

export const openSidebar = (options: OpenOptions): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const sp = sidePanel();

        if (sp) {
            sp.open(options, () => {
                try {
                    throwRuntimeError();

                    resolve();
                } catch (e) {
                    reject(e);
                }
            });

            return;
        }

        const sb = sidebarAction() as FirefoxSidebarAction | undefined;

        if (sb) {
            // Available only in Firefox
            const {open} = sb;

            if (open) {
                open().then(resolve).catch(reject);

                return;
            }
        }

        console.warn("The sidebar open API is not supported in this browser");

        return resolve();
    });

export const setSidebarOptions = (options?: PanelOptions): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const sp = sidePanel();

        if (!sp) {
            console.warn("The chrome.sidePanel.setOptions API is not supported for this browser");

            return resolve();
        }

        sp.setOptions(options || {}, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

export const setSidebarBehavior = (behavior?: PanelBehavior): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const sp = sidePanel();

        if (!sp) {
            console.warn("The chrome.sidePanel.setPanelBehavior API is not supported in this browser");

            return resolve();
        }

        sp.setPanelBehavior(behavior || {}, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

// Customs methods
export const setSidebarPath = async (path: string, tabId?: number): Promise<void> => {
    if (sidePanel()) {
        await setSidebarOptions({tabId, path});

        return;
    }

    const sb = sidebarAction();

    if (sb) {
        const result = sb.setPanel({tabId, panel: path});

        if (result instanceof Promise) {
            await result;
        }

        return;
    }

    throw new Error("The sidebar set path API is not supported for this browser");
};

export const getSidebarPath = async (tabId?: number): Promise<string | undefined> => {
    if (sidePanel()) {
        return (await getSidebarOptions(tabId)).path;
    }

    const sb = sidebarAction();

    const {getPanel} = sb as OperaSidebarAction;

    if (getPanel) {
        // Opera: callback-based getPanel(details, callback)
        if (isAvailableOperaSidebar()) {
            const fullUrl: string = await new Promise((resolve, reject) => {
                getPanel({tabId}, (url: string) => {
                    try {
                        throwRuntimeError();

                        resolve(url);
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            // Opera returns a full URL like chrome-extension://{extension_id}/sidebar.html
            return new URL(fullUrl).pathname;
        }

        const fullUrl = await getPanel({tabId});

        return new URL(fullUrl).pathname;
    }

    throw new Error("The sidebar get path API is not supported for this browser");
};

export const setSidebarTitle = async (title: string | number, tabId?: number): Promise<void> => {
    const sb = sidebarAction();

    if (!sb) {
        console.warn("The sidebarAction.setTitle API is supported only in Opera or Firefox");

        return;
    }

    await sb.setTitle({tabId, title: title.toString()});
};

export const setSidebarBadgeText = async (text: string | number, tabId?: number): Promise<void> => {
    const sb = sidebarAction() as OperaSidebarAction | undefined;

    if (sb) {
        const {setBadgeText} = sb;

        if (setBadgeText) {
            setBadgeText({tabId, text: text.toString()});

            return;
        }
    }

    console.warn("The opr.sidebarAction.setBadgeText API is supported only in Opera");
};

export const clearSidebarBadgeText = (tabId?: number): Promise<void> => setSidebarBadgeText("", tabId);

/**
 * Note (Opera): The opr.sidebarAction.setIcon API appears to be broken ("Access to extension API denied").
 * See: https://forums.opera.com/topic/75680/opr-sidebaraction-seticon-api-is-broken-access-to-extension-api-denied
 */
export const setSidebarIcon = async (details: IconDetails): Promise<void> => {
    const sb = sidebarAction();

    if (sb) {
        const {setIcon} = sb;

        if (setIcon) {
            if (isAvailableOperaSidebar()) {
                console.warn(
                    "The opr.sidebarAction.setIcon API is broken in Opera. More info: https://forums.opera.com/topic/75680/opr-sidebaraction-seticon-api-is-broken-access-to-extension-api-denied"
                );

                return;
            }

            await setIcon(details);

            return;
        }
    }

    console.warn("The sidebarAction.setIcon API is supported only in Opera or Firefox");
};

export const setSidebarBadgeTextColor = async (color: Color, tabId?: number): Promise<void> => {
    const sb = sidebarAction() as OperaSidebarAction | undefined;

    if (sb) {
        const {setBadgeTextColor} = sb;

        if (setBadgeTextColor) {
            setBadgeTextColor({tabId, color});

            return;
        }
    }

    console.warn("The opr.sidebarAction.setBadgeTextColor API is supported only in Opera");
};

export const setSidebarBadgeBgColor = async (color: Color, tabId?: number): Promise<void> => {
    const sb = sidebarAction() as OperaSidebarAction | undefined;

    if (sb) {
        const {setBadgeBackgroundColor} = sb;

        if (setBadgeBackgroundColor) {
            setBadgeBackgroundColor({tabId, color});

            return;
        }
    }

    console.warn("The opr.sidebarAction.setBadgeBackgroundColor API is supported only in Opera");
};

export const getSidebarTitle = async (tabId?: number): Promise<string> => {
    const sb = sidebarAction();

    if (!sb) {
        throw new Error("The sidebarAction.getTitle API is supported only in Firefox or Opera");
    }

    const {getTitle} = sb as OperaSidebarAction;

    if (getTitle) {
        // Opera: callback-based getTitle(details, callback)
        if (isAvailableOperaSidebar()) {
            return await new Promise<string>((resolve, reject) => {
                getTitle({tabId}, (title: string) => {
                    try {
                        throwRuntimeError();

                        resolve(title);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        }

        return getTitle({tabId});
    }

    throw new Error("The sidebarAction.getTitle API not available");
};

export const getSidebarBadgeText = (tabId?: number): Promise<string> =>
    new Promise<string>((resolve, reject) => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb) {
            const {getBadgeText} = sb;

            if (getBadgeText) {
                getBadgeText({tabId}, (text: string) => {
                    try {
                        throwRuntimeError();

                        resolve(text);
                    } catch (e) {
                        reject(e);
                    }
                });

                return;
            }
        }

        throw new Error("The opr.sidebarAction.getBadgeText API is supported only in Opera");
    });

export const getSidebarBadgeTextColor = (tabId?: number): Promise<ColorArray> =>
    new Promise<ColorArray>((resolve, reject) => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb) {
            const {getBadgeTextColor} = sb;

            if (getBadgeTextColor) {
                getBadgeTextColor({tabId}, (color: ColorArray) => {
                    try {
                        throwRuntimeError();

                        resolve(color);
                    } catch (e) {
                        reject(e);
                    }
                });

                return;
            }
        }

        throw new Error("The opr.sidebarAction.getBadgeTextColor API is supported only in Opera");
    });

export const getSidebarBadgeBgColor = (tabId?: number): Promise<ColorArray> =>
    new Promise<ColorArray>((resolve, reject) => {
        const sb = sidebarAction() as OperaSidebarAction | undefined;

        if (sb) {
            const {getBadgeBackgroundColor} = sb;

            if (getBadgeBackgroundColor) {
                getBadgeBackgroundColor({tabId}, color => {
                    try {
                        throwRuntimeError();

                        resolve(color);
                    } catch (e) {
                        reject(e);
                    }
                });

                return;
            }
        }

        throw new Error("The opr.sidebarAction.getBadgeBackgroundColor API is supported only in Opera");
    });
