import {browser} from "../browser";
import {callWithPromise} from "../utils";

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;
type CreateDetails = chrome.bookmarks.CreateDetails;
type MoveDestination = chrome.bookmarks.MoveDestination;
type SearchQuery = chrome.bookmarks.SearchQuery;
type UpdateChanges = chrome.bookmarks.UpdateChanges;

const bookmarks = () => browser().bookmarks;

export const getBookmarks = (idOrIds: string | [string, ...string[]]): Promise<BookmarkTreeNode[]> =>
    callWithPromise(cb => bookmarks().get(idOrIds, cb));

export const getBookmarkTree = (): Promise<BookmarkTreeNode[]> =>
    callWithPromise(cb => bookmarks().getTree(cb));

export const getBookmarkSubTree = (id: string): Promise<BookmarkTreeNode[]> =>
    callWithPromise(cb => bookmarks().getSubTree(id, cb));

export const getBookmarkChildren = (id: string): Promise<BookmarkTreeNode[]> =>
    callWithPromise(cb => bookmarks().getChildren(id, cb));

export const getRecentBookmarks = (count: number): Promise<BookmarkTreeNode[]> =>
    callWithPromise(cb => bookmarks().getRecent(count, cb));

export const searchBookmarks = (query: string | SearchQuery): Promise<BookmarkTreeNode[]> =>
    callWithPromise(cb => bookmarks().search(query, cb));

export const createBookmark = (details: CreateDetails): Promise<BookmarkTreeNode> =>
    callWithPromise(cb => bookmarks().create(details, cb));

export const updateBookmark = (id: string, changes: UpdateChanges): Promise<BookmarkTreeNode> =>
    callWithPromise(cb => bookmarks().update(id, changes, cb));

export const moveBookmark = (id: string, destination: MoveDestination): Promise<BookmarkTreeNode> =>
    callWithPromise(cb => bookmarks().move(id, destination, cb));

export const removeBookmark = (id: string): Promise<void> =>
    callWithPromise(cb => bookmarks().remove(id, cb));

export const removeBookmarkTree = (id: string): Promise<void> =>
    callWithPromise(cb => bookmarks().removeTree(id, cb));
