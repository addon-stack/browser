import {onDownloadsChanged, onDownloadsCreated, onDownloadsDeterminingFilename} from "@addon-core/browser";

const events = {onDownloadsChanged, onDownloadsCreated, onDownloadsDeterminingFilename};

type Expected = {
    onDownloadsChanged: (callback: Parameters<typeof chrome.downloads.onChanged.addListener>[0]) => () => void;
    onDownloadsCreated: (callback: Parameters<typeof chrome.downloads.onCreated.addListener>[0]) => () => void;
    onDownloadsDeterminingFilename: (callback: Parameters<typeof chrome.downloads.onDeterminingFilename.addListener>[0]) => () => void;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof events, Expected> = true;
void [events, signaturesUnchanged];

const unsubscribe: () => void = onDownloadsDeterminingFilename((item, suggest) => {
    const download: chrome.downloads.DownloadItem = item;
    const suggestion: chrome.downloads.FilenameSuggestion = {filename: download.filename, conflictAction: "uniquify"};
    suggest(suggestion);
    suggest();

    return true;
});

unsubscribe();

onDownloadsChanged(delta => {
    const nativeDelta: chrome.downloads.DownloadDelta = delta;
    void nativeDelta;
});

onDownloadsCreated(item => {
    const nativeItem: chrome.downloads.DownloadItem = item;
    void nativeItem;
});

// @ts-expect-error Download subscriptions accept no registration filter.
onDownloadsCreated(() => undefined, {});
// @ts-expect-error Changed events carry a delta, not a complete download item.
onDownloadsChanged((_item: chrome.downloads.DownloadItem) => undefined);
// @ts-expect-error The second argument is a suggestion callback, not a filename.
onDownloadsDeterminingFilename((_item, _filename: string) => undefined);

onDownloadsDeterminingFilename((_item, suggest) => {
    // @ts-expect-error Filename suggestions must be objects.
    suggest("archive.zip");
});
