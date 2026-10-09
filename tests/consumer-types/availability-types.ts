import {
    isAvailableAction,
    isAvailableAlarms,
    isAvailableAudio,
    isAvailableBrowsingData,
    isAvailableCommands,
    isAvailableContextMenus,
    isAvailableCookies,
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
    isAvailableSidebar,
    isAvailableTabCapture,
    isAvailableTabs,
    isAvailableUserScripts,
    isAvailableWebNavigation,
    isAvailableWebRequest,
    isAvailableWindows,
} from "@addon-core/browser";

const checks = {
    isAvailableAction,
    isAvailableAlarms,
    isAvailableAudio,
    isAvailableBrowsingData,
    isAvailableCommands,
    isAvailableContextMenus,
    isAvailableCookies,
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
    isAvailableSidebar,
    isAvailableTabCapture,
    isAvailableTabs,
    isAvailableUserScripts,
    isAvailableWebNavigation,
    isAvailableWebRequest,
    isAvailableWindows,
};

type Expected = {[Name in keyof typeof checks]: () => boolean};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const exactSignatures: Equal<typeof checks, Expected> = true;
void exactSignatures;

for (const check of Object.values(checks)) {
    const result: boolean = check();
    void result;
}

// @ts-expect-error Availability checks do not take namespace or method arguments.
isAvailableTabs("query");
// @ts-expect-error Availability checks are synchronous.
const pending: Promise<boolean> = isAvailableUserScripts();
void pending;
