# bookmarks

Documentation: [Chrome Bookmarks API](https://developer.chrome.com/docs/extensions/reference/api/bookmarks),
[Firefox Bookmarks API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks).

Promise-based methods for reading, searching and editing the browser's bookmark tree, plus event
subscriptions that return an unsubscribe function. Nodes can represent bookmarks or folders;
Firefox also supports separators. Native results and errors are preserved.

## Methods

- [isAvailableBookmarks()](#isAvailableBookmarks)
- [getBookmarks()](#getBookmarks)
- [getBookmarkTree()](#getBookmarkTree)
- [getBookmarkSubTree()](#getBookmarkSubTree)
- [getBookmarkChildren()](#getBookmarkChildren)
- [getRecentBookmarks()](#getRecentBookmarks)
- [searchBookmarks()](#searchBookmarks)
- [createBookmark()](#createBookmark)
- [updateBookmark()](#updateBookmark)
- [moveBookmark()](#moveBookmark)
- [removeBookmark()](#removeBookmark)
- [removeBookmarkTree()](#removeBookmarkTree)

## Events

- [onBookmarkCreated()](#onBookmarkCreated)
- [onBookmarkRemoved()](#onBookmarkRemoved)
- [onBookmarkChanged()](#onBookmarkChanged)
- [onBookmarkMoved()](#onBookmarkMoved)
- [onBookmarkChildrenReordered()](#onBookmarkChildrenReordered)
- [onBookmarksImportBegan()](#onBookmarksImportBegan)
- [onBookmarksImportEnded()](#onBookmarksImportEnded)

## Permissions and browser support

Declare the permission in the extension manifest:

```json
{
  "permissions": ["bookmarks"]
}
```

Use the API from an extension context such as a background script, popup or extension page.

| Browser | Methods | Events |
| --- | --- | --- |
| Chrome / Chromium | All eleven | All seven |
| Microsoft Edge desktop | Chromium API, MV2 and MV3 | Chromium events |
| Opera desktop | Common Chromium methods | Common Chromium events |
| Firefox desktop | All eleven; optional `type` on creation | Created, removed, changed and moved |
| Safari / iOS Safari | Not supported | Not supported |

See the [Edge API list](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support),
[Opera API list](https://help.opera.com/en/extensions/apis/), and
[MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/bookmarks.json).
Opera documents an additional `getRootByName` method; this module does not wrap it.

`isAvailableBookmarks()` checks namespace presence, not support for every event. In particular,
Firefox does not implement `onChildrenReordered`, `onImportBegan` or `onImportEnded`. Their wrappers
retain native subscription failures; they do not simulate events or return a silent no-op.

## Types and native behavior

Signatures use `chrome.bookmarks` types from `@types/chrome`. The package extends `CreateDetails` and
`BookmarkTreeNode` with Firefox's optional `type: "bookmark" | "folder" | "separator"`.
This is a type superset: passing `type` to Chromium retains its native validation error. Firefox
fields are forwarded unchanged, without adding them to Chromium results. Chromium-specific metadata
such as `syncing` and `folderType` should not be assumed to exist in Firefox or older browsers.
See [Firefox CreateDetails](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks/CreateDetails).

IDs are opaque strings within a browser profile. Do not hardcode Chrome root/folder IDs for Firefox.
The browser controls protected roots and managed folders; the wrapper does not bypass their restrictions.
All methods reject on native errors instead of converting failures into empty arrays or successful deletions.

---

<a name="isAvailableBookmarks"></a>

### isAvailableBookmarks

```ts
isAvailableBookmarks(): boolean
```

Checks the current API selected by `browser()` on every call. Returns `false` if the namespace or
extension environment is missing, or access throws. It does not log or guarantee that a later operation succeeds.

```ts
import {getBookmarkTree, isAvailableBookmarks} from "@addon-core/browser";

if (isAvailableBookmarks()) {
    const tree = await getBookmarkTree();
    console.log(tree);
}
```

<a name="getBookmarks"></a>

### getBookmarks

```ts
getBookmarks(idOrIds: string | [string, ...string[]]): Promise<chrome.bookmarks.BookmarkTreeNode[]>
```

Returns an array even for a single ID. Missing IDs retain the browser's rejection behavior.

```ts
import {getBookmarks} from "@addon-core/browser";

const nodes = await getBookmarks(["bookmark-id", "folder-id"]);
```

<a name="getBookmarkTree"></a>

### getBookmarkTree

```ts
getBookmarkTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]>
```

Returns the full native tree, including its root and descendants. The result remains an array.

```ts
import {getBookmarkTree} from "@addon-core/browser";

const tree = await getBookmarkTree();
```

<a name="getBookmarkSubTree"></a>

### getBookmarkSubTree

```ts
getBookmarkSubTree(id: string): Promise<chrome.bookmarks.BookmarkTreeNode[]>
```

Returns the requested node and its descendants, retaining the native array shape.

```ts
import {getBookmarkSubTree} from "@addon-core/browser";

const subtree = await getBookmarkSubTree("folder-id");
```

<a name="getBookmarkChildren"></a>

### getBookmarkChildren

```ts
getBookmarkChildren(id: string): Promise<chrome.bookmarks.BookmarkTreeNode[]>
```

Returns only the immediate children in their native order. It does not flatten descendants.

```ts
import {getBookmarkChildren} from "@addon-core/browser";

const children = await getBookmarkChildren("folder-id");
```

<a name="getRecentBookmarks"></a>

### getRecentBookmarks

```ts
getRecentBookmarks(count: number): Promise<chrome.bookmarks.BookmarkTreeNode[]>
```

Returns up to the requested number of recently added bookmarks, not recently visited pages. Argument validation remains native.

```ts
import {getRecentBookmarks} from "@addon-core/browser";

const recent = await getRecentBookmarks(10);
```

<a name="searchBookmarks"></a>

### searchBookmarks

```ts
searchBookmarks(query: string | chrome.bookmarks.SearchQuery): Promise<chrome.bookmarks.BookmarkTreeNode[]>
```

Accepts text or an object with `query`, `title` and `url`. Object properties are combined; title and URL filters are exact matches. An empty result stays an empty array.

```ts
import {searchBookmarks} from "@addon-core/browser";

const matches = await searchBookmarks({url: "https://example.com/"});
```

<a name="createBookmark"></a>

### createBookmark

```ts
createBookmark(details: chrome.bookmarks.CreateDetails): Promise<chrome.bookmarks.BookmarkTreeNode>
```

Creates a bookmark, or a folder when `url` is omitted. `parentId` and `index` select its location. Omit `parentId` to use the browser's default destination.

```ts
import {createBookmark} from "@addon-core/browser";

const folder = await createBookmark({title: "Research"});
const bookmark = await createBookmark({
    parentId: folder.id, title: "Example", url: "https://example.com/",
});
```

<a name="updateBookmark"></a>

### updateBookmark

```ts
updateBookmark(id: string, changes: chrome.bookmarks.UpdateChanges): Promise<chrome.bookmarks.BookmarkTreeNode>
```

Changes `title` and/or `url`; omitted properties stay unchanged. Use `moveBookmark` to change parent or position.

```ts
import {updateBookmark} from "@addon-core/browser";

const updated = await updateBookmark("bookmark-id", {title: "New title"});
```

<a name="moveBookmark"></a>

### moveBookmark

```ts
moveBookmark(id: string, destination: chrome.bookmarks.MoveDestination): Promise<chrome.bookmarks.BookmarkTreeNode>
```

Moves a node using optional `parentId` and `index`. Await sequential moves when order matters.

```ts
import {moveBookmark} from "@addon-core/browser";

const moved = await moveBookmark("bookmark-id", {parentId: "folder-id", index: 0});
```

<a name="removeBookmark"></a>

### removeBookmark

```ts
removeBookmark(id: string): Promise<void>
```

Removes a bookmark or an empty folder. A nonempty folder causes a native error.

```ts
import {removeBookmark} from "@addon-core/browser";

await removeBookmark("bookmark-id");
```

<a name="removeBookmarkTree"></a>

### removeBookmarkTree

```ts
removeBookmarkTree(id: string): Promise<void>
```

Recursively removes the specified folder and its descendants. This is a destructive native operation, with no undo provided by the wrapper.

```ts
import {removeBookmarkTree} from "@addon-core/browser";

await removeBookmarkTree("folder-id");
```

All event callbacks receive native arguments and may be asynchronous. The shared listener utility
logs callback exceptions and rejected Promises. Each subscription returns its own cleanup function;
unsubscribing does not affect other listeners.

<a name="onBookmarkCreated"></a>

### onBookmarkCreated

```ts
onBookmarkCreated(callback: (id: string, bookmark: chrome.bookmarks.BookmarkTreeNode) => void): () => void
```

Fires for a new bookmark or folder.

```ts
import {onBookmarkCreated} from "@addon-core/browser";

const unsubscribe = onBookmarkCreated((id, bookmark) => {
    console.log(id, bookmark.title);
});

// When the subscription is no longer needed:
unsubscribe();
```

<a name="onBookmarkRemoved"></a>

### onBookmarkRemoved

```ts
onBookmarkRemoved(callback: (id: string, removeInfo: {parentId: string; index: number; node: chrome.bookmarks.BookmarkTreeNode}) => void): () => void
```

Fires for a removed node. Recursive folder deletion emits one event for the folder, not one per descendant.

```ts
import {onBookmarkRemoved} from "@addon-core/browser";

const unsubscribe = onBookmarkRemoved((id, removeInfo) => {
    console.log(id, removeInfo.parentId);
});

// When the subscription is no longer needed:
unsubscribe();
```

<a name="onBookmarkChanged"></a>

### onBookmarkChanged

```ts
onBookmarkChanged(callback: (id: string, changeInfo: {title?: string; url?: string}) => void): () => void
```

Reports title/URL changes; it does not replace creation, move or removal events.
Firefox sends only the changed fields, so both properties are optional. A combined title/URL update
may produce separate callbacks. Chrome always includes `title`. The wrapper preserves the native payload.

```ts
import {onBookmarkChanged} from "@addon-core/browser";

const unsubscribe = onBookmarkChanged((id, changeInfo) => {
    console.log(id, changeInfo);
});

// When the subscription is no longer needed:
unsubscribe();
```

<a name="onBookmarkMoved"></a>

### onBookmarkMoved

```ts
onBookmarkMoved(callback: (id: string, moveInfo: {parentId: string; index: number; oldParentId: string; oldIndex: number}) => void): () => void
```

Reports a new parent or position, including the previous parent and index.

```ts
import {onBookmarkMoved} from "@addon-core/browser";

const unsubscribe = onBookmarkMoved((id, moveInfo) => {
    console.log(id, moveInfo.oldParentId, moveInfo.parentId);
});

// When the subscription is no longer needed:
unsubscribe();
```

<a name="onBookmarkChildrenReordered"></a>

### onBookmarkChildrenReordered

```ts
onBookmarkChildrenReordered(callback: (id: string, reorderInfo: {childIds: string[]}) => void): () => void
```

Chromium only. Reports sorting of a folder in the browser UI, not calls to `moveBookmark`.

```ts
import {onBookmarkChildrenReordered} from "@addon-core/browser";

const unsubscribe = onBookmarkChildrenReordered((id, reorderInfo) => {
    console.log(id, reorderInfo.childIds);
});

// When the subscription is no longer needed:
unsubscribe();
```

<a name="onBookmarksImportBegan"></a>

### onBookmarksImportBegan

```ts
onBookmarksImportBegan(callback: () => void): () => void
```

Chromium only. Signals the beginning of an import. Expensive processing of created nodes can be deferred until import ends.

```ts
import {onBookmarksImportBegan} from "@addon-core/browser";

const unsubscribe = onBookmarksImportBegan(() => {
    console.log("Import started");
});

// When the subscription is no longer needed:
unsubscribe();
```

<a name="onBookmarksImportEnded"></a>

### onBookmarksImportEnded

```ts
onBookmarksImportEnded(callback: () => void): () => void
```

Chromium only. Signals the end of an import.

```ts
import {onBookmarksImportEnded} from "@addon-core/browser";

const unsubscribe = onBookmarksImportEnded(() => {
    console.log("Import finished");
});

// When the subscription is no longer needed:
unsubscribe();
```
