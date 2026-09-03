export type PublicExportKind = "method-wrapper" | "event-wrapper" | "class" | "enum" | "interface";

export type PublicExportCoverage = "stateful" | "configurable" | "event" | "behavioral" | "declaration" | "unsupported";

export interface PublicExportCoverageEntry {
    readonly name: string;
    readonly module: string;
    readonly kind: PublicExportKind;
    readonly coverage: PublicExportCoverage;
}

const entries = (
    module: string,
    kind: PublicExportKind,
    coverage: PublicExportCoverage,
    names: readonly string[]
): PublicExportCoverageEntry[] => names.map(name => ({coverage, kind, module, name}));

/**
 * Classification of every export from the package root entrypoint.
 *
 * Keep this list explicit. The coverage test compares it with the TypeScript
 * compiler's view of `src/index.ts`, so adding an unclassified root export is a
 * deliberate test failure instead of an implicit fake implementation.
 */
export const PUBLIC_EXPORT_COVERAGE: readonly PublicExportCoverageEntry[] = [
    ...entries("action", "method-wrapper", "configurable", [
        "disableAction",
        "enableAction",
        "getBadgeBgColor",
        "getBadgeText",
        "getBadgeTextColor",
        "getActionPopup",
        "getActionTitle",
        "getActionUserSetting",
        "isActionEnabled",
        "openActionPopup",
        "setBadgeBgColor",
        "setBadgeText",
        "setBadgeTextColor",
        "setActionIcon",
        "setActionPopup",
        "setActionTitle",
    ]),
    ...entries("action", "method-wrapper", "behavioral", ["getDefaultPopup", "clearBadgeText"]),
    ...entries("action", "event-wrapper", "event", ["onActionClicked", "onActionUserSettingsChanged"]),

    ...entries("alarms", "method-wrapper", "configurable", [
        "clearAlarm",
        "clearAllAlarm",
        "createAlarm",
        "getAlarm",
        "getAllAlarm",
    ]),
    ...entries("alarms", "event-wrapper", "event", ["onAlarm"]),

    ...entries("audio", "method-wrapper", "configurable", [
        "getAudioDevices",
        "getAudioMute",
        "setAudioActiveDevices",
        "setAudioMute",
        "setAudioProperties",
    ]),
    ...entries("audio", "event-wrapper", "event", [
        "onAudioDeviceListChanged",
        "onAudioLevelChanged",
        "onAudioMuteChanged",
    ]),

    ...entries("browser", "method-wrapper", "behavioral", ["browser"]),

    ...entries("browserDetection", "enum", "declaration", ["BrowserName", "BrowserFamily", "BrowserGuessSource"]),
    ...entries("browserDetection", "interface", "declaration", ["BrowserGuess"]),
    ...entries("browserDetection", "method-wrapper", "behavioral", ["guessBrowser", "isBrowser", "isBrowserFamily"]),

    ...entries("browsingData", "method-wrapper", "configurable", [
        "removeBrowsingData",
        "removeAppcacheData",
        "removeCacheData",
        "removeCacheStorageData",
        "removeCookiesData",
        "removeDownloadsData",
        "removeFileSystemsData",
        "removeFormData",
        "removeHistoryData",
        "removeIndexedDBData",
        "removeLocalStorageData",
        "removePasswordsData",
        "removeServiceWorkersData",
        "removeWebSQLData",
        "getBrowsingDataSettings",
    ]),

    ...entries("commands", "method-wrapper", "configurable", ["getAllCommands"]),
    ...entries("commands", "event-wrapper", "event", ["onCommand", "onSpecificCommand"]),

    ...entries("contextMenus", "method-wrapper", "configurable", [
        "createContextMenus",
        "removeContextMenus",
        "removeAllContextMenus",
        "updateContextMenus",
    ]),
    ...entries("contextMenus", "method-wrapper", "behavioral", ["createOrUpdateContextMenu"]),
    ...entries("contextMenus", "event-wrapper", "event", ["onContextMenusClicked"]),

    ...entries("cookies", "method-wrapper", "configurable", [
        "getCookie",
        "getAllCookie",
        "getAllCookieStores",
        "getCookiePartitionKey",
        "removeCookie",
        "setCookie",
    ]),
    ...entries("cookies", "event-wrapper", "event", ["onCookieChanged"]),

    ...entries("documentScan", "method-wrapper", "configurable", [
        "cancelDocScanning",
        "closeDocScanner",
        "getDocScannerOptionGroups",
        "getDocScannerList",
        "openDocScanner",
        "readDocScanningData",
        "docScanning",
        "setDocScannerOptions",
        "startDocScanning",
    ]),

    ...entries("downloads", "class", "behavioral", ["BlockDownloadError"]),
    ...entries("downloads", "method-wrapper", "configurable", [
        "acceptDownloadDanger",
        "cancelDownload",
        "eraseDownload",
        "getDownloadFileIcon",
        "openDownload",
        "pauseDownload",
        "removeDownloadFile",
        "resumeDownload",
        "searchDownloads",
        "setDownloadsUiOptions",
        "showDownloadFolder",
    ]),
    ...entries("downloads", "method-wrapper", "behavioral", [
        "download",
        "showDownload",
        "findDownload",
        "isDownloadExists",
        "getDownloadState",
    ]),
    ...entries("downloads", "event-wrapper", "event", [
        "onDownloadsChanged",
        "onDownloadsCreated",
        "onDownloadsDeterminingFilename",
    ]),

    ...entries("env", "method-wrapper", "behavioral", ["isBackground"]),

    ...entries("extension", "method-wrapper", "configurable", [
        "getBackgroundPage",
        "getViews",
        "isAllowedFileSchemeAccess",
        "isAllowedIncognitoAccess",
        "setUpdateUrlData",
    ]),

    ...entries("history", "method-wrapper", "configurable", [
        "addHistoryUrl",
        "deleteAllHistory",
        "deleteRangeHistory",
        "deleteHistoryUrl",
        "getHistoryVisits",
        "searchHistory",
    ]),
    ...entries("history", "event-wrapper", "event", ["onHistoryVisited", "onHistoryVisitRemoved"]),

    ...entries("i18n", "method-wrapper", "configurable", [
        "detectI18Language",
        "getI18nAcceptLanguages",
        "getI18nUILanguage",
        "getI18nMessage",
    ]),
    ...entries("i18n", "method-wrapper", "behavioral", ["getDefaultLanguage"]),

    ...entries("identity", "interface", "declaration", ["LaunchWebAuthFlowDetails"]),
    ...entries("identity", "method-wrapper", "configurable", [
        "getIdentityRedirectUrl",
        "launchWebAuthFlow",
        "getAuthToken",
        "removeCachedAuthToken",
        "clearAllCachedAuthTokens",
        "getProfileUserInfo",
        "getIdentityAccounts",
    ]),
    ...entries("identity", "event-wrapper", "event", ["onIdentitySignInChanged"]),

    ...entries("idle", "method-wrapper", "configurable", [
        "getIdleAutoLockDelay",
        "queryIdleState",
        "setIdleDetectionInterval",
    ]),
    ...entries("idle", "event-wrapper", "event", ["onIdleStateChanged"]),

    ...entries("management", "method-wrapper", "configurable", [
        "createAppShortcut",
        "generateAppForLink",
        "getExtensionInfo",
        "getAllExtensionInfo",
        "getPermissionWarningsById",
        "getPermissionWarningsByManifest",
        "getCurrentExtension",
        "launchExtensionApp",
        "setExtensionEnabled",
        "setExtensionLaunchType",
        "uninstallExtension",
        "uninstallCurrentExtension",
    ]),
    ...entries("management", "event-wrapper", "event", [
        "onExtensionDisabled",
        "onExtensionEnabled",
        "onExtensionInstalled",
        "onExtensionUninstalled",
    ]),

    ...entries("notifications", "method-wrapper", "configurable", [
        "clearNotification",
        "createNotification",
        "getAllNotifications",
        "getNotificationPermissionLevel",
        "updateNotification",
    ]),
    ...entries("notifications", "method-wrapper", "behavioral", ["isAvailableNotifications", "clearAllNotifications"]),
    ...entries("notifications", "event-wrapper", "event", [
        "onNotificationsButtonClicked",
        "onNotificationsClicked",
        "onNotificationsClosed",
        "onNotificationsPermissionLevelChanged",
    ]),

    ...entries("offscreen", "method-wrapper", "configurable", ["closeOffscreen", "createOffscreen", "hasOffscreen"]),
    ...entries("offscreen", "method-wrapper", "behavioral", [
        "getOffscreenContext",
        "getOffscreenUrl",
        "getOffscreenPath",
        "hasOffscreenUrl",
        "hasOffscreenPath",
    ]),

    ...entries("permissions", "method-wrapper", "configurable", ["addHostAccessRequest", "removeHostAccessRequest"]),
    ...entries("permissions", "method-wrapper", "stateful", [
        "containsPermissions",
        "getAllPermissions",
        "removePermissions",
        "requestPermissions",
    ]),
    ...entries("permissions", "event-wrapper", "event", ["onPermissionsAdded", "onPermissionsRemoved"]),

    ...entries("runtime", "method-wrapper", "configurable", [
        "connect",
        "connectNative",
        "getPackageDirectoryEntry",
        "getPlatformInfo",
        "openOptionsPage",
        "reload",
        "requestUpdateCheck",
        "restart",
        "restartAfterDelay",
        "setUninstallUrl",
    ]),
    ...entries("runtime", "method-wrapper", "stateful", [
        "getContexts",
        "getManifest",
        "getBrowserInfo",
        "getUrl",
        "sendMessage",
    ]),
    ...entries("runtime", "method-wrapper", "behavioral", ["getId", "getManifestVersion", "isManifestVersion3"]),
    ...entries("runtime", "event-wrapper", "event", [
        "onConnect",
        "onConnectExternal",
        "onInstalled",
        "onMessage",
        "onMessageExternal",
        "onRestartRequired",
        "onStartup",
        "onSuspend",
        "onSuspendCanceled",
        "onUpdateAvailable",
        "onUserScriptConnect",
        "onUserScriptMessage",
    ]),

    ...entries("scripting", "method-wrapper", "configurable", ["executeScript", "insertCss", "removeCss"]),
    ...entries("scripting", "method-wrapper", "stateful", [
        "getRegisteredContentScripts",
        "registerContentScripts",
        "unregisterContentScripts",
        "updateContentScripts",
    ]),
    ...entries("scripting", "method-wrapper", "behavioral", ["isAvailableScripting"]),

    ...entries("sidebar", "class", "behavioral", ["SidebarError"]),
    ...entries("sidebar", "method-wrapper", "behavioral", [
        "getSidebarOptions",
        "getSidebarBehavior",
        "canOpenSidebar",
        "canCloseSidebar",
        "openSidebar",
        "closeSidebar",
        "setSidebarOptions",
        "setSidebarBehavior",
        "isOpenSidebar",
        "toggleSidebar",
        "setSidebarPath",
        "getSidebarPath",
        "setSidebarTitle",
        "setSidebarBadgeText",
        "clearSidebarBadgeText",
        "setSidebarIcon",
        "setSidebarBadgeTextColor",
        "setSidebarBadgeBgColor",
        "getSidebarTitle",
        "getSidebarBadgeText",
        "getSidebarBadgeTextColor",
        "getSidebarBadgeBgColor",
    ]),

    ...entries("tabCapture", "method-wrapper", "configurable", [
        "createTabCapture",
        "getCapturedTabs",
        "getCaptureMediaStreamId",
    ]),
    ...entries("tabCapture", "event-wrapper", "event", ["onCaptureStatusChanged"]),

    ...entries("tabs", "method-wrapper", "stateful", [
        "createTab",
        "getCurrentTab",
        "getTab",
        "queryTabs",
        "removeTab",
        "updateTab",
    ]),
    ...entries("tabs", "method-wrapper", "configurable", [
        "captureVisibleTab",
        "connectTab",
        "detectTabLanguage",
        "discardTab",
        "duplicateTab",
        "getTabZoom",
        "getTabZoomSettings",
        "goTabBack",
        "goTabForward",
        "groupTabs",
        "highlightTab",
        "moveTab",
        "moveTabs",
        "reloadTab",
        "sendTabMessage",
        "setTabZoom",
        "setTabZoomSettings",
        "ungroupTab",
        "executeScriptTab",
        "insertCssTab",
        "removeCssTab",
    ]),
    ...entries("tabs", "method-wrapper", "behavioral", [
        "getTabUrl",
        "getActiveTab",
        "queryTabIds",
        "findTab",
        "findTabById",
        "findTabByUrl",
        "updateTabAsSelected",
        "updateTabAsActive",
        "openOrCreateTab",
        "openOrCreateTabByUrl",
    ]),
    ...entries("tabs", "event-wrapper", "event", [
        "onTabActivated",
        "onTabAttached",
        "onTabCreated",
        "onTabDetached",
        "onTabHighlighted",
        "onTabMoved",
        "onTabRemoved",
        "onTabReplaced",
        "onTabUpdated",
        "onTabZoomChange",
    ]),

    ...entries("userScripts", "method-wrapper", "configurable", [
        "configureUserScriptsWorld",
        "getUserScripts",
        "getUserScriptsWorldConfigs",
        "executeUserScript",
        "registerUserScripts",
        "resetUserScriptsWorldConfigs",
        "unregisterUserScripts",
        "updateUserScripts",
    ]),
    ...entries("userScripts", "method-wrapper", "behavioral", ["isAvailableUserScripts"]),

    ...entries("webNavigation", "method-wrapper", "configurable", ["getAllFrames", "getFrame"]),
    ...entries("webNavigation", "event-wrapper", "event", [
        "onWebNavigationBeforeNavigate",
        "onWebNavigationCommitted",
        "onWebNavigationCompleted",
        "onWebNavigationCreatedNavigationTarget",
        "onWebNavigationDOMContentLoaded",
        "onWebNavigationErrorOccurred",
        "onWebNavigationHistoryStateUpdated",
        "onWebNavigationReferenceFragmentUpdated",
        "onWebNavigationTabReplaced",
    ]),

    ...entries("webRequest", "method-wrapper", "configurable", ["handlerWebRequestBehaviorChanged"]),
    ...entries("webRequest", "event-wrapper", "event", [
        "onWebRequestAuthRequired",
        "onWebRequestBeforeRedirect",
        "onWebRequestBeforeRequest",
        "onWebRequestBeforeSendHeaders",
        "onWebRequestCompleted",
        "onWebRequestErrorOccurred",
        "onWebRequestHeadersReceived",
        "onWebRequestResponseStarted",
        "onWebRequestSendHeaders",
    ]),

    ...entries("windows", "interface", "declaration", ["WindowEventFilter"]),
    ...entries("windows", "method-wrapper", "stateful", [
        "createWindow",
        "getWindow",
        "getAllWindows",
        "getCurrentWindow",
        "getLastFocusedWindow",
        "removeWindow",
        "updateWindow",
    ]),
    ...entries("windows", "event-wrapper", "event", [
        "onWindowBoundsChanged",
        "onWindowCreated",
        "onWindowFocusChanged",
        "onWindowRemoved",
    ]),
] as const;

