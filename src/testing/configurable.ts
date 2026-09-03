import {RAW_CAPABILITY_COVERAGE, type RawCapabilityEntry} from "./coverage";
import {type BrowserEventHarness, createBrowserEvent} from "./event";
import {type BrowserMethod, type BrowserMethodLastErrorController, createBrowserMethod} from "./method";
import type {BrowserHarnessCall} from "./types";

type AnyFunction = (...args: never[]) => unknown;

type BrowserEventLike = {
    addListener: AnyFunction;
    removeListener: AnyFunction;
    hasListener: AnyFunction;
};

type MethodKeys<TApi> = {
    [TKey in keyof TApi]-?: TApi[TKey] extends AnyFunction ? TKey : never;
}[keyof TApi];

type EventKeys<TApi> = {
    [TKey in keyof TApi]-?: TApi[TKey] extends BrowserEventLike ? TKey : never;
}[keyof TApi];

type Last<TValues extends readonly unknown[]> = TValues extends readonly [...infer _, infer TValue] ? TValue : never;

type CallbackArguments<TApi extends AnyFunction> = [Last<Parameters<TApi>>] extends [never]
    ? never
    : Last<Parameters<TApi>> extends (...args: infer TArgs) => unknown
        ? TArgs
        : never;

type ResultFromCallback<TArgs extends readonly unknown[]> = TArgs extends readonly []
    ? undefined
    : TArgs extends readonly [infer TResult]
        ? TResult
        : TArgs extends readonly [(infer TResult)?]
            ? TResult | undefined
            : TArgs;

export type BrowserMethodResult<TApi extends AnyFunction> =
    Awaited<ReturnType<TApi>> extends void
        ? [CallbackArguments<TApi>] extends [never]
            ? undefined
            : ResultFromCallback<CallbackArguments<TApi>>
        : Awaited<ReturnType<TApi>>;

type MethodControls<TApi> = {
    readonly [TKey in MethodKeys<TApi>]: BrowserMethod<
        Extract<TApi[TKey], (...args: never[]) => unknown>,
        BrowserMethodResult<Extract<TApi[TKey], AnyFunction>>
    >;
};

type ListenerArguments<TEvent extends BrowserEventLike> = Parameters<TEvent["addListener"]>[0] extends (
    ...args: infer TArgs
) => unknown
    ? TArgs
    : readonly unknown[];

type RegistrationArguments<TEvent extends BrowserEventLike> =
    Parameters<TEvent["addListener"]> extends readonly [unknown, ...infer TArgs] ? TArgs : readonly unknown[];

type EventControls<TApi> = {
    readonly [TKey in EventKeys<TApi>]: BrowserEventHarness<
        ListenerArguments<Extract<TApi[TKey], BrowserEventLike>>,
        RegistrationArguments<Extract<TApi[TKey], BrowserEventLike>>
    >;
};

export type BrowserNamespaceHarness<TApi> = {
    readonly api: TApi;
    reset(): void;
} & MethodControls<TApi> &
    EventControls<TApi>;

export type ActionConfigurableApi = Pick<
    typeof chrome.action,
    | "disable"
    | "enable"
    | "getBadgeBackgroundColor"
    | "getBadgeText"
    | "getBadgeTextColor"
    | "getPopup"
    | "getTitle"
    | "getUserSettings"
    | "isEnabled"
    | "onClicked"
    | "onUserSettingsChanged"
    | "openPopup"
    | "setBadgeBackgroundColor"
    | "setBadgeText"
    | "setBadgeTextColor"
    | "setIcon"
    | "setPopup"
    | "setTitle"
>;

export type BrowserActionConfigurableApi = Pick<
    typeof chrome.browserAction,
    | "disable"
    | "enable"
    | "getBadgeBackgroundColor"
    | "getBadgeText"
    | "getPopup"
    | "getTitle"
    | "onClicked"
    | "setBadgeBackgroundColor"
    | "setBadgeText"
    | "setIcon"
    | "setPopup"
    | "setTitle"
>;

export type AlarmsConfigurableApi = Pick<
    typeof chrome.alarms,
    "clear" | "clearAll" | "create" | "get" | "getAll" | "onAlarm"
>;

export type AudioConfigurableApi = Pick<
    typeof chrome.audio,
    | "getDevices"
    | "getMute"
    | "onDeviceListChanged"
    | "onLevelChanged"
    | "onMuteChanged"
    | "setActiveDevices"
    | "setMute"
    | "setProperties"
