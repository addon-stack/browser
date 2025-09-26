import {browser} from "./browser";
import {throwRuntimeError} from "./runtime";
import {FirefoxSidebarAction, OperaSidebarAction, SidebarAction} from "./types";

type Color = string | ColorArray;
type ColorArray = chrome.action.ColorArray;

type OpenOptions = chrome.sidePanel.OpenOptions;
type PanelOptions = chrome.sidePanel.PanelOptions;
type PanelBehavior = chrome.sidePanel.PanelBehavior;

// Available in Firefox and Opera
const sidebarAction = (): SidebarAction => globalThis["browser"].sidebarAction || globalThis["opr"].sidebarAction;

// Chromium standard
const sidePanel = () => browser().sidePanel;

const isSidebarActionAvailable = (): boolean => !!sidebarAction();

const isSidePanelAvailable = (): boolean => !!sidePanel();

// Methods
export const getSidebarOptions = (tabId?: number): Promise<PanelOptions> =>
    new Promise<PanelOptions>((resolve, reject) => {
        if (!isSidePanelAvailable()) {
            throw new Error("The chrome.sidePanel.getOptions API is not supported for this browser");
        }

        sidePanel().getOptions({tabId}, options => {
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
        if (!isSidePanelAvailable()) {
            throw new Error("The chrome.sidePanel.getPanelBehavior API is not supported in this browser");
        }

        sidePanel().getPanelBehavior(behavior => {
            try {
                throwRuntimeError();

                resolve(behavior);
            } catch (e) {
                reject(e);
            }
        });
    });

export const canOpenSidebar = (): boolean => {
    return isSidePanelAvailable() || (isSidebarActionAvailable() && !!(sidebarAction() as FirefoxSidebarAction).open);
};

export const openSidebar = (options: OpenOptions): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        if (isSidePanelAvailable()) {
            sidePanel().open(options, () => {
                try {
                    throwRuntimeError();

                    resolve();
                } catch (e) {
                    reject(e);
                }
            });

            return;
        } else if (isSidebarActionAvailable()) {
            // Available only in Firefox

            const {open} = sidebarAction() as FirefoxSidebarAction;

            if (open) {
                open().then(resolve).catch(reject);

                return;
            }
        }

        console.warn("The sidebar open API is not supported in this browser");
    });

export const setSidebarOptions = (options?: PanelOptions): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        if (!isSidePanelAvailable()) {
            console.warn("The chrome.sidePanel.setOptions API is not supported for this browser");

            return;
        }

        sidePanel().setOptions(options || {}, () => {
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
        if (!isSidePanelAvailable()) {
            console.warn("The chrome.sidePanel.setPanelBehavior API is not supported in this browser");

            return;
        }

        sidePanel().setPanelBehavior(behavior || {}, () => {
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
    if (isSidePanelAvailable()) {
        await setSidebarOptions({tabId, path});
    } else if (isSidebarActionAvailable()) {
        await sidebarAction().setPanel({tabId, panel: path});
    } else {
        throw new Error("The sidebar set path API is not supported for this browser");
    }
};

export const getSidebarPath = async (tabId?: number): Promise<string | undefined> => {
    if (isSidePanelAvailable()) {
        return (await getSidebarOptions(tabId)).path;
    } else if (isSidebarActionAvailable()) {
        // opr.sidebarAction.getPanel returned path in the following format
        // chrome-extension://{extension_id}/sidebar.html
        return new URL(await sidebarAction().getPanel({tabId})).pathname;
    } else {
        throw new Error("The sidebar get path API is not supported for this browser");
    }
};

export const setSidebarTitle = async (title: string | number, tabId?: number): Promise<void> => {
    if (!isSidebarActionAvailable()) {
        console.warn("The opr.sidebarAction.setTitle API is supported only in Opera");

        return;
    }

    await sidebarAction().setTitle({tabId, title: title.toString()});
};

export const setSidebarBadgeText = async (text: string | number, tabId?: number): Promise<void> => {
    if (isSidebarActionAvailable()) {
        const {setBadgeText} = sidebarAction() as OperaSidebarAction;

        if (setBadgeText) {
            setBadgeText({tabId, text: text.toString()});

            return;
        }
    }

    console.warn("The opr.sidebarAction.setBadgeText API is supported only in Opera");
};

export const setSidebarBadgeTextColor = async (color: Color, tabId?: number): Promise<void> => {
    if (isSidebarActionAvailable()) {
        const {setBadgeTextColor} = sidebarAction() as OperaSidebarAction;

        if (setBadgeTextColor) {
            setBadgeTextColor({tabId, color});

            return;
        }
    }

    console.warn("The opr.sidebarAction.setBadgeTextColor API is supported only in Opera");
};

export const setSidebarBadgeBgColor = async (color: Color, tabId?: number): Promise<void> => {
    if (isSidebarActionAvailable()) {
        const {setBadgeBackgroundColor} = sidebarAction() as OperaSidebarAction;

        if (setBadgeBackgroundColor) {
            setBadgeBackgroundColor({tabId, color});

            return;
        }
    }

    console.warn("The opr.sidebarAction.setBadgeBackgroundColor API is supported only in Opera");
};

export const getSidebarTitle = async (tabId?: number): Promise<string> => {
    if (!isSidebarActionAvailable()) {
        throw new Error("The sidebar get title API is supported only for this browser");
    }

    return sidebarAction().getTitle({tabId});
};

export const getSidebarBadgeText = (tabId?: number): Promise<string> =>
    new Promise<string>((resolve, reject) => {
        if (isSidebarActionAvailable()) {
            const {getBadgeText} = sidebarAction() as OperaSidebarAction;

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
        if (isSidebarActionAvailable()) {
            const {getBadgeTextColor} = sidebarAction() as OperaSidebarAction;

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
        if (isSidebarActionAvailable()) {
            const {getBadgeBackgroundColor} = sidebarAction() as OperaSidebarAction;

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
