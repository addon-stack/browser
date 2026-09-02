import type {ConfigurableBrowserApi} from "./configurable";
import type {BrowserEventHarness} from "./event";
import type {BrowserMethod, BrowserMethodCall, BrowserMethodCallback, BrowserMethodObservedInvocation} from "./method";

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

export interface BrowserHarnessCall {
    api: string;
    args: readonly unknown[];
    callback?: BrowserMethodCallback;
    invocation: BrowserMethodObservedInvocation;
    sequence: number;
}

export interface RuntimeLastErrorController {
    readonly current: chrome.runtime.LastError | undefined;
    runWithLastError<T>(error: unknown, callback: () => T): T;
}

export type AnyBrowserMethod = BrowserMethod<(...args: never[]) => unknown, unknown>;
export type AnyBrowserEvent = BrowserEventHarness<readonly unknown[]>;

export type {BrowserEventHarness, BrowserMethod, BrowserMethodCall, BrowserMethodObservedInvocation};