export const TYPE_ONLY_ROOT_EXPORTS = ["BrowserGuess", "LaunchWebAuthFlowDetails", "WindowEventFilter"] as const;

export const EXPECTED_ROOT_TYPESCRIPT_EXPORT_COUNT = 331;
export const EXPECTED_ROOT_RUNTIME_EXPORT_COUNT = 328;

export const getPublicExportCoverage = (name: string): PublicExportCoverageEntry | undefined =>
    PUBLIC_EXPORT_COVERAGE.find(entry => entry.name === name);

export type RawCapabilityKind = "method" | "event" | "property";
export type RawCapabilityCoverage = "stateful" | "configurable" | "event";
export type RawMethodInvocation = "sync" | "callback" | "promise" | "dual" | "promise-tolerant" | "hybrid";

export type RawFailureChannel =
    | "none"
    | "sync-throw"
    | "callback-last-error"
    | "promise-rejection"
    | "invocation-dependent";

export interface RawCapabilityEntry {
    readonly path: string;
    readonly namespace: string;
    readonly member: string;
    readonly kind: RawCapabilityKind;
    readonly coverage: RawCapabilityCoverage;
    readonly chromeInvocation?: RawMethodInvocation;
    readonly browserInvocation?: RawMethodInvocation;
    readonly failureChannel: RawFailureChannel;
    readonly supportedOptions?: readonly string[];
}

