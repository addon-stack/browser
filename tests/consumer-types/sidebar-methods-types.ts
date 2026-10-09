import {canCloseSidebar, canOpenSidebar, clearSidebarBadgeText, closeSidebar, getSidebarBadgeBgColor, getSidebarBadgeText, getSidebarBadgeTextColor, getSidebarBehavior, getSidebarOptions, getSidebarPath, getSidebarTitle, isOpenSidebar, openSidebar, setSidebarBadgeBgColor, setSidebarBadgeText, setSidebarBadgeTextColor, setSidebarBehavior, setSidebarIcon, setSidebarOptions, setSidebarPath, setSidebarTitle, SidebarError, toggleSidebar} from "@addon-core/browser";

type Color = string | ColorArray;
type ColorArray = chrome.extensionTypes.ColorArray;
type OpenOptions = chrome.sidePanel.OpenOptions;
type CloseOptions = chrome.sidePanel.CloseOptions;
type PanelOptions = chrome.sidePanel.PanelOptions;
type PanelBehavior = chrome.sidePanel.PanelBehavior;
type IconDetails = opr.sidebarAction.IconDetails;

const methods = {getSidebarOptions, getSidebarBehavior, canOpenSidebar, canCloseSidebar, openSidebar, closeSidebar, setSidebarOptions, setSidebarBehavior, isOpenSidebar, toggleSidebar, setSidebarPath, getSidebarPath, setSidebarTitle, setSidebarBadgeText, clearSidebarBadgeText, setSidebarIcon, setSidebarBadgeTextColor, setSidebarBadgeBgColor, getSidebarTitle, getSidebarBadgeText, getSidebarBadgeTextColor, getSidebarBadgeBgColor};

type Expected = {
    getSidebarOptions: (tabId?: number) => Promise<PanelOptions>;
    getSidebarBehavior: () => Promise<PanelBehavior>;
    canOpenSidebar: () => boolean;
    canCloseSidebar: () => boolean;
    openSidebar: (options: OpenOptions) => Promise<void>;
    closeSidebar: (options: CloseOptions) => Promise<void>;
    setSidebarOptions: (options?: PanelOptions) => Promise<void>;
    setSidebarBehavior: (behavior?: PanelBehavior) => Promise<void>;
    isOpenSidebar: (windowId?: number) => Promise<boolean>;
    toggleSidebar: () => Promise<void>;
    setSidebarPath: (path: string, tabId?: number) => Promise<void>;
    getSidebarPath: (tabId?: number) => Promise<string | undefined>;
    setSidebarTitle: (title: string | number, tabId?: number) => Promise<void>;
    setSidebarBadgeText: (text: string | number, tabId?: number) => Promise<void>;
    clearSidebarBadgeText: (tabId?: number) => Promise<void>;
    setSidebarIcon: (details: IconDetails) => Promise<void>;
    setSidebarBadgeTextColor: (color: Color, tabId?: number) => Promise<void>;
    setSidebarBadgeBgColor: (color: Color, tabId?: number) => Promise<void>;
    getSidebarTitle: (tabId?: number) => Promise<string>;
    getSidebarBadgeText: (tabId?: number) => Promise<string>;
    getSidebarBadgeTextColor: (tabId?: number) => Promise<ColorArray>;
    getSidebarBadgeBgColor: (tabId?: number) => Promise<ColorArray>;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
const error: Error = new SidebarError("Unsupported sidebar operation");
void [methods, signaturesUnchanged, error];

const nativeIconWithoutCallback: void = opr.sidebarAction.setIcon({path: "icon.png"});
const nativeIconWithCallback: void = opr.sidebarAction.setIcon({path: "icon.png"}, () => {});
// @ts-expect-error Opera setIcon completes through its callback, not a returned Promise.
const nativeIconPromise: Promise<void> = opr.sidebarAction.setIcon({path: "icon.png"});
void [nativeIconWithoutCallback, nativeIconWithCallback, nativeIconPromise];
