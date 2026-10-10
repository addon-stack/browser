import {
    browser, createBookmark, getBookmarkChildren, getBookmarks, getBookmarkSubTree, getBookmarkTree,
    getRecentBookmarks, isAvailableBookmarks, moveBookmark, removeBookmark, removeBookmarkTree,
    searchBookmarks, updateBookmark,
} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "bookmark-lifecycle",
    async run(context) {
        assert(isAvailableBookmarks(), "bookmarks must be available with permission");
        const native = browser().bookmarks;
        const root = await native.create({title: `Bookmarks fixture ${Date.now()}`});

        try {
            const title = `addon-bookmark-${Date.now()}`;
            const url = `${context.base}/fixture?bookmark=${title}`;
            const folder = await createBookmark({parentId: root.id, title: "Nested folder"});
            const item = await createBookmark({parentId: root.id, title, url, index: 0});
            assert(item.parentId === root.id && item.title === title && item.url === url, "Invalid created node");
            const single = await getBookmarks(item.id);
            assert(Array.isArray(single) && single.length === 1 && single[0].id === item.id, "Single-ID get must retain array shape");
            const multiple = await getBookmarks([item.id, folder.id]);
            assert(multiple.length === 2 && multiple.some(node => node.id === folder.id), "Multiple-ID get lost a node");
            const children = await getBookmarkChildren(root.id);
            assert(children.length === 2 && children[0].id === item.id, "Child order was not preserved");
            const tree = await getBookmarkTree();

            const contains = (nodes: chrome.bookmarks.BookmarkTreeNode[]): boolean =>
                nodes.some(node => node.id === item.id || contains(node.children ?? []));

            assert(contains(tree), "Full tree must include the created bookmark");
            const subtree = await getBookmarkSubTree(root.id);
            assert(subtree.length === 1 && subtree[0].id === root.id && contains(subtree), "Subtree must retain its root and descendants");
            const recent = await getRecentBookmarks(10);
            assert(recent.length <= 10 && recent.some(node => node.id === item.id), "Recent bookmarks lost the new item");

            for (const query of [title, {url}, {query: title, title, url}]) {
                const matches = await searchBookmarks(query);
                assert(matches.length === 1 && matches[0].id === item.id, "Search did not return the exact fixture bookmark");
            }

            assert((await searchBookmarks({url: `${url}-missing`})).length === 0, "Empty search must remain an empty array");
            const updated = await updateBookmark(item.id, {title: `${title}-updated`, url: `${url}-updated`});
            const [stored] = await native.get(item.id);
            assert(updated.title === stored.title && stored.url === `${url}-updated`, "Update did not reach native storage");
            const moved = await moveBookmark(item.id, {parentId: folder.id, index: 0});
            assert(moved.parentId === folder.id && (await native.getChildren(folder.id))[0].id === item.id, "Move did not update the parent");
            await rejects(() => removeBookmark(folder.id), "Removing a nonempty folder must reject");

            if (context.browser === "firefox") {
                const separator = await createBookmark({parentId: folder.id, type: "separator"});
                assert(separator.type === "separator", "Firefox separator type was discarded");
                assert((await getBookmarkChildren(folder.id)).some(node => node.id === separator.id && node.type === "separator"), "Firefox result type was lost");
                await removeBookmark(separator.id);
            } else {
                await rejects(() => createBookmark({parentId: folder.id, type: "separator"}), "Chromium must reject Firefox-only options");
            }

            await removeBookmark(item.id);
            await rejects(() => getBookmarks(item.id), "Retrieving a deleted bookmark must reject");
            await removeBookmark(folder.id);
            const removable = await createBookmark({parentId: root.id, title: "Remove recursively"});
            const child = await createBookmark({parentId: removable.id, title, url});
            await removeBookmarkTree(removable.id);
            await rejects(() => native.get(child.id), "Recursive deletion must remove descendants");
            assert((await getBookmarkChildren(root.id)).length === 0, "Fixture folder must be empty");
        } finally {
            await native.removeTree(root.id);
        }
    },
} satisfies BrowserScenario;
