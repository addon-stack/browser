import {browser, getBookmarkTree, isAvailableBookmarks} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "missing-bookmarks-permission",
    async run() {
        assert(!browser().runtime.getManifest().permissions?.includes("bookmarks"), "Negative fixture accidentally grants bookmarks");
        assert(!isAvailableBookmarks(), "bookmarks must be unavailable without permission");
        await rejects(() => getBookmarkTree(), "getBookmarkTree must reject without permission");
    },
} satisfies BrowserScenario;