type InvocationPair = {
    readonly chrome: RawMethodInvocation;
    readonly browser: RawMethodInvocation;
};

const callbackInvocation: InvocationPair = {browser: "dual", chrome: "callback"};
const syncInvocation: InvocationPair = {browser: "sync", chrome: "sync"};
const promiseInvocation: InvocationPair = {browser: "promise", chrome: "promise"};
const hybridInvocation: InvocationPair = {browser: "hybrid", chrome: "hybrid"};

const methodCapabilities = (
    namespace: string,
    coverage: Exclude<RawCapabilityCoverage, "event">,
    invocation: InvocationPair,
    names: readonly string[],
    supportedOptions?: Readonly<Record<string, readonly string[]>>
): RawCapabilityEntry[] =>
    names.map(member => ({
        browserInvocation: invocation.browser,
        chromeInvocation: invocation.chrome,
        coverage,
        failureChannel:
            invocation.browser === "sync" && invocation.chrome === "sync" ? "sync-throw" : "invocation-dependent",
        kind: "method",
        member,
        namespace,
        path: `${namespace}.${member}`,
        supportedOptions: supportedOptions?.[member],
    }));

const eventCapabilities = (namespace: string, names: readonly string[]): RawCapabilityEntry[] =>
    names.map(member => ({
        coverage: "event",
        failureChannel: "none",
        kind: "event",
        member,
        namespace,
        path: `${namespace}.${member}`,
    }));