>;

export type BrowsingDataConfigurableApi = Pick<
    typeof chrome.browsingData,
    | "remove"
    | "removeAppcache"
    | "removeCache"
    | "removeCacheStorage"
    | "removeCookies"
    | "removeDownloads"
    | "removeFileSystems"
    | "removeFormData"
    | "removeHistory"
    | "removeIndexedDB"
    | "removeLocalStorage"
    | "removePasswords"
    | "removeServiceWorkers"
    | "removeWebSQL"
    | "settings"
>;

export type CommandsConfigurableApi = Pick<typeof chrome.commands, "getAll" | "onCommand">;

export type ContextMenusConfigurableApi = Pick<
    typeof chrome.contextMenus,
    "create" | "onClicked" | "remove" | "removeAll" | "update"
>;

export type CookiesConfigurableApi = Pick<
    typeof chrome.cookies,
    "get" | "getAll" | "getAllCookieStores" | "getPartitionKey" | "onChanged" | "remove" | "set"
>;

export type DocumentScanConfigurableApi = Pick<
    typeof chrome.documentScan,
    | "cancelScan"
    | "closeScanner"
    | "getOptionGroups"
    | "getScannerList"
    | "openScanner"
    | "readScanData"
    | "scan"
    | "setOptions"
    | "startScan"
>;

export type DownloadsConfigurableApi = Pick<
    typeof chrome.downloads,
    | "acceptDanger"
    | "cancel"
    | "download"
    | "erase"
    | "getFileIcon"
    | "onChanged"
    | "onCreated"
    | "onDeterminingFilename"
    | "open"
    | "pause"
    | "removeFile"
    | "resume"
    | "search"
    | "setUiOptions"
    | "show"
    | "showDefaultFolder"
>;

export type ExtensionConfigurableApi = Pick<
    typeof chrome.extension,
    "getBackgroundPage" | "getViews" | "isAllowedFileSchemeAccess" | "isAllowedIncognitoAccess" | "setUpdateUrlData"
>;

export type HistoryConfigurableApi = Pick<
    typeof chrome.history,
    "addUrl" | "deleteAll" | "deleteRange" | "deleteUrl" | "getVisits" | "onVisited" | "onVisitRemoved" | "search"
>;

export type I18nConfigurableApi = Pick<
    typeof chrome.i18n,
    "detectLanguage" | "getAcceptLanguages" | "getMessage" | "getUILanguage"
>;

export type IdentityConfigurableApi = Pick<
    typeof chrome.identity,
    | "clearAllCachedAuthTokens"
    | "getAccounts"
    | "getAuthToken"
    | "getProfileUserInfo"
    | "getRedirectURL"
    | "launchWebAuthFlow"
    | "onSignInChanged"
    | "removeCachedAuthToken"
>;

export type IdleConfigurableApi = Pick<
    typeof chrome.idle,
    "getAutoLockDelay" | "onStateChanged" | "queryState" | "setDetectionInterval"
>;

export type ManagementConfigurableApi = Pick<
    typeof chrome.management,
    | "createAppShortcut"
    | "generateAppForLink"
    | "get"
    | "getAll"
    | "getPermissionWarningsById"
    | "getPermissionWarningsByManifest"
    | "getSelf"
    | "launchApp"
    | "onDisabled"
    | "onEnabled"
    | "onInstalled"
    | "onUninstalled"
    | "setEnabled"
    | "setLaunchType"
    | "uninstall"
    | "uninstallSelf"
>;

export type NotificationsConfigurableApi = Pick<
    typeof chrome.notifications,
    | "clear"
    | "create"
    | "getAll"
    | "getPermissionLevel"
    | "onButtonClicked"
    | "onClicked"
    | "onClosed"
    | "onPermissionLevelChanged"
    | "update"
>;

export type OffscreenConfigurableApi = Pick<
    typeof chrome.offscreen,
    "closeDocument" | "createDocument" | "hasDocument"
>;

export type PermissionsConfigurableApi = Pick<
    typeof chrome.permissions,
    "addHostAccessRequest" | "onAdded" | "onRemoved" | "removeHostAccessRequest"
>;

export type RuntimeConfigurableApi = Pick<
    typeof chrome.runtime,
    | "connect"
    | "connectNative"
    | "getPackageDirectoryEntry"
    | "getPlatformInfo"
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
    | "setUninstallURL"
