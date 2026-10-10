export default {
    namespace: "bookmarks",
    template: "basic",
    events: {
        onBookmarkCreated: "onCreated",
        onBookmarkRemoved: "onRemoved",
        onBookmarkChanged: {
            event: "onChanged",
            // Firefox sends only the changed fields; Chrome always includes title.
            callbackType: "(id: string, changeInfo: {title?: string; url?: string}) => void",
        },
        onBookmarkMoved: "onMoved",
        onBookmarkChildrenReordered: "onChildrenReordered",
        onBookmarksImportBegan: "onImportBegan",
        onBookmarksImportEnded: "onImportEnded",
    },
};
