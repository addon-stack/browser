import {
    createBookmark, getBookmarkChildren, getBookmarks, getBookmarkSubTree, getBookmarkTree,
    getRecentBookmarks, isAvailableBookmarks, moveBookmark, removeBookmark, removeBookmarkTree,
    searchBookmarks, updateBookmark,
} from "@addon-core/browser";

type Node = chrome.bookmarks.BookmarkTreeNode;

type Expected = {
    isAvailableBookmarks: () => boolean;
    getBookmarks: (ids: string | [string, ...string[]]) => Promise<Node[]>;
    getBookmarkTree: () => Promise<Node[]>;
    getBookmarkSubTree: (id: string) => Promise<Node[]>;
    getBookmarkChildren: (id: string) => Promise<Node[]>;
    getRecentBookmarks: (count: number) => Promise<Node[]>;
    searchBookmarks: (query: string | chrome.bookmarks.SearchQuery) => Promise<Node[]>;
    createBookmark: (details: chrome.bookmarks.CreateDetails) => Promise<Node>;
    updateBookmark: (id: string, changes: chrome.bookmarks.UpdateChanges) => Promise<Node>;
    moveBookmark: (id: string, destination: chrome.bookmarks.MoveDestination) => Promise<Node>;
    removeBookmark: (id: string) => Promise<void>;
    removeBookmarkTree: (id: string) => Promise<void>;
};

const wrappers = {
    isAvailableBookmarks, getBookmarks, getBookmarkTree, getBookmarkSubTree, getBookmarkChildren,
    getRecentBookmarks, searchBookmarks, createBookmark, updateBookmark, moveBookmark, removeBookmark, removeBookmarkTree,
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const exact: Equal<typeof wrappers, Expected> = true;
const separator: chrome.bookmarks.CreateDetails = {parentId: "folder", type: "separator"};
const created: Promise<Node> = createBookmark(separator);
const native: Promise<Node> = browser.bookmarks.create(separator);

const callbackNative: void = chrome.bookmarks.create(separator, node => {
    const type: "bookmark" | "folder" | "separator" | undefined = node.type;
    void type;
});

void [wrappers, exact, created, native, callbackNative];

// @ts-expect-error Bookmark IDs are strings, not numeric tab IDs.
getBookmarks(1);
// @ts-expect-error Chrome's get signature requires at least one ID.
getBookmarks([]);
// @ts-expect-error Native get always returns an array, even for one ID.
const single: Promise<Node> = getBookmarks("id");
// @ts-expect-error count must be a number.
getRecentBookmarks("10");
// @ts-expect-error Use moveBookmark to change the parent.
updateBookmark("id", {parentId: "folder"});
// @ts-expect-error Firefox supports only these three node types.
createBookmark({type: "link"});
// @ts-expect-error Wrappers do not accept callbacks.
getBookmarkTree(() => undefined);
void single;
