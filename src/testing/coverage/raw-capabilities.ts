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
    /** Overrides only on explicitly context-bound facades; `coverage` continues to describe the root facade. */
    readonly contextCoverage?: RawCapabilityCoverage;
    readonly contextInvocation?: RawMethodInvocation;
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
 * Raw WebExtension members used by production wrappers and supported consumers (including Storage). The harness may
 * model a member statefully or expose a configurable test double, but it must
 * never synthesize an unlisted browser capability.
 */
export const RAW_CAPABILITY_COVERAGE: readonly RawCapabilityEntry[] = [
    ...["local", "sync", "session", "managed"].flatMap(area => [
        ...methodCapabilities(`storage.${area}`, "stateful", {chrome: "dual", browser: "dual"}, ["get", "set", "remove", "clear", "getKeys"], {
            get: ["all", "string", "string[]", "defaults"],
            set: [area === "managed" ? "read-only" : "serialized enumerable data"],
        }),
        ...methodCapabilities(`storage.${area}`, area === "local" || area === "sync" ? "stateful" : "configurable", {chrome: "dual", browser: "dual"}, ["getBytesInUse"]),
        ...eventCapabilities(`storage.${area}`, ["onChanged"]),
    ]),
    ...eventCapabilities("storage", ["onChanged"]),
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

    ...methodCapabilities("offscreen", "stateful", {chrome: "dual", browser: "dual"}, [
        "closeDocument",
        "createDocument",
        "hasDocument",
    ], {
        createDocument: ["same-extension url", "nonempty known reasons", "string justification", "single document; explicit beforeCreate gate"],
        closeDocument: ["registered offscreen document and context cleanup; explicit beforeClose gate"],
        hasDocument: ["shared registry; ambiguous multiple contexts fail"],
    }),

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
].map(entry => {
    if (entry.path === "runtime.sendMessage" || entry.path === "tabs.sendMessage") {
        return {...entry, contextCoverage: "stateful", contextInvocation: "dual"} as const;
    }

    if (entry.path === "runtime.onMessage") return {...entry, contextCoverage: "event"} as const;

    return entry;
});

export const getRawCapability = (path: string): RawCapabilityEntry | undefined =>
    RAW_CAPABILITY_COVERAGE.find(entry => entry.path === path);