>;

export type ScriptingConfigurableApi = Pick<typeof chrome.scripting, "executeScript" | "insertCSS" | "removeCSS">;

export type SidePanelConfigurableApi = Pick<
    typeof chrome.sidePanel,
    "close" | "getOptions" | "getPanelBehavior" | "open" | "setOptions" | "setPanelBehavior"
>;

export type TabCaptureConfigurableApi = Pick<
    typeof chrome.tabCapture,
    "capture" | "getCapturedTabs" | "getMediaStreamId" | "onStatusChanged"
>;

export type TabsConfigurableApi = Pick<
    typeof chrome.tabs,
    | "captureVisibleTab"
    | "connect"
    | "detectLanguage"
    | "discard"
    | "duplicate"
    | "executeScript"
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
    | "reload"
    | "removeCSS"
    | "setZoom"
    | "setZoomSettings"
    | "ungroup"
>;

export type UserScriptsConfigurableApi = Pick<
    typeof chrome.userScripts,
    | "configureWorld"
    | "execute"
    | "getScripts"
    | "getWorldConfigurations"
    | "register"
    | "resetWorldConfiguration"
    | "unregister"
    | "update"
>;

export type WebNavigationConfigurableApi = Pick<
    typeof chrome.webNavigation,
    | "getAllFrames"
    | "getFrame"
    | "onBeforeNavigate"
    | "onCommitted"
    | "onCompleted"
    | "onCreatedNavigationTarget"
    | "onDOMContentLoaded"
    | "onErrorOccurred"
    | "onHistoryStateUpdated"
    | "onReferenceFragmentUpdated"
    | "onTabReplaced"
>;

export type WebRequestConfigurableApi = Pick<
    typeof chrome.webRequest,
    | "handlerBehaviorChanged"
    | "onAuthRequired"
    | "onBeforeRedirect"
    | "onBeforeRequest"
    | "onBeforeSendHeaders"
    | "onCompleted"
    | "onErrorOccurred"
    | "onHeadersReceived"
    | "onResponseStarted"
    | "onSendHeaders"
>;

export type WindowsEventsConfigurableApi = Pick<
    typeof chrome.windows,
    "onBoundsChanged" | "onCreated" | "onFocusChanged" | "onRemoved"
>;

export type FirefoxSidebarActionConfigurableApi = Pick<
    typeof browser.sidebarAction,
    "close" | "getPanel" | "getTitle" | "isOpen" | "open" | "setIcon" | "setPanel" | "setTitle" | "toggle"
>;

export type OperaSidebarActionConfigurableApi = Pick<
    typeof opr.sidebarAction,
    | "getBadgeBackgroundColor"
    | "getBadgeText"
    | "getBadgeTextColor"
    | "getPanel"
    | "getTitle"
    | "setBadgeBackgroundColor"
    | "setBadgeText"
    | "setBadgeTextColor"
    | "setIcon"
    | "setPanel"
    | "setTitle"
>;

export interface ConfigurableBrowserApi {
    action: ActionConfigurableApi;
    alarms: AlarmsConfigurableApi;
    audio: AudioConfigurableApi;
    browserAction: BrowserActionConfigurableApi;
    browsingData: BrowsingDataConfigurableApi;
    commands: CommandsConfigurableApi;
    contextMenus: ContextMenusConfigurableApi;
    cookies: CookiesConfigurableApi;
    documentScan: DocumentScanConfigurableApi;
    downloads: DownloadsConfigurableApi;
    extension: ExtensionConfigurableApi;
    history: HistoryConfigurableApi;
    i18n: I18nConfigurableApi;
    identity: IdentityConfigurableApi;
    idle: IdleConfigurableApi;
    management: ManagementConfigurableApi;
    notifications: NotificationsConfigurableApi;
    offscreen: OffscreenConfigurableApi;
    permissions: PermissionsConfigurableApi;
    runtime: RuntimeConfigurableApi;
    scripting: ScriptingConfigurableApi;
    sidePanel: SidePanelConfigurableApi;
    tabCapture: TabCaptureConfigurableApi;
    tabs: TabsConfigurableApi;
    userScripts: UserScriptsConfigurableApi;
    webNavigation: WebNavigationConfigurableApi;
    webRequest: WebRequestConfigurableApi;
    windows: WindowsEventsConfigurableApi;
}

