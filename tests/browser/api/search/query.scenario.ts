import {
    canGetSearchEngines, canQuerySearch, canSearchWithEngine, isAvailableSearch,
    querySearch, searchInCurrentTab, searchInNewTab, searchInNewWindow, searchInTab,
} from "../../../../dist/index.js";
import {assert} from "../../extension/assert";
import {checkNavigation} from "./navigation";

import type {BrowserScenario} from "../../types";

export default {
    id: "query-destinations",
    async run(context) {
        assert(isAvailableSearch() && canQuerySearch(), "Search permission must expose search.query");
        assert(canGetSearchEngines() === (context.browser === "firefox"), "Unexpected engine enumeration capability");
        assert(canSearchWithEngine() === (context.browser === "firefox"), "Unexpected engine selection capability");
        await checkNavigation(context, "current", text => querySearch({text}));
        await checkNavigation(context, "tab", (text, tabId) => querySearch({text, tabId}));
        await checkNavigation(context, "tab", searchInTab);
        await checkNavigation(context, "current", searchInCurrentTab);
        await checkNavigation(context, "new-tab", searchInNewTab);
        await checkNavigation(context, "new-window", searchInNewWindow);
    },
} satisfies BrowserScenario;
