import {
    connect,
    connectNative,
    getBrowserInfo,
    getContexts,
    getId,
    getManifest,
    getManifestVersion,
    getPackageDirectoryEntry,
    getPlatformInfo,
    getUrl,
    isManifestVersion3,
    openOptionsPage,
    reload,
    requestUpdateCheck,
    restart,
    restartAfterDelay,
    sendMessage,
    setUninstallUrl,
} from "@addon-core/browser";

const methods = {
    connect, connectNative, getBrowserInfo, getContexts, getId, getManifest, getManifestVersion,
    getPackageDirectoryEntry, getPlatformInfo, getUrl, isManifestVersion3, openOptionsPage,
    reload, requestUpdateCheck, restart, restartAfterDelay, sendMessage, setUninstallUrl,
};

type Expected = {
    connect: (extensionId: string, connectInfo?: object) => chrome.runtime.Port;
    connectNative: (application: string) => chrome.runtime.Port;
    getBrowserInfo: () => Promise<browser.runtime.BrowserInfo>;
    getContexts: (filter: chrome.runtime.ContextFilter) => Promise<chrome.runtime.ExtensionContext[]>;
    getId: () => string;
    getManifest: () => chrome.runtime.Manifest;
    getManifestVersion: () => 2 | 3;
    getPackageDirectoryEntry: () => Promise<FileSystemDirectoryEntry>;
    getPlatformInfo: () => Promise<chrome.runtime.PlatformInfo>;
    getUrl: (path: string) => string;
    isManifestVersion3: () => boolean;
    openOptionsPage: () => Promise<void>;
    reload: () => void;
    requestUpdateCheck: () => Promise<{
        status: `${chrome.runtime.RequestUpdateCheckStatus}`;
        details?: chrome.runtime.UpdateCheckDetails;
    }>;
    restart: () => void;
    restartAfterDelay: (seconds: number) => Promise<void>;
    sendMessage: <M = any, R = any>(message: M) => Promise<R>;
    setUninstallUrl: (url: string) => Promise<void>;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
const response: Promise<{answer: number}> = sendMessage<{question: string}, {answer: number}>({question: "ping"});
void [methods, signaturesUnchanged, response];

// @ts-expect-error Message input retains its explicit generic type.
sendMessage<{question: string}, {answer: number}>({question: 42});
// @ts-expect-error Connection ids remain required.
connect();
// @ts-expect-error Restart delay must be numeric.
restartAfterDelay("30");