export interface ConfigurableBrowserControls {
    readonly action: BrowserNamespaceHarness<ActionConfigurableApi>;
    readonly alarms: BrowserNamespaceHarness<AlarmsConfigurableApi>;
    readonly audio: BrowserNamespaceHarness<AudioConfigurableApi>;
    readonly browserAction: BrowserNamespaceHarness<BrowserActionConfigurableApi>;
    readonly browsingData: BrowserNamespaceHarness<BrowsingDataConfigurableApi>;
    readonly commands: BrowserNamespaceHarness<CommandsConfigurableApi>;
    readonly contextMenus: BrowserNamespaceHarness<ContextMenusConfigurableApi>;
    readonly cookies: BrowserNamespaceHarness<CookiesConfigurableApi>;
    readonly documentScan: BrowserNamespaceHarness<DocumentScanConfigurableApi>;
    readonly downloads: BrowserNamespaceHarness<DownloadsConfigurableApi>;
    readonly extension: BrowserNamespaceHarness<ExtensionConfigurableApi>;
    readonly history: BrowserNamespaceHarness<HistoryConfigurableApi>;
    readonly i18n: BrowserNamespaceHarness<I18nConfigurableApi>;
    readonly identity: BrowserNamespaceHarness<IdentityConfigurableApi>;
    readonly idle: BrowserNamespaceHarness<IdleConfigurableApi>;
    readonly management: BrowserNamespaceHarness<ManagementConfigurableApi>;
    readonly notifications: BrowserNamespaceHarness<NotificationsConfigurableApi>;
    readonly offscreen: BrowserNamespaceHarness<OffscreenConfigurableApi>;
    readonly permissions: BrowserNamespaceHarness<PermissionsConfigurableApi>;
    readonly runtime: BrowserNamespaceHarness<RuntimeConfigurableApi>;
    readonly scripting: BrowserNamespaceHarness<ScriptingConfigurableApi>;
    readonly sidePanel: BrowserNamespaceHarness<SidePanelConfigurableApi>;
    readonly tabCapture: BrowserNamespaceHarness<TabCaptureConfigurableApi>;
    readonly tabs: BrowserNamespaceHarness<TabsConfigurableApi>;
    readonly userScripts: BrowserNamespaceHarness<UserScriptsConfigurableApi>;
    readonly webNavigation: BrowserNamespaceHarness<WebNavigationConfigurableApi>;
    readonly webRequest: BrowserNamespaceHarness<WebRequestConfigurableApi>;
    readonly windows: BrowserNamespaceHarness<WindowsEventsConfigurableApi>;
    readonly sidebarAction: BrowserNamespaceHarness<FirefoxSidebarActionConfigurableApi>;
    readonly operaSidebarAction: BrowserNamespaceHarness<OperaSidebarActionConfigurableApi>;
}

export interface ConfigurableNamespacesOptions {
    readonly facade: "chrome" | "browser";
    readonly lastError?: BrowserMethodLastErrorController;
    readonly nextSequence?: () => number;
}

export interface ConfigurableNamespaces {
    readonly api: ConfigurableBrowserApi;
    readonly controls: ConfigurableBrowserControls;
    readonly sidebarActionApi: FirefoxSidebarActionConfigurableApi;
    readonly operaSidebarActionApi: OperaSidebarActionConfigurableApi;
    readonly calls: readonly BrowserHarnessCall[];
    setCapability(path: string, enabled: boolean): void;
    hasCapability(path: string): boolean;
    method<TApi extends (...args: never[]) => unknown, TResult = BrowserMethodResult<TApi>>(
        path: string
    ): BrowserMethod<TApi, TResult>;
    event<TArgs extends readonly unknown[], TRegistrationArgs extends readonly unknown[] = readonly unknown[]>(
        path: string
    ): BrowserEventHarness<TArgs, TRegistrationArgs>;
    reset(): void;
}

