import {
    acceptDownloadDanger,
    BlockDownloadError,
    cancelDownload,
    download,
    eraseDownload,
    findDownload,
    getDownloadFileIcon,
    getDownloadState,
    isDownloadExists,
    openDownload,
    pauseDownload,
    removeDownloadFile,
    resumeDownload,
    searchDownloads,
    setDownloadsUiOptions,
    showDownload,
    showDownloadFolder,
} from "@addon-core/browser";

const methods = {
    acceptDownloadDanger, cancelDownload, download, eraseDownload, findDownload,
    getDownloadFileIcon, getDownloadState, isDownloadExists, openDownload,
    pauseDownload, removeDownloadFile, resumeDownload, searchDownloads,
    setDownloadsUiOptions, showDownload, showDownloadFolder,
};

type Expected = {
    acceptDownloadDanger: (id: number) => Promise<void>;
    cancelDownload: (id: number) => Promise<void>;
    download: (options: chrome.downloads.DownloadOptions) => Promise<number>;
    eraseDownload: (query: chrome.downloads.DownloadQuery) => Promise<number[]>;
    findDownload: (id: number) => Promise<chrome.downloads.DownloadItem | undefined>;
    getDownloadFileIcon: (id: number, options: chrome.downloads.GetFileIconOptions) => Promise<string | undefined>;
    getDownloadState: (id?: number) => Promise<`${chrome.downloads.State}` | undefined>;
    isDownloadExists: (id: number) => Promise<boolean | undefined>;
    openDownload: (id: number) => Promise<void>;
    pauseDownload: (id: number) => Promise<void>;
    removeDownloadFile: (id: number) => Promise<void>;
    resumeDownload: (id: number) => Promise<void>;
    searchDownloads: (query: chrome.downloads.DownloadQuery) => Promise<chrome.downloads.DownloadItem[]>;
    setDownloadsUiOptions: (enabled: boolean) => Promise<void>;
    showDownload: (id: number) => Promise<boolean>;
    showDownloadFolder: () => void;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
const error: Error = new BlockDownloadError("Blocked");
void [methods, signaturesUnchanged, error];

// @ts-expect-error A download URL is required.
download({filename: "archive.zip"});
// @ts-expect-error Download ids remain numeric.
findDownload("41");
// @ts-expect-error Icon options remain required.
getDownloadFileIcon(41);
