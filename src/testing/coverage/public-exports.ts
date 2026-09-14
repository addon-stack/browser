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
    ...entries("alarms", "method-wrapper", "behavioral", ["createAlarmIfNotExists"]),
    ...entries("alarms", "event-wrapper", "event", ["onAlarm", "onSpecificAlarm"]),

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

export const EXPECTED_ROOT_TYPESCRIPT_EXPORT_COUNT = 333;
export const EXPECTED_ROOT_RUNTIME_EXPORT_COUNT = 330;

export const getPublicExportCoverage = (name: string): PublicExportCoverageEntry | undefined =>
    PUBLIC_EXPORT_COVERAGE.find(entry => entry.name === name);