const NO_RESULT_METHODS = new Set([
    "action.disable",
    "action.enable",
    "action.openPopup",
    "action.setBadgeBackgroundColor",
    "action.setBadgeText",
    "action.setBadgeTextColor",
    "action.setIcon",
    "action.setPopup",
    "action.setTitle",
    "alarms.create",
    "audio.setActiveDevices",
    "audio.setMute",
    "audio.setProperties",
    "browserAction.disable",
    "browserAction.enable",
    "browserAction.setBadgeBackgroundColor",
    "browserAction.setBadgeText",
    "browserAction.setIcon",
    "browserAction.setPopup",
    "browserAction.setTitle",
    "browsingData.remove",
    "browsingData.removeAppcache",
    "browsingData.removeCache",
    "browsingData.removeCacheStorage",
    "browsingData.removeCookies",
    "browsingData.removeDownloads",
    "browsingData.removeFileSystems",
    "browsingData.removeFormData",
    "browsingData.removeHistory",
    "browsingData.removeIndexedDB",
    "browsingData.removeLocalStorage",
    "browsingData.removePasswords",
    "browsingData.removeServiceWorkers",
    "browsingData.removeWebSQL",
    "contextMenus.create",
    "contextMenus.remove",
    "contextMenus.removeAll",
    "contextMenus.update",
    "downloads.acceptDanger",
    "downloads.cancel",
    "downloads.open",
    "downloads.pause",
    "downloads.removeFile",
    "downloads.resume",
    "downloads.setUiOptions",
    "extension.setUpdateUrlData",
    "history.addUrl",
    "history.deleteAll",
    "history.deleteRange",
    "history.deleteUrl",
    "idle.setDetectionInterval",
    "identity.clearAllCachedAuthTokens",
    "identity.removeCachedAuthToken",
    "management.createAppShortcut",
    "management.generateAppForLink",
    "management.launchApp",
    "management.setEnabled",
    "management.setLaunchType",
    "management.uninstall",
    "management.uninstallSelf",
    "offscreen.closeDocument",
    "offscreen.createDocument",
    "permissions.addHostAccessRequest",
    "permissions.removeHostAccessRequest",
    "runtime.openOptionsPage",
    "runtime.reload",
    "runtime.restart",
    "runtime.restartAfterDelay",
    "runtime.setUninstallURL",
    "scripting.insertCSS",
    "scripting.removeCSS",
    "sidePanel.close",
    "sidePanel.open",
    "sidePanel.setOptions",
    "sidePanel.setPanelBehavior",
    "tabs.goBack",
    "tabs.goForward",
    "tabs.insertCSS",
    "tabs.reload",
    "tabs.removeCSS",
    "tabs.setZoom",
    "tabs.setZoomSettings",
    "tabs.ungroup",
    "userScripts.configureWorld",
    "userScripts.register",
    "userScripts.resetWorldConfiguration",
    "userScripts.unregister",
    "userScripts.update",
    "webRequest.handlerBehaviorChanged",
    "browser.sidebarAction.close",
    "browser.sidebarAction.open",
    "browser.sidebarAction.setIcon",
    "browser.sidebarAction.setPanel",
    "browser.sidebarAction.setTitle",
    "browser.sidebarAction.toggle",
    "opr.sidebarAction.setBadgeBackgroundColor",
    "opr.sidebarAction.setBadgeText",
    "opr.sidebarAction.setBadgeTextColor",
    "opr.sidebarAction.setIcon",
    "opr.sidebarAction.setPanel",
    "opr.sidebarAction.setTitle",
]);

const MULTI_RESULT_METHODS = new Set(["runtime.requestUpdateCheck"]);

const isConfigurableMember = (entry: RawCapabilityEntry): boolean =>
    entry.coverage === "configurable" || entry.kind === "event";

const namespaceControl = (controls: Record<string, unknown>, api: object): Record<string, unknown> => ({
    ...controls,
    api,
    reset(): void {
        for (const control of Object.values(controls)) {
            (control as {reset(): void}).reset();
        }
    },
});

