import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type DownloadItem = chrome.downloads.DownloadItem;
type DownloadQuery = chrome.downloads.DownloadQuery;
type DownloadState = chrome.downloads.State;
type DownloadOptions = chrome.downloads.DownloadOptions;
type GetFileIconOptions = chrome.downloads.GetFileIconOptions;

const downloads = () => browser().downloads;

export class BlockDownloadError extends Error {}

// Methods
export const acceptDownloadDanger = (downloadId: number): Promise<void> =>
    callWithPromise(cb => downloads().acceptDanger(downloadId, cb));

export const cancelDownload = (downloadId: number): Promise<void> =>
    callWithPromise(cb => downloads().cancel(downloadId, cb));

export const download = async (options: DownloadOptions): Promise<number> => {
    const downloadId = await callWithPromise<number>(cb =>
        downloads().download({conflictAction: "uniquify", ...options}, cb)
    );

    if (typeof downloadId !== "number") {
        throw new Error("Download id not created");
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const item = await findDownload(downloadId);

    if (!item) {
        throw new BlockDownloadError("Download item not found after created");
    }

    const {error, state} = item;

    if (state === "interrupted") {
        if (error === "USER_CANCELED") {
            throw new BlockDownloadError("Requires user permission to upload");
        }

        throw new Error(`Download error: ${error}`);
    }

    return downloadId;
};

export const eraseDownload = (query: DownloadQuery): Promise<number[]> =>
    callWithPromise(cb => downloads().erase(query, cb));

export const getDownloadFileIcon = (downloadId: number, options: GetFileIconOptions): Promise<string | undefined> =>
    callWithPromise(cb => downloads().getFileIcon(downloadId, options, cb));

export const openDownload = (downloadId: number): Promise<void> =>
    callWithPromise(cb => downloads().open(downloadId, cb));

export const pauseDownload = (downloadId: number): Promise<void> =>
    callWithPromise(cb => downloads().pause(downloadId, cb));

export const removeDownloadFile = (downloadId: number): Promise<void> =>
    callWithPromise(cb => downloads().removeFile(downloadId, cb));

export const resumeDownload = (downloadId: number): Promise<void> =>
    callWithPromise(cb => downloads().resume(downloadId, cb));

export const searchDownloads = (query: DownloadQuery): Promise<DownloadItem[]> =>
    callWithPromise(cb => downloads().search(query, cb));

export const setDownloadsUiOptions = (enabled: boolean): Promise<void> =>
    callWithPromise(cb => downloads().setUiOptions({enabled}, cb));

export const showDownloadFolder = (): void => downloads().showDefaultFolder();

// Custom Methods
export const showDownload = async (downloadId: number): Promise<boolean> => {
    if (!(await isDownloadExists(downloadId))) {
        return false;
    }

    downloads().show(downloadId);

    return true;
};

export const findDownload = async (downloadId: number): Promise<DownloadItem | undefined> => {
    const items = await searchDownloads({id: downloadId});

    return items[0];
};

export const isDownloadExists = async (downloadId: number): Promise<boolean | undefined> => {
    const item = await findDownload(downloadId);

    return item?.exists;
};

export const getDownloadState = async (downloadId?: number): Promise<`${DownloadState}` | undefined> => {
    if (downloadId === undefined) {
        return;
    }

    const item = await findDownload(downloadId);

    return item?.state;
};

// Events
export const onDownloadsChanged = (
    callback: Parameters<typeof chrome.downloads.onChanged.addListener>[0]
): (() => void) => {
    return handleListener(downloads().onChanged, callback);
};

export const onDownloadsCreated = (
    callback: Parameters<typeof chrome.downloads.onCreated.addListener>[0]
): (() => void) => {
    return handleListener(downloads().onCreated, callback);
};

export const onDownloadsDeterminingFilename = (
    callback: Parameters<typeof chrome.downloads.onDeterminingFilename.addListener>[0]
): (() => void) => {
    return handleListener(downloads().onDeterminingFilename, callback);
};
