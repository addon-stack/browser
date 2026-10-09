import {
    onBookmarkChanged, onBookmarkChildrenReordered, onBookmarkCreated, onBookmarkMoved,
    onBookmarkRemoved, onBookmarksImportBegan, onBookmarksImportEnded,
} from "@addon-core/browser";

type NativeArguments = {
    onBookmarkCreated: Parameters<typeof chrome.bookmarks.onCreated.addListener>;
    onBookmarkRemoved: Parameters<typeof chrome.bookmarks.onRemoved.addListener>;
    onBookmarkChanged: [callback: (id: string, changeInfo: {title?: string; url?: string}) => void];
    onBookmarkMoved: Parameters<typeof chrome.bookmarks.onMoved.addListener>;
    onBookmarkChildrenReordered: Parameters<typeof chrome.bookmarks.onChildrenReordered.addListener>;
    onBookmarksImportBegan: Parameters<typeof chrome.bookmarks.onImportBegan.addListener>;
    onBookmarksImportEnded: Parameters<typeof chrome.bookmarks.onImportEnded.addListener>;
};

const wrappers = {
    onBookmarkCreated, onBookmarkRemoved, onBookmarkChanged, onBookmarkMoved,
    onBookmarkChildrenReordered, onBookmarksImportBegan, onBookmarksImportEnded,
};

type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const exact: Equal<typeof wrappers, Expected> = true;
void [wrappers, exact];

const off: () => void = onBookmarkCreated(async (id, node) => {
    const values: [string, string, "bookmark" | "folder" | "separator" | undefined] = [id, node.title, node.type];
    void values;
});

off();

onBookmarkChanged((_id, changeInfo) => {
    const title: string | undefined = changeInfo.title;
    const url: string | undefined = changeInfo.url;
    void [title, url];
    // @ts-expect-error Firefox URL-only changes do not include title.
    const requiredTitle: string = changeInfo.title;
    void requiredTitle;
});

// @ts-expect-error Basic subscriptions take no registration filters.
onBookmarkChanged(() => undefined, {});
// @ts-expect-error The ID is a string.
onBookmarkRemoved((_id: number) => undefined);
// @ts-expect-error Import events have no payload.
onBookmarksImportBegan((_id: string) => undefined);