/** Creates all non-stateful raw namespaces used by the production entrypoint. */
export const createConfigurableNamespaces = (options: ConfigurableNamespacesOptions): ConfigurableNamespaces => {
    const apiNamespaces: Record<string, Record<string, unknown>> = {};
    const namespaceControls: Record<string, Record<string, unknown>> = {};
    const methods = new Map<string, BrowserMethod<(...args: never[]) => unknown, unknown>>();
    const events = new Map<string, BrowserEventHarness<readonly unknown[], readonly unknown[]>>();
    const enabled = new Set<string>();

    const entries = RAW_CAPABILITY_COVERAGE.filter(isConfigurableMember);

    for (const entry of entries) {
        const isFirefoxSidebar = entry.namespace === "browser.sidebarAction";
        const isOperaSidebar = entry.namespace === "opr.sidebarAction";
        const namespace = isFirefoxSidebar ? "sidebarAction" : isOperaSidebar ? "operaSidebarAction" : entry.namespace;
        apiNamespaces[namespace] ??= {};
        namespaceControls[namespace] ??= {};
        const namespaceApi = apiNamespaces[namespace];
        const controls = namespaceControls[namespace];

        if (entry.kind === "event") {
            const event = createBrowserEvent<readonly unknown[], readonly unknown[]>();
            events.set(entry.path, event);
            controls[entry.member] = event;
            namespaceApi[entry.member] = event.api;
            enabled.add(entry.path);
            continue;
        }

        if (entry.kind !== "method") continue;

        const invocation = options.facade === "chrome" ? entry.chromeInvocation : entry.browserInvocation;

        if (!invocation) {
            throw new Error(`Browser method "${entry.path}" has no ${options.facade} invocation contract.`);
        }

        const callbackArgs = NO_RESULT_METHODS.has(entry.path)
            ? () => []
            : MULTI_RESULT_METHODS.has(entry.path)
                ? (result: unknown) => result as readonly unknown[]
                : (result: unknown) => [result];

        const method = createBrowserMethod<(...args: never[]) => unknown, unknown>({
            callback: "last",
            callbackArgs,
            invocation,
            lastError: options.lastError,
            name: entry.path,
            nextSequence: options.nextSequence,
        });

        methods.set(entry.path, method);
        controls[entry.member] = method;
        namespaceApi[entry.member] = method.api;
        enabled.add(entry.path);
    }

    const controls = Object.fromEntries(
        Object.entries(namespaceControls).map(([namespace, members]) => [
            namespace,
            namespaceControl(members, apiNamespaces[namespace]),
        ])
    ) as unknown as ConfigurableBrowserControls;

    const api = Object.fromEntries(
        Object.entries(apiNamespaces).filter(
            ([namespace]) => namespace !== "sidebarAction" && namespace !== "operaSidebarAction"
        )
    ) as unknown as ConfigurableBrowserApi;

    const setCapability = (path: string, isEnabled: boolean): void => {
        const entry = entries.find(candidate => candidate.path === path);

        if (!entry) {
            throw new Error(`Unknown configurable browser capability "${path}".`);
        }

        const namespace =
            entry.namespace === "browser.sidebarAction"
                ? "sidebarAction"
                : entry.namespace === "opr.sidebarAction"
                    ? "operaSidebarAction"
                    : entry.namespace;

        const namespaceApi = apiNamespaces[namespace];
        const control = namespaceControls[namespace][entry.member] as {api: unknown};

        if (isEnabled) {
            namespaceApi[entry.member] = control.api;
            enabled.add(path);
        } else {
            Reflect.deleteProperty(namespaceApi, entry.member);
            enabled.delete(path);
        }
    };

    return {
        api,
        controls,
        get calls(): readonly BrowserHarnessCall[] {
            return [...methods.entries()]
                .flatMap(([path, method]) => method.calls.map(call => ({...call, api: path})))
                .sort((left, right) => left.sequence - right.sequence);
        },
        event<TArgs extends readonly unknown[], TRegistrationArgs extends readonly unknown[] = readonly unknown[]>(
            path: string
        ): BrowserEventHarness<TArgs, TRegistrationArgs> {
            const event = events.get(path);

            if (!event) throw new Error(`Unknown configurable browser event "${path}".`);

            return event as unknown as BrowserEventHarness<TArgs, TRegistrationArgs>;
        },
        hasCapability(path): boolean {
            return enabled.has(path);
        },
        method<TApi extends (...args: never[]) => unknown, TResult = BrowserMethodResult<TApi>>(
            path: string
        ): BrowserMethod<TApi, TResult> {
            const method = methods.get(path);

            if (!method) throw new Error(`Unknown configurable browser method "${path}".`);

            return method as BrowserMethod<TApi, TResult>;
        },
        operaSidebarActionApi: apiNamespaces.operaSidebarAction as unknown as OperaSidebarActionConfigurableApi,
        reset(): void {
            for (const method of methods.values()) method.reset();

            for (const event of events.values()) event.reset();

            for (const entry of entries) setCapability(entry.path, true);
        },
        setCapability,
        sidebarActionApi: apiNamespaces.sidebarAction as unknown as FirefoxSidebarActionConfigurableApi,
    };
};
