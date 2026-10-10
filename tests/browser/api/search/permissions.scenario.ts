import {
    browser, canGetSearchEngines, canQuerySearch, canSearchWithEngine,
    getSearchEngines, hasSearchEngine, isAvailableSearch, querySearch, searchWithEngine,
} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "missing-search-permission",
    async run() {
        assert(!browser().runtime.getManifest().permissions?.includes("search"), "Negative fixture accidentally grants search");
        assert(!isAvailableSearch() && !canQuerySearch() && !canGetSearchEngines() && !canSearchWithEngine(), "Search must be unavailable without permission");
        assert(!await hasSearchEngine("Example"), "Safe predicate must return false without permission");
        await rejects(() => querySearch({text: "addon test"}), "querySearch must reject without permission");
        await rejects(getSearchEngines, "getSearchEngines must reject without permission");
        await rejects(() => searchWithEngine("addon test", "Example"), "searchWithEngine must reject without permission");
    },
} satisfies BrowserScenario;
