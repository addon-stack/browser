import {browser} from "./browser";
import {throwRuntimeError} from "./runtime";
import type {FirefoxSidebarAction, OperaSidebarAction, SidebarAction} from "./types";

type Color = string | ColorArray;
type ColorArray = chrome.action.ColorArray;

type OpenOptions = chrome.sidePanel.OpenOptions;
type PanelOptions = chrome.sidePanel.PanelOptions;
type PanelBehavior = chrome.sidePanel.PanelBehavior;
type IconDetails = opr.sidebarAction.IconDetails;

// Available in Firefox and Opera
const sidebarAction = (): SidebarAction | undefined =>
    globalThis?.browser?.sidebarAction || globalThis?.opr?.sidebarAction;

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
    });

export const setSidebarOptions = (options?: PanelOptions): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const sp = sidePanel();

        if (!sp) {
            console.warn("The chrome.sidePanel.setOptions API is not supported for this browser");

            return;
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

            return;
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
    }

    const sb = sidebarAction();

    if (sb) {
        await sb.setPanel({tabId, panel: path});
    }

    throw new Error("The sidebar set path API is not supported for this browser");
};

export const getSidebarPath = async (tabId?: number): Promise<string | undefined> => {
    if (sidePanel()) {
        return (await getSidebarOptions(tabId)).path;
    }

    const sb = sidebarAction();

    if (sb) {
        // opr.sidebarAction.getPanel returned path in the following format
        // chrome-extension://{extension_id}/sidebar.html
        return new URL(await sb.getPanel({tabId})).pathname;
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

export const setSidebarIcon = async (details: IconDetails): Promise<void> => {
    const sb = sidebarAction();

    if (sb) {
        const {setIcon} = sb;

        if (setIcon) {
            setIcon(details);

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
        throw new Error("The sidebar get title API is supported only for this browser");
    }

    return sb.getTitle({tabId});
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
