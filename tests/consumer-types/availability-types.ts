import {
    type ApiMethodName,
    isAvailableAction,
    isAvailableAlarms,
    isAvailableAudio,
    isAvailableBookmarks,
    isAvailableBrowsingData,
    isAvailableCommands,
    isAvailableContextMenus,
    isAvailableCookies,
    isAvailableDnr,
    isAvailableDocumentScan,
    isAvailableDownloads,
    isAvailableExtension,
    isAvailableHistory,
    isAvailableI18n,
    isAvailableIdentity,
    isAvailableIdle,
    isAvailableManagement,
    isAvailableNotifications,
    isAvailableOffscreen,
    isAvailablePermissions,
    isAvailableRuntime,
    isAvailableScripting,
    isAvailableSearch,
    isAvailableSidebar,
    isAvailableTabCapture,
    isAvailableTabGroups,
    isAvailableTabs,
    isAvailableTopSites,
    isAvailableUserScripts,
    isAvailableWebNavigation,
    isAvailableWebRequest,
    isAvailableWindows,
} from "@addon-core/browser";

const checks = {
    isAvailableAction,
    isAvailableAlarms,
    isAvailableAudio,
    isAvailableBookmarks,
    isAvailableBrowsingData,
    isAvailableCommands,
    isAvailableContextMenus,
    isAvailableCookies,
    isAvailableDnr,
    isAvailableDocumentScan,
    isAvailableDownloads,
    isAvailableExtension,
    isAvailableHistory,
    isAvailableI18n,
    isAvailableIdentity,
    isAvailableIdle,
    isAvailableManagement,
    isAvailableNotifications,
    isAvailableOffscreen,
    isAvailablePermissions,
    isAvailableRuntime,
    isAvailableScripting,
    isAvailableSearch,
    isAvailableSidebar,
    isAvailableTabCapture,
    isAvailableTabGroups,
    isAvailableTabs,
    isAvailableTopSites,
    isAvailableUserScripts,
    isAvailableWebNavigation,
    isAvailableWebRequest,
    isAvailableWindows,
};

type Expected = {[Name in keyof typeof checks]: () => boolean};
const namespaceChecks: Expected = checks;
void namespaceChecks;

const nativeMethod: ApiMethodName<typeof chrome.tabs> = "query";
const optionalMethod: ApiMethodName<{run?: () => void; label: string; missing?: undefined}> = "run";
const unionMethod: ApiMethodName<{first(): void} | {second(): void}> = "second";
void [nativeMethod, optionalMethod, unionMethod];
// @ts-expect-error Event properties are not native methods.
const eventName: ApiMethodName<typeof chrome.tabs> = "onUpdated";
// @ts-expect-error An absent property is not a method.
const missingMethod: ApiMethodName<{missing?: undefined}> = "missing";
void [eventName, missingMethod];

for (const check of Object.values(checks)) {
    const result: boolean = check();
    void result;
}

isAvailableTabs("query");
isAvailableAction("getBadgeTextColor");
isAvailableAction("isEnabled");
isAvailableCookies("getPartitionKey");
isAvailablePermissions("addHostAccessRequest");
isAvailableDnr("testMatchOutcome");
isAvailableSidebar("isOpen");
isAvailableSidebar("getOptions");
// @ts-expect-error Only native method names in the selected namespace are accepted.
isAvailableTabs("getBadgeText");
// @ts-expect-error Events are not methods.
isAvailableTabs("onUpdated");
// @ts-expect-error Constants are not methods.
isAvailableTabs("TAB_ID_NONE");
// @ts-expect-error Availability checks are synchronous.
const pending: Promise<boolean> = isAvailableUserScripts();
void pending;