const propertyCapabilities = (
    namespace: string,
    coverage: Exclude<RawCapabilityCoverage, "event">,
    names: readonly string[]
): RawCapabilityEntry[] =>
    names.map(member => ({
        coverage,
        failureChannel: "none",
        kind: "property",
        member,
        namespace,
        path: `${namespace}.${member}`,
    }));

/**
 * Raw WebExtension members used by the production wrappers. The harness may
 * model a member statefully or expose a configurable test double, but it must
 * never synthesize an unlisted browser capability.
 */
export const RAW_CAPABILITY_COVERAGE: readonly RawCapabilityEntry[] = [
    ...methodCapabilities("action", "configurable", callbackInvocation, [
        "disable",
        "enable",
        "getBadgeBackgroundColor",
        "getBadgeText",
        "getBadgeTextColor",
        "getPopup",
        "getTitle",
        "getUserSettings",
        "isEnabled",
        "openPopup",
        "setBadgeBackgroundColor",
        "setBadgeText",
        "setBadgeTextColor",
        "setIcon",
        "setPopup",
        "setTitle",
    ]),
    ...eventCapabilities("action", ["onClicked", "onUserSettingsChanged"]),
    ...methodCapabilities("browserAction", "configurable", callbackInvocation, [
        "disable",
        "enable",
        "getBadgeBackgroundColor",
        "getBadgeText",
        "getPopup",
        "getTitle",
        "setBadgeBackgroundColor",
        "setBadgeText",
        "setIcon",
        "setPopup",
        "setTitle",
    ]),
    ...eventCapabilities("browserAction", ["onClicked"]),

    ...methodCapabilities("alarms", "configurable", callbackInvocation, [
        "clear",
        "clearAll",
        "create",
        "get",
        "getAll",
    ]),
    ...eventCapabilities("alarms", ["onAlarm"]),

    ...methodCapabilities("audio", "configurable", callbackInvocation, [
        "getDevices",
        "getMute",
        "setActiveDevices",
        "setMute",
        "setProperties",
    ]),
    ...eventCapabilities("audio", ["onDeviceListChanged", "onLevelChanged", "onMuteChanged"]),

    ...methodCapabilities("browsingData", "configurable", callbackInvocation, [
        "remove",
        "removeAppcache",
        "removeCache",
        "removeCacheStorage",
        "removeCookies",
        "removeDownloads",
        "removeFileSystems",
        "removeFormData",
        "removeHistory",
        "removeIndexedDB",
        "removeLocalStorage",
        "removePasswords",
        "removeServiceWorkers",
        "removeWebSQL",
        "settings",
    ]),

    ...methodCapabilities("commands", "configurable", callbackInvocation, ["getAll"]),
    ...eventCapabilities("commands", ["onCommand"]),

    ...methodCapabilities("contextMenus", "configurable", callbackInvocation, [
        "create",
        "remove",
        "removeAll",
        "update",
    ]),
    ...eventCapabilities("contextMenus", ["onClicked"]),

    ...methodCapabilities("cookies", "configurable", callbackInvocation, [
        "get",
        "getAll",
        "getAllCookieStores",
        "getPartitionKey",
        "remove",
        "set",
    ]),
    ...eventCapabilities("cookies", ["onChanged"]),

    ...methodCapabilities("documentScan", "configurable", callbackInvocation, [
        "cancelScan",
        "closeScanner",
        "getOptionGroups",
        "getScannerList",
        "openScanner",
        "readScanData",
        "scan",
        "setOptions",
        "startScan",
    ]),

    ...methodCapabilities("downloads", "configurable", callbackInvocation, [
        "acceptDanger",
        "cancel",
        "download",
        "erase",
        "getFileIcon",
        "open",
        "pause",
        "removeFile",
        "resume",
        "search",
        "setUiOptions",
    ]),
    ...methodCapabilities("downloads", "configurable", syncInvocation, ["show", "showDefaultFolder"]),
    ...eventCapabilities("downloads", ["onChanged", "onCreated", "onDeterminingFilename"]),

    ...methodCapabilities("extension", "configurable", syncInvocation, [
        "getBackgroundPage",
        "getViews",
        "setUpdateUrlData",
    ]),
    ...methodCapabilities("extension", "configurable", callbackInvocation, [
        "isAllowedFileSchemeAccess",
        "isAllowedIncognitoAccess",
    ]),

    ...methodCapabilities("history", "configurable", callbackInvocation, [
        "addUrl",
        "deleteAll",
        "deleteRange",
        "deleteUrl",
        "getVisits",
        "search",
    ]),
    ...eventCapabilities("history", ["onVisited", "onVisitRemoved"]),

    ...methodCapabilities("i18n", "configurable", callbackInvocation, ["detectLanguage", "getAcceptLanguages"]),
    ...methodCapabilities("i18n", "configurable", syncInvocation, ["getMessage", "getUILanguage"]),

    ...methodCapabilities("identity", "configurable", syncInvocation, ["getRedirectURL"]),
    ...methodCapabilities("identity", "configurable", callbackInvocation, [
        "clearAllCachedAuthTokens",
        "getAccounts",
        "getProfileUserInfo",
        "launchWebAuthFlow",
        "removeCachedAuthToken",
    ]),
    ...methodCapabilities("identity", "configurable", hybridInvocation, ["getAuthToken"]),
    ...eventCapabilities("identity", ["onSignInChanged"]),

    ...methodCapabilities("idle", "configurable", callbackInvocation, ["getAutoLockDelay", "queryState"]),
    ...methodCapabilities("idle", "configurable", syncInvocation, ["setDetectionInterval"]),
    ...eventCapabilities("idle", ["onStateChanged"]),

    ...methodCapabilities("management", "configurable", callbackInvocation, [
        "createAppShortcut",
        "generateAppForLink",
        "get",
        "getAll",
        "getPermissionWarningsById",
        "getPermissionWarningsByManifest",
        "getSelf",
        "launchApp",
        "setEnabled",
        "setLaunchType",
        "uninstall",
        "uninstallSelf",
    ]),
    ...eventCapabilities("management", ["onDisabled", "onEnabled", "onInstalled", "onUninstalled"]),

    ...methodCapabilities("notifications", "configurable", callbackInvocation, [
        "clear",
        "create",
        "getAll",
        "getPermissionLevel",
        "update",
    ]),
    ...eventCapabilities("notifications", ["onButtonClicked", "onClicked", "onClosed", "onPermissionLevelChanged"]),

    ...methodCapabilities("offscreen", "configurable", callbackInvocation, [
        "closeDocument",
        "createDocument",
        "hasDocument",
    ]),

    ...methodCapabilities("permissions", "configurable", callbackInvocation, [
        "addHostAccessRequest",
        "removeHostAccessRequest",
    ]),
    ...methodCapabilities("permissions", "stateful", callbackInvocation, ["contains", "getAll", "remove", "request"], {
        contains: ["named permissions (membership)", "origins (http/https/file pattern containment; paths ignored)"],
        remove: ["exact stored entries; no wildcard subtraction"],
    }),
    ...eventCapabilities("permissions", ["onAdded", "onRemoved"]),

    ...propertyCapabilities("runtime", "stateful", ["id", "lastError"]),
    ...methodCapabilities("runtime", "configurable", syncInvocation, ["connect", "connectNative", "reload", "restart"]),
    ...methodCapabilities("runtime", "configurable", callbackInvocation, [
        "getPackageDirectoryEntry",
        "getPlatformInfo",
        "openOptionsPage",
        "requestUpdateCheck",
        "restartAfterDelay",
        "setUninstallURL",
    ]),
    ...methodCapabilities("runtime", "stateful", syncInvocation, ["getManifest", "getURL"]),
    ...methodCapabilities("runtime", "stateful", callbackInvocation, ["getContexts", "sendMessage"]),
    ...methodCapabilities("runtime", "stateful", promiseInvocation, ["getBrowserInfo"]),
    ...eventCapabilities("runtime", [
        "onConnect",
        "onConnectExternal",
        "onInstalled",
        "onMessage",
        "onMessageExternal",
        "onRestartRequired",
        "onStartup",
        "onSuspend",
        "onSuspendCanceled",
        "onUpdateAvailable",
        "onUserScriptConnect",
        "onUserScriptMessage",
    ]),

    ...methodCapabilities("scripting", "configurable", callbackInvocation, ["executeScript", "insertCSS", "removeCSS"]),
    ...methodCapabilities("scripting", "stateful", callbackInvocation, [
        "getRegisteredContentScripts",
        "registerContentScripts",
        "unregisterContentScripts",
        "updateContentScripts",
    ]),

    ...methodCapabilities("sidePanel", "configurable", callbackInvocation, [
        "close",
        "getOptions",
        "getPanelBehavior",
        "open",
        "setOptions",
        "setPanelBehavior",
    ]),

    ...methodCapabilities("tabCapture", "configurable", callbackInvocation, [
        "capture",
        "getCapturedTabs",
        "getMediaStreamId",
    ]),
    ...eventCapabilities("tabCapture", ["onStatusChanged"]),

    ...methodCapabilities(
        "tabs",
        "stateful",
        callbackInvocation,
        ["create", "get", "getCurrent", "query", "remove", "update"],
        {
            query: [
                "active",
                "audible",
                "autoDiscardable",
                "currentWindow",
                "discarded",
                "frozen",
                "groupId",
                "highlighted",
                "index",
                "lastFocusedWindow",
                "muted",
                "pinned",
                "splitViewId",
                "status",
                "title (literal only)",
                "url (http/https/file match-pattern subset; OR within arrays)",
                "windowId",
                "windowType",
            ],
        }
    ),
    ...methodCapabilities("tabs", "configurable", syncInvocation, ["connect"]),
    ...methodCapabilities("tabs", "configurable", callbackInvocation, [
        "captureVisibleTab",
        "detectLanguage",
        "discard",
        "duplicate",
        "executeScript",
        "getZoom",
        "getZoomSettings",
        "goBack",
        "goForward",
        "group",
        "highlight",
        "insertCSS",
        "move",
        "reload",
        "removeCSS",
        "sendMessage",
        "setZoom",
        "setZoomSettings",
        "ungroup",
    ]),
    ...eventCapabilities("tabs", [
        "onActivated",
        "onAttached",
        "onCreated",
        "onDetached",
        "onHighlighted",
        "onMoved",
        "onRemoved",
        "onReplaced",
        "onUpdated",
        "onZoomChange",
    ]),

    ...methodCapabilities("userScripts", "configurable", callbackInvocation, ["getScripts"]),
    ...methodCapabilities("userScripts", "configurable", promiseInvocation, [
        "configureWorld",
        "execute",
        "getWorldConfigurations",
        "register",
        "resetWorldConfiguration",
        "unregister",
        "update",
    ]),

    ...methodCapabilities("webNavigation", "configurable", callbackInvocation, ["getAllFrames", "getFrame"]),
    ...eventCapabilities("webNavigation", [
        "onBeforeNavigate",
        "onCommitted",
        "onCompleted",
        "onCreatedNavigationTarget",
        "onDOMContentLoaded",
        "onErrorOccurred",
        "onHistoryStateUpdated",
        "onReferenceFragmentUpdated",
        "onTabReplaced",
    ]),

    ...methodCapabilities("webRequest", "configurable", callbackInvocation, ["handlerBehaviorChanged"]),
    ...eventCapabilities("webRequest", [
        "onAuthRequired",
        "onBeforeRedirect",
        "onBeforeRequest",
        "onBeforeSendHeaders",
        "onCompleted",
        "onErrorOccurred",
        "onHeadersReceived",
        "onResponseStarted",
        "onSendHeaders",
    ]),

    ...methodCapabilities("windows", "stateful", callbackInvocation, [
        "create",
        "get",
        "getAll",
        "getCurrent",
        "getLastFocused",
        "remove",
        "update",
    ]),
    ...eventCapabilities("windows", ["onBoundsChanged", "onCreated", "onFocusChanged", "onRemoved"]),

    ...methodCapabilities("browser.sidebarAction", "configurable", promiseInvocation, [
        "close",
        "getPanel",
        "getTitle",
        "isOpen",
        "open",
        "setIcon",
        "setPanel",
        "setTitle",
        "toggle",
    ]),
    ...methodCapabilities("opr.sidebarAction", "configurable", callbackInvocation, [
        "getBadgeBackgroundColor",
        "getBadgeText",
        "getBadgeTextColor",
        "getPanel",
        "getTitle",
    ]),
    ...methodCapabilities("opr.sidebarAction", "configurable", syncInvocation, [
        "setBadgeBackgroundColor",
        "setBadgeText",
        "setBadgeTextColor",
        "setIcon",
        "setPanel",
        "setTitle",
    ]),
] as const;

export const getRawCapability = (path: string): RawCapabilityEntry | undefined =>
    RAW_CAPABILITY_COVERAGE.find(entry => entry.path === path);
