import type {ConfigurableBrowserApi} from "./api/configurable";
import type {BrowserEventApi} from "./primitives";

export type StorageAreaTestApi = Pick<chrome.storage.StorageArea, "get" | "getKeys" | "getBytesInUse" | "set" | "remove" | "clear"> & {
    onChanged: BrowserEventApi<[Record<string, chrome.storage.StorageChange>]>;
};

export type StorageTestApi = Record<chrome.storage.AreaName, StorageAreaTestApi> & {
    onChanged: BrowserEventApi<[Record<string, chrome.storage.StorageChange>, chrome.storage.AreaName]>;
};

export type RuntimeTestApi = Pick<
    typeof chrome.runtime,
    | "connect"
    | "connectNative"
    | "getContexts"
    | "getManifest"
    | "getPackageDirectoryEntry"
    | "getPlatformInfo"
    | "getURL"
    | "id"
    | "lastError"
    | "onConnect"
    | "onConnectExternal"
    | "onInstalled"
    | "onMessage"
    | "onMessageExternal"
    | "onRestartRequired"
    | "onStartup"
    | "onSuspend"
    | "onSuspendCanceled"
    | "onUpdateAvailable"
    | "onUserScriptConnect"
    | "onUserScriptMessage"
    | "openOptionsPage"
    | "reload"
    | "requestUpdateCheck"
    | "restart"
    | "restartAfterDelay"
    | "sendMessage"
    | "setUninstallURL"
> & {
    getBrowserInfo?: typeof browser.runtime.getBrowserInfo;
};

export type PermissionsTestApi = Pick<
    typeof chrome.permissions,
    | "addHostAccessRequest"
    | "contains"
    | "getAll"
    | "onAdded"
    | "onRemoved"
    | "remove"
    | "removeHostAccessRequest"
    | "request"
>;

export type TabsTestApi = Pick<
    typeof chrome.tabs,
    | "captureVisibleTab"
    | "connect"
    | "create"
    | "detectLanguage"
    | "discard"
    | "duplicate"
    | "executeScript"
    | "get"
    | "getCurrent"
    | "getZoom"
    | "getZoomSettings"
    | "goBack"
    | "goForward"
    | "group"
    | "highlight"
    | "insertCSS"
    | "move"
    | "onActivated"
    | "onAttached"
    | "onCreated"
    | "onDetached"
    | "onHighlighted"
    | "onMoved"
    | "onRemoved"
    | "onReplaced"
    | "onUpdated"
    | "onZoomChange"
    | "query"
    | "reload"
    | "remove"
    | "removeCSS"
    | "sendMessage"
    | "setZoom"
    | "setZoomSettings"
    | "ungroup"
    | "update"
>;

export type WindowsTestApi = Pick<
    typeof chrome.windows,
    | "WINDOW_ID_CURRENT"
    | "WINDOW_ID_NONE"
    | "create"
    | "get"
    | "getAll"
    | "getCurrent"
    | "getLastFocused"
    | "onBoundsChanged"
    | "onCreated"
    | "onFocusChanged"
    | "onRemoved"
    | "remove"
    | "update"
>;

export type ScriptingTestApi = Pick<
    typeof chrome.scripting,
    | "executeScript"
    | "getRegisteredContentScripts"
    | "insertCSS"
    | "registerContentScripts"
    | "removeCSS"
    | "unregisterContentScripts"
    | "updateContentScripts"
>;

export type SidePanelTestApi = Pick<
    typeof chrome.sidePanel,
    "close" | "getOptions" | "getPanelBehavior" | "open" | "setOptions" | "setPanelBehavior"
>;

export type FirefoxSidebarActionTestApi = Pick<
    typeof browser.sidebarAction,
    "close" | "getPanel" | "getTitle" | "isOpen" | "open" | "setIcon" | "setPanel" | "setTitle" | "toggle"
>;

export type OperaSidebarActionTestApi = Pick<
    typeof opr.sidebarAction,
    | "getBadgeBackgroundColor"
    | "getBadgeText"
    | "getBadgeTextColor"
    | "getPanel"
    | "getTitle"
    | "onBlur"
    | "onFocus"
    | "setBadgeBackgroundColor"
    | "setBadgeText"
    | "setBadgeTextColor"
    | "setIcon"
    | "setPanel"
    | "setTitle"
>;

/** Explicitly supported WebExtension surface. It intentionally does not track all of `typeof chrome`. */
export type BrowserTestApi = Omit<
    ConfigurableBrowserApi,
    "permissions" | "runtime" | "scripting" | "sidePanel" | "tabs" | "windows"
> & {
    runtime: RuntimeTestApi & ConfigurableBrowserApi["runtime"];
    storage: StorageTestApi;
    permissions: PermissionsTestApi & ConfigurableBrowserApi["permissions"];
    tabs: TabsTestApi & ConfigurableBrowserApi["tabs"];
    windows: WindowsTestApi & ConfigurableBrowserApi["windows"];
    scripting: ScriptingTestApi & ConfigurableBrowserApi["scripting"];
    sidePanel?: SidePanelTestApi;
    sidebarAction?: FirefoxSidebarActionTestApi;
};

export type BrowserProfile = "chrome" | "firefox" | "opera" | "safari" | "custom";

export type ExtensionContextKind = "extensionPage" | "serviceWorker" | "backgroundPage" | "contentScript" | "none";

export type SidebarFlavor = "sidePanel" | "firefoxSidebarAction" | "operaSidebarAction" | "none";
